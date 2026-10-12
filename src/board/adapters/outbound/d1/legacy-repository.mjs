export function createLegacyRepository(db){
 return {
  async load(owner,id){const row=await db.prepare('SELECT body,revision FROM workflows WHERE id=? AND owner=?').bind(id,owner).first();return row?JSON.parse(row.body):null;},
  async revision(owner,id){return (await db.prepare('SELECT revision FROM workflows WHERE id=? AND owner=?').bind(id,owner).first())?.revision;},
  async commit({w,before,t,time,c,owner,receipt,digest,key}){
 const event={workflow_id:w.id,operation_id:c.operation_id,principal:owner,before_revision:before,after_revision:w.revision,at:time,command:c};
 const sql=t==='create_workflow'?db.prepare('INSERT INTO workflows(id,owner,revision,last_operation,body) VALUES(?,?,?,?,?)').bind(w.id,owner,w.revision,c.operation_id,JSON.stringify(w)):db.prepare('UPDATE workflows SET revision=?,last_operation=?,body=? WHERE id=? AND owner=? AND revision=?').bind(w.revision,c.operation_id,JSON.stringify(w),w.id,owner,before);
 // D1's zero-row UPDATE alone is not an error. The final CHECK deliberately
 // fails unless this exact operation inserted a receipt, rolling back the batch.
 const gate='SELECT 1 FROM workflows WHERE id=? AND owner=? AND last_operation=? AND revision=?';
 await db.batch([sql,
  db.prepare(`INSERT INTO events(owner,workflow_id,revision,body) SELECT ?,?,?,? WHERE EXISTS(${gate})`).bind(owner,w.id,w.revision,JSON.stringify(event),w.id,owner,c.operation_id,w.revision),
  db.prepare(`INSERT INTO operations(key,owner,id,workflow_id,hash,receipt) SELECT ?,?,?,?,?,? WHERE EXISTS(${gate})`).bind(key,owner,c.operation_id,w.id,digest,JSON.stringify(receipt),w.id,owner,c.operation_id,w.revision),
  db.prepare('INSERT INTO mutation_guard(id,ok) VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM operations WHERE key=?) THEN 1 ELSE 0 END)').bind(key,key),
  db.prepare('DELETE FROM mutation_guard WHERE id=?').bind(key)]);

  }
 };
}
