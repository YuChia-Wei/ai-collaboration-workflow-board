// Execute the real UI module with controlled read-only clients and a minimal DOM.
// This checks navigation/state and the existing CSS contract, not browser rendering.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContext,SourceTextModule,SyntheticModule} from 'node:vm';
const source=await readFile(new URL('../Presentation/Web/source-replica-app.mjs',import.meta.url),'utf8'),css=await readFile(new URL('../Presentation/Web/collaboration.css',import.meta.url),'utf8');
const mobileStart=css.indexOf('@media(max-width:650px){.c-app');assert.ok(mobileStart>=0);let depth=0,end=mobileStart;
for(let i=css.indexOf('{',mobileStart);i<css.length;i++){if(css[i]==='{')depth++;if(css[i]==='}'&&!--depth){end=i+1;break;}}
const mobile=css.slice(mobileStart,end);
for(const rule of ['.c-app .detail{display:none','.c-app.show-detail .list{display:none}', '.c-app.show-detail .detail{display:block}'])assert.ok(mobile.includes(rule),rule);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
async function harness(width){
 const nodes=new Map(),cards=new Map();let activeElement=null,pending=null;
 class Element{
  constructor(id=''){this.id=id;this.value='';this.className='';this.html='';this.ids=[];this.children=[];this.classList={add:name=>{if(!this.classList.contains(name))this.className+=' '+name;},remove:name=>{this.className=this.className.split(' ').filter(v=>v!==name).join(' ');},contains:name=>this.className.split(' ').includes(name)};}
  set innerHTML(value){for(const id of this.ids)nodes.delete(id);this.ids=[];this.html=value;for(const match of value.matchAll(/\bid="([^"]+)"/g)){this.ids.push(match[1]);nodes.set(match[1],new Element(match[1]));}}
  get innerHTML(){return this.html;}
  set textContent(value){this.innerHTML=String(value);}
  get textContent(){return this.html;}
  append(element){this.children.push(element);}
  focus(){activeElement=this;}
  querySelector(selector){if(this.id==='r-list'){const index=/data-index="(\d+)"/.exec(selector)?.[1];if(index!==undefined&&this.html.includes(`data-index="${index}"`)){if(!cards.has(index)){const card=new Element();card.dataset={index};cards.set(index,card);}return cards.get(index);}}return null;}
 }
 nodes.set('app',new Element('app'));
 const document={getElementById:id=>nodes.get(id)??null,querySelector:()=>null,createElement:()=>new Element(),createTextNode:value=>value};
 const project_ref={store_id:'local',namespace:'personal',project_id:'A'},item={source_id:'sqlite',workflow_id:'WF',source_revision:'fixed-1',revision:1,workflow:{id:'WF',title:'Source detail',status:'done'}};
 const header={project_ref,...item,metadata:{source:{kind:'sqlite'},workflow:item.workflow},file_count:0,total_bytes:0};
 const clients={createProjectClient:()=>({list:async()=>['A','B'].map(project_id=>({project_ref:{...project_ref,project_id},name:project_id}))}),createSourceReplicaClient:ref=>({query:async(name)=>{if(name==='replica.list')return {items:[item],cursor:null,has_more:false};if(pending){const current=pending;pending=null;return current.promise;}return {...header,project_ref:ref};},manifest:async()=>[]}),esc:value=>String(value??'').replaceAll('<','&lt;')};
 const location={href:'https://ui.test/?view=source-replica',search:'?view=source-replica'},context=createContext({document,location,history:{replaceState(){}},URL,URLSearchParams,innerWidth:width});
 const module=new SourceTextModule(source,{context});await module.link(async specifier=>{const name=specifier.includes('source-replica-client')?'createSourceReplicaClient':specifier.includes('project-client')?'createProjectClient':'esc';return new SyntheticModule([name],function(){this.setExport(name,clients[name]);},{context});});await module.evaluate();
 const get=id=>nodes.get(id),settle=async()=>{for(let i=0;i<5;i++)await tick();};
 get('r-store').value='local';get('r-connect').onsubmit({preventDefault(){}});await settle();get('r-project').value='A';await get('r-project').onchange();
 const visibility=()=>{const detail=get('app').classList.contains('show-detail');return width<=650?{list:!detail,detail}:{list:true,detail:true};};
 return {get,visibility,settle,wait:()=>{const d=deferred();pending=d;return d;},click:()=>get('r-list').onclick({target:{closest:()=>({dataset:{index:'0'}})}}),active:()=>activeElement};
}
let passed=0;
for(const width of [515,1200]){
 const h=await harness(width),back=h.get('r-back');assert.ok(back);assert.deepEqual(h.visibility(),{list:true,detail:width>650});
 const load=h.wait();h.click();assert.equal(h.get('app').classList.contains('show-detail'),true);assert.equal(h.visibility().detail,true);assert.match(h.get('r-content').textContent,/讀取固定來源版本/);assert.equal(h.get('r-back'),back);assert.equal(h.active(),h.get('r-content'));
 load.resolve({project_ref:{store_id:'local',namespace:'personal',project_id:'A'},metadata:{source:{},workflow:{title:'Source detail',status:'done'}},workflow_id:'WF',file_count:0,total_bytes:0});await h.settle();assert.match(h.get('r-content').innerHTML,/Source detail/);assert.equal(h.get('r-back'),back);back.onclick();assert.deepEqual(h.visibility(),{list:true,detail:width>650});assert.equal(h.active().dataset.index,'0');passed++;
 const error=h.wait();h.click();error.reject(Error('synthetic read failure'));await h.settle();assert.equal(h.visibility().detail,true);assert.match(h.get('r-content').textContent,/讀取失敗：synthetic read failure/);assert.equal(h.get('r-back'),back);back.onclick();assert.equal(h.visibility().list,true);passed++;
 const stale=h.wait();h.click();back.onclick();stale.resolve({metadata:{workflow:{title:'STALE'}},project_ref:{}});await h.settle();assert.equal(h.get('app').classList.contains('show-detail'),false);assert.doesNotMatch(h.get('r-content').innerHTML,/STALE/);passed++;
 const otherProject=h.wait();h.click();h.get('r-project').value='B';await h.get('r-project').onchange();otherProject.resolve({metadata:{workflow:{title:'OLD PROJECT'}},project_ref:{}});await h.settle();assert.equal(h.get('app').classList.contains('show-detail'),false);assert.doesNotMatch(h.get('r-content').innerHTML,/OLD PROJECT/);h.get('r-project').value='';await h.get('r-project').onchange();assert.equal(h.visibility().list,true);assert.equal(h.get('app').classList.contains('show-detail'),false);assert.doesNotMatch(h.get('r-list').innerHTML,/data-index/);assert.equal(h.get('r-more').hidden,true);passed++;
 h.get('r-project').value='A';await h.get('r-project').onchange();h.click();await h.settle();h.get('r-connect').onsubmit({preventDefault(){}});await h.settle();assert.equal(h.get('app').classList.contains('show-detail'),false);assert.equal(h.visibility().list,true);passed++;
 console.log(`PASS source detail navigation at ${width}px: loading/success/back, error/back, stale response, project change/clear and reconnect`);
}
console.log(`${passed} focused navigation scenarios passed; CSS/state harness, no rendered-browser or hosted acceptance claim`);
