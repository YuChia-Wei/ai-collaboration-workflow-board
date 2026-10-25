import {demand,Fault} from '../Domain/errors.mjs';
import {requireCapability} from '../Domain/collaboration-workflow.mjs';
import {valueDigest} from '../Domain/collaboration-values.mjs';

export const PROJECT_PROFILE='workflow-board/collaboration/2';
export const LEGACY_PROJECT='legacy-personal';
export const legacyProject=store=>({project_ref:{store_id:store,namespace:'personal',project_id:LEGACY_PROJECT},name:'既有 personal 紀錄',revision:1,workflow_contract:'workflow-board/collaboration/1'});

/** Project selection is an owner-bound application boundary, not an actor grant. */
export function createProjectServices({repository,storeId,validateCommand,validateQuery}){
 const check=(access,ref)=>{requireCapability(access,'read');demand(ref.store_id===storeId,'store_mismatch','forbidden');};
 const requireProject=async(access,id)=>{
  requireCapability(access,'read');
  demand(id!==LEGACY_PROJECT,'legacy_project_requires_v1','unsupported');
  demand(await repository.read(access.owner_id,storeId,id),'project_not_found','not_found');
 };
 return {requireProject,
  async executeCommand(access,input){
   access=structuredClone(access);
   const c=structuredClone(input);demand(validateCommand(c),'invalid_command');
   const ref=c.project_ref;check(access,ref);requireCapability(access,'plan');
   demand(ref.project_id!==LEGACY_PROJECT,'legacy_project_requires_v1','unsupported');
   demand(c.expected_revision<Number.MAX_SAFE_INTEGER,'revision_limit','limit_exceeded');
   const digest=await valueDigest({purpose:'workflow-board-project-command-v2',authority:{owner_id:access.owner_id,actor:access.actor},command:c});
   const inspect=receipt=>{if(receipt)demand(receipt.request_digest===digest,'operation_payload_conflict','conflict');return receipt;};
   const lookup=async()=>inspect(await repository.operation(access.owner_id,ref,c.operation_id));
   const old=await lookup();if(old)return old;
   try{return inspect(await repository.change(access.owner_id,c,digest));}
   catch(error){if(error instanceof Fault)throw error;const outcome=await lookup();if(outcome)return outcome;throw new Fault('storage_unavailable','unavailable');}
  },
  async executeQuery(access,input){
   access=structuredClone(access);
   const q=structuredClone(input);demand(validateQuery(q),'invalid_command');const p=q.payload;
   check(access,p.project_ref??p);const owner=access.owner_id;
   if(q.query==='project.legacy.preview')return {project:legacyProject(storeId),mode:'identity-mapping-no-copy',counts:await repository.legacyCounts(owner,storeId),full_restore:'not-implemented'};
   if(q.query==='project.list'){
    let after=null;
    if(p.cursor){const c=await repository.cursor(owner,p.cursor);demand(c&&c.kind==='project-list'&&c.store===storeId&&c.limit===p.limit,'invalid_cursor','forbidden');after=c.after;}
    const items=after===null?[legacyProject(storeId)]:[];
    items.push(...await repository.list(owner,storeId,after??'',p.limit+1));
    const has_more=items.length>p.limit;if(has_more)items.length=p.limit;
    const last=items.at(-1)?.project_ref.project_id;
    const cursor=has_more?await repository.saveCursor(owner,{kind:'project-list',store:storeId,limit:p.limit,after:last===LEGACY_PROJECT?'':last}):null;
    return {items,has_more,cursor};
   }
   const ref=p.project_ref;
   if(q.query==='project.read'){
    if(ref.project_id===LEGACY_PROJECT)return legacyProject(storeId);
    const value=await repository.read(owner,storeId,ref.project_id);demand(value,'project_not_found','not_found');return value;
   }
   demand(q.query==='project.operation.get','unsupported_query','unsupported');
   demand(ref.project_id!==LEGACY_PROJECT,'legacy_project_requires_v1','unsupported');
   const receipt=await repository.operation(owner,ref,p.operation_id);
   if(receipt)demand(receipt.project_ref?.project_id===ref.project_id,'operation_target_mismatch','forbidden');
   return receipt?{outcome:receipt.accepted?'accepted':'rejected',receipt}:{outcome:'unknown',project_ref:ref,operation_id:p.operation_id};
  }
 };
}
