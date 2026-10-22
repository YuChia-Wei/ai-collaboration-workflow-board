import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,appendFile,copyFile,access} from 'node:fs/promises';
import {resolve,join,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {openTrialRuntime,sha256} from './Lib/trial-runtime.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const [action,runId]=process.argv.slice(2);
assert.ok(['start','validate','resume','status'].includes(action),'Use: npm run trial:collaboration -- <start|validate|resume|status> <run-id>');
assert.match(runId??'',/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/,'A run ID must be an ASCII identifier, with no path separators');
const directory=join(root,'.runtime','collaboration-trials',runId);
const session={id:randomUUID(),pid:process.pid,action,started_at:new Date().toISOString(),node:process.version,platform:process.platform};
const envelope={service_contract_version:'workflow-board/collaboration/1',schema_version:'1.0'};
const ref={store_id:'board-project-trial',namespace:'personal',record_kind:'collaboration',workflow_id:runId};
const skillRoot='.ai/core/skills/software-development-orchestrator';
const selectedSources=['package.json','package-lock.json','drizzle.config.ts','.openai/hosting.json','AGENTS.md','README.md','ARCHITECTURE.md','PLATFORM-CONTRACT.md','.gitignore','.ai/custom/installation.json','.ai/framework.lock',`${skillRoot}/SKILL.md`,`${skillRoot}/skill-package.yaml`,`${skillRoot}/references/orchestrate.md`,'.agents/skills/software-development-orchestrator/SKILL.md','.agents/skills/slice-implementer/SKILL.md','.ai/core/skills/slice-implementer/SKILL.md','.ai/core/skills/slice-implementer/skill-package.yaml','.ai/core/skills/slice-implementer/references/implement.md','.ai/core/skills/slice-implementer/references/modes/generic.md','.dev/guides/collaboration-trial.md'];
const writeJson=(name,value,options={})=>writeFile(join(directory,name),JSON.stringify(value,null,2)+'\n',options);
const readJson=async name=>JSON.parse(await readFile(join(directory,name),'utf8'));
const exists=async path=>{try{await access(path);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}};
function git(...args){const result=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stderr);return result.stdout.trim();}
async function sourcePaths(){
 const files=git('ls-files','--cached','--others','--exclude-standard','--','src/Core','src/Presentation','src/Infrastructure','src/Contracts','src/Tooling','src/Tests').split(/\r?\n/).filter(Boolean);
 return [...new Set([...selectedSources,...files])].sort();
}
async function hashSources(paths){return Promise.all(paths.map(async path=>{const bytes=await readFile(join(root,path));return {path,sha256:sha256(bytes),bytes:bytes.length};}));}
function runPackage(name){
 assert.ok(['test','build','validate'].includes(name));
 assert.ok(process.env.npm_execpath,'Run the trial through npm run trial:collaboration so the same npm CLI is used.');
 const started_at=new Date().toISOString();
 const result=spawnSync(process.execPath,[process.env.npm_execpath,'run',name],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,windowsHide:true,timeout:600000});
 return {command:`npm run ${name}`,started_at,finished_at:new Date().toISOString(),exit_code:result.status,signal:result.signal,error:result.error?.message??null,stdout:result.stdout??'',stderr:result.stderr??''};
}
async function saveExecution(name,result){await writeJson(name,result,{flag:'wx'});assert.equal(result.exit_code,0,`${result.command} failed; evidence retained at ${join(directory,name)}`);}
async function verifySourceSnapshot(){
 const manifest=await readJson('source-manifest.json');
 assert.deepEqual(await hashSources(await sourcePaths()),manifest.sources,'Source drift: start a new run; do not attach new-source validation to old evidence.');
 for(const item of manifest.sources)assert.equal(sha256(await readFile(join(directory,'source',item.path))),item.sha256,'Saved source changed: '+item.path);
 return manifest;
}

