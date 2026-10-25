import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../Contracts/CollaborationV2/schema.json' with {type:'json'};
import {sqliteCollaboration} from './Fixtures/collaboration-sqlite.mjs';
import {createCollaborationServices} from '../Presentation/WebApi/collaboration-services.mjs';
import {handle} from '../Presentation/WebApi/entry.mjs';
import {createRemoteCollaborationClient} from '../Presentation/Cli/collaboration-client.mjs';
import {createCollaborationClient} from '../Presentation/Web/collaboration-client.mjs';
import {createProjectClient} from '../Presentation/Web/project-client.mjs';
import {createReviewDraft} from '../Presentation/Web/collaboration-review.mjs';
import {contentDigest,requestDigest,operationKey,canonicalJson,valueDigest} from '../Core/Workflows/Domain/collaboration-values.mjs';

const ajv=new Ajv2020({strict:true});ajv.addFormat('date-time',v=>new Date(v).toISOString()===v);ajv.addSchema(schema);
const valid=(name,value)=>{const v=ajv.getSchema(schema.$id+'#/$defs/'+name);assert.ok(v(value),JSON.stringify(v.errors));return value;};
const envelope={service_contract_version:'workflow-board/collaboration/2',schema_version:'2.0'};
const legacyEnvelope={service_contract_version:'workflow-board/collaboration/1',schema_version:'1.0'};
const access={owner_id:'owner',actor:{subject_id:'agent',kind:'agent',binding_id:'binding'},capabilities:['read','plan','execute','manage']};
const projectRef=id=>({store_id:'local',namespace:'personal',project_id:id});
const ref=(id,w='WF')=>({...projectRef(id),record_kind:'collaboration',workflow_id:w});
const scope={included:'Synthetic project isolation',excluded:'Hosted data'};
const createPayload=title=>({title,goal:'Isolated continuation',scope,skill:{id:'test',version:null},external_work_refs:[]});
const pc=(id,name=id,operation='project-create')=>({...envelope,project_ref:projectRef(id),operation_id:operation,expected_revision:0,command:'project.create',payload:{name}});
const wc=(id,command,payload,revision,operation,w='WF')=>({...envelope,workflow_ref:ref(id,w),operation_id:operation,expected_revision:revision,command,payload});
const q=(query,payload)=>({...envelope,query,payload});
const fixture=()=>{const f=sqliteCollaboration();const env={DB:f.db,COLLABORATION_STORE_ID:'local'};return {...f,env,services:()=>createCollaborationServices(env)};};
const failure=(promise,...codes)=>assert.rejects(promise,e=>codes.includes(e.error));
let count=0;
async function test(name,fn){await fn();count++;console.log('PASS '+name);}
await test('P00: frozen collaboration/2 schema and request/operation-key vectors',async()=>{
 const vectors=JSON.parse(readFileSync(new URL('../Contracts/CollaborationV2/vectors.json',import.meta.url),'utf8'));
 for(const v of vectors.requests){valid('command',v.command);assert.equal(canonicalJson({purpose:v.purpose,authority:v.authority,command:v.command}),v.canonical);assert.equal(await valueDigest({purpose:v.purpose,authority:v.authority,command:v.command}),v.digest);if(v.command.workflow_ref){assert.equal(await requestDigest(v.authority,v.command),v.digest);assert.equal(operationKey(v.authority,v.command),v.operation_key);}}
});
const f=fixture(),send=c=>f.services().executeCommand(access,c),query=(name,payload,a=access)=>f.services().executeQuery(a,q(name,payload));

