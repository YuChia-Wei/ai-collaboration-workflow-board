"""Authentication, idempotency, revision checks, and transactional use cases."""
import base64, json, threading
from .ports import WorkflowRepository
from ..domain.serialization import digest, now
from ..domain.validation import require, COMMANDS, integer, text_value
from ..domain.workflow import apply_command, create_workflow

class WorkflowService:
    def __init__(self, repository: WorkflowRepository, bindings):
        self.repository=repository; self.bindings=bindings; self.lock=threading.RLock()

    def db(self):
        return self.repository.db()

    def load(self, db, wid, ns):
        return self.repository.load(db,wid,ns)

    def auth(self,token,ns,permission='read'):
        identity=self.bindings.get(token)
        require(identity is not None,'unauthenticated',401)
        roles=identity.get('namespaces',{}).get(ns,[])
        require(permission in roles,'forbidden',403)
        return identity['principal']
    def context(self,token,ns,wid):
        self.auth(token,ns)
        with self.db() as db:
            self.repository.begin_read(db)
            w=self.load(db,wid,ns)
            events=self.repository.events(db,ns,wid)
        # No truncation: all retained revisions and evidence are present.
        return {'workflow':w,'events':events,'document_index':[{'id':d['id'],'name':d['name'],'deleted':d['deleted'],'required':d['required'],'revisions':[{'revision':r['revision'],'hash':r['hash']} for r in d['revisions']]} for d in w['documents'].values()], 'complete':True,'missing_required_documents':[x for x in w['required_documents'] if x not in w['documents'] or w['documents'][x]['deleted']], 'pending_outbox':'client-local: inspect CLI outbox before handoff','source_check_required':True,'external_observations_are_current':False}
    def operation(self, token, ns, oid):
        self.auth(token,ns)
        with self.db() as db:
            row=self.repository.operation(db,ns,oid)
        require(row is not None,'not_found',404)
        return json.loads(row['result'])

    def command(self,token,c):
        require(isinstance(c,dict),'invalid_command')
        ns=c.get('namespace'); typ=c.get('type'); oid=c.get('operation_id')
        require(isinstance(ns,str) and bool(ns) and isinstance(oid,str) and bool(oid),'missing_namespace_or_operation_id')
        principal=self.auth(token,ns,'approve' if typ=='approve' else 'write')
        require(typ in COMMANDS,'unsupported_command',403)
        ph=digest(c); wid=c.get('workflow_id')
        with self.lock, self.db() as db:
            self.repository.begin_write(db)
            old=self.repository.operation(db,ns,oid)
            if old:
                require(old['principal']==principal and old['payload_hash']==ph,'idempotency_payload_mismatch',409)
                return json.loads(old['result'])
            require(integer(c.get('expected_revision')),'invalid_expected_revision')
            require(text_value(c.get('client','unknown')) and text_value(c.get('session','unknown')),'invalid_client_metadata')
            p=c.get('payload',{}); require(isinstance(p,dict),'invalid_payload')
            if typ=='create_workflow':
                require(isinstance(wid,str) and bool(wid),'missing_workflow_id')
                require(not self.repository.has_workflow(db,wid),'already_exists',409)
                require(c.get('expected_revision')==0,'revision_conflict',409,current_revision=0)
                w=create_workflow(wid,ns,p)
            else:
                w=self.load(db,wid,ns)
                require(c.get('expected_revision')==w['revision'],'revision_conflict',409,current_revision=w['revision'])
            before=w['revision']
            blobs=apply_command(w,typ,p,principal,lambda: self.repository.document_authored(db,ns,wid,principal))
            self.repository.put_blobs(db,blobs)
            w['revision']=before+1
            event={'workflow_id':wid,'namespace':ns,'operation_id':oid,'principal':principal,'client':c.get('client','unknown'),'session':c.get('session','unknown'),'identity_source':'local synthetic bearer binding; client/session self-declared','before_revision':before,'after_revision':w['revision'],'at':now(),'command':c}
            event['seq']=self.repository.append_event(db,event)
            result={'accepted':True,'operation_id':oid,'workflow_id':wid,'revision':w['revision'],'event_seq':event['seq'],'payload_hash':ph,'principal':principal}
            self.repository.save_workflow(db,w)
            self.repository.save_operation(db,ns,oid,principal,ph,result)
            return result
    def export(self, token, ns):
        self.auth(token,ns,'export')
        with self.lock,self.db() as db:
            self.repository.begin_read(db)
            payload=self.repository.export_payload(db,ns)
        events=payload['events']
        return {'manifest':{'format':'workflow-portable','version':1,'schema_version':1,'namespace':ns,'cutoff_seq':max([e['seq'] for e in events],default=0),'exported_at':now(),'payload_sha256':digest(payload),'counts':{k:len(v) for k,v in payload.items()},'secrets_included':False,'identity_rebinding_required':True,'external_effects_enabled':False},'payload':payload}
    def workflows(self, token, ns, external_link=None):
        self.auth(token,ns)
        with self.db() as db:
            records=self.repository.workflows(db,ns)
        if external_link:
            records=[w for w in records if any((x.get('url') if isinstance(x,dict) else x)==external_link for x in w['external_links'])]
        return records

    def events(self, token, ns, after=0):
        self.auth(token,ns)
        with self.db() as db:
            return self.repository.events(db,ns,after=after)

    def blob(self, token, ns, blob_hash):
        self.auth(token,ns)
        with self.db() as db:
            self.repository.begin_read(db)
            records=self.repository.workflows(db,ns)
            require(any(e['blob_hash']==blob_hash for w in records for e in w['evidence'].values()),'not_found',404)
            data=self.repository.blob(db,blob_hash)
            require(data is not None,'not_found',404)
            return {'hash':blob_hash,'blob_base64':base64.b64encode(data).decode()}
