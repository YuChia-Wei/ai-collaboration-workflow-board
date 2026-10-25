export const CLI_VERSION='0.1.0';
export const ENVELOPE=Object.freeze({service_contract_version:'workflow-board/collaboration/1',schema_version:'1.0'});
export class CliError extends Error{
 constructor(code,exitCode=2){super(code);this.code=code;this.exitCode=exitCode;}
}
const fail=code=>{throw new CliError(code);};
const general=['endpoint','store','namespace','project','contract','timeout-ms','json'];
const optionsByCommand={
 projects:['limit','cursor'],capabilities:[],find:['query','limit','cursor'],context:['workflow','limit','all'],
 page:['workflow','section','cursor','at-revision'],
 task:['workflow','task','at-revision','definition-revision'],
 decision:['workflow','decision','at-revision','decision-revision'],
 document:['workflow','document','document-revision','hash'],
 operation:['workflow','operation'],query:['file'],submit:['file'],
};
const flags=new Set(['json','all','allow-loopback']);
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(value)&&!['constructor','prototype','__proto__'].includes(value);
const integer=(value,min,max)=>{
 if(!/^(0|[1-9][0-9]*)$/.test(value??''))fail('invalid_integer');
 const number=Number(value);
 if(!Number.isSafeInteger(number)||number<min||number>max)fail('invalid_integer');
 return number;
};

export function parseArguments(argv,env){
 if(!argv.length||argv[0]==='help'||argv[0]==='--help')return {command:'help',json:argv.includes('--json')};
 if(argv[0]==='version'||argv[0]==='--version')return {command:'version',json:argv.includes('--json')};
 const [command,...args]=argv;
 if(!Object.hasOwn(optionsByCommand,command))fail('unknown_command');
 const allowed=new Set([...general,...optionsByCommand[command],'allow-loopback']);
 const options=Object.create(null);
 for(let i=0;i<args.length;i++){
  if(!args[i].startsWith('--'))fail('unexpected_argument');
  const name=args[i].slice(2);
  if(!allowed.has(name)||Object.hasOwn(options,name))fail('unknown_or_duplicate_option');
  if(flags.has(name)){options[name]=true;continue;}
  if(args[i+1]===undefined||args[i+1].startsWith('--'))fail('missing_option_value');
  options[name]=args[++i];
 }
 const endpoint=options.endpoint??env.WORKFLOW_BOARD_ENDPOINT;
 const store=options.store??env.WORKFLOW_BOARD_STORE;
 const namespace=options.namespace??env.WORKFLOW_BOARD_NAMESPACE;
 if(!endpoint||!validId(store)||namespace!=='personal')fail('endpoint_store_namespace_required');
 let url;try{url=new URL(endpoint);}catch{fail('invalid_endpoint');}
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/')fail('endpoint_must_be_origin');
 const loopback=url.protocol==='http:'&&['127.0.0.1','[::1]'].includes(url.hostname);
 if(url.protocol!=='https:'&&!(loopback&&options['allow-loopback']))fail('https_required');
 if(options['allow-loopback']&&!loopback)fail('loopback_option_requires_loopback');
 const token=env.WORKFLOW_BOARD_TOKEN;
 const sitesToken=env.WORKFLOW_BOARD_SITES_TOKEN;
 if(!/^wb1\.[A-Za-z0-9][A-Za-z0-9_-]{0,63}\.[A-Za-z0-9_-]{43}$/.test(token??''))fail('board_credential_required');
 if(!loopback&&(!sitesToken||/[\x00-\x20\x7f]/.test(sitesToken)))fail('sites_credential_required');
 if(loopback&&sitesToken)fail('sites_credential_forbidden_on_loopback');
 const project=options.project;
 if(project!==undefined&&!validId(project))fail('invalid_project');
 const version=options.contract??(project!==undefined&&project!=='legacy-personal'||command==='projects'?'2':'1');
 if(!['1','2'].includes(version))fail('invalid_contract');
 if(version==='1'&&(command==='projects'||project!==undefined&&project!=='legacy-personal'))fail('project_contract_mismatch');
 const scoped=version==='2';
 const envelope=scoped?{service_contract_version:'workflow-board/collaboration/2',schema_version:'2.0'}:ENVELOPE;
 const projectScope=scoped&&project!==undefined?{project_id:project}:{};
 const timeoutMs=integer(options['timeout-ms']??'15000',100,120000);
 const required=name=>options[name]??fail('missing_'+name.replaceAll('-','_'));
 const positive=name=>integer(required(name),1,Number.MAX_SAFE_INTEGER);
 const ref=()=>({store_id:store,namespace,record_kind:'collaboration',...projectScope,workflow_id:required('workflow')});
 let query,payload;
 switch(command){
  case 'projects':query='project.list';payload={store_id:store,namespace,limit:integer(options.limit??'100',1,100),cursor:options.cursor??null};break;
  case 'capabilities':query='capabilities';payload={store_id:store,namespace,...projectScope};break;
  case 'find':query='workflow.find';payload={store_id:store,namespace,...projectScope,q:options.query??'',limit:integer(options.limit??'20',1,50),cursor:options.cursor??null};break;
  case 'context':query='workflow.context';payload={workflow_ref:ref(),limit:integer(options.limit??'20',1,20)};break;
  case 'page':query='context.page';payload={workflow_ref:ref(),section:required('section'),cursor:required('cursor')};positive('at-revision');break;
  case 'task':query='task.read';payload={workflow_ref:ref(),task_id:required('task'),at_revision:positive('at-revision'),definition_revision:positive('definition-revision')};break;
  case 'decision':query='decision.read';payload={workflow_ref:ref(),decision_id:required('decision'),at_revision:positive('at-revision'),decision_revision:positive('decision-revision')};break;
  case 'document':query='document.read';payload={workflow_ref:ref(),document_ref:{document_id:required('document'),revision:positive('document-revision'),content_hash:required('hash')}};break;
  case 'operation':query='operation.get';payload={workflow_ref:ref(),operation_id:required('operation')};break;
  default:required('file');
 }
 return {command,json:!!options.json,all:!!options.all,endpoint:url.origin,store,namespace,project:scoped?(project??null):null,version:envelope.schema_version,timeoutMs,token,sitesToken,
  file:options.file,atRevision:options['at-revision']===undefined?undefined:positive('at-revision'),
  input:query?{...envelope,query,payload}:null};
}

