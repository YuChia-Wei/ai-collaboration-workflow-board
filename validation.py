"""Shared aggregate invariants for admission and portable restore."""
import hashlib
STATES={'planned':['active'],'active':['blocked','completed'],'blocked':['active'],'completed':[]}
COMMANDS={'create_workflow','update_workflow','add_step','update_step','document','log','handoff','evidence','approve'}
ROLES={'read','write','approve','export'}
class Fault(Exception):
    def __init__(self,status,code,**details):self.status=status;self.body={'error':code,**details}
def require(ok,code,status=422,**details):
    if not ok:raise Fault(status,code,**details)
def text_value(x):return isinstance(x,str) and bool(x.strip())
def integer(x):return type(x) is int and x>=0
def string_list(x):return isinstance(x,list) and all(text_value(v) for v in x) and len(x)==len(set(x))
def validate_evidence(e):
    require(isinstance(e,dict),'invalid_evidence')
    require(all(text_value(e.get(k)) for k in ('id','command','result','source_commit')),'invalid_evidence_content')
    require(e.get('outcome') in {'passed','failed','interrupted','blocked'},'invalid_evidence_outcome')
    require(isinstance(e.get('environment'),dict) and bool(e['environment']),'invalid_evidence_environment')
    require(all(text_value(k) and isinstance(v,(str,int,float,bool)) and v is not None and (not isinstance(v,str) or text_value(v)) for k,v in e['environment'].items()),'invalid_evidence_environment')
def validate_workflow(w):
    require(isinstance(w,dict),'invalid_workflow')
    for k in ('id','namespace','title','goal','authorized_scope','policy_version','template_version','next_step','next_owner'):require(text_value(w.get(k)),'invalid_workflow_field',field=k)
    require(isinstance(w.get('source'),dict) and all(text_value(w['source'].get(k)) for k in ('repo','commit','branch')),'invalid_source_provenance')
    require(w.get('status') in STATES and integer(w.get('revision')),'invalid_workflow_lifecycle')
    require(string_list(w.get('required_documents')),'invalid_required_documents')
    require(isinstance(w.get('legacy_mapping'),dict) and isinstance(w.get('external_links'),list),'invalid_source_mapping')
    require(isinstance(w.get('steps'),dict) and isinstance(w.get('documents'),dict) and isinstance(w.get('evidence'),dict),'invalid_record_collections')
    for eid,e in w['evidence'].items():
        validate_evidence(e);require(eid==e['id'] and text_value(e.get('blob_hash')) and text_value(e.get('observed_at')),'invalid_evidence_relationship')
    for sid,s in w['steps'].items():
        require(isinstance(s,dict) and text_value(sid) and sid==s.get('id'),'invalid_step_identity')
        require(s.get('status') in STATES and integer(s.get('order')) and all(text_value(s.get(k)) for k in ('title','owner_skill')),'invalid_step_fields')
        require(string_list(s.get('evidence_ids')) and all(i in w['evidence'] for i in s['evidence_ids']),'invalid_step_relationship')
        require(isinstance(s.get('blockers'),list) and all(text_value(x) for x in s['blockers']),'invalid_step_blockers')
        require(s.get('result') is None or isinstance(s['result'],str),'invalid_step_result')
        if s['status']=='completed':require(text_value(s['result']) and bool(s['evidence_ids']),'missing_required_evidence')
    for did,d in w['documents'].items():
        require(isinstance(d,dict) and text_value(did) and did==d.get('id') and text_value(d.get('name')) and text_value(d.get('kind')),'invalid_document_identity')
        require(type(d.get('deleted')) is bool and type(d.get('required')) is bool and (d.get('step_id') is None or d['step_id'] in w['steps']),'invalid_document_relationship')
        require(isinstance(d.get('revisions'),list) and bool(d['revisions']),'invalid_document_revisions')
        if d['required']:require(did in w['required_documents'],'required_index_mismatch')
        if d['deleted']:require(text_value(d.get('deleted_at')),'invalid_tombstone')
        for i,r in enumerate(d['revisions'],1):
            require(isinstance(r,dict) and type(r.get('revision')) is int and r['revision']==i and r.get('previous')==(i-1 or None),'invalid_revision_chain')
            require(isinstance(r.get('content'),str) and hashlib.sha256(r['content'].encode()).hexdigest()==r.get('hash') and type(r.get('final')) is bool and text_value(r.get('created_at')),'invalid_revision_content')
            require(string_list(r.get('finding_ids')) and string_list(r.get('decision_ids')),'invalid_revision_ids')
            require(r.get('relation') in {None,'erratum','addendum','successor','derived'},'invalid_revision_relation')
            if i>1 and d['revisions'][i-2]['final']:require(r.get('relation') in {'erratum','addendum','successor'},'final_requires_successor')
    require(isinstance(w.get('logs'),list) and all(isinstance(x,dict) and text_value(x.get('text')) and text_value(x.get('at')) for x in w['logs']),'invalid_logs')
    require(isinstance(w.get('handoffs'),list),'invalid_handoffs')
    for h in w['handoffs']:require(isinstance(h,dict) and all(text_value(h.get(k)) for k in ('next_step','next_owner','at')) and all(isinstance(h.get(k),list) and all(text_value(x) for x in h[k]) for k in ('blockers','failures','limitations')),'invalid_handoff')
    require(isinstance(w.get('limitations'),list) and all(text_value(x) for x in w['limitations']),'invalid_limitations')
    require(isinstance(w.get('approvals',[]),list),'invalid_approvals')
    for a in w.get('approvals',[]):
        require(isinstance(a,dict) and text_value(a.get('principal')) and text_value(a.get('at')) and a.get('document_id') in w['documents'] and type(a.get('revision')) is int,'invalid_approval')
        d=w['documents'][a['document_id']];require(0<a['revision']<=len(d['revisions']) and d['revisions'][a['revision']-1]['final'],'invalid_approval_revision')
    if w['status']=='completed':
        require(bool(w['steps']) and all(s['status']=='completed' for s in w['steps'].values()),'incomplete_steps')
        require(all(d in w['documents'] and not w['documents'][d]['deleted'] for d in w['required_documents']),'missing_required_documents')
    return w
