import {canonicalJson} from '../../../Core/Workflows/Domain/collaboration-values.mjs';
const scope=(owner,r)=>[owner,r.store_id,r.project_id];
const key=(owner,r,p)=>canonicalJson([...scope(owner,r),p.source_id,p.workflow_id,p.source_revision]);
const headKey=(owner,r,p)=>canonicalJson([...scope(owner,r),p.source_id,p.workflow_id]);
export function createSourceReplicaRepository(db){
 const s=(sql,...args)=>db.prepare(sql).bind(...args),first=(sql,...args)=>s(sql,...args).first();
 const operation=async(owner,r,id)=>{const row=await first('SELECT receipt FROM source_replica_operations WHERE key=?',canonicalJson([...scope(owner,r),id]));return row?JSON.parse(row.receipt):null;};
 const version=async(owner,r,p)=>{const row=await first('SELECT * FROM source_replica_versions WHERE key=?',key(owner,r,p));return row?{...row,manifest:JSON.parse(row.manifest)}:null;};
 const head=async(owner,r,p)=>(await first('SELECT revision FROM source_replica_heads WHERE key=?',headKey(owner,r,p)))?.revision??0;
 return {operation,version,head,
 async readChunks(owner,r,p,refs){return (await s(`SELECT c.path,c.position AS "index",c.content_base64,c.chunk_hash FROM json_each(?) requested JOIN source_replica_chunks c ON c.path=json_extract(requested.value,'$.path') AND c.position=json_extract(requested.value,'$.index') WHERE c.version_key=? ORDER BY CAST(requested.key AS INTEGER)`,JSON.stringify(refs),key(owner,r,p)).all()).results;},
 async chunk(owner,r,p,path,index){const row=await first('SELECT content_base64,chunk_hash FROM source_replica_chunks WHERE version_key=? AND path=? AND position=?',key(owner,r,p),path,index);return row??null;},
 async cursor(owner,id){const row=await first('SELECT body FROM source_replica_cursors WHERE id=? AND owner=?',id,owner);return row?JSON.parse(row.body):null;},
 async saveCursor(owner,body){const id=crypto.randomUUID();await db.batch([s('INSERT INTO source_replica_cursors(id,owner,body) VALUES(?,?,?)',id,owner,JSON.stringify(body))]);return id;},
 async list(owner,r,after,limit){return (await s('SELECT h.key,h.source_id,h.workflow_id,h.source_revision,h.revision,v.manifest_hash,v.manifest FROM source_replica_heads h JOIN source_replica_versions v ON v.key=h.version_key WHERE h.owner=? AND h.store_id=? AND h.project_id=? AND h.key>? ORDER BY h.key LIMIT ?',...scope(owner,r),after,limit).all()).results.map(row=>({key:row.key,source_id:row.source_id,workflow_id:row.workflow_id,source_revision:row.source_revision,revision:row.revision,manifest_hash:row.manifest_hash,workflow:(({id,title,status})=>({id,title,status}))(JSON.parse(row.manifest).workflow),complete:true}));},
 async apply(owner,c,digest,{error,chunks}){
  const r=c.project_ref,p=c.payload,op=canonicalJson([...scope(owner,r),c.operation_id]),vk=key(owner,r,p),hk=headKey(owner,r,p),attempt=crypto.randomUUID();
  const current='COALESCE((SELECT revision FROM source_replica_heads WHERE key=?),0)';
  const receipt={accepted:true,project_ref:r,operation_id:c.operation_id,command:c.command,request_digest:digest,expected_revision:c.expected_revision,revision:c.expected_revision+(c.command==='replica.activate'?1:0),source_id:p.source_id,workflow_id:p.workflow_id,source_revision:p.source_revision,error:null};
  const rejected={...receipt,accepted:false,error:error??'revision_conflict'};
  const gate="SELECT 1 FROM source_replica_operations WHERE key=? AND attempt=? AND accepted=1",ga=[op,attempt];
  const batch=[s(`INSERT INTO source_replica_operations(key,owner,store_id,project_id,operation_id,digest,attempt,accepted,receipt) SELECT ?,?,?,?,?,?,?,CASE WHEN ? IS NULL AND ${current}=? THEN 1 ELSE 0 END,CASE WHEN ? IS NULL AND ${current}=? THEN ? ELSE json_set(?,'$.revision',${current}) END ON CONFLICT(key) DO NOTHING`,op,...scope(owner,r),c.operation_id,digest,attempt,error,hk,c.expected_revision,error,hk,c.expected_revision,JSON.stringify(receipt),JSON.stringify(rejected),hk)];
  if(c.command==='replica.begin')batch.push(s(`INSERT INTO source_replica_versions(key,manifest_hash,manifest,published_revision) SELECT ?,?,?,NULL WHERE EXISTS(${gate}) ON CONFLICT(key) DO UPDATE SET manifest_hash=CASE WHEN manifest_hash=excluded.manifest_hash THEN manifest_hash ELSE NULL END`,vk,p.manifest_hash,JSON.stringify(p.manifest),...ga));
  if(c.command==='replica.chunk.put')for(const chunk of chunks??[])batch.push(s(`INSERT INTO source_replica_chunks(version_key,path,position,content_base64,chunk_hash) SELECT ?,?,?,?,? WHERE EXISTS(${gate}) AND EXISTS(SELECT 1 FROM source_replica_versions WHERE key=? AND published_revision IS NULL) ON CONFLICT(version_key,path,position) DO UPDATE SET chunk_hash=CASE WHEN chunk_hash=excluded.chunk_hash AND content_base64=excluded.content_base64 THEN chunk_hash ELSE NULL END`,vk,chunk.path,chunk.index,chunk.content_base64,chunk.chunk_hash,...ga,vk));
  if(c.command==='replica.chunk.put'){batch.push(s(`INSERT INTO mutation_guard(id,ok) VALUES(?,CASE WHEN NOT EXISTS(${gate}) OR EXISTS(SELECT 1 FROM source_replica_versions WHERE key=? AND published_revision IS NULL) THEN 1 ELSE 0 END)`,attempt,...ga,vk));batch.push(s('DELETE FROM mutation_guard WHERE id=?',attempt));}
  if(c.command==='replica.activate'){
   batch.push(s(`UPDATE source_replica_versions SET published_revision=? WHERE key=? AND published_revision IS NULL AND EXISTS(${gate})`,receipt.revision,vk,...ga));
   batch.push(s(`INSERT INTO source_replica_heads(key,owner,store_id,project_id,source_id,workflow_id,source_revision,revision,version_key,last_attempt) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(${gate}) ON CONFLICT(key) DO UPDATE SET source_revision=excluded.source_revision,revision=excluded.revision,version_key=excluded.version_key,last_attempt=excluded.last_attempt`,hk,...scope(owner,r),p.source_id,p.workflow_id,p.source_revision,receipt.revision,vk,attempt,...ga));
   batch.push(s(`INSERT INTO mutation_guard(id,ok) VALUES(?,CASE WHEN NOT EXISTS(${gate}) OR EXISTS(SELECT 1 FROM source_replica_versions v JOIN source_replica_heads h ON h.version_key=v.key WHERE v.key=? AND v.published_revision=? AND h.last_attempt=?) THEN 1 ELSE 0 END)`,attempt,...ga,vk,receipt.revision,attempt));batch.push(s('DELETE FROM mutation_guard WHERE id=?',attempt));
  }
  await db.batch(batch);return operation(owner,r,c.operation_id);
 }
 };
}
