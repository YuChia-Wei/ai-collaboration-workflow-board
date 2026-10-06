import {Fault,demand,nonempty,hash,json,bytes} from './common.mjs';
import {boardCommand,boardDetail,boardDocument,PROFILE} from './board.mjs';
import catalog from '../data/source-catalog.json' with {type:'json'};
export {Fault,hash} from './common.mjs';
let page='';
export function setPage(html){page=html;}
const states={planned:['active'],active:['blocked','completed'],blocked:['active'],completed:[]};
export function validate(w){
 demand(w&&nonempty(w.title)&&nonempty(w.goal)&&nonempty(w.next_step)&&nonempty(w.next_owner),'missing_workflow_fields');
 demand(Object.hasOwn(states,w.status),'invalid_status');demand(Array.isArray(w.required_documents),'invalid_required_documents');
 for(const s of Object.values(w.steps)){demand(Object.hasOwn(states,s.status)&&nonempty(s.title),'invalid_step');demand(Array.isArray(s.evidence_ids)&&s.evidence_ids.every(id=>Object.hasOwn(w.evidence,id)),'invalid_evidence_reference');if(s.status==='completed')demand(nonempty(s.result)&&s.evidence_ids.length>0,'missing_required_evidence');}
 for(const d of Object.values(w.documents)){if(d.required)demand(w.required_documents.includes(d.id),'required_index_mismatch');demand(d.revisions.length>0,'missing_document_revision');}
 if(w.status==='completed'){demand(Object.keys(w.steps).length>0&&Object.values(w.steps).every(s=>s.status==='completed'),'incomplete_steps');demand(w.required_documents.every(id=>w.documents[id]&&!w.documents[id].deleted),'missing_required_documents');}
 return w;
}
export async function command(db,owner,c){
 demand(c&&nonempty(c.operation_id)&&nonempty(c.workflow_id)&&nonempty(c.type)&&c.payload&&typeof c.payload==='object'&&!Array.isArray(c.payload),'invalid_command');
 demand(!await db.prepare('SELECT key FROM source_records WHERE workflow_id=? AND dataset=(SELECT value FROM source_state WHERE key=?)').bind(c.workflow_id,'active').first(),'source_snapshot_readonly',403);
 const digest=await hash(c),key=owner+':'+c.operation_id;
 const replay=async()=>{const old=await db.prepare('SELECT hash,receipt FROM operations WHERE key=?').bind(key).first();if(old){demand(old.hash===digest,'operation_payload_conflict',409);return JSON.parse(old.receipt)}return null};
 const oldReceipt=await replay();if(oldReceipt)return oldReceipt;
 demand(Number.isInteger(c.expected_revision)&&c.expected_revision>=0,'invalid_revision');
 const p=c.payload,t=c.type,time=new Date().toISOString();
 const row=await db.prepare('SELECT body,revision FROM workflows WHERE id=? AND owner=?').bind(c.workflow_id,owner).first();
 let w;
 if(t==='create_workflow'){
  demand(!row,'workflow_exists',409);demand(c.expected_revision===0,'revision_conflict',409);
  w={id:c.workflow_id,title:p.title,goal:p.goal,authorized_scope:'本人私有 Sites UI；合成資料',source:{repo:'synthetic://sites-demonstration',commit:'synthetic-v1',branch:'synthetic'},policy_version:'sites-ui-preview-1',template_version:'synthetic-1',status:'planned',revision:0,next_step:p.next_step||'補充第一個步驟',next_owner:p.next_owner||'本人',required_documents:[],steps:{},documents:{},evidence:{},logs:[],handoffs:[]};
 }else{demand(row,'workflow_not_found',404);w=JSON.parse(row.body);demand(c.expected_revision===w.revision,'revision_conflict',409,{current_revision:w.revision});}
 const before=w.revision;
 if(t==='update_workflow'){
  demand(Object.keys(p).every(k=>['title','goal','next_step','next_owner','status','required_documents'].includes(k)),'invalid_fields');
  if('status'in p)demand(states[w.status].includes(p.status),'illegal_transition');Object.assign(w,p);
 }else if(t==='add_step'){
  demand(nonempty(p.id)&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(p.id)&&!Object.hasOwn(w.steps,p.id)&&nonempty(p.title),'invalid_step');w.steps[p.id]={id:p.id,title:p.title,order:Object.keys(w.steps).length+1,owner_skill:p.owner_skill||'本人',status:'planned',result:null,evidence_ids:[],blockers:[]};
 }else if(t==='update_step'){
  demand(Object.hasOwn(w.steps,p.id),'step_not_found');demand(Object.keys(p).every(k=>['id','status','result','evidence_ids','blockers'].includes(k)),'invalid_fields');const s=w.steps[p.id];if('status'in p)demand(states[s.status].includes(p.status),'illegal_transition');Object.assign(s,p);
 }else if(t==='document'){
  demand(nonempty(p.id)&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(p.id)&&['create','revise','rename','archive'].includes(p.action),'invalid_document_action');let d=Object.hasOwn(w.documents,p.id)?w.documents[p.id]:null;
  if(p.action==='create'){demand(!d,'document_exists');d={id:p.id,name:p.name||'未命名文件',kind:'markdown',required:!!p.required,deleted:false,revisions:[]};w.documents[p.id]=d;if(d.required)w.required_documents.push(d.id);}
  else demand(d&&!d.deleted,'document_not_found');
  if(p.action==='archive'){demand(!w.required_documents.includes(d.id),'required_document_archive_forbidden');d.deleted=true;d.deleted_at=time;}
  if(p.action==='rename'){demand(nonempty(p.name),'missing_name');d.name=p.name;}
  if(['create','revise'].includes(p.action)){demand(typeof p.content==='string','missing_content');if(d.revisions.at(-1)?.final)demand(['erratum','addendum','successor'].includes(p.relation),'final_requires_successor');d.revisions.push({revision:d.revisions.length+1,previous:d.revisions.length||null,content:p.content,hash:await hash(p.content),final:!!p.final,relation:p.relation||null,created_at:time,finding_ids:[],decision_ids:[]});}
 }else if(t==='log'){demand(nonempty(p.text),'missing_log');w.logs.push({text:p.text,at:time});}
 else if(t==='handoff'){demand(nonempty(p.next_step)&&nonempty(p.next_owner)&&['blockers','failures','limitations'].every(k=>Array.isArray(p[k])&&p[k].every(nonempty)),'invalid_handoff');w.handoffs.push({...p,at:time});w.next_step=p.next_step;w.next_owner=p.next_owner;}
 else if(t==='evidence'){
  demand(['id','command','result','source_commit'].every(k=>nonempty(p[k]))&&['passed','failed','interrupted','blocked'].includes(p.outcome),'invalid_evidence');demand(p.environment&&typeof p.environment==='object'&&Object.keys(p.environment).length>0&&Object.values(p.environment).every(v=>v!==null&&(typeof v!=='string'||nonempty(v))),'invalid_environment');demand(!('blob_base64'in p),'attachments_not_supported_in_preview');demand(!w.evidence[p.id],'evidence_exists');w.evidence[p.id]={...p,observed_at:time};
 }else demand(t==='create_workflow','command_not_allowed',403);
 validate(w);w.revision=before+1;
 const receipt={accepted:true,operation_id:c.operation_id,workflow_id:w.id,revision:w.revision,principal:owner,payload_hash:digest};
 const event={workflow_id:w.id,operation_id:c.operation_id,principal:owner,before_revision:before,after_revision:w.revision,at:time,command:c};
 const sql=t==='create_workflow'?db.prepare('INSERT INTO workflows(id,owner,revision,last_operation,body) VALUES(?,?,?,?,?)').bind(w.id,owner,w.revision,c.operation_id,JSON.stringify(w)):db.prepare('UPDATE workflows SET revision=?,last_operation=?,body=? WHERE id=? AND owner=? AND revision=?').bind(w.revision,c.operation_id,JSON.stringify(w),w.id,owner,before);
 // D1's zero-row UPDATE alone is not an error. The final CHECK deliberately
 // fails unless this exact operation inserted a receipt, rolling back the batch.
 const gate='SELECT 1 FROM workflows WHERE id=? AND owner=? AND last_operation=? AND revision=?';
 try{await db.batch([sql,
  db.prepare(`INSERT INTO events(owner,workflow_id,revision,body) SELECT ?,?,?,? WHERE EXISTS(${gate})`).bind(owner,w.id,w.revision,JSON.stringify(event),w.id,owner,c.operation_id,w.revision),
  db.prepare(`INSERT INTO operations(key,owner,id,workflow_id,hash,receipt) SELECT ?,?,?,?,?,? WHERE EXISTS(${gate})`).bind(key,owner,c.operation_id,w.id,digest,JSON.stringify(receipt),w.id,owner,c.operation_id,w.revision),
  db.prepare('INSERT INTO mutation_guard(id,ok) VALUES(?,CASE WHEN EXISTS(SELECT 1 FROM operations WHERE key=?) THEN 1 ELSE 0 END)').bind(key,key),
  db.prepare('DELETE FROM mutation_guard WHERE id=?').bind(key)]);
 }catch(e){const accepted=await replay();if(accepted)return accepted;const latest=await db.prepare('SELECT revision FROM workflows WHERE id=? AND owner=?').bind(w.id,owner).first();if(latest?.revision!==before)throw new Fault(409,'revision_conflict',{current_revision:latest?.revision});throw e;}
 return receipt;
}
export async function seed(db,owner){
 for(const [id,title,goal,next] of [['demo-travel','旅行手冊整理','把合成旅行資訊整理成可交接的手冊。','補上雨天備案並修訂交通文件'],['demo-reading','週末讀書角','試用文件修訂與心得紀錄，不是真實專案進度。','整理第二份閱讀心得'],['demo-cooking','料理筆記整備','示範受控步驟與證據關聯。','核對份量並更新準備步驟']]){
  if(await db.prepare('SELECT id FROM workflows WHERE id=? AND owner=?').bind(id,owner).first())continue;
  let rev=0,n=0;const write=async(type,payload)=>{const r=await command(db,owner,{type,payload,workflow_id:id,expected_revision:rev,operation_id:`seed-${id}-${++n}`});rev=r.revision};
  await write('create_workflow',{title,goal,next_step:next,next_owner:'示範紀錄者'});
  await write('add_step',{id:'S1',title:'整理資料與初稿',owner_skill:'示範紀錄者'});await write('add_step',{id:'S2',title:'補充例外情況與交接',owner_skill:'示範審閱者'});
  await write('document',{id:'plan',action:'create',name:'工作計畫',content:`# ${title}\n\n這是合成示範資料，不對應任何真實工作。\n\n## 目標\n${goal}\n\n## 下一步\n${next}`,required:true,final:true});
  await write('evidence',{id:'E1',command:'synthetic fixture check','result':'合成初稿檢查通過；不是真實執行結果。',outcome:'passed',source_commit:'synthetic-v1',environment:{mode:'synthetic'}});
  await write('update_step',{id:'S1',status:'active'});await write('update_step',{id:'S1',status:'completed',result:'合成初稿已整理',evidence_ids:['E1']});
  await write('update_workflow',{status:'active'});await write('log',{text:'已保存合成初稿，保留原始文件與檢查紀錄。'});
  await write('handoff',{next_step:next,next_owner:'示範審閱者',blockers:[],failures:[],limitations:['只含合成資料','未接入本機 coding agent','附件上傳與完整遷移尚未提供']});
 }
}
// Owner-authorized, temporary import capability. The key is a Sites runtime
// secret, never part of the source or browser. Unset it after verified import.
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
export async function sourceDetail(db,id){
 const row=await db.prepare('SELECT dataset,body FROM source_records WHERE workflow_id=? AND dataset=(SELECT value FROM source_state WHERE key=?)').bind(id,'active').first();
 if(!row)return null;const w=JSON.parse(row.body);
 const docs=(await db.prepare('SELECT body FROM source_documents WHERE dataset=? AND workflow_id=?').bind(row.dataset,id).all()).results;
 w.documents=Object.fromEntries(docs.map(r=>{const d=JSON.parse(r.body);return [d.id,d]}));return w;
}
export async function handle(request,env){
 try{
  const url=new URL(request.url);
  if(url.pathname==='/')return new Response(page,{headers:{'content-type':'text/html;charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
  demand(url.pathname.startsWith('/api/'),'not_found',404);
  // Completed one-time import: reject even a previously valid runtime secret.
  if(url.pathname==='/api/source-import')throw new Fault(403,'import_forbidden');
  const owner=request.headers.get('oai-authenticated-user-id');demand(nonempty(owner),'signin_required',401);
  demand(env.DB,'storage_unavailable',503);const db=env.DB;
  if(request.method==='GET'&&url.pathname==='/api/source-status'){
   const active=await db.prepare('SELECT value FROM source_state WHERE key=?').bind('active').first();
   const [records,documents]=await Promise.all([
    db.prepare('SELECT workflow_id,hash FROM source_records WHERE dataset=? ORDER BY workflow_id').bind(active?.value||'').all(),
    db.prepare('SELECT workflow_id,document_id,hash FROM source_documents WHERE dataset=? ORDER BY workflow_id,document_id').bind(active?.value||'').all()
   ]);
   return json({dataset:active?.value||null,workflow_count:records.results.length,document_count:documents.results.length,row_hash_manifest_sha256:await hash({records:records.results,documents:documents.results}),projection_available:active?.value===catalog.source_commit});
  }
  if(request.method==='POST'){demand(!request.headers.get('Origin')||request.headers.get('Origin')===url.origin,'origin_forbidden',403);if(url.pathname==='/api/commands'){
   const raw=await request.text();demand(bytes(raw)<=300000,'request_too_large',413);let c;try{c=JSON.parse(raw);}catch{throw new Fault(422,'invalid_command');}
   if(c.service_contract_version===PROFILE)return json(await boardCommand(db,owner,c));
   demand(c.type!=='create_workflow','legacy_creation_disabled',403);return json(await command(db,owner,c));
  }}
  if(request.method==='GET'&&url.pathname==='/api/workflows'){
   const active=await db.prepare('SELECT value FROM source_state WHERE key=?').bind('active').first();
   const [native,legacy,counts,docCounts]=await Promise.all([
    db.prepare('SELECT body FROM board_workflows WHERE owner=? ORDER BY updated_at DESC LIMIT 5000').bind(owner).all(),
    db.prepare('SELECT body FROM workflows WHERE owner=? ORDER BY rowid DESC LIMIT 5000').bind(owner).all(),
    db.prepare('SELECT workflow_id,status,COUNT(*) AS count FROM board_tasks WHERE owner=? GROUP BY workflow_id,status').bind(owner).all(),
    db.prepare('SELECT workflow_id,COUNT(*) AS count FROM board_documents WHERE owner=? GROUP BY workflow_id').bind(owner).all()
   ]);
   const sources=active?.value===catalog.source_commit?Object.values(catalog.workflows).sort((a,b)=>b.id.localeCompare(a.id)):[];
   const nativeRecords=native.results.map(r=>{const w=JSON.parse(r.body),tasks=counts.results.filter(x=>x.workflow_id===w.id);return {...w,record_mode:'board',task_count:tasks.reduce((n,x)=>n+x.count,0),task_counts:Object.fromEntries(tasks.map(x=>[x.status,x.count])),document_count:docCounts.results.find(x=>x.workflow_id===w.id)?.count||0};});
   const all=[...nativeRecords,...sources,...legacy.results.map(r=>({...JSON.parse(r.body),record_mode:'legacy'}))].map(summarize);
   const facets={kinds:[...new Set(all.map(w=>w.workflow_kind).filter(Boolean))].sort(),owners:[...new Set(all.map(w=>w.owner_skill).filter(Boolean))].sort(),statuses:[...new Set(all.map(w=>w.status||'unrecorded'))].sort()};
   const q=(url.searchParams.get('q')||'').slice(0,200).toLowerCase(),status=url.searchParams.get('status'),kind=url.searchParams.get('kind'),skill=url.searchParams.get('owner_skill'),mode=url.searchParams.get('mode');
   const filtered=all.filter(w=>(!status||(w.status||'unrecorded')===status)&&(!kind||w.workflow_kind===kind)&&(!skill||w.owner_skill===skill)&&(!mode||w.record_mode===mode)&&(!q||[w.id,w.title,w.goal,w.owner_skill,w.workflow_kind,...w.work_items.map(x=>x.url),...(w.referenced_work_items||[]).map(x=>x.url)].join(' ').toLowerCase().includes(q)));
   const offset=Math.max(0,Number.parseInt(url.searchParams.get('offset')||'0',10)||0),limit=Math.min(50,Math.max(1,Number.parseInt(url.searchParams.get('limit')||'30',10)||30));
   return json({items:filtered.slice(offset,offset+limit),total:filtered.length,all_total:all.length,offset,limit,has_more:offset+limit<filtered.length,facets,source_commit:active?.value||null,source_projection_available:active?.value===catalog.source_commit});
  }
  const documentMatch=url.pathname.match(/^\/api\/workflows\/([^/]+)\/documents\/([^/]+)$/);
  if(request.method==='GET'&&documentMatch){const id=decodeURIComponent(documentMatch[1]),docId=decodeURIComponent(documentMatch[2]),rev=Number(url.searchParams.get('revision')||0),mode=url.searchParams.get('mode');
   demand(Number.isInteger(rev)&&rev>=0,'invalid_revision');
   if(mode==='board')return json(await boardDocument(db,owner,id,docId,rev));
   if(mode==='source_snapshot'){
    demand(rev===0||rev===1,'revision_not_found',404);
    const row=await db.prepare('SELECT body FROM source_documents WHERE workflow_id=? AND document_id=? AND dataset=(SELECT value FROM source_state WHERE key=?)').bind(id,docId,'active').first();demand(row,'document_not_found',404);
    const d=JSON.parse(row.body);return json({document:{...d,revisions:undefined},revision:{...d.revisions.at(-1),snapshot:true,created_at:null,final:null}});
   }
   throw new Fault(404,'document_not_found');
  }
  const match=url.pathname.match(/^\/api\/workflows\/([^/]+)$/);
  if(request.method==='GET'&&match){const id=decodeURIComponent(match[1]),mode=url.searchParams.get('mode')||'auto';let w=null;
   if(['board','auto'].includes(mode))w=await boardDetail(db,owner,id);
   if(!w&&['source_snapshot','auto'].includes(mode)){
    const row=await db.prepare('SELECT dataset,body FROM source_records WHERE workflow_id=? AND dataset=(SELECT value FROM source_state WHERE key=?)').bind(id,'active').first();
    if(row&&row.dataset===catalog.source_commit&&catalog.workflows[id])w=structuredClone(catalog.workflows[id]);
    else if(row){w=JSON.parse(row.body);w.projection_notes=['此來源版本尚未建立共通欄位投影，請查閱原始文件。'];w.status=w.source_status==='unrecorded'?null:w.source_status;w.documents={};}
   }
   if(!w&&['legacy','auto'].includes(mode)){const row=await db.prepare('SELECT body FROM workflows WHERE id=? AND owner=?').bind(id,owner).first();if(row)w={...JSON.parse(row.body),record_mode:'legacy'};}
   demand(w,'not_found',404);return json({workflow:w,missing_required_documents:(w.required_documents||[]).filter(id=>!w.documents[id]||w.documents[id].deleted)});
  }
  const operation=url.pathname.match(/^\/api\/operations\/([^/]+)$/);
  if(request.method==='GET'&&operation){const row=await db.prepare('SELECT receipt FROM operations WHERE owner=? AND id=?').bind(owner,decodeURIComponent(operation[1])).first();demand(row,'operation_not_found',404);return json(JSON.parse(row.receipt));}
  throw new Fault(404,'not_found');
 }catch(e){if(e instanceof Fault)return json({error:e.error,...e.details},e.status);console.error('workflow request failed',String(e));return json({error:'storage_unavailable'},503);}
}
export function summarize(w){const tasks=Object.values(w.steps||{}),counts=w.task_counts||{};if(!w.task_counts)for(const t of tasks)counts[t.status||'unrecorded']=(counts[t.status||'unrecorded']||0)+1;return {id:w.id,title:w.title,goal:w.goal,record_mode:w.record_mode,namespace:w.namespace||'personal',status:w.status??null,workflow_kind:w.workflow_kind||null,owner_skill:w.owner_skill||null,current_phase:w.current_phase||null,updated_at:w.updated_at||null,revision:w.revision,task_count:w.task_count??tasks.length,task_counts:counts,document_count:w.document_count??Object.keys(w.documents||{}).length,unparsed_task_count:w.unparsed_task_documents?.length||0,work_items:w.work_items||[],referenced_work_items:w.referenced_work_items||[],source:{repo:w.source?.repo,commit:w.source?.commit},lifecycle_contract:w.lifecycle_contract||null};}