await test('P01 AC01: owner-bound stable projects, rename CAS and project-operation replay',async()=>{
 for(const id of ['A','B'])valid('project_receipt',await send(pc(id)));
 const list=valid('project_list',await query('project.list',{store_id:'local',namespace:'personal',limit:1,cursor:null}));
 assert.equal(list.items[0].project_ref.project_id,'legacy-personal');assert.equal(list.has_more,true);
 const next=await query('project.list',{store_id:'local',namespace:'personal',limit:1,cursor:list.cursor});assert.equal(next.items[0].project_ref.project_id,'A');
 await failure(query('project.list',{store_id:'local',namespace:'personal',limit:2,cursor:list.cursor}),'invalid_cursor');
 await failure(query('project.list',{store_id:'local',namespace:'personal',limit:1,cursor:list.cursor},{...access,owner_id:'other'}),'invalid_cursor');
 const rename={...pc('A','Renamed','rename'),command:'project.rename',expected_revision:1};
 const r=valid('project_receipt',await send(rename));assert.equal(r.revision,2);assert.deepEqual(await send(rename),r);
 await failure(send({...rename,payload:{name:'Different'}}),'operation_payload_conflict');
 const conflict=await send({...rename,operation_id:'stale'});assert.equal(conflict.accepted,false);assert.equal(conflict.revision,2);
 assert.deepEqual(valid('project',await query('project.read',{project_ref:projectRef('A')})),{project_ref:projectRef('A'),name:'Renamed',revision:2,workflow_contract:envelope.service_contract_version});
 assert.equal((await query('project.operation.get',{project_ref:projectRef('B'),operation_id:'rename'})).outcome,'unknown');
 await failure(f.services().executeCommand({...access,capabilities:['read']},pc('C')),'forbidden');
});

const plans={};
await test('P02 AC02/03: A/B share workflow and operation IDs with independent contexts, documents, tasks and handoffs',async()=>{
 for(const id of ['A','B']){
  const create=wc(id,'workflow.create',createPayload(id),0,'same-create');const receipt=valid('receipt',await send(create));assert.equal(receipt.accepted,true);
  assert.deepEqual(await send(create),receipt);
  await failure(send({...create,payload:createPayload('different')}),'operation_payload_conflict');
  await failure(send({...create,workflow_ref:ref(id,'OTHER')}),'operation_payload_conflict');
  const content='# '+id+' plan\n',plan={document_id:'plan',revision:1,content_hash:await contentDigest(content)};plans[id]=plan;
  const definitions=[1,2].map(i=>({id:'T'+i,title:id+' task '+i,description:id,scope,completion_criteria:['done'],dependencies:[],plan_basis:plan,inputs:[],expected_artifacts:[],decision_ids:[],workstream:null}));
  const result=await send(wc(id,'plan.revise',{plan:{document_id:'plan',expected_document_revision:0,content},execution_impact:'declared',task_changes:definitions.map(definition=>({kind:'add',definition})),unaffected_task_ids:[],decision_dispositions:[],completion_requirements:[{id:'R1',description:'complete',task_ids:['T1','T2'],document_refs:[]}],requirement_dispositions:[]},1,'same-plan'));
  assert.equal(result.accepted,true,JSON.stringify(result));
  const context=valid('context',await query('workflow.context',{workflow_ref:ref(id),limit:1}));assert.equal(context.workflow.title,id);assert.equal(context.tasks.items[0].title,id+' task 1');
  const doc=valid('document',await query('document.read',{workflow_ref:ref(id),document_ref:plan}));assert.equal(doc.content,content);
  const task=valid('task_record',await query('task.read',{workflow_ref:ref(id),task_id:'T1',at_revision:2,definition_revision:1}));assert.equal(task.definition.description,id);
  const handoff=await send(wc(id,'handoff.record',{task_id:null,handoff:{completed:id+' handoff',remaining:'remaining',blockers:[],limitations:[],next_actor_hint:null,next_step:'continue '+id,artifact_refs:[{kind:'document',ref:plan}]}},2,'same-handoff'));
  assert.equal(handoff.accepted,true,JSON.stringify(handoff));
  const checkpoint=await send(wc(id,'checkpoint.append',{observation:id+' checkpoint',document_refs:[plan],next_step:'continue'},3,'same-checkpoint'));
  assert.equal(checkpoint.accepted,true,JSON.stringify(checkpoint));
  const after=await query('workflow.context',{workflow_ref:ref(id),limit:1});assert.equal(after.handoffs.items[0].handoff.completed,id+' handoff');
  const outcome=valid('operation_result',await query('operation.get',{workflow_ref:ref(id),operation_id:'same-create'}));assert.equal(outcome.receipt.workflow_ref.project_id,id);
 }
 assert.notEqual((await query('operation.get',{workflow_ref:ref('A'),operation_id:'same-create'})).receipt.request_digest,(await query('operation.get',{workflow_ref:ref('B'),operation_id:'same-create'})).receipt.request_digest);
});

