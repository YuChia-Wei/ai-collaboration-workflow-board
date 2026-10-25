import {demand} from '../../Core/Workflows/Domain/errors.mjs';
import {COLLABORATION_PROFILE} from '../../Core/Workflows/Domain/collaboration-workflow.mjs';
import {canonicalJson} from '../../Core/Workflows/Domain/collaboration-values.mjs';
import {parseContractJson} from './strict-json.mjs';

export const jsonResponse=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...headers}});
export function verifyOrigin(request){const origin=request.headers.get('origin');demand(!origin||origin===new URL(request.url).origin,'forbidden','forbidden');}
export function verifyEnvelope(value,version=null){
 const v=value?.service_contract_version==='workflow-board/collaboration/2'?2:1;
 demand(value?.service_contract_version===(v===2?'workflow-board/collaboration/2':COLLABORATION_PROFILE)&&(version===null||version===v),'unsupported_profile','unsupported');
 demand(value.schema_version===(v===2?'2.0':'1.0'),'unsupported_schema','unsupported');
 demand(new TextEncoder().encode(canonicalJson(value)).length<=300000,'limit_exceeded','limit_exceeded');
}
export async function readJson(request,limit=300000){
 demand(request.headers.get('content-type')?.split(';')[0].trim()==='application/json','invalid_content_type');
 const reader=request.body?.getReader();demand(reader,'invalid_json');
 const parts=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;demand(size<=limit,'limit_exceeded','limit_exceeded');parts.push(value);}}
 catch(error){await reader.cancel();throw error;}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
 let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{demand(false,'invalid_json');}
 return parseContractJson(text,limit);
}
