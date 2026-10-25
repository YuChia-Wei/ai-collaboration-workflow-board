import {demand} from '../../../Core/Workflows/Domain/errors.mjs';
import {canonicalJson,contentDigest} from '../../../Core/Workflows/Domain/collaboration-values.mjs';

const decode=row=>row?JSON.parse(row.body):null;

/** D1 batch is the commit boundary. Every effect is fenced by a unique attempt,
 * including retries of an already accepted operation. Snapshots never change. */
export function createCollaborationRepository(db,projectId=null){
 const scoped=projectId!==null;
 const scope=(owner,ref)=>{demand((ref.project_id??null)===projectId,'project_mismatch','forbidden');return scoped?[owner,ref.store_id,projectId,ref.workflow_id]:[owner,ref.store_id,ref.workflow_id];};
 const columns=scoped?'owner,store_id,project_id,workflow_id':'owner,store_id,workflow_id';
 const slots=scoped?'?,?,?,?':'?,?,?';
 const where=scoped?'owner=? AND store_id=? AND project_id=? AND workflow_id=?':'owner=? AND store_id=? AND workflow_id=?';
 const storeWhere='owner=? AND store_id=?'+(scoped?' AND project_id=?':'');
 const storeArgs=(owner,store)=>scoped?[owner,store,projectId]:[owner,store];
 const names=Object.fromEntries(['heads','operations','snapshots','chunks','facts','cursors'].map(n=>[n,(scoped?'project_collaboration_':'collaboration_')+n]));
 const statement=(sql,...args)=>db.prepare(sql).bind(...args);
 const first=(sql,...args)=>statement(sql,...args).first();
 const rows=async(sql,...args)=>(await statement(sql,...args).all()).results;
 async function operation(owner,store,id){
  const row=await first(`SELECT outcome,receipt FROM ${names.operations} WHERE ${storeWhere} AND operation_id=?`,...storeArgs(owner,store),id);
  return row?{outcome:row.outcome,receipt:JSON.parse(row.receipt)}:{outcome:'unknown'};
 }
 async function snapshot(owner,ref,revision){
  const args=scope(owner,ref);
  const meta=revision===undefined?
   await first(`SELECT s.* FROM ${names.snapshots} s JOIN ${names.heads} h USING(${columns},revision) WHERE ${where.split(' AND ').map(c=>'s.'+c).join(' AND ')}`,...args):
   await first(`SELECT * FROM ${names.snapshots} WHERE ${where} AND revision=?`,...args,revision);
  if(!meta)return null;
  const chunks=await rows(`SELECT position,body FROM ${names.chunks} WHERE ${where} AND revision=? ORDER BY position`,...args,meta.revision);
  demand(chunks.length===meta.chunk_count&&chunks.every((c,i)=>c.position===i),'incomplete_snapshot','unavailable');
  return JSON.parse(chunks.map(c=>c.body).join(''));
 }
 async function facts(owner,ref,revision,kind){
  return (await rows(`SELECT body FROM ${names.facts} WHERE ${where} AND revision<=? AND kind=? ORDER BY revision,position`,...scope(owner,ref),revision,kind)).map(decode);
 }
 async function documentRefs(owner,ref,revision){
  return (await rows(`SELECT json_extract(body,'$.ref') AS body FROM ${names.facts} WHERE ${where} AND revision<=? AND kind='documents' ORDER BY revision,position`,...scope(owner,ref),revision)).map(decode);
 }
 return {
  operation,snapshot,facts,documentRefs,
  async loadForCommand(owner,ref){
   const state=await snapshot(owner,ref);if(!state)return null;
   const [document_refs,evidence]=await Promise.all([documentRefs(owner,ref,state.revision),facts(owner,ref,state.revision,'evidence')]);
   const available=new Set(document_refs.map(canonicalJson));
   const required=[state.plan,...Object.values(state.document_heads).map(d=>d.ref),...Object.values(state.tasks).flatMap(t=>[t.definition.plan_basis,...t.definition.inputs.filter(i=>i.kind==='document').map(i=>i.ref)]),...Object.values(state.decisions).flatMap(d=>d.basis),...state.completion_requirements.flatMap(r=>r.document_refs)].filter(Boolean);
   return {state,invariants_complete:required.every(r=>available.has(canonicalJson(r))),document_refs,evidence};
  },
  async reject(owner,ref,key,digest,receipt){
   await db.batch([statement(`INSERT INTO ${names.operations}(key,${columns},operation_id,digest,attempt,outcome,receipt) VALUES(?,${slots},?,?,?,?,?) ON CONFLICT(key) DO NOTHING`,key,...scope(owner,ref),receipt.operation_id,digest,crypto.randomUUID(),'rejected',JSON.stringify(receipt))]);
   return operation(owner,ref.store_id,receipt.operation_id);
  },
  async accept(change){
   const {owner_id:owner,ref,expected_revision:before,operation_key:key,digest,next_state:state,receipt}=change;
   const args=scope(owner,ref),attempt=crypto.randomUUID();
   const gate=`SELECT 1 FROM ${names.operations} WHERE key=? AND attempt=? AND outcome='accepted'`;
   const gateArgs=[key,attempt];
   const {accepted,before_revision,revision,accepted_at,effects,...base}=receipt;
   const rejection={...base,accepted:false,expected_revision:before,current_revision:null,recorded_at:accepted_at,failure:{error:'revision_conflict',category:'conflict',details:{current_revision:null}}};
   const current=`(SELECT revision FROM ${names.heads} WHERE ${where})`;
   const statements=[statement(`INSERT INTO ${names.operations}(key,${columns},operation_id,digest,attempt,outcome,receipt)
    SELECT ?,${slots},?,?,?,CASE WHEN COALESCE(${current},0)=? THEN 'accepted' ELSE 'rejected' END,
     CASE WHEN COALESCE(${current},0)=? THEN ? ELSE json_set(?,'$.current_revision',${current},'$.failure.details.current_revision',${current}) END
    ON CONFLICT(key) DO NOTHING`,key,...args,receipt.operation_id,digest,attempt,...args,before,...args,before,JSON.stringify(receipt),JSON.stringify(rejection),...args,...args)];
   if(before===0)statements.push(statement(`INSERT INTO ${names.heads}(${columns},revision,last_attempt) SELECT ${slots},?,? WHERE EXISTS(${gate})`,...args,state.revision,attempt,...gateArgs));
   else statements.push(statement(`UPDATE ${names.heads} SET revision=?,last_attempt=? WHERE ${where} AND revision=? AND EXISTS(${gate})`,state.revision,attempt,...args,before,...gateArgs));
   // A zero-row CAS must roll back the operation too, even if an adapter silently
   // drops the UPDATE. Rejected races and pre-existing operations have no gate.
   statements.push(statement(`INSERT INTO mutation_guard(id,ok) VALUES(?,CASE WHEN NOT EXISTS(${gate}) OR EXISTS(SELECT 1 FROM ${names.heads} WHERE ${where} AND revision=? AND last_attempt=?) THEN 1 ELSE 0 END)`,attempt,...gateArgs,...args,state.revision,attempt));
   const body=JSON.stringify(state),chunks=[];
   for(let start=0;start<body.length;){let end=Math.min(start+16000,body.length);if(end<body.length&&/[\uD800-\uDBFF]/.test(body[end-1]))end--;chunks.push(body.slice(start,end));start=end;}
   const summary={workflow_ref:ref,title:state.title,status:state.status,revision:state.revision};
   statements.push(statement(`INSERT INTO ${names.snapshots}(${columns},revision,summary,chunk_count) SELECT ${slots},?,?,? WHERE EXISTS(${gate})`,...args,state.revision,JSON.stringify(summary),chunks.length,...gateArgs));
   chunks.forEach((chunk,i)=>statements.push(statement(`INSERT INTO ${names.chunks}(${columns},revision,position,body) SELECT ${slots},?,?,? WHERE EXISTS(${gate})`,...args,state.revision,i,chunk,...gateArgs)));
   for(const [kind,items] of Object.entries({...change.facts,events:change.events}))items.forEach((item,i)=>statements.push(statement(`INSERT INTO ${names.facts}(${columns},revision,kind,position,body) SELECT ${slots},?,?,?,? WHERE EXISTS(${gate})`,...args,state.revision,kind,i,JSON.stringify(item),...gateArgs)));
   statements.push(statement('DELETE FROM mutation_guard WHERE id=?',attempt));
   await db.batch(statements);
   return operation(owner,ref.store_id,receipt.operation_id);
  },
  async document(owner,ref,doc){
   return decode(await first(`SELECT body FROM ${names.facts} WHERE ${where} AND kind='documents' AND json_extract(body,'$.ref.document_id')=? AND json_extract(body,'$.ref.revision')=?`,...scope(owner,ref),doc.document_id,doc.revision));
  },
  async saveCursor(owner,value){
   const id=(await contentDigest(canonicalJson(scoped?[owner,projectId,value]:[owner,value]))).slice(7);
   await db.batch([statement(`INSERT INTO ${names.cursors}(id,owner${scoped?',project_id':''},body) VALUES(?,?${scoped?',?':''},?) ON CONFLICT(id) DO NOTHING`,id,owner,...(scoped?[projectId]:[]),JSON.stringify(value))]);return id;
  },
  async cursor(owner,id){return decode(await first(`SELECT body FROM ${names.cursors} WHERE owner=?${scoped?' AND project_id=?':''} AND id=?`,owner,...(scoped?[projectId]:[]),id));},
  async baseline(owner,store){return (await first(`SELECT COALESCE(MAX(seq),0) AS value FROM ${names.snapshots} WHERE ${storeWhere}`,...storeArgs(owner,store))).value;},
  async find(owner,store,q,baseline,after,limit){
   const result=await rows(`SELECT s.summary AS body FROM ${names.snapshots} s WHERE s.owner=? AND s.store_id=?${scoped?' AND s.project_id=?':''} AND s.seq<=? AND s.workflow_id>?
    AND s.revision=(SELECT MAX(n.revision) FROM ${names.snapshots} n WHERE n.owner=s.owner AND n.store_id=s.store_id${scoped?' AND n.project_id=s.project_id':''} AND n.workflow_id=s.workflow_id AND n.seq<=?)
    AND instr(lower(json_extract(s.summary,'$.title')),lower(?))>0 ORDER BY s.workflow_id LIMIT ?`,...storeArgs(owner,store),baseline,after,baseline,q,limit);
   return result.map(decode);
  }
 };
}
