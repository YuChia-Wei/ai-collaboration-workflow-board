import {demand} from '../../Core/Workflows/Domain/errors.mjs';
import {verifyOrigin,readJson,jsonResponse} from '../Shared/collaboration-transport.mjs';
import {httpContractFailure,httpStatus} from './errors.mjs';

export function createPortfolioHandler(createServices,resolveAccess){
 return async(request,env)=>{
 try{
  verifyOrigin(request);
  if(request.method!=='POST')return jsonResponse({error:'method_not_allowed'},405,{Allow:'POST'});
  const match=/^\/api\/portfolio\/v1\/(command|query)$/.exec(new URL(request.url).pathname);
  demand(match,'not_found','not_found');
  const access=await resolveAccess(request,env),input=await readJson(request);
  const service=createServices(env);
  const result=await service[match[1]](access,input);
  return jsonResponse(result,result.accepted===false?(result.failure?httpStatus(result.failure):409):200);
 }catch(error){const failure=httpContractFailure(error);return jsonResponse(failure.body,failure.status);}
 };
}
