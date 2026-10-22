// Derive a read-only catalog from the already imported, hash-verified Git tree.
// This does not write/import data or reinterpret historical lifecycle validity.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from 'yaml';
const folder=resolve(process.argv[2]||'framework-import');
const manifest=JSON.parse(await readFile(resolve(folder,'manifest.json'),'utf8'));
const parseRaw=d=>{const text=d.revisions?.at(-1)?.content;if(typeof text!=='string')return null;try{if(/\.json$/i.test(d.name))return JSON.parse(text);if(/\.ya?ml$/i.test(d.name))return parse(text,{schema:'core',maxAliasCount:100});if(/\.md$/i.test(d.name)&&text.startsWith('---\n'))return parse(text.split(/\n---\s*\n/)[0].slice(4),{schema:'core'});}catch{}return null;};
const summary=x=>typeof x==='string'?x:JSON.stringify(x??'');
const status=t=>t.status??t.metadata?.status??null;
const nextActions=(value,path='$',out=[])=>{if(!value||typeof value!=='object')return out;for(const [k,v] of Object.entries(value)){const p=path+'.'+k;if(['next_action','next_step'].includes(k)&&typeof v==='string'&&v.trim())out.push({text:v,path:p});else if(v&&typeof v==='object')nextActions(v,p,out);}return out;};
const workflows={};let taskCount=0,unparsed=0;
for(const entry of manifest.records){
 const raw=await readFile(resolve(folder,entry.file),'utf8');if(createHash('sha256').update(raw).digest('hex')!==entry.sha256)throw Error('Source hash mismatch: '+entry.id);
 const w=JSON.parse(raw),docs=Object.values(w.documents),parsed=new Map(docs.map(d=>[d.id,parseRaw(d)]));
 const locator=docs.find(d=>d.source_path===w.source.locator),metadata=locator?parsed.get(locator.id)||{}:{};
 const tasks=Object.create(null),unparsedDocs=[],candidates=[];
 const add=(item,d,basis)=>{if(!item||typeof item!=='object'||Array.isArray(item))return false;const t={...item.metadata,...item};const explicit=t.task_id||t.id;
  if(!explicit&&!('status' in t))return false;
  const id=String(explicit||d.name.split('/').at(-1).replace(/\.[^.]+$/,''));
  const candidate={id,task_id:id,workflow_id:entry.id,title:t.title||t.name||t.description||id,owner_skill:t.owner_skill||t.owner||null,status:status(t),source_status:status(t),created_at:t.created_at||null,updated_at:t.updated_at||null,template_source:t.template_source||null,template_version:t.template_version||null,model:t.model||null,reasoning_effort:t.reasoning_effort||null,result_summary:t.result_summary||t.results?.summary||t.result?.summary||t.result||null,finding_status:t.finding_status||t.results?.finding_status||null,finding_ids:t.finding_ids||[],dependencies:t.dependencies||t.depends_on||[],deferred_reason:t.deferred_reason||t.defer_reason||null,resume_condition:t.resume_condition||t.reentry_condition||t.resume_when||null,evidence_ids:t.evidence_ids||[],source_path:d.source_path,source_document_id:d.id,identity_basis:explicit?'declared':'legacy filename',projection_basis:basis,execution_identity_basis:t.execution_identity_basis||t.execution_provenance||null};
  if(!tasks[id]||basis==='canonical task file'&&tasks[id].projection_basis!=='canonical task file')tasks[id]=candidate;
  for(const next of nextActions(t))candidates.push({...next,document_id:d.id,source_path:d.source_path,priority:t.status==='in_progress'?1:3});return true;};
 for(const d of docs.filter(d=>/^tasks\//.test(d.name))){const p=parsed.get(d.id);let added=add(p,d,'canonical task file');if(!added&&p){const list=Array.isArray(p)?p:Array.isArray(p.tasks)?p.tasks:p.tasks&&typeof p.tasks==='object'?Object.entries(p.tasks).map(([id,t])=>({task_id:id,...t})):[];for(const t of list)added=add(t,d,'task collection')||added;}if(!added)unparsedDocs.push({id:d.id,name:d.name});}
 // Explicit inline task collections only. Unknown prose stays an accessible file.
 for(const d of docs.filter(d=>!/^tasks\//.test(d.name))){const p=parsed.get(d.id);if(p&&typeof p==='object'){
  const list=p.tasks;if(Array.isArray(list))for(const t of list)add(t,d,'declared inline tasks');else if(list&&typeof list==='object')for(const [id,t] of Object.entries(list))if(t&&typeof t==='object')add({task_id:id,...t},d,'declared inline tasks');
  if(p.task_id&&!tasks[p.task_id])add(p,d,'declared task outside tasks folder');
  for(const next of nextActions(p))candidates.push({...next,document_id:d.id,source_path:d.source_path,priority:/handoff/i.test(d.name)?0:2});
 }}
 const workItems=[...(Array.isArray(metadata.work_items)?metadata.work_items:[])];for(const k of ['issue_url','pr_url','pull_request_url'])if(typeof metadata[k]==='string')workItems.push({url:metadata[k],provider:'github'});
 const links=docs.flatMap(d=>[...String(d.revisions?.at(-1)?.content||'').matchAll(/https:\/\/github\.com\/[^\s)\]"'<>]+\/(?:issues|pull)\/\d+/g)].map(m=>m[0]));
 const uniqueLinks=[...new Map(workItems.filter(x=>x?.url).map(x=>[x.url,x])).values()];
 const references=[...new Set(links)].filter(url=>!uniqueLinks.some(x=>x.url===url)).map(url=>({provider:'github',url}));
 const next=candidates.sort((a,b)=>a.priority-b.priority)[0]||null;
 const docIndex=docs.map(d=>({id:d.id,name:d.name,kind:d.kind,source_path:d.source_path,source_url:d.source_url,source_hash:d.revisions?.at(-1)?.hash||null,binary_reference:d.source_encoding==='binary',category:/^tasks\//.test(d.name)?'tasks':/handoff/i.test(d.name)?'handoff':/(validation|evidence|test|review|assessment|report|result|log)/i.test(d.name)?'evidence':/(workflow-plan|plan\.md|workflow\.yaml)/i.test(d.name)?'planning':'other',revisions:[{revision:1,snapshot:true,created_at:null,hash:d.revisions?.at(-1)?.hash||null}]}));
 const common=Object.fromEntries(['schema_version','lifecycle_contract','created_at','updated_at','template_source','template_version','entrypoint','branch','base_branch','base_commit','completion_scope','verification_state'].filter(k=>k in metadata).map(k=>[k,metadata[k]]));
 const result={...common,id:entry.id,workflow_id:entry.id,title:metadata.title||w.title,goal:w.goal,workflow_kind:metadata.workflow_kind||null,owner_skill:metadata.owner_skill||null,status:metadata.status??null,current_phase:metadata.current_phase??null,source:{...w.source,metadata:undefined},record_mode:'source_snapshot',namespace:'framework',revision:1,work_items:uniqueLinks,steps:tasks,documents:Object.fromEntries(docIndex.map(d=>[d.id,d])),document_count:docs.length,task_count:Object.keys(tasks).length,unparsed_task_documents:unparsedDocs,next_action:next,required_documents:[],evidence:{},logs:[],handoffs:[],projection_notes:['共通欄位由原始檔案解析；領域延伸欄位仍以原始文件為準。',...(!locator?['沒有 workflow locator；狀態與契約不補造。']:[])]};
 result.referenced_work_items=references;workflows[entry.id]=result;taskCount+=result.task_count;unparsed+=unparsedDocs.length;
}
await mkdir('src/Infrastructure/SourceCatalog',{recursive:true});await writeFile('src/Infrastructure/SourceCatalog/source-catalog.json',JSON.stringify({source_commit:manifest.source_commit,workflow_count:manifest.workflow_count,document_count:manifest.document_count,task_count:taskCount,unparsed_task_documents:unparsed,workflows}));
console.log(JSON.stringify({workflows:manifest.workflow_count,documents:manifest.document_count,recognizedTasks:taskCount,unparsedTaskDocuments:unparsed}));
