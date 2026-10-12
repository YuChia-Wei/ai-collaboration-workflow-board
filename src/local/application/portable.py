"""Validate portable package contracts independently of HTTP and persistence."""
import base64, copy, hashlib, json
from ..domain.serialization import digest
from ..domain.validation import Fault, require, COMMANDS, ROLES, text_value, integer, string_list, validate_workflow

def _preflight(pack, history_validator):
    require(isinstance(pack,dict) and set(pack)=={'manifest','payload'},'invalid_package')
    m=pack['manifest']; p=pack['payload']
    require(m.get('format')=='workflow-portable' and m.get('version')==1 and m.get('schema_version')==1,'unsupported_schema')
    require(m.get('identity_rebinding_required') is True and m.get('external_effects_enabled') is False and m.get('secrets_included') is False,'unsafe_manifest')
    require(digest(p)==m.get('payload_sha256'),'package_hash_mismatch')
    require(set(p)=={'workflows','events','operations','blobs','role_mapping'},'invalid_payload_tables')
    require(m['counts']=={k:len(v) for k,v in p.items()},'count_mismatch')
    require(all(isinstance(p[k],list) for k in ('workflows','events','operations','role_mapping')) and isinstance(p['blobs'],dict),'invalid_payload_types')
    require(text_value(m.get('namespace')) and integer(m.get('cutoff_seq')),'invalid_manifest_fields')
    principals={}
    for r in p['role_mapping']:
        require(isinstance(r,dict) and text_value(r.get('principal')) and string_list(r.get('roles')) and set(r['roles'])<=ROLES,'invalid_role_mapping')
        require(r['principal'] not in principals,'duplicate_principal_mapping');principals[r['principal']]=r['roles']
    ns=m['namespace']; ws={w['id']:w for w in p['workflows']}; require(len(ws)==len(p['workflows']),'duplicate_workflow')
    ops={(o['namespace'],o['id']):o for o in p['operations']}; require(len(ops)==len(p['operations']),'duplicate_operation')
    seqs=set(); revisions={wid:0 for wid in ws}
    for e in p['events']:
        require(isinstance(e,dict) and integer(e.get('seq')) and e['seq']>0 and integer(e.get('before_revision')) and integer(e.get('after_revision')) and text_value(e.get('at')),'invalid_event_fields')
        require(e['namespace']==ns and e['workflow_id'] in ws and e['seq'] not in seqs,'invalid_event_relationship')
        require(e['seq']>max(seqs,default=0),'event_order'); seqs.add(e['seq'])
        require(e['before_revision']==revisions[e['workflow_id']] and e['after_revision']==e['before_revision']+1,'event_revision_gap'); revisions[e['workflow_id']]=e['after_revision']
        op=ops.get((ns,e['operation_id'])); require(op is not None and op['payload_hash']==digest(e['command']) and op['principal']==e['principal'],'invalid_operation_relationship')
        c=e['command'];require(isinstance(c,dict) and c.get('type') in COMMANDS and isinstance(c.get('payload'),dict),'invalid_historical_command')
        require(text_value(e.get('client')) and text_value(e.get('session')) and e['client']==c.get('client','unknown') and e['session']==c.get('session','unknown'),'invalid_event_client_metadata')
        require(c.get('namespace')==ns and c.get('workflow_id')==e['workflow_id'] and c.get('operation_id')==e['operation_id'] and type(c.get('expected_revision')) is int and c['expected_revision']==e['before_revision'],'invalid_command_relationship')
        require(e['principal'] in principals and ('approve' if c['type']=='approve' else 'write') in principals[e['principal']],'missing_historical_role')
        result=json.loads(op['result'])
        expected={'accepted':True,'event_seq':e['seq'],'revision':e['after_revision'],'workflow_id':e['workflow_id'],'operation_id':e['operation_id'],'payload_hash':op['payload_hash'],'principal':op['principal']}
        require(isinstance(result,dict) and set(result)==set(expected) and result==expected and result['accepted'] is True and type(result['revision']) is int and type(result['event_seq']) is int,'invalid_operation_result')
    require(len(seqs)==len(ops) and m['cutoff_seq']==max(seqs,default=0),'operation_event_count_mismatch')
    for h,b in p['blobs'].items():
        try: data=base64.b64decode(b,validate=True)
        except Exception: raise Fault(422,'invalid_blob')
        require(digest(data)==h,'blob_hash_mismatch')
    for w in ws.values():
        validate_workflow(w)
        require(w['namespace']==ns and w['revision']==revisions[w['id']],'invalid_workflow_revision')
        for sid,s in w['steps'].items():
            require(sid==s['id'] and all(x in w['evidence'] for x in s['evidence_ids']),'invalid_step_relationship')
        for did,d in w['documents'].items():
            require(did==d['id'] and (d['step_id'] is None or d['step_id'] in w['steps']),'invalid_document_relationship')
            for i,r in enumerate(d['revisions'],1): require(r['revision']==i and r['previous']==(i-1 or None) and hashlib.sha256(r['content'].encode()).hexdigest()==r['hash'],'revision_hash_or_chain_mismatch')
        for eid,e in w['evidence'].items(): require(e['id']==eid and e['blob_hash'] in p['blobs'],'invalid_blob_relationship')
    history_validator(p,ns,principals)
    return {'valid':True,'counts':m['counts'],'payload_sha256':m['payload_sha256'],'identity_rebinding_required':True,'external_effects_enabled':False}

def semantic_workflow(w):
    # Remove only service-generated timestamp fields; preserve every authored value.
    w=copy.deepcopy(w)
    for x in w['logs']+w['handoffs']+w.get('approvals',[]):x.pop('at',None)
    for d in w['documents'].values():
        d.pop('deleted_at',None)
        for r in d['revisions']:r.pop('created_at',None)
    for e in w['evidence'].values():e.pop('observed_at',None)
    return w

def validate_history(p, ns, principals, replay_service):
    """Replay local record rules in an isolated repository supplied by composition."""
    for e in p['events']:
        replay_service.command(e['principal'],e['command'])
    with replay_service.db() as db:
        for w in p['workflows']:
            actual=replay_service.load(db,w['id'],ns)
            require(semantic_workflow(actual)==semantic_workflow(w),'history_snapshot_mismatch')
        require(replay_service.repository.all_blobs(db)==p['blobs'],'history_blob_mismatch')

def preflight(pack, history_validator):
    try:return _preflight(pack,history_validator)
    except Fault:raise
    except (KeyError,TypeError,ValueError,AttributeError,OverflowError):raise Fault(422,'invalid_package_structure')
