import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import {canonicalJson,contentDigest,valueDigest,requestDigest,operationKey} from '../backend/domain/collaboration-values.mjs';
import {parseContractJson} from '../backend/adapters/inbound/shared/strict-json.mjs';

const read=name=>JSON.parse(readFileSync(new URL('../contracts/collaboration-v1/'+name,import.meta.url),'utf8'));
const schema=read('schema.json'),examples=read('examples.json'),vectors=read('vectors.json');
const ajv=new Ajv2020({strict:true,allErrors:true});
ajv.addFormat('date-time',value=>{
 const time=new Date(value);
 return Number.isFinite(time.valueOf())&&Number(value.slice(0,4))>=1&&time.toISOString()===value;
});
ajv.addSchema(schema);
const valid=(name,value)=>{
 const validate=ajv.getSchema(schema.$id+'#/$defs/'+name);
 assert.ok(validate,`Missing schema ${name}`);
 const result=validate(value);
 return {result,errors:validate.errors};
};
let count=0;
for(const example of examples){
 const result=valid(example.schema,example.value);assert.ok(result.result,example.id+': '+JSON.stringify(result.errors));count++;
}
const sample=name=>structuredClone(examples.find(e=>e.value.command===name).value);
const accepted=examples.find(e=>e.schema==='receipt').value;
const rejected={accepted:false,service_contract_version:accepted.service_contract_version,schema_version:accepted.schema_version,workflow_ref:accepted.workflow_ref,operation_id:accepted.operation_id,request_digest:accepted.request_digest,expected_revision:1,current_revision:2,actor:accepted.actor,recorded_at:accepted.accepted_at,failure:{error:'revision_conflict',category:'conflict',details:{current_revision:2}}};
assert.ok(valid('operation_result',{outcome:'rejected',receipt:rejected}).result);count++;
assert.equal(valid('operation_result',{outcome:'unknown',receipt:rejected}).result,false);count++;
assert.equal(valid('operation_result',{outcome:'accepted',receipt:rejected}).result,false);count++;
const negative=[
 ['caller-selected owner',c=>{c.owner_id='other';}],
 ['caller-selected actor',c=>{c.actor={kind:'human'};}],
 ['unknown profile',c=>{c.service_contract_version='framework-board/1';}],
 ['unknown schema',c=>{c.schema_version='2.0';}],
 ['wrong record kind',c=>{c.workflow_ref.record_kind='source_snapshot';}],
 ['missing store',c=>{delete c.workflow_ref.store_id;}],
 ['unsafe revision',c=>{c.expected_revision=9007199254740992;}],
 ['fractional revision',c=>{c.expected_revision=1.5;}],
 ['zero existing revision',c=>{c.expected_revision=0;}],
 ['null revision',c=>{c.expected_revision=null;}],
 ['missing payload',c=>{delete c.payload;}],
 ['unknown payload field',c=>{c.payload.scope='rewritten';}],
 ['client-generated assignment',c=>{c.payload.assignment_id='guessed';}],
 ['blank task ID',c=>{c.payload.task_id=' ';}],
 ['reserved task ID',c=>{c.payload.task_id='constructor';}],
 ['non-ASCII task ID',c=>{c.payload.task_id='任務';}]
];
for(const [name,mutate] of negative){const c=sample('task.claim');mutate(c);assert.equal(valid('command',c).result,false,name);count++;}
const documentQuery=structuredClone(examples.find(e=>e.value.query==='document.read').value);
documentQuery.payload.document_ref.revision=0;assert.equal(valid('query',documentQuery).result,false,'No latest-version sentinel in the new profile');count++;
assert.equal(valid('timestamp','2026-02-30T00:00:00.000Z').result,false);count++;
assert.equal(valid('timestamp','2026-10-12T08:00:00+08:00').result,false);count++;
for(const vector of vectors.valid){
 const value=parseContractJson(vector.json);assert.equal(canonicalJson(value),vector.canonical,vector.id);assert.equal(await valueDigest(value),vector.digest,vector.id);count++;
}
for(const vector of vectors.invalid){assert.throws(()=>parseContractJson(vector.json),e=>e.error==='invalid_json',vector.id);count++;}
for(const vector of vectors.documents){assert.equal(await contentDigest(vector.content),vector.digest,vector.id);count++;}
for(const value of [undefined,NaN,Infinity,-0,1.5,9007199254740992,1n,new Date(),[undefined],Array(1),{a:undefined},'\ud800']){
 assert.throws(()=>canonicalJson(value),e=>e.error==='invalid_json_value');count++;
}
const circular={};circular.self=circular;assert.throws(()=>canonicalJson(circular),e=>e.error==='invalid_json_value');count++;
assert.throws(()=>parseContractJson('['.repeat(65)+'0'+']'.repeat(65)),e=>e.error==='invalid_json');count++;
assert.throws(()=>parseContractJson(' '.repeat(300001)),e=>e.category==='limit_exceeded');count++;
const {authority,command,digest,canonical}=vectors.request;
assert.equal(canonicalJson({purpose:'workflow-board-command-v1',authority,command}),canonical);
assert.equal(await requestDigest(authority,command),digest);count++;
for(const altered of [
 {a:{...authority,owner_id:'other'},c:command},
 {a:{...authority,actor:{...authority.actor,binding_id:'other'}},c:command},
 {a:authority,c:{...command,expected_revision:2}},
 {a:authority,c:{...command,workflow_ref:{...command.workflow_ref,workflow_id:'other'}}}
]){assert.notEqual(await requestDigest(altered.a,altered.c),digest);count++;}
assert.equal(operationKey(authority,command),operationKey(authority,{...command,workflow_ref:{...command.workflow_ref,workflow_id:'other'}}),'A reused operation ID must find the prior target before validating its changed digest');count++;
assert.notEqual(operationKey(authority,command),operationKey({...authority,owner_id:'other'},command));count++;
assert.notEqual(vectors.documents[0].digest,vectors.documents[1].digest);count++;
assert.notEqual(vectors.valid.find(v=>v.id==='composed').digest,vectors.valid.find(v=>v.id==='decomposed').digest);count++;
console.log(JSON.stringify({assertion_groups:count,passed:true,scope:'Schema examples, rejected inputs and portable encoding; not collaboration lifecycle or hosted acceptance'}));
