import {createProjectClient} from './project-client.mjs';
import {createSourceReplicaClient} from './source-replica-client.mjs';
import {esc} from './collaboration-view.mjs';
import {replicaBoardMarkup,replicaTaskMarkup} from './source-replica-view.mjs';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
let client=null,items=[],cursor=null,serial=0,selection=0,selectedIndex=null;
$('app').className='app c-app';
$('app').innerHTML=`<aside class="rail"><div class="brand">工作紀錄室</div><nav><a class="c-nav" href="?view=collaboration">Workflow 協作</a><a class="c-nav current" href="?view=source-replica">專案來源副本</a><a class="c-nav" href="/">人工與歷史來源</a></nav><p>來源端是讀寫權威。此處保存指定 revision 的唯讀副本。</p></aside><section class="list"><div class="list-head"><h1>專案來源副本</h1></div><form id="r-connect"><label for="r-store">資料空間（store ID）</label><input id="r-store" required><button>讀取專案</button></form><label for="r-project">專案</label><select id="r-project"><option value="">請先讀取資料空間</option></select><div id="r-list"></div><button id="r-more" hidden>載入更多</button></section><main class="detail" id="r-detail"><div class="topline"><button type="button" class="subtle" id="r-back">← 來源副本列表</button></div><div id="r-content" tabindex="-1"><p>選擇專案及來源 workflow。</p></div></main>`;
$('r-store').value=params.get('store')||document.querySelector('meta[name="collaboration-store"]')?.content||'';
const showError=(id,e)=>{$(id).textContent='讀取失敗：'+e.message;};
async function connect(){const turn=++serial;selection++;selectedIndex=null;$('app').classList.remove('show-detail');client=null;items=[];cursor=null;$('r-list').textContent='讀取專案…';$('r-content').textContent='請選擇專案。';$('r-project').innerHTML='<option value="">請選擇專案</option>';try{const projects=await createProjectClient($('r-store').value.trim()).list();if(turn!==serial)return;for(const p of projects.filter(p=>p.project_ref.project_id!=='legacy-personal')){const o=document.createElement('option');o.value=p.project_ref.project_id;o.textContent=p.name+' · '+o.value;$('r-project').append(o);} $('r-list').textContent='選擇明確專案後讀取副本。';const selected=params.get('project');if(projects.some(p=>p.project_ref.project_id===selected)){$('r-project').value=selected;await chooseProject();}}catch(e){if(turn===serial)showError('r-list',e);}}
async function chooseProject(){serial++;selection++;selectedIndex=null;$('app').classList.remove('show-detail');items=[];cursor=null;$('r-list').textContent='選擇明確專案後讀取副本。';$('r-more').hidden=true;$('r-content').textContent='選擇來源 workflow。';const project=$('r-project').value,store=$('r-store').value.trim();client=project?createSourceReplicaClient({store_id:store,namespace:'personal',project_id:project}):null;const u=new URL(location.href);u.searchParams.set('store',store);if(project)u.searchParams.set('project',project);else u.searchParams.delete('project');history.replaceState(null,'',u);await list(false);}
async function list(more){if(!client)return;const turn=++serial,current=client;try{const page=await current.query('replica.list',{limit:30,cursor:more?cursor:null});if(turn!==serial)return;items=more?[...items,...page.items]:page.items;cursor=page.cursor;$('r-more').hidden=!page.has_more;$('r-list').innerHTML=items.map((item,i)=>`<button class="item" data-index="${i}"><h2>${esc(item.workflow.title)}</h2><p>原始狀態：${esc(item.workflow.status)}</p><p>${esc(item.workflow_id)} · ${esc(item.source_id)}</p><p>來源版本 ${esc(item.source_revision)}<br>鏡像 revision ${item.revision} · 完整性已驗證</p></button>`).join('')||'<p>此專案尚無已公布的來源副本。</p>';}catch(e){if(turn===serial)showError('r-list',e);}}
async function choose(index,revision){
 const turn=++selection,current=client,item=items[index];if(!item||!current)return;
 selectedIndex=index;$('app').classList.add('show-detail');
 const ref={source_id:item.source_id,workflow_id:item.workflow_id,source_revision:revision??item.source_revision};
 $('r-content').textContent='讀取固定來源版本…';$('r-content').focus({preventScroll:true});
 try{
  const value=await current.query('replica.read',ref),files=await current.manifest(ref,value);
  if(turn!==selection)return;
  $('r-content').innerHTML=`<div class="hero"><h1>${esc(value.metadata.workflow.title)}</h1><span class="badge">${esc(value.metadata.workflow.status)}</span></div>
   <p class="small">${esc(value.project_ref.project_id)} · 唯讀來源副本 · ${value.file_count} 份文件</p>
   <div id="r-board" aria-live="polite">讀取任務看板…</div>
   <details class="panel" id="r-documents"><summary>文件與原始資料（${files.length}）</summary><div id="r-files">${files.map((file,i)=>`<button data-file="${i}">${esc(file.path)}</button>`).join(' ')}</div></details>
   <div id="r-file" tabindex="-1"></div>
   <details class="panel"><summary>來源與版本</summary><p>原始狀態 ${esc(value.metadata.workflow.status)} · 完整性已驗證 · ${value.total_bytes} bytes</p><p>來源 ${esc(ref.source_id)} · workflow ${esc(ref.workflow_id)}</p><p>保留來源紀錄，不代表 Board 執行或認領過這些任務。</p>
   <form id="r-revision"><label>來源版本 <input id="r-version" value="${esc(ref.source_revision)}" required></label><button>讀取固定版本</button></form><details><summary>原始 metadata / mapping</summary><pre class="c-raw">${esc(JSON.stringify(value.metadata,null,2))}</pre></details></details>`;
  $('r-revision').onsubmit=e=>{e.preventDefault();choose(index,$('r-version').value.trim());};
  $('r-content').onclick=async e=>{
   const button=e.target.closest('[data-file]');if(!button)return;
   const file=files[Number(button.dataset.file)];if(!file)return;
   button.disabled=true;
   try{
    const bytes=await current.file(ref,file);if(turn!==selection)return;
    const target=$('r-file');target.innerHTML=`<h2>${esc(file.path)}</h2><p class="small">原文 bytes / SHA-256 校驗相符</p>`;
    const download=document.createElement('button');download.textContent='下載 '+file.path;
    download.onclick=()=>{const url=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'})),a=document.createElement('a');a.href=url;a.download=file.path.split('/').at(-1);a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};target.append(download);
    try{const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(!text.includes('\u0000')){const pre=document.createElement('pre');pre.className='c-raw';pre.textContent=text;target.append(pre);}else target.append(document.createTextNode('二進位附件可完整下載。'));}
    catch{target.append(document.createTextNode('二進位附件可完整下載。'));}
    target.focus({preventScroll:true});target.scrollIntoView?.({block:'nearest'});
   }catch(error){if(turn===selection)showError('r-file',error);}finally{button.disabled=false;}
  };
  try{
   const board=await current.board(ref,value);if(turn!==selection)return;
   $('r-board').innerHTML=replicaBoardMarkup(board);
   $('r-board').onclick=e=>{
    const button=e.target.closest('[data-open-task]');if(!button)return;
    const task=board.tasks.find(t=>t.id===button.dataset.openTask);if(!task)return;
    for(const card of $('r-board').querySelectorAll('[data-open-task]'))card.setAttribute('aria-expanded','false');
    const detail=$('r-task-detail');detail.hidden=false;detail.innerHTML=replicaTaskMarkup(task,files.findIndex(f=>f.path===task.source_path));
    button.setAttribute('aria-expanded','true');button.setAttribute('aria-controls','r-task-detail');
    detail.focus({preventScroll:true});detail.scrollIntoView?.({block:'nearest'});
    $('r-task-close').onclick=()=>{detail.hidden=true;button.setAttribute('aria-expanded','false');button.focus();};
   };
  }catch(error){if(turn===selection){$('r-board').innerHTML=`<div class="warn" role="alert">任務看板讀取失敗：${esc(error.message)}。來源文件仍可查閱。<button id="r-retry">重新讀取看板</button></div>`;$('r-retry').onclick=()=>choose(index,ref.source_revision);}}
 }catch(error){if(turn===selection)showError('r-content',error);}
}
$('r-back').onclick=()=>{selection++;$('app').classList.remove('show-detail');$('r-content').textContent='從列表選擇來源 workflow。';const card=selectedIndex===null?null:$('r-list').querySelector(`[data-index="${selectedIndex}"]`);(card??$('r-project')).focus();};
$('r-connect').onsubmit=e=>{e.preventDefault();connect();};$('r-project').onchange=chooseProject;$('r-more').onclick=()=>list(true);$('r-list').onclick=e=>{const b=e.target.closest('[data-index]');if(b)choose(Number(b.dataset.index));};if($('r-store').value)connect();
