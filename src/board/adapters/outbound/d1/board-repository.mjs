import {demand} from '../../../domain/errors.mjs';
import {bytes} from '../../../domain/values.mjs';

export async function boardDetail(db,owner,id){
 const row=await db.prepare('SELECT body FROM board_workflows WHERE owner=? AND id=?').bind(owner,id).first();
 if(!row)return null;
 const [tasks,docs,revisions,entries]=await Promise.all([
  db.prepare('SELECT body FROM board_tasks WHERE owner=? AND workflow_id=? ORDER BY rowid').bind(owner,id).all(),
  db.prepare('SELECT body FROM board_documents WHERE owner=? AND workflow_id=? ORDER BY name').bind(owner,id).all(),
  db.prepare('SELECT document_id,revision,hash,final,relation,created_at FROM board_revisions WHERE owner=? AND workflow_id=? ORDER BY revision').bind(owner,id).all(),
  db.prepare('SELECT kind,body FROM board_entries WHERE owner=? AND workflow_id=? ORDER BY created_at,id').bind(owner,id).all()
 ]);
 const w=JSON.parse(row.body);w.record_mode='board';w.namespace='personal';w.steps=Object.fromEntries(tasks.results.map(r=>{const t=JSON.parse(r.body);return [t.id,t]}));
 w.documents=Object.fromEntries(docs.results.map(r=>{const d=JSON.parse(r.body);return [d.id,{...d,revisions:revisions.results.filter(x=>x.document_id===d.id).map(x=>({...x,final:!!x.final}))}]}));
 w.logs=[];w.handoffs=[];w.evidence={};
 for(const r of entries.results){const e=JSON.parse(r.body);if(r.kind==='evidence')w.evidence[e.id]=e;else if(r.kind==='log')w.logs.push(e);else if(r.kind==='handoff')w.handoffs.push(e);}
 return w;
}
export async function boardDocument(db,owner,id,docId,revision){
 const d=await db.prepare('SELECT body FROM board_documents WHERE owner=? AND workflow_id=? AND id=?').bind(owner,id,docId).first();demand(d,'document_not_found',404);
 const r=revision?await db.prepare('SELECT revision,content,hash,final,relation,created_at FROM board_revisions WHERE owner=? AND workflow_id=? AND document_id=? AND revision=?').bind(owner,id,docId,revision).first():await db.prepare('SELECT revision,content,hash,final,relation,created_at FROM board_revisions WHERE owner=? AND workflow_id=? AND document_id=? ORDER BY revision DESC LIMIT 1').bind(owner,id,docId).first();
 demand(r,'revision_not_found',404);return {document:JSON.parse(d.body),revision:{...r,final:!!r.final}};
}

export function createBoardRepository(db){
 return {
  load:(owner,id)=>boardDetail(db,owner,id),
  document:(owner,id,docId,revision)=>boardDocument(db,owner,id,docId,revision),
  async revision(owner,id){return (await db.prepare('SELECT revision FROM board_workflows WHERE owner=? AND id=?').bind(owner,id).first())?.revision;},
  async commit(change){
   const {w,previous,before,revisions,entry,type,time,c,owner,receipt,digest,opKey}=change;
 const body={...w};for(const k of ['steps','documents','logs','handoffs','evidence'])delete body[k];
 const gate='SELECT 1 FROM board_workflows WHERE owner=? AND id=? AND revision=? AND last_operation=?',gateArgs=[owner,w.id,w.revision,c.operation_id];
 const statements=[type==='create_workflow'?db.prepare('INSERT INTO board_workflows(owner,id,kind,title,status,owner_skill,updated_at,revision,last_operation,body) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(owner,w.id,w.workflow_kind,w.title,w.status,w.owner_skill,time,w.revision,c.operation_id,JSON.stringify(body)):db.prepare('UPDATE board_workflows SET kind=?,title=?,status=?,owner_skill=?,updated_at=?,revision=?,last_operation=?,body=? WHERE owner=? AND id=? AND revision=?').bind(w.workflow_kind,w.title,w.status,w.owner_skill,time,w.revision,c.operation_id,JSON.stringify(body),owner,w.id,before)];
 for(const task of Object.values(w.steps))if(JSON.stringify(task)!==JSON.stringify(previous?.steps[task.id])){
  demand(bytes(task)<=64000,'metadata_too_large',413);statements.push(db.prepare(`INSERT INTO board_tasks(owner,workflow_id,id,status,owner_skill,body) SELECT ?,?,?,?,?,? WHERE EXISTS(${gate}) ON CONFLICT(owner,workflow_id,id) DO UPDATE SET status=excluded.status,owner_skill=excluded.owner_skill,body=excluded.body`).bind(owner,w.id,task.id,task.status,task.owner_skill,JSON.stringify(task),...gateArgs));
 }
 for(const doc of Object.values(w.documents))if(JSON.stringify(doc)!==JSON.stringify(previous?.documents[doc.id])){const {revisions,...meta}=doc;demand(bytes(meta)<=64000,'metadata_too_large',413);statements.push(db.prepare(`INSERT INTO board_documents(owner,workflow_id,id,name,body) SELECT ?,?,?,?,? WHERE EXISTS(${gate}) ON CONFLICT(owner,workflow_id,id) DO UPDATE SET name=excluded.name,body=excluded.body`).bind(owner,w.id,doc.id,doc.name,JSON.stringify(meta),...gateArgs));}
 for(const r of revisions)statements.push(db.prepare(`INSERT INTO board_revisions(owner,workflow_id,document_id,revision,content,hash,final,relation,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(${gate})`).bind(owner,w.id,r.document_id,r.revision,r.content,r.hash,Number(r.final),r.relation,time,...gateArgs));
 if(entry){demand(bytes(entry.body)<=64000,'metadata_too_large',413);statements.push(db.prepare(`INSERT INTO board_entries(owner,workflow_id,id,kind,created_at,body) SELECT ?,?,?,?,?,? WHERE EXISTS(${gate})`).bind(owner,w.id,entry.id,entry.kind,time,JSON.stringify(entry.body),...gateArgs));}
 statements.push(
  db.prepare(`INSERT INTO events(owner,workflow_id,revision,body) SELECT ?,?,?,? WHERE EXISTS(${gate})`).bind(owner,'board:'+w.id,w.revision,JSON.stringify({workflow_id:w.id,namespace:'personal',operation_id:c.operation_id,principal:owner,before_revision:before,after_revision:w.revision,at:time,command:c}),...gateArgs),
  db.prepare(`INSERT INTO operations(key,owner,id,workflow_id,hash,receipt) SELECT ?,?,?,?,?,? WHERE EXISTS(${gate})`).bind(opKey,owner,c.operation_id,'board:'+w.id,digest,JSON.stringify(receipt),...gateArgs),
  db.prepare('INSERT INTO mutation_guard(id,ok) VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM operations WHERE key=?) THEN 1 ELSE 0 END)').bind(opKey,opKey),
  db.prepare('DELETE FROM mutation_guard WHERE id=?').bind(opKey));
   await db.batch(statements);
  }
 };
}
