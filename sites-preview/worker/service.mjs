export class Fault extends Error{constructor(status,error,details={}){super(error);Object.assign(this,{status,error,details});}}
const demand=(v,error,status=422,details={})=>{if(!v)throw new Fault(status,error,details)};
const states={planned:['active'],active:['blocked','completed'],blocked:['active'],completed:[]};
const nonempty=x=>typeof x==='string'&&!!x.trim();
const canonical=x=>JSON.stringify(x,Object.keys(x||{}).sort());
export async function hash(x){const raw=typeof x==='string'?x:stable(x);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
function stable(x){return x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(stable).join(',')+']':'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}';}
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
export function validate(w){
 demand(w&&nonempty(w.title)&&nonempty(w.goal)&&nonempty(w.next_step)&&nonempty(w.next_owner),'missing_workflow_fields');
 demand(w.status in states,'invalid_status');demand(Array.isArray(w.required_documents),'invalid_required_documents');
 for(const s of Object.values(w.steps)){demand(s.status in states&&nonempty(s.title),'invalid_step');demand(Array.isArray(s.evidence_ids)&&s.evidence_ids.every(id=>w.evidence[id]),'invalid_evidence_reference');if(s.status==='completed')demand(nonempty(s.result)&&s.evidence_ids.length>0,'missing_required_evidence');}
 for(const d of Object.values(w.documents)){if(d.required)demand(w.required_documents.includes(d.id),'required_index_mismatch');demand(d.revisions.length>0,'missing_document_revision');}
 if(w.status==='completed'){demand(Object.keys(w.steps).length>0&&Object.values(w.steps).every(s=>s.status==='completed'),'incomplete_steps');demand(w.required_documents.every(id=>w.documents[id]&&!w.documents[id].deleted),'missing_required_documents');}
 return w;
}
export async function command(db,owner,c){
 demand(c&&nonempty(c.operation_id)&&nonempty(c.workflow_id)&&nonempty(c.type)&&c.payload&&typeof c.payload==='object'&&!Array.isArray(c.payload),'invalid_command');
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
  demand(nonempty(p.id)&&!w.steps[p.id]&&nonempty(p.title),'invalid_step');w.steps[p.id]={id:p.id,title:p.title,order:Object.keys(w.steps).length+1,owner_skill:p.owner_skill||'本人',status:'planned',result:null,evidence_ids:[],blockers:[]};
 }else if(t==='update_step'){
  demand(w.steps[p.id],'step_not_found');demand(Object.keys(p).every(k=>['id','status','result','evidence_ids','blockers'].includes(k)),'invalid_fields');const s=w.steps[p.id];if('status'in p)demand(states[s.status].includes(p.status),'illegal_transition');Object.assign(s,p);
 }else if(t==='document'){
  demand(nonempty(p.id)&&['create','revise','rename','archive'].includes(p.action),'invalid_document_action');let d=w.documents[p.id];
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
export async function handle(request,env){
 try{
  const url=new URL(request.url);
  if(url.pathname==='/')return new Response(page,{headers:{'content-type':'text/html;charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
  demand(url.pathname.startsWith('/api/'),'not_found',404);
  const owner=request.headers.get('oai-authenticated-user-id');demand(nonempty(owner),'signin_required',401);
  demand(env.DB,'storage_unavailable',503);const db=env.DB;
  if(request.method==='POST'){demand(!request.headers.get('Origin')||request.headers.get('Origin')===url.origin,'origin_forbidden',403);if(url.pathname==='/api/demo'){await seed(db,owner);return json({ok:true});}if(url.pathname==='/api/commands'){demand(Number(request.headers.get('Content-Length')||'0')<=500000,'request_too_large',413);return json(await command(db,owner,await request.json()));}}
  if(request.method==='GET'&&url.pathname==='/api/workflows'){const r=await db.prepare('SELECT body FROM workflows WHERE owner=? ORDER BY rowid DESC').bind(owner).all();return json(r.results.map(x=>JSON.parse(x.body)));}
  const match=url.pathname.match(/^\/api\/workflows\/([^/]+)$/);
  if(request.method==='GET'&&match){const row=await db.prepare('SELECT body FROM workflows WHERE id=? AND owner=?').bind(decodeURIComponent(match[1]),owner).first();demand(row,'not_found',404);const w=JSON.parse(row.body);return json({workflow:w,missing_required_documents:w.required_documents.filter(id=>!w.documents[id]||w.documents[id].deleted)});}
  throw new Fault(404,'not_found');
 }catch(e){if(e instanceof Fault)return json({error:e.error,...e.details},e.status);console.error('workflow request failed',String(e));return json({error:'storage_unavailable'},503);}
}
