import {Fault,demand} from '../domain/errors.mjs';
import {nonempty,hash,bytes} from '../domain/values.mjs';
import {PROFILE,idOK,object,applyBoardCommand} from '../domain/board-workflow.mjs';

export {PROFILE} from '../domain/board-workflow.mjs';
export const boardDetail=(repository,owner,id)=>repository.board.load(owner,id);
export const boardDocument=(repository,owner,id,docId,revision)=>repository.board.document(owner,id,docId,revision);

export async function boardCommand(repository,owner,c){
 demand(object(c)&&idOK(c.workflow_id)&&nonempty(c.operation_id)&&c.operation_id.length<=160&&nonempty(c.type)&&object(c.payload)&&c.service_contract_version===PROFILE,'invalid_command');
 demand(bytes(c)<=300000,'request_too_large',413);
 const digest=await hash(c),opKey=owner+':'+c.operation_id;
 const replay=async()=>{const old=await repository.operations.find(opKey);if(!old)return null;demand(old.hash===digest,'operation_payload_conflict',409);return JSON.parse(old.receipt);};
 const old=await replay();if(old)return old;
 demand(Number.isInteger(c.expected_revision)&&c.expected_revision>=0,'invalid_revision');
 const change=await applyBoardCommand(await repository.board.load(owner,c.workflow_id),c,new Date().toISOString());
 const {w,before}=change;
 const receipt={accepted:true,service_contract_version:PROFILE,operation_id:c.operation_id,workflow_id:w.id,revision:w.revision,principal:owner,payload_hash:digest};
 try{await repository.board.commit({...change,c,owner,receipt,digest,opKey});}
 catch(error){const accepted=await replay();if(accepted)return accepted;const latest=await repository.board.revision(owner,w.id);if(latest!==before)throw new Fault(409,'revision_conflict',{current_revision:latest});throw error;}
 return receipt;
}
