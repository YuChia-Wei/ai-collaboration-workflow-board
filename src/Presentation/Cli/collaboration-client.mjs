import {verifySourceQuery,verifySourceReceipt} from './source-replica-response.mjs';
import replicaSchema from '../../Contracts/SourceReplicaV1/schema.json' with {type:'json'};
import Ajv2020 from 'ajv/dist/2020.js';
import schemaV2 from '../../Contracts/CollaborationV2/schema.json' with {type:'json'};
import schema from '../../Contracts/CollaborationV1/schema.json' with {type:'json'};
import {parseContractJson} from '../Shared/strict-json.mjs';
import {contentDigest} from '../../Core/Workflows/Domain/collaboration-values.mjs';

const ajv=new Ajv2020({strict:true,allErrors:false});
ajv.addFormat('date-time',value=>{const time=new Date(value);return Number.isFinite(time.valueOf())&&Number(value.slice(0,4))>=1&&time.toISOString()===value;});
ajv.addSchema(schema);ajv.addSchema(schemaV2);ajv.addSchema(replicaSchema);
const queryTypes={'project.list':'project_list','project.read':'project','project.operation.get':'project_operation_result','project.legacy.preview':'legacy_preview','capabilities':'capabilities','workflow.find':'find_result','workflow.context':'context','context.page':'context_page','task.read':'task_record','decision.read':'decision_record','document.read':'document','operation.get':'operation_result'};
const sameRef=(a,b)=>a&&b&&['store_id','namespace','project_id','record_kind','workflow_id'].every(key=>a[key]===b[key]);
const sameDocument=(a,b)=>a&&b&&['document_id','revision','content_hash'].every(key=>a[key]===b[key]);
const result=(status,data,error)=>({status,...(data===undefined?{}:{data}),...(error?{error:{code:error}}:{})});
const invalid=()=>{throw new Error('invalid_response');};