await test('P03 AC04: missing/unknown/forged project, owner, document and cursor scopes cannot leak or mutate',async()=>{
 const before=f.sqlite.prepare('SELECT count(*) AS n FROM project_collaboration_operations').get().n;
 await failure(send({...wc('A','workflow.create',createPayload('X'),0,'bad'),workflow_ref:{store_id:'local',namespace:'personal',record_kind:'collaboration',workflow_id:'WF'}}),'invalid_command');
 for(const id of ['missing','legacy-personal'])await failure(query('workflow.context',{workflow_ref:ref(id),limit:1}),'project_not_found','legacy_project_requires_v1');
 await failure(query('workflow.context',{workflow_ref:ref('A'),limit:1},{...access,owner_id:'other'}),'project_not_found');
 await failure(query('workflow.context',{workflow_ref:{...ref('A'),owner_id:'other'},limit:1}),'invalid_command');
 await failure(query('workflow.context',{workflow_ref:{...ref('A'),store_id:'other'},limit:1}),'store_mismatch');
 await failure(query('document.read',{workflow_ref:ref('B'),document_ref:plans.A}),'document_hash_mismatch');
 const context=await query('workflow.context',{workflow_ref:ref('A'),limit:1});
 await failure(query('context.page',{workflow_ref:ref('B'),section:'tasks',cursor:context.tasks.cursor}),'snapshot_expired','invalid_cursor');
 const page=valid('context_page',await query('context.page',{workflow_ref:ref('A'),section:'tasks',cursor:context.tasks.cursor}));assert.equal(page.page.items[0].title,'A task 2');
 assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM project_collaboration_operations').get().n,before);
 await send(wc('A','document.append',{purpose:'supporting',document:{document_id:'only-A',expected_document_revision:0,content:'A secret'}},4,'only-A'));
 assert.equal((await query('operation.get',{workflow_ref:ref('B'),operation_id:'only-A'})).outcome,'unknown');
 await failure(query('operation.get',{workflow_ref:ref('A','wrong'),operation_id:'only-A'}),'operation_target_mismatch');
});

await test('P04 AC02/04: find baseline, correlated revision and cursors are project-scoped',async()=>{
 for(const id of ['A','B'])assert.equal((await send(wc(id,'workflow.create',createPayload(id+' second'),0,'second','WF2'))).accepted,true);
 const payload=id=>({...projectRef(id),q:'',limit:1,cursor:null});
 const a=valid('find_result',await query('workflow.find',payload('A')));assert.equal(a.items[0].revision,5);
 const b=await query('workflow.find',payload('B'));assert.equal(b.items[0].revision,4);
 await failure(query('workflow.find',{...payload('B'),cursor:a.cursor}),'snapshot_expired','invalid_cursor');
 const tail=await query('workflow.find',{...payload('A'),cursor:a.cursor});assert.equal(tail.items[0].title,'A second');
 assert.ok((await query('capabilities',projectRef('A'))).commands.every(c=>c!=='decision.resolve'));
});

await test('P05 AC03: concurrent CAS, durable rejection, lost response and SQL rollback stay atomic per project',async()=>{
 const c=wc('B','document.append',{purpose:'supporting',document:{document_id:'race',expected_document_revision:0,content:'race'}},4,'race-1');
 const results=await Promise.all([send(c),send({...c,operation_id:'race-2'})]);assert.equal(results.filter(r=>r.accepted).length,1);
 const rejected=results.find(r=>!r.accepted);assert.deepEqual(await send({...c,operation_id:rejected.operation_id}),rejected);
 const state=()=>JSON.stringify(['heads','snapshots','chunks','facts','operations'].map(n=>f.sqlite.prepare('SELECT * FROM project_collaboration_'+n).all()));
 for(const mode of ['zeroCas','failKind']){
  const before=state();f.faults[mode]=mode==='zeroCas'?true:'INSERT INTO project_collaboration_facts';
  await failure(send(wc('B','document.append',{purpose:'supporting',document:{document_id:'rollback',expected_document_revision:0,content:'rollback'}},5,'rollback-'+mode)),'storage_unavailable');
  f.faults[mode]=mode==='zeroCas'?false:null;assert.equal(state(),before);
 }
 f.faults.loseResponse=true;const lost=wc('B','document.append',{purpose:'supporting',document:{document_id:'lost',expected_document_revision:0,content:'lost'}},5,'lost');
 const result=await send(lost);assert.equal(result.accepted,true);assert.deepEqual(await send(lost),result);
 const beforeProjects=f.sqlite.prepare('SELECT * FROM collaboration_projects').all();f.faults.zeroCas=true;
 await failure(send({...pc('B','Not saved','rename-rollback'),command:'project.rename',expected_revision:1}),'storage_unavailable');f.faults.zeroCas=false;
 assert.deepEqual(f.sqlite.prepare('SELECT * FROM collaboration_projects').all(),beforeProjects);
});

