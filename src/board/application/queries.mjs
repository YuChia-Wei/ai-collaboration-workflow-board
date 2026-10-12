import {Fault,demand} from '../domain/errors.mjs';
import {hash} from '../domain/values.mjs';
import {summarize} from '../domain/summary.mjs';
import catalog from '../data/source-catalog.json' with {type:'json'};

export async function sourceStatus(repository){
 const active=await repository.source.active(),[records,documents]=await repository.source.rows(active);
 return {dataset:active,workflow_count:records.results.length,document_count:documents.results.length,row_hash_manifest_sha256:await hash({records:records.results,documents:documents.results}),projection_available:active===catalog.source_commit};
}
export async function listWorkflows(repository,owner,searchParams){
 const active=await repository.source.active(),[native,legacy,counts,docCounts]=await repository.listRows(owner);
   const sources=active===catalog.source_commit?Object.values(catalog.workflows).sort((a,b)=>b.id.localeCompare(a.id)):[];
   const nativeRecords=native.results.map(r=>{const w=JSON.parse(r.body),tasks=counts.results.filter(x=>x.workflow_id===w.id);return {...w,record_mode:'board',task_count:tasks.reduce((n,x)=>n+x.count,0),task_counts:Object.fromEntries(tasks.map(x=>[x.status,x.count])),document_count:docCounts.results.find(x=>x.workflow_id===w.id)?.count||0};});
   const all=[...nativeRecords,...sources,...legacy.results.map(r=>({...JSON.parse(r.body),record_mode:'legacy'}))].map(summarize);
   const facets={kinds:[...new Set(all.map(w=>w.workflow_kind).filter(Boolean))].sort(),owners:[...new Set(all.map(w=>w.owner_skill).filter(Boolean))].sort(),statuses:[...new Set(all.map(w=>w.status||'unrecorded'))].sort()};
   const q=(searchParams.get('q')||'').slice(0,200).toLowerCase(),status=searchParams.get('status'),kind=searchParams.get('kind'),skill=searchParams.get('owner_skill'),mode=searchParams.get('mode');
   const filtered=all.filter(w=>(!status||(w.status||'unrecorded')===status)&&(!kind||w.workflow_kind===kind)&&(!skill||w.owner_skill===skill)&&(!mode||w.record_mode===mode)&&(!q||[w.id,w.title,w.goal,w.owner_skill,w.workflow_kind,...w.work_items.map(x=>x.url),...(w.referenced_work_items||[]).map(x=>x.url)].join(' ').toLowerCase().includes(q)));
   const offset=Math.max(0,Number.parseInt(searchParams.get('offset')||'0',10)||0),limit=Math.min(50,Math.max(1,Number.parseInt(searchParams.get('limit')||'30',10)||30));
   return {items:filtered.slice(offset,offset+limit),total:filtered.length,all_total:all.length,offset,limit,has_more:offset+limit<filtered.length,facets,source_commit:active||null,source_projection_available:active===catalog.source_commit};
}

export async function workflowDocument(repository,owner,id,docId,rev,mode){
 demand(Number.isInteger(rev)&&rev>=0,'invalid_revision');
 if(mode==='board')return repository.board.document(owner,id,docId,rev);
 if(mode==='source_snapshot'){
  demand(rev===0||rev===1,'revision_not_found',404);
  const row=await repository.source.document(id,docId);demand(row,'document_not_found',404);
  const d=JSON.parse(row.body);return {document:{...d,revisions:undefined},revision:{...d.revisions.at(-1),snapshot:true,created_at:null,final:null}};
 }
 throw new Fault(404,'document_not_found');
}
export async function workflowDetail(repository,owner,id,mode='auto'){
 let w=null;
 if(['board','auto'].includes(mode))w=await repository.board.load(owner,id);
 if(!w&&['source_snapshot','auto'].includes(mode)){
  const row=await repository.source.record(id);
  if(row&&row.dataset===catalog.source_commit&&catalog.workflows[id])w=structuredClone(catalog.workflows[id]);
  else if(row){w=JSON.parse(row.body);w.projection_notes=['此來源版本尚未建立共通欄位投影，請查閱原始文件。'];w.status=w.source_status==='unrecorded'?null:w.source_status;w.documents={};}
 }
 if(!w&&['legacy','auto'].includes(mode)){const record=await repository.legacy.load(owner,id);if(record)w={...record,record_mode:'legacy'};}
 demand(w,'not_found',404);return {workflow:w,missing_required_documents:(w.required_documents||[]).filter(id=>!w.documents[id]||w.documents[id].deleted)};
}
export async function operationReceipt(repository,owner,id){
 const row=await repository.operations.byOwner(owner,id);demand(row,'operation_not_found',404);return JSON.parse(row.receipt);
}
