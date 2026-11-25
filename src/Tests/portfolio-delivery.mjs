import assert from 'node:assert/strict';
import {handle} from '../Presentation/WebApi/entry.mjs';
import {itemMilestones} from '../Presentation/Web/delivery-view.mjs';
import {sqliteCollaboration} from './Fixtures/collaboration-sqlite.mjs';

const {sqlite,db,faults}=sqliteCollaboration();
const scope={store_id:'delivery-test',project_id:'clinic'};
const grant={enabled:true,binding_id:'delivery',subject_id:'planner',capabilities:['read','plan']};
const env={DB:db,COLLABORATION_STORE_ID:scope.store_id,COLLABORATION_BINDINGS:JSON.stringify({owner:grant,neighbor:grant})};
const readOnly={...env,COLLABORATION_BINDINGS:JSON.stringify({owner:{...grant,capabilities:['read']}})};
const cmd='/api/portfolio/v1/command', query='/api/portfolio/v1/query';
async function request(path,input,owner='owner',config=env) {
  const response=await handle(new Request('https://board.test'+path,{method:'POST',headers:{'content-type':'application/json','oai-authenticated-user-id':owner},body:JSON.stringify(input)}),config);
  return {status:response.status,body:await response.json()};
}
async function post(path,input,owner,config) {
  const {status,body}=await request(path,input,owner,config);
  assert.equal(status,200,JSON.stringify(body));
  return body;
}
const full=id=>({item_id:id,coverage:'full',included:true,outcome:'修正假日可預約的選項'});
const occurred=hour=>`2026-10-20T${String(hour).padStart(2,'0')}:00:00.000Z`;
const lookup=(owner)=>post(query,scope,owner);
let rev=0;
const op=(action,fields)=>({...scope,command:'delivery.'+action,expected_revision:rev,operation_id:crypto.randomUUID(),...fields});
async function accept(c) {
  const body=await post(cmd,c);
  assert.equal(body.accepted,true);
  assert.equal(body.revision,++rev);
  return body;
}
async function rejects(c,expected) {
  const response=await request(cmd,c);
  assert.ok(response.status>=400 && response.status<500,JSON.stringify(response));
  assert.equal(response.body.error||response.body.failure?.error,expected);
  assert.equal((await lookup()).delivery.revision,rev);
}

