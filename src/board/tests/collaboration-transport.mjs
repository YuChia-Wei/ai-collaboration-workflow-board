import assert from 'node:assert/strict';
import {sqliteCollaboration} from './fixtures/collaboration-sqlite.mjs';
import {contentDigest} from '../backend/domain/collaboration-values.mjs';

const artifact=process.argv.includes('--artifact');
const handle=artifact?(await import('../dist/server/index.js')).default.fetch:(await import('../backend/index.mjs')).handle;
const {db,sqlite}=sqliteCollaboration();
const binding={enabled:true,subject_id:'A',binding_id:'grant-A',capabilities:['read','plan','execute','manage']};
const env={DB:db,COLLABORATION_STORE_ID:'local',COLLABORATION_BINDINGS:JSON.stringify({owner:binding})};
const ref={store_id:'local',namespace:'personal',record_kind:'collaboration',workflow_id:'WF'};
const envelope={service_contract_version:'workflow-board/collaboration/1',schema_version:'1.0'};
const headers={'content-type':'application/json','oai-authenticated-user-id':'owner',accept:'application/json, text/event-stream'};
const meta={'io.modelcontextprotocol/protocolVersion':'2026-07-28','io.modelcontextprotocol/clientInfo':{name:'synthetic-client',version:'1'},'io.modelcontextprotocol/clientCapabilities':{}};
let passed=0,id=0,revision=0;
async function test(name,run){await run();passed++;console.log('PASS '+name);}
async function post(path,body,overrides={},configuration=env){
 const response=await handle(new Request('https://board.test'+path,{method:'POST',headers:{...headers,...overrides},body:typeof body==='string'?body:JSON.stringify(body)}),configuration);
 const text=await response.text();return {status:response.status,body:text?JSON.parse(text):null};
}
async function rpc(method,params={},overrides={}){return post('/mcp',{jsonrpc:'2.0',id:++id,method,params:{...params,_meta:meta}},{'mcp-protocol-version':'2026-07-28','mcp-method':method,...(params.name?{'mcp-name':params.name}:{}),...overrides});}
async function call(name,args){const result=await rpc('tools/call',{name,arguments:args});assert.equal(result.status,200,JSON.stringify(result));return result.body.result;}
async function command(name,payload){
 const input={...envelope,workflow_ref:ref,operation_id:'op-'+(++id),expected_revision:revision,command:name,payload};
 const r=await call(name.replaceAll('.','_'),input);assert.equal(r.isError,false,JSON.stringify(r));assert.equal(r.structuredContent.accepted,true);revision=r.structuredContent.revision;return {input,receipt:r.structuredContent};
}
async function query(name,payload){const r=await call(name.replaceAll('.','_'),{...envelope,query:name,payload});assert.equal(r.isError,false,JSON.stringify(r));return r.structuredContent;}

