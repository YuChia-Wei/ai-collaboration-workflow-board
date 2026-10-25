import {Fault} from './errors.mjs';

const invalid=()=>{throw new Fault('invalid_json_value');};
export function unicodeScalarString(value){
 if(typeof value!=='string')invalid();
 for(let i=0;i<value.length;i++){
  const code=value.charCodeAt(i);
  if(code>=0xd800&&code<=0xdbff){const next=value.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))invalid();}
  else if(code>=0xdc00&&code<=0xdfff)invalid();
 }
 return value;
}

/** RFC 8785 ordering/escaping, restricted to safe decimal integers. No NFC. */
export function canonicalJson(value){
 const ancestors=new Set();
 function encode(item,depth){
  if(depth>64)invalid();
  if(item===null)return 'null';
  if(typeof item==='string')return JSON.stringify(unicodeScalarString(item));
  if(typeof item==='boolean')return item?'true':'false';
  if(typeof item==='number'){
   if(!Number.isSafeInteger(item)||Object.is(item,-0))invalid();
   return String(item);
  }
  if(typeof item!=='object'||ancestors.has(item)||Object.getOwnPropertySymbols(item).length)invalid();
  ancestors.add(item);
  let result;
  if(Array.isArray(item)){
   if(Object.keys(item).length!==item.length)invalid();
   result='['+Array.from(item,(entry,index)=>{if(!Object.hasOwn(item,index))invalid();return encode(entry,depth+1);}).join(',')+']';
  }else{
   if(![Object.prototype,null].includes(Object.getPrototypeOf(item)))invalid();
   result='{'+Object.keys(item).sort().map(key=>JSON.stringify(unicodeScalarString(key))+':'+encode(item[key],depth+1)).join(',')+'}';
  }
  ancestors.delete(item);
  return result;
 }
 return encode(value,0);
}

export async function contentDigest(content){
 const bytes=new TextEncoder().encode(unicodeScalarString(content));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return 'sha256:'+Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export const valueDigest=value=>contentDigest(canonicalJson(value));
export const requestDigest=(authority,command)=>valueDigest({purpose:command.service_contract_version==='workflow-board/collaboration/2'?'workflow-board-command-v2':'workflow-board-command-v1',authority,command});

// The ID is unique within the authenticated owner's store, not each workflow.
// Target/principal changes therefore encounter the original receipt and digest.
export const operationKey=(authority,command)=>canonicalJson(command.workflow_ref.project_id===undefined?[authority.owner_id,command.workflow_ref.store_id,command.operation_id]:[authority.owner_id,command.workflow_ref.store_id,command.workflow_ref.project_id,command.operation_id]);
