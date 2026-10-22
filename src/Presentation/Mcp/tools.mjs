import schema from '../../Contracts/CollaborationV1/schema.json' with {type:'json'};
import {availableCommands,collaborationQueries} from '../../Core/Workflows/Application/collaboration-queries.mjs';

const descriptions={
 'capabilities':'Read this store’s available collaboration commands, queries and limits.',
 'workflow.find':'Find owner-scoped workflow summaries; follow the opaque cursor with the same query.',
 'workflow.context':'Resume a workflow at one immutable revision. Read missing inputs and pages before executing; this does not claim a task.',
 'context.page':'Read the next tasks, decisions or handoffs page at the original context revision.',
 'task.read':'Read the exact task definition and state at the context revision.',
 'decision.read':'Read the exact decision revision, options and resolution at the context revision.',
 'document.read':'Read exact document bytes by revision and hash; never substitutes the latest version.',
 'operation.get':'Recover accepted, rejected or unknown outcome. Unknown requires keeping the original operation ID and request unchanged.',
 'workflow.create':'Create a draft workflow within the user-authorized goal and scope.',
 'plan.revise':'Save a plan and explicit task changes atomically; preserve unaffected task IDs and required deliveries.',
 'task.claim':'Claim a ready task for the authenticated agent; retain the returned assignment and revision.',
 'task.progress':'Report progress on your current assignment. Does not mark the task completed.',
 'task.complete':'Submit results for every completion criterion and finish your current assignment.',
 'task.release':'Save a handoff and release the current assignment for later claim.',
 'handoff.record':'Save information for continuation; does not release an assignment.',
};
function inputSchema(kind,name){
 const variant=schema.$defs[kind].oneOf.find(v=>v.properties[kind].const===name);
 const defs={};
 function collect(value){
  if(!value||typeof value!=='object')return;
  if(value.$ref){const key=value.$ref.replace('#/$defs/','');if(!Object.hasOwn(defs,key)){defs[key]=schema.$defs[key];collect(defs[key]);}}
  for(const item of Object.values(value))if(typeof item==='object')collect(item);
 }
 collect(variant);
 // JSON Schema patterns use substring matching, but the connected Site client
 // applies full-string matching. Spell the two substring rules equivalently
 // for both validators, including multiline prose; keep the portable contract.
 const projected=structuredClone({...variant,$defs:defs});
 function compatiblePatterns(value){
  if(!value||typeof value!=='object')return;
  if(value.pattern==='\\S')value.pattern='^[\\s\\S]*\\S[\\s\\S]*$';
  if(value.pattern==='^https://')value.pattern='^https://[\\s\\S]*$';
  for(const item of Object.values(value))if(typeof item==='object')compatiblePatterns(item);
 }
 compatiblePatterns(projected);return projected;
}
export function collaborationTools(access){
 return [...collaborationQueries.map(name=>['query',name]),...availableCommands(access).map(name=>['command',name])].map(([kind,name])=>({
  name:name.replaceAll('.','_'),description:(descriptions[name]??`Execute ${name} under the current workflow contract.`)+(kind==='command'?' Use a new operation ID only for a new request; after an uncertain response query the original operation.':'') ,
  inputSchema:inputSchema(kind,name),annotations:{readOnlyHint:kind==='query',destructiveHint:kind==='command',idempotentHint:true,openWorldHint:false},
 }));
}
