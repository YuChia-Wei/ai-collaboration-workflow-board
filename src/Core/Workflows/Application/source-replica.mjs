import {demand,Fault} from '../Domain/errors.mjs';
import {readSourceBoard} from './source-board.mjs';
import {requireCapability} from '../Domain/collaboration-workflow.mjs';
import {valueDigest,canonicalJson} from '../Domain/collaboration-values.mjs';
import {REPLICA_PROFILE,planReplicaChunkReads,replicaLimits,replicaCommands,replicaQueries,validateReplica,validateManifest,decodeReplicaChunk,rawDigest,validReplicaPath,validReplicaId,replicaHash} from '../Domain/source-replica.mjs';
export function createSourceReplica({repository,projects,storeId,validateCommand,validateQuery,sourceBoard}){
 const scope=async(a,c,kind)=>{validateReplica(c,kind);demand((kind==='command'?validateCommand:validateQuery)(c),'invalid_replica_envelope');requireCapability(a,'read');demand(c.project_ref.store_id===storeId,'store_mismatch','forbidden');await projects.requireProject(a,c.project_ref.project_id);};
 const inspect=(r,d)=>{if(r)demand(r.request_digest===d,'operation_payload_conflict','conflict');return r;};
 return {
 async executeCommand(access,input){
  const a=structuredClone(access),c=structuredClone(input);await scope(a,c,'command');requireCapability(a,'plan');
  const digest=await valueDigest({purpose:REPLICA_PROFILE,authority:{owner_id:a.owner_id,actor:a.actor},command:c});
  const lookup=async()=>inspect(await repository.operation(a.owner_id,c.project_ref,c.operation_id),digest);
  const old=await lookup();if(old)return old;
  const p=c.payload,version=await repository.version(a.owner_id,c.project_ref,p),head=await repository.head(a.owner_id,c.project_ref,p);
  let error=null,data=null;
  if(head!==c.expected_revision)error='revision_conflict';
  else if(c.command==='replica.begin'){
   await validateManifest(p);
   if(version&&version.manifest_hash!==p.manifest_hash)error='source_revision_conflict';
  }else{
   demand(version,'staging_not_found','not_found');
   if(c.command==='replica.chunk.put'){
    demand(!version.published_revision,'immutable_version','conflict');
    const chunks=p.chunks??[{path:p.path,index:p.index,content_base64:p.content_base64,chunk_hash:p.chunk_hash}];
    demand(Array.isArray(chunks)&&chunks.length>0&&chunks.length<=replicaLimits.chunks_per_command,'invalid_chunks');const seen=new Set();
    for(const chunk of chunks){
     const file=version.manifest.files.find(f=>f.path===chunk.path),key=canonicalJson([chunk.path,chunk.index]);
     demand(!seen.has(key)&&validReplicaPath(chunk.path)&&file&&Number.isSafeInteger(chunk.index)&&chunk.index>=0&&chunk.index<Math.ceil(file.size/replicaLimits.chunk_bytes),'invalid_chunk');seen.add(key);
     const bytes=decodeReplicaChunk(chunk.content_base64),size=Math.min(replicaLimits.chunk_bytes,file.size-chunk.index*replicaLimits.chunk_bytes);
     demand(bytes.length===size&&replicaHash(chunk.chunk_hash)&&await rawDigest(bytes)===chunk.chunk_hash,'chunk_hash_or_size_mismatch');
     const existing=await repository.chunk(a.owner_id,c.project_ref,p,chunk.path,chunk.index);
     demand(!existing||existing.chunk_hash===chunk.chunk_hash&&existing.content_base64===chunk.content_base64,'chunk_conflict','conflict');
    }data=chunks;
   }else{
    demand(replicaHash(p.manifest_hash)&&p.manifest_hash===version.manifest_hash,'manifest_hash_mismatch');demand(!version.published_revision,'immutable_version','conflict');
    const batches=planReplicaChunkReads(version.manifest.files);let batchIndex=0,rows=[],rowIndex=0;
    async function nextChunk(path,index){
     if(rowIndex===rows.length){const refs=batches[batchIndex++];demand(refs,'missing_chunk','conflict');rows=await repository.readChunks(a.owner_id,c.project_ref,p,refs);rowIndex=0;demand(rows.length===refs.length,'missing_chunk','conflict');const seen=new Set();for(let i=0;i<rows.length;i++){const row=rows[i],key=canonicalJson([row.path,row.index]);demand(row.path===refs[i].path&&row.index===refs[i].index&&!seen.has(key),'chunk_reference_mismatch','conflict');seen.add(key);}}
     const chunk=rows[rowIndex++];demand(chunk.path===path&&chunk.index===index,'chunk_reference_mismatch','conflict');return chunk;
    }
    for(const file of version.manifest.files){
     const bytes=new Uint8Array(file.size);let offset=0;
     for(let index=0;index<Math.ceil(file.size/replicaLimits.chunk_bytes);index++){
      const chunk=await nextChunk(file.path,index),part=decodeReplicaChunk(chunk.content_base64),size=Math.min(replicaLimits.chunk_bytes,file.size-index*replicaLimits.chunk_bytes);demand(part.length===size&&await rawDigest(part)===chunk.chunk_hash,'chunk_hash_mismatch','conflict');bytes.set(part,offset);offset+=part.length;
     }demand(offset===file.size&&await rawDigest(bytes)===file.sha256,'file_hash_or_size_mismatch','conflict');
    }
   }
  }
  try{return inspect(await repository.apply(a.owner_id,c,digest,{error,chunks:data}),digest);}
  catch(e){if(e instanceof Fault)throw e;const outcome=await lookup();if(outcome)return outcome;throw new Fault('storage_unavailable','unavailable');}
 },
 async executeQuery(access,input){
  const a=structuredClone(access),q=structuredClone(input);await scope(a,q,'query');const p=q.payload,r=q.project_ref,owner=a.owner_id;
  if(q.query==='replica.capabilities')return {service_contract_version:REPLICA_PROFILE,project_ref:r,commands:a.capabilities.includes('plan')?replicaCommands:[],queries:replicaQueries,limits:replicaLimits,authority:'source',replica_read_only:true};
  if(q.query==='replica.operation.get'){demand(validReplicaId(p.operation_id),'invalid_operation');const receipt=await repository.operation(owner,r,p.operation_id);return {project_ref:r,operation_id:p.operation_id,outcome:receipt?receipt.accepted?'accepted':'rejected':'unknown',...(receipt?{receipt}:{})};}
  if(q.query==='replica.list'){
   demand(Number.isSafeInteger(p.limit)&&p.limit>=1&&p.limit<=50&&(p.cursor===null||typeof p.cursor==='string'),'invalid_page');
   let after='';if(p.cursor){const cursor=await repository.cursor(owner,p.cursor);demand(cursor&&canonicalJson(cursor.project_ref)===canonicalJson(r)&&cursor.limit===p.limit,'invalid_cursor','forbidden');after=cursor.after;}
   const found=await repository.list(owner,r,after,p.limit+1),rows=[];let more=false;for(const row of found){if(rows.length>=p.limit||new TextEncoder().encode(canonicalJson([...rows,row])).length>260000){more=true;break;}rows.push(row);}demand(rows.length||!found.length,'response_too_large','limit_exceeded');const cursor=more?await repository.saveCursor(owner,{project_ref:r,limit:p.limit,after:rows.at(-1).key}):null;
   return {project_ref:r,items:rows.map(({key,...item})=>item),has_more:more,cursor};
  }
  const version=await repository.version(owner,r,p);demand(version?.published_revision,'source_revision_not_found','not_found');
  const base={project_ref:r,source_id:p.source_id,workflow_id:p.workflow_id,source_revision:p.source_revision,revision:version.published_revision,manifest_hash:version.manifest_hash,complete:true};
  if(q.query==='replica.board')return readSourceBoard({repository,sourceBoard,owner,scope:r,ref:p,manifest:version.manifest,base,offset:p.offset,limit:p.limit});
  if(q.query==='replica.read'){const {files,...metadata}=version.manifest;return {...base,metadata,file_count:files.length,total_bytes:files.reduce((n,f)=>n+f.size,0)};}
  if(q.query==='replica.manifest'){demand(Number.isSafeInteger(p.offset)&&p.offset>=0&&Number.isSafeInteger(p.limit)&&p.limit>=1&&p.limit<=50,'invalid_page');const files=version.manifest.files;return {...base,offset:p.offset,total:files.length,files:files.slice(p.offset,p.offset+p.limit),has_more:p.offset+p.limit<files.length};}
  if(q.query==='replica.chunks.read'){
   demand(Array.isArray(p.refs)&&p.refs.length>0&&p.refs.length<=32&&Number.isSafeInteger(p.max_response_bytes)&&p.max_response_bytes>=70000&&p.max_response_bytes<=300000,'invalid_chunk_batch');
   const seen=new Set(),chunks=[];let count=0;
   for(const ref of p.refs){const id=canonicalJson(ref);demand(!seen.has(id)&&Object.keys(ref).length===2&&validReplicaPath(ref.path)&&Number.isSafeInteger(ref.index)&&ref.index>=0,'invalid_chunk');seen.add(id);const file=version.manifest.files.find(f=>f.path===ref.path);demand(file&&ref.index<Math.ceil(file.size/replicaLimits.chunk_bytes),'chunk_not_found','not_found');const chunk=await repository.chunk(owner,r,p,ref.path,ref.index);demand(chunk,'chunk_not_found','not_found');const item={...ref,...chunk};if(new TextEncoder().encode(canonicalJson({...base,chunks:[...chunks,item],has_more:true,remaining:p.refs.slice(count+1)})).length>p.max_response_bytes)break;chunks.push(item);count++;}
   demand(chunks.length>0,'response_budget_too_small','limit_exceeded');return {...base,chunks,has_more:count<p.refs.length,remaining:p.refs.slice(count)};
  }
  demand(validReplicaPath(p.path)&&Number.isSafeInteger(p.index)&&p.index>=0,'invalid_chunk');const file=version.manifest.files.find(f=>f.path===p.path);demand(file&&p.index<Math.ceil(file.size/replicaLimits.chunk_bytes),'chunk_not_found','not_found');const chunk=await repository.chunk(owner,r,p,p.path,p.index);demand(chunk,'chunk_not_found','not_found');return {...base,path:p.path,index:p.index,...chunk};
 }
 };
}
