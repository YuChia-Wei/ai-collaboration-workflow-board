// Development-only durable trial host. Never imported by the deployed Worker.
import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';

export const sha256=bytes=>'sha256:'+createHash('sha256').update(bytes).digest('hex');

export async function openTrialRuntime(directory){
 const sql=new DatabaseSync(join(directory,'board.sqlite'));
 try{
  sql.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS trial_migrations(name TEXT PRIMARY KEY, digest TEXT NOT NULL)');
  const migrations=join(directory,'source','src','board','backend','schema','migrations');
  for(const name of (await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort()){
   const source=await readFile(join(migrations,name)),digest=sha256(source);
   const prior=sql.prepare('SELECT digest FROM trial_migrations WHERE name=?').get(name);
   if(prior){if(prior.digest!==digest)throw Error('Pinned trial migration changed: '+name);continue;}
   sql.exec('BEGIN');
   try{sql.exec(source.toString('utf8'));sql.prepare('INSERT INTO trial_migrations(name,digest) VALUES(?,?)').run(name,digest);sql.exec('COMMIT');}
   catch(error){sql.exec('ROLLBACK');throw error;}
  }
  const db={
   prepare(text){let args=[];return {text,get args(){return args;},bind(...values){args=values;return this;},async first(){return sql.prepare(text).get(...args)??null;},async all(){return {results:sql.prepare(text).all(...args)};}};},
   async batch(statements){
    sql.exec('BEGIN');
    try{const results=statements.map(s=>sql.prepare(s.text).run(...s.args));sql.exec('COMMIT');return results;}
    catch(error){sql.exec('ROLLBACK');throw error;}
   },
  };
  const manifest=JSON.parse(await readFile(join(directory,'source-manifest.json'),'utf8'));
  const workerPath=join(directory,'worker.mjs');
  if(sha256(await readFile(workerPath))!==manifest.worker.sha256)throw Error('Pinned Worker bytes changed');
  const worker=(await import(pathToFileURL(workerPath).href)).default;
  const env={DB:db,COLLABORATION_STORE_ID:'board-project-trial',COLLABORATION_BINDINGS:JSON.stringify({'local-trial-owner':{enabled:true,subject_id:'project-trial-agent',binding_id:'local-project-trial-v1',capabilities:['read','plan','execute','manage']}})};
  // This is a synthetic local identity boundary, not Sites authentication.
  // A per-process secret is kept in memory; it is never written to evidence.
  const token=randomBytes(32).toString('hex');let origin;
  const server=createServer(async(req,res)=>{
   const credential=Buffer.from(req.headers.authorization??''),expected=Buffer.from('Bearer '+token);
   if(credential.length!==expected.length||!timingSafeEqual(credential,expected)){res.writeHead(401);res.end();return;}
   if(req.method!=='POST'||req.url!=='/mcp'){res.writeHead(404);res.end();return;}
   try{
    const chunks=[];let size=0;
    for await(const chunk of req){size+=chunk.length;if(size>320000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
    const headers=new Headers(req.headers);headers.delete('authorization');headers.set('oai-authenticated-user-id','local-trial-owner');
    const response=await worker.fetch(new Request(origin+'/mcp',{method:'POST',headers,body:Buffer.concat(chunks)}),env);
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
   }catch{res.writeHead(503);res.end('Local trial request failed');}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  origin='http://127.0.0.1:'+server.address().port;
  return {
   async request(body){
    const response=await fetch(origin+'/mcp',{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream',authorization:'Bearer '+token,'mcp-protocol-version':'2026-07-28','mcp-method':body.method,...(body.params?.name?{'mcp-name':body.params.name}:{})},body:JSON.stringify(body)});
    return {status:response.status,body:await response.json()};
   },
   async close(){await new Promise(resolve=>server.close(resolve));sql.close();},
  };
 }catch(error){sql.close();throw error;}
}
