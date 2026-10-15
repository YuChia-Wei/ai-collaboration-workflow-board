import {createCollaborationRepository} from './adapters/outbound/d1/collaboration-repository.mjs';
import {createCollaborationCommands} from './application/collaboration.mjs';
import {createCollaborationQueries} from './application/collaboration-queries.mjs';
import {validateCommand,validateQuery} from './adapters/inbound/shared/collaboration-validation.mjs';
import {systemClock} from './adapters/outbound/runtime/clock.mjs';
import {demand} from './domain/errors.mjs';

export function createCollaborationServices(env){
 demand(env.DB,'storage_unavailable','unavailable');
 demand(typeof env.COLLABORATION_STORE_ID==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(env.COLLABORATION_STORE_ID)&&!['constructor','prototype','__proto__'].includes(env.COLLABORATION_STORE_ID),'collaboration_store_unconfigured','unavailable');
 // Primary-session consistency avoids stale operation recovery after a write.
 const db=typeof env.DB.withSession==='function'?env.DB.withSession('first-primary'):env.DB;
 const repository=createCollaborationRepository(db),storeId=env.COLLABORATION_STORE_ID;
 return {
  executeCommand:createCollaborationCommands({repository,clock:systemClock,ids:{next:kind=>kind+'-'+crypto.randomUUID()},validateCommand,storeId}),
  executeQuery:createCollaborationQueries({repository,validateQuery,storeId}),
 };
}
