import {Fault,demand} from '../../Core/Workflows/Domain/errors.mjs';
import {nonempty,bytes} from '../../Core/Workflows/Domain/values.mjs';
import {PROFILE} from '../../Core/Workflows/Domain/board-workflow.mjs';
import {json} from './responses.mjs';
import {httpFailure} from './errors.mjs';
import {listQuery} from './queries.mjs';

// The trusted identity resolver is supplied by the deployment composition root.
export function createHttpHandler(createApplication,getPage,resolveOwner){
 return async function handle(request,env){
  try{
   const url=new URL(request.url);
   if(url.pathname==='/')return new Response(getPage(request,env),{headers:{'content-type':'text/html;charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
   demand(url.pathname.startsWith('/api/'),'not_found','not_found');
   if(url.pathname==='/api/source-import')throw new Fault('import_forbidden','forbidden');
   const owner=await resolveOwner(request,env);demand(nonempty(owner),'signin_required','unauthenticated');
   const app=createApplication(env);
   if(request.method==='GET'&&url.pathname==='/api/source-status')return json(await app.sourceStatus());
   if(request.method==='POST'){
    demand(!request.headers.get('Origin')||request.headers.get('Origin')===url.origin,'origin_forbidden','forbidden');
    if(url.pathname==='/api/commands'){
     const raw=await request.text();demand(bytes(raw)<=300000,'request_too_large','limit_exceeded');let c;try{c=JSON.parse(raw);}catch{throw new Fault('invalid_command','invalid');}
     demand(c&&typeof c==='object'&&!Array.isArray(c),'invalid_command');
     if(c.service_contract_version===PROFILE)return json(await app.boardCommand(owner,c));
     demand(c.service_contract_version===undefined,'unsupported_profile','unsupported');
     demand(c.type!=='create_workflow','legacy_creation_disabled','forbidden');return json(await app.legacyCommand(owner,c));
    }
   }
   if(request.method==='GET'&&url.pathname==='/api/workflows')return json(await app.listWorkflows(owner,listQuery(url.searchParams)));
   const documentMatch=url.pathname.match(/^\/api\/workflows\/([^/]+)\/documents\/([^/]+)$/);
   if(request.method==='GET'&&documentMatch)return json(await app.workflowDocument(owner,decodeURIComponent(documentMatch[1]),decodeURIComponent(documentMatch[2]),Number(url.searchParams.get('revision')||0),url.searchParams.get('mode')));
   const match=url.pathname.match(/^\/api\/workflows\/([^/]+)$/);
   if(request.method==='GET'&&match)return json(await app.workflowDetail(owner,decodeURIComponent(match[1]),url.searchParams.get('mode')||'auto'));
   const operation=url.pathname.match(/^\/api\/operations\/([^/]+)$/);
   if(request.method==='GET'&&operation)return json(await app.operationReceipt(owner,decodeURIComponent(operation[1])));
   throw new Fault('not_found','not_found');
  }catch(e){if(!(e instanceof Fault))console.error('workflow request failed',String(e));const failure=httpFailure(e);return json(failure.body,failure.status);}
 };
}
