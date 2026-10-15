import {demand} from '../domain/errors.mjs';
import {canonicalJson,contentDigest} from '../domain/collaboration-values.mjs';
import {COLLABORATION_PROFILE,collaborationHeader,taskReady,taskClaimable,requireCapability,commandCapability} from '../domain/collaboration-workflow.mjs';

const same=(a,b)=>canonicalJson(a)===canonicalJson(b);
const bytes=value=>new TextEncoder().encode(canonicalJson(value)).length;
const bounded=value=>{demand(bytes(value)<=64000,'limit_exceeded','limit_exceeded');return value;};
const sections=['tasks','decisions','handoffs'];
const placeholder='0'.repeat(64);
export const collaborationQueries=['capabilities','workflow.find','workflow.context','context.page','task.read','decision.read','document.read','operation.get'];
export const collaborationCommands=['workflow.create','workflow.start','workflow.pause','workflow.resume','workflow.cancel','workflow.complete','plan.revise','document.append','task.claim','task.progress','task.release','task.block','task.unblock','task.complete','task.cancel','decision.open','decision.resolve','handoff.record','checkpoint.append'];
export const availableCommands=access=>collaborationCommands.filter(name=>access.capabilities.includes(commandCapability(name))||['task.release','task.block'].includes(name)&&access.capabilities.includes('manage'));

function taskSummary(w,t){
 const blocking_decision_ids=Object.values(w.decisions).filter(d=>d.status==='pending'&&(d.blocks.task_ids.includes(t.id)||t.definition.decision_ids.includes(d.id))).map(d=>d.id);
 demand(blocking_decision_ids.length<=32,'limit_exceeded','limit_exceeded');
 return {id:t.id,title:t.definition.title,status:t.status,definition_revision:t.definition_revision,dependencies:t.definition.dependencies,plan_basis:t.definition.plan_basis,assignment:t.assignment,ready:taskReady(w,t),claimable:taskClaimable(w,t),blocking_decision_ids};
}
function decisionSummary(d){const {id,revision,question,status,required_decider,blocks,basis}=d;return {id,revision,question,status,required_decider,blocks,basis};}
const page=(items,start,count)=>({items:items.slice(start,start+count),total:items.length,has_more:start+count<items.length,cursor:start+count<items.length?placeholder:null});

/** Queries materialize one immutable revision. Cursors are opaque, owner-bound
 * repository records; neither a supplied cursor nor a SessionRef grants access. */
