import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {sqliteCollaboration} from '../Tests/Fixtures/collaboration-sqlite.mjs';
import {contentDigest} from '../Core/Workflows/Domain/collaboration-values.mjs';

// Same observable read outcomes; neither fixture models legacy multi-agent writes.
const artifact=process.argv.includes('--artifact');
const handle=artifact?(await import('../../dist/server/index.js')).default.fetch:(await import('../Presentation/WebApi/entry.mjs')).handle;
const output=process.argv.find(a=>a.startsWith('--output='))?.slice(9);
assert.ok(output,'Supply --output=<new evidence file>');
const {db,sqlite}=sqliteCollaboration();
const env={DB:db,COLLABORATION_STORE_ID:'benchmark',COLLABORATION_BINDINGS:JSON.stringify({owner:{enabled:true,subject_id:'A',binding_id:'grant-A',capabilities:['read','plan','execute','manage']}})};
const headers={'content-type':'application/json','oai-authenticated-user-id':'owner'};
const envelope={service_contract_version:'workflow-board/collaboration/1',schema_version:'1.0'};
const ref={store_id:'benchmark',namespace:'personal',record_kind:'collaboration',workflow_id:'BENCH'};
const scope={included:'Synthetic comparison',excluded:'Deployment'};
const content='# Plan\n'+('共同文件內容，保留指定版本。\n'.repeat(100));
const plan={document_id:'plan',revision:1,content_hash:await contentDigest(content)};
const tasks=Array.from({length:20},(_,i)=>({id:'T'+(i+1),title:'Task '+(i+1),status:'pending'}));
let operation=0,legacyRevision=0,newRevision=0,rpcId=0;
async function seed(path,body){
 const response=await handle(new Request('https://benchmark.test'+path,{method:'POST',headers,body:JSON.stringify(body)}),env);
 const value=await response.json();assert.ok(response.ok,JSON.stringify(value));assert.equal(value.accepted,true,JSON.stringify(value));return value;
}
async function oldCommand(type,payload){const r=await seed('/api/commands',{service_contract_version:'framework-board/1',workflow_id:'BENCH',operation_id:'old-'+(++operation),expected_revision:legacyRevision,type,payload});legacyRevision=r.revision;}
async function command(command,payload){const r=await seed('/api/collaboration/v1/commands',{...envelope,workflow_ref:ref,operation_id:'new-'+(++operation),expected_revision:newRevision,command,payload});newRevision=r.revision;}
await oldCommand('create_workflow',{title:'Benchmark',goal:'Resume work',workflow_kind:'software-development',owner_skill:'workflow-owner',authorized_scope:scope.included,next_step:'Read plan',next_owner:'workflow-owner',extensions:{}});
for(const t of tasks)await oldCommand('add_task',{id:t.id,title:t.title,owner_skill:'implementer',dependencies:[]});
await oldCommand('document',{id:'plan',action:'create',name:'plan.md',content,final:true});
await command('workflow.create',{title:'Benchmark',goal:'Resume work',scope,skill:{id:'test',version:null},external_work_refs:[]});
await command('plan.revise',{plan:{document_id:'plan',expected_document_revision:0,content},execution_impact:'declared',task_changes:tasks.map(t=>({kind:'add',definition:{id:t.id,title:t.title,description:'Deliver',scope,completion_criteria:['done'],dependencies:[],plan_basis:plan,inputs:[],expected_artifacts:[],decision_ids:[],workstream:null}})),unaffected_task_ids:[],decision_dispositions:[],completion_requirements:[{id:'R',description:'Deliver',task_ids:tasks.map(t=>t.id),document_refs:[]}],requirement_dispositions:[]});

