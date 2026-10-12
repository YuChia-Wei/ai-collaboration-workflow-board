import {Fault,demand} from '../../../domain/errors.mjs';
import {nonempty,bytes} from '../../../domain/values.mjs';
import {PROFILE} from '../../../domain/board-workflow.mjs';
import {json} from './responses.mjs';

// The trusted identity resolver is supplied by the deployment composition root.
export function createHttpHandler(createApplication,getPage,resolveOwner){
 return async function handle(request,env){
  try{
   const url=new URL(request.url);
   if(url.pathname==='/')return new Response(getPage(),{headers:{'content-type':'text/html;charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
   demand(url.pathname.startsWith('/api/'),'not_found',404);
   if(url.pathname==='/api/source-import')throw new Fault(403,'import_forbidden');
   const owner=await resolveOwner(request,env);demand(nonempty(owner),'signin_required',401);
   demand(env.DB,'storage_unavailable',503);const app=createApplication(env);
   if(request.method==='GET'&&url.pathname==='/api/source-status')return json(await app.sourceStatus());
   if(request.method==='POST'){
    demand(!request.headers.get('Origin')||request.headers.get('Origin')===url.origin,'origin_forbidden',403);
    if(url.pathname==='/api/commands'){
     const raw=await request.text();demand(bytes(raw)<=300000,'request_too_large',413);let c;try{c=JSON.parse(raw);}catch{throw new Fault(422,'invalid_command');}
     if(c.service_contract_version===PROFILE)return json(await app.boardCommand(owner,c));
     demand(c.type!=='create_workflow','legacy_creation_disabled',403);return json(await app.legacyCommand(owner,c));
    }
   }
   if(request.method==='GET'&&url.pathname==='/api/workflows')return json(await app.listWorkflows(owner,url.searchParams));
   const documentMatch=url.pathname.match(/^\/api\/workflows\/([^/]+)\/documents\/([^/]+)$/);
   if(request.method==='GET'&&documentMatch)return json(await app.workflowDocument(owner,decodeURIComponent(documentMatch[1]),decodeURIComponent(documentMatch[2]),Number(url.searchParams.get('revision')||0),url.searchParams.get('mode')));
   const match=url.pathname.match(/^\/api\/workflows\/([^/]+)$/);
   if(request.method==='GET'&&match)return json(await app.workflowDetail(owner,decodeURIComponent(match[1]),url.searchParams.get('mode')||'auto'));
   const operation=url.pathname.match(/^\/api\/operations\/([^/]+)$/);
   if(request.method==='GET'&&operation)return json(await app.operationReceipt(owner,decodeURIComponent(operation[1])));
   throw new Fault(404,'not_found');
  }catch(e){if(e instanceof Fault)return json({error:e.error,...e.details},e.status);console.error('workflow request failed',String(e));return json({error:'storage_unavailable'},503);}
 };
}
