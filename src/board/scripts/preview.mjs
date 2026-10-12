// Local-only UI verification. In-memory SQLite; never connects to hosted D1.
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const sql=new DatabaseSync(':memory:');
for(const file of (await readdir('backend/schema/migrations')).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile('backend/schema/migrations/'+file,'utf8'));
const fixture=resolve(process.argv[2]||'../../framework-import');const manifest=JSON.parse(await readFile(fixture+'/manifest.json','utf8'));
for(const row of manifest.records){const w=JSON.parse(await readFile(fixture+'/'+row.file,'utf8'));for(const d of Object.values(w.documents))sql.prepare('INSERT INTO source_documents(key,dataset,workflow_id,document_id,body,hash) VALUES(?,?,?,?,?,?)').run(manifest.source_commit+':'+w.id+':'+d.id,manifest.source_commit,w.id,d.id,JSON.stringify(d),'local-preview');w.documents={};sql.prepare('INSERT INTO source_records(key,dataset,workflow_id,body,hash) VALUES(?,?,?,?,?)').run(manifest.source_commit+':'+w.id,manifest.source_commit,w.id,JSON.stringify(w),'local-preview');}
sql.prepare('INSERT INTO source_state(key,value) VALUES(?,?)').run('active',manifest.source_commit);
const db={prepare(query){let args=[];return {query,bind(...a){args=a;return this;},get args(){return args;},async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};}};},async batch(statements){sql.exec('BEGIN');try{for(const s of statements)sql.prepare(s.query).run(...s.args);sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}}};
const worker=(await import(pathToFileURL(resolve('dist/server/index.js')))).default;
const port=4179;
createServer(async(req,res)=>{try{const buffers=[];for await(const chunk of req)buffers.push(chunk);const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','local-preview-owner');const response=await worker.fetch(new Request('http://127.0.0.1:'+port+req.url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(buffers)}:{})}),{DB:db});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){console.error(String(e));res.writeHead(500);res.end('Local preview failed');}}).listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port+' (ephemeral verification database)'));
