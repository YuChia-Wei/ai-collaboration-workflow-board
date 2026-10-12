// Historical one-time import test fixture; never bundled into the runtime.
import {demand} from '../../domain/errors.mjs';
import {nonempty,hash} from '../../domain/values.mjs';
import {json} from '../../adapters/inbound/http/responses.mjs';
export async function sourceImport(request,db){
 const url=new URL(request.url);
 if(request.method==='GET'){
  if(url.searchParams.get('backup')==='1'){
   const result={};for(const table of ['workflows','events','operations'])result[table]=(await db.prepare('SELECT * FROM '+table).all()).results;
   return json(result);
  }
  const dataset=url.searchParams.get('dataset');demand(/^[a-f0-9]{40}$/.test(dataset||''),'invalid_dataset');
  const records=(await db.prepare('SELECT workflow_id,hash FROM source_records WHERE dataset=? ORDER BY workflow_id').bind(dataset).all()).results;
  const documents=(await db.prepare('SELECT workflow_id,document_id,hash FROM source_documents WHERE dataset=? ORDER BY workflow_id,document_id').bind(dataset).all()).results;
  const active=await db.prepare('SELECT value FROM source_state WHERE key=?').bind('active').first();
  const demos=await db.prepare("SELECT COUNT(*) AS count FROM workflows WHERE id IN ('demo-travel','demo-reading','demo-cooking')").first();
  return json({records,documents,active:active?.value||null,demo_count:demos.count});
 }
 demand(request.method==='POST','method_not_allowed',405);
 const raw=await request.text();demand(new TextEncoder().encode(raw).length<=1500000,'request_too_large',413);const p=JSON.parse(raw);
 demand(/^[a-f0-9]{40}$/.test(p.dataset||''),'invalid_dataset');
 if(p.action==='stage'){
  demand(['records','documents'].includes(p.kind)&&Array.isArray(p.rows)&&p.rows.length>0&&p.rows.length<=40,'invalid_import_rows');
  const active=await db.prepare('SELECT value FROM source_state WHERE key=?').bind('active').first();demand(active?.value!==p.dataset,'dataset_already_active',409);
  const table=p.kind==='records'?'source_records':'source_documents';const statements=[];
  for(const row of p.rows){
   demand(nonempty(row.workflow_id)&&typeof row.body==='string'&&row.body.length<=1000000&&await hash(row.body)===row.hash,'invalid_import_hash');
   const w=JSON.parse(row.body);demand(p.kind==='records'?w.id===row.workflow_id&&w.record_mode==='source_snapshot'&&w.source?.commit===p.dataset:w.id===row.document_id&&nonempty(w.source_path),'invalid_import_body');
   const key=p.dataset+':'+row.workflow_id+(p.kind==='documents'?':'+row.document_id:'');
   const existing=await db.prepare('SELECT hash FROM '+table+' WHERE key=?').bind(key).first();demand(!existing||existing.hash===row.hash,'import_payload_conflict',409);
   statements.push(p.kind==='records'?db.prepare('INSERT OR IGNORE INTO source_records(key,dataset,workflow_id,body,hash) VALUES(?,?,?,?,?)').bind(key,p.dataset,row.workflow_id,row.body,row.hash):db.prepare('INSERT OR IGNORE INTO source_documents(key,dataset,workflow_id,document_id,body,hash) VALUES(?,?,?,?,?,?)').bind(key,p.dataset,row.workflow_id,row.document_id,row.body,row.hash));
  }
  await db.batch(statements);return json({accepted:true,rows:p.rows.length});
 }
 demand(p.action==='activate'&&Number.isInteger(p.records)&&p.records>0&&Number.isInteger(p.documents)&&p.documents>0,'invalid_activation');
 // The CHECK gate and visibility switch share one D1 transaction with the
 // narrowly selected demo cleanup. A partial staged dataset cannot be shown.
 const key='activate:'+p.dataset;
 await db.batch([
  db.prepare('INSERT INTO mutation_guard(id,ok) VALUES(?,CASE WHEN (SELECT COUNT(*) FROM source_records WHERE dataset=?)=? AND (SELECT COUNT(*) FROM source_documents WHERE dataset=?)=? THEN 1 ELSE 0 END)').bind(key,p.dataset,p.records,p.dataset,p.documents),
  db.prepare("DELETE FROM events WHERE EXISTS(SELECT 1 FROM workflows w WHERE w.id=events.workflow_id AND w.owner=events.owner AND w.id IN ('demo-travel','demo-reading','demo-cooking') AND json_extract(w.body,'$.source.repo') LIKE 'synthetic://%')"),
  db.prepare("DELETE FROM operations WHERE EXISTS(SELECT 1 FROM workflows w WHERE w.id=operations.workflow_id AND w.owner=operations.owner AND w.id IN ('demo-travel','demo-reading','demo-cooking') AND json_extract(w.body,'$.source.repo') LIKE 'synthetic://%')"),
  db.prepare("DELETE FROM workflows WHERE id IN ('demo-travel','demo-reading','demo-cooking') AND json_extract(body,'$.source.repo') LIKE 'synthetic://%'"),
  db.prepare('INSERT INTO source_state(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('active',p.dataset),
  db.prepare('DELETE FROM mutation_guard WHERE id=?').bind(key)
 ]);
 return json({accepted:true,dataset:p.dataset,records:p.records,documents:p.documents});
}
