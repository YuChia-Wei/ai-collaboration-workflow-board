export class Fault extends Error {constructor(status,error,details={}) {super(error); Object.assign(this,{status,error,details});}}
export const demand=(value,error,status=422,details={})=>{if(!value) throw new Fault(status,error,details);};
export const nonempty=value=>typeof value==='string'&&!!value.trim();
export const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
export const bytes=value=>new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value)).length;
function stable(value){return value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?'['+value.map(stable).join(',')+']':'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';}
export async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(typeof value==='string'?value:stable(value))))].map(v=>v.toString(16).padStart(2,'0')).join('');}
