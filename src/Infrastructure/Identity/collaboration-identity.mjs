import {demand} from '../../Core/Workflows/Domain/errors.mjs';
import {resolveSitesOwner} from './sites-identity.mjs';

const validId=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(value)&&!['constructor','prototype','__proto__'].includes(value);
/** Only deploy behind Sites' authenticated ingress. No owner, actor, session,
 * bearer or email supplied in a tool argument establishes a binding.
 * Provisioning remains explicit: absent configuration fails closed. */
export function resolveSitesCollaborationAccess(request,env){
 const owner=resolveSitesOwner(request);demand(owner,'signin_required','unauthenticated');
 return resolveCollaborationBinding(owner,env);
}

/** The owner has already been authenticated by the selected ingress adapter. */
export function resolveCollaborationBinding(owner,env){
 demand(env.COLLABORATION_BINDINGS,'collaboration_identity_unconfigured','unavailable');
 let bindings;try{bindings=JSON.parse(env.COLLABORATION_BINDINGS);}catch{demand(false,'collaboration_identity_unconfigured','unavailable');}
 demand(bindings&&typeof bindings==='object'&&!Array.isArray(bindings),'collaboration_identity_unconfigured','unavailable');
 const binding=Object.hasOwn(bindings,owner)?bindings[owner]:null;
 demand(binding?.enabled===true,'forbidden','forbidden');
 demand(validId(binding.subject_id)&&validId(binding.binding_id)&&Array.isArray(binding.capabilities)&&binding.capabilities.includes('read')&&binding.capabilities.every(c=>['read','plan','execute','manage'].includes(c)),'collaboration_identity_unconfigured','unavailable');
 return {owner_id:owner,actor:{subject_id:binding.subject_id,kind:'agent',binding_id:binding.binding_id},capabilities:[...binding.capabilities]};
}
