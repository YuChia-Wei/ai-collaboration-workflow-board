import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';

/** Real SQL and transactions under a local D1-shaped adapter, not hosted D1. */
export function sqliteCollaboration({throughMigration=Infinity}={}){
 const sqlite=new DatabaseSync(':memory:');
 const root=new URL('../../Infrastructure/Persistence/D1/Migrations/',import.meta.url);
 for(const file of readdirSync(root).filter(f=>f.endsWith('.sql')&&Number(f.slice(0,4))<=throughMigration).sort())sqlite.exec(readFileSync(new URL(file,root),'utf8'));
 const faults={zeroCas:false,failKind:null,loseResponse:false};
 const db={
  prepare(sql){let args=[];return {sql,get args(){return args;},bind(...values){args=values;return this;},async first(){return sqlite.prepare(sql).get(...args)??null;},async all(){return {results:sqlite.prepare(sql).all(...args)};}};},
  async batch(statements){
   sqlite.exec('BEGIN');let committed=false;
   try{
    const results=[];
    for(const s of statements){
     if(faults.zeroCas&&/^UPDATE (collaboration_heads|project_collaboration_heads|collaboration_projects) /.test(s.sql)){results.push({meta:{changes:0}});continue;}
     if(faults.failKind&&s.sql.startsWith(faults.failKind))throw Error('synthetic private SQL fault');
     results.push(sqlite.prepare(s.sql).run(...s.args));
    }
    sqlite.exec('COMMIT');committed=true;
    if(faults.loseResponse){faults.loseResponse=false;throw Error('synthetic response lost after commit');}
    return results;
   }catch(error){if(!committed)sqlite.exec('ROLLBACK');throw error;}
  },
 };
 return {sqlite,db,faults};
}
