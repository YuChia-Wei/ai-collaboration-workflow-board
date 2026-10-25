import {createCollaborationRepository} from './collaboration-repository.mjs';
import {canonicalJson} from '../../../Core/Workflows/Domain/collaboration-values.mjs';

const where='owner=? AND store_id=? AND project_id=?';
const scope=(owner,ref)=>[owner,ref.store_id,ref.project_id];
const project=row=>row?{project_ref:{store_id:row.store_id,namespace:'personal',project_id:row.project_id},name:row.name,revision:row.revision,workflow_contract:'workflow-board/collaboration/2'}:null;

export function createProjectRepository(db){
 const statement=(sql,...args)=>db.prepare(sql).bind(...args);
 const first=(sql,...args)=>statement(sql,...args).first();
 // Empty ID is reserved internally and is not a valid client project identifier.
 const cursors=createCollaborationRepository(db,'');
 const operation=async(owner,ref,id)=>{const row=await first(`SELECT receipt FROM project_collaboration_operations WHERE ${where} AND operation_id=?`,...scope(owner,ref),id);return row?JSON.parse(row.receipt):null;};
 return {
  operation,cursor:cursors.cursor,saveCursor:cursors.saveCursor,
  async read(owner,store,id){return project(await first(`SELECT * FROM collaboration_projects WHERE ${where}`,owner,store,id));},
  async list(owner,store,after,limit){return (await statement('SELECT * FROM collaboration_projects WHERE owner=? AND store_id=? AND project_id>? ORDER BY project_id LIMIT ?',owner,store,after,limit).all()).results.map(project);},
  async legacyCounts(owner,store){
   const result={};
   for(const name of ['heads','snapshots','chunks','facts','operations'])result[name]=(await first(`SELECT count(*) AS n FROM collaboration_${name} WHERE owner=? AND store_id=?`,owner,store)).n;
   result.cursors=(await first("SELECT count(*) AS n FROM collaboration_cursors WHERE owner=? AND COALESCE(json_extract(body,'$.store'),json_extract(body,'$.ref.store_id'))=?",owner,store)).n;
   return result;
  },
  async change(owner,c,digest){
   const args=scope(owner,c.project_ref),attempt=crypto.randomUUID(),before=c.expected_revision,key=canonicalJson([...args,c.operation_id]);
   const current=`COALESCE((SELECT revision FROM collaboration_projects WHERE ${where}),0)`;
   const accepted={accepted:true,project_ref:c.project_ref,operation_id:c.operation_id,request_digest:digest,expected_revision:before,revision:before+1,error:null};
   const rejected={...accepted,accepted:false,revision:0,error:'revision_conflict'};
   const gate=`SELECT 1 FROM project_collaboration_operations WHERE ${where} AND operation_id=? AND attempt=? AND outcome='accepted'`;
   const gateArgs=[...args,c.operation_id,attempt];
   // Project administration and workflow commands share one operation-ID scope.
   // Empty workflow_id identifies the project itself and is not a valid workflow ID.
   const batch=[statement(`INSERT INTO project_collaboration_operations(key,owner,store_id,project_id,workflow_id,operation_id,digest,attempt,outcome,receipt)
    SELECT ?,?,?,?,'',?,?,?,CASE WHEN ${current}=? THEN 'accepted' ELSE 'rejected' END,
    CASE WHEN ${current}=? THEN ? ELSE json_set(?,'$.revision',${current}) END
    ON CONFLICT(key) DO NOTHING`,key,...args,c.operation_id,digest,attempt,...args,before,...args,before,JSON.stringify(accepted),JSON.stringify(rejected),...args)];
   if(c.command==='project.create')batch.push(statement(`INSERT INTO collaboration_projects(owner,store_id,project_id,name,revision,last_attempt) SELECT ?,?,?,?,?,? WHERE EXISTS(${gate})`,...args,c.payload.name,1,attempt,...gateArgs));
   else batch.push(statement(`UPDATE collaboration_projects SET name=?,revision=?,last_attempt=? WHERE ${where} AND revision=? AND EXISTS(${gate})`,c.payload.name,before+1,attempt,...args,before,...gateArgs));
   batch.push(statement(`INSERT INTO mutation_guard(id,ok) VALUES(?,CASE WHEN NOT EXISTS(${gate}) OR EXISTS(SELECT 1 FROM collaboration_projects WHERE ${where} AND last_attempt=? AND revision=?) THEN 1 ELSE 0 END)`,attempt,...gateArgs,...args,attempt,before+1));
   batch.push(statement('DELETE FROM mutation_guard WHERE id=?',attempt));
   await db.batch(batch);return operation(owner,c.project_ref,c.operation_id);
  }
 };
}
