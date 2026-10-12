import {boardCommand} from './board.mjs';
import {command} from './legacy.mjs';
import {sourceStatus,listWorkflows,workflowDocument,workflowDetail,operationReceipt} from './queries.mjs';

/** @param {import('./ports.mjs').Repositories} repository */
export function createApplication(repository,{clock,sourceProjection}){
 return {
  boardCommand:(owner,c)=>boardCommand(repository,owner,c,clock),
  legacyCommand:(owner,c)=>command(repository,owner,c,clock),
  sourceStatus:()=>sourceStatus(repository,sourceProjection),
  listWorkflows:(owner,query)=>listWorkflows(repository,owner,query,sourceProjection),
  workflowDocument:(owner,id,docId,rev,mode)=>workflowDocument(repository,owner,id,docId,rev,mode),
  workflowDetail:(owner,id,mode)=>workflowDetail(repository,owner,id,mode,sourceProjection),
  operationReceipt:(owner,id)=>operationReceipt(repository,owner,id)
 };
}
