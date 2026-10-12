import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import {createCollaborationCommands} from '../backend/application/collaboration.mjs';
import {COLLABORATION_PROFILE,applyCollaborationCommand,taskReady,taskClaimable} from '../backend/domain/collaboration-workflow.mjs';
import {contentDigest} from '../backend/domain/collaboration-values.mjs';
import {memoryCollaborationRepository} from './fixtures/collaboration-memory.mjs';

const schema=JSON.parse(readFileSync(new URL('../contracts/collaboration-v1/schema.json',import.meta.url),'utf8'));
const ajv=new Ajv2020({strict:true,allErrors:true});
ajv.addFormat('date-time',value=>{const time=new Date(value);return Number.isFinite(time.valueOf())&&Number(value.slice(0,4))>=1&&time.toISOString()===value;});ajv.addSchema(schema);
const validate=ajv.getSchema(schema.$id+'#/$defs/command'),receiptValid=ajv.getSchema(schema.$id+'#/$defs/receipt');
const A={owner_id:'owner',actor:{subject_id:'A',kind:'agent',binding_id:'grant-A'},capabilities:['read','plan','execute','manage']};
const B={...A,actor:{subject_id:'B',kind:'agent',binding_id:'grant-B'}};
const human={...A,actor:{subject_id:'H',kind:'human',binding_id:'interactive-H'},capabilities:[...A.capabilities,'decide','change_scope']};
const wf={store_id:'local',namespace:'personal',record_kind:'collaboration',workflow_id:'WF'};
const scope={included:'合成領域驗證',excluded:'部署'};
const handoff={completed:'已保存進度',remaining:'尚待完成',next_step:'依原定義接手',artifact_refs:[],blockers:[],limitations:[],next_actor_hint:'B'};
const result={summary:'完成',criterion_results:[{criterion_index:0,outcome:'satisfied',explanation:'依定義交付',evidence_ids:[]}],artifacts:[],evidence:[],limitations:[]};
function fixture(){
 const repository=memoryCollaborationRepository();let operation=0,id=0,clockReads=0;
 const execute=createCollaborationCommands({repository,clock:{now:()=>{clockReads++;return '2026-10-12T00:00:00.000Z';}},ids:{next:kind=>kind+'-'+(++id)},validateCommand:validate,storeId:'local'});
 const state=(actor=A)=>repository.state(actor.owner_id,wf);
 const command=(name,payload,actor=A,overrides={})=>({service_contract_version:COLLABORATION_PROFILE,schema_version:'1.0',workflow_ref:wf,operation_id:'op-'+(++operation),expected_revision:state(actor)?.revision??0,command:name,payload,...overrides});
 async function send(name,payload,actor=A,overrides={}){
  const c=command(name,payload,actor,overrides);const r=await execute(actor,c);
  assert.ok(receiptValid(r),JSON.stringify(receiptValid.errors));return {c,r};
 }
 async function ok(name,payload,actor=A,overrides={}){
  const {r,c}=await send(name,payload,actor,overrides);assert.equal(r.accepted,true,JSON.stringify(r));return {r,c};
 }
 async function no(name,payload,code,actor=A,overrides={}){
  const before=repository.domainSnapshot();const {r,c}=await send(name,payload,actor,overrides);
  assert.equal(r.accepted,false);assert.equal(r.failure.error,code);assert.equal(repository.domainSnapshot(),before,'No domain/fact/event effect may survive a rejection');return {r,c};
 }
 async function create(){return ok('workflow.create',{title:'Test',goal:'驗證可攜領域',scope,skill:{id:'test',version:null},external_work_refs:[]});}
 const definition=(id,plan,options={})=>({id,title:id,description:'完成 '+id,scope,completion_criteria:['交付結果'],dependencies:[],plan_basis:plan,inputs:[],expected_artifacts:[],decision_ids:[],workstream:null,...options});
 async function planPayload(changes,options={}){
  const w=state(),revision=(w.document_heads.plan?.ref.revision??0)+1,content='# Plan '+revision+'\n';
  const plan={document_id:'plan',revision,content_hash:await contentDigest(content)};
  const task_changes=changes.map(change=>({kind:w.tasks[change.id]?'replace':'add',...(w.tasks[change.id]?{expected_definition_revision:w.tasks[change.id].definition_revision}:{}),definition:definition(change.id,plan,{...(w.tasks[change.id]?.definition??{}),...change,plan_basis:plan})}));
  const added=changes.filter(change=>!w.tasks[change.id]).map(change=>({id:'R-'+change.id,description:'交付 '+change.id,task_ids:[change.id],document_refs:[]}));
  return {plan:{document_id:'plan',expected_document_revision:revision-1,content},execution_impact:'declared',task_changes,unaffected_task_ids:Object.values(w.tasks).filter(task=>!['completed','cancelled'].includes(task.status)&&!changes.some(change=>change.id===task.id)).map(task=>task.id),decision_dispositions:[],completion_requirements:[...w.completion_requirements,...added],requirement_dispositions:w.requirement_dispositions,...(typeof options==='function'?options(plan):options)};
 }
 async function plan(changes,options,actor=A){return ok('plan.revise',await planPayload(changes,options),actor);}
 async function setup(tasks=[{id:'T1'}]){await create();await plan(tasks);await ok('workflow.start',{});}
 async function claim(id,actor=A){return ok('task.claim',{task_id:id,expected_definition_revision:state().tasks[id].definition_revision,session:null},actor);}
 async function complete(id,actor=A,value=result){return ok('task.complete',{task_id:id,assignment:state().tasks[id].assignment.ref,result:value},actor);}
 return {repository,execute,state,command,send,ok,no,create,planPayload,plan,setup,claim,complete,clockReads:()=>clockReads};
}
let passed=0;
async function test(name,run){await run();passed++;console.log('PASS '+name);}

