import {demand} from './errors.mjs';
import {nonempty,hash} from './values.mjs';

export const states={planned:['active'],active:['blocked','completed'],blocked:['active'],completed:[]};
export function validate(w){
 demand(w&&nonempty(w.title)&&nonempty(w.goal)&&nonempty(w.next_step)&&nonempty(w.next_owner),'missing_workflow_fields');
 demand(Object.hasOwn(states,w.status),'invalid_status');demand(Array.isArray(w.required_documents),'invalid_required_documents');
 for(const s of Object.values(w.steps)){demand(Object.hasOwn(states,s.status)&&nonempty(s.title),'invalid_step');demand(Array.isArray(s.evidence_ids)&&s.evidence_ids.every(id=>Object.hasOwn(w.evidence,id)),'invalid_evidence_reference');if(s.status==='completed')demand(nonempty(s.result)&&s.evidence_ids.length>0,'missing_required_evidence');}
 for(const d of Object.values(w.documents)){if(d.required)demand(w.required_documents.includes(d.id),'required_index_mismatch');demand(d.revisions.length>0,'missing_document_revision');}
 if(w.status==='completed'){demand(Object.keys(w.steps).length>0&&Object.values(w.steps).every(s=>s.status==='completed'),'incomplete_steps');demand(w.required_documents.every(id=>w.documents[id]&&!w.documents[id].deleted),'missing_required_documents');}
 return w;
}

export async function applyLegacyCommand(workflow,c,time){
 const p=c.payload,t=c.type;
 const row=workflow;
 let w;
 if(t==='create_workflow'){
  demand(!row,'workflow_exists','conflict');demand(c.expected_revision===0,'revision_conflict','conflict');
  w={id:c.workflow_id,title:p.title,goal:p.goal,authorized_scope:'本人私有 Sites UI；合成資料',source:{repo:'synthetic://sites-demonstration',commit:'synthetic-v1',branch:'synthetic'},policy_version:'sites-ui-preview-1',template_version:'synthetic-1',status:'planned',revision:0,next_step:p.next_step||'補充第一個步驟',next_owner:p.next_owner||'本人',required_documents:[],steps:{},documents:{},evidence:{},logs:[],handoffs:[]};
 }else{demand(row,'workflow_not_found','not_found');w=structuredClone(row);demand(c.expected_revision===w.revision,'revision_conflict','conflict',{current_revision:w.revision});}
 const before=w.revision;
 if(t==='update_workflow'){
  demand(Object.keys(p).every(k=>['title','goal','next_step','next_owner','status','required_documents'].includes(k)),'invalid_fields');
  if('status'in p)demand(states[w.status].includes(p.status),'illegal_transition');Object.assign(w,p);
 }else if(t==='add_step'){
  demand(nonempty(p.id)&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(p.id)&&!Object.hasOwn(w.steps,p.id)&&nonempty(p.title),'invalid_step');w.steps[p.id]={id:p.id,title:p.title,order:Object.keys(w.steps).length+1,owner_skill:p.owner_skill||'本人',status:'planned',result:null,evidence_ids:[],blockers:[]};
 }else if(t==='update_step'){
  demand(Object.hasOwn(w.steps,p.id),'step_not_found');demand(Object.keys(p).every(k=>['id','status','result','evidence_ids','blockers'].includes(k)),'invalid_fields');const s=w.steps[p.id];if('status'in p)demand(states[s.status].includes(p.status),'illegal_transition');Object.assign(s,p);
 }else if(t==='document'){
  demand(nonempty(p.id)&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(p.id)&&['create','revise','rename','archive'].includes(p.action),'invalid_document_action');let d=Object.hasOwn(w.documents,p.id)?w.documents[p.id]:null;
  if(p.action==='create'){demand(!d,'document_exists');d={id:p.id,name:p.name||'未命名文件',kind:'markdown',required:!!p.required,deleted:false,revisions:[]};w.documents[p.id]=d;if(d.required)w.required_documents.push(d.id);}
  else demand(d&&!d.deleted,'document_not_found');
  if(p.action==='archive'){demand(!w.required_documents.includes(d.id),'required_document_archive_forbidden');d.deleted=true;d.deleted_at=time;}
  if(p.action==='rename'){demand(nonempty(p.name),'missing_name');d.name=p.name;}
  if(['create','revise'].includes(p.action)){demand(typeof p.content==='string','missing_content');if(d.revisions.at(-1)?.final)demand(['erratum','addendum','successor'].includes(p.relation),'final_requires_successor');d.revisions.push({revision:d.revisions.length+1,previous:d.revisions.length||null,content:p.content,hash:await hash(p.content),final:!!p.final,relation:p.relation||null,created_at:time,finding_ids:[],decision_ids:[]});}
 }else if(t==='log'){demand(nonempty(p.text),'missing_log');w.logs.push({text:p.text,at:time});}
 else if(t==='handoff'){demand(nonempty(p.next_step)&&nonempty(p.next_owner)&&['blockers','failures','limitations'].every(k=>Array.isArray(p[k])&&p[k].every(nonempty)),'invalid_handoff');w.handoffs.push({...p,at:time});w.next_step=p.next_step;w.next_owner=p.next_owner;}
 else if(t==='evidence'){
  demand(['id','command','result','source_commit'].every(k=>nonempty(p[k]))&&['passed','failed','interrupted','blocked'].includes(p.outcome),'invalid_evidence');demand(p.environment&&typeof p.environment==='object'&&Object.keys(p.environment).length>0&&Object.values(p.environment).every(v=>v!==null&&(typeof v!=='string'||nonempty(v))),'invalid_environment');demand(!('blob_base64'in p),'attachments_not_supported_in_preview');demand(!w.evidence[p.id],'evidence_exists');w.evidence[p.id]={...p,observed_at:time};
 }else demand(t==='create_workflow','command_not_allowed','forbidden');
 validate(w);w.revision=before+1;
 return {w,before,t,time};
}
