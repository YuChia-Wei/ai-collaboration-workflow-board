import {createD1Repositories} from './adapters/outbound/d1/repositories.mjs';
import {createApplication} from './application/services.mjs';
import {createHttpHandler} from './adapters/inbound/http/handler.mjs';
import {resolveSitesOwner} from './adapters/inbound/http/sites-identity.mjs';

// Composition root is the only production code that wires inward and outward adapters.
let page='';
export function setPage(html){page=html;}
export const handle=createHttpHandler(env=>createApplication(createD1Repositories(env.DB)),()=>page,resolveSitesOwner);
export default {fetch:handle};
