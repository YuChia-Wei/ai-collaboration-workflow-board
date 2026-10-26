import {createSourceReplicaRepository} from '../../Infrastructure/Persistence/D1/source-replica-repository.mjs';
import {sourceBoard} from '../../Infrastructure/SourceCatalog/source-board.mjs';
import {createSourceReplica} from '../../Core/Workflows/Application/source-replica.mjs';
import {createCollaborationRepository} from '../../Infrastructure/Persistence/D1/collaboration-repository.mjs';
import {createCollaborationCommands} from '../../Core/Workflows/Application/collaboration.mjs';
import {createCollaborationQueries} from '../../Core/Workflows/Application/collaboration-queries.mjs';
import {validateCommand,validateQuery,validateCommandV2,validateQueryV2,validateReplicaCommand,validateReplicaQuery} from '../Shared/collaboration-validation.mjs';
import {createProjectRepository} from '../../Infrastructure/Persistence/D1/project-repository.mjs';
import {createProjectServices,PROJECT_PROFILE} from '../../Core/Workflows/Application/projects.mjs';
import {systemClock} from '../../Infrastructure/Runtime/clock.mjs';
import {demand} from '../../Core/Workflows/Domain/errors.mjs';

export function createCollaborationServices(env){
 demand(env.DB,'storage_unavailable','unavailable');
 demand(typeof env.COLLABORATION_STORE_ID==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(env.COLLABORATION_STORE_ID)&&!['constructor','prototype','__proto__'].includes(env.COLLABORATION_STORE_ID),'collaboration_store_unconfigured','unavailable');
 // Primary-session consistency avoids stale operation recovery after a write.
 const db=typeof env.DB.withSession==='function'?env.DB.withSession('first-primary'):env.DB;
 const repository=createCollaborationRepository(db),storeId=env.COLLABORATION_STORE_ID;
 const projects=createProjectServices({repository:createProjectRepository(db),storeId,validateCommand:validateCommandV2,validateQuery:validateQueryV2});
 async function executeV2(kind,access,input){
  access=structuredClone(access);input=structuredClone(input);
  demand((kind==='command'?validateCommandV2:validateQueryV2)(input),'invalid_command');
  if(input[kind].startsWith('project.'))return projects[kind==='command'?'executeCommand':'executeQuery'](access,input);
  const ref=input.workflow_ref??input.payload.workflow_ref??input.payload;
  demand(ref.store_id===storeId,'store_mismatch','forbidden');
  await projects.requireProject(access,ref.project_id);
  const options={repository:createCollaborationRepository(db,ref.project_id),storeId,projectId:ref.project_id,profile:PROJECT_PROFILE,schemaVersion:'2.0',validateCommand:validateCommandV2,validateQuery:validateQueryV2,clock:systemClock,ids:{next:kind=>kind+'-'+crypto.randomUUID()}};
  return (kind==='command'?createCollaborationCommands(options):createCollaborationQueries(options))(access,input);
 }
 const commandV1=createCollaborationCommands({repository,clock:systemClock,ids:{next:kind=>kind+'-'+crypto.randomUUID()},validateCommand,storeId});
 const queryV1=createCollaborationQueries({repository,validateQuery,storeId});
 const replica=createSourceReplica({repository:createSourceReplicaRepository(db),projects,storeId,validateCommand:validateReplicaCommand,validateQuery:validateReplicaQuery,sourceBoard});
 return {
  executeCommand:(access,input)=>input.service_contract_version==='workflow-board/source-replica/1'?replica.executeCommand(access,input):input.service_contract_version===PROJECT_PROFILE?executeV2('command',access,input):commandV1(access,input),
  executeQuery:(access,input)=>input.service_contract_version==='workflow-board/source-replica/1'?replica.executeQuery(access,input):input.service_contract_version===PROJECT_PROFILE?executeV2('query',access,input):queryV1(access,input),
 };
}
