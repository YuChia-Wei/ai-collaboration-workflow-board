import {createSourceReplicaClient} from '../Presentation/Web/source-replica-client.mjs';
import assert from 'node:assert/strict';
import {sqliteCollaboration} from './Fixtures/collaboration-sqlite.mjs';
import {createCollaborationServices} from '../Presentation/WebApi/collaboration-services.mjs';
const artifact=process.argv.includes('--artifact');
const handle=artifact?(await import('../../dist/server/index.js')).default.fetch:(await import('../Presentation/WebApi/entry.mjs')).handle;
import {valueDigest,contentDigest} from '../Core/Workflows/Domain/collaboration-values.mjs';
import {rawDigest,replicaLimits} from '../Core/Workflows/Domain/source-replica.mjs';
import {createRemoteCollaborationClient} from '../Presentation/Cli/collaboration-client.mjs';
import {collaborationTools} from '../Presentation/Mcp/tools.mjs';
const f=sqliteCollaboration(),env={DB:f.db,COLLABORATION_STORE_ID:'local'},a={owner_id:'owner',actor:{subject_id:'agent',kind:'agent',binding_id:'binding'},capabilities:['read','plan']};
env.COLLABORATION_BINDINGS=JSON.stringify({owner:{enabled:true,...a.actor,capabilities:a.capabilities}});
const svc=()=>createCollaborationServices(env),ref=project_id=>({store_id:'local',namespace:'personal',project_id}),envelope=project_id=>({service_contract_version:'workflow-board/source-replica/1',schema_version:'1.0',project_ref:ref(project_id)});
for(const project of ['A','B'])await svc().executeCommand(a,{service_contract_version:'workflow-board/collaboration/2',schema_version:'2.0',project_ref:ref(project),operation_id:'create',expected_revision:0,command:'project.create',payload:{name:project}});
const src={source_id:'source',workflow_id:'WF',source_revision:'logical-1'},command=(name,payload,operation_id=name,expected_revision=0,project='A')=>({...envelope(project),command:name,payload:{...src,...payload},operation_id,expected_revision});
const query=(name,payload={},project='A',access=a)=>svc().executeQuery(access,{...envelope(project),query:name,payload});
const send=c=>svc().executeCommand(a,c),fail=(p,error)=>assert.rejects(p,e=>e.error===error);
const bytes=new Uint8Array(561320).map((_,i)=>i%251),binary=new Uint8Array([80,75,3,4,0,255,128]),text=new TextEncoder().encode('繁體中文\r\nraw bytes\n');
const entries=[['big.md',bytes],['attachment.zip',binary],['text.md',text],['empty',new Uint8Array()]];
const manifest={source:{kind:'sqlite',store:'authoritative',unknown:{future:true}},workflow:{id:'WF',title:'原始標題',status:'done',future:'preserved'},mapping:{future:[1,2]},files:await Promise.all(entries.map(async([path,b])=>({path,size:b.length,mode:'100644',sha256:await rawDigest(b),unknown:'kept'})))};
const mh=await valueDigest(manifest),begin=command('replica.begin',{manifest,manifest_hash:mh});
let tests=0;async function test(name,fn){await fn();tests++;console.log('PASS '+name);}
await test('begin: immutable manifest, replay, digest collision and invalid paths',async()=>{
 assert.equal((await send(begin)).accepted,true);assert.deepEqual(await send(begin),await send(begin));
 await fail(send({...begin,payload:{...begin.payload,manifest_hash:'sha256:'+'0'.repeat(64)}}),'operation_payload_conflict');
 const invalid={...manifest,files:[{...manifest.files[0],path:'../escape'}]};await fail(send(command('replica.begin',{manifest:invalid,manifest_hash:await valueDigest(invalid)},'unsafe')),'invalid_or_duplicate_path');
 const duplicate={...manifest,files:[manifest.files[0],manifest.files[0]]};await fail(send(command('replica.begin',{manifest:duplicate,manifest_hash:await valueDigest(duplicate)},'duplicate')),'invalid_or_duplicate_path');
 assert.equal((await query('replica.list',{limit:50,cursor:null})).items.length,0);
});
await test('missing and corrupt chunks cannot publish or affect legacy tables',async()=>{
 await fail(send(command('replica.activate',{manifest_hash:mh},'missing')),'missing_chunk');
 await fail(send(command('replica.chunk.put',{chunks:[{path:'big.md',index:0,content_base64:Buffer.from(bytes.slice(0,49152)).toString('base64'),chunk_hash:'sha256:'+'0'.repeat(64)}]},'bad')),'chunk_hash_or_size_mismatch');
 assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM source_records').get().n,0);
});
const chunks=[];for(const[path,b]of entries)for(let index=0;index<Math.ceil(b.length/49152);index++){const part=b.slice(index*49152,(index+1)*49152);chunks.push({path,index,content_base64:Buffer.from(part).toString('base64'),chunk_hash:await rawDigest(part)});}
await test('bounded batch upload validates bytes atomically and resumes same operation',async()=>{
 for(let i=0;i<chunks.length;i+=4){const c=command('replica.chunk.put',{chunks:chunks.slice(i,i+4)},'chunk-'+i);if(i===0)f.faults.loseResponse=true;assert.equal((await send(c)).accepted,true);assert.deepEqual(await send(c),await send(c));}
 await fail(send(command('replica.chunk.put',{chunks:[chunks[0],chunks[0]]},'dupe-chunk')),'invalid_chunk');
 assert.equal((await query('replica.operation.get',{operation_id:'chunk-0'})).outcome,'accepted');
});
const activate=command('replica.activate',{manifest_hash:mh},'activate');
await test('activation and receipt rollback together; lost response replays before CAS',async()=>{
 f.faults.failKind='INSERT INTO source_replica_heads';await fail(send(activate),'storage_unavailable');f.faults.failKind=null;
 assert.equal((await query('replica.operation.get',{operation_id:'activate'})).outcome,'unknown');assert.equal((await query('replica.list',{limit:50,cursor:null})).items.length,0);
 f.faults.loseResponse=true;assert.equal((await send(activate)).revision,1);assert.deepEqual(await send(activate),await send(activate));
 await fail(send({...activate,payload:{...activate.payload,manifest_hash:'sha256:'+'0'.repeat(64)}}),'operation_payload_conflict');
});
await test('fixed revision preserves full metadata and file bytes, batch budget and empty file',async()=>{
 const read=await query('replica.read',src);assert.equal(read.complete,true);assert.deepEqual(read.metadata.mapping,manifest.mapping);assert.equal(read.metadata.workflow.status,'done');
 const files=[];for(let offset=0;offset<manifest.files.length;offset+=2)files.push(...(await query('replica.manifest',{...src,offset,limit:2})).files);assert.deepEqual(files,manifest.files);assert.equal(await valueDigest({...read.metadata,files}),mh);
 let refs=chunks.map(({path,index})=>({path,index})),all=[];while(refs.length){const page=await query('replica.chunks.read',{...src,refs,max_response_bytes:150000});assert.ok(Buffer.byteLength(JSON.stringify(page))<=150000);all.push(...page.chunks);refs=page.remaining;}
 for(const[path,b]of entries){const parts=all.filter(x=>x.path===path).sort((x,y)=>x.index-y.index);assert.deepEqual(Buffer.concat(parts.map(x=>Buffer.from(x.content_base64,'base64'))),Buffer.from(b));}
 await fail(query('replica.file.chunk',{...src,path:'empty',index:0}),'chunk_not_found');
});
await test('A/B same IDs, owner/store scope and cursor scope remain isolated',async()=>{
 assert.equal((await send({...begin,project_ref:ref('B')})).accepted,true);assert.equal((await query('replica.operation.get',{operation_id:'activate'},'B')).outcome,'unknown');
 await fail(query('replica.read',src,'B'),'source_revision_not_found');await fail(query('replica.read',src,'A',{...a,owner_id:'other'}),'project_not_found');
 await fail(svc().executeQuery(a,{...envelope('A'),project_ref:{...ref('A'),store_id:'wrong'},query:'replica.read',payload:src}),'store_mismatch');
 const second={...src,workflow_id:'WF2'},m={...manifest,workflow:{...manifest.workflow,id:'WF2'},files:[]},hash=await valueDigest(m);
 await send(command('replica.begin',{...second,manifest:m,manifest_hash:hash},'second-begin'));await send(command('replica.activate',{...second,manifest_hash:hash},'second-activate'));
 const page=await query('replica.list',{limit:1,cursor:null});assert.equal(page.has_more,true);await fail(query('replica.list',{limit:1,cursor:page.cursor},'B'),'invalid_cursor');assert.equal((await query('replica.list',{limit:1,cursor:page.cursor})).items.length,1);
});
await test('new versions preserve old immutable bytes; competing activation loses CAS',async()=>{
 const m={...manifest,files:[]},hash=await valueDigest(m);
 for(const revision of ['logical-2','logical-3'])await send(command('replica.begin',{source_revision:revision,manifest:m,manifest_hash:hash},'begin-'+revision,1));
 const winning=command('replica.activate',{source_revision:'logical-2',manifest_hash:hash},'activate-2',1);assert.equal((await send(winning)).revision,2);
 const losing=await send(command('replica.activate',{source_revision:'logical-3',manifest_hash:hash},'activate-3',1));assert.equal(losing.accepted,false);assert.equal(losing.error,'revision_conflict');
 assert.equal((await query('replica.read',src)).revision,1);assert.equal((await query('replica.file.chunk',{...src,path:'big.md',index:0})).chunk_hash,chunks[0].chunk_hash);
});
const headers={'content-type':'application/json','oai-authenticated-user-id':'owner'},post=(path,input,hs=headers)=>handle(new Request('https://board.test'+path,{method:'POST',headers:hs,body:JSON.stringify(input)}),env);
await test('real HTTP ingress: auth, plan/read caps, unsupported versions and forbidden importer',async()=>{
 const q={...envelope('A'),query:'replica.read',payload:src};assert.equal((await post('/api/source-replica/v1/queries',q,{'content-type':'application/json'})).status,401);
 assert.equal((await post('/api/source-replica/v1/queries',q)).status,200);assert.equal((await post('/api/source-replica/v1/queries',{...q,schema_version:'9.0'})).status,501);
 assert.equal((await handle(new Request('https://board.test/api/source-import'),env)).status,403);
 await fail(svc().executeCommand({...a,capabilities:['read']},begin),'forbidden');
});
await test('real HTTP small import and readback plus manifest hash and batch atomicity failures',async()=>{
 const base={...src,workflow_id:'HTTP'},b=new TextEncoder().encode('入口原文\r\n'),hash=await rawDigest(b),m={source:{kind:'git',commit:'opaque-provenance'},workflow:{id:'HTTP',title:'HTTP source',status:'deferred'},files:[{path:'raw.md',mode:'100644',size:b.length,sha256:hash}]},manifest_hash=await valueDigest(m);
 const commands=[command('replica.begin',{...base,manifest:m,manifest_hash},'http-b'),command('replica.chunk.put',{...base,chunks:[{path:'raw.md',index:0,content_base64:Buffer.from(b).toString('base64'),chunk_hash:hash}]},'http-c'),command('replica.activate',{...base,manifest_hash},'http-a')];
 for(const c of commands){const response=await post('/api/source-replica/v1/commands',c);assert.equal(response.status,200,JSON.stringify(await response.clone().json()));assert.equal((await response.json()).accepted,true);}
 const read=await post('/api/source-replica/v1/queries',{...envelope('A'),query:'replica.file.chunk',payload:{...base,path:'raw.md',index:0}});assert.equal(Buffer.from((await read.json()).content_base64,'base64').toString('hex'),Buffer.from(b).toString('hex'));
 const bad={...src,workflow_id:'BAD'},bm={...m,workflow:{...m.workflow,id:'BAD'},files:[{...m.files[0],sha256:'sha256:'+'0'.repeat(64)}]},bh=await valueDigest(bm);
 await send(command('replica.begin',{...bad,manifest:bm,manifest_hash:bh},'bad-b'));
 const ch=commands[1].payload.chunks[0];await fail(send(command('replica.chunk.put',{...bad,chunks:[ch,{...ch,index:1}]},'bad-batch')),'invalid_chunk');
 assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM source_replica_chunks WHERE version_key LIKE ?').get('%BAD%').n,0);
 await send(command('replica.chunk.put',{...bad,chunks:[ch]},'bad-c'));await fail(send(command('replica.activate',{...bad,manifest_hash:bh},'bad-a')),'file_hash_or_size_mismatch');
 await fail(send(command('replica.begin',{...base,manifest:m,manifest_hash:'sha256:'+'0'.repeat(64)},'bad-manifest',1)),'manifest_hash_mismatch');
});
await test('MCP published tools and real call return fixed source data',async()=>{
 assert.ok(collaborationTools(a).some(t=>t.name==='source_v1_replica_chunks_read'));assert.ok(!collaborationTools({...a,capabilities:['read']}).some(t=>t.name==='source_v1_replica_begin'));
 const request={jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'source_v1_replica_read',arguments:{...envelope('A'),query:'replica.read',payload:src}}};
 const response=await post('/mcp',request,{...headers,'mcp-protocol-version':'2025-11-25'}),body=await response.json();assert.equal(body.result.structuredContent.metadata.workflow.status,'done');
});
await test('browser source client verifies manifest metadata and binary raw bytes',async()=>{
 const client=createSourceReplicaClient(ref('A'),(path,init)=>handle(new Request('https://board.test'+path,{...init,headers:{...init.headers,'oai-authenticated-user-id':'owner'}}),env)),header=await client.query('replica.read',src),files=await client.manifest(src,header);assert.deepEqual(files,manifest.files);assert.deepEqual(await client.file(src,files[1]),binary);
 await assert.rejects(client.manifest(src,{...header,manifest_hash:'sha256:'+'0'.repeat(64)}),/manifest_hash_mismatch/);
});
await test('CLI shared HTTP client honors explicit scope, immutable command and unknown outcomes',async()=>{
 const token='wb1.synthetic.'+'A'.repeat(43);env.COLLABORATION_SERVICE_CREDENTIALS=JSON.stringify({version:1,credentials:[{id:'synthetic',owner_id:'owner',token_sha256:await contentDigest(token),expires_at:'2099-01-01T00:00:00.000Z',enabled:true}]});
 const client=createRemoteCollaborationClient({version:'2.0',project:'A',endpoint:'https://board.test',store:'local',namespace:'personal',token,timeoutMs:1000},(url,init)=>handle(new Request(url,init),env));
 assert.equal((await client.query({...envelope('A'),query:'replica.read',payload:src})).status,'ok');assert.equal((await client.submit(activate)).status,'accepted');
 assert.equal((await client.query({...envelope('B'),query:'replica.read',payload:src})).error.code,'invalid_query_or_scope');
});
if(!artifact)await test('capacity complete batch proof: 219 workflows, 1931 files, 19.4 MB including binary',async()=>{
 // Independent deterministic count/byte workload; deliberately not a historical import claim.
 let fileCount=0,total=0;const data=new Uint8Array(10061).fill(42),hash=await rawDigest(data);
 for(let i=0;i<219;i++){
  const n=i<179?9:8,workflow_id='bulk-'+i,files=Array.from({length:n},(_,j)=>({path:j===0?'binary.zip':'file-'+j,mode:'100644',size:data.length,sha256:hash}));fileCount+=n;total+=n*data.length;
  const m={source:{kind:'synthetic'},workflow:{id:workflow_id,title:workflow_id,status:'done'},files},manifest_hash=await valueDigest(m),base={...src,workflow_id};
  assert.equal((await send(command('replica.begin',{...base,manifest:m,manifest_hash},'bulk-b-'+i))).accepted,true);
  const cs=files.map(f=>({path:f.path,index:0,content_base64:Buffer.from(data).toString('base64'),chunk_hash:hash}));assert.equal((await send(command('replica.chunk.put',{...base,chunks:cs},'bulk-c-'+i))).accepted,true);
  assert.equal((await send(command('replica.activate',{...base,manifest_hash},'bulk-a-'+i))).accepted,true);
  const read=await query('replica.chunks.read',{...base,refs:files.map(f=>({path:f.path,index:0})),max_response_bytes:300000});assert.equal(read.chunks.length,n);assert.ok(read.chunks.every(c=>c.content_base64===Buffer.from(data).toString('base64')));
 }
 assert.equal(fileCount,1931);assert.equal(total,19427791);console.log(JSON.stringify({synthetic_workflows:219,files:fileCount,bytes:total}));
});
f.sqlite.close();console.log(`${tests} source-replica scenarios passed`);
