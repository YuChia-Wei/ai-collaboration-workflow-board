// Local-only synthetic preview. Never imported by the production Worker.
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {sqliteCollaboration} from '../Tests/Fixtures/collaboration-sqlite.mjs';
import {seedPortfolioPreview} from './portfolio-fixture.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const previewCommands = new Map([
  ['/api/collaboration/v2/commands', ['project.create']],
  ['/api/portfolio/v1/command', [
    'backlog.create', 'backlog.edit', 'backlog.move', 'backlog.transition', 'backlog.configure_sprints', 'backlog.create_sprint', 'lifecycle.configure',
    'delivery.environment', 'delivery.policy', 'delivery.draft', 'delivery.record', 'delivery.attempt', 'delivery.observe',
    'delivery.applicability', 'workflow.create', 'workflow.link', 'workflow.unlink'
  ]]
]);
export async function startPortfolioPreview({port=0,output=null,seed=true}={}) {
  const workerPath=resolve(root,'dist/server/index.js');
  const worker=(await import(pathToFileURL(workerPath).href)).default;
  const {sqlite,db}=sqliteCollaboration();
  const store='board-ui-preview',owner='synthetic-ui-owner';
  const binding={enabled:true,subject_id:'synthetic-agent',binding_id:'ui-preview-v1',capabilities:['read','plan','execute','manage']};
  const env={DB:db,COLLABORATION_STORE_ID:store,COLLABORATION_BINDINGS:JSON.stringify({[owner]:binding})};
  async function call(path,body){
    const response=await worker.fetch(new Request('http://preview.local'+path,{method:'POST',headers:{'content-type':'application/json','oai-authenticated-user-id':owner},body:JSON.stringify(body)}),env);
    const data=await response.json();if(!response.ok||data.accepted===false)throw Error('Preview setup failed: '+JSON.stringify(data));return data;
  }
  try{
    if(seed) await seedPortfolioPreview(call,store);
    env.COLLABORATION_BINDINGS=JSON.stringify({[owner]:{...binding,capabilities:['read','plan']}});
    let origin;
    const server=createServer(async(req,res)=>{
      const reject=status=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({error:'preview_route_forbidden'}));};
      if(req.headers.host!==new URL(origin).host)return reject(403);
      const path=new URL(req.url,origin).pathname;
      const isPage=req.method==='GET'&&path==='/';
      const capabilityRoute = path==='/api/collaboration/v1/queries';
      const queryRoute = capabilityRoute || ['/api/collaboration/v2/queries','/api/portfolio/v1/query'].includes(path);
      const allowedCommands = previewCommands.get(path);
      if(!isPage && !(req.method==='POST'&&(queryRoute||allowedCommands)))return reject(403);
      if(req.method==='POST' && req.headers.origin!==origin)return reject(403);
      try{
        const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>300000)return reject(413);chunks.push(chunk);}
        const body=Buffer.concat(chunks);
        if(capabilityRoute && JSON.parse(body.toString()).query!=='capabilities')return reject(403);
        if(allowedCommands && !allowedCommands.includes(JSON.parse(body.toString()).command))return reject(403);
        const response=await worker.fetch(new Request(origin+req.url,{method:req.method,headers:{'content-type':'application/json','oai-authenticated-user-id':owner,...(req.method==='POST'?{origin}:{})},...(req.method==='POST'?{body}:{})}),env);
        const headers=Object.fromEntries(response.headers);headers['cache-control']='no-store';
        res.writeHead(response.status,headers);
        res.end(isPage?(await response.text()).replace('</head>','<meta name="collaboration-preview" content="synthetic-local"></head>'):Buffer.from(await response.arrayBuffer()));
      }catch{res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({error:'storage_unavailable'}));}
    });
    await new Promise((done,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',done);});
    origin='http://127.0.0.1:'+server.address().port;
    const url=origin+'/';
    const evidence={source:'local synthetic / bundled Worker / in-memory SQLite',observed_at:new Date().toISOString(),url,worker_sha256:createHash('sha256').update(await readFile(workerPath)).digest('hex')};
    if(output){await mkdir(output,{recursive:true});await writeFile(resolve(output,'preview-evidence.json'),JSON.stringify(evidence,null,2));}
    return {url,origin,evidence,close:async()=>{await new Promise(done=>server.close(done));sqlite.close();}};
  }catch(e){sqlite.close();throw e;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const option=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
  const portfolio=process.argv.includes('--portfolio');
  const outputArg=option('--output');
  const output=outputArg?resolve(outputArg):portfolio?null:resolve(root,'.runtime/wb07-ui',new Date().toISOString().replace(/[:.]/g,'-'));
  const preview=await startPortfolioPreview({port:Number(option('--port')||4177),output});
  console.log('Synthetic local preview: '+preview.url);if(output)console.log('Evidence: '+output);
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await preview.close();process.exit(0);});
}
