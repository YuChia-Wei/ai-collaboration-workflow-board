import {createD1Repositories} from './adapters/outbound/d1/repositories.mjs';
import {createApplication} from './application/services.mjs';
import {createHttpHandler} from './adapters/inbound/http/handler.mjs';
import {resolveSitesOwner} from './adapters/inbound/http/sites-identity.mjs';
import {systemClock} from './adapters/outbound/runtime/clock.mjs';
import {sourceProjection} from './adapters/outbound/static/source-projection.mjs';
import {demand} from './domain/errors.mjs';
import {createCollaborationServices} from './collaboration.mjs';
import {resolveSitesCollaborationAccess} from './adapters/inbound/http/collaboration-identity.mjs';
import {resolveCollaborationHttpAccess} from './adapters/inbound/http/collaboration-service-identity.mjs';
import {createCollaborationHttpHandler} from './adapters/inbound/http/collaboration-handler.mjs';
import {createMcpHandler} from './adapters/inbound/mcp/handler.mjs';

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
const mcpHandler=createMcpHandler(createCollaborationServices,resolveSitesCollaborationAccess);
export function handle(request,env){
 const path=new URL(request.url).pathname;
 if(path==='/mcp')return mcpHandler(request,env);
 if(path.startsWith('/api/collaboration/v1/'))return collaborationHandler(request,env);
 return humanHandler(request,env);
}
export default {fetch:handle};