await test('P06 AC06: additive migration preserves every legacy row and original request replay; mapping is read-only',async()=>{
 const old=sqliteCollaboration({throughMigration:3}),env={DB:old.db,COLLABORATION_STORE_ID:'local'},services=()=>createCollaborationServices(env);
 const workflow_ref={store_id:'local',namespace:'personal',record_kind:'collaboration',workflow_id:'OLD'};
 const c={...legacyEnvelope,workflow_ref,operation_id:'old-operation',expected_revision:0,command:'workflow.create',payload:createPayload('old')};
 const receipt=await services().executeCommand(access,c);
 const doc={...c,operation_id:'old-document',expected_revision:1,command:'document.append',payload:{purpose:'supporting',document:{document_id:'old',expected_document_revision:0,content:'old content\r\n'}}};
 await services().executeCommand(access,doc);
 const tables=old.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
 const snapshot=()=>JSON.stringify(tables.map(t=>[t,old.sqlite.prepare('SELECT * FROM '+t).all()]));const before=snapshot();
 const migrations=new URL('../Infrastructure/Persistence/D1/Migrations/',import.meta.url);
 for(const file of readdirSync(migrations).filter(n=>n.startsWith('0004')&&n.endsWith('.sql')))old.sqlite.exec(readFileSync(new URL(file,migrations),'utf8'));
 assert.equal(snapshot(),before);assert.deepEqual(await services().executeCommand(access,c),receipt);assert.equal(snapshot(),before);
 const preview=valid('legacy_preview',await services().executeQuery(access,q('project.legacy.preview',{store_id:'local',namespace:'personal'})));assert.equal(preview.counts.operations,2);assert.equal(preview.mode,'identity-mapping-no-copy');assert.equal(snapshot(),before);
 const read=await services().executeQuery(access,{...legacyEnvelope,query:'document.read',payload:{workflow_ref,document_ref:{document_id:'old',revision:1,content_hash:await contentDigest('old content\r\n')}}});assert.equal(read.content,'old content\r\n');
 assert.equal(await requestDigest({owner_id:access.owner_id,actor:access.actor},c),receipt.request_digest);
 assert.equal(operationKey(access,c),'["owner","local","old-operation"]');
 if(process.env.BOARD_BASELINE_WORKER){
  const original=(await import(pathToFileURL(resolve(process.env.BOARD_BASELINE_WORKER)).href)).default.fetch;
  const binding={enabled:true,...access.actor,capabilities:access.capabilities};
  const originalEnv={...env,COLLABORATION_BINDINGS:JSON.stringify({owner:binding})};
  await services().executeCommand(access,pc('rollback-project'));
  await services().executeCommand(access,wc('rollback-project','workflow.create',createPayload('preserved V2'),0,'v2-create'));
  const invoke=async(path,input)=>original(new Request('https://rollback.test'+path,{method:'POST',headers:{'content-type':'application/json','oai-authenticated-user-id':'owner'},body:JSON.stringify(input)}),originalEnv);
  const replay=await invoke('/api/collaboration/v1/commands',c);assert.equal(replay.status,200);assert.deepEqual(await replay.json(),receipt);
  const document=await invoke('/api/collaboration/v1/queries',{...legacyEnvelope,query:'document.read',payload:{workflow_ref,document_ref:read.ref}});assert.equal(document.status,200);assert.equal((await document.json()).content,read.content);
  const unavailable=await invoke('/api/collaboration/v2/queries',q('workflow.context',{workflow_ref:ref('rollback-project'),limit:1}));assert.notEqual(unavailable.status,200);
  const restored=await services().executeQuery(access,q('workflow.context',{workflow_ref:ref('rollback-project'),limit:1}));assert.equal(restored.workflow.title,'preserved V2');assert.equal(snapshot(),before);
 }
 old.sqlite.close();
});

