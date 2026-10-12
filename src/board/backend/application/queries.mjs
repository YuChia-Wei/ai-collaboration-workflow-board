import {Fault,demand} from '../domain/errors.mjs';
import {hash} from '../domain/values.mjs';
import {summarize} from '../domain/summary.mjs';

export async function sourceStatus(repository,projection){
 const active=await repository.source.active(),{records,documents}=await repository.source.manifests(active);
 return {dataset:active,workflow_count:records.length,document_count:documents.length,row_hash_manifest_sha256:await hash({records,documents}),projection_available:active===projection.dataset};
}
export async function listWorkflows(repository,owner,query={},projection){
 const active=await repository.source.active(),{board,legacy,taskCounts,documentCounts}=await repository.listRecords(owner);
   const sources=projection.list(active);
   const nativeRecords=board.map(w=>{const tasks=taskCounts.filter(x=>x.workflow_id===w.id);return {...w,record_mode:'board',task_count:tasks.reduce((n,x)=>n+x.count,0),task_counts:Object.fromEntries(tasks.map(x=>[x.status,x.count])),document_count:documentCounts.find(x=>x.workflow_id===w.id)?.count||0};});
   const all=[...nativeRecords,...sources,...legacy.map(w=>({...w,record_mode:'legacy'}))].map(summarize);
   const facets={kinds:[...new Set(all.map(w=>w.workflow_kind).filter(Boolean))].sort(),owners:[...new Set(all.map(w=>w.owner_skill).filter(Boolean))].sort(),statuses:[...new Set(all.map(w=>w.status||'unrecorded'))].sort()};
   const {status,kind,owner_skill:skill,mode}=query,q=(query.q||'').slice(0,200).toLowerCase();
   const filtered=all.filter(w=>(!status||(w.status||'unrecorded')===status)&&(!kind||w.workflow_kind===kind)&&(!skill||w.owner_skill===skill)&&(!mode||w.record_mode===mode)&&(!q||[w.id,w.title,w.goal,w.owner_skill,w.workflow_kind,...w.work_items.map(x=>x.url),...(w.referenced_work_items||[]).map(x=>x.url)].join(' ').toLowerCase().includes(q)));
   const offset=query.offset??0,limit=query.limit??30;
   demand(Number.isInteger(offset)&&offset>=0&&Number.isInteger(limit)&&limit>=1&&limit<=50,'invalid_pagination');
   return {items:filtered.slice(offset,offset+limit),total:filtered.length,all_total:all.length,offset,limit,has_more:offset+limit<filtered.length,facets,source_commit:active||null,source_projection_available:active===projection.dataset};
}

export async function workflowDocument(repository,owner,id,docId,rev,mode){
 demand(Number.isInteger(rev)&&rev>=0,'invalid_revision');
 if(mode==='board')return repository.board.document(owner,id,docId,rev);
 if(mode==='source_snapshot'){
  demand(rev===0||rev===1,'revision_not_found','not_found');
  const d=await repository.source.document(id,docId);demand(d,'document_not_found','not_found');
  return {document:{...d,revisions:undefined},revision:{...d.revisions.at(-1),snapshot:true,created_at:null,final:null}};
 }
 throw new Fault('document_not_found','not_found');
}
export async function workflowDetail(repository,owner,id,mode='auto',projection){
 let w=null;
 if(['board','auto'].includes(mode))w=await repository.board.load(owner,id);
 if(!w&&['source_snapshot','auto'].includes(mode)){
  const row=await repository.source.record(id);
  if(row)w=projection.find(row.dataset,id);
  if(row&&!w){w=structuredClone(row.workflow);w.projection_notes=['此來源版本尚未建立共通欄位投影，請查閱原始文件。'];w.status=w.source_status==='unrecorded'?null:w.source_status;w.documents={};}
 }
 if(!w&&['legacy','auto'].includes(mode)){const record=await repository.legacy.load(owner,id);if(record)w={...record,record_mode:'legacy'};}
 demand(w,'not_found','not_found');return {workflow:w,missing_required_documents:(w.required_documents||[]).filter(id=>!w.documents[id]||w.documents[id].deleted)};
}
export async function operationReceipt(repository,owner,id){
 const receipt=await repository.operations.byOwner(owner,id);demand(receipt,'operation_not_found','not_found');return receipt;
}
