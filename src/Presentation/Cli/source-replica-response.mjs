import {canonicalJson} from '../../Core/Workflows/Domain/collaboration-values.mjs';
import {decodeReplicaChunk,rawDigest,validReplicaPath} from '../../Core/Workflows/Domain/source-replica.mjs';
const fail=()=>{throw Error('invalid_response');};
const same=(left,right)=>canonicalJson(left)===canonicalJson(right);
const source=(data,payload)=>['source_id','workflow_id','source_revision'].every(k=>data[k]===payload[k]);
const chunk=async value=>{const bytes=decodeReplicaChunk(value.content_base64);if(!bytes.length||bytes.length>49152||await rawDigest(bytes)!==value.chunk_hash)fail();};
function receiptIdentity(data,input){
 if(!same(data.project_ref,input.project_ref))fail();
 if(data.accepted&&data.revision!==data.expected_revision+(data.command==='replica.activate'?1:0))fail();
}
export function verifySourceReceipt(input,data,validate){
 if(!validate('receipt',data))fail();receiptIdentity(data,input);
 if(data.operation_id!==input.operation_id||data.command!==input.command||data.expected_revision!==input.expected_revision||!source(data,input.payload))fail();
}
export async function verifySourceQuery(input,data,validate){
 if(!validate('result_'+input.query.replaceAll('.','_'),data)||!same(data.project_ref,input.project_ref))fail();
 const p=input.payload;
 if(input.query==='replica.capabilities')return;
 if(input.query==='replica.operation.get'){
  if(data.operation_id!==p.operation_id)fail();
  if(data.receipt){if(data.receipt.operation_id!==p.operation_id||data.receipt.accepted!==(data.outcome==='accepted'))fail();receiptIdentity(data.receipt,input);}return;
 }
 if(input.query==='replica.list'){
  if(data.items.length>p.limit||data.has_more&&(!data.cursor||!data.items.length)||!data.has_more&&data.cursor!==null)fail();
  const seen=new Set();for(const item of data.items){const key=canonicalJson([item.source_id,item.workflow_id]);if(seen.has(key)||item.workflow.id!==item.workflow_id)fail();seen.add(key);}return;
 }
 if(!source(data,p))fail();
 if(input.query==='replica.board'){
  if(data.offset!==p.offset||data.tasks.length>p.limit||data.has_more!==(p.offset+data.tasks.length<data.total)||data.has_more&&!data.tasks.length||p.offset+data.tasks.length>Math.max(p.offset,data.total))fail();
  if(data.projection_complete!==(data.issue_count===0)||data.issues.length>data.issue_count)fail();
  const ids=new Set();for(const task of data.tasks){if(ids.has(task.id)||task.source_path!==null&&!validReplicaPath(task.source_path))fail();ids.add(task.id);}return;
 }
 if(input.query==='replica.read'){if(data.metadata.workflow.id!==p.workflow_id||Object.hasOwn(data.metadata,'files'))fail();return;}
 if(input.query==='replica.manifest'){
  const remaining=Math.max(0,data.total-p.offset);if(data.offset!==p.offset||data.files.length!==Math.min(p.limit,remaining)||data.has_more!==(p.offset+data.files.length<data.total))fail();
  const paths=new Set();for(const file of data.files){if(!validReplicaPath(file.path)||paths.has(file.path))fail();paths.add(file.path);}return;
 }
 if(input.query==='replica.file.chunk'){if(data.path!==p.path||data.index!==p.index)fail();await chunk(data);return;}
 if(data.chunks.length>p.refs.length||!same(data.remaining,p.refs.slice(data.chunks.length))||data.has_more!==(data.remaining.length>0)||new TextEncoder().encode(canonicalJson(data)).length>p.max_response_bytes)fail();
 const seen=new Set();for(let i=0;i<data.chunks.length;i++){const item=data.chunks[i],ref={path:item.path,index:item.index},key=canonicalJson(ref);if(!same(ref,p.refs[i])||seen.has(key))fail();seen.add(key);await chunk(item);}
}
