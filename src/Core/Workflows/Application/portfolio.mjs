import {demand,Fault} from '../Domain/errors.mjs';
import {applyCollaborationCommand,requireCapability} from '../Domain/collaboration-workflow.mjs';
import {operationKey,valueDigest} from '../Domain/collaboration-values.mjs';
import {currentLinks,portfolioWorkflow,selectLinks,validatePortfolio} from '../Domain/portfolio.mjs';
import {LEGACY_PROJECT,legacyProject,PROJECT_PROFILE} from './projects.mjs';

export function createPortfolio({storeId,projects,portfolio,workflowRepository,clock}){
 async function authorize(access,input,kind){
  requireCapability(access,'read');
  validatePortfolio(input,kind);
  demand(input.store_id===storeId,'store_mismatch','forbidden');
  if(kind==='command')requireCapability(access,'plan');
  if(input.project_id===LEGACY_PROJECT){
   demand(kind==='query','legacy_project_read_only','forbidden');
   return legacyProject(storeId);
  }
  const project=await projects.read(access.owner_id,storeId,input.project_id);
  demand(project,'project_not_found','not_found');return project;
 }
 async function query(access,input){
  const project=await authorize(access,input,'query'),id=input.project_id,owner=access.owner_id;
  const header={product:{project_id:id,name:project.name},can_plan:id!==LEGACY_PROJECT&&access.capabilities.includes('plan')};
  if(input.view==='overview')return {...header,...await portfolio.overview(owner,storeId,id,id===LEGACY_PROJECT)};
  const [catalog,records]=await Promise.all([portfolio.catalog(owner,storeId,id),portfolio.workflows(owner,storeId,id,id===LEGACY_PROJECT)]);
  return {...header,catalog,workflows:records.map(portfolioWorkflow)};
 }
 async function command(access,c){
  await authorize(access,c,'command');
  const owner=access.owner_id,project=c.project_id,repo=workflowRepository(project);
  const digest=await valueDigest({purpose:'portfolio/1',owner,actor:access.actor,command:c});
  const lookup=async()=>{
   const result=await repo.operation(owner,storeId,c.operation_id);
   if(result.outcome==='unknown')return null;
   demand(result.receipt.request_digest===digest,'operation_payload_conflict','conflict');
   return result.receipt;
  };
  const previous=await lookup();if(previous)return previous;
  if(c.command==='catalog.replace'){
   await portfolio.replace(owner,c,digest);
   return lookup();
  }
  const ref={store_id:storeId,namespace:'personal',project_id:project,workflow_id:c.workflow_id,record_kind:'collaboration'};
  const key=operationKey({owner_id:owner},{workflow_ref:ref,operation_id:c.operation_id});
  const time=clock.now();
  const base={service_contract_version:PROJECT_PROFILE,schema_version:'2.0',workflow_ref:ref,operation_id:c.operation_id,request_digest:digest,actor:access.actor};
  const state=await repo.snapshot(owner,ref);
  let change,eventName;
  try{
   const create=c.command==='workflow.create',before=state?.revision??0;
   demand(create?!state:state,create?'workflow_exists':'workflow_not_found',create?'conflict':'not_found');
   demand(before===c.expected_revision,'revision_conflict','conflict',{current_revision:before});
   const history=state?await repo.facts(owner,ref,before,'portfolio_links'):[];
   const snapshots=selectLinks(c,await portfolio.catalog(owner,storeId,project),currentLinks(history));
   const action=create?'created':c.command==='workflow.link'?'linked':'unlinked';
   const fact={action,at:time,pbis:snapshots};
   if(create){
    const payload={title:c.title,goal:c.goal,scope:{included:c.goal,excluded:''},skill:{id:'unassigned',version:null},
     external_work_refs:snapshots.map(p=>({original:p.title,provider:'board-catalog',scope:p.repository_id,work_id:p.issue_id,url:null,observed_at:p.observed_at,source_version:p.source_version,availability:'available'}))};
    change=await applyCollaborationCommand(null,{command:'workflow.create',workflow_ref:ref,expected_revision:0,payload},{access,time});
    eventName='WorkflowCreated';
   }else{
    const revision=before+1;
    change={before_revision:before,state:{...state,revision,updated_at:time},facts:{},effects:[{kind:'workflow',id:c.workflow_id,revision}]};
    eventName=action==='linked'?'PortfolioPbisLinked':'PortfolioPbisUnlinked';
   }
   change.facts.portfolio_links=[fact];
  }catch(error){
   if(!(error instanceof Fault)||error.category==='unavailable')throw error;
   const receipt={...base,accepted:false,expected_revision:c.expected_revision,current_revision:state?.revision??null,recorded_at:time,failure:{error:error.error,category:error.category,details:error.details}};
   await repo.reject(owner,ref,key,digest,receipt);
   return lookup();
  }
  const receipt={...base,accepted:true,before_revision:change.before_revision,revision:change.state.revision,accepted_at:time,effects:change.effects};
  const event={service_contract_version:PROJECT_PROFILE,schema_version:'2.0',workflow_ref:ref,operation_id:c.operation_id,revision:receipt.revision,actor:access.actor,occurred_at:time,name:eventName,effects:change.effects};
  await repo.accept({owner_id:owner,ref,expected_revision:c.expected_revision,operation_key:key,digest,next_state:change.state,receipt,facts:change.facts,events:[event]});
  return lookup();
 }
 return {query,command};
}
