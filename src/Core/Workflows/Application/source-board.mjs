import {demand} from '../Domain/errors.mjs';
import {canonicalJson} from '../Domain/collaboration-values.mjs';
import {decodeReplicaChunk,rawDigest,planReplicaChunkReads,replicaLimits} from '../Domain/source-replica.mjs';

async function* documents(repository,owner,scope,ref,files){
 const batches=planReplicaChunkReads(files);let batch=0,rows=[],row=0;
 for(const file of files){
  const bytes=new Uint8Array(file.size);let offset=0;
  for(let index=0;index<Math.ceil(file.size/replicaLimits.chunk_bytes);index++){
   if(row===rows.length){
    const refs=batches[batch++];rows=await repository.readChunks(owner,scope,ref,refs);row=0;
    demand(rows.length===refs.length,'missing_chunk','conflict');
    demand(rows.every((value,i)=>value.path===refs[i].path&&value.index===refs[i].index),'chunk_reference_mismatch','conflict');
   }
   const chunk=rows[row++],part=decodeReplicaChunk(chunk.content_base64);
   demand(chunk.path===file.path&&chunk.index===index&&part.length===Math.min(replicaLimits.chunk_bytes,file.size-offset)&&await rawDigest(part)===chunk.chunk_hash,'chunk_hash_or_size_mismatch','conflict');
   bytes.set(part,offset);offset+=part.length;
  }
  demand(offset===file.size&&await rawDigest(bytes)===file.sha256,'file_hash_or_size_mismatch','conflict');
  yield {file,bytes};
 }
}

// Project at read time so already accepted replicas need no rewrite/reimport.
export async function readSourceBoard({repository,sourceBoard,owner,scope,ref,manifest,base,offset,limit}){
 demand(sourceBoard,'source_board_unavailable','unavailable');
 const projection=await sourceBoard.project(manifest,documents(repository,owner,scope,ref,sourceBoard.files(manifest)));
 const {tasks,...summary}=projection;
 const result={...base,...summary,offset,total:tasks.length,tasks:[],has_more:offset<tasks.length};
 for(const task of tasks.slice(offset,offset+limit)){
  const next={...result,tasks:[...result.tasks,task]};
  if(new TextEncoder().encode(canonicalJson(next)).length>260000)break;
  result.tasks.push(task);
 }
 demand(result.tasks.length||offset>=tasks.length,'response_too_large','limit_exceeded');
 result.has_more=offset+result.tasks.length<tasks.length;return result;
}
