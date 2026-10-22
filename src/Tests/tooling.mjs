// Artifact integration regressions. Run after npm run build; all records are synthetic.
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,readdir,copyFile,cp} from 'node:fs/promises';
import {resolve,join,dirname,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {sqliteCollaboration} from './Fixtures/collaboration-sqlite.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
const artifact=join(root,'dist/server/index.js');
const workerBytes=await readFile(artifact); // Deliberately require the actual built Worker.
const worker=(await import(pathToFileURL(artifact).href)).default;
const sha=bytes=>'sha256:'+createHash('sha256').update(bytes).digest('hex');
const parent=resolve(process.env.BOARD_TOOLING_TEST_ROOT??join(root,'.runtime','tooling-tests'));
await mkdir(parent,{recursive:true});
const evidence=await mkdtemp(join(parent,'run-'));
const json=async(path,value)=>writeFile(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const layouts={legacy:'src/board/backend/schema/migrations',current:'src/Infrastructure/Persistence/D1/Migrations'};
let passed=0,failed=0;
async function scenario(name,run){
 try{await run();passed++;console.log('PASS '+name);}
 catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}
}
async function checkout(name){
 // Two levels keep even the old ../../.runtime bug inside this disposable suite.
 const directory=join(evidence,name,'checkout');await mkdir(directory,{recursive:true});
 await json(join(directory,'package.json'),{type:'module'});
 for(const file of ['src/Tooling/collaboration-ui-preview.mjs','src/Tooling/collaboration-ui-fixture.mjs','src/Tooling/collaboration-trial.mjs','src/Tooling/Lib/trial-runtime.mjs','src/Tests/Fixtures/collaboration-sqlite.mjs']){
  await mkdir(dirname(join(directory,file)),{recursive:true});await copyFile(join(root,file),join(directory,file));
 }
 await cp(join(root,'src/Core'),join(directory,'src/Core'),{recursive:true});
 await cp(join(root,layouts.current),join(directory,layouts.current),{recursive:true});
 await mkdir(join(directory,'dist/server'),{recursive:true});await writeFile(join(directory,'dist/server/index.js'),workerBytes);
 return directory;
}
function processFor(script,args,cwd){
 const child=spawn(process.execPath,['--experimental-sqlite',script,...args],{cwd,windowsHide:true,stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='';child.stdout.on('data',part=>{stdout+=part;});child.stderr.on('data',part=>{stderr+=part;});
 const exit=new Promise((done,fail)=>{child.once('error',fail);child.once('close',(code,signal)=>done({code,signal,stdout,stderr}));});
 return {child,exit,output:()=>stdout};
}
async function runTrial(directory,action,runId){
 const process=processFor(join(directory,'src/Tooling/collaboration-trial.mjs'),[action,runId],evidence);
 const timer=setTimeout(()=>process.child.kill(),20000);
 try{return await process.exit;}finally{clearTimeout(timer);}
}
async function preview(name,explicit){
 const directory=await checkout(name),cwd=join(evidence,name,'caller');await mkdir(cwd);
 const args=['--port','0',...(explicit?['--output','chosen-evidence']:[])];
 const process=processFor(join(directory,'src/Tooling/collaboration-ui-preview.mjs'),args,cwd);
 const timeout=setTimeout(()=>process.child.kill(),15000);
 try{
  await new Promise((done,fail)=>{
   const inspect=()=>{if(/Evidence: .+\r?\n/.test(process.output()))done();};
   process.child.stdout.on('data',inspect);inspect();
   process.exit.then(result=>fail(Error('Preview exited before readiness: '+JSON.stringify(result))),fail);
  });
  const output=process.output();
  const url=output.match(/Synthetic local preview: (.+)/)[1].trim();
  const destination=output.match(/Evidence: (.+)/)[1].trim();
  if(explicit)assert.equal(destination,join(cwd,'chosen-evidence'));
  else assert.equal(dirname(destination),join(directory,'.runtime','wb07-ui'),'Default evidence must remain under the repository root, regardless of cwd');
  const saved=await readJson(join(destination,'preview-evidence.json'));
  assert.equal(saved.worker_sha256,sha(workerBytes).slice(7));
  const response=await fetch(url);assert.equal(response.status,200);assert.match(await response.text(),/collaboration-preview/);
 }finally{clearTimeout(timeout);process.child.kill();await process.exit;}
}
async function filesBelow(directory,prefix=''){
 const result=new Map();
 for(const item of await readdir(join(directory,prefix),{withFileTypes:true})){
  const name=join(prefix,item.name);
  if(item.isDirectory())for(const [key,value] of await filesBelow(directory,name))result.set(key,value);
  else if(!/^board\.sqlite(?:-|$)/.test(item.name))result.set(name,await readFile(join(directory,name)));
 }
 return result;
}
async function unchanged(directory,before){
 for(const [name,bytes] of before){
  const current=await readFile(join(directory,name));
  if(['sessions.jsonl','mcp-transcript.jsonl'].includes(name))assert.deepEqual(current.subarray(0,bytes.length),bytes,'Append-only history changed: '+name);
  else assert.deepEqual(current,bytes,'Existing snapshot/evidence was rewritten: '+name);
 }
}
function databaseRows(path){
 const sql=new DatabaseSync(path,{readOnly:true});
 try{return sql.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,sql.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'"').all()]);}
 finally{sql.close();}
}
async function trialFixture(directory,layout){
 const runId=layout+'-fixture',trial=join(directory,'.runtime/collaboration-trials',runId);
 for(const child of ['source','operations','snapshots'])await mkdir(join(trial,child),{recursive:true});
 const migrationRoot=join(trial,'source',layouts[layout]);await cp(join(root,layouts.current),migrationRoot,{recursive:true});
 const sourceFiles=await filesBelow(join(trial,'source'));
 const sources=[...sourceFiles].map(([path,bytes])=>({path:path.replaceAll('\\','/'),sha256:sha(bytes),bytes:bytes.length}));
 await writeFile(join(trial,'worker.mjs'),workerBytes);
 await json(join(trial,'source-manifest.json'),{run_id:runId,sources,worker:{file:'worker.mjs',sha256:sha(workerBytes)},fixture:'legacy/current source-layout regression; not historical acceptance evidence'});
 const manifestHash=sha(await readFile(join(trial,'source-manifest.json')));
 const {sqlite,db}=sqliteCollaboration();
 const ref={store_id:'board-project-trial',namespace:'personal',record_kind:'collaboration',workflow_id:runId};
 const envelope={service_contract_version:'workflow-board/collaboration/1',schema_version:'1.0'};
 const env={DB:db,COLLABORATION_STORE_ID:ref.store_id,COLLABORATION_BINDINGS:JSON.stringify({'local-trial-owner':{enabled:true,subject_id:'project-trial-agent',binding_id:'local-project-trial-v1',capabilities:['read','plan','execute','manage']}})};
 let revision=0,operation=0;
 async function post(kind,body){
  const response=await worker.fetch(new Request('http://fixture.local/api/collaboration/v1/'+kind,{method:'POST',headers:{'content-type':'application/json','oai-authenticated-user-id':'local-trial-owner'},body:JSON.stringify(body)}),env);
  const value=await response.json();assert.equal(response.status,200,JSON.stringify(value));return value;
 }
 const context=()=>post('queries',{...envelope,query:'workflow.context',payload:{workflow_ref:ref,limit:20}});
 async function command(name,payload){
  const input={...envelope,workflow_ref:ref,operation_id:'fixture-'+(++operation),expected_revision:revision,command:name,payload};
  const receipt=await post('commands',input);assert.equal(receipt.accepted,true,JSON.stringify(receipt));revision=receipt.revision;
  await json(join(trial,'operations',input.operation_id+'.request.json'),input);await json(join(trial,'operations',input.operation_id+'.receipt.json'),receipt);
 }
 const session={id:'fixture-previous-process',pid:0};
 const scope={included:'Synthetic compatibility regression',excluded:'Hosted changes'};
 const content='# Fixed synthetic trial plan';const plan={document_id:'plan',revision:1,content_hash:sha(Buffer.from(content))};
 const validationText='Synthetic setup only; not a record of historical test execution.';
 const validation={document_id:'validation',revision:1,content_hash:sha(Buffer.from(validationText))};
 try{
  await command('workflow.create',{title:'Saved trial fixture',goal:'Resume without rewriting evidence',scope,skill:{id:'fixture',version:null},external_work_refs:[]});
  await command('plan.revise',{plan:{document_id:'plan',expected_document_revision:0,content},execution_impact:'declared',task_changes:[{kind:'add',definition:{id:'RESUME',title:'Resume',description:'Continue a saved trial',scope,completion_criteria:['Preserve saved evidence and complete the resumed task'],dependencies:[],plan_basis:plan,inputs:[],expected_artifacts:[],decision_ids:[],workstream:null}}],unaffected_task_ids:[],decision_dispositions:[],completion_requirements:[{id:'R-RESUME',description:'Resume the saved trial',task_ids:['RESUME'],document_refs:[]}],requirement_dispositions:[]});
  await command('workflow.start',{});
  await command('document.append',{document:{document_id:'validation',expected_document_revision:0,content:validationText},purpose:'supporting'});
  await command('task.claim',{task_id:'RESUME',expected_definition_revision:1,session:null});
  const oldAssignment=(await context()).tasks.items[0].assignment.ref;
  await command('task.release',{task_id:'RESUME',assignment:oldAssignment,handoff:{completed:'Fixture preparation',remaining:'Resume task',next_step:'Read saved plan and resume',artifact_refs:[],blockers:[],limitations:['Synthetic regression fixture'],next_actor_hint:null}});
  await json(join(trial,'trial.json'),{run_id:runId,workflow_ref:ref,plan_ref:plan,source_manifest_sha256:manifestHash});
  await json(join(trial,'resume-anchor.json'),{session,old_assignment:oldAssignment,revision,validation_document:validation});
  await json(join(trial,'validation-result.json'),{status:'fixture-only',executions:[],note:validationText});
  await json(join(trial,'snapshots/previous.json'),await context());
  await writeFile(join(trial,'sessions.jsonl'),JSON.stringify({fixture:true,session})+'\n');
  await writeFile(join(trial,'mcp-transcript.jsonl'),JSON.stringify({fixture:true,note:'Historical evidence sentinel'})+'\n');
  sqlite.exec('CREATE TABLE trial_migrations(name TEXT PRIMARY KEY, digest TEXT NOT NULL)');
  for(const entry of sources.filter(item=>item.path.endsWith('.sql')))sqlite.prepare('INSERT INTO trial_migrations VALUES(?,?)').run(entry.path.split('/').at(-1),entry.sha256);
  sqlite.prepare('VACUUM INTO ?').run(join(trial,'board.sqlite'));
 }finally{sqlite.close();}
 return {trial,runId,revision,migrationRoot};
}

