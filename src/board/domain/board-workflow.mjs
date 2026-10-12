import {Fault,demand} from './errors.mjs';
import {nonempty,hash,bytes} from './values.mjs';

export const PROFILE='framework-board/1';
export const idOK=x=>nonempty(x)&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(x)&&!['__proto__','constructor','prototype'].includes(x);
export const statuses=['pending','in_progress','completed','deferred'];
export const resultOK=t=>nonempty(t.result_summary)&&['addressed','no_findings'].includes(t.finding_status);
export const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
export const keys=(p,allowed)=>demand(Object.keys(p).every(k=>allowed.includes(k)),'invalid_fields');
export const textList=x=>Array.isArray(x)&&x.every(nonempty);
export const sourceOK=source=>{demand(object(source),'invalid_source');keys(source,['repo','commit','branch']);for(const key of ['repo','commit','branch'])demand(source[key]===null||source[key]===undefined||typeof source[key]==='string','invalid_source');if(source.repo){let url;try{url=new URL(source.repo);}catch{throw new Fault(422,'invalid_source');}demand(url.protocol==='https:'&&!url.username&&!url.password,'invalid_source');}};
export function validateBoard(w){
 demand(['id','title','goal','workflow_kind','owner_skill','authorized_scope','next_step','next_owner'].every(k=>nonempty(w[k])),'missing_workflow_fields');
 demand(w.service_contract_version===PROFILE&&w.execution_kind==='human'&&w.lifecycle_contract==='1.0','invalid_profile');
 demand(statuses.includes(w.status),'invalid_status');
 const tasks=Object.values(w.steps);
 for(const t of tasks){
  demand(idOK(t.id)&&t.workflow_id===w.id&&nonempty(t.title)&&nonempty(t.owner_skill)&&statuses.includes(t.status),'invalid_task');
  demand(textList(t.evidence_ids)&&t.evidence_ids.every(id=>Object.hasOwn(w.evidence,id)),'invalid_evidence_reference');
  if(t.status==='completed')demand(resultOK(t),'missing_task_result');
  if(t.status==='deferred')demand(nonempty(t.deferred_reason)&&nonempty(t.resume_condition),'missing_deferred_context');
 }
 const active=tasks.filter(t=>t.status==='in_progress').length;
 if(w.status==='in_progress')demand(active===1,'exactly_one_active_task');
 else demand(active===0,'inactive_workflow_has_active_task');
 if(w.status==='deferred')demand(nonempty(w.deferred_reason)&&nonempty(w.resume_condition),'missing_deferred_context');
 if(w.status==='completed'){
  demand(tasks.length>0&&tasks.every(t=>t.status==='completed'),'incomplete_tasks');
  demand(['completed','closed'].includes(w.current_phase),'invalid_terminal_phase');
  demand(nonempty(w.result_summary)&&['addressed','no_findings'].includes(w.finding_status),'missing_workflow_result');
  demand(w.required_documents.every(id=>Object.hasOwn(w.documents,id)&&!w.documents[id].deleted),'missing_required_documents');
 }
 demand(bytes({...w,steps:{},documents:{},evidence:{},logs:[],handoffs:[]})<=64000,'metadata_too_large',413);
 return w;
}

