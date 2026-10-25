import {demand} from './errors.mjs';
import {canonicalJson,valueDigest} from './collaboration-values.mjs';
export const REPLICA_PROFILE='workflow-board/source-replica/1';
export const replicaLimits=Object.freeze({request_bytes:300000,manifest_bytes:240000,chunk_bytes:49152,chunks_per_command:32,file_bytes:16777216,version_bytes:33554432,files:1000,page:50});
export const replicaCommands=['replica.begin','replica.chunk.put','replica.activate'];
export const replicaQueries=['replica.capabilities','replica.list','replica.read','replica.manifest','replica.file.chunk','replica.chunks.read','replica.operation.get'];
export const validReplicaId=x=>typeof x==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(x)&&!['constructor','prototype','__proto__'].includes(x);
export const validReplicaPath=x=>typeof x==='string'&&x.length<=1024&&x.length>0&&!/[\\\x00-\x1f\x7f:]/.test(x)&&!x.startsWith('/')&&x.split('/').every(p=>p&&p!=='.'&&p!=='..');
export const replicaHash=x=>typeof x==='string'&&/^sha256:[a-f0-9]{64}$/.test(x);
export const rawDigest=async bytes=>'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
export function decodeReplicaChunk(s){demand(typeof s==='string'&&s.length<=65536&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s),'invalid_chunk');const b=Uint8Array.from(atob(s),c=>c.charCodeAt(0));demand(btoa(Array.from(b,c=>String.fromCharCode(c)).join(''))===s,'invalid_chunk');return b;}
export function validateReplica(input,kind){
 demand(input?.service_contract_version===REPLICA_PROFILE,'unsupported_profile','unsupported');demand(input.schema_version==='1.0','unsupported_schema','unsupported');
 demand(new TextEncoder().encode(canonicalJson(input)).length<=replicaLimits.request_bytes,'limit_exceeded','limit_exceeded');
 const keys=['service_contract_version','schema_version','project_ref',kind,'payload',...(kind==='command'?['operation_id','expected_revision']:[])];
 demand(input&&Object.keys(input).length===keys.length&&keys.every(k=>Object.hasOwn(input,k)),'invalid_envelope');
 const r=input.project_ref;demand(r&&Object.keys(r).length===3&&r.namespace==='personal'&&validReplicaId(r.store_id)&&validReplicaId(r.project_id),'invalid_scope');
 demand((kind==='command'?replicaCommands:replicaQueries).includes(input[kind]),'unsupported_operation','unsupported');
 demand(input.payload&&typeof input.payload==='object'&&!Array.isArray(input.payload),'invalid_payload');
 if(kind==='command')demand(validReplicaId(input.operation_id)&&Number.isSafeInteger(input.expected_revision)&&input.expected_revision>=0&&input.expected_revision<Number.MAX_SAFE_INTEGER,'invalid_operation');
 const p=input.payload;
 if(['replica.begin','replica.chunk.put','replica.activate','replica.read','replica.manifest','replica.file.chunk','replica.chunks.read'].includes(input[kind]))demand(['source_id','workflow_id','source_revision'].every(k=>validReplicaId(p[k])),'invalid_source_ref');
}
export async function validateManifest(p){
 const m=p.manifest;demand(m&&typeof m==='object'&&!Array.isArray(m)&&m.source&&typeof m.source==='object'&&!Array.isArray(m.source)&&m.workflow&&m.workflow.id===p.workflow_id&&typeof m.workflow.title==='string'&&typeof m.workflow.status==='string','invalid_manifest');
 demand(Array.isArray(m.files)&&m.files.length<=replicaLimits.files,'invalid_manifest');
 demand(new TextEncoder().encode(canonicalJson(m)).length<=replicaLimits.manifest_bytes,'manifest_too_large','limit_exceeded');
 const paths=new Set();let total=0;
 for(const f of m.files){demand(f&&validReplicaPath(f.path)&&!paths.has(f.path),'invalid_or_duplicate_path');paths.add(f.path);demand(typeof f.mode==='string'&&/^[0-7]{6}$/.test(f.mode)&&Number.isSafeInteger(f.size)&&f.size>=0&&f.size<=replicaLimits.file_bytes&&replicaHash(f.sha256),'invalid_file');total+=f.size;}
 demand(total<=replicaLimits.version_bytes,'version_too_large','limit_exceeded');demand(replicaHash(p.manifest_hash)&&await valueDigest(m)===p.manifest_hash,'manifest_hash_mismatch');return m;
}