await test('P07 AC05: Web client validates project in lists, exact documents, contexts and review drafts',async()=>{
 const fetcher=(path,init)=>handle(new Request('https://board.test'+path,{...init,headers:{...init.headers,'oai-authenticated-user-id':'owner'}}),{...f.env,COLLABORATION_BINDINGS:JSON.stringify({owner:{enabled:true,...access.actor,capabilities:access.capabilities}})});
 const registry=createProjectClient('local',fetcher);assert.deepEqual((await registry.list()).map(x=>x.project_ref.project_id),['legacy-personal','A','B']);
 let attempt=0;
 const uncertain=createProjectClient('local',async()=>{if(++attempt===1)throw Error('response lost');return Response.json({error:'forbidden',category:'forbidden',details:{}},{status:403});});
 const original=uncertain.command('project.create','uncertain','Unknown',0);
 await assert.rejects(uncertain.submit(original),e=>e.code==='network_unavailable'&&!e.definitive);
 await assert.rejects(uncertain.submit(original),e=>e.code==='forbidden'&&e.definitive===false);
 const refused=createProjectClient('local',async()=>Response.json({error:'forbidden'},{status:403}));
 await assert.rejects(refused.submit(original),e=>e.definitive===true);
 const web=createCollaborationClient('local',fetcher,'A');assert.equal((await web.capabilities()).project_id,'A');assert.equal((await web.find()).items.length,2);
 const context=await web.context(ref('A'));assert.equal(context.tasks.items.length,2);assert.equal((await web.document(ref('A'),plans.A)).content,'# A plan\n');
 await assert.rejects(web.context(ref('B')),e=>e.code==='project_mismatch');
 const bad=createCollaborationClient('local',async()=>Response.json({workflow_ref:ref('B'),ref:plans.A,content:'# A plan\n'}),'A');
 await assert.rejects(bad.document(ref('A'),plans.A),e=>e.code==='invalid_response');
 const c=structuredClone(context);c.tasks.items[0].status='completed';const t=c.tasks.items[0];
 assert.throws(()=>createReviewDraft(c,{key:'task:T1',kind:'task',id:'T1',version:1},{workflow_ref:ref('B'),snapshot_revision:c.revision,summary:t},{outcome:'accept',reason:'test'}),/快照不符/);
});