// Reducer has no HTTP or persistence dependencies. Time is supplied by the use case.
export async function applyBoardCommand(workflow,c,time){
 const p=c.payload,type=c.type;let w=workflow?structuredClone(workflow):null;
 const previous=w?structuredClone(w):null;
 if(type==='create_workflow'){
  demand(!w,'workflow_exists',409);demand(c.expected_revision===0,'revision_conflict',409);
  keys(p,['title','goal','workflow_kind','owner_skill','authorized_scope','next_step','next_owner','source','work_items','extensions']);
  if(p.source)sourceOK(p.source);
  demand(!p.work_items||Array.isArray(p.work_items)&&p.work_items.length<=30&&p.work_items.every(x=>object(x)&&nonempty(x.url)&&/^https:\/\//.test(x.url)),'invalid_work_items');
  demand(!p.extensions||object(p.extensions),'invalid_extensions');
  w={id:c.workflow_id,workflow_id:c.workflow_id,schema_version:'1.0',service_contract_version:PROFILE,execution_kind:'human',lifecycle_contract:'1.0',record_mode:'board',namespace:'personal',...p,status:'pending',current_phase:'planning',revision:0,created_at:time,updated_at:time,template_source:'workflow-board/manual',template_version:'1.0',entrypoint:'overview',artifact_root:null,source:p.source||{},work_items:p.work_items||[],extensions:p.extensions||{},required_documents:[],steps:{},documents:{},logs:[],handoffs:[],evidence:{}};
 }else{demand(w,'workflow_not_found',404);demand(w.revision===c.expected_revision,'revision_conflict',409,{current_revision:w.revision});}
 const before=w.revision;const revisions=[];let entry=null;
 if(type==='update_workflow'){
  keys(p,['title','goal','workflow_kind','owner_skill','authorized_scope','next_step','next_owner','source','work_items','extensions']);
  if(p.source)sourceOK(p.source);if(p.extensions)demand(object(p.extensions),'invalid_extensions');
  if(p.work_items)demand(Array.isArray(p.work_items)&&p.work_items.length<=30&&p.work_items.every(x=>object(x)&&nonempty(x.url)&&/^https:\/\//.test(x.url)),'invalid_work_items');Object.assign(w,p);
 }else if(type==='add_task'){
  keys(p,['id','title','owner_skill','dependencies','extensions']);demand(idOK(p.id)&&!Object.hasOwn(w.steps,p.id)&&nonempty(p.title)&&nonempty(p.owner_skill),'invalid_task');
  demand(!p.dependencies||textList(p.dependencies)&&p.dependencies.every(id=>id!==p.id&&Object.hasOwn(w.steps,id)),'invalid_dependency');
  demand(w.status!=='completed','terminal_workflow');
  w.steps[p.id]={...p,task_id:p.id,workflow_id:w.id,schema_version:'1.0',status:'pending',order:Object.keys(w.steps).length+1,created_at:time,updated_at:time,template_source:'workflow-board/manual-task',template_version:'1.0',execution_kind:'human',model:null,reasoning_effort:null,result_summary:null,finding_status:'open',evidence_ids:[],dependencies:p.dependencies||[],extensions:p.extensions||{}};
 }else if(type==='transition'){
  keys(p,['task_id','status','result_summary','finding_status','deferred_reason','resume_condition','next_task_id','workflow_status','workflow_result','workflow_finding_status','next_step','next_owner','evidence_ids']);
  demand(w.status!=='completed','terminal_workflow');
  if(p.task_id){demand(idOK(p.task_id)&&Object.hasOwn(w.steps,p.task_id),'task_not_found');const task=w.steps[p.task_id];demand(task.status!=='completed','terminal_task');demand(statuses.includes(p.status),'invalid_status');
   for(const key of ['status','result_summary','finding_status','deferred_reason','resume_condition','evidence_ids'])if(key in p)task[key]=p[key];task.updated_at=time;
   if(p.status==='in_progress'){demand((task.dependencies||[]).every(id=>Object.hasOwn(w.steps,id)&&w.steps[id].status==='completed'),'unmet_dependencies');w.status='in_progress';w.current_phase='execution';}
  }
  if(p.next_task_id){demand(idOK(p.next_task_id)&&Object.hasOwn(w.steps,p.next_task_id),'invalid_next_task');const task=w.steps[p.next_task_id];demand(['pending','deferred'].includes(task.status),'invalid_next_task');demand((task.dependencies||[]).every(id=>Object.hasOwn(w.steps,id)&&w.steps[id].status==='completed'),'unmet_dependencies');task.status='in_progress';task.updated_at=time;w.status='in_progress';w.current_phase='execution';}
  if(p.workflow_status){demand(statuses.includes(p.workflow_status),'invalid_status');w.status=p.workflow_status;w.current_phase=p.workflow_status==='completed'?'completed':p.workflow_status==='in_progress'?'execution':p.workflow_status==='deferred'?'deferred':'planning';}
  for(const key of ['next_step','next_owner'])if(key in p)w[key]=p[key];
  if(p.workflow_result!==undefined)w.result_summary=p.workflow_result;if(p.workflow_finding_status!==undefined)w.finding_status=p.workflow_finding_status;
  if(w.status==='deferred'){w.deferred_reason=p.deferred_reason;w.resume_condition=p.resume_condition;}
 }else if(type==='document'){
  keys(p,['id','action','name','content','required','final','relation']);demand(idOK(p.id)&&['create','revise','rename','archive'].includes(p.action),'invalid_document_action');let d=Object.hasOwn(w.documents,p.id)?w.documents[p.id]:null;
  if(p.action==='create'){demand(!d,'document_exists');d={id:p.id,name:p.name||p.id,kind:'markdown',required:!!p.required,deleted:false,created_at:time,revisions:[]};w.documents[p.id]=d;if(d.required)w.required_documents.push(d.id);}else demand(d&&!d.deleted,'document_not_found');
  if(p.action==='archive'){demand(!w.required_documents.includes(d.id),'required_document_archive_forbidden');d.deleted=true;d.deleted_at=time;}
  if(p.action==='rename'){demand(nonempty(p.name),'missing_name');d.name=p.name;}
  if(['create','revise'].includes(p.action)){demand(typeof p.content==='string','missing_content');demand(bytes(p.content)<=256000,'document_too_large',413);if(d.revisions.at(-1)?.final)demand(['erratum','addendum','successor'].includes(p.relation),'final_requires_successor');
   const r={document_id:d.id,revision:d.revisions.length+1,hash:await hash(p.content),final:!!p.final,relation:p.relation||null,created_at:time};d.revisions.push(r);revisions.push({...r,content:p.content});}
  d.updated_at=time;
 }else if(type==='log'){keys(p,['text']);demand(nonempty(p.text)&&bytes(p.text)<=32000,'invalid_log');entry={kind:'log',id:c.operation_id,body:{text:p.text,at:time}};
 }else if(type==='handoff'){keys(p,['next_step','next_owner','blockers','failures','limitations']);demand(nonempty(p.next_step)&&nonempty(p.next_owner)&&['blockers','failures','limitations'].every(k=>textList(p[k])),'invalid_handoff');Object.assign(w,{next_step:p.next_step,next_owner:p.next_owner});entry={kind:'handoff',id:c.operation_id,body:{...p,at:time}};
 }else if(type==='evidence'){
  keys(p,['id','command','result','source_commit','outcome','environment']);demand(idOK(p.id)&&!Object.hasOwn(w.evidence,p.id)&&['command','result'].every(k=>nonempty(p[k]))&&['passed','failed','interrupted','blocked','not_run'].includes(p.outcome)&&object(p.environment),'invalid_evidence');
  const evidence={...p,observed_at:time};w.evidence[p.id]=evidence;entry={kind:'evidence',id:'evidence:'+p.id,body:evidence};
 }else demand(type==='create_workflow','command_not_allowed',403);
 validateBoard(w);w.revision=before+1;w.updated_at=time;
 return {w,previous,before,revisions,entry,type,time};
}
