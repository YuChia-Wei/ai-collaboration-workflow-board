import {boardCommand} from './board.mjs';
import {command} from './legacy.mjs';
import {sourceStatus,listWorkflows,workflowDocument,workflowDetail,operationReceipt} from './queries.mjs';

/** @param {import('./ports.mjs').Repositories} repository */
export function createApplication(repository){
 return {
  boardCommand:(owner,c)=>boardCommand(repository,owner,c),
  legacyCommand:(owner,c)=>command(repository,owner,c),
  sourceStatus:()=>sourceStatus(repository),
  listWorkflows:(owner,params)=>listWorkflows(repository,owner,params),
  workflowDocument:(owner,id,docId,rev,mode)=>workflowDocument(repository,owner,id,docId,rev,mode),
  workflowDetail:(owner,id,mode)=>workflowDetail(repository,owner,id,mode),
  operationReceipt:(owner,id)=>operationReceipt(repository,owner,id)
 };
}