await test('B01: draft ready permits start without automatically claiming',async()=>{
 const f=fixture();await f.create();await f.plan([{id:'T1'}]);assert.equal(taskReady(f.state(),f.state().tasks.T1),true);assert.equal(taskClaimable(f.state(),f.state().tasks.T1),false);
 await f.ok('workflow.start',{});assert.equal(f.state().status,'active');assert.equal(f.state().tasks.T1.assignment,null);
});
await test('B02: two workstreams progress independently and join waits for both',async()=>{
 const f=fixture();await f.setup([{id:'T0'},{id:'A1',dependencies:['T0'],workstream:'A'},{id:'A2',dependencies:['A1'],workstream:'A'},{id:'B1',dependencies:['T0'],workstream:'B'},{id:'B2',dependencies:['B1'],workstream:'B'},{id:'T3',dependencies:['A2','B2']}]);
 await f.no('task.claim',{task_id:'A1',expected_definition_revision:1,session:null},'task_not_ready');
 await f.claim('T0');await f.complete('T0');await f.claim('A1');await f.claim('B1',B);
 assert.equal(f.state().tasks.A1.status,'in_progress');assert.equal(f.state().tasks.B1.status,'in_progress');
 await f.complete('A1');await f.claim('A2');await f.complete('A2');assert.equal(taskReady(f.state(),f.state().tasks.T3),false);
 await f.complete('B1',B);await f.claim('B2',B);await f.complete('B2',B);assert.equal(taskReady(f.state(),f.state().tasks.T3),true);
});
await test('B03: concurrent claims accept one assignment and reject the other without overwrite',async()=>{
 const f=fixture();await f.setup();const c1=f.command('task.claim',{task_id:'T1',expected_definition_revision:1,session:null}),c2=f.command('task.claim',c1.payload,B);
 const outcomes=await Promise.all([f.execute(A,c1),f.execute(B,c2)]);assert.equal(outcomes.filter(r=>r.accepted).length,1);
 assert.equal(f.state().tasks.T1.status,'in_progress');assert.equal(f.repository.history('owner',wf).assignments.length,1);
});
await test('B04: release and reclaim fence old assignment even with the latest workflow revision',async()=>{
 const f=fixture();await f.setup();await f.claim('T1');const old=f.state().tasks.T1.assignment.ref;
 await f.ok('task.release',{task_id:'T1',assignment:old,handoff});await f.claim('T1',B);
 await f.no('task.complete',{task_id:'T1',assignment:old,result},'assignment_expired');
 await f.no('task.complete',{task_id:'T1',assignment:f.state().tasks.T1.assignment.ref,result},'assignment_actor_mismatch');
 assert.equal(f.state().tasks.T1.assignment.ref.generation,2);assert.equal(f.repository.history('owner',wf).handoffs.length,1);
});
await test('handoff information and checkpoint do not release or claim tasks',async()=>{
 const f=fixture();await f.setup();await f.claim('T1');const assignment=f.state().tasks.T1.assignment;
 await f.ok('handoff.record',{task_id:'T1',handoff});
 await f.ok('checkpoint.append',{observation:'進度',next_step:'繼續',document_refs:[f.state().plan]});
 assert.deepEqual(f.state().tasks.T1.assignment,assignment);
});
await test('B06: an active definition cannot change; appended plan bytes are not partially retained',async()=>{
 const f=fixture();await f.setup();await f.claim('T1');await f.no('plan.revise',await f.planPayload([{id:'T1',completion_criteria:['改變條件']}]),'active_assignment');
 assert.equal(f.repository.history('owner',wf).documents.length,1);
});
await test('B07: unrelated plan revision leaves an active assignment and its old basis valid',async()=>{
 const f=fixture();await f.setup([{id:'T1'},{id:'T2'}]);await f.claim('T1');const basis=f.state().tasks.T1.definition.plan_basis;
 await f.plan([{id:'T2',description:'補充工作'}]);await f.complete('T1');
 assert.deepEqual(f.state().tasks.T1.result.plan_basis,basis);assert.equal(f.state().tasks.T1.definition_revision,1);assert.equal(f.state().tasks.T2.definition_revision,2);
});
await test('B08: changed decision basis requires reconsideration and cannot be self-approved by an Agent',async()=>{
 const f=fixture();await f.setup();
 await f.ok('decision.open',{decision_id:'Q1',question:'選擇方案',options:['A','B'],required_decider:{kind:'human'},blocks:{task_ids:['T1'],workflow_closure:false},basis:[f.state().plan]});
 await f.ok('decision.resolve',{decision_id:'Q1',expected_decision_revision:1,basis:[f.state().plan],outcome:'decided',value:'A',reason:'採用'},human);
 await f.claim('T1');await f.ok('task.release',{task_id:'T1',assignment:f.state().tasks.T1.assignment.ref,handoff});
 await f.no('plan.revise',await f.planPayload([{id:'T1',description:'新依據'}]),'decision_disposition_required');
 await f.plan([{id:'T1',description:'新依據'}],plan=>({decision_dispositions:[{decision_id:'Q1',expected_decision_revision:2,action:'reconsider',basis:[plan],reason:'依據改版'}]}));
 assert.equal(f.state().decisions.Q1.status,'pending');
 const agentDecider={...A,capabilities:[...A.capabilities,'decide']};
 await f.no('decision.resolve',{decision_id:'Q1',expected_decision_revision:3,basis:[f.state().plan],outcome:'decided',value:'A',reason:'自行沿用'},'decision_actor_mismatch',agentDecider);
 const original=f.repository.history('owner',wf).decision_revisions.find(q=>q.revision===2);
 assert.equal(original.resolution.actor.kind,'human');assert.equal(original.basis[0].revision,1);
 await f.ok('decision.resolve',{decision_id:'Q1',expected_decision_revision:3,basis:[f.state().plan],outcome:'decided',value:'B',reason:'新依據'},human);await f.claim('T1');
});
await test('B09: an accepted but lost response replays without another domain effect or clock call',async()=>{
 const f=fixture();await f.setup();const c=f.command('task.claim',{task_id:'T1',expected_definition_revision:1,session:null});
 f.repository.loseResponse=true;const r=await f.execute(A,c);assert.equal(r.accepted,true);
 const before=f.repository.domainSnapshot(),reads=f.clockReads();assert.deepEqual(await f.execute(A,c),r);assert.equal(f.repository.domainSnapshot(),before);assert.equal(f.clockReads(),reads);
 await assert.rejects(f.execute(B,c),e=>e.error==='operation_payload_conflict');
});
await test('B10: a stale operation has a durable rejection; a reconciled request needs a new ID',async()=>{
 const f=fixture();await f.setup([{id:'T1'},{id:'T2'}]);
 const stale=f.command('task.claim',{task_id:'T2',expected_definition_revision:1,session:null},B);await f.claim('T1');
 const r=await f.execute(B,stale);assert.equal(r.accepted,false);assert.equal(r.failure.error,'revision_conflict');
 assert.deepEqual(await f.execute(B,stale),r);
 await assert.rejects(f.execute(B,{...stale,expected_revision:f.state().revision}),e=>e.error==='operation_payload_conflict');
 await f.claim('T2',B);assert.equal(f.state().tasks.T1.status,'in_progress');assert.equal(f.state().tasks.T2.status,'in_progress');
 await assert.rejects(f.execute(B,{...stale,workflow_ref:{...wf,workflow_id:'other'}}),e=>e.error==='operation_payload_conflict');
});
await test('B11: paused workflow accepts existing completion and rejects new claims',async()=>{
 const f=fixture();await f.setup([{id:'T1'},{id:'T2'}]);await f.claim('T1');await f.ok('workflow.pause',{reason:'暫停新工作'});await f.complete('T1');
 await f.no('task.claim',{task_id:'T2',expected_definition_revision:1,session:null},'task_not_ready');await f.ok('workflow.resume',{});await f.claim('T2');
});
await test('B12: cancelled dependency does not make downstream work ready',async()=>{
 const f=fixture();await f.setup([{id:'T1'},{id:'T2',dependencies:['T1']}]);
 await f.ok('task.cancel',{task_id:'T1',assignment:null,reason:'取消',handoff:null});
 assert.equal(taskReady(f.state(),f.state().tasks.T2),false);
 await f.no('task.claim',{task_id:'T2',expected_definition_revision:1,session:null},'task_not_ready');
 await f.plan([{id:'T2',dependencies:[]}]);assert.equal(taskReady(f.state(),f.state().tasks.T2),true);
});
await test('B13: required delivery cannot be cancelled into completion without authorized scope disposition',async()=>{
 const f=fixture();await f.setup([{id:'T1'},{id:'T2'}]);await f.claim('T1');await f.complete('T1');
 await f.ok('task.cancel',{task_id:'T2',assignment:null,reason:'不交付',handoff:null});
 await f.no('workflow.complete',{summary:'宣稱完成',document_refs:[]},'incomplete_requirements');
 const payload=await f.planPayload([],{requirement_dispositions:[{requirement_id:'R-T2',kind:'excluded',reason:'明確縮減範圍',follow_up_ref:null}]});
 await f.no('plan.revise',payload,'forbidden');await f.ok('plan.revise',payload,human);
 await f.ok('workflow.complete',{summary:'T1 完成；T2 已排除',document_refs:[f.state().plan]},human);assert.equal(f.state().status,'completed');
 await f.no('task.claim',{task_id:'T2',expected_definition_revision:1,session:null},'terminal_workflow');
 await f.ok('checkpoint.append',{observation:'結案附註',next_step:'無',document_refs:[]});assert.equal(f.state().status,'completed');
});
await test('invalid DAGs, missing input versions and undeclared changes are rejected atomically',async()=>{
 const f=fixture();await f.setup([{id:'T1'},{id:'T2'}]);
 await f.no('plan.revise',await f.planPayload([{id:'T1',dependencies:['T1']}]),'invalid_dependency');
 await f.no('plan.revise',await f.planPayload([{id:'T1',dependencies:['missing']}]),'invalid_dependency');
 await f.no('plan.revise',await f.planPayload([{id:'T1',dependencies:['T2']},{id:'T2',dependencies:['T1']}]),'dependency_cycle');
 await f.no('plan.revise',await f.planPayload([{id:'T1',inputs:[{kind:'document',ref:{...f.state().plan,revision:99}}]}]),'revision_not_found');
 await f.no('plan.revise',await f.planPayload([{id:'T1',description:'改變'}],{execution_impact:'none'}),'undeclared_execution_change');
});
await test('workflow cancellation closes all active assignments and rejects delayed completion',async()=>{
 const f=fixture();await f.setup([{id:'T1'},{id:'T2'}]);await f.claim('T1');await f.claim('T2',B);
 const assignment=f.state().tasks.T1.assignment.ref;await f.ok('workflow.cancel',{reason:'停止工作',remaining:'兩項尚未交付'});
 assert.ok(Object.values(f.state().tasks).every(t=>t.status==='cancelled'&&t.assignment===null));
 await f.no('task.complete',{task_id:'T1',assignment,result},'terminal_workflow');
});
await test('criteria and newly raised blocking decisions still constrain an active assignment',async()=>{
 const f=fixture();await f.setup();await f.claim('T1');
 await f.no('task.complete',{task_id:'T1',assignment:f.state().tasks.T1.assignment.ref,result:{...result,criterion_results:[{...result.criterion_results[0],outcome:'not_satisfied'}]}},'incomplete_criteria');
 await f.ok('decision.open',{decision_id:'Q1',question:'新問題',options:[],required_decider:{kind:'human'},blocks:{task_ids:['T1'],workflow_closure:false},basis:[f.state().plan]});
 await f.no('task.complete',{task_id:'T1',assignment:f.state().tasks.T1.assignment.ref,result},'decision_required');
});
await test('management release uses the real manager and does not impersonate the executor',async()=>{
 const f=fixture();await f.setup();await f.claim('T1');
 const manager={...human,capabilities:['read','manage']};await f.ok('task.release',{task_id:'T1',assignment:f.state().tasks.T1.assignment.ref,handoff},manager);
 const last=f.repository.history('owner',wf).assignments.at(-1);assert.equal(last.actor.subject_id,'A');assert.equal(last.ended_by.subject_id,'H');
});
await test('unavailable and incomplete state never trigger local fallback or falsely accepted outcomes',async()=>{
 const f=fixture();await f.setup();const c=f.command('task.claim',{task_id:'T1',expected_definition_revision:1,session:null}),before=f.repository.domainSnapshot();
 f.repository.failBeforeCommit=true;await assert.rejects(f.execute(A,c),e=>e.error==='storage_unavailable');assert.equal(f.repository.domainSnapshot(),before);
 assert.equal((await f.repository.operation('owner','local',c.operation_id)).outcome,'unknown');
 f.repository.failBeforeCommit=false;f.repository.incomplete=true;await assert.rejects(f.execute(A,c),e=>e.error==='incomplete_command_state');
 f.repository.incomplete=false;assert.equal((await f.execute(A,c)).accepted,true);
});
await test('owner/store/actor constraints run before replay and domain access',async()=>{
 const f=fixture();await f.setup();const {c}=await f.claim('T1');
 await assert.rejects(f.execute({...A,capabilities:[]},c),e=>e.error==='forbidden');
 await assert.rejects(f.execute(A,{...c,workflow_ref:{...wf,store_id:'elsewhere'}}),e=>e.error==='store_mismatch');
 const other={...A,owner_id:'other'};const r=await f.execute(other,{...c,operation_id:'other-claim'});assert.equal(r.accepted,false);assert.equal(r.failure.error,'workflow_not_found');
 assert.equal(f.state().tasks.T1.assignment.actor.subject_id,'A');
});
await test('caller mutation during IO and reducer output mutation cannot change accepted inputs',async()=>{
 const f=fixture();await f.setup();const access=structuredClone(A),c=f.command('task.claim',{task_id:'T1',expected_definition_revision:1,session:null});
 const pending=f.execute(access,c);c.payload.task_id='other';access.actor.subject_id='other';
 assert.equal((await pending).accepted,true);assert.equal(f.state().tasks.T1.assignment.actor.subject_id,'A');
 const original=f.state(),saved=structuredClone(original),command=f.command('task.progress',{task_id:'T1',assignment:original.tasks.T1.assignment.ref,summary:'進度',evidence:[]});
 const change=await applyCollaborationCommand(original,command,{access:A,time:'2026-10-12T00:00:00.000Z',newId:()=>assert.fail('Progress needs no generated ID')});
 change.state.tasks.T1.definition.title='mutated output';assert.deepEqual(original,saved);
});
await test('UTF-8 metadata, context header and document limits reject all effects atomically',async()=>{
 const f=fixture();await f.setup();await f.claim('T1');
 const limitations=Array(23).fill('文'.repeat(1000));
 await f.no('task.release',{task_id:'T1',assignment:f.state().tasks.T1.assignment.ref,handoff:{...handoff,limitations}},'limit_exceeded');
 await f.no('task.progress',{task_id:'T1',assignment:f.state().tasks.T1.assignment.ref,summary:'進度',evidence:[{id:'E1',summary:'測試',outcome:'not_run',observed_at:null,artifact_refs:[],limitations}]},'limit_exceeded');
 await f.no('document.append',{purpose:'supporting',document:{document_id:'large',expected_document_revision:0,content:'文'.repeat(90000)}},'limit_exceeded');
 const g=fixture();await g.no('workflow.create',{title:'Test',goal:'文'.repeat(4000),scope:{included:'文'.repeat(4000),excluded:'無'},skill:{id:'test',version:null},external_work_refs:[]},'limit_exceeded');
 assert.equal(g.state(),null);
});
await test('block records handoff, progress evidence stays immutable, and unblock requires a new claim',async()=>{
 const f=fixture();await f.setup();await f.claim('T1');const old=f.state().tasks.T1.assignment.ref;
 const evidence={id:'E1',summary:'檢查',outcome:'passed',observed_at:'2026-10-12T00:00:00.000Z',artifact_refs:[],limitations:[]};
 await f.ok('task.progress',{task_id:'T1',assignment:old,summary:'驗證中',evidence:[evidence]});
 await f.no('task.progress',{task_id:'T1',assignment:old,summary:'覆寫證據',evidence:[{...evidence,outcome:'failed'}]},'evidence_exists');
 await f.ok('task.block',{task_id:'T1',assignment:old,reason:'缺少輸入',handoff});assert.equal(f.state().tasks.T1.assignment,null);
 await f.ok('task.unblock',{task_id:'T1',resolution:'輸入已補足'});assert.equal(f.state().tasks.T1.status,'pending');
 await f.no('task.progress',{task_id:'T1',assignment:old,summary:'舊程序',evidence:[]},'assignment_expired');
 await f.claim('T1',B);await f.complete('T1',B);
 const history=f.repository.history('owner',wf).assignments;
 assert.equal(new Set(history.map(item=>item.workflow_revision)).size,history.length);
 assert.deepEqual(history.map(item=>item.status),['active','blocked','active','completed']);
});
await test('a plan cannot erase original delivery requirements or bypass a human decision disposition',async()=>{
 const f=fixture();await f.setup();
 await f.no('plan.revise',await f.planPayload([],{completion_requirements:[]}),'requirement_history_required');
 await f.ok('decision.open',{decision_id:'Q1',question:'需人決定',options:[],required_decider:{kind:'human'},blocks:{task_ids:['T1'],workflow_closure:true},basis:[f.state().plan]});
 await f.ok('decision.resolve',{decision_id:'Q1',expected_decision_revision:1,basis:[f.state().plan],outcome:'decided',value:'採用',reason:'已判斷'},human);
 for(const action of ['carry_forward','waive']){
  const p=await f.planPayload([{id:'T1',description:'新依據'}],plan=>({decision_dispositions:[{decision_id:'Q1',expected_decision_revision:2,action,basis:[plan],reason:'新版'}]}));
  await f.no('plan.revise',p,'decision_actor_mismatch');
 }
});
console.log(JSON.stringify({scenarios:passed,passed:true,scope:'Collaboration domain/application with a synthetic atomic port; no HTTP/MCP identity, D1 or hosted acceptance'}));
