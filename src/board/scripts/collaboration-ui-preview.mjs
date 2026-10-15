// Local-only synthetic preview. Never imported by the production Worker.
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {sqliteCollaboration} from '../tests/fixtures/collaboration-sqlite.mjs';
import {collaborationUiFixture} from './collaboration-ui-fixture.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const envelope={service_contract_version:'workflow-board/collaboration/1',schema_version:'1.0'};
export async function startCollaborationPreview({port=0,output=null}={}) {
  const workerPath=resolve(root,'dist/server/index.js');
  const worker=(await import(pathToFileURL(workerPath).href)).default;
  const {sqlite,db}=sqliteCollaboration();
  const store='board-ui-preview',owner='synthetic-ui-owner';
  const binding={enabled:true,subject_id:'synthetic-agent',binding_id:'ui-preview-v1',capabilities:['read','plan','execute','manage']};
  const env={DB:db,COLLABORATION_STORE_ID:store,COLLABORATION_BINDINGS:JSON.stringify({[owner]:binding})};
  async function call(path,body){
    const response=await worker.fetch(new Request('http://preview.local'+path,{method:'POST',headers:{'content-type':'application/json','oai-authenticated-user-id':owner},body:JSON.stringify(body)}),env);
    const data=await response.json();if(!response.ok)throw Error('Preview setup failed: '+JSON.stringify(data));return data;
  }
  const query=(name,payload)=>call('/api/collaboration/v1/queries',{...envelope,query:name,payload});
  const plan=await collaborationUiFixture(store,'wb07-local-ui','2026-10-14T00:00:00.000Z');
  const receipts=[];
  try{
    for(const step of plan.steps){
      const request=structuredClone(step.request);
      if(step.assignment_task){const c=await query('workflow.context',{workflow_ref:request.workflow_ref,limit:20});request.payload.assignment=c.tasks.items.find(t=>t.id===step.assignment_task).assignment.ref;}
      const receipt=await call('/api/collaboration/v1/commands',request);if(!receipt.accepted)throw Error('Fixture command rejected');receipts.push(receipt);
    }
    const contexts=[];for(const ref of plan.workflow_refs)contexts.push(await query('workflow.context',{workflow_ref:ref,limit:20}));
    // Browsing has read capability only; the HTTP server exposes no command route.
    env.COLLABORATION_BINDINGS=JSON.stringify({[owner]:{...binding,capabilities:['read']}});
    let origin;
    const server=createServer(async(req,res)=>{
      const reject=status=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({error:'preview_route_forbidden'}));};
      if(req.headers.host!==new URL(origin).host)return reject(403);
      const path=new URL(req.url,origin).pathname;
      const isPage=req.method==='GET'&&path==='/';
      if(!isPage && !(req.method==='POST'&&path==='/api/collaboration/v1/queries'))return reject(403);
      if(!isPage && req.headers.origin!==origin)return reject(403);
      try{
        const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>300000)return reject(413);chunks.push(chunk);}
        const response=await worker.fetch(new Request(origin+req.url,{method:req.method,headers:{'content-type':'application/json','oai-authenticated-user-id':owner,...(!isPage?{origin}:{})},...(!isPage?{body:Buffer.concat(chunks)}:{})}),env);
        const headers=Object.fromEntries(response.headers);headers['cache-control']='no-store';
        res.writeHead(response.status,headers);
        res.end(isPage?(await response.text()).replace('</head>','<meta name="collaboration-preview" content="synthetic-local"></head>'):Buffer.from(await response.arrayBuffer()));
      }catch{res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({error:'storage_unavailable'}));}
    });
    await new Promise((done,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',done);});
    origin='http://127.0.0.1:'+server.address().port;
    const url=origin+'/?view=collaboration&store='+store;
    const evidence={source:'local synthetic / bundled Worker / in-memory SQLite',observed_at:new Date().toISOString(),url,worker_sha256:createHash('sha256').update(await readFile(workerPath)).digest('hex'),receipts,contexts};
    if(output){await mkdir(output,{recursive:true});await writeFile(resolve(output,'preview-evidence.json'),JSON.stringify(evidence,null,2));}
    return {url,origin,evidence,close:async()=>{await new Promise(done=>server.close(done));sqlite.close();}};
  }catch(e){sqlite.close();throw e;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const option=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
  const output=resolve(option('--output')||resolve(root,'../../.runtime/wb07-ui',new Date().toISOString().replace(/[:.]/g,'-')));
  const preview=await startCollaborationPreview({port:Number(option('--port')||4177),output});
  console.log('Synthetic local preview: '+preview.url);console.log('Evidence: '+output);
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await preview.close();process.exit(0);});
}
