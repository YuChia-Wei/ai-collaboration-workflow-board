import {createSourceReplicaHttpHandler} from './source-replica-handler.mjs';
import {createD1Repositories} from '../../Infrastructure/Persistence/D1/repositories.mjs';
import {createApplication} from '../../Core/Workflows/Application/services.mjs';
import {createHttpHandler} from './handler.mjs';
import {resolveSitesOwner} from '../../Infrastructure/Identity/sites-identity.mjs';
import {systemClock} from '../../Infrastructure/Runtime/clock.mjs';
import {sourceProjection} from '../../Infrastructure/SourceCatalog/source-projection.mjs';
import {demand} from '../../Core/Workflows/Domain/errors.mjs';
import {createCollaborationServices} from './collaboration-services.mjs';
import {resolveSitesCollaborationAccess} from '../../Infrastructure/Identity/collaboration-identity.mjs';
import {resolveCollaborationHttpAccess} from '../../Infrastructure/Identity/collaboration-service-identity.mjs';
import {createCollaborationHttpHandler} from './collaboration-handler.mjs';
import {createMcpHandler} from '../Mcp/handler.mjs';

// Composition root is the only production code that wires inward and outward adapters.
let page='';
export function setPage(html){page=html;}
export function createServices(env){
 demand(env.DB,'storage_unavailable','unavailable');
 return createApplication(createD1Repositories(env.DB),{clock:systemClock,sourceProjection});
}
// Only the public store identifier is exposed to the UI, never bindings or secrets.
function browserPage(_request,env){
 const store=env?.COLLABORATION_STORE_ID;
 const valid=typeof store==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(store);
 return valid?page.replace('</head>',`<meta name="collaboration-store" content="${store}"></head>`):page;
}
const humanHandler=createHttpHandler(createServices,browserPage,resolveSitesOwner);
const collaborationHandler=createCollaborationHttpHandler(createCollaborationServices,resolveCollaborationHttpAccess);
const sourceReplicaHandler=createSourceReplicaHttpHandler(createCollaborationServices,resolveCollaborationHttpAccess);
const mcpHandler=createMcpHandler(createCollaborationServices,resolveSitesCollaborationAccess);
export function handle(request,env){
 const path=new URL(request.url).pathname;
 if(path.startsWith('/api/source-replica/'))return sourceReplicaHandler(request,env);
 if(path==='/mcp')return mcpHandler(request,env);
 if(/^\/api\/collaboration\/v[12]\//.test(path))return collaborationHandler(request,env);
 return humanHandler(request,env);
}
export default {fetch:handle};
