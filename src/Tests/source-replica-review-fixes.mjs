import assert from 'node:assert/strict';
import {sqliteCollaboration} from './Fixtures/collaboration-sqlite.mjs';
import {createCollaborationServices} from '../Presentation/WebApi/collaboration-services.mjs';
import {handle} from '../Presentation/WebApi/entry.mjs';
import {createRemoteCollaborationClient} from '../Presentation/Cli/collaboration-client.mjs';
import {createSourceReplica} from '../Core/Workflows/Application/source-replica.mjs';
import {createSourceReplicaRepository} from '../Infrastructure/Persistence/D1/source-replica-repository.mjs';
import {validateReplicaCommand,validateReplicaQuery} from '../Presentation/Shared/collaboration-validation.mjs';
import {valueDigest} from '../Core/Workflows/Domain/collaboration-values.mjs';
import {rawDigest,planReplicaChunkReads} from '../Core/Workflows/Domain/source-replica.mjs';
const f=sqliteCollaboration(),project_ref={store_id:'local',namespace:'personal',project_id:'A'},a={owner_id:'owner',actor:{subject_id:'agent',kind:'agent',binding_id:'binding'},capabilities:['read','plan']},env={DB:f.db,COLLABORATION_STORE_ID:'local',COLLABORATION_BINDINGS:JSON.stringify({owner:{enabled:true,...a.actor,capabilities:a.capabilities}})},svc=()=>createCollaborationServices(env);
const envelope={service_contract_version:'workflow-board/source-replica/1',schema_version:'1.0',project_ref},src={source_id:'sqlite',workflow_id:'WF',source_revision:'fixed-1'},command=(name,payload,operation_id=name)=>({...envelope,command:name,operation_id,expected_revision:0,payload:{...src,...payload}}),q=(query,payload)=>({...envelope,query,payload});
const projectCreate={service_contract_version:'workflow-board/collaboration/2',schema_version:'2.0',project_ref,command:'project.create',operation_id:'project',expected_revision:0,payload:{name:'A'}};await svc().executeCommand(a,projectCreate);
let count=0;async function test(name,fn){await fn();count++;console.log('PASS '+name);}
await test('P2 HTTP source-only route refuses foreign V1/V2 and wrong envelope kinds before native effects',async()=>{
 const tables=['collaboration_projects','collaboration_heads','project_collaboration_heads','collaboration_operations','project_collaboration_operations','source_replica_operations'],counts=()=>tables.map(t=>f.sqlite.prepare('SELECT count(*) AS n FROM '+t).get().n),before=counts();
 const v1={service_contract_version:'workflow-board/collaboration/1',schema_version:'1.0',workflow_ref:{store_id:'local',namespace:'personal',record_kind:'collaboration',workflow_id:'native'},command:'workflow.create',operation_id:'native-create',expected_revision:0,payload:{title:'Foreign',goal:'Must refuse',scope:{included:'test',excluded:'none'},skill:{id:'test',version:null},external_work_refs:[]}};
 const foreign=[{...projectCreate,project_ref:{...project_ref,project_id:'foreign'},operation_id:'foreign'},v1];
 const request=async(kind,input)=>handle(new Request('https://board.test/api/source-replica/v1/'+kind,{method:'POST',headers:{'content-type':'application/json','oai-authenticated-user-id':'owner'},body:JSON.stringify(input)}),env);
 for(const input of foreign)assert.equal((await request('commands',input)).status,501);
 assert.equal((await request('queries',{service_contract_version:v1.service_contract_version,schema_version:v1.schema_version,query:'capabilities',payload:{store_id:'local',namespace:'personal'}})).status,501);
 assert.equal((await request('commands',q('replica.capabilities',{}))).status,422);assert.deepEqual(counts(),before);
});
const raw=new Uint8Array(49152*5+23).map((_,i)=>i%251),sha256=await rawDigest(raw),manifest={source:{kind:'sqlite'},workflow:{id:'WF',title:'Fixed',status:'done'},files:[{path:'bytes.bin',mode:'100644',size:raw.length,sha256}]},manifest_hash=await valueDigest(manifest),begin=command('replica.begin',{manifest,manifest_hash});await svc().executeCommand(a,begin);
const chunks=[];for(let index=0;index<Math.ceil(raw.length/49152);index++){const bytes=raw.slice(index*49152,(index+1)*49152);chunks.push({path:'bytes.bin',index,content_base64:Buffer.from(bytes).toString('base64'),chunk_hash:await rawDigest(bytes)});}for(let i=0;i<chunks.length;i+=4)await svc().executeCommand(a,command('replica.chunk.put',{chunks:chunks.slice(i,i+4)},'chunks-'+i));
await test('activation bulk-read refuses missing/extra/duplicate/wrong refs and uses one bounded SQL read for six chunks',async()=>{
 const repo=createSourceReplicaRepository(f.db),options={projects:{requireProject:async()=>{}},storeId:'local',validateCommand:validateReplicaCommand,validateQuery:validateReplicaQuery},activate=command('replica.activate',{manifest_hash});
 for(const alter of [rows=>rows.slice(1),rows=>[...rows,rows[0]],rows=>rows.map((r,i)=>i===1?rows[0]:r),rows=>rows.map((r,i)=>i===0?{...r,path:'wrong'}:r)]){
  const bad=createSourceReplica({...options,repository:{...repo,readChunks:async(...args)=>alter(await repo.readChunks(...args))}});await assert.rejects(bad.executeCommand(a,activate),e=>['missing_chunk','chunk_reference_mismatch'].includes(e.error));assert.equal((await repo.head(a.owner_id,project_ref,src)),0);
 }
 let reads=0;const good=createSourceReplica({...options,repository:{...repo,readChunks:async(...args)=>{reads++;assert.ok(args[3].length<=64);return repo.readChunks(...args);}}});assert.equal((await good.executeCommand(a,activate)).accepted,true);assert.equal(reads,1);
});
await test('planner attains deterministic worst-case 32 bulk queries under allowed file/count/byte bounds',async()=>{
 const files=[{path:'large-a',size:16777216-499},{path:'large-b',size:16777216-499},...Array.from({length:998},(_,i)=>({path:'small-'+i,size:1}))],plan=planReplicaChunkReads(files),sizes=new Map(files.map(f=>[f.path,f.size]));
 assert.equal(files.reduce((n,f)=>n+f.size,0),33554432);assert.equal(files.length,1000);assert.equal(plan.length,32);
 for(const refs of plan){assert.ok(refs.length<=64);assert.ok(refs.reduce((n,r)=>n+Math.min(49152,sizes.get(r.path)-r.index*49152),0)<=2097152);}
 const expected=files.flatMap(file=>Array.from({length:Math.ceil(file.size/49152)},(_,index)=>({path:file.path,index})));assert.deepEqual(plan.flat(),expected);
 // <=1682 refs total; a byte-full group needs >=42 refs and >2048000 bytes.
 // At most16 byte-full groups. 64*C+42*B<=1682 => C+B<=31; final group =>32.
 console.log(JSON.stringify({max_activation_chunk_queries:32,rows:plan.flat().length,max_raw_bytes_per_query:2097152}));
});
const config={version:'2.0',project:'A',endpoint:'https://board.test',store:'local',namespace:'personal',token:'wb1.synthetic.'+'A'.repeat(43),timeoutMs:1000};
const valid={};for(const[name,payload]of [['replica.capabilities',{}],['replica.list',{limit:10,cursor:null}],['replica.read',src],['replica.manifest',{...src,offset:0,limit:10}],['replica.file.chunk',{...src,path:'bytes.bin',index:0}],['replica.chunks.read',{...src,refs:[{path:'bytes.bin',index:0}],max_response_bytes:300000}],['replica.operation.get',{operation_id:'replica.activate'}]])valid[name]={input:q(name,payload),data:await svc().executeQuery(a,q(name,payload))};
await test('CLI operation-specific queries refuse partial shapes, stale source versions and wrong same-project chunks/outcomes',async()=>{
 let attempts=0;
 for(const[name,{input,data}]of Object.entries(valid)){
  const mutations=[()=>({project_ref}),d=>{delete d[Object.keys(d).find(k=>k!=='project_ref')];return d;}];
  if(data.source_revision)mutations.push(d=>({...d,source_revision:'stale'}),d=>({...d,workflow_id:'other'}),d=>({...d,source_id:'other'}));
  if(name==='replica.manifest')mutations.push(d=>({...d,offset:1}),d=>({...d,has_more:true}));
  if(name==='replica.file.chunk')mutations.push(d=>({...d,path:'wrong'}),d=>({...d,index:1}),d=>({...d,chunk_hash:'sha256:'+'0'.repeat(64)}));
  if(name==='replica.chunks.read')mutations.push(d=>({...d,remaining:[{path:'other',index:0}]}),d=>({...d,chunks:[{...d.chunks[0],index:1}]}));
  if(name==='replica.operation.get')mutations.push(d=>({...d,operation_id:'other'}),d=>({...d,outcome:'rejected'}),d=>({...d,receipt:{...d.receipt,operation_id:'other'}}));
  if(name==='replica.list')mutations.push(d=>({...d,items:d.items.map(i=>({...i,workflow_id:'other'}))}));
  for(const change of mutations){const body=change(structuredClone(data)),client=createRemoteCollaborationClient(config,async()=>Response.json(body)),result=await client.query(input);assert.equal(result.status,'error',name+': '+JSON.stringify(body).slice(0,150));attempts++;}
  assert.equal((await createRemoteCollaborationClient(config,async()=>Response.json(data)).query(input)).status,'ok',name);
 }
 console.log(JSON.stringify({adversarial_query_responses:attempts}));
});
await test('CLI malformed/misrouted accepted or rejected command receipts stay unknown, preserving exact recovery command',async()=>{
 const receipt=await svc().executeCommand(a,begin),unknown={project_ref,operation_id:begin.operation_id,outcome:'unknown'};let attempts=0;
 for(const change of [r=>({project_ref,accepted:true,operation_id:r.operation_id,expected_revision:0}),r=>({...r,command:'replica.activate'}),r=>({...r,source_id:'other'}),r=>({...r,workflow_id:'other'}),r=>({...r,source_revision:'stale'}),r=>({...r,operation_id:'other'}),r=>({...r,revision:99}),r=>({...r,accepted:false,error:'revision_conflict',source_revision:'stale'})]){
  const body=change(structuredClone(receipt)),sent=[],client=createRemoteCollaborationClient(config,async(url,init)=>{const input=JSON.parse(init.body);sent.push(input);return Response.json(input.query?unknown:body,{status:body.accepted===false&&!input.query?409:200});}),result=await client.submit(begin);assert.equal(result.status,'unknown');assert.deepEqual(sent[0],begin);assert.deepEqual(sent[1],q('replica.operation.get',{operation_id:begin.operation_id}));attempts++;
 }
 console.log(JSON.stringify({adversarial_command_receipts:attempts}));
});
f.sqlite.close();console.log(`${count} review-repair scenarios passed`);