await test('D01: discovery, legacy initialize and permission-filtered tools through the production root',async()=>{
 const d=await rpc('server/discover');assert.equal(d.status,200);assert.equal(d.body.result.resultType,'complete');assert.deepEqual(d.body.result.capabilities,{tools:{}});
 const legacy=await post('/mcp',{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',clientInfo:{name:'test',version:'1'},capabilities:{}}});assert.equal(legacy.body.result.protocolVersion,'2025-11-25');
 const list=await rpc('tools/list');assert.equal(list.body.result.tools.length,26);assert.ok(!list.body.result.tools.some(t=>t.name==='decision_resolve'));
 const create=list.body.result.tools.find(t=>t.name==='workflow_create').inputSchema;
 const textPattern=create.properties.payload.properties.title.pattern;
 const urlPattern=create.$defs.external_ref.properties.url.anyOf.find(v=>v.type==='string').pattern;
 // Regression from the real Site connector: it full-matches schema patterns.
 for(const value of ['[合成驗收] Workflow 協作與交接','  multi word title  ','first line\n第二行']){
  assert.equal(new RegExp(textPattern).test(value),true);
  assert.equal(new RegExp('^(?:'+textPattern+')$').test(value),true);
 }
 for(const value of ['',' \n\t'])assert.equal(new RegExp(textPattern).test(value),false);
 assert.equal(new RegExp('^(?:'+urlPattern+')$').test('https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/7'),true);
 assert.equal(new RegExp(urlPattern).test('http://example.test'),false);
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM collaboration_heads').get().n,0);
});
await test('D07: missing authentication, revoked binding, Origin and human capability spoofing fail closed',async()=>{
 const message={jsonrpc:'2.0',id:1,method:'tools/list'};
 assert.equal((await post('/mcp',message,{'oai-authenticated-user-id':''})).status,401);
 assert.equal((await post('/mcp',message,{origin:'https://attacker.test'})).status,403);
 assert.equal((await post('/mcp',message,{}, {...env,COLLABORATION_BINDINGS:JSON.stringify({owner:{...binding,enabled:false}})})).status,403);
 assert.equal((await post('/mcp',message,{}, {...env,COLLABORATION_BINDINGS:undefined})).status,503);
 assert.equal((await post('/mcp',message,{}, {...env,COLLABORATION_BINDINGS:JSON.stringify({owner:{...binding,capabilities:['read','decide']}})})).status,503);
});
await test('FT-P01-06: protocol errors, duplicate keys, unsupported versions and forged actor do not mutate',async()=>{
 assert.equal((await post('/mcp','{"jsonrpc":"2.0","id":1,"id":2,"method":"tools/list"}')).body.error.code,-32700);
 assert.equal((await rpc('tools/list',{}, {'mcp-method':'different'})).body.error.code,-32020);
 assert.equal((await rpc('tools/list',{}, {'mcp-protocol-version':'1900-01-01'})).body.error.code,-32022);
 assert.equal((await rpc('unknown')).body.error.code,-32601);
 const bad=await call('capabilities',{...envelope,query:'capabilities',payload:{store_id:'local',namespace:'personal'},actor:{kind:'human'}});assert.equal(bad.isError,true);assert.equal(bad.structuredContent.error,'invalid_command');
 const wrong=await call('capabilities',{...envelope,schema_version:'1.1',query:'capabilities',payload:{store_id:'local',namespace:'personal'}});assert.equal(wrong.structuredContent.error,'unsupported_schema');
 const notification=await post('/mcp',{jsonrpc:'2.0',method:'tools/call',params:{name:'workflow_create',arguments:{}}},{'mcp-protocol-version':'2025-11-25'});assert.equal(notification.status,400);
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM collaboration_operations').get().n,0);
});
await test('MVP journey: create, plan, start, resume, claim, progress, handoff, release and finish',async()=>{
 const scope={included:'synthetic local execution',excluded:'deployment'};
 await command('workflow.create',{title:'MVP',goal:'Test complete journey',scope,skill:{id:'test',version:null},external_work_refs:[]});
 const content='# Plan\n',plan={document_id:'plan',revision:1,content_hash:await contentDigest(content)};
 const definition={id:'T1',title:'Task',description:'Deliver',scope,completion_criteria:['result'],dependencies:[],plan_basis:plan,inputs:[],expected_artifacts:[],decision_ids:[],workstream:null};
 await command('plan.revise',{plan:{document_id:'plan',expected_document_revision:0,content},execution_impact:'declared',task_changes:[{kind:'add',definition}],unaffected_task_ids:[],decision_dispositions:[],completion_requirements:[{id:'R1',description:'Deliver',task_ids:['T1'],document_refs:[]}],requirement_dispositions:[]});
 await command('workflow.start',{});
 const context=await query('workflow.context',{workflow_ref:ref,limit:20});assert.equal(context.tasks.items[0].assignment,null);assert.equal(context.tasks.items[0].claimable,true);
 assert.equal((await query('document.read',{workflow_ref:ref,document_ref:plan})).content,content);
 await command('task.claim',{task_id:'T1',expected_definition_revision:1,session:null});
 const assignment=(await query('workflow.context',{workflow_ref:ref,limit:20})).tasks.items[0].assignment.ref;
 const progress=await command('task.progress',{task_id:'T1',assignment,summary:'Saved progress',evidence:[]});
 const replay=await call('task_progress',progress.input);assert.deepEqual(replay.structuredContent,progress.receipt);
 assert.deepEqual((await query('operation.get',{workflow_ref:ref,operation_id:progress.input.operation_id})).receipt,progress.receipt);
 const handoff={completed:'Saved',remaining:'Finish',next_step:'Read context',artifact_refs:[],blockers:[],limitations:[],next_actor_hint:null};
 await command('handoff.record',{task_id:'T1',handoff});
 await command('task.release',{task_id:'T1',assignment,handoff});
 await command('task.claim',{task_id:'T1',expected_definition_revision:1,session:null});
 const next=(await query('workflow.context',{workflow_ref:ref,limit:20})).tasks.items[0].assignment.ref;assert.equal(next.generation,2);
 await command('task.complete',{task_id:'T1',assignment:next,result:{summary:'Done',criterion_results:[{criterion_index:0,outcome:'satisfied',explanation:'Delivered',evidence_ids:[]}],artifacts:[],evidence:[],limitations:[]}});
 await command('workflow.complete',{summary:'Complete',document_refs:[plan]});
 const final=await query('workflow.context',{workflow_ref:ref,limit:20});assert.equal(final.workflow.status,'completed');assert.equal(final.tasks.items[0].status,'completed');assert.equal(final.handoffs.items.length,2);
});
await test('HTTP and MCP share the exact application outcome; durable rejection stays a receipt',async()=>{
 const q={...envelope,query:'workflow.context',payload:{workflow_ref:ref,limit:20}};
 const http=await post('/api/collaboration/v1/queries',q);assert.equal(http.status,200);assert.deepEqual(http.body,await query(q.query,q.payload));
 const c={...envelope,workflow_ref:ref,operation_id:'terminal-rejection',expected_revision:revision,command:'task.claim',payload:{task_id:'T1',expected_definition_revision:1,session:null}};
 const response=await post('/api/collaboration/v1/commands',c);assert.equal(response.status,409);assert.equal(response.body.accepted,false);
 const mcp=await call('task_claim',c);assert.equal(mcp.isError,true);assert.deepEqual(mcp.structuredContent,response.body);
});
console.log(JSON.stringify({scenarios:passed,passed:true,subject:artifact?'bundled Worker (runtime codegen disabled)':'production source composition root',scope:'local synthetic requests; no real client or hosted D1 evidence'}));
