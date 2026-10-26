// Optional real-data acceptance. Fixtures stay outside the repository; source
// content is never evaluated and this runner writes only its in-memory database.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {sourceBoard} from '../Infrastructure/SourceCatalog/source-board.mjs';
import {rawDigest} from '../Core/Workflows/Domain/source-replica.mjs';
import {valueDigest} from '../Core/Workflows/Domain/collaboration-values.mjs';
import {sqliteCollaboration} from './Fixtures/collaboration-sqlite.mjs';
import {createCollaborationServices} from '../Presentation/WebApi/collaboration-services.mjs';
import {replicaBoardMarkup} from '../Presentation/Web/source-replica-view.mjs';

const path=process.env.WORKFLOW_BOARD_HISTORY_FIXTURE;
assert.ok(path,'Set WORKFLOW_BOARD_HISTORY_FIXTURE to the explicitly selected historical fixture');
const input=JSON.parse(await readFile(path,'utf8')),f=sqliteCollaboration();
const project_ref={store_id:'history-test',namespace:'personal',project_id:'history'},env={DB:f.db,COLLABORATION_STORE_ID:project_ref.store_id};
const access={owner_id:'local',actor:{subject_id:'test',kind:'agent',binding_id:'local'},capabilities:['read','plan']};
const service=createCollaborationServices(env),base={service_contract_version:'workflow-board/source-replica/1',schema_version:'1.0',project_ref};
await service.executeCommand(access,{service_contract_version:'workflow-board/collaboration/2',schema_version:'2.0',project_ref,command:'project.create',operation_id:'create',expected_revision:0,payload:{name:'Historical read validation'}});
let workflows=0,files=0,bytes=0,tasks=0,canonical=0,empty=0;const diagnostics=[];
try{
 for(const snapshot of input.snapshots){
  const ref={source_id:'fixed-history',workflow_id:'W'+workflows,source_revision:'fixed'},entries=snapshot.files.map(x=>({...x,bytes:Buffer.from(x.content_base64,'base64')}));
  const manifest={source:{kind:'archive-workflow',commit:input.source_commit},workflow:{id:ref.workflow_id,title:snapshot.id,status:'unknown'},files:await Promise.all(entries.map(async x=>({path:x.path,mode:x.mode,size:x.bytes.length,sha256:await rawDigest(x.bytes)})))};
  const manifest_hash=await valueDigest(manifest);let operation=0;
  const send=(command,payload)=>service.executeCommand(access,{...base,command,payload:{...ref,...payload},operation_id:`W${workflows}-${operation++}`,expected_revision:0});
  assert.equal((await send('replica.begin',{manifest,manifest_hash})).accepted,true);
  const chunks=[];for(const x of entries)for(let index=0;index<Math.ceil(x.bytes.length/49152);index++){const part=x.bytes.subarray(index*49152,(index+1)*49152);chunks.push({path:x.path,index,content_base64:part.toString('base64'),chunk_hash:await rawDigest(part)});}
  for(let offset=0;offset<chunks.length;offset+=4)assert.equal((await send('replica.chunk.put',{chunks:chunks.slice(offset,offset+4)})).accepted,true);
  assert.equal((await send('replica.activate',{manifest_hash})).accepted,true);
  const projected=[];let page;
  do{page=await service.executeQuery(access,{...base,query:'replica.board',payload:{...ref,offset:projected.length,limit:50}});projected.push(...page.tasks);}while(page.has_more);
  for(const expected of snapshot.expected_tasks){const actual=projected.find(x=>x.id===expected.id);assert.ok(actual,snapshot.id+': missing '+expected.id);assert.equal(actual.status,expected.status,snapshot.id+': status '+expected.id);canonical++;}
  if(page.issue_count)diagnostics.push({workflow:snapshot.id,count:page.issue_count,issues:page.issues});
  assert.equal((replicaBoardMarkup({...page,tasks:projected}).match(/class="c-task-card"/g)||[]).length,projected.length);
  if(!projected.length)empty++;workflows++;files+=entries.length;bytes+=entries.reduce((n,x)=>n+x.bytes.length,0);tasks+=projected.length;
 }
 const live=process.env.WORKFLOW_BOARD_LIVE_FIXTURE;
 if(live){
  const manifest=JSON.parse(await readFile(resolve(live,'manifest.json'),'utf8')),header=JSON.parse(await readFile(resolve(live,'header.json'),'utf8'));
  assert.equal(await valueDigest(manifest),header.manifest_hash);
  const docs=[];for(let i=0;i<manifest.files.length;i++){const file=manifest.files[i],data=await readFile(resolve(live,'file-'+i+'.bin'));assert.equal(data.length,file.size);assert.equal(await rawDigest(data),file.sha256);docs.push({file,bytes:data});}
  const board=await sourceBoard.project(manifest,(async function*(){yield* docs;})());
  assert.deepEqual(board.tasks.map(t=>[t.id,t.status]),[['ID001-001','completed'],['PKG009-001','completed'],['VERIFY-001','completed']]);assert.equal(board.projection_complete,true);
  console.log(JSON.stringify({live_snapshot:header.source_revision,verified_files:docs.length,verified_tasks:board.tasks.map(t=>({id:t.id,status:t.status,title:t.title,has_result:!!t.result_summary}))}));
 }
 console.log(JSON.stringify({source_commit:input.source_commit,workflows,files,bytes,canonical_tasks_verified:canonical,projected_tasks:tasks,workflows_without_structured_tasks:empty,diagnostics}));
}finally{f.sqlite.close();}
