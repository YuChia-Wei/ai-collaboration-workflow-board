const canonical=value=>value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?'['+value.map(canonical).join(',')+']':'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
const profile='workflow-board/source-replica/1';
const hash=async bytes=>'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
export function createSourceReplicaClient(projectRef,fetcher=globalThis.fetch){
 const query=async(name,payload)=>{const response=await fetcher('/api/source-replica/v1/queries',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({service_contract_version:profile,schema_version:'1.0',project_ref:projectRef,query:name,payload})});const data=await response.json();if(!response.ok)throw Error(data.error??'read_failed');if(!data.project_ref||['store_id','namespace','project_id'].some(k=>data.project_ref[k]!==projectRef[k]))throw Error('scope_mismatch');if(payload.source_id&&['source_id','workflow_id','source_revision'].some(k=>data[k]!==payload[k]))throw Error('source_ref_mismatch');return data;};
 return {query,
 async board(ref,header){
  const tasks=[],ids=new Set();let first=null;
  for(let offset=0;;){
   const page=await query('replica.board',{...ref,offset,limit:50});
   if(page.manifest_hash!==header.manifest_hash||page.revision!==header.revision||page.complete!==true||page.projection_version!=='source-board/1')throw Error('board_version_mismatch');
   if(!first)first=page;
   if(!Number.isSafeInteger(page.total)||page.total<0||page.total>5000||page.total!==first.total||page.offset!==offset||!Array.isArray(page.tasks)||page.tasks.length>50||page.projection_complete!==(page.issue_count===0)||canonical(page.issues)!==canonical(first.issues)||page.issue_count!==first.issue_count)throw Error('board_incomplete');
   for(const task of page.tasks){if(typeof task.id!=='string'||ids.has(task.id))throw Error('board_task_mismatch');ids.add(task.id);tasks.push(task);}
   if(page.has_more!==(tasks.length<page.total)||tasks.length>page.total||page.has_more&&!page.tasks.length)throw Error('board_incomplete');
   if(!page.has_more)return {...first,tasks,has_more:false};
   offset=tasks.length;
  }
 },
 async manifest(ref,header){const files=[];let total=null;for(let offset=0;;){const page=await query('replica.manifest',{...ref,offset,limit:50});if(total===null)total=page.total;if(total!==page.total||page.offset!==offset||page.files.length===0&&page.has_more)throw Error('manifest_incomplete');files.push(...page.files);if(!page.has_more){if(files.length!==total)throw Error('manifest_incomplete');if(header&&await hash(new TextEncoder().encode(canonical({...header.metadata,files})))!==header.manifest_hash)throw Error('manifest_hash_mismatch');return files;}offset+=page.files.length;}},
 async file(ref,file){const bytes=new Uint8Array(file.size);let offset=0;for(let index=0;index<Math.ceil(file.size/49152);index++){const part=await query('replica.file.chunk',{...ref,path:file.path,index}),raw=Uint8Array.from(atob(part.content_base64),c=>c.charCodeAt(0));if(part.path!==file.path||part.index!==index||part.source_revision!==ref.source_revision||await hash(raw)!==part.chunk_hash)throw Error('chunk_mismatch');bytes.set(raw,offset);offset+=raw.length;}if(offset!==file.size||await hash(bytes)!==file.sha256)throw Error('file_hash_mismatch');return bytes;}
 };
}
