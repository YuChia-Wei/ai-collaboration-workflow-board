import {Fault,demand} from '../Domain/errors.mjs';
import {canonicalJson,requestDigest,operationKey} from '../Domain/collaboration-values.mjs';
import {applyCollaborationCommand,authorizeCollaborationCommand,requireCapability,COLLABORATION_PROFILE} from '../Domain/collaboration-workflow.mjs';

const eventNames={
 'workflow.create':'WorkflowCreated','workflow.start':'WorkflowStarted','workflow.pause':'WorkflowPaused','workflow.resume':'WorkflowResumed','workflow.cancel':'WorkflowCancelled','workflow.complete':'WorkflowCompleted',
 'plan.revise':'PlanRevised','document.append':'DocumentAppended','task.claim':'TaskClaimed','task.progress':'TaskProgressRecorded','task.release':'TaskReleased','task.block':'TaskBlocked','task.unblock':'TaskUnblocked','task.complete':'TaskCompleted','task.cancel':'TaskCancelled','decision.open':'DecisionOpened','decision.resolve':'DecisionRecorded','handoff.record':'HandoffRecorded','checkpoint.append':'CheckpointAppended'
};

/** Command use case only. Query/storage/identity adapters are independent ports. */
export function createCollaborationCommands({repository,clock,ids,validateCommand,storeId}){
 return async function executeCommand(accessContext,input){
  // Detach caller-owned objects before any asynchronous hash or persistence IO.
  const c=structuredClone(input),access=structuredClone(accessContext);
  demand(validateCommand(c),'invalid_command');
  demand(new TextEncoder().encode(canonicalJson(c)).length<=300000,'limit_exceeded','limit_exceeded');
  requireCapability(access,'read');authorizeCollaborationCommand(access,c.command);
  demand(c.workflow_ref.store_id===storeId,'store_mismatch','forbidden');
  const authority={owner_id:access.owner_id,actor:access.actor};
  const digest=await requestDigest(authority,c),key=operationKey(authority,c);
  const inspect=outcome=>{
   if(!outcome||outcome.outcome==='unknown')return null;
   demand(['accepted','rejected'].includes(outcome.outcome)&&outcome.receipt,'invalid_repository_outcome','unavailable');
   demand(outcome.receipt.request_digest===digest,'operation_payload_conflict','conflict');
   demand(outcome.receipt.accepted===(outcome.outcome==='accepted'),'invalid_repository_outcome','unavailable');
   return outcome.receipt;
  };
  const lookup=async()=>inspect(await repository.operation(access.owner_id,storeId,c.operation_id));
  const old=await lookup();if(old)return old;
  const loaded=await repository.loadForCommand(access.owner_id,c.workflow_ref,c);
  demand(!loaded||loaded.invariants_complete===true,'incomplete_command_state','unavailable');
  const time=clock.now();let change;
  const base={service_contract_version:COLLABORATION_PROFILE,schema_version:'1.0',workflow_ref:c.workflow_ref,operation_id:c.operation_id,request_digest:digest,actor:access.actor};
  try{
   change=await applyCollaborationCommand(loaded?.state??null,c,{access,time,newId:kind=>ids.next(kind),documentRefs:loaded?.document_refs??[],evidence:loaded?.evidence??[]});
  }catch(error){
   if(!(error instanceof Fault)||['unavailable','unsupported'].includes(error.category))throw error;
   const receipt={accepted:false,...base,expected_revision:c.expected_revision,current_revision:loaded?.state?.revision??null,recorded_at:time,failure:{error:error.error,category:error.category,details:error.details}};
   try{
    const result=inspect(await repository.reject(access.owner_id,c.workflow_ref,key,digest,receipt));
    if(result)return result;
   }catch(failure){
    if(failure instanceof Fault&&failure.error==='operation_payload_conflict')throw failure;
    const accepted=await lookup();if(accepted)return accepted;
   }
   throw new Fault('storage_unavailable','unavailable');
  }
  const receipt={accepted:true,...base,before_revision:change.before_revision,revision:change.state.revision,accepted_at:time,effects:change.effects};
  const event={service_contract_version:COLLABORATION_PROFILE,schema_version:'1.0',workflow_ref:c.workflow_ref,operation_id:c.operation_id,revision:change.state.revision,actor:access.actor,occurred_at:time,name:eventNames[c.command],effects:change.effects};
  try{
   const result=inspect(await repository.accept({owner_id:access.owner_id,ref:c.workflow_ref,expected_revision:c.expected_revision,operation_key:key,digest,actor:access.actor,next_state:change.state,facts:change.facts,events:[event],receipt}));
   if(result)return result;
  }catch(error){
   if(error instanceof Fault&&error.error==='operation_payload_conflict')throw error;
   const accepted=await lookup();if(accepted)return accepted;
  }
  throw new Fault('storage_unavailable','unavailable');
 };
}
