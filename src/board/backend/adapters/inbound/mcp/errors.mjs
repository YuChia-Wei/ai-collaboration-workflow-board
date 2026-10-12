import {Fault} from '../../../domain/errors.mjs';

/** Tool execution error mapping only; this does not install an MCP transport. */
export function mcpFailure(error){
 const known=error instanceof Fault;
 const body={error:known?error.error:'storage_unavailable',category:known?error.category:'unavailable',details:known?error.details:{}};
 return {isError:true,content:[{type:'text',text:JSON.stringify(body)}],structuredContent:body};
}
