import {demand} from '../../Core/Workflows/Domain/errors.mjs';
import {resolveCollaborationBinding,resolveSitesCollaborationAccess} from './collaboration-identity.mjs';

const validId=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(value)&&!['constructor','prototype','__proto__'].includes(value);
const exactKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const configured=condition=>demand(condition,'collaboration_service_identity_unconfigured','unavailable');
const validTime=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)&&Number(value.slice(0,4))>=1&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const equalDigest=(left,right)=>{
 let difference=0;
 for(let i=0;i<left.length;i++)difference|=left.charCodeAt(i)^right.charCodeAt(i);
 return difference===0;
};

/**
 * HTTP only. Sites authenticates access to the private origin with its separate
 * OAI-Sites-Authorization header. That header is consumed by Sites and does not
 * establish an owner. This adapter authenticates a Board credential independently.
 * It cannot mint an actor: every request resolves the existing owner binding.
 */
export async function resolveCollaborationHttpAccess(request,env){
 const authorization=request.headers.get('authorization');
 if(authorization===null)return resolveSitesCollaborationAccess(request,env);
 // A supplied invalid/expired credential must never fall back to a browser user.
 const match=/^Bearer (wb1\.([A-Za-z0-9][A-Za-z0-9_-]{0,63})\.[A-Za-z0-9_-]{43})$/.exec(authorization);
 demand(match,'invalid_service_credential','unauthenticated');
 let config;
 try{config=JSON.parse(env.COLLABORATION_SERVICE_CREDENTIALS);}catch{configured(false);}
 configured(exactKeys(config,['version','credentials'])&&config.version===1&&Array.isArray(config.credentials)&&config.credentials.length<=100);
 const ids=new Set();
 for(const entry of config.credentials){
  configured(exactKeys(entry,['id','owner_id','token_sha256','expires_at','enabled']));
  configured(typeof entry.id==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(entry.id)&&!ids.has(entry.id));
  configured(validId(entry.owner_id)&&typeof entry.enabled==='boolean'&&validTime(entry.expires_at)&&typeof entry.token_sha256==='string'&&/^sha256:[a-f0-9]{64}$/.test(entry.token_sha256));
  ids.add(entry.id);
 }
 const credential=config.credentials.find(entry=>entry.id===match[2]);
 demand(credential?.enabled&&Date.parse(credential.expires_at)>Date.now(),'invalid_service_credential','unauthenticated');
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(match[1]));
 const digest='sha256:'+Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
 demand(equalDigest(digest,credential.token_sha256),'invalid_service_credential','unauthenticated');
 return resolveCollaborationBinding(credential.owner_id,env);
}