/** Shared HTTP client for the terminal entry, never a direct database client. */
export function createRemoteCollaborationClient(config,fetcher=globalThis.fetch){
 const contract=config.version==='2.0'||config.project?schemaV2:schema;
 const validators=new Map();
 const valid=(name,value)=>{if(!validators.has(name))validators.set(name,ajv.getSchema(contract.$id+'#/$defs/'+name));return validators.get(name)?.(value)??false;};
 const route=contract===schemaV2?'v2':'v1';
 const headers={'Content-Type':'application/json',Accept:'application/json',Authorization:'Bearer '+config.token};
 if(config.sitesToken)headers['OAI-Sites-Authorization']='Bearer '+config.sitesToken;
 async function request(path,input){
  let response;
  try{
   response=await fetcher(config.endpoint+path,{method:'POST',headers,body:JSON.stringify(input),redirect:'manual',signal:AbortSignal.timeout(config.timeoutMs)});
   // Never follow redirects with either credential; never print response headers.
   if(response.status>=300&&response.status<400){await response.body?.cancel();return {ok:false,status:response.status,error:'redirect_refused'};}
   if(response.headers.get('content-type')?.split(';')[0].trim()!=='application/json'){await response.body?.cancel();return {ok:false,status:response.status,error:'invalid_response'};}
   const reader=response.body?.getReader();
   if(!reader)return {ok:false,status:response.status,error:'invalid_response'};
   const chunks=[];let size=0;
   for(;;){
    const {done,value}=await reader.read();if(done)break;
    size+=value.length;
    if(size>1000000){await reader.cancel();return {ok:false,status:response.status,error:'response_too_large'};}
    chunks.push(value);
   }
   const bytes=new Uint8Array(size);let offset=0;
   for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   const data=parseContractJson(new TextDecoder('utf-8',{fatal:true}).decode(bytes),1000000);
   return {ok:response.ok,status:response.status,data};
  }catch{return {ok:false,status:response?.status??null,error:response?'invalid_or_interrupted_response':'network_or_timeout'};}
 }
 const matchesScope=input=>{
  const ref=input.workflow_ref??input.project_ref??input.payload?.workflow_ref??input.payload?.project_ref;
  return ref?ref.store_id===config.store&&ref.namespace===config.namespace&&(ref.project_id??null)===(config.project??null):input.payload?.store_id===config.store&&input.payload?.namespace===config.namespace&&(input.query?.startsWith('project.')||(input.payload?.project_id??null)===(config.project??null));
 };
 function verifyInput(input,kind){
  if(!valid(kind,input)||!matchesScope(input))return result('error',undefined,'invalid_'+kind+'_or_scope');
  return null;
 }
 function verifyReceipt(receipt,input){
  if(input.project_ref){if(!valid('project_receipt',receipt)||!sameRef(receipt.project_ref,input.project_ref)||receipt.operation_id!==input.operation_id||receipt.expected_revision!==input.expected_revision)invalid();return;}
  if(!valid('receipt',receipt)||!sameRef(receipt.workflow_ref,input.workflow_ref)||receipt.operation_id!==input.operation_id)invalid();
  if((receipt.accepted?receipt.before_revision:receipt.expected_revision)!==input.expected_revision)invalid();
 }
 async function verifyQuery(input,data){
  if(!valid(queryTypes[input.query],data))invalid();
  const p=input.payload;
  if(input.query==='project.list'){if(data.items.some(x=>x.project_ref.store_id!==p.store_id||x.project_ref.namespace!==p.namespace))invalid();
  }else if(input.query==='project.legacy.preview'){if(data.project.project_ref.store_id!==p.store_id)invalid();
  }else if(input.query==='project.read'){if(!sameRef(data.project_ref,p.project_ref))invalid();
  }else if(input.query==='project.operation.get'){const v=data.receipt??data;if(!sameRef(v.project_ref,p.project_ref)||v.operation_id!==p.operation_id)invalid();
  }else if(input.query==='capabilities'){
   if(data.store_id!==p.store_id||data.namespace!==p.namespace||data.project_id!==p.project_id)invalid();
  }else if(input.query==='workflow.find'){
   if(data.items.some(item=>item.workflow_ref.store_id!==p.store_id||item.workflow_ref.namespace!==p.namespace||item.workflow_ref.project_id!==p.project_id))invalid();
  }else if(input.query==='document.read'){
   if(!sameRef(data.workflow_ref,p.workflow_ref)||!sameDocument(data.ref,p.document_ref)||await contentDigest(data.content)!==p.document_ref.content_hash)invalid();
  }else if(input.query==='operation.get'){
   const value=data.receipt??data;
   if(!sameRef(value.workflow_ref,p.workflow_ref)||value.operation_id!==p.operation_id)invalid();
  }else{
   if(!sameRef(data.workflow_ref,p.workflow_ref))invalid();
   if(input.query==='task.read'&&(data.snapshot_revision!==p.at_revision||data.summary.id!==p.task_id||data.summary.definition_revision!==p.definition_revision))invalid();
   if(input.query==='decision.read'&&(data.snapshot_revision!==p.at_revision||data.decision.id!==p.decision_id||data.decision.revision!==p.decision_revision))invalid();
   if(input.query==='context.page'&&data.section!==p.section)invalid();
  }
 }
 async function query(input){
  if(input?.service_contract_version==='workflow-board/source-replica/1')return replica(input,false);
  const error=verifyInput(input,'query');if(error)return error;
  const response=await request(`/api/collaboration/${route}/queries`,input);
  if(!response.ok){
   const structured=valid('error',response.data??{});
   const refusal=structured&&response.status>=400&&(response.status<500||(response.status===501&&response.data.category==='unsupported'));
   return result(refusal?'rejected':'error',structured?response.data:undefined,structured?response.data.error:response.error??'service_unavailable');
  }
  try{await verifyQuery(input,response.data);}catch{return result('error',undefined,'invalid_response');}
  return result(['operation.get','project.operation.get'].includes(input.query)&&response.data.outcome==='unknown'?'unknown':'ok',response.data);
 }
 async function submit(input){
  if(input?.service_contract_version==='workflow-board/source-replica/1')return replica(input,true);
  const error=verifyInput(input,'command');if(error)return error;
  const lookup={service_contract_version:input.service_contract_version,schema_version:input.schema_version,query:input.project_ref?'project.operation.get':'operation.get',payload:{...(input.project_ref?{project_ref:input.project_ref}:{workflow_ref:input.workflow_ref}),operation_id:input.operation_id}};
  const before=await query(lookup);
  if(!['ok','unknown'].includes(before.status))return {...before,command_sent:false};
  // Even an existing receipt needs the original POST to verify its principal-
  // bound digest. Matching only the public operation ID could accept a different
  // payload. The application's receipt check is idempotent and precedes CAS.
  const response=await request(`/api/collaboration/${route}/commands`,input);
  try{
   verifyReceipt(response.data,input);
   if(response.data.accepted&&response.ok)return {...result('accepted',response.data),command_sent:true};
   if(!response.data.accepted&&response.status>=400&&response.status<500)return {...result('rejected',response.data,response.data.failure?.error??response.data.error),command_sent:true};
  }catch{/* An unverified body is never a successful command result. */}
  if(!response.ok&&valid('error',response.data??{})&&response.status>=400&&(response.status<500||(response.status===501&&response.data.category==='unsupported'))){
   return {...result('rejected',response.data,response.data.error),command_sent:true};
  }
  const observed=await query(lookup);
  return {...result('unknown',undefined,'command_outcome_unknown'),command_sent:true,
   operation:{...(input.project_ref?{project_ref:input.project_ref}:{workflow_ref:input.workflow_ref}),operation_id:input.operation_id},
   reconciliation:observed,
   next_action:'Keep the original command file. Rerun submit with that same file to verify its digest; never allocate a new operation ID.'};
 }
 async function replica(input,command){
  const kind=command?'command':'query',validator=ajv.getSchema(replicaSchema.$id+'#/$defs/'+kind),r=input.project_ref;
  if(!validator(input)||!config.project||!sameRef(r,{store_id:config.store,namespace:config.namespace,project_id:config.project}))return result('error',undefined,'invalid_'+kind+'_or_scope');
  const response=await request('/api/source-replica/v1/'+(command?'commands':'queries'),input);
  const data=response.data;
  const validate=(name,value)=>ajv.getSchema(replicaSchema.$id+'#/$defs/'+name)?.(value)??false;
  try{
   if(command){verifySourceReceipt(input,data,validate);if(data.accepted&&response.ok)return {...result('accepted',data),command_sent:true};if(!data.accepted&&response.status>=400&&response.status<500)return {...result('rejected',data,data.error),command_sent:true};}
   else if(response.ok){await verifySourceQuery(input,data,validate);return result(data.outcome==='unknown'?'unknown':'ok',data);}
  }catch{/* Wrong or partial source data never establishes a result. */}
  // A malformed/misrouted receipt cannot become a rejection via its error field.
  if(response.status>=400&&response.status<500&&data&&Object.keys(data).every(k=>['error','category','details'].includes(k))&&typeof data.error==='string'&&typeof data.category==='string'&&data.details&&typeof data.details==='object')return result('rejected',data,data.error);
  if(!command)return result('error',undefined,response.error??'invalid_response');
  const reconciliation=await replica({service_contract_version:input.service_contract_version,schema_version:input.schema_version,project_ref:r,query:'replica.operation.get',payload:{operation_id:input.operation_id}},false);
  return {...result('unknown',undefined,'command_outcome_unknown'),command_sent:true,reconciliation,next_action:'Keep and replay the SAME command file; never change operation_id or expected_revision.'};
 }
 async function context(input,all){
  const first=await query(input);if(first.status!=='ok'||!all)return first;
  const data=first.data;
  for(const section of ['tasks','decisions','handoffs']){
   const seen=new Set();
   const itemIds=new Set(data[section].items.map(item=>item.id));
   if(itemIds.size!==data[section].items.length)return result('error',undefined,'pagination_incomplete');
   while(data[section].has_more){
    const cursor=data[section].cursor;
    if(!cursor||seen.has(cursor)||seen.size>=1000)return result('error',undefined,'pagination_incomplete');
    seen.add(cursor);
    const next=await query({...input,query:'context.page',payload:{workflow_ref:input.payload.workflow_ref,section,cursor}});
    if(next.status!=='ok')return next;
    if(next.data.revision!==data.revision||next.data.page.total!==data[section].total||!next.data.page.items.length)return result('error',undefined,'snapshot_mismatch');
    for(const item of next.data.page.items){
     if(itemIds.has(item.id))return result('error',undefined,'pagination_incomplete');
     itemIds.add(item.id);
    }
    data[section]={...next.data.page,items:[...data[section].items,...next.data.page.items]};
   }
   if(data[section].items.length!==data[section].total)return result('error',undefined,'pagination_incomplete');
  }
  return first;
 }
 return {query,submit,context};
}