try {
  for(const owner of ['owner','neighbor']){
    await post('/api/collaboration/v2/commands',{service_contract_version:'workflow-board/collaboration/2',schema_version:'2.0',command:'project.create',
      project_ref:{...scope,namespace:'personal'},expected_revision:0,operation_id:'create-project',payload:{name:'Clinic'}},owner);
  }
  for(const [i,item_id] of ['closure','other'].entries()){
    await post(cmd,{...scope,command:'backlog.create',operation_id:'bug-'+item_id,expected_revision:i,item_id,kind:'bug',title:item_id,
      actual_behavior:'可預約',expected_behavior:'應停用',description:'',parent_id:null,related_story_id:null});
  }
  const phaseBefore=(await lookup()).backlog;
  const read=async()=> (await lookup()).delivery;
  const environments=['qa','uat-a','uat-b','production'];
  for(const environment_id of environments){
    await accept(op('environment',{environment_id,name:environment_id,purpose:'測試',retired:false}));
  }
  await accept(op('policy',{recipient:'客戶 A',primary_environment_id:'production',evidence_kind:'UAT 簽收'}));
  const firstScope=[full('closure'),{item_id:'other',included:false,outcome:'排入次版'}];
  const attempt=(id,environment_id,artifact,result,mode='deploy',previous_id=null,hour=1)=>op('attempt',{attempt_id:id,environment_id,artifact,
    result,mode,previous_id,occurred_at:occurred(hour),scope:firstScope,evidence:'執行紀錄 '+id});
  const observe=(id,environment_id,artifact,hour)=>op('observe',{observation_id:id,environment_id,artifact,occurred_at:occurred(hour),evidence:'環境讀回 '+id});
  await accept(attempt('qa-ok','qa','1.4','succeeded'));
  await accept(attempt('uat-ok','uat-a','1.4','succeeded'));
  await accept(observe('read-qa','qa','1.4',2));
  await accept(observe('read-a','uat-a','1.4',2));
  await accept(observe('read-b','uat-b','1.3',2));
  const milestone=async(id,environmentId)=>{const data=await lookup();return itemMilestones(data,{item_id:id},{environmentId});};
  assert.equal((await milestone('closure','qa')).deployed.attempt_id,'qa-ok');
  assert.equal((await milestone('other','qa')).deployed,null);
  assert.equal((await read()).handoffs.length,0);
  assert.equal((await milestone('closure','uat-b')).deployed,null);
  const draft=op('draft',{handoff_id:'release-a',recipient:'客戶 A',artifact:'1.4',scope:firstScope});
  faults.loseResponse=true;
  assert.ok([200,503].includes((await request(cmd,draft)).status));
  const receipt=await accept(draft);
  assert.equal((await post(cmd,draft)).revision,receipt.revision);
  assert.equal((await read()).handoffs.length,1);
  assert.equal((await milestone('closure','qa')).delivered,null);
  const record=(evidence_kind='UAT 簽收',recipient='客戶 A')=>op('record',{handoff_id:'release-a',artifact:'1.4',recipient,evidence_kind,evidence:'客戶回覆 A-17',occurred_at:occurred(5)});
  await rejects(record('QA 通過'),'delivery_policy_mismatch');
  await rejects(record('UAT 簽收','客戶 B'),'delivery_policy_mismatch');
  await accept(record());
  await rejects(record(),'handoff_already_recorded');
  assert.equal((await milestone('closure','qa')).delivered.handoff_id,'release-a');
  assert.equal((await milestone('other','qa')).delivered,null);
  assert.equal((await lookup('neighbor')).delivery.revision,0);

  await accept(attempt('prod-fail','production','1.4','failed','deploy',null,6));
  await accept(observe('previous-production','production','1.3',7));
  await rejects(attempt('bad-retry','qa','1.4','succeeded','retry','prod-fail',8),'invalid_previous_attempt');
  await rejects(attempt('different-artifact','production','2.0','succeeded','retry','prod-fail',8),'invalid_retry');
  await accept(attempt('prod-retry','production','1.4','succeeded','retry','prod-fail',8));
  assert.equal((await milestone('closure','production')).environmentCurrent,false);
  await accept(observe('read-production','production','1.4',9));
  await accept(observe('late-observation','production','1.2',3));
  assert.equal((await milestone('closure','production')).deployed.attempt_id,'prod-retry');
  await rejects(observe('ambiguous','production','1.3',9),'conflicting_environment_observation');
  await accept(attempt('prod-rollback','production','1.3','succeeded','rollback','prod-retry',10));
  await accept(observe('rolled-back','production','1.3',11));
  const final=await read();
  assert.deepEqual(final.attempts.filter(a=>a.environment_id==='production').map(a=>a.previous_id),[null,'prod-fail','prod-retry']);
  assert.equal((await milestone('closure','production')).observation.artifact,'1.3');
  assert.equal((await milestone('closure','production')).deployed,null);
  assert.equal((await milestone('closure','qa')).deployed.artifact,'1.4');
  assert.equal((await milestone('closure','production')).delivered.artifact,'1.4');
  await accept(attempt('rollback-failed','production','1.2','failed','rollback','prod-rollback',12));
  await accept(attempt('retry-rollback','production','1.2','succeeded','retry','rollback-failed',13));
  await accept(observe('observed-retried-rollback','production','1.2',14));
  assert.equal((await milestone('closure','production')).deployed,null);
  assert.equal(final.handoffs[0].scope.find(e=>e.item_id==='other').outcome,'排入次版');
  assert.deepEqual((await lookup()).backlog,phaseBefore);
  await rejects(attempt('floating','production','service:latest','failed'),'invalid_delivery_command');
  await rejects(op('draft',{handoff_id:'foreign',recipient:'',artifact:'',scope:[full('missing')]}),'delivery_item_not_found');
  await rejects(op('environment',{environment_id:'production',name:'Prod',purpose:'',retired:true}),'primary_environment_in_use');
  const candidates=['first','second'].map(id=>op('environment',{environment_id:id,name:id,purpose:'',retired:false}));
  const competing=await Promise.all(candidates.map(c=>request(cmd,c)));
  assert.deepEqual(competing.map(r=>r.status).sort(),[200,409]); rev++;
  const denied=op('applicability',{item_id:'other',deployable:false});
  assert.equal((await request(cmd,denied,'owner',readOnly)).status,403);
  await accept(denied);
  assert.equal((await milestone('other','qa')).deployable,false);
  await rejects({...attempt('inapplicable','qa','1.5','succeeded'),scope:[full('other')]},'deployment_not_applicable');
  await accept(op('draft',{handoff_id:'partial',recipient:'客戶 A',artifact:'1.5',
    scope:[{item_id:'other',included:true,outcome:'僅交付文件修訂'}]}));
  await accept({...record(),handoff_id:'partial',artifact:'1.5'});
  const part=await milestone('other','qa');
  assert.equal(part.delivered,null);
  assert.equal(part.partialDelivery.handoff_id,'partial');
  const site=await lookup();
  assert.equal(itemMilestones(site,{item_id:'other'},{recipient:'客戶 B'}).partialDelivery,null);
  assert.equal((await read()).revision,rev);
  console.log('PASS delivery HTTP and SQLite: drafts, policy evidence, scoped outcomes, independent environment attempts and reads, retry, rollback, replay, CAS and authorization');
} finally {sqlite.close();}
