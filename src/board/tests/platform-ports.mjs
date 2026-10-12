import assert from 'node:assert/strict';
import {createApplication} from '../application/services.mjs';
import {createHttpHandler} from '../adapters/inbound/http/handler.mjs';
import {httpFailure,httpContractFailure} from '../adapters/inbound/http/errors.mjs';
import {mcpFailure} from '../adapters/inbound/mcp/errors.mjs';
import {Fault} from '../domain/errors.mjs';
import {PROFILE} from '../domain/board-workflow.mjs';

let passed=0;
async function test(name,run){await run();passed++;console.log('PASS '+name);}
const at='2026-10-12T00:00:00.000Z';
let state=null,writes=0,clockReads=0,loseResponse=false;
const receipts=new Map();
const repository={
 board:{
  load:async()=>structuredClone(state),revision:async()=>state?.revision,
  async commit(change){
   if(change.before!==(state?.revision??0))throw new Fault('revision_conflict','conflict');
   // Test adapter only. Production D1 atomicity is exercised in other suites.
   state=structuredClone(change.w);writes++;
   receipts.set(change.opKey,{digest:change.digest,receipt:structuredClone(change.receipt)});
   if(loseResponse)throw Error('response lost after accepting');
  }
 },
 operations:{find:async key=>receipts.get(key)??null,byOwner:async(owner,id)=>receipts.get(owner+':'+id)?.receipt??null},
 source:{active:async()=> 'dataset-A',manifests:async()=>({records:[{workflow_id:'source',hash:'r'}],documents:[]}),record:async()=>({dataset:'dataset-A',workflow:{id:'source',source_status:'unrecorded'}}),document:async()=>({id:'doc',revisions:[{revision:1,content:'原文'}]})},
 legacy:{load:async()=>null},
 listRecords:async()=>({board:state?[structuredClone(state)]:[],legacy:[],taskCounts:[{workflow_id:'wf',status:'pending',count:2}],documentCounts:[]})
};
const projection={dataset:'dataset-A',list:()=>[],find:()=>null};
const app=createApplication(repository,{clock:{now:()=>{clockReads++;return at;}},sourceProjection:projection});
const c={service_contract_version:PROFILE,workflow_id:'wf',operation_id:'create',expected_revision:0,type:'create_workflow',payload:{title:'測試',goal:'可替換依賴',workflow_kind:'review',owner_skill:'owner',authorized_scope:'synthetic',next_step:'新增任務',next_owner:'owner'}};

await test('Given plain persistence and a fixed clock, When creating, Then no platform objects enter the use case',async()=>{
 const r=await app.boardCommand('owner',c);assert.equal(r.revision,1);assert.equal(state.created_at,at);assert.equal(clockReads,1);assert.equal(writes,1);
 const replay=await app.boardCommand('owner',c);assert.deepEqual(replay,r);assert.equal(clockReads,1);assert.equal(writes,1);
});
await test('Given an accepted commit with lost response, When replaying, Then the original receipt survives',async()=>{
 loseResponse=true;
 const next={...c,operation_id:'lost',type:'log',expected_revision:1,payload:{text:'one'}};
 const r=await app.boardCommand('owner',next);assert.equal(r.revision,2);assert.equal(writes,2);
 assert.deepEqual(await app.boardCommand('owner',next),r);assert.equal(writes,2);
 loseResponse=false;
});
await test('Given decoded records and a projection port, When querying, Then summaries do not require driver envelopes',async()=>{
 const result=await app.listWorkflows('owner',{q:'測試',offset:0,limit:5});assert.equal(result.items.length,1);assert.equal(result.items[0].task_count,2);
 const status=await app.sourceStatus();assert.equal(status.workflow_count,1);assert.equal(status.projection_available,true);
 const source=await app.workflowDetail('owner','source','source_snapshot');assert.equal(source.workflow.status,null);assert.ok(source.workflow.projection_notes.length);
 const document=await app.workflowDocument('owner','source','doc',1,'source_snapshot');assert.equal(document.revision.content,'原文');
 assert.equal((await app.operationReceipt('owner','lost')).revision,2);
 await assert.rejects(app.listWorkflows('owner',{limit:51}),e=>e.error==='invalid_pagination');
});
await test('Given a different trusted identity adapter, When HTTP queries, Then client owner headers cannot override it',async()=>{
 let seen;
 const handle=createHttpHandler(()=>({listWorkflows:async(owner,query)=>{seen={owner,query};return {items:[]};}}),()=>'',async()=> 'trusted-subject');
 const response=await handle(new Request('https://test/api/workflows?limit=999&offset=-2&q=hello',{headers:{'oai-authenticated-user-id':'forged'}}),{});
 assert.equal(response.status,200);assert.equal(seen.owner,'trusted-subject');assert.equal(seen.query.limit,50);assert.equal(seen.query.offset,0);assert.equal(seen.query.q,'hello');assert.ok(!(seen.query instanceof URLSearchParams));
});
await test('Given an unknown profile, When submitting, Then it cannot fall into the legacy command path',async()=>{
 const handle=createHttpHandler(()=>({legacyCommand:()=>assert.fail('Unknown profile reached legacy')}),()=>'',async()=> 'owner');
 for(const service_contract_version of ['workflow-board/collaboration/1','future/99']){
  const response=await handle(new Request('https://test/api/commands',{method:'POST',body:JSON.stringify({...c,service_contract_version})}),{});
  assert.equal(response.status,501);assert.equal((await response.json()).error,'unsupported_profile');
 }
 for(const value of ['null','[]','1']){
  const response=await handle(new Request('https://test/api/commands',{method:'POST',body:value}),{});
  assert.equal(response.status,422);assert.equal((await response.json()).error,'invalid_command');
 }
});
await test('Given one domain failure, When mapping HTTP or MCP, Then code and details are preserved without HTTP in the domain',async()=>{
 for(const [category,status] of Object.entries({invalid:422,not_found:404,conflict:409,forbidden:403,unauthenticated:401,limit_exceeded:413,unsupported:501,unavailable:503})){
  const fault=new Fault('example',category,{current_revision:4});assert.equal(fault.status,undefined);
  assert.equal(httpFailure(fault).status,status);assert.equal(mcpFailure(fault).isError,true);assert.equal(mcpFailure(fault).structuredContent.error,httpFailure(fault).body.error);
  assert.deepEqual(mcpFailure(fault).structuredContent.details,{current_revision:4});
  assert.deepEqual(httpContractFailure(fault).body,mcpFailure(fault).structuredContent);assert.equal(httpContractFailure(fault).status,status);
 }
 const unknown=Error('private SQL and credentials');assert.deepEqual(httpFailure(unknown).body,{error:'storage_unavailable'});assert.ok(!JSON.stringify(mcpFailure(unknown)).includes('private SQL'));
 assert.deepEqual(httpContractFailure(unknown).body,mcpFailure(unknown).structuredContent);
});
console.log(JSON.stringify({scenarios:passed,passed:true,scope:'Application ports and adapter mappings with synthetic state; no new collaboration runtime or hosted proof'}));
