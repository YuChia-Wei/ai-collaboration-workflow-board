import {Fault,demand} from '../domain/errors.mjs';
import {nonempty,hash} from '../domain/values.mjs';
import {applyLegacyCommand} from '../domain/legacy-workflow.mjs';

export async function command(repository,owner,c){
 demand(c&&nonempty(c.operation_id)&&nonempty(c.workflow_id)&&nonempty(c.type)&&c.payload&&typeof c.payload==='object'&&!Array.isArray(c.payload),'invalid_command');
 demand(!await repository.source.exists(c.workflow_id),'source_snapshot_readonly',403);
 const digest=await hash(c),key=owner+':'+c.operation_id;
 const replay=async()=>{const old=await repository.operations.find(key);if(old){demand(old.hash===digest,'operation_payload_conflict',409);return JSON.parse(old.receipt);}return null;};
 const oldReceipt=await replay();if(oldReceipt)return oldReceipt;
 demand(Number.isInteger(c.expected_revision)&&c.expected_revision>=0,'invalid_revision');
 const change=await applyLegacyCommand(await repository.legacy.load(owner,c.workflow_id),c,new Date().toISOString());
 const {w,before}=change;
 const receipt={accepted:true,operation_id:c.operation_id,workflow_id:w.id,revision:w.revision,principal:owner,payload_hash:digest};
 try{await repository.legacy.commit({...change,c,owner,receipt,digest,key});}
 catch(error){const accepted=await replay();if(accepted)return accepted;const latest=await repository.legacy.revision(owner,w.id);if(latest!==before)throw new Fault(409,'revision_conflict',{current_revision:latest});throw error;}
 return receipt;
}
