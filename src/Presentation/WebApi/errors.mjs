import {Fault} from '../../Core/Workflows/Domain/errors.mjs';

const statusByCategory=Object.freeze({invalid:422,not_found:404,conflict:409,forbidden:403,unauthenticated:401,limit_exceeded:413,unsupported:501,unavailable:503});
export const httpStatus=fault=>statusByCategory[fault.category]??500;
export function httpFailure(error){
 if(error instanceof Fault)return {status:httpStatus(error),body:{error:error.error,...error.details}};
 return {status:503,body:{error:'storage_unavailable'}};
}

/** Collaboration wire mapping; transport routes are implemented separately. */
export function httpContractFailure(error){
 if(error instanceof Fault)return {status:httpStatus(error),body:{error:error.error,category:error.category,details:error.details}};
 return {status:503,body:{error:'storage_unavailable',category:'unavailable',details:{}}};
}
