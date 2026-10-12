import {createD1Repositories} from './adapters/outbound/d1/repositories.mjs';
import {createApplication} from './application/services.mjs';
import {createHttpHandler} from './adapters/inbound/http/handler.mjs';
import {resolveSitesOwner} from './adapters/inbound/http/sites-identity.mjs';
import {systemClock} from './adapters/outbound/runtime/clock.mjs';
import {sourceProjection} from './adapters/outbound/static/source-projection.mjs';
import {demand} from './domain/errors.mjs';

// Composition root is the only production code that wires inward and outward adapters.
let page='';
export function setPage(html){page=html;}
export function createServices(env){
 demand(env.DB,'storage_unavailable','unavailable');
 return createApplication(createD1Repositories(env.DB),{clock:systemClock,sourceProjection});
}
export const handle=createHttpHandler(createServices,()=>page,resolveSitesOwner);
export default {fetch:handle};
