import {createReadStream} from 'node:fs';
import {CLI_VERSION,CliError,HELP,parseArguments} from './arguments.mjs';
import {parseContractJson} from '../Shared/strict-json.mjs';

export async function runCli({argv,env,stdout,stderr,createClient}){
let config;let resultCode=0;
const json=argv.includes('--json');
const secrets=[env.WORKFLOW_BOARD_TOKEN,env.WORKFLOW_BOARD_SITES_TOKEN].filter(Boolean);
function emit(value,exitCode){
 let redacted=false;
 function scrub(item){
  if(typeof item==='string'){
   for(const secret of secrets)if(item.includes(secret)){item=item.split(secret).join('[REDACTED]');redacted=true;}
   return item;
  }
  if(Array.isArray(item))return item.map(scrub);
  if(item&&typeof item==='object')return Object.fromEntries(Object.entries(item).map(([key,entry])=>[scrub(key),scrub(entry)]));
  return item;
 }
 // Scrub parsed strings, never JSON syntax. Even a malformed credential cannot
 // corrupt the output by replacing quotes or control characters in serialized JSON.
 const output=scrub({cli_contract_version:'workflow-board-cli/1',cli_version:CLI_VERSION,...value});
 if(redacted)output.redacted=true;
 stdout.write(JSON.stringify(output,null,json?0:2)+'\n');
 if(exitCode)stderr.write(`Workflow Board: ${value.status}; exit ${exitCode}. See stdout for the structured result.\n`);
 resultCode=exitCode;
}
async function readInput(file){
 const chunks=[];let size=0;
 try{
  for await(const chunk of createReadStream(file)){
   size+=chunk.length;if(size>300000)throw new CliError('input_too_large');
   chunks.push(chunk);
  }
  return parseContractJson(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)),300000);
 }catch(error){throw error instanceof CliError?error:new CliError('invalid_or_unreadable_input');}
}
try{
 config=parseArguments(argv,env);
 if(config.command==='help'||config.command==='version'){
  if(json)emit({status:'ok',data:config.command==='help'?{help:HELP}:{version:CLI_VERSION}},0);
  else stdout.write(config.command==='help'?HELP:CLI_VERSION+'\n');
 }else{
  const client=createClient(config);
  const input=config.input??await readInput(config.file);
  let output=config.command==='submit'?await client.submit(input):input?.query==='workflow.context'?await client.context(input,config.all):await client.query(input);
  if(config.command==='page'&&output.status==='ok'&&output.data.revision!==config.atRevision)output={status:'error',error:{code:'snapshot_mismatch'}};
  const invalidInput=output.error?.code?.startsWith('invalid_query_or_scope')||output.error?.code?.startsWith('invalid_command_or_scope');
  emit(output,invalidInput?2:({ok:0,accepted:0,rejected:4,error:3,unknown:5}[output.status]??3));
 }
}catch(error){emit({status:'error',error:{code:error instanceof CliError?error.code:'client_failure'}},error instanceof CliError?error.exitCode:3);}

return resultCode;
}
