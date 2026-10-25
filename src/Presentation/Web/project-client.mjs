import {queryError} from './collaboration-client.mjs';

export const projectEnvelope={service_contract_version:'workflow-board/collaboration/2',schema_version:'2.0'};
const same=(a,b)=>a&&b&&['store_id','namespace','project_id'].every(k=>a[k]===b[k]);
export function createProjectClient(storeId,fetcher=globalThis.fetch){
 const unknown=new Set();
 async function request(kind,input){
  let response;try{response=await fetcher(`/api/collaboration/v2/${kind}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});}catch{throw queryError('network_unavailable');}
  let data;try{data=await response.json();}catch{throw queryError('invalid_response');}
  if(!response.ok&&data.accepted!==false){const error=queryError(data.error??'storage_unavailable');error.definitive=(response.status>=400&&response.status<500)||(response.status===501&&data.category==='unsupported');throw error;}return data;
 }
 const query=(query,payload)=>request('queries',{...projectEnvelope,query,payload});
 return {
  async list(){
   const items=[],seen=new Set();let cursor=null;
   do{const page=await query('project.list',{store_id:storeId,namespace:'personal',limit:100,cursor});
    if(!Array.isArray(page.items)||page.items.some(p=>p.project_ref.store_id!==storeId||p.project_ref.namespace!=='personal'||seen.has(p.project_ref.project_id)))throw queryError('invalid_response');
    page.items.forEach(p=>seen.add(p.project_ref.project_id));items.push(...page.items);
    if(page.has_more&&(!page.cursor||page.cursor===cursor||!page.items.length))throw queryError('invalid_response');cursor=page.has_more?page.cursor:null;
   }while(cursor);return items;
  },
  command(action,projectId,name,revision){return {...projectEnvelope,command:action,project_ref:{store_id:storeId,namespace:'personal',project_id:projectId},operation_id:'project-'+crypto.randomUUID(),expected_revision:revision,payload:{name}};},
  async submit(command){
   if(command.project_ref.store_id!==storeId)throw queryError('project_mismatch');
   const key=JSON.stringify([command.project_ref,command.operation_id]);
   try{
    const result=await request('commands',command);
    if(!same(result.project_ref,command.project_ref)||result.operation_id!==command.operation_id||result.expected_revision!==command.expected_revision||typeof result.accepted!=='boolean')throw queryError('invalid_response');
    unknown.delete(key);return result;
   }catch(error){
    // A refused retry cannot resolve an earlier request whose response was lost.
    if(unknown.has(key))error.definitive=false;
    if(!error.definitive)unknown.add(key);
    throw error;
   }
  }
 };
}
