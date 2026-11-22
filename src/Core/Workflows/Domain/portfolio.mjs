import {demand} from './errors.mjs';

const identifier=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(value)&&!['__proto__','prototype','constructor'].includes(value);
const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
function timestamp(value){
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/.test(value))return false;
 const [year,month,day]=value.slice(0,10).split('-').map(Number);
 const leap=year%4===0&&(year%100!==0||year%400===0);
 return year>0&&day>0&&day<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
}
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const keys=(value,names)=>object(value)&&Object.keys(value).every(k=>names.includes(k))&&names.every(k=>Object.hasOwn(value,k));
const identity=['repository_id','issue_id','source_version'];
export const pbiKey=p=>JSON.stringify([p.repository_id,p.issue_id]);
const selection=p=>object(p)&&identity.every(k=>text(p[k],160));
const pbiFields=[...identity,'number','title','observed_at','issue_state','project_status'];
const validPbi=p=>selection(p)&&keys(p,pbiFields)&&Number.isSafeInteger(p.number)&&p.number>0&&text(p.title,300)&&timestamp(p.observed_at)&&['open','closed'].includes(p.issue_state)&&(p.project_status===null||text(p.project_status,160));
const validList=(items,limit,validate)=>Array.isArray(items)&&items.length<=limit&&items.every(validate)&&new Set(items.map(pbiKey)).size===items.length;
export function validatePortfolio(input,kind){
 const base=['store_id','project_id'];
 demand(object(input)&&base.every(k=>identifier(input[k])),'invalid_project_ref');
 if(kind==='query'){
  demand(keys(input,base)||(input.view==='overview'&&keys(input,[...base,'view'])),'invalid_query');
  return;
 }
 base.push('operation_id','expected_revision','command');
 demand(identifier(input.operation_id)&&Number.isSafeInteger(input.expected_revision)&&input.expected_revision>=0&&input.expected_revision<Number.MAX_SAFE_INTEGER,'invalid_command');
 if(input.command==='catalog.replace'){
  const catalog=input.catalog;
  demand(keys(input,[...base,'catalog'])&&keys(catalog,['coverage','observed_at','pbis']),'invalid_catalog');
  demand(['complete','partial','unknown','stale'].includes(catalog.coverage)&&(timestamp(catalog.observed_at)||(catalog.coverage==='unknown'&&catalog.observed_at===null))&&validList(catalog.pbis,2000,validPbi),'invalid_catalog');
  return;
 }
 const creating=input.command==='workflow.create';
 demand(creating||['workflow.link','workflow.unlink'].includes(input.command),'unsupported_command','unsupported');
 demand(keys(input,[...base,'workflow_id','pbis',...(creating?['title','goal']:[])])&&identifier(input.workflow_id)&&validList(input.pbis,30,p=>selection(p)&&keys(p,identity)),'invalid_command');
 if(creating)demand(input.expected_revision===0&&text(input.title,160)&&text(input.goal,4000),'invalid_workflow');
 else demand(input.pbis.length>0,'empty_selection');
}
export function currentLinks(history){
 const links=new Map();
 for(const event of history)for(const item of event.pbis){
  if(event.action==='unlinked')links.delete(pbiKey(item));
  else links.set(pbiKey(item),item);
 }
 return links;
}
export function selectLinks(command,catalog,current){
 const available=new Map(catalog.pbis.map(item=>[pbiKey(item),item]));
 return command.pbis.map(selection=>{
  const key=pbiKey(selection);
  const removing=command.command==='workflow.unlink';
  const item=(removing?current:available).get(key);
  demand(item,removing?'pbi_not_linked':'pbi_not_found',removing?'conflict':'not_found');
  demand(item.source_version===selection.source_version,'pbi_version_conflict','conflict');
  demand(removing||!current.has(key),'pbi_already_linked','conflict');
  return item;
 });
}
export function workflowAttention(state){
 return {updated_at:state.updated_at,
  pending_decisions:Object.values(state.decisions).filter(q=>q.status==='pending').map(q=>({id:q.id,title:q.question})),
  blocked_tasks:Object.values(state.tasks).filter(t=>t.status==='blocked').map(t=>({id:t.id,title:t.definition.title}))};
}
export function portfolioWorkflow({state,history,evidence,checkpoints,latest_handoff}){
 if(history[0]?.action!=='created')history=[{action:'created',at:state.created_at,pbis:[],external_work_refs:state.external_work_refs},...history];
 return {workflow_ref:state.workflow_ref,workflow_id:state.workflow_ref.workflow_id,title:state.title,goal:state.goal,scope:state.scope,status:state.status,revision:state.revision,
  source:state.workflow_ref.project_id?'collaboration/2':'collaboration/1',created_at:state.created_at,...workflowAttention(state),
  pbis:[...currentLinks(history).values()],history,evidence,checkpoints,latest_handoff};
}
