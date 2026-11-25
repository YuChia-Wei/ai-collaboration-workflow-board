import {demand} from './errors.mjs';

const id = v => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(v) && !['__proto__','constructor','prototype'].includes(v);
const string = (v,max) => typeof v === 'string' && v.length <= max;
const text = (v,max) => string(v,max) && v.trim().length > 0;
const optionalId = v => v === null || id(v);
const exact = (obj,names) => obj && typeof obj === 'object' && !Array.isArray(obj) && Object.keys(obj).length === names.length && names.every(name => Object.hasOwn(obj,name));
const artifact = v => text(v,300) && v === v.trim() && !/(?:^|[:/@#])(?:latest|head|main|master)$/i.test(v);
function time(value) {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/.exec(value);
  if (!match || match[0] !== value) return false;
  const [year,month,day] = match.slice(1,4).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const calendar = [31,leap ? 29 : 28,31,30,31,30,31,31,30,31,30,31];
  return month >= 1 && month <= 12 && day >= 1 && day <= calendar[month-1];
}
const scope = v => Array.isArray(v) && v.length > 0 && v.length <= 30 &&
  v.every(row => (exact(row,['item_id','included','outcome']) || exact(row,['item_id','included','outcome','coverage']) && ['full','partial'].includes(row.coverage)) &&
    id(row.item_id) && typeof row.included === 'boolean' && text(row.outcome,1000)) &&
  v.some(row => row.included) && new Set(v.map(row => row.item_id)).size === v.length;
const common = ['store_id','project_id','operation_id','expected_revision','command'];
const validators = {
  environment: {environment_id:id, name:v=>text(v,160), purpose:v=>string(v,300), retired:v=>typeof v==='boolean'},
  policy: {primary_environment_id:optionalId, recipient:v=>string(v,160), evidence_kind:v=>text(v,160)},
  applicability: {item_id:id, deployable:v=>typeof v==='boolean'},
  draft: {handoff_id:id, artifact:v=>v===''||artifact(v), recipient:v=>string(v,160), scope},
  record: {handoff_id:id, artifact, recipient:v=>text(v,160), evidence_kind:v=>text(v,160), evidence:v=>text(v,2000), occurred_at:time},
  attempt: {attempt_id:id, environment_id:id, artifact, mode:v=>['deploy','retry','rollback'].includes(v), previous_id:optionalId,
    result:v=>['succeeded','failed'].includes(v), evidence:v=>text(v,2000), occurred_at:time, scope},
  observe: {observation_id:id, environment_id:id, artifact, evidence:v=>text(v,2000), occurred_at:time}
};

export function validateDelivery(c) {
  const action=c.command.slice('delivery.'.length);
  demand(Object.hasOwn(validators,action),'unsupported_command','unsupported');
  const fields=validators[action];
  demand(exact(c,[...common,...Object.keys(fields)]) && Object.entries(fields).every(([name,test])=>test(c[name])),'invalid_delivery_command');
}

export const defaultDeliveryPolicy = () => ({recipient:'', evidence_kind:'交付紀錄', primary_environment_id:null});

export function deliveryChange(data,c,items,now) {
  const itemById = new Map(items.map(item=>[item.item_id,item]));
  function snapshotScope() {
    return c.scope.map(entry => {
      const item=itemById.get(entry.item_id);
      demand(item,'delivery_item_not_found','not_found');
      return {...entry,coverage:entry.coverage??'partial',title:item.title,source_version:item.source_version};
    });
  }
  function environment(target) {
    const env=data.environments.find(row=>row.environment_id===target);
    demand(env,'delivery_environment_not_found','not_found');
    return env;
  }
  const policy=data.policy;
  switch(c.command) {
    case 'delivery.environment': {
      demand(!c.retired || data.environments.some(env=>env.environment_id===c.environment_id),'delivery_environment_not_found','not_found');
      demand(!c.retired || policy.primary_environment_id!==c.environment_id,'primary_environment_in_use','conflict');
      return {kind:'environment',id:c.environment_id,body:{environment_id:c.environment_id,name:c.name,purpose:c.purpose,retired:c.retired}};
    }
    case 'delivery.policy':
      if(c.primary_environment_id!==null)demand(!environment(c.primary_environment_id).retired,'environment_retired','conflict');
      return {kind:'policy',id:'policy',body:{primary_environment_id:c.primary_environment_id,recipient:c.recipient,evidence_kind:c.evidence_kind}};
    case 'delivery.applicability':
      demand(itemById.has(c.item_id),'delivery_item_not_found','not_found');
      return {kind:'applicability',id:c.item_id,body:{item_id:c.item_id,deployable:c.deployable}};
    case 'delivery.draft': {
      demand(!data.handoffs.some(row=>row.handoff_id===c.handoff_id),'handoff_exists','conflict');
      return {kind:'handoff',id:c.handoff_id,body:{handoff_id:c.handoff_id,status:'draft',artifact:c.artifact,recipient:c.recipient,
        scope:snapshotScope(),created_at:now,draft_policy:{...policy}}};
    }
    case 'delivery.record': {
      const draft=data.handoffs.find(row=>row.handoff_id===c.handoff_id);
      demand(draft,'handoff_not_found','not_found');
      demand(draft.status==='draft','handoff_already_recorded','conflict');
      demand((!policy.recipient || policy.recipient===c.recipient) && policy.evidence_kind===c.evidence_kind,'delivery_policy_mismatch','conflict');
      return {kind:'handoff',id:c.handoff_id,body:{...draft,status:'recorded',draft_artifact:draft.artifact,draft_recipient:draft.recipient,
        artifact:c.artifact,recipient:c.recipient,policy:{...policy},evidence_kind:c.evidence_kind,evidence:c.evidence,occurred_at:c.occurred_at,recorded_at:now}};
    }
    case 'delivery.attempt': {
      demand(!data.attempts.some(row=>row.attempt_id===c.attempt_id),'deployment_attempt_exists','conflict');
      const env=environment(c.environment_id);
      demand(!env.retired,'environment_retired','conflict');
      let effect=c.mode==='rollback'?'restore':'install';
      if(c.mode==='deploy') demand(c.previous_id===null,'unexpected_previous_attempt');
      else {
        const previous=data.attempts.find(row=>row.attempt_id===c.previous_id);
        demand(previous && previous.environment_id===c.environment_id && previous.occurred_at<=c.occurred_at,'invalid_previous_attempt');
        if(c.mode==='retry'){
          demand(previous.result==='failed' && previous.artifact===c.artifact,'invalid_retry');
          effect=previous.effect;
        } else demand(previous.result==='succeeded' && previous.artifact!==c.artifact,'invalid_rollback');
      }
      const selected=snapshotScope();
      demand(!selected.some(entry=>entry.included && data.applicability.some(rule=>rule.item_id===entry.item_id && !rule.deployable)),'deployment_not_applicable');
      return {kind:'attempt',id:c.attempt_id,body:{attempt_id:c.attempt_id,environment_id:env.environment_id,environment_name:env.name,
        artifact:c.artifact,mode:c.mode,effect,previous_id:c.previous_id,result:c.result,evidence:c.evidence,occurred_at:c.occurred_at,recorded_at:now,scope:selected}};
    }
    case 'delivery.observe': {
      demand(!data.observations.some(row=>row.observation_id===c.observation_id),'observation_exists','conflict');
      const env=environment(c.environment_id);
      demand(!data.observations.some(row=>row.environment_id===env.environment_id && row.occurred_at===c.occurred_at && row.artifact!==c.artifact),'conflicting_environment_observation','conflict');
      return {kind:'observation',id:c.observation_id,body:{observation_id:c.observation_id,environment_id:env.environment_id,environment_name:env.name,
        artifact:c.artifact,occurred_at:c.occurred_at,evidence:c.evidence,recorded_at:now}};
    }
  }
}