// Ephemeral loopback only. A random in-memory bearer protects the synthetic test
// owner injection; this is not evidence of Sites OAuth or remote authentication.
const bearer=randomUUID();
const server=createServer(async(req,res)=>{
 try{
  if(req.headers.authorization!=='Bearer '+bearer){res.writeHead(401);res.end();return;}
  if(!['/mcp','/api/workflows/BENCH?mode=board','/api/workflows/BENCH/documents/plan?mode=board&revision=1'].includes(req.url)){res.writeHead(404);res.end();return;}
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>320000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
  const body=Buffer.concat(chunks);const forwarded={...req.headers,...headers};delete forwarded.authorization;delete forwarded.host;delete forwarded['content-length'];
  const result=await handle(new Request('http://127.0.0.1'+req.url,{method:req.method,headers:forwarded,...(body.length?{body}: {})}),env);
  res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
 }catch{res.writeHead(500);res.end('benchmark request failed');}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin='http://127.0.0.1:'+server.address().port;
const runs=[],discovery=[];
async function exchange(path,body,record,extra={}){
 const data=body===undefined?undefined:JSON.stringify(body);
 const response=await fetch(origin+path,{method:data?'POST':'GET',headers:{authorization:'Bearer '+bearer,'content-type':'application/json',...extra},body:data});
 const raw=await response.text();record.push({status:response.status,request_body_bytes:Buffer.byteLength(data??''),response_body_bytes:Buffer.byteLength(raw)});
 assert.equal(response.status,200,raw);return JSON.parse(raw);
}
async function rpc(method,params,record){return exchange('/mcp',{jsonrpc:'2.0',id:++rpcId,method,params:{...params,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28','io.modelcontextprotocol/clientInfo':{name:'fixed-benchmark',version:'1'},'io.modelcontextprotocol/clientCapabilities':{}}}},record,{'mcp-protocol-version':'2026-07-28','mcp-method':method,...(params.name?{'mcp-name':params.name}:{})});}
async function query(name,payload,record){const r=await rpc('tools/call',{name:name.replaceAll('.','_'),arguments:{...envelope,query:name,payload}},record);assert.equal(r.result.isError,false,JSON.stringify(r));return r.result.structuredContent;}
const sort=items=>items.map(({id,title,status})=>({id,title,status})).sort((a,b)=>a.id.localeCompare(b.id));
try{
 await rpc('server/discover',{},discovery);
 const catalog=await rpc('tools/list',{},discovery);assert.equal(catalog.result.tools.length,26);
 for(let iteration=1;iteration<=5;iteration++)for(const scenario of ['workflow-summary','specified-document'])for(const profile of ['legacy-http','collaboration-mcp']){
  const exchanges=[];let value;
  if(profile==='legacy-http'){
   const {workflow:w}=await exchange('/api/workflows/BENCH?mode=board',undefined,exchanges);
   value=scenario==='workflow-summary'?{goal:w.goal,scope:w.authorized_scope,tasks:sort(Object.values(w.steps))}:(await exchange('/api/workflows/BENCH/documents/plan?mode=board&revision=1',undefined,exchanges)).revision.content;
  }else{
   const w=await query('workflow.context',{workflow_ref:ref,limit:20},exchanges);
   assert.equal(w.tasks.has_more,false);
   value=scenario==='workflow-summary'?{goal:w.workflow.goal,scope:w.workflow.scope.included,tasks:sort(w.tasks.items)}:(await query('document.read',{workflow_ref:ref,document_ref:plan},exchanges)).content;
  }
  assert.deepEqual(value,scenario==='workflow-summary'?{goal:'Resume work',scope:scope.included,tasks:sort(tasks)}:content);
  runs.push({iteration,scenario,profile,oracle_passed:true,round_trips:exchanges.length,request_body_bytes:exchanges.reduce((s,x)=>s+x.request_body_bytes,0),response_body_bytes:exchanges.reduce((s,x)=>s+x.response_body_bytes,0),exchanges});
 }
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 const report={recorded_at:new Date().toISOString(),node:process.version,git_head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),subject:artifact?'bundled Worker':'production source',worker_sha256:artifact?sha(readFileSync(new URL('../../dist/server/index.js',import.meta.url))):null,benchmark_sha256:sha(readFileSync(new URL(import.meta.url))),scope:'Local loopback HTTP + real SQLite, synthetic matched 20-task fixtures. Reads only; no model, hosted latency, OAuth, debit or multi-agent write comparison.',measurement:'UTF-8 JSON bodies only; excludes headers, TLS, prompts and model serialization. MCP includes both content and structuredContent as transmitted.',tokens:{schema:null,input:null,output:null,status:'not_measured'},actual_debit:null,success:'Deterministic oracle passes per fixed run, not an estimate of model task success probability.',discovery:{profile:'collaboration-mcp',exchanges:discovery,schema_json_bytes:Buffer.byteLength(JSON.stringify(catalog.result.tools)),legacy:'not_applicable: direct HTTP has no MCP catalog'},runs};
 const destination=resolve(output);mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({output:destination,runs:runs.length,passed:runs.every(r=>r.oracle_passed),summary:runs.filter(r=>r.iteration===1),discovery:report.discovery,tokens:report.tokens},null,2));
}finally{await new Promise(resolve=>server.close(resolve));sqlite.close();}
