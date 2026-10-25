import {httpContractFailure,httpStatus} from './errors.mjs';
import {demand} from '../../Core/Workflows/Domain/errors.mjs';
import {jsonResponse,verifyOrigin,verifyEnvelope,readJson} from '../Shared/collaboration-transport.mjs';

export function createCollaborationHttpHandler(createServices,resolveAccess){
 return async(request,env)=>{
  try{
   verifyOrigin(request);
   if(request.method!=='POST')return jsonResponse({error:'method_not_allowed'},405,{Allow:'POST'});
   const path=new URL(request.url).pathname,match=/^\/api\/collaboration\/v([12])\/(commands|queries)$/.exec(path);
   demand(match,'not_found','not_found');
   const access=await resolveAccess(request,env),input=await readJson(request);verifyEnvelope(input,Number(match[1]));
   const services=createServices(env);
   if(match[2]==='commands'){
    const receipt=await services.executeCommand(access,input);
    return jsonResponse(receipt,receipt.accepted?200:receipt.failure?httpStatus(receipt.failure):409);
   }
   return jsonResponse(await services.executeQuery(access,input));
  }catch(error){const failure=httpContractFailure(error);return jsonResponse(failure.body,failure.status);}
 };
}
