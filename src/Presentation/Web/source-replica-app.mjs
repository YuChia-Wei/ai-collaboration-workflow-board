import {createProjectClient} from './project-client.mjs';
import {createSourceReplicaClient} from './source-replica-client.mjs';
import {esc} from './collaboration-view.mjs';
import {replicaBoardMarkup,replicaTaskMarkup} from './source-replica-view.mjs';
import {documentMarkup,fileLibraryMarkup,resolveReplicaLink} from './document-view.mjs';
import {structuredMarkup,rawDisclosure} from './content-view.mjs';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
let client=null,items=[],cursor=null,serial=0,selection=0,selectedIndex=null;
$('app').className='app c-app';
$('app').innerHTML=`<aside class="rail"><div class="brand"><span class="mark" aria-hidden="true">≡</span>工作紀錄室</div><div><div class="rail-label">WORKSPACE</div><nav aria-label="工作空間"><a class="c-nav current" aria-current="page" href="?view=source-replica"><span class="nav-icon" aria-hidden="true">▦</span>專案來源副本</a><a class="c-nav" href="?view=collaboration"><span class="nav-icon" aria-hidden="true">◷</span>Workflow 協作</a><a class="c-nav" href="/"><span class="nav-icon" aria-hidden="true">▤</span>人工與歷史來源</a></nav></div><span class="stamp">私人工作空間</span><div class="rail-note"><strong>每一份工作，都有脈絡。</strong>保留來源、任務與交接，<br>從上次停下的地方繼續。</div></aside>
<section class="list" aria-label="來源工作流程"><div class="list-head"><h1>專案來源副本</h1></div><details class="connection-settings"><summary>資料連線設定</summary><form id="r-connect"><label for="r-store">資料空間（store ID）</label><input id="r-store" required><button>讀取專案</button></form></details><div class="project-picker"><label for="r-project">目前專案</label><select id="r-project"><option value="">請先讀取資料空間</option></select></div><label class="sr-only" for="r-search">搜尋已載入的工作流程</label><input class="search r-search" type="search" id="r-search" placeholder="搜尋已載入的名稱或 ID"><div class="list-divider"><span>工作流程</span><span id="r-count">—</span></div><div id="r-list" aria-live="polite"></div><button id="r-more" hidden>載入更多</button></section>
<main class="detail" id="r-detail"><div class="topline"><button type="button" class="subtle" id="r-back">← 來源副本列表</button><span>工作空間 / 來源紀錄</span></div><div id="r-content" tabindex="-1"><section class="welcome"><div class="welcome-mark" aria-hidden="true">▦</div><p class="workspace-kicker">YOUR WORK, IN CONTEXT</p><h1>接續每一段工作。</h1><p>從左側選擇專案與工作流程，<br>讓任務進度、成果與原始文件回到同一個畫面。</p><ol><li>選擇專案</li><li>開啟工作流程</li><li>點選任務，查看成果與來源</li></ol></section></div></main>`;
$('r-store').value=params.get('store')||document.querySelector('meta[name="collaboration-store"]')?.content||'';
const showError=(id,e)=>{$(id).textContent='讀取失敗：'+e.message;};
async function connect(){const turn=++serial;selection++;selectedIndex=null;$('app').classList.remove('show-detail');client=null;items=[];cursor=null;$('r-list').textContent='讀取專案…';$('r-content').textContent='請選擇專案。';$('r-project').innerHTML='<option value="">請選擇專案</option>';try{const projects=await createProjectClient($('r-store').value.trim()).list();if(turn!==serial)return;for(const p of projects.filter(p=>p.project_ref.project_id!=='legacy-personal')){const o=document.createElement('option');o.value=p.project_ref.project_id;o.textContent=p.name+' · '+o.value;$('r-project').append(o);} $('r-list').textContent='選擇明確專案後讀取副本。';const selected=params.get('project');if(projects.some(p=>p.project_ref.project_id===selected)){$('r-project').value=selected;await chooseProject();}}catch(e){if(turn===serial)showError('r-list',e);}}
async function chooseProject(){serial++;selection++;selectedIndex=null;$('app').classList.remove('show-detail');items=[];cursor=null;$('r-list').textContent='選擇明確專案後讀取副本。';$('r-more').hidden=true;$('r-content').textContent='選擇來源 workflow。';const project=$('r-project').value,store=$('r-store').value.trim();client=project?createSourceReplicaClient({store_id:store,namespace:'personal',project_id:project}):null;const u=new URL(location.href);u.searchParams.set('store',store);if(project)u.searchParams.set('project',project);else u.searchParams.delete('project');history.replaceState(null,'',u);await list(false);}
function renderList(){
 const query=$('r-search').value.trim().toLocaleLowerCase();
 const visible=items.map((item,index)=>({item,index})).filter(({item})=>[item.workflow.title,item.workflow_id,item.source_id].some(value=>String(value??'').toLocaleLowerCase().includes(query)));
 $('r-count').textContent=`${visible.length} / ${items.length} 已載入`;
 $('r-list').innerHTML=visible.map(({item,index})=>`<button class="item ${index===selectedIndex?'selected':''}" data-index="${index}" aria-pressed="${index===selectedIndex}"><div class="c-row"><span class="badge">${esc(item.workflow.status)}</span><span class="small">r${esc(item.revision)}</span></div><h2>${esc(item.workflow.title)}</h2><span class="record-id">${esc(item.workflow_id)}</span><div class="item-meta"><span>${esc(item.source_id)}</span><span>查看任務 →</span></div></button>`).join('')||`<div class="empty">${items.length?'沒有符合的工作流程。請調整搜尋，或載入更多紀錄。':'此專案尚無已公布的來源副本。重新匯入並公布後，工作流程會顯示在這裡。'}</div>`;
}
async function list(more){if(!client)return;const turn=++serial,current=client;try{const page=await current.query('replica.list',{limit:30,cursor:more?cursor:null});if(turn!==serial)return;items=more?[...items,...page.items]:page.items;cursor=page.cursor;$('r-more').hidden=!page.has_more;renderList();}catch(e){if(turn===serial)showError('r-list',e);}}
async function choose(index,revision){
 const turn=++selection,current=client,item=items[index];if(!item||!current)return;
 selectedIndex=index;renderList();$('app').classList.add('show-detail');
 const ref={source_id:item.source_id,workflow_id:item.workflow_id,source_revision:revision??item.source_revision};
 $('r-content').textContent='讀取固定來源版本…';$('r-content').focus({preventScroll:true});
 try{
  const value=await current.query('replica.read',ref),files=await current.manifest(ref,value);
  if(turn!==selection)return;
  $('r-content').innerHTML=`<p class="workspace-kicker">PROJECT WORKFLOW</p><div class="hero"><h1>${esc(value.metadata.workflow.title)}</h1><span class="badge">${esc(value.metadata.workflow.status)}</span></div>
   <div class="workspace-meta"><span>${esc(value.project_ref.project_id)}</span><span>唯讀來源副本</span><span>${value.file_count} 份文件</span></div>
   <nav class="workspace-tabs" aria-label="工作流程內容"><strong>任務看板</strong><a href="#r-documents">文件與原文 ↓</a><a href="#r-source">來源與版本 ↓</a></nav>
   <div id="r-board" aria-live="polite">讀取任務看板…</div>
   <section class="panel" id="r-documents"><h2>文件與附件 <span class="small">${files.length} 份</span></h2><div id="r-files">${fileLibraryMarkup(files)}</div></section>
   <div id="r-file" tabindex="-1"></div>
   <details class="panel" id="r-source"><summary>來源與版本</summary><p>原始狀態 ${esc(value.metadata.workflow.status)} · 完整性已驗證 · ${value.total_bytes} bytes</p><p>來源 ${esc(ref.source_id)} · workflow ${esc(ref.workflow_id)}</p><p>保留來源紀錄，不代表 Board 執行或認領過這些任務。</p>
   <form id="r-revision"><label>來源版本 <input id="r-version" value="${esc(ref.source_revision)}" required></label><button>讀取固定版本</button></form>${structuredMarkup(value.metadata)}${rawDisclosure(value.metadata,'查看原始 metadata / mapping')}</details>`;
  $('r-revision').onsubmit=e=>{e.preventDefault();choose(index,$('r-version').value.trim());};
  let fileSerial=0;
  $('r-content').onclick=async e=>{
   const sectionLink=e.target.closest('.workspace-tabs a');
   if(sectionLink){e.preventDefault();const section=$(sectionLink.getAttribute('href').slice(1));if(section){section.open=true;section.scrollIntoView?.({block:'start',behavior:'smooth'});}return;}
   const button=e.target.closest('[data-file]');if(!button)return;
   e.preventDefault();const fileTurn=++fileSerial;
   const file=files[Number(button.dataset.file)];if(!file)return;
   button.disabled=true;
   try{
    const bytes=await current.file(ref,file);if(turn!==selection||fileTurn!==fileSerial)return;
    const target=$('r-file');target.className='document-reader panel';target.innerHTML=`<div class="document-heading"><span class="workspace-kicker">DOCUMENT</span><h2>${esc(file.path.split('/').at(-1))}</h2><p class="small">${esc(file.path)}</p></div>`;
    const download=document.createElement('button');download.textContent='下載 '+file.path;
    download.onclick=()=>{const url=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'})),a=document.createElement('a');a.href=url;a.download=file.path.split('/').at(-1);a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};target.append(download);
    try{const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(!text.includes('\u0000')){const reading=document.createElement('div');reading.innerHTML=documentMarkup(text,{name:file.path,resolveLink:href=>resolveReplicaLink(href,file.path,files)});target.append(reading);}else target.append(document.createTextNode('二進位附件可完整下載。'));}
    catch{target.append(document.createTextNode('二進位附件可完整下載。'));}
    target.focus({preventScroll:true});target.scrollIntoView?.({block:'nearest'});
   }catch(error){if(turn===selection&&fileTurn===fileSerial)showError('r-file',error);}finally{button.disabled=false;}
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
$('r-search').oninput=renderList;
$('r-connect').onsubmit=e=>{e.preventDefault();connect();};$('r-project').onchange=chooseProject;$('r-more').onclick=()=>list(true);$('r-list').onclick=e=>{const b=e.target.closest('[data-index]');if(b)choose(Number(b.dataset.index));};if($('r-store').value)connect();
