import {parseDocument} from 'yaml';

// This adapter interprets supported source formats, never executes source text.
// The immutable replica remains the evidence; the projection is rebuildable.
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const scalar=x=>typeof x==='string'||typeof x==='number'?String(x):null;
const text=x=>typeof x==='string'?x:x==null?'':JSON.stringify(x);
const taskFile=path=>/^tasks\//.test(path);
const supported=path=>/\.(json|ya?ml|md)$/i.test(path);
export const sourceBoardLimits=Object.freeze({document_bytes:1048576,tasks:5000,field_chars:4000,issues:50,issue_bytes:32768});

function parse(path,bytes){
 const source=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 if(/\.json$/i.test(path))return JSON.parse(source);
 let yaml=source;
 if(/\.md$/i.test(path)){
  const match=/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if(!match)return null;
  yaml=match[1];
 }
 const doc=parseDocument(yaml,{schema:'core',uniqueKeys:true});
 if(doc.errors.length)throw Error('invalid_source_document');
 return doc.toJS({maxAliasCount:100});
}

export const sourceBoard={
 limits:sourceBoardLimits,
 files:manifest=>manifest.files.filter(file=>supported(file.path)&&file.mode.startsWith('100')&&file.size<=sourceBoardLimits.document_bytes),
 async project(manifest,documents){
  const tasks=new Map(),references=[],issues=[];let issueCount=0,issueBytes=0,issuesTruncated=false;
  const issue=(path,code)=>{
   issueCount++;const item={path,code},size=new TextEncoder().encode(JSON.stringify(item)).length+1;
   if(issues.length>=sourceBoardLimits.issues||issueBytes+size>sourceBoardLimits.issue_bytes)issuesTruncated=true;
   if(!issuesTruncated){issues.push(item);issueBytes+=size;}
  };
  const add=(value,path,selector,priority,key=null)=>{
   if(!object(value))return false;
   const t={...(object(value.metadata)?value.metadata:{}),...value};
   const declared=scalar(t.task_id??t.id??key);
   if(!declared&&!(taskFile(path??'')&&Object.hasOwn(t,'status')))return false;
   const id=declared||path.split('/').at(-1).replace(/\.[^.]+$/,'');
   if(!id||id.length>1000){issue(path,'invalid_task_id');return false;}
   const previous=tasks.get(id);
   if(previous){
    if(previous.priority>priority)return true;
    if(previous.priority===priority){issue(path,'duplicate_task_id');return true;}
   }
   if(!previous&&tasks.size>=sourceBoardLimits.tasks){issue(path,'task_limit');return true;}
   let truncated=false;
   const field=x=>{const s=text(x);if(s.length>sourceBoardLimits.field_chars){truncated=true;return s.slice(0,sourceBoardLimits.field_chars)+'…';}return s;};
   const rawStatus=t.status??(object(t.state)?t.state.status:null),status=scalar(rawStatus);
   if(rawStatus!=null&&status===null)issue(path,'invalid_task_status');
   const deps=t.dependencies??t.depends_on??[];
   const dependencies=Array.isArray(deps)?deps.map(scalar).filter(x=>x!==null):[];
   if(dependencies.length>50||dependencies.some(x=>x.length>200))truncated=true;
   const card={id,title:field(t.title||t.name||t.description||t.scope?.target||id),status:status===null?null:field(status),
    owner_skill:field(t.owner_skill??t.owner??t.executor??t.assignment?.actor?.subject_id)||null,
    description:field(t.description??t.scope?.target??t.goal),result_summary:field(t.result_summary??t.results?.summary??t.result?.summary??t.result),
    dependencies:dependencies.slice(0,50).map(x=>x.slice(0,200)),deferred_reason:field(t.deferred_reason??t.defer_reason),
    source_path:path,source_selector:field(selector),identity_basis:declared?'declared':'legacy filename',details_truncated:false};
   card.details_truncated=truncated;tasks.set(id,{priority,card});return true;
  };
  const collection=(value,path,selector,priority)=>{
   let found=false;
   const item=(value,location,key)=>{
    if(scalar(value)!==null){references.push({path,id:scalar(value)});found=true;return;}
    const accepted=add(value,path,location,priority,key);if(!accepted)issue(path,'unrecognized_task_document');found=accepted||found;
   };
   if(Array.isArray(value)){for(let i=0;i<value.length;i++)item(value[i],`${selector}[${i}]`);}
   else if(object(value)){
    for(const [id,entry] of Object.entries(value))item(entry,`${selector}[${JSON.stringify(id)}]`,id);
   }
   else if(value!=null)issue(path,'unrecognized_task_document');
   return found;
  };
  const inspect=(value,path)=>{
   if(!object(value)&&!Array.isArray(value))return false;
   const canonical=taskFile(path??'');
   if(canonical&&add(value,path,'$',3))return true;
   let found=Array.isArray(value)&&canonical?collection(value,path,'$',2):false;
   if(object(value)){
    // Only declared collections, never inferred tasks from arbitrary prose.
    found=collection(value.tasks,path,'$.tasks',1)||found;
    if(object(value.workflow)){
     const key=value.workflow.tasks!=null?'tasks':'steps';
     found=collection(value.workflow[key],path,'$.workflow.'+key,1)||found;
    }
    if(path===null||/^(workflow|record|snapshot)\.(json|ya?ml)$/i.test(path))found=collection(value.steps,path,'$.steps',1)||found;
    if(value.task_id||value.metadata?.task_id)found=add(value,path,'$',canonical?3:2)||found;
   }
   return found;
  };
  inspect(manifest,null);
  for(const file of manifest.files){
   if(supported(file.path)&&!file.mode.startsWith('100'))issue(file.path,'non_regular_document');
   else if(supported(file.path)&&file.size>sourceBoardLimits.document_bytes)issue(file.path,'document_too_large');
   else if(taskFile(file.path)&&!supported(file.path))issue(file.path,'unsupported_task_format');
  }
  for await(const {file,bytes} of documents){
   try{const parsed=parse(file.path,bytes);if(!inspect(parsed,file.path)&&taskFile(file.path))issue(file.path,'unrecognized_task_document');}
   catch{issue(file.path,'invalid_source_document');}
  }
  const taskPaths=new Set([...tasks.values()].map(x=>x.card.source_path));
  for(const ref of references)if(!tasks.has(ref.id)&&!taskPaths.has(ref.id))issue(ref.path,'unresolved_task_reference');
  return {projection_version:'source-board/1',projection_complete:issueCount===0,issue_count:issueCount,issues,
   tasks:[...tasks.values()].map(x=>x.card).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)};
 }
};
