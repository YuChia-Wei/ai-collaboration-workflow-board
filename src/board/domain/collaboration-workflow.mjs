import {demand} from './errors.mjs';
import {canonicalJson,contentDigest} from './collaboration-values.mjs';

export const COLLABORATION_PROFILE='workflow-board/collaboration/1';
const terminal=status=>['completed','cancelled'].includes(status);
const equal=(a,b)=>canonicalJson(a)===canonicalJson(b);
const size=value=>new TextEncoder().encode(canonicalJson(value)).length;
const increment=value=>{demand(Number.isSafeInteger(value)&&value<Number.MAX_SAFE_INTEGER,'limit_exceeded','limit_exceeded');return value+1;};
const owns=(access,actor)=>equal(access.actor,actor);
export const requireCapability=(access,name)=>demand(access.capabilities.includes(name),'forbidden','forbidden');
export const commandCapability=command=>command.startsWith('workflow.')?(command==='workflow.create'?'plan':'manage'):command==='plan.revise'?'plan':command==='task.cancel'?'manage':command==='task.unblock'?'plan':command.startsWith('task.')?'execute':command==='decision.resolve'?'decide':'plan';
export function authorizeCollaborationCommand(access,command){
 if(['task.release','task.block'].includes(command)&&access.capabilities.includes('manage'))return;
 requireCapability(access,commandCapability(command));
}
const canDecide=(access,decision)=>access.capabilities.includes('decide')&&(decision.required_decider.kind==='human'?access.actor.kind==='human':access.actor.subject_id===decision.required_decider.subject_id);
const docKey=ref=>ref.document_id+'@'+ref.revision;
const taskDocs=definition=>[definition.plan_basis,...definition.inputs.filter(input=>input.kind==='document').map(input=>input.ref)];
const idsUnique=values=>new Set(values).size===values.length;
const pendingDecision=d=>d.status==='pending';
const blocksTask=(decision,task)=>pendingDecision(decision)&&(decision.blocks.task_ids.includes(task.id)||task.definition.decision_ids.includes(decision.id));

export function collaborationHeader(w){
 return {title:w.title,goal:w.goal,scope:w.scope,status:w.status,plan:w.plan,skill:w.skill,external_work_refs:w.external_work_refs,completion_requirements:w.completion_requirements,requirement_dispositions:w.requirement_dispositions,result:w.result};
}
export function taskReady(w,task){
 return task.status==='pending'&&!task.assignment&&task.definition.dependencies.every(id=>w.tasks[id]?.status==='completed')&&
 task.definition.inputs.every(input=>input.kind==='document'||input.ref.availability==='available'&&input.ref.observed_at!==null)&&
 !Object.values(w.decisions).some(decision=>blocksTask(decision,task));
}
export const taskClaimable=(w,task)=>w.status==='active'&&taskReady(w,task);

function validateDag(tasks){
 const done=new Set(),visiting=new Set();
 function visit(id){
  demand(Object.hasOwn(tasks,id),'invalid_dependency');
  if(done.has(id))return;
  demand(!visiting.has(id),'dependency_cycle');
  visiting.add(id);
  for(const dependency of tasks[id].definition.dependencies){demand(dependency!==id,'invalid_dependency');visit(dependency);}
  visiting.delete(id);done.add(id);
 }
 Object.keys(tasks).forEach(visit);
}

/**
 * Pure collaboration reducer. Inputs were structurally checked by the inbound
 * contract validator. documentRefs/evidence are bounded reference metadata
 * loaded with complete command state, not live IO or a truncated UI context.
 * Returned facts are appended by the same transaction as state and receipt.
 */