export const HELP=`Workflow Board CLI ${CLI_VERSION}
Usage: workflow-board <command> [options]

  projects   [--limit 1..100] [--cursor CURSOR]
  capabilities
  find       [--query TEXT] [--limit 1..50] [--cursor CURSOR]
  context    --workflow ID [--limit 1..20] [--all]
  page       --workflow ID --section tasks|decisions|handoffs --cursor CURSOR --at-revision N
  task       --workflow ID --task ID --at-revision N --definition-revision N
  decision   --workflow ID --decision ID --at-revision N --decision-revision N
  document   --workflow ID --document ID --document-revision N --hash sha256:...
  operation  --workflow ID --operation ID
  query      --file query.json
  submit     --file command.json
  help | version

Project: --project ID selects collaboration/2; --project legacy-personal or omission
selects the fixed collaboration/1 legacy space. No environment project default.
Use projects to discover IDs; submit/query files carry their explicit version.
Use --contract 2 for registry queries without a workflow selection, including
project.legacy.preview and project.read with --project legacy-personal.

Connection: --endpoint HTTPS_ORIGIN --store ID --namespace personal
Or WORKFLOW_BOARD_ENDPOINT / WORKFLOW_BOARD_STORE / WORKFLOW_BOARD_NAMESPACE.
Credentials: WORKFLOW_BOARD_TOKEN and WORKFLOW_BOARD_SITES_TOKEN (environment only).
Flags override non-secret environment settings. No implicit endpoint or scope.
Options: --json, --timeout-ms 15000.
Synthetic local tests only: --allow-loopback with http://127.0.0.1 or http://[::1];
unset WORKFLOW_BOARD_SITES_TOKEN. Never send a live credential to a test server.

query/submit also accept workflow-board/source-replica/1 envelopes with explicit
--project ID. Source queries read immutable published versions; source commands
require plan capability. Save each exact command file before first dispatch.

submit reads an immutable full versioned command envelope. It first reads
the operation receipt, then sends at most one command POST. It never changes the
operation ID/revision/payload and never automatically retries a command.
After an uncertain response it queries that operation once and returns unknown;
rerun submit with the SAME file to have the server verify the command digest.
context --all follows pages from the same snapshot or fails, never truncates.

Exit codes: 0 successful read/accepted command; 2 input/configuration;
3 transport/protocol failure before a confirmed result; 4 business/auth rejection;
5 unknown operation outcome. JSON stdout uses workflow-board-cli/1; diagnostics
go to stderr. help/version work without credentials.
`;
