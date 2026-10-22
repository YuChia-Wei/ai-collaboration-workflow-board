import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyBoardCommand,PROFILE} from '../Core/Workflows/Domain/board-workflow.mjs';
import {applyLegacyCommand} from '../Core/Workflows/Domain/legacy-workflow.mjs';
import {boardCommand} from '../Core/Workflows/Application/board.mjs';
import {hash} from '../Core/Workflows/Domain/values.mjs';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const core=resolve(root,'Core/Workflows');
async function modules(folder){
 const entries=await readdir(folder,{withFileTypes:true});
 return (await Promise.all(entries.map(entry=>entry.isDirectory()?modules(resolve(folder,entry.name)):[resolve(folder,entry.name)]))).flat().filter(path=>path.endsWith('.mjs'));
}
for(const layer of ['Domain','Application']){
 for(const path of await modules(resolve(core,layer))){
  const source=await readFile(path,'utf8');
  for(const imported of source.matchAll(/\b(?:import|export)\s+[^;]*?\bfrom\s*['"]([^'"]+)['"]/g)){
   assert.ok(imported[1].startsWith('.'),`${relative(root,path)} must not import runtime libraries`);
   const target=relative(core,resolve(dirname(path),imported[1])).replaceAll('\\','/');
   assert.ok(target.startsWith('Domain/')||(layer==='Application'&&target.startsWith('Application/')),`${relative(root,path)} must depend inward: ${target}`);
  }
  assert.doesNotMatch(source,/\b(?:db|repository)\.prepare\s*\(/,`${relative(root,path)} must not contain D1 SQL access`);
  assert.doesNotMatch(source,/\b(?:Request|Response|URLSearchParams)\b|\.results\b|JSON\.parse\(|new Date\(|Date\.now\(|\.headers\b|\benv\.DB\b/,`${relative(root,path)} must not depend on transport, persistence encoding or wall clock`);
  assert.doesNotMatch(source,/new Fault\(\d|,(?:401|403|404|409|413|422|503)[,)]/,`${relative(root,path)} must not choose HTTP status codes`);
 }
}
console.log('PASS domain and application imports depend inward; SQL remains in outbound adapters');

// These are the current deployment's composition files, not a shared host layer.
const composition=new Set(['Presentation/WebApi/entry.mjs','Presentation/WebApi/collaboration-services.mjs']);
const directoryEntries=new Map();
async function exactPath(target){
 let current=root;
 for(const segment of target.split('/')){
  if(!directoryEntries.has(current))directoryEntries.set(current,await readdir(current));
  assert.ok(directoryEntries.get(current).includes(segment),`Missing or incorrectly cased source path: ${target}`);
  current=resolve(current,segment);
 }
}
for(const side of ['Core','Presentation','Infrastructure']){
 for(const path of await modules(resolve(root,side))){
  const source=await readFile(path,'utf8');
  // Static imports/re-exports and literal dynamic imports must respect the
  // source boundary even though Sites packages both sides in one Worker.
  const imports=[...source.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*(?:\(\s*)?['"]([^'"]+)['"]/g)];
  for(const imported of imports){
   const specifier=imported[1]??imported[2];
   if(!specifier.startsWith('.'))continue;
   const target=relative(root,resolve(dirname(path),specifier)).replaceAll('\\','/');
   const sourcePath=relative(root,path).replaceAll('\\','/');
   const web=sourcePath.startsWith('Presentation/Web/');
   const allowed=web
    ? target.startsWith('Presentation/Web/')||target.startsWith('Contracts/')
    : side==='Infrastructure'
     ? ['Infrastructure/','Core/','Contracts/'].some(prefix=>target.startsWith(prefix))
     : side==='Core'
      ? target.startsWith('Core/')
      : ['Presentation/','Core/','Contracts/'].some(prefix=>target.startsWith(prefix))||(composition.has(sourcePath)&&target.startsWith('Infrastructure/'));
   assert.ok(allowed,`${sourcePath} crosses its source boundary: ${target}`);
   if(!web)assert.ok(!target.startsWith('Presentation/Web/'),`${sourcePath} must not import browser source`);
   await exactPath(target);
  }
 }
}
console.log('PASS Presentation, Infrastructure and Core boundaries; only entry composition selects infrastructure; exact path casing and prototype isolation');

const time='2026-10-07T00:00:00.000Z';
const command={service_contract_version:PROFILE,workflow_id:'pure-domain',operation_id:'create',expected_revision:0,type:'create_workflow',payload:{title:'人工測試',goal:'純領域',workflow_kind:'review',owner_skill:'owner',authorized_scope:'local',next_step:'加入任務',next_owner:'owner'}};
const created=await applyBoardCommand(null,command,time),original=structuredClone(created.w);
await applyBoardCommand(created.w,{...command,type:'add_task',expected_revision:1,payload:{id:'T1',title:'任務',owner_skill:'owner'}},time);
assert.deepEqual(created.w,original,'Domain reducer must not mutate its input aggregate');
const legacy=await applyLegacyCommand(null,{...command,payload:{title:'舊契約',goal:'測試'}},time),legacyOriginal=structuredClone(legacy.w);
await applyLegacyCommand(legacy.w,{...command,type:'log',expected_revision:1,payload:{text:'test'}},time);
assert.deepEqual(legacy.w,legacyOriginal,'Legacy reducer must not mutate its input aggregate');
console.log('PASS both reducers run without HTTP or D1 and preserve their input');

const receipt={accepted:true,revision:1},digest=await hash(command);
const fake={operations:{find:async()=>({digest,receipt})},board:{load:()=>assert.fail('Replay must precede aggregate load'),commit:()=>assert.fail('Replay must not write')}};
assert.deepEqual(await boardCommand(fake,'owner',command),receipt);
console.log('PASS command use case replays receipts through a fake repository port without D1');