export async function applyCollaborationCommand(state,c,{access,time,newId,documentRefs=[],evidence=[]}){
 access={...access,actor:structuredClone(access.actor),capabilities:[...access.capabilities]};
 const before=state?.revision??0;
 authorizeCollaborationCommand(access,c.command);
 if(c.command==='workflow.create')demand(!state,'workflow_exists','conflict');
 else demand(state,'workflow_not_found','not_found');
 demand(c.expected_revision===before,'revision_conflict','conflict',{current_revision:before});
 const facts={documents:[],task_definitions:[],decision_revisions:[],assignments:[],handoffs:[],checkpoints:[],evidence:[]};
 const effects=[],p=c.payload;
 let w=state?structuredClone(state):null;
 const references=new Map(documentRefs.map(ref=>[docKey(ref),ref]));
 const knownEvidence=new Map(evidence.map(item=>[item.id,item]));
 const task=id=>{demand(w&&Object.hasOwn(w.tasks,id),'task_not_found','not_found');return w.tasks[id];};
 const decision=id=>{demand(w&&Object.hasOwn(w.decisions,id),'decision_not_found','not_found');return w.decisions[id];};
 const checkDocument=ref=>demand(equal(references.get(docKey(ref))??null,ref),'revision_not_found','not_found');
 const checkInput=input=>{if(input.kind==='document')checkDocument(input.ref);};
 const effect=(kind,id,revision)=>effects.push({kind,id,revision});
 const generated=kind=>{const id=newId(kind);demand(typeof id==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(id)&&!['constructor','prototype','__proto__'].includes(id),'invalid_generated_id','unavailable');return id;};
 function writeDecision(d){
  facts.decision_revisions.push(structuredClone(d));effect('decision',d.id,d.revision);
 }
 function closeAssignment(t,outcome){
  effect('assignment',t.assignment.ref.assignment_id,t.assignment.ref.generation);
  facts.assignments.push({...structuredClone(t.assignment),task_id:t.id,status:outcome,ended_at:time,ended_by:access.actor,workflow_revision:increment(before)});
  t.assignment=null;
 }
 function currentAssignment(t,provided,allowManager=false){
  demand(t.assignment&&provided.assignment_id===t.assignment.ref.assignment_id&&provided.generation===t.assignment.ref.generation,'assignment_expired','conflict');
  demand(provided.definition_revision===t.definition_revision,'definition_conflict','conflict');
  demand(owns(access,t.assignment.actor)||allowManager&&access.capabilities.includes('manage'),'assignment_actor_mismatch','forbidden');
 }
 function saveHandoff(taskId,value){
  value.artifact_refs.forEach(checkInput);
  const item={id:generated('handoff'),task_id:taskId,actor:access.actor,created_at:time,workflow_revision:increment(before),handoff:structuredClone(value)};
  facts.handoffs.push(item);w.latest_handoff_id=item.id;effect('handoff',item.id,1);
 }
 function saveEvidence(items){
  demand(idsUnique(items.map(item=>item.id)),'invalid_evidence');
  for(const item of items){
   item.artifact_refs.forEach(checkInput);
   const prior=knownEvidence.get(item.id);
   demand(!prior||equal(prior,item),'evidence_exists','conflict');
   if(!prior){knownEvidence.set(item.id,structuredClone(item));facts.evidence.push(structuredClone(item));}
  }
 }
 async function appendDocument(input,purpose){
  const previous=w.document_heads[input.document_id];
  demand(input.expected_document_revision===(previous?.ref.revision??0),'document_revision_conflict','conflict');
  demand(new TextEncoder().encode(input.content).length<=256000,'limit_exceeded','limit_exceeded');
  demand(!previous||previous.purpose===purpose,'document_role_conflict','conflict');
  const ref={document_id:input.document_id,revision:increment(input.expected_document_revision),content_hash:await contentDigest(input.content)};
  w.document_heads[input.document_id]={ref,purpose};
  references.set(docKey(ref),ref);
  facts.documents.push({workflow_ref:c.workflow_ref,ref,content:input.content,created_at:time,actor:access.actor});
  effect('document',ref.document_id,ref.revision);return ref;
 }
 if(c.command==='workflow.create'){
  demand(!state,'workflow_exists','conflict');
  w={workflow_ref:structuredClone(c.workflow_ref),title:p.title,goal:p.goal,scope:structuredClone(p.scope),skill:structuredClone(p.skill),external_work_refs:structuredClone(p.external_work_refs),status:'draft',revision:0,plan:null,tasks:{},decisions:{},document_heads:{},completion_requirements:[],requirement_dispositions:[],latest_handoff_id:null,created_at:time,updated_at:time,result:null};
 }else{
  demand(w,'workflow_not_found','not_found');
  demand(equal(w.workflow_ref,c.workflow_ref),'workflow_ref_mismatch','forbidden');
  if(terminal(w.status))demand(['checkpoint.append','handoff.record','document.append'].includes(c.command),'terminal_workflow','conflict');
 }
 if(c.command==='plan.revise'){
  demand(idsUnique(p.task_changes.map(change=>change.definition.id))&&idsUnique(p.unaffected_task_ids),'invalid_task_changes');
  const changed=new Set(p.task_changes.map(change=>change.definition.id)),unaffected=new Set(p.unaffected_task_ids);
  for(const id of changed)demand(!unaffected.has(id),'invalid_task_changes');
  for(const t of Object.values(w.tasks).filter(t=>!terminal(t.status)))demand(changed.has(t.id)||unaffected.has(t.id),'missing_task_disposition');
  for(const id of unaffected)demand(Object.hasOwn(w.tasks,id)&&!terminal(w.tasks[id].status),'invalid_task_changes');
  if(p.execution_impact==='none')demand(!p.task_changes.length&&!p.decision_dispositions.length&&equal(p.completion_requirements,w.completion_requirements)&&equal(p.requirement_dispositions,w.requirement_dispositions),'undeclared_execution_change');
  const plan=await appendDocument(p.plan,'plan');
  const requiredReconsideration=new Set(),removedDecisions=new Set();
  for(const change of p.task_changes){
   const definition=structuredClone(change.definition),prior=w.tasks[definition.id];
   demand(equal(definition.plan_basis,plan),'invalid_plan_basis');
   if(change.kind==='add')demand(!prior,'task_exists','conflict');
   else{
    demand(prior,'task_not_found','not_found');demand(!terminal(prior.status),'terminal_task','conflict');
    demand(!prior.assignment,'active_assignment','conflict');
    demand(change.expected_definition_revision===prior.definition_revision,'definition_conflict','conflict');
    for(const qid of prior.definition.decision_ids)if(!definition.decision_ids.includes(qid))removedDecisions.add(qid);
    const oldDocs=taskDocs(prior.definition),newDocs=taskDocs(definition);
    for(const q of Object.values(w.decisions)){
     if(q.blocks.task_ids.includes(prior.id)||prior.definition.decision_ids.includes(q.id)){
      if(q.basis.some(basis=>oldDocs.some(old=>equal(old,basis))&&!newDocs.some(next=>equal(next,basis))))requiredReconsideration.add(q.id);
     }
    }
   }
   taskDocs(definition).forEach(checkDocument);
   definition.inputs.forEach(checkInput);
   definition.decision_ids.forEach(decision);
   const revision=increment(prior?.definition_revision??0);
   w.tasks[definition.id]={id:definition.id,definition,definition_revision:revision,status:prior?.status??'pending',generation:prior?.generation??0,assignment:null,result:null,progress:prior?.progress??null};
   facts.task_definitions.push({task_id:definition.id,definition_revision:revision,definition:structuredClone(definition),created_at:time,actor:access.actor});
   effect('task',definition.id,revision);
  }
  demand(idsUnique(p.decision_dispositions.map(item=>item.decision_id)),'invalid_decision_dispositions');
  const dispositions=new Map(p.decision_dispositions.map(item=>[item.decision_id,item]));
  for(const qid of requiredReconsideration)demand(dispositions.has(qid),'decision_disposition_required','conflict');
  for(const qid of removedDecisions)demand(dispositions.get(qid)?.action==='waive','decision_disposition_required','conflict');
  for(const disposition of p.decision_dispositions){
   const q=decision(disposition.decision_id);
   demand(disposition.expected_decision_revision===q.revision,'decision_revision_conflict','conflict');
   disposition.basis.forEach(checkDocument);
   if(disposition.action!=='reconsider')demand(canDecide(access,q),'decision_actor_mismatch','forbidden');
   if(disposition.action==='carry_forward')demand(q.status==='decided','decision_required','conflict');
   const oldResolution=q.resolution;
   q.revision=increment(q.revision);q.basis=structuredClone(disposition.basis);
   q.status=disposition.action==='reconsider'?'pending':disposition.action==='waive'?'waived':'decided';
   q.resolution=disposition.action==='reconsider'?null:{outcome:q.status,value:q.status==='waived'?null:oldResolution.value,reason:disposition.reason,actor:access.actor,decided_at:time};
   writeDecision(q);
  }
  demand(idsUnique(p.completion_requirements.map(item=>item.id))&&idsUnique(p.requirement_dispositions.map(item=>item.requirement_id)),'invalid_requirements');
  for(const original of w.completion_requirements)demand(p.completion_requirements.some(item=>equal(item,original)),'requirement_history_required','conflict');
  if(!equal(p.requirement_dispositions,w.requirement_dispositions))requireCapability(access,'change_scope');
  for(const requirement of p.completion_requirements){
   demand(requirement.task_ids.length+requirement.document_refs.length>0,'invalid_requirements');
   requirement.task_ids.forEach(task);requirement.document_refs.forEach(checkDocument);
  }
  for(const disposition of p.requirement_dispositions){
   demand(p.completion_requirements.some(item=>item.id===disposition.requirement_id),'invalid_requirements');
   if(disposition.kind==='follow_up')demand(disposition.follow_up_ref,'missing_follow_up');
  }
  w.completion_requirements=structuredClone(p.completion_requirements);w.requirement_dispositions=structuredClone(p.requirement_dispositions);w.plan=plan;
  demand(!Object.keys(w.tasks).length||w.completion_requirements.length>0,'invalid_requirements');
 }else if(c.command==='document.append')await appendDocument(p.document,p.purpose);
 else if(c.command==='workflow.start'){
  demand(w.status==='draft','illegal_transition','conflict');demand(w.plan&&Object.values(w.tasks).some(t=>taskReady(w,t)),'no_ready_task','conflict');w.status='active';
 }else if(c.command==='workflow.pause'){
  demand(w.status==='active','illegal_transition','conflict');w.status='paused';w.pause_reason=p.reason;
 }else if(c.command==='workflow.resume'){
  demand(w.status==='paused','illegal_transition','conflict');w.status='active';delete w.pause_reason;
 }else if(c.command==='workflow.cancel'){
  for(const t of Object.values(w.tasks).filter(t=>!terminal(t.status))){if(t.assignment)closeAssignment(t,'cancelled');t.status='cancelled';t.cancel_reason=p.reason;effect('task',t.id,t.definition_revision);}
  w.status='cancelled';w.result={reason:p.reason,remaining:p.remaining,actor:access.actor,completed_at:time};
 }else if(c.command==='workflow.complete'){
  demand(['active','paused'].includes(w.status),'illegal_transition','conflict');
  const tasks=Object.values(w.tasks);
  demand(tasks.some(t=>t.status==='completed')&&tasks.every(t=>terminal(t.status)&&!t.assignment),'incomplete_tasks','conflict');
  demand(w.completion_requirements.length>0,'incomplete_requirements','conflict');
  for(const requirement of w.completion_requirements){
   if(w.requirement_dispositions.some(item=>item.requirement_id===requirement.id))continue;
   demand(requirement.task_ids.every(id=>task(id).status==='completed'),'incomplete_requirements','conflict');requirement.document_refs.forEach(checkDocument);
  }
  demand(!Object.values(w.decisions).some(q=>pendingDecision(q)&&(q.blocks.workflow_closure||q.blocks.task_ids.length||Object.values(w.tasks).some(t=>t.definition.decision_ids.includes(q.id)))),'decision_required','conflict');
  p.document_refs.forEach(checkDocument);w.status='completed';w.result={...structuredClone(p),actor:access.actor,completed_at:time};
 }else if(c.command==='task.claim'){
  const t=task(p.task_id);demand(taskClaimable(w,t),'task_not_ready','conflict');
  demand(p.expected_definition_revision===t.definition_revision,'definition_conflict','conflict');
  t.generation=increment(t.generation);
  const id=generated('assignment');
  demand(!Object.values(w.tasks).some(other=>other.assignment?.ref.assignment_id===id),'duplicate_generated_id','unavailable');
  t.assignment={ref:{assignment_id:id,generation:t.generation,definition_revision:t.definition_revision},actor:access.actor,plan_basis:t.definition.plan_basis,session:structuredClone(p.session),started_at:time};
  t.status='in_progress';facts.assignments.push({...structuredClone(t.assignment),task_id:t.id,status:'active',ended_at:null,ended_by:null,workflow_revision:increment(before)});effect('assignment',id,t.generation);effect('task',t.id,t.definition_revision);
 }else if(['task.progress','task.release','task.block','task.complete','task.cancel','task.unblock'].includes(c.command)){
  const t=task(p.task_id);
  demand(!terminal(t.status),'terminal_task','conflict');
  if(c.command==='task.unblock'){
   demand(t.status==='blocked'&&!t.assignment,'illegal_transition','conflict');t.status='pending';t.unblock_resolution=p.resolution;
  }else if(c.command==='task.cancel'){
   if(t.assignment){demand(p.assignment&&p.handoff,'handoff_required');currentAssignment(t,p.assignment,true);saveHandoff(t.id,p.handoff);closeAssignment(t,'cancelled');}
   else demand(p.assignment===null,'assignment_expired','conflict');
   t.status='cancelled';t.cancel_reason=p.reason;
  }else{
   demand(['active','paused'].includes(w.status),'illegal_transition','conflict');
   currentAssignment(t,p.assignment,['task.release','task.block'].includes(c.command));
   if(c.command==='task.progress'){
    saveEvidence(p.evidence);t.progress={summary:p.summary,evidence_ids:p.evidence.map(item=>item.id),actor:access.actor,at:time};
   }else if(c.command==='task.complete'){
    demand(!Object.values(w.decisions).some(q=>blocksTask(q,t)),'decision_required','conflict');
    const criteria=p.result.criterion_results;
    demand(criteria.length===t.definition.completion_criteria.length&&idsUnique(criteria.map(item=>item.criterion_index))&&criteria.every(item=>item.criterion_index<t.definition.completion_criteria.length&&item.outcome==='satisfied'),'incomplete_criteria','conflict');
    p.result.artifacts.forEach(checkInput);saveEvidence(p.result.evidence);
    for(const item of criteria)for(const id of item.evidence_ids)demand(knownEvidence.has(id),'invalid_evidence_reference');
    demand(!t.definition.expected_artifacts.length||p.result.artifacts.length>0,'missing_required_artifacts');
    t.result={...structuredClone(p.result),definition_revision:t.definition_revision,plan_basis:t.definition.plan_basis,actor:access.actor,completed_at:time};closeAssignment(t,'completed');t.status='completed';
   }else{
    saveHandoff(t.id,p.handoff);closeAssignment(t,c.command==='task.block'?'blocked':'released');t.status=c.command==='task.block'?'blocked':'pending';if(p.reason)t.block_reason=p.reason;
   }
  }
  effect('task',t.id,t.definition_revision);
 }else if(c.command==='decision.open'){
  demand(!Object.hasOwn(w.decisions,p.decision_id),'decision_exists','conflict');p.blocks.task_ids.forEach(task);p.basis.forEach(checkDocument);
  w.decisions[p.decision_id]={id:p.decision_id,revision:1,question:p.question,options:structuredClone(p.options),required_decider:structuredClone(p.required_decider),blocks:structuredClone(p.blocks),basis:structuredClone(p.basis),status:'pending',resolution:null};writeDecision(w.decisions[p.decision_id]);
 }else if(c.command==='decision.resolve'){
  const q=decision(p.decision_id);demand(q.revision===p.expected_decision_revision&&equal(q.basis,p.basis),'decision_revision_conflict','conflict');
  demand(canDecide(access,q),'decision_actor_mismatch','forbidden');demand(q.status==='pending','decision_already_resolved','conflict');
  q.revision=increment(q.revision);q.status=p.outcome==='waived'?'waived':'decided';q.resolution={outcome:q.status,value:p.value,reason:p.reason,actor:access.actor,decided_at:time};writeDecision(q);
 }else if(c.command==='handoff.record'){
  if(p.task_id!==null)task(p.task_id);saveHandoff(p.task_id,p.handoff);
 }else if(c.command==='checkpoint.append'){
  p.document_refs.forEach(checkDocument);const id=generated('checkpoint');facts.checkpoints.push({id,...structuredClone(p),actor:access.actor,created_at:time,workflow_revision:increment(before)});effect('checkpoint',id,1);
 }else demand(c.command==='workflow.create','unsupported_command','unsupported');
 validateDag(w.tasks);
 demand(Object.keys(w.tasks).length<=100&&Object.keys(w.decisions).length<=100,'limit_exceeded','limit_exceeded');
 for(const t of Object.values(w.tasks)){
  demand((t.status==='in_progress')===!!t.assignment,'invalid_assignment_state');
  demand(size(t)<=64000,'limit_exceeded','limit_exceeded');
 }
 for(const q of Object.values(w.decisions))demand(size(q)<=64000,'limit_exceeded','limit_exceeded');
 for(const [kind,items] of Object.entries(facts))if(kind!=='documents')for(const item of items)demand(size(item)<=64000,'limit_exceeded','limit_exceeded');
 demand(size(collaborationHeader(w))<=16000,'limit_exceeded','limit_exceeded');
 w.revision=increment(before);w.updated_at=time;effect('workflow',w.workflow_ref.workflow_id,w.revision);
 return {state:w,before_revision:before,facts,effects};
}
