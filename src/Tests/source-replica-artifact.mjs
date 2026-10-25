// Only the packaged Worker and SQLite-shaped adapter: no runtime Ajv compilation.
import assert from 'node:assert/strict';
import {sqliteCollaboration} from './Fixtures/collaboration-sqlite.mjs';
import {valueDigest} from '../Core/Workflows/Domain/collaboration-values.mjs';
import {rawDigest} from '../Core/Workflows/Domain/source-replica.mjs';
import worker from '../../dist/server/index.js';
const f=sqliteCollaboration(),env={DB:f.db,COLLABORATION_STORE_ID:'artifact',COLLABORATION_BINDINGS:JSON.stringify({owner:{enabled:true,subject_id:'agent',binding_id:'binding',capabilities:['read','plan']}})},project_ref={store_id:'artifact',namespace:'personal',project_id:'test'};
const post=async(path,body)=>{const response=await worker.fetch(new Request('https://artifact.test'+path,{method:'POST',headers:{'content-type':'application/json','oai-authenticated-user-id':'owner','mcp-protocol-version':'2025-11-25'},body:JSON.stringify(body)}),env);const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;};
await post('/api/collaboration/v2/commands',{service_contract_version:'workflow-board/collaboration/2',schema_version:'2.0',project_ref,command:'project.create',operation_id:'create',expected_revision:0,payload:{name:'Artifact'}});
const ref={source_id:'sqlite',workflow_id:'WF',source_revision:'snapshot-1'},envelope={service_contract_version:'workflow-board/source-replica/1',schema_version:'1.0',project_ref},bytes=new Uint8Array([80,75,0,255,13,10]),sha256=await rawDigest(bytes),manifest={source:{kind:'sqlite',unknown:42},workflow:{id:'WF',title:'Packaged',status:'done'},files:[{path:'raw.zip',mode:'100644',size:bytes.length,sha256}]},manifest_hash=await valueDigest(manifest);
for(const[command,payload]of [['replica.begin',{manifest,manifest_hash}],['replica.chunk.put',{chunks:[{path:'raw.zip',index:0,content_base64:Buffer.from(bytes).toString('base64'),chunk_hash:sha256}]}],['replica.activate',{manifest_hash}]]){
 const request={...envelope,command,operation_id:command,expected_revision:0,payload:{...ref,...payload}},receipt=await post('/api/source-replica/v1/commands',request);assert.equal(receipt.accepted,true);assert.deepEqual(await post('/api/source-replica/v1/commands',request),receipt);
}
const read=await post('/api/source-replica/v1/queries',{...envelope,query:'replica.file.chunk',payload:{...ref,path:'raw.zip',index:0}});assert.deepEqual(Buffer.from(read.content_base64,'base64'),Buffer.from(bytes));
const mcp=await post('/mcp',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'source_v1_replica_read',arguments:{...envelope,query:'replica.read',payload:ref}}});assert.equal(mcp.result.structuredContent.metadata.source.unknown,42);
f.sqlite.close();console.log('PASS packaged source-replica HTTP begin/batch/activate/replay/raw read + MCP metadata with runtime codegen disabled');
