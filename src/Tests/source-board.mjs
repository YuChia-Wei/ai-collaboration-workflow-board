import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sourceBoard} from '../Infrastructure/SourceCatalog/source-board.mjs';
import {sqliteCollaboration} from './Fixtures/collaboration-sqlite.mjs';
import {contentDigest,valueDigest} from '../Core/Workflows/Domain/collaboration-values.mjs';
import {rawDigest} from '../Core/Workflows/Domain/source-replica.mjs';
import {createSourceReplicaClient} from '../Presentation/Web/source-replica-client.mjs';
import {replicaBoardMarkup,replicaTaskMarkup} from '../Presentation/Web/source-replica-view.mjs';
const artifact=process.argv.includes('--artifact');
const createRemoteCollaborationClient=artifact?null:(await import('../Presentation/Cli/collaboration-client.mjs')).createRemoteCollaborationClient;
const handle=artifact?(await import('../../dist/server/index.js')).default.fetch:(await import('../Presentation/WebApi/entry.mjs')).handle;
const root=fileURLToPath(new URL('../../',import.meta.url));
const parent=resolve(process.env.WORKFLOW_BOARD_TEST_ROOT??resolve(root,'.runtime'));
await mkdir(parent,{recursive:true});const runtime=await mkdtemp(resolve(parent,'source-board-'));
const f=sqliteCollaboration(),token='wb1.synthetic.'+'a'.repeat(43);
const env={DB:f.db,COLLABORATION_STORE_ID:'local',COLLABORATION_BINDINGS:JSON.stringify({owner:{enabled:true,subject_id:'A',binding_id:'grant',capabilities:['read','plan']}}),
 COLLABORATION_SERVICE_CREDENTIALS:JSON.stringify({version:1,credentials:[{id:'synthetic',owner_id:'owner',token_sha256:await contentDigest(token),expires_at:'2099-01-01T00:00:00.000Z',enabled:true}]})};
