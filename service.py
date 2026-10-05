"""Portable synthetic-only workflow record service. No external side effects."""
import argparse, base64, hashlib, json, os, sqlite3, threading, uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from contextlib import contextmanager

def canonical(x): return json.dumps(x, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
def digest(x): return hashlib.sha256(x if isinstance(x, bytes) else canonical(x).encode()).hexdigest()
def now(): return datetime.now(timezone.utc).isoformat()
class Fault(Exception):
    def __init__(self, status, code, **details): self.status=status; self.body={'error':code, **details}
def require(ok, code, status=422, **details):
    if not ok: raise Fault(status, code, **details)

SCHEMA='''
CREATE TABLE IF NOT EXISTS workflows(id TEXT PRIMARY KEY,namespace TEXT NOT NULL,body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS operations(namespace TEXT, id TEXT, principal TEXT, payload_hash TEXT, result TEXT, PRIMARY KEY(namespace,id));
CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,namespace TEXT, workflow_id TEXT, operation_id TEXT, body TEXT);
CREATE TABLE IF NOT EXISTS blobs(hash TEXT PRIMARY KEY, data BLOB NOT NULL);
'''
class Store:
    def __init__(self,path,bindings):
        self.path=Path(path); self.path.parent.mkdir(parents=True,exist_ok=True)
        self.bindings=bindings; self.lock=threading.RLock()
        with self.db() as db: db.executescript(SCHEMA)
    @contextmanager
    def db(self):
        db=sqlite3.connect(self.path,timeout=10); db.row_factory=sqlite3.Row
        try:
            with db: yield db
        finally: db.close()
    def auth(self,token,ns,permission='read'):
        identity=self.bindings.get(token)
        require(identity is not None,'unauthenticated',401)
        roles=identity.get('namespaces',{}).get(ns,[])
        require(permission in roles,'forbidden',403)
        return identity['principal']
    def load(self,db,wid,ns):
        row=db.execute('SELECT body FROM workflows WHERE id=? AND namespace=?',(wid,ns)).fetchone()
        require(row is not None,'not_found',404); return json.loads(row[0])
    def context(self,token,ns,wid):
        self.auth(token,ns)
        with self.db() as db:
            w=self.load(db,wid,ns)
            events=[json.loads(r[0]) for r in db.execute('SELECT body FROM events WHERE namespace=? AND workflow_id=? ORDER BY seq',(ns,wid))]
        # No truncation: all retained revisions and evidence are present.
        return {'workflow':w,'events':events,'document_index':[{'id':d['id'],'name':d['name'],'deleted':d['deleted'],'required':d['required'],'revisions':[{'revision':r['revision'],'hash':r['hash']} for r in d['revisions']]} for d in w['documents'].values()], 'complete':True,'missing_required_documents':[x for x in w['required_documents'] if x not in w['documents'] or w['documents'][x]['deleted']], 'pending_outbox':'client-local: inspect CLI outbox before handoff','source_check_required':True,'external_observations_are_current':False}
    def operation(self,token,ns,oid):
        self.auth(token,ns)
        with self.db() as db:
            row=db.execute('SELECT result FROM operations WHERE namespace=? AND id=?',(ns,oid)).fetchone()
        require(row is not None,'not_found',404); return json.loads(row[0])
    def command(self,token,c):
        require(isinstance(c,dict),'invalid_command')
        ns=c.get('namespace'); typ=c.get('type'); oid=c.get('operation_id')
        require(isinstance(ns,str) and bool(ns) and isinstance(oid,str) and bool(oid),'missing_namespace_or_operation_id')
        principal=self.auth(token,ns,'approve' if typ=='approve' else 'write')
        require(typ in {'create_workflow','update_workflow','add_step','update_step','document','log','handoff','evidence','approve'},'unsupported_command',403)
        ph=digest(c); wid=c.get('workflow_id')
        with self.lock, self.db() as db:
            db.execute('BEGIN IMMEDIATE')
            old=db.execute('SELECT * FROM operations WHERE namespace=? AND id=?',(ns,oid)).fetchone()
            if old:
                require(old['principal']==principal and old['payload_hash']==ph,'idempotency_payload_mismatch',409)
                return json.loads(old['result'])
            p=c.get('payload',{}); require(isinstance(p,dict),'invalid_payload')
            if typ=='create_workflow':
                require(isinstance(wid,str) and bool(wid),'missing_workflow_id')
                require(not db.execute('SELECT 1 FROM workflows WHERE id=?',(wid,)).fetchone(),'already_exists',409)
                require(c.get('expected_revision')==0,'revision_conflict',409,current_revision=0)
                for field in ('title','goal','authorized_scope','source','policy_version','template_version','next_step','next_owner'):
                    require(field in p,'missing_field',field=field)
                w={**p,'id':wid,'namespace':ns,'revision':0,'status':'planned','steps':{},'documents':{},'logs':[],'evidence':{},'handoffs':[],'required_documents':p.get('required_documents',[]),'legacy_mapping':p.get('legacy_mapping',{}),'external_links':p.get('external_links',[]),'limitations':p.get('limitations',[])}
            else:
                w=self.load(db,wid,ns)
                require(c.get('expected_revision')==w['revision'],'revision_conflict',409,current_revision=w['revision'])
            before=w['revision']
            if typ=='update_workflow':
                require(set(p)<= {'next_step','next_owner','limitations','required_documents','blockers','status'},'invalid_workflow_fields')
                if 'status' in p:
                    require(p['status'] in {'planned':['active'],'active':['blocked','completed'],'blocked':['active'],'completed':[]}[w['status']],'illegal_transition')
                    if p['status']=='completed':
                        require(bool(w['steps']) and all(s['status']=='completed' for s in w['steps'].values()),'incomplete_steps')
                        require(all(d in w['documents'] and not w['documents'][d]['deleted'] for d in w['required_documents']),'missing_required_documents')
                w.update(p)
            elif typ=='add_step':
                sid=p.get('id'); require(isinstance(sid,str) and sid not in w['steps'],'invalid_or_duplicate_step')
                require(all(k in p for k in ('order','owner_skill','title')),'missing_step_fields')
                w['steps'][sid]={**p,'status':'planned','blockers':[],'result':None,'evidence_ids':[]}
            elif typ=='update_step':
                sid=p.get('id'); require(sid in w['steps'],'step_not_found')
                require(set(p)<= {'id','status','blockers','result','evidence_ids'},'invalid_step_fields')
                s=w['steps'][sid]
                if 'status' in p:
                    require(p['status'] in {'planned':['active'],'active':['blocked','completed'],'blocked':['active'],'completed':[]}[s['status']],'illegal_transition')
                    if p['status']=='completed':
                        ids=p.get('evidence_ids',s['evidence_ids'])
                        require(bool(ids) and all(i in w['evidence'] for i in ids) and bool(p.get('result',s['result'])),'missing_required_evidence')
                s.update(p)
            elif typ=='document':
                did=p.get('id'); action=p.get('action'); require(isinstance(did,str) and bool(did),'missing_document_id')
                require(action in {'create','revise','rename','archive'},'invalid_document_action')
                d=w['documents'].get(did)
                if action=='create':
                    require(d is None,'document_exists'); require(p.get('step_id') is None or p['step_id'] in w['steps'],'step_not_found')
                    d={'id':did,'name':p.get('name',did),'kind':p.get('kind','markdown'),'step_id':p.get('step_id'),'required':p.get('required',False),'deleted':False,'revisions':[]}; w['documents'][did]=d
                else: require(d is not None and not d['deleted'],'document_not_found')
                if action=='rename': require(isinstance(p.get('name'),str),'missing_name'); d['name']=p['name']
                if action=='archive': d['deleted']=True; d['deleted_at']=now()
                if action in {'create','revise'}:
                    require(isinstance(p.get('content'),str),'missing_content')
                    if d['revisions'] and d['revisions'][-1]['final']: require(p.get('relation') in {'erratum','addendum','successor'},'final_requires_successor')
                    r={'revision':len(d['revisions'])+1,'previous':len(d['revisions']) or None,'content':p['content'],'hash':hashlib.sha256(p['content'].encode()).hexdigest(),'final':p.get('final',False),'relation':p.get('relation'),'finding_ids':p.get('finding_ids',[]),'decision_ids':p.get('decision_ids',[]),'created_at':now()}; d['revisions'].append(r)
            elif typ=='log': require(isinstance(p.get('text'),str),'missing_log'); w['logs'].append({**p,'at':now()})
            elif typ=='handoff':
                require(all(k in p for k in ('next_step','next_owner','blockers','failures','limitations')),'incomplete_handoff')
                w['handoffs'].append({**p,'at':now()}); w['next_step']=p['next_step']; w['next_owner']=p['next_owner']
            elif typ=='evidence':
                eid=p.get('id'); require(isinstance(eid,str) and eid not in w['evidence'],'invalid_or_duplicate_evidence')
                require(all(k in p for k in ('command','result','outcome','source_commit','environment')),'incomplete_evidence')
                try: blob=base64.b64decode(p.get('blob_base64',''),validate=True)
                except Exception: raise Fault(422,'invalid_blob')
                require(len(blob)<=1024*1024,'blob_too_large',413)
                h=digest(blob); db.execute('INSERT OR IGNORE INTO blobs VALUES(?,?)',(h,blob))
                w['evidence'][eid]={k:v for k,v in p.items() if k!='blob_base64'}; w['evidence'][eid].update(blob_hash=h,observed_at=now())
            elif typ=='approve':
                require(p.get('document_id') in w['documents'],'document_not_found')
                d=w['documents'][p['document_id']]; require(d['revisions'] and d['revisions'][-1]['final'],'not_final')
                require(not db.execute('SELECT 1 FROM events WHERE namespace=? AND workflow_id=? AND json_extract(body,\'$.principal\')=? AND json_extract(body,\'$.command.type\')=\'document\'',(ns,wid,principal)).fetchone(),'independent_approval_required',403)
                w.setdefault('approvals',[]).append({'document_id':d['id'],'revision':d['revisions'][-1]['revision'],'principal':principal,'at':now()})
            w['revision']=before+1
            event={'workflow_id':wid,'namespace':ns,'operation_id':oid,'principal':principal,'client':c.get('client','unknown'),'session':c.get('session','unknown'),'identity_source':'local synthetic bearer binding; client/session self-declared','before_revision':before,'after_revision':w['revision'],'at':now(),'command':c}
            cur=db.execute('INSERT INTO events(namespace,workflow_id,operation_id,body) VALUES(?,?,?,?)',(ns,wid,oid,canonical(event))); event['seq']=cur.lastrowid
            db.execute('UPDATE events SET body=? WHERE seq=?',(canonical(event),event['seq']))
            result={'accepted':True,'operation_id':oid,'workflow_id':wid,'revision':w['revision'],'event_seq':event['seq'],'payload_hash':ph,'principal':principal}
            db.execute('INSERT OR REPLACE INTO workflows VALUES(?,?,?)',(wid,ns,canonical(w)))
            db.execute('INSERT INTO operations VALUES(?,?,?,?,?)',(ns,oid,principal,ph,canonical(result)))
            return result
    def export(self,token,ns):
        self.auth(token,ns,'export')
        with self.lock,self.db() as db:
            db.execute('BEGIN')
            workflows=[json.loads(r[0]) for r in db.execute('SELECT body FROM workflows WHERE namespace=? ORDER BY id',(ns,))]
            events=[json.loads(r[0]) for r in db.execute('SELECT body FROM events WHERE namespace=? ORDER BY seq',(ns,))]
            ops=[dict(r) for r in db.execute('SELECT * FROM operations WHERE namespace=? ORDER BY id',(ns,))]
            hashes={e['blob_hash'] for w in workflows for e in w['evidence'].values()}
            blobs={h:base64.b64encode(db.execute('SELECT data FROM blobs WHERE hash=?',(h,)).fetchone()[0]).decode() for h in sorted(hashes)}
        roles=[{'principal':v['principal'],'roles':v['namespaces'][ns]} for v in self.bindings.values() if ns in v['namespaces']]
        payload={'workflows':workflows,'events':events,'operations':ops,'blobs':blobs,'role_mapping':roles}
        return {'manifest':{'format':'workflow-portable','version':1,'schema_version':1,'namespace':ns,'cutoff_seq':max([e['seq'] for e in events],default=0),'exported_at':now(),'payload_sha256':digest(payload),'counts':{k:len(v) for k,v in payload.items()},'secrets_included':False,'identity_rebinding_required':True,'external_effects_enabled':False},'payload':payload}

def preflight(pack):
    require(isinstance(pack,dict) and set(pack)=={'manifest','payload'},'invalid_package')
    m=pack['manifest']; p=pack['payload']
    require(m.get('format')=='workflow-portable' and m.get('version')==1 and m.get('schema_version')==1,'unsupported_schema')
    require(m.get('identity_rebinding_required') is True and m.get('external_effects_enabled') is False and m.get('secrets_included') is False,'unsafe_manifest')
    require(digest(p)==m.get('payload_sha256'),'package_hash_mismatch')
    require(set(p)=={'workflows','events','operations','blobs','role_mapping'},'invalid_payload_tables')
    require(m['counts']=={k:len(v) for k,v in p.items()},'count_mismatch')
    ns=m['namespace']; ws={w['id']:w for w in p['workflows']}; require(len(ws)==len(p['workflows']),'duplicate_workflow')
    ops={(o['namespace'],o['id']):o for o in p['operations']}; require(len(ops)==len(p['operations']),'duplicate_operation')
    seqs=set(); revisions={wid:0 for wid in ws}
    for e in p['events']:
        require(e['namespace']==ns and e['workflow_id'] in ws and e['seq'] not in seqs,'invalid_event_relationship')
        require(e['seq']>max(seqs,default=0),'event_order'); seqs.add(e['seq'])
        require(e['before_revision']==revisions[e['workflow_id']] and e['after_revision']==e['before_revision']+1,'event_revision_gap'); revisions[e['workflow_id']]=e['after_revision']
        op=ops.get((ns,e['operation_id'])); require(op is not None and op['payload_hash']==digest(e['command']) and op['principal']==e['principal'],'invalid_operation_relationship')
        result=json.loads(op['result']); require(result['event_seq']==e['seq'] and result['revision']==e['after_revision'] and result['workflow_id']==e['workflow_id'],'invalid_operation_result')
    require(len(seqs)==len(ops) and m['cutoff_seq']==max(seqs,default=0),'operation_event_count_mismatch')
    for h,b in p['blobs'].items():
        try: data=base64.b64decode(b,validate=True)
        except Exception: raise Fault(422,'invalid_blob')
        require(digest(data)==h,'blob_hash_mismatch')
    for w in ws.values():
        require(w['namespace']==ns and w['revision']==revisions[w['id']],'invalid_workflow_revision')
        for sid,s in w['steps'].items():
            require(sid==s['id'] and all(x in w['evidence'] for x in s['evidence_ids']),'invalid_step_relationship')
        for did,d in w['documents'].items():
            require(did==d['id'] and (d['step_id'] is None or d['step_id'] in w['steps']),'invalid_document_relationship')
            for i,r in enumerate(d['revisions'],1): require(r['revision']==i and r['previous']==(i-1 or None) and hashlib.sha256(r['content'].encode()).hexdigest()==r['hash'],'revision_hash_or_chain_mismatch')
        for eid,e in w['evidence'].items(): require(e['id']==eid and e['blob_hash'] in p['blobs'],'invalid_blob_relationship')
    return {'valid':True,'counts':m['counts'],'payload_sha256':m['payload_sha256'],'identity_rebinding_required':True,'external_effects_enabled':False}

def restore(pack,path,bindings):
    proof=preflight(pack); target=Path(path)
    require(not target.exists(),'restore_requires_new_store',409)
    ns=pack['manifest']['namespace']
    require(any('write' in b.get('namespaces',{}).get(ns,[]) for b in bindings.values()),'explicit_rebinding_required')
    store=Store(path,bindings); p=pack['payload']
    try:
        with store.db() as db:
            for w in p['workflows']: db.execute('INSERT INTO workflows VALUES(?,?,?)',(w['id'],ns,canonical(w)))
            for e in p['events']: db.execute('INSERT INTO events VALUES(?,?,?,?,?)',(e['seq'],ns,e['workflow_id'],e['operation_id'],canonical(e)))
            for o in p['operations']: db.execute('INSERT INTO operations VALUES(?,?,?,?,?)',tuple(o[k] for k in ('namespace','id','principal','payload_hash','result')))
            for h,b in p['blobs'].items(): db.execute('INSERT INTO blobs VALUES(?,?)',(h,base64.b64decode(b)))
    except Exception:
        target.unlink(missing_ok=True); raise
    return proof

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def token(self): return self.headers.get('Authorization','').removeprefix('Bearer ')
    def output(self,status,obj):
        data=canonical(obj).encode(); self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Cache-Control','no-store'); self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data)
    def do_GET(self):
        from urllib.parse import urlparse,parse_qs
        try:
            u=urlparse(self.path); ns=parse_qs(u.query).get('namespace',['demo'])[0]; parts=u.path.strip('/').split('/')
            if u.path=='/':
                data=Path(__file__).with_name('ui.html').read_bytes(); self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data); return
            s=self.server.store
            if u.path=='/health': result={'ready':True,'external_effects_enabled':False,'mode':'synthetic-local-only'}
            elif u.path=='/v1/workflows':
                s.auth(self.token(),ns)
                with s.db() as db: result=[json.loads(r[0]) for r in db.execute('SELECT body FROM workflows WHERE namespace=? ORDER BY id',(ns,))]
                link=parse_qs(u.query).get('external_link',[None])[0]
                if link: result=[w for w in result if any((x.get('url') if isinstance(x,dict) else x)==link for x in w['external_links'])]
            elif len(parts)==4 and parts[:2]==['v1','workflows'] and parts[3]=='context': result=s.context(self.token(),ns,parts[2])
            elif len(parts)==3 and parts[:2]==['v1','operations']: result=s.operation(self.token(),ns,parts[2])
            elif len(parts)==4 and parts[:2]==['v1','documents']:
                wid=parse_qs(u.query).get('workflow_id',[''])[0]; w=s.context(self.token(),ns,wid)['workflow']; require(parts[2] in w['documents'],'not_found',404)
                d=w['documents'][parts[2]]; rev=int(parts[3]); require(0<rev<=len(d['revisions']),'not_found',404); result=d['revisions'][rev-1]
            elif u.path=='/v1/events':
                s.auth(self.token(),ns); after=int(parse_qs(u.query).get('after',['0'])[0])
                with s.db() as db: result=[json.loads(r[0]) for r in db.execute('SELECT body FROM events WHERE namespace=? AND seq>? ORDER BY seq',(ns,after))]
            elif u.path=='/v1/export': result=s.export(self.token(),ns)
            else: raise Fault(404,'not_found')
            self.output(200,result)
        except Fault as e: self.output(e.status,e.body)
        except (ValueError,KeyError,TypeError): self.output(422,{'error':'invalid_request'})
    def do_POST(self):
        try:
            require(self.path=='/v1/commands','not_found',404)
            require(self.headers.get('Origin') in (None,f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}'),'origin_forbidden',403)
            size=int(self.headers.get('Content-Length','0')); require(0<size<=2*1024*1024,'invalid_request_size',413)
            c=json.loads(self.rfile.read(size)); result=self.server.store.command(self.token(),c)
            # Explicit local fault injection used to prove accepted operation + lost response.
            if self.server.fault_injection and self.headers.get('X-Test-Drop-Response')=='once': self.close_connection=True; return
            self.output(200,result)
        except Fault as e: self.output(e.status,e.body)
        except (ValueError,KeyError,TypeError): self.output(422,{'error':'invalid_request'})

def server(store,port=8765,fault_injection=False):
    h=ThreadingHTTPServer(('127.0.0.1',port),Handler); h.store=store; h.fault_injection=fault_injection; return h
def main():
    p=argparse.ArgumentParser(); p.add_argument('--db',default='../runtime/records.sqlite'); p.add_argument('--bindings',required=True); p.add_argument('--port',type=int,default=8765); p.add_argument('--restore'); p.add_argument('--preflight'); p.add_argument('--fault-injection',action='store_true'); a=p.parse_args()
    b=json.loads(Path(a.bindings).read_text(encoding='utf-8'))
    if a.preflight: print(canonical(preflight(json.loads(Path(a.preflight).read_text(encoding='utf-8'))))); return
    if a.restore: print(canonical(restore(json.loads(Path(a.restore).read_text(encoding='utf-8')),a.db,b))); return
    h=server(Store(a.db,b),a.port,a.fault_injection); print(f'Local synthetic service http://127.0.0.1:{h.server_port}',flush=True); h.serve_forever()
if __name__=='__main__': main()
