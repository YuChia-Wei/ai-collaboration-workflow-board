import {httpContractFailure,httpStatus} from './errors.mjs';
import {demand} from '../../Core/Workflows/Domain/errors.mjs';
import {jsonResponse,verifyOrigin,verifyEnvelope,readJson} from '../Shared/collaboration-transport.mjs';

export function createCollaborationHttpHandler(createServices,resolveAccess){
 return async(request,env)=>{
  try{
   verifyOrigin(request);
   if(request.method!=='POST')return jsonResponse({error:'method_not_allowed'},405,{Allow:'POST'});
   const access=await resolveAccess(request,env),input=await readJson(request);verifyEnvelope(input);
   const services=createServices(env),path=new URL(request.url).pathname;
   if(path==='/api/collaboration/v1/commands'){
    const receipt=await services.executeCommand(access,input);
    return jsonResponse(receipt,receipt.accepted?200:httpStatus(receipt.failure));
   }
   demand(path==='/api/collaboration/v1/queries','not_found','not_found');
   return jsonResponse(await services.executeQuery(access,input));
  }catch(error){const failure=httpContractFailure(error);return jsonResponse(failure.body,failure.status);}
 };
}