await scenario('R1: preview CLI defaults to repository .runtime from an unrelated cwd',()=>preview('preview-default',false));
await scenario('R1: explicit preview output remains relative to the caller cwd',()=>preview('preview-explicit',true));
for(const layout of ['legacy','current'])await scenario('R2: '+layout+' trial status/resume preserve saved bytes and append history',async()=>{
 const directory=await checkout('trial-'+layout),{trial,runId,revision}=await trialFixture(directory,layout);
 const before=await filesBelow(trial),rows=databaseRows(join(trial,'board.sqlite'));
 const status=await runTrial(directory,'status',runId);assert.equal(status.code,0,status.stderr);
 assert.equal(JSON.parse(status.stdout).revision,revision);assert.deepEqual(databaseRows(join(trial,'board.sqlite')),rows,'Status changed persisted domain records');
 await unchanged(trial,before);
 const resume=await runTrial(directory,'resume',runId);assert.equal(resume.code,0,resume.stderr);
 const output=JSON.parse(resume.stdout);assert.equal(output.workflow_status,'completed');assert.equal(output.tasks[0].status,'completed');
 const proof=await readJson(join(trial,'resume-evidence.json'));assert.equal(proof.new_assignment.generation,proof.old_assignment.generation+1);
 assert.equal((await readJson(join(trial,'operations/old-assignment-rejected.receipt.json'))).failure.error,'assignment_expired');
 await unchanged(trial,before);
 assert.equal((await readJson(join(trial,'trial-report.json'))).validation.status,'fixture-only');
 assert.ok((await readdir(join(trial,'snapshots'))).length>=3,'Status and resume should append new snapshots');
});
await scenario('R2: a changed pinned legacy migration is rejected despite a valid current-layout decoy',async()=>{
 const directory=await checkout('trial-tampered'),{trial,runId,migrationRoot}=await trialFixture(directory,'legacy');
 await cp(join(root,layouts.current),join(trial,'source',layouts.current),{recursive:true});
 const name=(await readdir(migrationRoot)).find(name=>name.endsWith('.sql'));
 await writeFile(join(migrationRoot,name),(await readFile(join(migrationRoot,name)))+'\n-- changed pinned source\n');
 const before=await filesBelow(trial),rows=databaseRows(join(trial,'board.sqlite'));
 const result=await runTrial(directory,'status',runId);assert.notEqual(result.code,0);assert.match(result.stderr,/Pinned trial migration changed/);
 await unchanged(trial,before);assert.deepEqual(databaseRows(join(trial,'board.sqlite')),rows);
});
console.log(JSON.stringify({passed,failed,evidence,scope:'Synthetic subprocess and bundled-Worker integration; no hosted changes'}));
if(failed)process.exitCode=1;
