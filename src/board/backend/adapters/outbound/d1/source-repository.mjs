export async function sourceDetail(db,id){
 const row=await db.prepare('SELECT dataset,body FROM source_records WHERE workflow_id=? AND dataset=(SELECT value FROM source_state WHERE key=?)').bind(id,'active').first();
 if(!row)return null;const w=JSON.parse(row.body);
 const docs=(await db.prepare('SELECT body FROM source_documents WHERE dataset=? AND workflow_id=?').bind(row.dataset,id).all()).results;
 w.documents=Object.fromEntries(docs.map(r=>{const d=JSON.parse(r.body);return [d.id,d]}));return w;
}

export function createSourceRepository(db){
 return {
  async active(){return (await db.prepare('SELECT value FROM source_state WHERE key=?').bind('active').first())?.value||null;},
  async exists(id){return !!await db.prepare('SELECT key FROM source_records WHERE workflow_id=? AND dataset=(SELECT value FROM source_state WHERE key=?)').bind(id,'active').first();},
  async record(id){const row=await db.prepare('SELECT dataset,body FROM source_records WHERE workflow_id=? AND dataset=(SELECT value FROM source_state WHERE key=?)').bind(id,'active').first();return row?{dataset:row.dataset,workflow:JSON.parse(row.body)}:null;},
  async document(id,docId){const row=await db.prepare('SELECT body FROM source_documents WHERE workflow_id=? AND document_id=? AND dataset=(SELECT value FROM source_state WHERE key=?)').bind(id,docId,'active').first();return row?JSON.parse(row.body):null;},
  detail:id=>sourceDetail(db,id),
  async manifests(dataset){const [records,documents]=await Promise.all([
   db.prepare('SELECT workflow_id,hash FROM source_records WHERE dataset=? ORDER BY workflow_id').bind(dataset||'').all(),
   db.prepare('SELECT workflow_id,document_id,hash FROM source_documents WHERE dataset=? ORDER BY workflow_id,document_id').bind(dataset||'').all()
  ]);return {records:records.results,documents:documents.results};}
 };
}