const project=project_id=>({store_id:'local',namespace:'personal',project_id});
const envelope=id=>({service_contract_version:'workflow-board/source-replica/1',schema_version:'1.0',project_ref:project(id)});
const ref={source_id:'archive',workflow_id:'WF',source_revision:'fixed-1'};
const headers={'content-type':'application/json','oai-authenticated-user-id':'owner'};
async function post(path,input,extra={}){const r=await handle(new Request('https://board.test'+path,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(input)}),env);const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
const modernMeta={'io.modelcontextprotocol/protocolVersion':'2026-07-28','io.modelcontextprotocol/clientInfo':{name:'plugin-contract-test',version:'1'},'io.modelcontextprotocol/clientCapabilities':{}};
async function mcp(input,modern=false){
 const name='source_v1_'+(input.command??input.query).replaceAll('.','_');
 const result=await post('/mcp',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:input,...(modern?{_meta:modernMeta}:{})}},modern?{'mcp-protocol-version':'2026-07-28','mcp-method':'tools/call','mcp-name':name}:{'mcp-protocol-version':'2025-11-25'});
 assert.equal(result.result.isError,false,JSON.stringify(result));return result.result.structuredContent;
}
const server=createServer(async(req,res)=>{try{const parts=[];for await(const part of req)parts.push(part);const response=await handle(new Request('https://board.test'+req.url,{method:req.method,headers:req.headers,body:Buffer.concat(parts).toString()||undefined}),env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());}catch(error){res.writeHead(500);res.end(JSON.stringify({error:String(error)}));}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const endpoint='http://127.0.0.1:'+server.address().port;
let commandNumber=0,passed=0;
async function cli(input,id){
 const file=resolve(runtime,'command-'+(++commandNumber)+'.json');await writeFile(file,JSON.stringify(input));
 const child=spawn(process.execPath,[resolve(root,'src/Presentation/Cli/main.mjs'),input.command?'submit':'query','--file',file,'--project',id,'--allow-loopback','--json'],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,WORKFLOW_BOARD_ENDPOINT:endpoint,WORKFLOW_BOARD_STORE:'local',WORKFLOW_BOARD_NAMESPACE:'personal',WORKFLOW_BOARD_TOKEN:token,WORKFLOW_BOARD_SITES_TOKEN:''}});
 let stdout='',stderr='';child.stdout.on('data',p=>stdout+=p);child.stderr.on('data',p=>stderr+=p);
 const code=await new Promise((yes,no)=>{child.once('error',no);child.once('close',yes);});assert.equal(code,0,stdout+stderr);
 const result=JSON.parse(stdout);assert.equal(result.status,input.command?'accepted':'ok');return result.data??result.receipt;
}
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
const entries=[
 ['tasks/A.json',JSON.stringify({task_id:'A',status:'completed',owner_skill:'review',scope:{target:'歷史任務'},results:{summary:'已完成驗證'}})],
 ['tasks/B.yaml','metadata:\n  task_id: B\n  status: blocked\n  title: 等待輸入\ndepends_on: [A]\n'],
 ['workflow.json',JSON.stringify({tasks:[{id:'A',title:'過期 inline 副本',status:'pending'},{id:'C',title:'下一項',status:'pending'},{id:'D',title:'執行中',status:'in_progress'},{id:'E',title:'歷史完成',status:'done'},{id:'F',title:'延期',status:'deferred',deferred_reason:'等待來源'},{id:'G',title:'未記錄狀態'},{id:'H',title:'特殊狀態',status:'awaiting_source'}]})],
 ['plan.md','---\r\ntasks:\r\n  I:\r\n    title: frontmatter 任務\r\n    status: completed\r\n---\r\n# 原始計畫'],
 ['binary.zip',new Uint8Array([80,75,0,255])]
].map(([path,value])=>[path,typeof value==='string'?new TextEncoder().encode(value):value]);
const manifest={source:{kind:'archive-workflow'},workflow:{id:'WF',title:'同一份匯入資料',status:'completed',tasks:['A','tasks/B.yaml']},files:await Promise.all(entries.map(async([path,bytes])=>({path,size:bytes.length,mode:'100644',sha256:await rawDigest(bytes)})))};
const manifest_hash=await valueDigest(manifest);
async function upload(id,send,source=ref,m=manifest,files=entries,expected_revision=0){
 const hash=await valueDigest(m),commands=[['replica.begin',{manifest:m,manifest_hash:hash}]];
 const chunks=[];for(const [path,bytes]of files)for(let index=0;index<Math.ceil(bytes.length/49152);index++){const part=bytes.slice(index*49152,(index+1)*49152);chunks.push({path,index,content_base64:Buffer.from(part).toString('base64'),chunk_hash:await rawDigest(part)});}
 for(let i=0;i<chunks.length;i+=4)commands.push(['replica.chunk.put',{chunks:chunks.slice(i,i+4)}]);commands.push(['replica.activate',{manifest_hash:hash}]);
 for(let i=0;i<commands.length;i++){const [command,payload]=commands[i];await send({...envelope(id),command,payload:{...source,...payload},expected_revision,operation_id:source.source_revision+'-'+i});}
}
const browser=id=>createSourceReplicaClient(project(id),(path,init)=>handle(new Request('https://board.test'+path,{...init,headers:{...init.headers,'oai-authenticated-user-id':'owner'}}),env));
const boardQuery=(id,source=ref,offset=0,limit=50)=>({...envelope(id),query:'replica.board',payload:{...source,offset,limit}});
const expected=[['A','completed'],['B','blocked'],['C','pending'],['D','in_progress'],['E','done'],['F','deferred'],['G',null],['H','awaiting_source'],['I','completed']];
try{
 await test('CLI executable, MCP 2025 and plugin MCP 2026 writes produce identical verified board tasks',async()=>{
  const results=[];
  for(const id of ['CLI','MCP','PLUGIN']){
   await post('/api/collaboration/v2/commands',{service_contract_version:'workflow-board/collaboration/2',schema_version:'2.0',project_ref:project(id),command:'project.create',operation_id:'create-project',expected_revision:0,payload:{name:id}});
   const send=id==='CLI'?input=>cli(input,id):input=>mcp(input,id==='PLUGIN');await upload(id,send);
   const client=browser(id),header=await client.query('replica.read',ref),files=await client.manifest(ref,header);
   assert.equal(header.manifest_hash,manifest_hash);assert.deepEqual(files,manifest.files);
   const board=await client.board(ref,header);assert.deepEqual(board.tasks.map(t=>[t.id,t.status]),expected);assert.equal(board.projection_complete,true);
   assert.equal(board.tasks[0].title,'歷史任務');assert.equal(board.tasks[0].result_summary,'已完成驗證');assert.equal(board.tasks[0].source_path,'tasks/A.json');
   const toolRead=id==='CLI'?await cli(boardQuery(id),id):await mcp(boardQuery(id),id==='PLUGIN');assert.deepEqual(toolRead.tasks,board.tasks);
   results.push(board.tasks);
  }
  assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1],results[2]);
 });
 if(process.env.WORKFLOW_BOARD_PLUGIN_FIXTURE)await test('verified real plugin bytes produce the same tasks through CLI, MCP and browser reads',async()=>{
  const fixture=JSON.parse(await readFile(process.env.WORKFLOW_BOARD_PLUGIN_FIXTURE,'utf8'));
  assert.equal(await valueDigest(fixture.manifest),fixture.manifest_hash);
  assert.equal(fixture.plugin_read.manifest_hash,fixture.manifest_hash);assert.equal(fixture.plugin_read.complete,true);
  const files=fixture.entries.map(file=>[file.path,Buffer.from(file.content_base64,'base64')]),results=[];
  for(const [path,bytes] of files)assert.equal(await rawDigest(bytes),fixture.manifest.files.find(f=>f.path===path).sha256);
  for(const id of ['CLI','MCP','PLUGIN']){
   const send=id==='CLI'?input=>cli(input,id):input=>mcp(input,id==='PLUGIN');
   await upload(id,send,fixture.source_ref,fixture.manifest,files);
   const client=browser(id),header=await client.query('replica.read',fixture.source_ref),board=await client.board(fixture.source_ref,header);
   assert.deepEqual(board.tasks.map(t=>({id:t.id,status:t.status})),fixture.expected_tasks);
   const read=id==='CLI'?await cli(boardQuery(id,fixture.source_ref),id):await mcp(boardQuery(id,fixture.source_ref),id==='PLUGIN');
   assert.deepEqual(read.tasks,board.tasks);results.push(board.tasks);
  }
  assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1],results[2]);
 });
 await test('existing stored snapshots project without writes; old revisions stay fixed after a later import',async()=>{
  const before=f.sqlite.prepare('SELECT total_changes() AS n').get().n;
  const old=await post('/api/source-replica/v1/queries',boardQuery('MCP'));assert.equal(f.sqlite.prepare('SELECT total_changes() AS n').get().n,before);
  const updated={...manifest,workflow:{...manifest.workflow,tasks:[{id:'NEW',title:'新版任務',status:'pending'}]},files:[]};
  await upload('MCP',input=>mcp(input),{...ref,source_revision:'fixed-2'},updated,[],1);
  const latest=await post('/api/source-replica/v1/queries',boardQuery('MCP',{...ref,source_revision:'fixed-2'}));assert.equal(latest.total,1);assert.equal(latest.tasks[0].id,'NEW');
  assert.deepEqual(await post('/api/source-replica/v1/queries',boardQuery('MCP')),old);
 });
 await test('all task pages, scope/ref verification and incomplete/duplicate/stale responses',async()=>{
  let all=[];for(let offset=0;offset<expected.length;offset+=2){const page=await post('/api/source-replica/v1/queries',boardQuery('CLI',ref,offset,2));all.push(...page.tasks);assert.equal(page.has_more,offset+page.tasks.length<expected.length);}
  assert.deepEqual(all.map(t=>[t.id,t.status]),expected);
  const good=await post('/api/source-replica/v1/queries',boardQuery('CLI')),header=await browser('CLI').query('replica.read',ref);
  const config={version:'2.0',project:'CLI',endpoint:'https://board.test',store:'local',namespace:'personal',token,timeoutMs:1000};
  for(const mutate of [d=>({...d,source_revision:'wrong'}),d=>({...d,project_ref:project('MCP')}),d=>({...d,offset:9}),d=>({...d,has_more:true}),d=>({...d,tasks:[]}),d=>({...d,tasks:[d.tasks[0],d.tasks[0]],total:2})]){
   const bad=mutate(structuredClone(good));if(!artifact)assert.equal((await createRemoteCollaborationClient(config,async()=>Response.json(bad)).query(boardQuery('CLI'))).status,'error');
   await assert.rejects(createSourceReplicaClient(project('CLI'),async()=>Response.json(bad)).board(ref,header));
  }
  const denied=await handle(new Request('https://board.test/api/source-replica/v1/queries',{method:'POST',headers:{...headers,'oai-authenticated-user-id':'other'},body:JSON.stringify(boardQuery('CLI'))}),env);assert.notEqual(denied.status,200);
 });
 await test('historical/unknown status columns, card details, evidence links and HTML escaping',async()=>{
  const board=await browser('CLI').board(ref,await browser('CLI').query('replica.read',ref));
  const html=replicaBoardMarkup(board);for(const label of ['待處理','進行中','有阻礙','已完成','done · 歷史狀態','延期','來源未記錄','awaiting_source'])assert.ok(html.includes(label),label);
  assert.equal((html.match(/class="c-task-card"/g)||[]).length,9);
  const task=board.tasks[0];assert.match(replicaTaskMarkup(task,0),/已完成驗證/);assert.match(replicaTaskMarkup(task,0),/data-file="0"/);
  const hostile={...task,id:'<script>',title:'<img src=x onerror=alert(1)>',result_summary:'<script>evil()</script>'};
  assert.doesNotMatch(replicaBoardMarkup({...board,tasks:[hostile]})+replicaTaskMarkup(hostile,0),/<script>|<img src=x/);
 });
 await test('malformed tasks, duplicate IDs, YAML aliases and parser limits remain visible with raw files retained',async()=>{
  const docs=[['tasks/bad.json','{bad'],['tasks/one.json','{"id":"D","status":"done"}'],['tasks/two.json','{"id":"D","status":"pending"}'],['tasks/none.json','{}'],['tasks/alias.yaml','a: &a [*a, *a]\ntasks: *a']].map(([path,s])=>({file:{path},bytes:new TextEncoder().encode(s)}));
  const m={...manifest,files:[{path:'tasks/too-big.json',size:1048577,mode:'100644'},{path:'tasks/link.json',size:3,mode:'120000'},{path:'tasks/unsupported.xml',size:10,mode:'100644'}]};
  const result=await sourceBoard.project(m,(async function*(){yield* docs;})());
  assert.equal(result.projection_complete,false);assert.ok(result.issues.some(x=>x.code==='duplicate_task_id'));assert.ok(result.issues.some(x=>x.code==='document_too_large'));assert.ok(result.issues.some(x=>x.code==='invalid_source_document'));assert.equal(result.tasks[0].status,'done');
  assert.match(replicaBoardMarkup(result),/部分來源內容未能完整轉為任務/);
 });
 await test('large Unicode cards and diagnostics keep bounded, complete pagination',async()=>{
  const long='𠮷'.repeat(2001),task={title:long,description:long,result_summary:long,status:long,owner_skill:long,deferred_reason:long,dependencies:Array(50).fill('𠮷'.repeat(101))};
  const key='map-key-'.repeat(2000),body=new TextEncoder().encode(JSON.stringify({tasks:{[key]:{...task,id:'J'}}}));
  const docs=[...Array.from({length:6},(_,i)=>['tasks/bulk-'+i+'.json',body])];
  const m={source:manifest.source,workflow:manifest.workflow,files:await Promise.all(docs.map(async([path,bytes])=>({path,mode:'100644',size:bytes.length,sha256:await rawDigest(bytes)})))};
  // Separate declared IDs avoid conflating bounded paging with duplicate handling.
  for(let i=0;i<docs.length;i++){docs[i][1]=new TextEncoder().encode(JSON.stringify({tasks:{[key]:{...task,id:'J'+i}}}));m.files[i].size=docs[i][1].length;m.files[i].sha256=await rawDigest(docs[i][1]);}
  const source={...ref,source_revision:'large-cards'};await upload('CLI',input=>mcp(input),source,m,docs,1);
  const first=await mcp(boardQuery('CLI',source));assert.equal(first.has_more,true);assert.ok(first.tasks.length<6);assert.ok(Buffer.byteLength(JSON.stringify(first))<=260000);
  const board=await browser('CLI').board(source,await browser('CLI').query('replica.read',source));assert.equal(board.tasks.length,6);assert.ok(board.tasks.every(t=>t.details_truncated));
  const badFiles=Array.from({length:50},(_,i)=>({path:'tasks/'+i+'𠮷'.repeat(490)+'.xml',size:1,mode:'100644'}));
  const partial=await sourceBoard.project({...manifest,workflow:{...manifest.workflow,tasks:[]},files:badFiles,tasks:[{id:'valid'},false]},(async function*(){})());
  assert.equal(partial.issue_count,51);assert.ok(partial.issues.length<50);assert.equal(partial.projection_complete,false);
 });
 await test('corrupt stored file bytes fail the board query rather than display fabricated tasks',async()=>{
  f.sqlite.prepare("UPDATE source_replica_chunks SET chunk_hash=? WHERE path='tasks/A.json'").run('sha256:'+'0'.repeat(64));
  const response=await handle(new Request('https://board.test/api/source-replica/v1/queries',{method:'POST',headers,body:JSON.stringify(boardQuery('CLI'))}),env);
  assert.equal(response.status,409);assert.match((await response.json()).error,/chunk_hash/);
 });
 console.log(`${passed} source-board scenarios passed (${artifact?'packaged Worker':'source'}, real CLI subprocess + HTTP + both MCP protocols; local SQLite, no hosted-client claim)`);
}finally{await new Promise(resolve=>server.close(resolve));f.sqlite.close();}
