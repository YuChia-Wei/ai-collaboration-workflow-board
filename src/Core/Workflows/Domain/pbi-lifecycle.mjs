import {demand} from './errors.mjs';

export const itemKinds=['epic','feature','user_story','task','bug'];
const paths={epic:['new','active','done'],feature:['new','active','validating','done'],
 user_story:['new','active','testing','done'],task:['new','active','done'],bug:['new','triaged','active','retesting','done']};
const labels={new:'New',active:'Active',done:'Done',validating:'Validating',testing:'Testing',triaged:'Triaged',retesting:'Retesting'};
const transition=(from,to,mode='normal')=>({from,to,mode});
const stateId=value=>typeof value==='string'&&/^[a-z][a-z0-9_-]{0,63}$/.test(value)&&!['constructor','prototype'].includes(value);
const exact=(value,names)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));

function defaultFlow(kind){
 const path=paths[kind];
 const states=path.map(id=>({id,label:labels[id],category:id==='done'?'closed':'open'}));
 const transitions=path.slice(1).map((id,i)=>transition(path[i],id));
 transitions.push(transition('done','active'));
 if(['feature','user_story','bug'].includes(kind))transitions.push(transition(path.at(-2),'active'));
 if(kind==='bug')transitions.push(transition('triaged','done','bug_resolution'));
 return {initial:'new',states,transitions};
}
export const defaultFlows=()=>Object.fromEntries(itemKinds.map(kind=>[kind,defaultFlow(kind)]));

export function configureFlow(flows,kind,flow,items){
 demand(exact(flow,['initial','states','transitions'])&&Array.isArray(flow.states)&&flow.states.length>=2&&flow.states.length<=32&&
  Array.isArray(flow.transitions)&&flow.transitions.length<=256,'invalid_lifecycle');
 const states=new Map();
 for(const state of flow.states){
  demand(exact(state,['id','label','category'])&&stateId(state.id)&&typeof state.label==='string'&&state.label.trim()&&state.label.length<=100&&
   ['open','closed'].includes(state.category)&&!states.has(state.id),'invalid_lifecycle_state');
  states.set(state.id,state);
 }
 demand(states.get(flow.initial)?.category==='open'&&flow.states.some(state=>state.category==='closed'),'invalid_lifecycle_initial_or_closed');
 const pairs=new Set(),outgoing=new Map(flow.states.map(state=>[state.id,[]])),incoming=new Map(flow.states.map(state=>[state.id,[]]));
 for(const edge of flow.transitions){
  demand(exact(edge,['from','to','mode'])&&states.has(edge.from)&&states.has(edge.to)&&edge.from!==edge.to&&!pairs.has(edge.from+' '+edge.to),'invalid_lifecycle_transition');
  demand(edge.mode==='normal'||(edge.mode==='bug_resolution'&&kind==='bug'&&states.get(edge.from).category==='open'&&states.get(edge.to).category==='closed'),'invalid_transition_mode');
  pairs.add(edge.from+' '+edge.to);
  outgoing.get(edge.from).push(edge.to);
  incoming.get(edge.to).push(edge.from);
 }
 const reachable=new Set([flow.initial]);
 for(const from of reachable)for(const to of outgoing.get(from))reachable.add(to);
 demand(reachable.size===states.size,'unreachable_lifecycle_state');
 const canClose=new Set(flow.states.filter(state=>state.category==='closed').map(state=>state.id));
 for(const to of canClose)for(const from of incoming.get(to))canClose.add(from);
 demand(canClose.size===states.size,'unclosable_lifecycle_state');
 for(const state of flow.states){
  demand(outgoing.get(state.id).length,'lifecycle_dead_end');
  if(state.category==='closed')demand(outgoing.get(state.id).some(to=>states.get(to).category==='open'),'missing_reopen');
 }
 const old=new Map(flows[kind].states.map(state=>[state.id,state]));
 for(const item of items){
  if(item.kind===kind&&item.state_id)demand(states.get(item.state_id)?.category===old.get(item.state_id)?.category&&states.has(item.state_id),'lifecycle_state_in_use','conflict');
 }
 return {...flows,[kind]:flow};
}

const legacyState=status=>({id:null,label:status,category:status});
export function initialHistory(flow,time,actor,revision){
 const state=flow.states.find(state=>state.id===flow.initial);
 return {revision,at:time,actor,from:null,to:state,reason:'',resolution:null,original_id:null};
}
export function legacyHistory(before,after,time,actor,revision){
 return {revision,at:time,actor,from:legacyState(before),to:legacyState(after),reason:'',resolution:null,original_id:null};
}
export function transitionItem(item,c,flow,byId,time,actor,revision){
 const from=item.state_id?flow.states.find(state=>state.id===item.state_id):legacyState(item.status);
 const to=flow.states.find(state=>state.id===c.to_state);
 demand(from&&to,'unknown_lifecycle_state');
 const edge=from.id===null?null:flow.transitions.find(edge=>edge.from===from.id&&edge.to===to.id);
 if(from.id===null)demand(from.category===to.category,'legacy_state_mapping_required','conflict');
 else demand(edge,'transition_not_allowed','conflict');
 if(edge?.mode==='bug_resolution'){
  demand(['duplicate','wont_fix'].includes(c.resolution)&&c.reason.trim(),'bug_resolution_required');
  if(c.resolution==='duplicate')demand(c.original_id!==item.item_id&&byId.get(c.original_id)?.kind==='bug','invalid_original_bug');
  else demand(c.original_id===null,'unexpected_original_bug');
 }else demand(c.resolution===null&&c.original_id===null,'unexpected_bug_resolution');
 return {revision,at:time,actor,from,to,reason:c.reason,resolution:c.resolution,original_id:c.original_id};
}
