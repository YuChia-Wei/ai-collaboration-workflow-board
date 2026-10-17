import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../contracts/collaboration-v1/schema.json' with {type:'json'};
import {sqliteCollaboration} from './fixtures/collaboration-sqlite.mjs';
import {createCollaborationServices} from '../backend/collaboration.mjs';
import {createCollaborationRepository} from '../backend/adapters/outbound/d1/collaboration-repository.mjs';
import {contentDigest} from '../backend/domain/collaboration-values.mjs';
import {COLLABORATION_PROFILE} from '../backend/domain/collaboration-workflow.mjs';

const ajv=new Ajv2020({strict:true});ajv.addFormat('date-time',v=>new Date(v).toISOString()===v);ajv.addSchema(schema);
const access={owner_id:'owner',actor:{subject_id:'A',kind:'agent',binding_id:'grant-A'},capabilities:['read','plan','execute','manage']};
const ref={store_id:'local',namespace:'personal',record_kind:'collaboration',workflow_id:'WF'};
const scope={included:'synthetic MVP',excluded:'deployment'};
const envelope={service_contract_version:COLLABORATION_PROFILE,schema_version:'1.0'};
let passed=0;
async function test(name,run){await run();passed++;console.log('PASS '+name);}
function valid(kind,value){const validator=ajv.getSchema(schema.$id+'#/$defs/'+kind);assert.ok(validator(value),JSON.stringify(validator.errors));return value;}
function fixture(){
 const f=sqliteCollaboration(),env={DB:f.db,COLLABORATION_STORE_ID:'local'},repository=createCollaborationRepository(f.db);let n=0;
 const services=()=>createCollaborationServices(env);
 const state=()=>repository.snapshot(access.owner_id,ref);
 const send=async(name,payload,overrides={},actor=access)=>{const current=await state();const c={...envelope,workflow_ref:ref,operation_id:'op-'+(++n),expected_revision:current?.revision??0,command:name,payload,...overrides};const r=valid('receipt',await services().executeCommand(actor,c));return {c,r};};
 const ok=async(...args)=>{const value=await send(...args);assert.equal(value.r.accepted,true,JSON.stringify(value.r));return value;};
 const query=async(name,payload,actor=access)=>services().executeQuery(actor,{...envelope,query:name,payload});
 const domain=()=>JSON.stringify(['collaboration_heads','collaboration_snapshots','collaboration_chunks','collaboration_facts'].map(t=>f.sqlite.prepare('SELECT * FROM '+t).all()));
 async function setup(count=1){
  await ok('workflow.create',{title:'Synthetic',goal:'Resume and execute',scope,skill:{id:'test',version:null},external_work_refs:[]});
  const content='# Plan\n',plan={document_id:'plan',revision:1,content_hash:await contentDigest(content)};
  const definitions=Array.from({length:count},(_,i)=>({id:'T'+(i+1),title:'Task '+(i+1),description:'Do the task',scope,completion_criteria:['result'],dependencies:[],plan_basis:plan,inputs:[],expected_artifacts:[],decision_ids:[],workstream:null}));
  await ok('plan.revise',{plan:{document_id:'plan',expected_document_revision:0,content},execution_impact:'declared',task_changes:definitions.map(definition=>({kind:'add',definition})),unaffected_task_ids:[],decision_dispositions:[],completion_requirements:[{id:'R1',description:'Deliver tasks',task_ids:definitions.map(t=>t.id),document_refs:[]}],requirement_dispositions:[]});
  await ok('workflow.start',{});return plan;
 }
 return {...f,env,repository,services,state,send,ok,query,domain,setup};
}
await test('D01 / FT-Q01: capabilities report the executable, permission-filtered surface',async()=>{
 const f=fixture();const c=valid('capabilities',await f.query('capabilities',{store_id:'local',namespace:'personal'}));
 assert.ok(c.commands.includes('task.claim'));assert.ok(!c.commands.includes('decision.resolve'));assert.equal(c.queries.length,8);
});
await test('D02-D03 / B05 FT-Q03-06: immutable context pages and point reads survive later writes',async()=>{
 const f=fixture();await f.setup(25);const before=f.domain();
 const context=valid('context',await f.query('workflow.context',{workflow_ref:ref,limit:20}));
 assert.equal(context.revision,3);assert.equal(context.tasks.items.length,20);assert.equal(context.tasks.total,25);assert.equal(context.tasks.has_more,true);assert.equal(f.domain(),before);
 const claimed=await f.ok('task.claim',{task_id:'T1',expected_definition_revision:1,session:null});assert.equal(claimed.r.revision,4);
 const page=valid('context_page',await f.query('context.page',{workflow_ref:ref,section:'tasks',cursor:context.tasks.cursor}));
 assert.equal(page.revision,3);assert.equal(page.page.items.length,5);assert.equal(page.page.cursor,null);
 const task=valid('task_record',await f.query('task.read',{workflow_ref:ref,task_id:'T1',definition_revision:1,at_revision:3}));assert.equal(task.summary.assignment,null);
 const changed=valid('task_record',await f.query('task.read',{workflow_ref:ref,task_id:'T1',definition_revision:1,at_revision:4}));assert.equal(changed.summary.status,'in_progress');
 await assert.rejects(f.query('context.page',{workflow_ref:ref,section:'decisions',cursor:context.tasks.cursor}),e=>e.error==='invalid_cursor');
 await assert.rejects(f.query('context.page',{workflow_ref:ref,section:'tasks',cursor:context.tasks.cursor},{...access,owner_id:'other'}),e=>e.error==='snapshot_expired');
 await assert.rejects(f.query('task.read',{workflow_ref:ref,task_id:'T1',definition_revision:1,at_revision:99}),e=>e.error==='snapshot_expired');
});
await test('D04 / B14 FT-Q07: exact document bytes and hash, no latest fallback',async()=>{
 const f=fixture();const plan=await f.setup();const doc=valid('document',await f.query('document.read',{workflow_ref:ref,document_ref:plan}));assert.equal(doc.content,'# Plan\n');
 await assert.rejects(f.query('document.read',{workflow_ref:ref,document_ref:{...plan,revision:2}}),e=>e.error==='revision_not_found');
 await assert.rejects(f.query('document.read',{workflow_ref:ref,document_ref:{...plan,content_hash:'sha256:'+'0'.repeat(64)}}),e=>e.error==='document_hash_mismatch');
});
await test('D05-D06 / FT-C09-10 FT-Q08: claim, progress, lost response and exact durable replay',async()=>{
 const f=fixture();await f.setup();f.faults.loseResponse=true;
 const claim=await f.ok('task.claim',{task_id:'T1',expected_definition_revision:1,session:null});
 const assignment=(await f.state()).tasks.T1.assignment.ref;
 const progress=await f.ok('task.progress',{task_id:'T1',assignment,summary:'保存進度',evidence:[]});const before=f.domain();
 assert.deepEqual(await f.services().executeCommand(access,progress.c),progress.r);assert.equal(f.domain(),before);
 const recovered=valid('operation_result',await f.query('operation.get',{workflow_ref:ref,operation_id:claim.c.operation_id}));assert.deepEqual(recovered.receipt,claim.r);
 valid('operation_result',await f.query('operation.get',{workflow_ref:ref,operation_id:'never-arrived'}));
 await assert.rejects(f.services().executeCommand(access,{...progress.c,payload:{...progress.c.payload,summary:'changed'}}),e=>e.error==='operation_payload_conflict');
 await assert.rejects(f.query('operation.get',{workflow_ref:{...ref,workflow_id:'different'},operation_id:claim.c.operation_id}),e=>e.error==='operation_target_mismatch');
});
await test('D07 / V15 FT-P07: owner and actor boundaries are independent',async()=>{
 const f=fixture();await f.setup();await f.ok('task.claim',{task_id:'T1',expected_definition_revision:1,session:null});const before=f.domain();
 const B={...access,actor:{subject_id:'B',kind:'agent',binding_id:'grant-B'}};
 const {r}=await f.send('task.progress',{task_id:'T1',assignment:(await f.state()).tasks.T1.assignment.ref,summary:'not mine',evidence:[]},{},B);
 assert.equal(r.accepted,false);assert.equal(r.failure.error,'assignment_actor_mismatch');assert.equal(f.domain(),before);
 await assert.rejects(f.query('workflow.context',{workflow_ref:ref,limit:20},{...access,owner_id:'other'}),e=>e.error==='workflow_not_found');
});
await test('D08 / B10 V08: two writers race; loser has durable rejection, no orphan effects',async()=>{
 const f=fixture();await f.setup();const payload={task_id:'T1',expected_definition_revision:1,session:null};
 const values=await Promise.all([f.send('task.claim',payload,{expected_revision:3}),f.send('task.claim',payload,{expected_revision:3})]);
 assert.equal(values.filter(v=>v.r.accepted).length,1);const loser=values.find(v=>!v.r.accepted);assert.equal(loser.r.failure.error,'revision_conflict');assert.equal((await f.state()).revision,4);
 assert.deepEqual(await f.services().executeCommand(access,loser.c),loser.r);assert.equal((await f.repository.facts('owner',ref,4,'assignments')).length,1);
});
await test('D08: zero-row CAS and intermediate SQL failure roll back receipt, snapshot, facts and event',async()=>{
 for(const mode of ['zeroCas','failKind']){
  const f=fixture();await f.setup();const before=f.domain();
  if(mode==='zeroCas')f.faults.zeroCas=true;else f.faults.failKind='INSERT INTO collaboration_facts';
  await assert.rejects(f.send('task.claim',{task_id:'T1',expected_definition_revision:1,session:null}),e=>e.error==='storage_unavailable');
  assert.equal(f.domain(),before);assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM collaboration_operations').get().n,3);
 }
});
await test('FT-Q02: find pages keep their baseline and reject changed query cursors',async()=>{
 const f=fixture();await f.setup();await f.ok('workflow.create',{title:'Second',goal:'test',scope,skill:{id:'test',version:null},external_work_refs:[]},{workflow_ref:{...ref,workflow_id:'WF2'},expected_revision:0});
 const page=valid('find_result',await f.query('workflow.find',{store_id:'local',namespace:'personal',q:'',limit:1,cursor:null}));assert.equal(page.has_more,true);
 await f.ok('workflow.pause',{reason:'pause for baseline test'});
 const next=valid('find_result',await f.query('workflow.find',{store_id:'local',namespace:'personal',q:'',limit:1,cursor:page.cursor}));assert.equal(next.items[0].workflow_ref.workflow_id,'WF2');assert.equal(next.has_more,false);
 await assert.rejects(f.query('workflow.find',{store_id:'local',namespace:'personal',q:'changed',limit:1,cursor:page.cursor}),e=>e.error==='invalid_cursor');
});
await test('FT-Q03/05: missing document revisions remain explicit; decision reads stay pinned',async()=>{
 const f=fixture();const plan=await f.setup();
 await f.ok('decision.open',{decision_id:'D1',question:'Proceed?',options:['yes','no'],required_decider:{kind:'human'},blocks:{task_ids:['T1'],workflow_closure:false},basis:[plan]});
 const context=valid('context',await f.query('workflow.context',{workflow_ref:ref,limit:20}));assert.equal(context.tasks.items[0].claimable,false);
 const decision=valid('decision_record',await f.query('decision.read',{workflow_ref:ref,decision_id:'D1',decision_revision:1,at_revision:4}));assert.equal(decision.resolution,null);assert.deepEqual(decision.options,['yes','no']);
 // Storage-loss injection is confined to this disposable database.
 f.sqlite.prepare("DELETE FROM collaboration_facts WHERE kind='documents'").run();
 const missing=valid('context',await f.query('workflow.context',{workflow_ref:ref,limit:20}));assert.equal(missing.missing.length,1);assert.equal(missing.missing[0].reason,'revision_not_found');
 await assert.rejects(f.send('workflow.pause',{reason:'must not accept incomplete storage'}),e=>e.error==='incomplete_command_state');
});
await test('FT-Q03/04 FT-P04: UTF-8 page budgets shrink pages and never emit stalled empty pages',async()=>{
 const f=fixture();await f.setup();
 const handoff={completed:'x'.repeat(4000),remaining:'x'.repeat(4000),next_step:'x'.repeat(4000),artifact_refs:[],blockers:Array(20).fill('x'.repeat(1000)),limitations:Array(20).fill('x'.repeat(1000)),next_actor_hint:null};
 await f.ok('handoff.record',{task_id:'T1',handoff});await f.ok('handoff.record',{task_id:'T1',handoff});
 const context=valid('context',await f.query('workflow.context',{workflow_ref:ref,limit:20}));assert.equal(context.handoffs.items.length,1);assert.equal(context.handoffs.has_more,true);assert.ok(Buffer.byteLength(JSON.stringify(context))<=64000);
 const next=valid('context_page',await f.query('context.page',{workflow_ref:ref,section:'handoffs',cursor:context.handoffs.cursor}));assert.equal(next.page.items.length,1);assert.equal(next.page.has_more,false);
 const count=f.sqlite.prepare('SELECT count(*) AS n FROM collaboration_cursors').get().n;
 await f.query('workflow.context',{workflow_ref:ref,limit:20});assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM collaboration_cursors').get().n,count,'repeated reads reuse stored cursors');
 // A corrupt/oversized persisted item cannot yield an empty page with has_more.
 f.sqlite.prepare("UPDATE collaboration_facts SET body=json_set(body,'$.handoff.completed',?) WHERE kind='handoffs'").run('中'.repeat(24000));
 await assert.rejects(f.query('context.page',{workflow_ref:ref,section:'handoffs',cursor:context.handoffs.cursor}),e=>e.error==='limit_exceeded');
});
await test('GAP-17: a schema-valid addition beyond 100 aggregate tasks is a durable capacity rejection',async()=>{
 const f=fixture();await f.setup(100);const before=f.domain();
 const content='# Second plan\n',plan={document_id:'plan',revision:2,content_hash:await contentDigest(content)};
 const definition={id:'T101',title:'Overflow',description:'Overflow',scope,completion_criteria:['done'],dependencies:[],plan_basis:plan,inputs:[],expected_artifacts:[],decision_ids:[],workstream:null};
 const payload={plan:{document_id:'plan',expected_document_revision:1,content},execution_impact:'declared',task_changes:[{kind:'add',definition}],unaffected_task_ids:Array.from({length:100},(_,i)=>'T'+(i+1)),decision_dispositions:[],completion_requirements:[{id:'R1',description:'Deliver tasks',task_ids:Array.from({length:100},(_,i)=>'T'+(i+1)),document_refs:[]},{id:'R2',description:'Overflow',task_ids:['T101'],document_refs:[]}],requirement_dispositions:[]};
 const {c,r}=await f.send('plan.revise',payload);assert.equal(r.accepted,false);assert.equal(r.failure.error,'limit_exceeded');assert.equal(f.domain(),before);
 assert.deepEqual(await f.services().executeCommand(access,c),r);
 assert.deepEqual((await f.query('operation.get',{workflow_ref:ref,operation_id:c.operation_id})).receipt,r);
 f.sqlite.close();
});
console.log(JSON.stringify({scenarios:passed,passed:true,scope:'real SQLite SQL through simulated D1 batch; no hosted evidence'}));
