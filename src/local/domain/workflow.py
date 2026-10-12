"""Workflow aggregate rules; no HTTP, database, or filesystem dependencies."""
import base64, hashlib
from .serialization import digest, now
from .validation import Fault, require, STATES, validate_evidence, validate_workflow

def create_workflow(wid, ns, p):
    for field in ('title','goal','authorized_scope','source','policy_version','template_version','next_step','next_owner'):
        require(field in p,'missing_field',field=field)
    w={**p,'id':wid,'namespace':ns,'revision':0,'status':'planned','steps':{},'documents':{},'logs':[],'evidence':{},'handoffs':[],'required_documents':p.get('required_documents',[]),'legacy_mapping':p.get('legacy_mapping',{}),'external_links':p.get('external_links',[]),'limitations':p.get('limitations',[])}
    return w

def apply_command(w, typ, p, principal, document_authored):
    """Mutate a candidate aggregate and return attachment bytes for atomic storage."""
    blobs = {}
    if typ=='update_workflow':
        require(set(p)<= {'next_step','next_owner','limitations','required_documents','blockers','status'},'invalid_workflow_fields')
        if 'status' in p:
            require(p['status'] in STATES.get(w['status'],[]),'illegal_transition')
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
            require(p['status'] in STATES.get(s['status'],[]),'illegal_transition')
        s.update(p)
    elif typ=='document':
        did=p.get('id'); action=p.get('action'); require(isinstance(did,str) and bool(did),'missing_document_id')
        require(action in {'create','revise','rename','archive'},'invalid_document_action')
        d=w['documents'].get(did)
        if action=='create':
            require(d is None,'document_exists'); require(p.get('step_id') is None or p['step_id'] in w['steps'],'step_not_found')
            d={'id':did,'name':p.get('name',did),'kind':p.get('kind','markdown'),'step_id':p.get('step_id'),'required':p.get('required',False),'deleted':False,'revisions':[]}; w['documents'][did]=d
            if d['required'] and did not in w['required_documents']: w['required_documents'].append(did)
        else: require(d is not None and not d['deleted'],'document_not_found')
        if action=='rename': require(isinstance(p.get('name'),str),'missing_name'); d['name']=p['name']
        if action=='archive':
            require(did not in w['required_documents'],'required_document_archive_forbidden',document_id=did)
            d['deleted']=True; d['deleted_at']=now()
        if action in {'create','revise'}:
            require(isinstance(p.get('content'),str),'missing_content')
            if d['revisions'] and d['revisions'][-1]['final']: require(p.get('relation') in {'erratum','addendum','successor'},'final_requires_successor')
            r={'revision':len(d['revisions'])+1,'previous':len(d['revisions']) or None,'content':p['content'],'hash':hashlib.sha256(p['content'].encode()).hexdigest(),'final':p.get('final',False),'relation':p.get('relation'),'finding_ids':p.get('finding_ids',[]),'decision_ids':p.get('decision_ids',[]),'created_at':now()}; d['revisions'].append(r)
    elif typ=='log': require(isinstance(p.get('text'),str),'missing_log'); w['logs'].append({**p,'at':now()})
    elif typ=='handoff':
        require(all(k in p for k in ('next_step','next_owner','blockers','failures','limitations')),'incomplete_handoff')
        w['handoffs'].append({**p,'at':now()}); w['next_step']=p['next_step']; w['next_owner']=p['next_owner']
    elif typ=='evidence':
        validate_evidence(p)
        eid=p.get('id'); require(isinstance(eid,str) and eid not in w['evidence'],'invalid_or_duplicate_evidence')
        require(all(k in p for k in ('command','result','outcome','source_commit','environment')),'incomplete_evidence')
        try: blob=base64.b64decode(p.get('blob_base64',''),validate=True)
        except Exception: raise Fault(422,'invalid_blob')
        require(len(blob)<=1024*1024,'blob_too_large',413)
        h=digest(blob); blobs[h]=blob
        w['evidence'][eid]={k:v for k,v in p.items() if k!='blob_base64'}; w['evidence'][eid].update(blob_hash=h,observed_at=now())
    elif typ=='approve':
        require(p.get('document_id') in w['documents'],'document_not_found')
        d=w['documents'][p['document_id']]; require(d['revisions'] and d['revisions'][-1]['final'],'not_final')
        require(not document_authored(),'independent_approval_required',403)
        w.setdefault('approvals',[]).append({'document_id':d['id'],'revision':d['revisions'][-1]['revision'],'principal':principal,'at':now()})
    validate_workflow(w)
    return blobs