// Exercise two wire clients on a real loopback server and fresh CLI processes.
await test('P08 AC05: actual CLI processes and MCP HTTP calls continue A/B across sessions; version mismatch is rejected',async()=>{
 const token='wb1.synthetic.'+'a'.repeat(43),binding={enabled:true,...access.actor,capabilities:access.capabilities};
 const env={...f.env,COLLABORATION_BINDINGS:JSON.stringify({owner:binding}),COLLABORATION_SERVICE_CREDENTIALS:JSON.stringify({version:1,credentials:[{id:'synthetic',owner_id:'owner',token_sha256:await contentDigest(token),expires_at:'2099-01-01T00:00:00.000Z',enabled:true}]})};
 const server=createServer(async(req,res)=>{try{const bytes=[];for await(const part of req)bytes.push(part);const response=await handle(new Request('https://board.test'+req.url,{method:req.method,headers:req.headers,body:Buffer.concat(bytes).toString()}),env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());}catch{res.writeHead(500);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const endpoint='http://127.0.0.1:'+server.address().port;
 const parent=resolve(process.env.WORKFLOW_BOARD_TEST_ROOT??'.runtime');await mkdir(parent,{recursive:true});const scratch=await mkdtemp(resolve(parent,'project-clients-'));
 const cli=fileURLToPath(new URL('../Presentation/Cli/main.mjs',import.meta.url));
 const run=async(args,input)=>{if(input){const file=resolve(scratch,crypto.randomUUID()+'.json');await writeFile(file,JSON.stringify(input));args=[...args,'--file',file];}
  return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[cli,...args,'--endpoint',endpoint,'--store','local','--namespace','personal','--allow-loopback','--json'],{env:{...process.env,WORKFLOW_BOARD_TOKEN:token,WORKFLOW_BOARD_SITES_TOKEN:''},windowsHide:true});let out='',err='';child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);child.on('error',reject);child.on('exit',code=>{try{resolve({code,value:JSON.parse(out),err});}catch{reject(Error(out+err));}});});};
 const mcp=async(name,input)=>{const response=await fetch(endpoint+'/mcp',{method:'POST',headers:{'content-type':'application/json','mcp-protocol-version':'2025-11-25','oai-authenticated-user-id':'owner'},body:JSON.stringify({jsonrpc:'2.0',id:crypto.randomUUID(),method:'tools/call',params:{name,arguments:input}})});return (await response.json()).result;};
 try{
  for(const id of ['CLI-A','CLI-B']){
   const project=await run(['submit','--project',id],pc(id));assert.equal(project.code,0,JSON.stringify(project));
   const created=await mcp('v2_workflow_create',wc(id,'workflow.create',createPayload(id),0,'create'));assert.equal(created.isError,false,JSON.stringify(created));
   const context=await run(['context','--project',id,'--workflow','WF']);assert.equal(context.code,0,JSON.stringify(context));assert.equal(context.value.data.workflow.title,id);
   const update=await run(['submit','--project',id],wc(id,'document.append',{purpose:'supporting',document:{document_id:'result',expected_document_revision:0,content:id+' result'}},1,'update'));assert.equal(update.code,0,JSON.stringify(update));
   const read=await mcp('v2_document_read',q('document.read',{workflow_ref:ref(id),document_ref:{document_id:'result',revision:1,content_hash:await contentDigest(id+' result')}}));assert.equal(read.structuredContent.content,id+' result');
   const receipt=await run(['operation','--project',id,'--workflow','WF','--operation','update']);assert.equal(receipt.code,0);assert.equal(receipt.value.data.receipt.workflow_ref.project_id,id);
  }
  assert.equal((await run(['projects'])).value.data.items.length,5);
  const legacy=await run(['query','--contract','2','--project','legacy-personal'],q('project.read',{project_ref:projectRef('legacy-personal')}));assert.equal(legacy.code,0,JSON.stringify(legacy));assert.equal(legacy.value.data.workflow_contract,legacyEnvelope.service_contract_version);
  const preview=await run(['query','--contract','2'],q('project.legacy.preview',{store_id:'local',namespace:'personal'}));assert.equal(preview.code,0,JSON.stringify(preview));assert.equal(preview.value.data.mode,'identity-mapping-no-copy');
  const mismatch=await run(['submit','--project','CLI-B'],wc('CLI-A','workflow.create',createPayload('bad'),0,'never'));assert.equal(mismatch.code,2);
  const wrong=await mcp('workflow_context',q('workflow.context',{workflow_ref:ref('CLI-A'),limit:1}));assert.equal(wrong.isError,true);
  const response=await fetch(endpoint+'/api/collaboration/v1/queries',{method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(q('workflow.context',{workflow_ref:ref('A'),limit:1}))});assert.equal(response.status,501);
  const client=createRemoteCollaborationClient({endpoint,store:'local',namespace:'personal',project:'A',version:'2.0',token,timeoutMs:1000},async()=>Response.json({workflow_ref:ref('B'),ref:plans.A,content:'# A plan\n',created_at:'2026-10-25T00:00:00.000Z',actor:access.actor}));
  assert.equal((await client.query(q('document.read',{workflow_ref:ref('A'),document_ref:plans.A}))).error.code,'invalid_response');
 }finally{await new Promise(resolve=>server.close(resolve));}
});
f.sqlite.close();
console.log(JSON.stringify({scenarios:count,passed:true,baseline_worker_rollback:process.env.BOARD_BASELINE_WORKER?'passed':'not-run',scope:'local SQLite, Web client, CLI processes and MCP HTTP; no hosted/client-plugin acceptance'}));
