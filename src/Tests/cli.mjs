import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {handle} from '../Presentation/WebApi/entry.mjs';
import {sqliteCollaboration} from './Fixtures/collaboration-sqlite.mjs';
import {contentDigest} from '../Core/Workflows/Domain/collaboration-values.mjs';
import {createRemoteCollaborationClient} from '../Presentation/Cli/collaboration-client.mjs';
import {parseArguments} from '../Presentation/Cli/arguments.mjs';

const {db,sqlite}=sqliteCollaboration();
const root=fileURLToPath(new URL('../../',import.meta.url));
const cli=fileURLToPath(new URL('../Presentation/Cli/main.mjs',import.meta.url));
// Public deterministic fixture credentials, never hosted credentials.
const token='wb1.synthetic.'+'a'.repeat(43);
const otherToken='wb1.synthetic.'+'b'.repeat(43);
const credential={id:'synthetic',owner_id:'owner',token_sha256:await contentDigest(token),expires_at:'2099-01-01T00:00:00.000Z',enabled:true};
const binding={enabled:true,subject_id:'A',binding_id:'grant-A',capabilities:['read','plan','execute','manage']};
const env={DB:db,COLLABORATION_STORE_ID:'local',COLLABORATION_BINDINGS:JSON.stringify({owner:binding}),COLLABORATION_SERVICE_CREDENTIALS:JSON.stringify({version:1,credentials:[credential]})};
const envelope={service_contract_version:'workflow-board/collaboration/1',schema_version:'1.0'};
const ref={store_id:'local',namespace:'personal',record_kind:'collaboration',workflow_id:'CLI-WF'};
const scope={included:'Synthetic CLI acceptance',excluded:'Hosted data and deployment'};
const runtimeParent=resolve(process.env.WORKFLOW_BOARD_TEST_ROOT??resolve(root,'.runtime'));
await (await import('node:fs/promises')).mkdir(runtimeParent,{recursive:true});
const runtime=await mkdtemp(resolve(runtimeParent,'cli-test-'));
const requests=[];
let serverMode=null;
const server=createServer(async(req,res)=>{
 try{
  const parts=[];for await(const part of req)parts.push(part);
  const raw=Buffer.concat(parts).toString();
  const body=raw?JSON.parse(raw):null;
  requests.push({path:req.url,body,hasOwner:!!req.headers['oai-authenticated-user-id']});
  if(serverMode==='redirect'){
   res.writeHead(302,{Location:'http://127.0.0.1:1/never'});res.end();return;
  }
  if(serverMode==='html'){res.writeHead(200,{'Content-Type':'text/html'});res.end(token);return;}
  const request=new Request('https://board.test'+req.url,{method:req.method,headers:req.headers,body:raw||undefined});
  const response=await handle(request,env);
  if(serverMode==='drop-command'&&req.url.endsWith('/commands')){serverMode=null;req.socket.destroy();return;}
  let text=await response.text();
  if(serverMode==='wrong-document'&&body?.query==='document.read'){
   const data=JSON.parse(text);data.content='tampered';text=JSON.stringify(data);
  }
  if(serverMode==='wrong-snapshot'&&body?.query==='context.page'){
   const data=JSON.parse(text);data.revision++;text=JSON.stringify(data);
  }
  if(serverMode==='echo-secret'&&body?.query==='capabilities'){
   res.writeHead(403,{'Content-Type':'application/json'});
   res.end(JSON.stringify({error:'forbidden',category:'forbidden',details:{diagnostic:token}}));return;
  }
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(text);
 }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end('{}');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const endpoint='http://127.0.0.1:'+server.address().port;
const clientEnv={...process.env,WORKFLOW_BOARD_ENDPOINT:endpoint,WORKFLOW_BOARD_STORE:'local',WORKFLOW_BOARD_NAMESPACE:'personal',WORKFLOW_BOARD_TOKEN:token,WORKFLOW_BOARD_SITES_TOKEN:''};
let passed=0,sequence=0,revision=0;
async function test(name,run){await run();passed++;console.log('PASS '+name);}
async function run(args,overrides={}){
 const child=spawn(process.execPath,[cli,...args],{cwd:root,env:{...clientEnv,...overrides},windowsHide:true,stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='';
 child.stdout.on('data',part=>stdout+=part);child.stderr.on('data',part=>stderr+=part);
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
 assert.ok(!stdout.includes(token)&&!stderr.includes(token),'the fixture credential must never appear in CLI output');
 return {code,stdout,stderr,data:stdout.trim().startsWith('{')?JSON.parse(stdout):null};
}
const args=(command,...rest)=>[command,'--allow-loopback','--json',...rest];
const ask=async(command,...rest)=>{
 const r=await run(args(command,...rest));assert.equal(r.code,0,JSON.stringify(r));return r.data.data;
};
async function save(value,name='command-'+(++sequence)+'.json'){
 const path=resolve(runtime,name);await writeFile(path,typeof value==='string'?value:JSON.stringify(value));return path;
}
async function submit(name,payload){
 const input={...envelope,workflow_ref:ref,operation_id:'cli-'+(++sequence),expected_revision:revision,command:name,payload};
 const file=await save(input);
 const r=await run(args('submit','--file',file));
 assert.equal(r.code,0,JSON.stringify(r));assert.equal(r.data.status,'accepted');
 revision=r.data.data.revision;return {input,file,receipt:r.data.data};
}
const queryInput=(query,payload)=>({...envelope,query,payload});
const capabilities=queryInput('capabilities',{store_id:'local',namespace:'personal'});
async function direct(input,configuration=env,headers={}){
 const response=await handle(new Request('https://board.test/api/collaboration/v1/queries',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,...headers},body:JSON.stringify(input)}),configuration);
 return {status:response.status,data:await response.json()};
}
try{
 await test('C01: version/help are offline; missing and ambiguous settings fail before any HTTP request',async()=>{
  assert.equal((await run(['version','--json'],{WORKFLOW_BOARD_TOKEN:''})).data.data.version,'0.1.0');
  assert.match((await run(['help'],{WORKFLOW_BOARD_TOKEN:''})).stdout,/operation ID/);
  const before=requests.length;
  assert.equal((await run(args('capabilities'),{WORKFLOW_BOARD_NAMESPACE:''})).code,2);
  assert.equal((await run(args('capabilities','--store','local','--store','other'))).code,2);
  assert.equal((await run(args('capabilities'),{WORKFLOW_BOARD_SITES_TOKEN:'synthetic-sites-token'})).code,2);
  assert.equal((await run(['capabilities','--json'])).code,2,'loopback requires explicit synthetic opt-in');
  assert.equal(requests.length,before);
  const options=parseArguments(['capabilities','--endpoint','https://board.test','--store','explicit','--namespace','personal'],{...clientEnv,WORKFLOW_BOARD_SITES_TOKEN:'synthetic-sites-token'});
  assert.equal(options.store,'explicit');
 });

 await test('C06: HTTP service credentials are independent of Sites identity; invalid input never falls back',async()=>{
  assert.equal((await direct(capabilities)).status,200);
  assert.equal((await direct(capabilities,env,{Authorization:'Bearer '+otherToken,'oai-authenticated-user-id':'owner'})).status,401);
  assert.equal((await direct(capabilities,env,{Authorization:'Basic nope','oai-authenticated-user-id':'owner'})).status,401);
  for(const changed of [{enabled:false},{expires_at:'2000-01-01T00:00:00.000Z'}]){
   assert.equal((await direct(capabilities,{...env,COLLABORATION_SERVICE_CREDENTIALS:JSON.stringify({version:1,credentials:[{...credential,...changed}]})})).status,401);
  }
  assert.equal((await direct(capabilities,{...env,COLLABORATION_SERVICE_CREDENTIALS:undefined})).status,503);
  assert.equal((await direct(capabilities,{...env,COLLABORATION_SERVICE_CREDENTIALS:JSON.stringify({version:1,credentials:[credential,credential]})})).status,503);
  assert.equal((await direct(capabilities,{...env,COLLABORATION_BINDINGS:JSON.stringify({owner:{...binding,enabled:false}})})).status,403);
  assert.equal((await direct(capabilities,{...env,COLLABORATION_BINDINGS:JSON.stringify({owner:{...binding,capabilities:['read','decide']}})})).status,503);
  // Rotation retains the same actor, and a removed old credential no longer works.
  const rotated='wb1.rotation.'+'c'.repeat(43);
  const rotation={...credential,id:'rotation',token_sha256:await contentDigest(rotated)};
  const next={...env,COLLABORATION_SERVICE_CREDENTIALS:JSON.stringify({version:1,credentials:[rotation]})};
  assert.equal((await direct(capabilities,next)).status,401);
  assert.equal((await direct(capabilities,next,{Authorization:'Bearer '+rotated})).status,200);
 });

 await test('C02: fresh CLI processes complete create/plan/start/read/claim/progress/release and resume',async()=>{
  const caps=await ask('capabilities');assert.equal(caps.commands.length,18);
  assert.ok(!caps.commands.includes('decision.resolve'));
  await submit('workflow.create',{title:'CLI synthetic',goal:'CLI handoff',scope,skill:{id:'cli-test',version:null},external_work_refs:[]});
  const content='# CLI plan\n',plan={document_id:'plan',revision:1,content_hash:await contentDigest(content)};
  const definitions=Array.from({length:3},(_,i)=>({id:'T'+(i+1),title:'Task '+(i+1),description:'Deliver',scope,completion_criteria:['result'],dependencies:[],plan_basis:plan,inputs:[],expected_artifacts:[],decision_ids:[],workstream:null}));
  await submit('plan.revise',{plan:{document_id:'plan',expected_document_revision:0,content},execution_impact:'declared',task_changes:definitions.map(definition=>({kind:'add',definition})),unaffected_task_ids:[],decision_dispositions:[],completion_requirements:[{id:'R1',description:'Deliver',task_ids:['T1'],document_refs:[]}],requirement_dispositions:[]});
  await submit('workflow.start',{});
  const found=await ask('find','--query','CLI');assert.equal(found.items[0].workflow_ref.workflow_id,ref.workflow_id);
  const first=await ask('context','--workflow',ref.workflow_id,'--limit','1');
  assert.equal(first.tasks.has_more,true);assert.equal(first.tasks.items[0].assignment,null);
  const page=await ask('page','--workflow',ref.workflow_id,'--section','tasks','--cursor',first.tasks.cursor,'--at-revision',String(first.revision));
  assert.equal(page.revision,first.revision);
  assert.equal((await run(args('page','--workflow',ref.workflow_id,'--section','tasks','--cursor',first.tasks.cursor,'--at-revision','1'))).code,3);
  const complete=await ask('context','--workflow',ref.workflow_id,'--limit','1','--all');
  assert.equal(complete.tasks.items.length,3);assert.equal(complete.tasks.has_more,false);
  const task=await ask('task','--workflow',ref.workflow_id,'--task','T1','--at-revision',String(complete.revision),'--definition-revision','1');assert.equal(task.summary.id,'T1');
  const doc=await ask('document','--workflow',ref.workflow_id,'--document','plan','--document-revision','1','--hash',plan.content_hash);
  assert.equal(doc.content,content);
  await submit('task.claim',{task_id:'T1',expected_definition_revision:1,session:{client:'cli',label:'first',skill_id:null}});
  const active=await ask('context','--workflow',ref.workflow_id);
  const assignment=active.tasks.items.find(t=>t.id==='T1').assignment.ref;
  const progress=await submit('task.progress',{task_id:'T1',assignment,summary:'Progress from CLI',evidence:[]});
  const replay=await run(args('submit','--file',progress.file));assert.equal(replay.code,0);assert.deepEqual(replay.data.data,progress.receipt);
  assert.deepEqual((await ask('operation','--workflow',ref.workflow_id,'--operation',progress.input.operation_id)).receipt,progress.receipt);
  const handoff={completed:'CLI saved progress',remaining:'Finish task',next_step:'Inspect plan revision 1',artifact_refs:[{kind:'document',ref:plan}],blockers:[],limitations:[],next_actor_hint:null};
  await submit('task.release',{task_id:'T1',assignment,handoff});
  const resumed=await ask('context','--workflow',ref.workflow_id,'--all');
  assert.equal(resumed.tasks.items.find(t=>t.id==='T1').assignment,null);
  assert.equal(resumed.handoffs.items[0].handoff.next_step,handoff.next_step);
  await submit('task.claim',{task_id:'T1',expected_definition_revision:1,session:null});
  const second=await ask('context','--workflow',ref.workflow_id);
  assert.equal(second.tasks.items.find(t=>t.id==='T1').assignment.ref.generation,2);
  await submit('decision.open',{decision_id:'D1',question:'Synthetic review',options:['accept'],required_decider:{kind:'human'},blocks:{task_ids:[],workflow_closure:true},basis:[plan]});
  const decision=await ask('decision','--workflow',ref.workflow_id,'--decision','D1','--at-revision',String(revision),'--decision-revision','1');
  assert.equal(decision.decision.question,'Synthetic review');
  assert.deepEqual(await ask('query','--file',await save(capabilities)),caps);
  assert.ok(requests.every(r=>!r.hasOwner),'the CLI never supplies an authenticated-user header');
 });

 await test('C04: exact versions, payload/actor spoofing and revision conflicts are refused without hidden retries',async()=>{
  const doc=await run(args('document','--workflow',ref.workflow_id,'--document','plan','--document-revision','2','--hash','sha256:'+'0'.repeat(64)));
  assert.equal(doc.code,4);
  const context=await ask('context','--workflow',ref.workflow_id);
  const c={...envelope,workflow_ref:ref,operation_id:'conflict',expected_revision:1,command:'workflow.pause',payload:{reason:'stale'}};
  const file=await save(c);
  const before=requests.filter(r=>r.path.endsWith('/commands')).length;
  const conflict=await run(args('submit','--file',file));
  assert.equal(conflict.code,4);assert.equal(conflict.data.data.failure.error,'revision_conflict');
  assert.equal(requests.filter(r=>r.path.endsWith('/commands')).length,before+1);
  assert.equal((await ask('context','--workflow',ref.workflow_id)).revision,context.revision);
  const altered=await save({...c,payload:{reason:'different same operation'}});
  const reuse=await run(args('submit','--file',altered));
  assert.equal(reuse.code,4);assert.equal(reuse.data.error.code,'operation_payload_conflict');
  const forged=await save({...c,operation_id:'forged',actor:{kind:'human'}});
  assert.equal((await run(args('submit','--file',forged))).code,2);
  const duplicates=await save('{"query":"capabilities","query":"workflow.find"}','duplicates.json');
  assert.equal((await run(args('query','--file',duplicates))).code,2);
  assert.equal((await run(args('query','--file',await save('null','null.json')))).code,2);
 });

 await test('C05: lost command response stays unknown; original file replay recovers one durable effect',async()=>{
  const input={...envelope,workflow_ref:ref,operation_id:'lost-response',expected_revision:revision,command:'workflow.pause',payload:{reason:'Synthetic loss'}};
  const file=await save(input);
  const before=requests.filter(r=>r.path.endsWith('/commands')).length;
  serverMode='drop-command';
  const lost=await run(args('submit','--file',file));
  assert.equal(lost.code,5);assert.equal(lost.data.status,'unknown');
  assert.equal(lost.data.reconciliation.data.outcome,'accepted');
  assert.equal(requests.filter(r=>r.path.endsWith('/commands')).length,before+1,'no automatic POST retry');
  const recovered=await run(args('submit','--file',file));
  assert.equal(recovered.code,0);revision=recovered.data.data.revision;
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM collaboration_operations WHERE operation_id=?').get('lost-response').n,1);
  assert.equal((await run(args('operation','--workflow',ref.workflow_id,'--operation','never-sent'))).code,5);
 });

 await test('C03/C06: redirects, wrong documents, invalid output and credentials fail safely',async()=>{
  const denied=await run(args('capabilities'),{WORKFLOW_BOARD_TOKEN:otherToken});assert.equal(denied.code,4);
  serverMode='redirect';assert.equal((await run(args('capabilities'))).data.error.code,'redirect_refused');
  serverMode='html';assert.equal((await run(args('capabilities'))).code,3);
  serverMode='echo-secret';const echo=await run(args('capabilities'));assert.equal(echo.code,4);assert.equal(echo.data.redacted,true);
  serverMode='wrong-document';
  assert.equal((await run(args('document','--workflow',ref.workflow_id,'--document','plan','--document-revision','1','--hash',await contentDigest('# CLI plan\n')))).data.error.code,'invalid_response');
  serverMode='wrong-snapshot';
  const incomplete=await run(args('context','--workflow',ref.workflow_id,'--limit','1','--all'));
  assert.equal(incomplete.code,3);assert.equal(incomplete.data.error.code,'snapshot_mismatch');assert.equal(incomplete.data.data,undefined);
  serverMode=null;
  env.COLLABORATION_BINDINGS=JSON.stringify({owner:{...binding,capabilities:['read']}});
  const file=await save({...envelope,workflow_ref:ref,operation_id:'denied',expected_revision:revision,command:'workflow.resume',payload:{}});
  assert.equal((await run(args('submit','--file',file))).code,4);
  assert.equal((await ask('capabilities')).commands.length,0);
  env.COLLABORATION_BINDINGS=JSON.stringify({owner:binding});
  serverMode='html';
  const before=requests.filter(r=>r.path.endsWith('/commands')).length;
  assert.equal((await run(args('submit','--file',file))).data.command_sent,false);
  assert.equal(requests.filter(r=>r.path.endsWith('/commands')).length,before);
  serverMode=null;
 });

 await test('C07: existing MCP and CLI HTTP use equivalent shared-agent receipts and context',async()=>{
  const input=queryInput('workflow.context',{workflow_ref:ref,limit:20});
  const http=await ask('context','--workflow',ref.workflow_id);
  const response=await handle(new Request('https://board.test/mcp',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':'owner','mcp-protocol-version':'2025-11-25'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'workflow_context',arguments:input}})}),env);
  assert.equal(response.status,200);assert.deepEqual((await response.json()).result.structuredContent,http);
  const received=[];
  const config={endpoint:'https://board.test',store:'local',namespace:'personal',token,sitesToken:'synthetic-platform-token',timeoutMs:1000};
  const remote=createRemoteCollaborationClient(config,async(url,options)=>{
   received.push({url,headers:options.headers,redirect:options.redirect});
   return handle(new Request(url,options),env);
  });
  assert.equal((await remote.query(capabilities)).status,'ok');
  assert.equal(received[0].headers.Authorization,'Bearer '+token);
  assert.equal(received[0].headers['OAI-Sites-Authorization'],'Bearer synthetic-platform-token');
  assert.equal(received[0].redirect,'manual');
 });
 console.log(JSON.stringify({scenarios:passed,passed:true,scope:'local HTTP + fresh CLI subprocesses + existing MCP adapter; synthetic credentials; not Sites ingress or hosted D1',evidence_directory:runtime}));
}finally{
 server.closeAllConnections();
 await new Promise(resolve=>server.close(resolve));
 sqlite.close();
}