export function createCollaborationQueries({repository,validateQuery,storeId}){
 return async function executeQuery(accessContext,input){
  const access=structuredClone(accessContext),q=structuredClone(input);
  demand(validateQuery(q),'invalid_command');requireCapability(access,'read');
  const p=q.payload;
  const ref=p.workflow_ref;
  demand((ref?.store_id??p.store_id)===storeId,'store_mismatch','forbidden');
  const owner=access.owner_id;
  const readSnapshot=async revision=>{const w=await repository.snapshot(owner,ref,revision);demand(w,revision===undefined?'workflow_not_found':'snapshot_expired',revision===undefined?'not_found':'conflict');return w;};
  const readCursor=async()=>{const c=await repository.cursor(owner,p.cursor);demand(c,'snapshot_expired','conflict');return c;};
  const collections=async w=>({tasks:Object.values(w.tasks).map(t=>taskSummary(w,t)),decisions:Object.values(w.decisions).map(decisionSummary),handoffs:await repository.facts(owner,ref,w.revision,'handoffs')});
  const persistCursor=async(w,section,start,limit)=>repository.saveCursor(owner,{kind:'context',ref,revision:w.revision,section,start,limit});
  if(q.query==='capabilities')return {
   service_contract_version:COLLABORATION_PROFILE,schema_version:'1.0',store_id:storeId,namespace:'personal',commands:availableCommands(access),queries:collaborationQueries,
   limits:{request_utf8_bytes:300000,document_utf8_bytes:256000,record_utf8_bytes:64000,context_utf8_bytes:64000,tasks_per_workflow:100,decisions_per_workflow:100,context_page_items:20,header_utf8_bytes:16000},contract_status:'implemented'
  };
  if(q.query==='operation.get'){
   const result=await repository.operation(owner,storeId,p.operation_id);
   if(result.outcome==='unknown')return {outcome:'unknown',workflow_ref:ref,operation_id:p.operation_id};
   demand(same(result.receipt.workflow_ref,ref),'operation_target_mismatch','forbidden');return result;
  }
  if(q.query==='document.read'){
   const doc=await repository.document(owner,ref,p.document_ref);demand(doc,'revision_not_found','not_found');
   demand(same(doc.ref,p.document_ref),'document_hash_mismatch','conflict');
   demand(await contentDigest(doc.content)===doc.ref.content_hash,'document_integrity_error','unavailable');return doc;
  }
  if(q.query==='workflow.find'){
   let baseline,after='';
   if(p.cursor){const c=await readCursor();demand(c.kind==='find'&&c.store===storeId&&c.q===p.q&&c.limit===p.limit,'invalid_cursor','forbidden');({baseline,after}=c);}
   else baseline=await repository.baseline(owner,storeId);
   const items=await repository.find(owner,storeId,p.q,baseline,after,p.limit+1),has_more=items.length>p.limit;
   if(has_more)items.pop();
   const cursor=has_more?await repository.saveCursor(owner,{kind:'find',store:storeId,q:p.q,limit:p.limit,baseline,after:items.at(-1).workflow_ref.workflow_id}):null;
   return bounded({items,has_more,cursor});
  }
  if(q.query==='task.read'||q.query==='decision.read'){
   const w=await readSnapshot(p.at_revision);
   if(q.query==='task.read'){
    const t=w.tasks[p.task_id];demand(t&&t.definition_revision===p.definition_revision,'revision_not_found','not_found');
    return bounded({workflow_ref:ref,snapshot_revision:w.revision,summary:taskSummary(w,t),definition:t.definition,result:t.result});
   }
   const d=w.decisions[p.decision_id];demand(d&&d.revision===p.decision_revision,'revision_not_found','not_found');
   return bounded({workflow_ref:ref,snapshot_revision:w.revision,decision:decisionSummary(d),resolution:d.resolution,options:d.options});
  }
  if(q.query==='context.page'){
   const c=await readCursor();demand(c.kind==='context'&&same(c.ref,ref)&&c.section===p.section,'invalid_cursor','forbidden');
   const w=await readSnapshot(c.revision),items=(await collections(w))[p.section];
   let count=Math.min(c.limit,items.length-c.start);
   const result=()=>({workflow_ref:ref,revision:w.revision,section:p.section,page:page(items,c.start,count)});
   while(count>0&&bytes(result())>64000)count--;
   demand(count>0||c.start===items.length,'limit_exceeded','limit_exceeded');
   const value=bounded(result());
   if(value.page.has_more)value.page.cursor=await persistCursor(w,p.section,c.start+count,c.limit);
   return value;
  }
  demand(q.query==='workflow.context','unsupported_query','unsupported');
  const w=await readSnapshot(),workflow=collaborationHeader(w),items=await collections(w);
  demand(bytes(workflow)<=16000,'limit_exceeded','limit_exceeded');
  const refs=await repository.documentRefs(owner,ref,w.revision),missing=[],seen=new Set();
  function absent(kind,value,reason){const key=canonicalJson(value);if(!seen.has(key)){seen.add(key);missing.push({kind,ref:kind==='external'?value.original:key,reason});}}
  const checkDoc=doc=>{if(doc&&!refs.some(r=>same(r,doc)))absent('document',doc,'revision_not_found');};
  const checkInput=i=>{if(i.kind==='document')checkDoc(i.ref);else if(i.ref.availability!=='available'||i.ref.observed_at===null)absent('external',i.ref,'availability_unknown_or_unavailable');};
  checkDoc(w.plan);w.external_work_refs.forEach(r=>{if(r.availability!=='available'||r.observed_at===null)absent('external',r,'availability_unknown_or_unavailable');});
  for(const t of Object.values(w.tasks)){checkDoc(t.definition.plan_basis);t.definition.inputs.forEach(checkInput);}
  for(const d of Object.values(w.decisions))d.basis.forEach(checkDoc);
  for(const r of w.completion_requirements)r.document_refs.forEach(checkDoc);
  demand(missing.length<=100,'limit_exceeded','limit_exceeded');
  const value={service_contract_version:COLLABORATION_PROFILE,schema_version:'1.0',workflow_ref:ref,revision:w.revision,workflow,missing};
  // Reserve one item in every nonempty section before filling additional slots.
  for(const section of sections)value[section]=page(items[section],0,Math.min(1,items[section].length));
  bounded(value);
  for(const section of sections){
   let count=value[section].items.length;
   while(count<Math.min(p.limit,items[section].length)){
    const old=value[section];value[section]=page(items[section],0,count+1);
    if(bytes(value)>64000){value[section]=old;break;}count++;
   }
   if(value[section].has_more)value[section].cursor=await persistCursor(w,section,count,p.limit);
  }
  return bounded(value);
 };
}