if(action==='start'){
 await mkdir(dirname(directory),{recursive:true});await mkdir(directory); // Refuse overwrite/reuse of an existing trial.
 await mkdir(join(directory,'operations'));await mkdir(join(directory,'snapshots'));
 const paths=await sourcePaths(),sources=await hashSources(paths);
 const build=runPackage('build');await saveExecution('prepare-build.json',build);
 assert.deepEqual(await hashSources(paths),sources,'Source changed during the build');
 for(const item of sources){const target=join(directory,'source',item.path);await mkdir(dirname(target),{recursive:true});await copyFile(join(root,item.path),target);assert.equal(sha256(await readFile(target)),item.sha256);}
 await copyFile(join(root,'dist/server/index.js'),join(directory,'worker.mjs'));
 await writeJson('source-manifest.json',{run_id:runId,created_at:session.started_at,head:git('rev-parse','HEAD'),worktree_status:git('status','--short'),sources,worker:{file:'worker.mjs',sha256:sha256(await readFile(join(directory,'worker.mjs')))},evidence_policy:'Local user authorization, copied installed skills and source, command outputs and durable receipts are retained. Online state is supplementary, not the sole evidence. This is not hosted or independent-agent acceptance.'},{flag:'wx'});
}
await access(join(directory,'source-manifest.json'));
const host=await openTrialRuntime(directory);let rpcId=0;
async function rpc(method,params={}){
 const request={jsonrpc:'2.0',id:++rpcId,method,params:{...params,_meta:{'io.modelcontextprotocol/protocolVersion':'2026-07-28','io.modelcontextprotocol/clientInfo':{name:'workflow-board-local-trial',version:'1'},'io.modelcontextprotocol/clientCapabilities':{}}}};
 const result=await host.request(request);
 await appendFile(join(directory,'mcp-transcript.jsonl'),JSON.stringify({session:session.id,at:new Date().toISOString(),request,response:result})+'\n');
 assert.equal(result.status,200,JSON.stringify(result.body));assert.ok(!result.body.error,JSON.stringify(result.body));return result.body.result;
}
async function tool(name,input,allowRejected=false){
 const result=await rpc('tools/call',{name,arguments:input});
 if(!allowRejected)assert.equal(result.isError,false,JSON.stringify(result));
 return result.structuredContent;
}
const query=(name,payload)=>tool(name.replaceAll('.','_'),{...envelope,query:name,payload});
const context=()=>query('workflow.context',{workflow_ref:ref,limit:20});
async function command(operation,name,payload,allowRejected=false){
 const path=join(directory,'operations',operation+'.request.json');let input;
 if(await exists(path)){input=JSON.parse(await readFile(path,'utf8'));assert.equal(input.command,name);assert.deepEqual(input.payload,payload,'Do not reuse an operation ID with changed payload');}
 else{
  input={...envelope,workflow_ref:ref,operation_id:operation,expected_revision:name==='workflow.create'?0:(await context()).revision,command:name,payload};
  await writeFile(path,JSON.stringify(input,null,2)+'\n',{flag:'wx'});
 }
 const receipt=await tool(name.replaceAll('.','_'),input,allowRejected);
 await writeJson('operations/'+operation+'.receipt.json',receipt);
 assert.equal(receipt.accepted,!allowRejected,JSON.stringify(receipt));return receipt;
}
async function document(id,content){await command('document-'+id,'document.append',{document:{document_id:id,expected_document_revision:0,content},purpose:'supporting'});return {document_id:id,revision:1,content_hash:sha256(Buffer.from(content))};}
const handoff={completed:'本機驗證輸出及來源已保存',remaining:'以新程序讀回同一工作並驗證重新認領',next_step:'執行 trial:collaboration resume；先讀 context、plan、指定 task definition，再認領',artifact_refs:[],blockers:[],limitations:['只有本機 loopback HTTP 與 SQLite；不代表 Sites 認證或不同模型 Agent session'],next_actor_hint:'同一可信本機試用 binding 的新程序'};
async function assignment(taskId){return (await context()).tasks.items.find(t=>t.id===taskId)?.assignment?.ref;}
async function claim(taskId,operation){return command(operation,'task.claim',{task_id:taskId,expected_definition_revision:1,session:{label:session.id,client:'local-trial-node-process',skill_id:taskId==='VALIDATE'?'slice-implementer':'software-development-orchestrator'}});}
async function complete(taskId,operation,summary,artifact){
 return command(operation,'task.complete',{task_id:taskId,assignment:await assignment(taskId),result:{summary,criterion_results:[{criterion_index:0,outcome:'satisfied',explanation:summary,evidence_ids:[]}],artifacts:artifact?[{kind:'document',ref:artifact}]:[],evidence:[],limitations:['本機試行證據；不代表 hosted 驗收、獨立 review 或使用者正式採用']}});
}
async function saveContext(label){const value=await context();await writeJson('snapshots/'+label+'-'+session.id+'.json',value,{flag:'wx'});return value;}
try{
 await appendFile(join(directory,'sessions.jsonl'),JSON.stringify(session)+'\n');
 await rpc('server/discover');
 const capabilities=await query('capabilities',{store_id:ref.store_id,namespace:'personal'});assert.ok(capabilities.commands.includes('task.claim'));
 if(action==='start'){
  const manifest=await readJson('source-manifest.json');
  const selection=JSON.parse(await readFile(join(directory,'source/.ai/custom/installation.json'),'utf8'));assert.ok(selection.skills.includes('software-development-orchestrator'));assert.ok(selection.skills.includes('slice-implementer'));
  const skill=await readFile(join(directory,'source',skillRoot,'SKILL.md'),'utf8');assert.match(skill,/does not prescribe a/);assert.match(skill,/does\s+not implement the retired/);
  const mapping={source_skill:'software-development-orchestrator@0.2.0',mapping:[['goal','Workflow.goal'],['inputs / accepted artifacts','plan 原文、指定 document refs 與 source-manifest'],['output / check','TaskDefinition.completion_criteria 與 Result'],['owner / specialist','plan 內的 skill ID；實際 actor 由可信 adapter 提供'],['dependencies','TaskDefinition.dependencies'],['pending decision','Decision 與未完成項目'],['resume / handoff','context、指定版次讀取、handoff／assignment generation']],limits:['Skill 是流程指引，沒有自動 store writer；本專案 trial adapter 明確執行 DTO 寫入。','不宣稱全部已安裝 skills 已自動整合。'],sources:manifest.sources.filter(s=>s.path.startsWith(skillRoot)||s.path==='.ai/custom/installation.json'||s.path==='.ai/framework.lock')};
  await writeJson('skill-workflow-map.json',mapping,{flag:'wx'});
  const scope={included:'本專案 skill-workflow 對照、本機 MCP/SQLite 試用、保存多來源證據及跨程序續接',excluded:'push、merge、部署、線上權威切換、框架安裝變更、真實多人或多 Agent 身分隔離'};
  await command('workflow-create','workflow.create',{title:'Workflow Board 專案內試用',goal:'讓本專案以已安裝 skill 指引操作 collaboration MVP，保留可離線回查的證據',scope,skill:{id:'software-development-orchestrator',version:'0.2.0'},external_work_refs:[]});
  const planText=['# 專案內試行計畫','授權：使用者同意在自己專案測試試用，並要求不要以線上來源作唯一證據。','MAP：核對已安裝 skill 指引與 workflow 資訊。Owner：software-development-orchestrator@0.2.0。','VALIDATE：執行現有 Board test/build/validate，保留輸出及来源 hash。Owner：slice-implementer@0.2.0（generic）。','RESUME：新 OS process 讀回計畫與交接、重新認領，確認舊 assignment 被拒絕。Owner：software-development-orchestrator@0.2.0 resume。','單一可信本機測試 binding；程序 session 僅為描述資訊。','證據：source-manifest.json、source/、SQLite、mcp-transcript.jsonl、operations/、執行 logs。線上 Issues 的工作權威不被 trial store 取代。','結案只代表本機試行條件完成；hosted、真實 Agent session 與正式採用仍待另行驗證。'].join('\n');
  const plan={document_id:'plan',revision:1,content_hash:sha256(Buffer.from(planText))};
  const tasks=[['MAP','核對 skill 與 workflow 對照',[], '保存可回查的 skill 來源與欄位對照'],['VALIDATE','執行本機專案驗證',['MAP'],'固定來源下 test/build/validate 通過並保存輸出'],['RESUME','新程序續接與 generation fence',['VALIDATE'],'讀回原版並重新認領，舊 assignment 拒絕且保留回條']];
  await command('plan-revise','plan.revise',{plan:{document_id:'plan',expected_document_revision:0,content:planText},execution_impact:'declared',task_changes:tasks.map(([id,title,dependencies,criterion])=>({kind:'add',definition:{id,title,description:title+'；owner／inputs／checks 詳見固定版次 plan 與本機 guide。',scope,completion_criteria:[criterion],dependencies,plan_basis:plan,inputs:[],expected_artifacts:[],decision_ids:[],workstream:null}})),unaffected_task_ids:[],decision_dispositions:[],completion_requirements:tasks.map(([id,title])=>({id:'R-'+id,description:title,task_ids:[id],document_refs:[]})),requirement_dispositions:[]});
  await command('workflow-start','workflow.start',{});await claim('MAP','claim-map');
  const mapDoc=await document('skill-map',JSON.stringify(mapping,null,2));await complete('MAP','complete-map','已讀取所選 skill 原文並保存 map 與 raw SHA-256；沒有假設自動 workflow writer',mapDoc);
  await claim('VALIDATE','claim-validation');await command('progress-validation','task.progress',{task_id:'VALIDATE',assignment:await assignment('VALIDATE'),summary:'試用資料與 Worker 已固定；等待執行既有專案驗證',evidence:[]});
  await writeJson('trial.json',{run_id:runId,workflow_ref:ref,plan_ref:plan,created_session:session,source_manifest_sha256:sha256(await readFile(join(directory,'source-manifest.json')))},{flag:'wx'});
 }else if(action==='validate'){
  await verifySourceSnapshot();assert.ok(!(await exists(join(directory,'validation-attempt.json'))),'Validation already attempted; retain its evidence and use a new run after any failure or source change.');
  await writeJson('validation-attempt.json',{session,status:'started'},{flag:'wx'});
  const executions=[];
  for(const name of ['test','build','validate']){const result=runPackage(name);await saveExecution('validation-'+name+'.json',result);executions.push({command:result.command,exit_code:result.exit_code,file:'validation-'+name+'.json',sha256:sha256(await readFile(join(directory,'validation-'+name+'.json')))});}
  const manifest=await verifySourceSnapshot();assert.equal(sha256(await readFile(join(root,'dist/server/index.js'))),manifest.worker.sha256,'Rebuilt Worker differs from pinned trial artifact');
  const evidence=await document('validation',JSON.stringify({executions,source_manifest_sha256:sha256(await readFile(join(directory,'source-manifest.json'))),scope:'local repository commands and pinned Worker; not hosted D1 or live plugin'},null,2));
  await complete('VALIDATE','complete-validation','test/build/validate 全部 exit 0；來源未漂移且重新建置的 Worker hash 相同',evidence);
  await claim('RESUME','claim-resume-original');const oldAssignment=await assignment('RESUME');
  await command('release-for-resume','task.release',{task_id:'RESUME',assignment:oldAssignment,handoff:{...handoff,artifact_refs:[{kind:'document',ref:evidence}]}});
  await writeJson('resume-anchor.json',{session,old_assignment:oldAssignment,revision:(await context()).revision,validation_document:evidence},{flag:'wx'});
  await writeJson('validation-result.json',{status:'passed',session,executions},{flag:'wx'});
 }else if(action==='resume'){
  const trial=await readJson('trial.json'),anchor=await readJson('resume-anchor.json');
  assert.notEqual(session.id,anchor.session.id);assert.notEqual(session.pid,anchor.session.pid,'Run resume in a new OS process');
  assert.equal(sha256(await readFile(join(directory,'source-manifest.json'))),trial.source_manifest_sha256);
  const before=await context();assert.equal(before.revision,anchor.revision);assert.equal(before.tasks.items.find(t=>t.id==='RESUME').assignment,null);
  const plan=await query('document.read',{workflow_ref:ref,document_ref:trial.plan_ref});assert.equal(sha256(Buffer.from(plan.content)),trial.plan_ref.content_hash);
  await query('document.read',{workflow_ref:ref,document_ref:anchor.validation_document});
  const task=await query('task.read',{workflow_ref:ref,task_id:'RESUME',definition_revision:1,at_revision:before.revision});assert.equal(task.summary.status,'pending');
  await claim('RESUME','claim-resume-new');const current=await assignment('RESUME');assert.equal(current.generation,anchor.old_assignment.generation+1);
  const rejected=await command('old-assignment-rejected','task.progress',{task_id:'RESUME',assignment:anchor.old_assignment,summary:'舊程序延遲回報（預期拒絕）',evidence:[]},true);assert.equal(rejected.failure.error,'assignment_expired');
  const recovered=await query('operation.get',{workflow_ref:ref,operation_id:'old-assignment-rejected'});assert.deepEqual(recovered.receipt,rejected);
  const resumeEvidence={previous_session:anchor.session,current_session:session,read_revision:before.revision,plan_hash:plan.ref.content_hash,old_assignment:anchor.old_assignment,new_assignment:current,rejected_operation:rejected.operation_id,outcome:'passed',limitation:'new Node OS process, not an independently reasoning AI agent or actual Sites client'};
  await writeJson('resume-evidence.json',resumeEvidence,{flag:'wx'});const doc=await document('resume-evidence',JSON.stringify(resumeEvidence,null,2));
  await complete('RESUME','complete-resume','新程序讀回原版、generation 遞增；舊 assignment 即使使用最新 revision 仍拒絕，原 rejected receipt 可回查',doc);
  await command('workflow-complete','workflow.complete',{summary:'本專案本機試行三個任務完成；hosted／真實 Agent sessions／正式採用仍未驗證',document_refs:[trial.plan_ref,anchor.validation_document,doc]});
  await writeJson('trial-report.json',{status:'local-trial-passed',workflow_ref:ref,context:await context(),resume:resumeEvidence,validation:await readJson('validation-result.json'),source_manifest_sha256:trial.source_manifest_sha256,evidence:['source/','source-manifest.json','worker.mjs','board.sqlite','mcp-transcript.jsonl','operations/','sessions.jsonl','validation-test.json','validation-build.json','validation-validate.json'],not_proven:['hosted D1','Sites authentication','real plugin connection','independent AI agent sessions','automatic integration of every installed skill','token savings','formal adoption']},{flag:'wx'});
 }
 const snapshot=await saveContext(action);
 console.log(JSON.stringify({run_id:runId,action,workflow_status:snapshot.workflow.status,revision:snapshot.revision,tasks:snapshot.tasks.items.map(t=>({id:t.id,status:t.status,generation:t.assignment?.ref.generation??null})),directory,scope:'local loopback MCP and durable SQLite; no hosted changes'},null,2));
}catch(error){await appendFile(join(directory,'failures.jsonl'),JSON.stringify({session,at:new Date().toISOString(),error:String(error)})+'\n');throw error;}
finally{await host.close();}
