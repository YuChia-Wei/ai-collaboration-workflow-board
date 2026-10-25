import {createProjectClient} from './project-client.mjs';
import {createCollaborationClient} from './collaboration-client.mjs';
import {esc,listMarkup,detailMarkup,taskMarkup,taskDetailShell,decisionMarkup,emptyCollaborationMarkup} from './collaboration-view.mjs';
import {reviewTargets,reviewQueueMarkup,reviewEditorMarkup,createReviewDraft,reviewConfirmationMarkup} from './collaboration-review.mjs';

const $=id=>document.getElementById(id);
let client,items=[],cursor=null,context=null,selected=null,tab='tasks',listSerial=0,selectionSerial=0,documentSerial=0,loadedDocument=null;
let projectsClient,projects=[],pendingProjectCommand=null;
let reviewSerial=0,review=null,reviewDraft=null,reviewDirty=false,leaveDialogOpen=false;
async function leaveReview(){
  if(leaveDialogOpen)return false;
  if(reviewDirty){
    leaveDialogOpen=true;
    const discard=await new Promise(resolve=>{
      const dialog=document.createElement('dialog');dialog.className='c-leave-dialog';
      dialog.setAttribute('aria-labelledby','c-leave-title');dialog.setAttribute('aria-describedby','c-leave-description');
      dialog.innerHTML='<h2 id="c-leave-title">保留這份審閱草稿？</h2><p id="c-leave-description">草稿尚未保存到 Board。離開後會捨棄本頁的意見與確認內容。</p><div class="c-review-actions"><button id="c-keep-draft" autofocus>保留草稿，繼續編輯</button><button id="c-discard-draft">捨棄草稿並離開</button></div>';
      const finish=value=>{dialog.close();dialog.remove();resolve(value);};
      dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false);});
      dialog.querySelector('#c-keep-draft').onclick=()=>finish(false);
      dialog.querySelector('#c-discard-draft').onclick=()=>finish(true);
      document.body.append(dialog);dialog.showModal();
    });
    leaveDialogOpen=false;if(!discard)return false;
  }
  reviewSerial++;review=null;reviewDraft=null;reviewDirty=false;return true;
}
window.addEventListener('beforeunload',e=>{if(reviewDirty){e.preventDefault();e.returnValue='';}});
const preview=document.querySelector('meta[name="collaboration-preview"]')?.content;
const params=new URLSearchParams(location.search);
$('app').className='app c-app';
$('app').innerHTML=`<aside class="rail"><div class="brand"><span class="mark">≡</span>工作紀錄室</div><div><div class="rail-label">我的空間</div><nav><a class="c-nav current" href="?view=collaboration">Workflow 協作</a><a class="c-nav" href="/">人工與來源紀錄 ↗</a></nav></div><span class="stamp">${preview?'本機合成預覽':'私人協作空間'}</span><div class="rail-note"><strong>從進度到接手</strong>查看交辦、待決策問題與指定版本成果。<br>每一種完成，分開確認。</div></aside>
<section class="list"><div class="list-head"><h1>Workflow 協作</h1><span class="count" id="c-count">—</span></div><form id="c-connect"><label for="c-store">資料空間（store ID）</label><div class="c-connect"><input id="c-store" required placeholder="輸入已設定的 store ID"><button type="submit">讀取</button></div></form><label class="c-label" for="c-project">專案</label><select id="c-project"><option value="">請先讀取資料空間</option></select><p id="c-project-identity" class="small"></p><details class="c-project-management"><summary>建立或重新命名專案</summary><form id="c-project-form"><label for="c-project-id">新專案 ID（建立後固定）</label><input id="c-project-id" maxlength="160" placeholder="例如 framework"><label for="c-project-name">顯示名稱</label><input id="c-project-name" required maxlength="160"><button type="submit">建立專案</button><button type="button" id="c-project-rename">更新目前專案名稱</button></form><div id="c-project-message" role="status"></div></details><label class="c-label" for="c-search">搜尋 workflow 名稱</label><input id="c-search" class="search" type="search" placeholder="搜尋名稱"><div id="c-list" aria-live="polite"><div class="empty">指定資料空間後讀取協作紀錄。</div></div><button id="c-more" hidden>載入更多</button><p class="small">Workflow 檢視不會自動認領工作<br>人工與來源快照另有獨立入口。</p></section>
<main class="detail" id="c-detail"><div class="empty">從左側選擇 workflow，查看交辦與接手資訊。</div></main>`;
if(preview) {
  const notice=document.createElement('div');notice.className='c-preview';notice.textContent='本機合成資料 · 透過真實 Worker 查詢與本機 SQLite · 不代表線上資料、PO 核准或產品驗收';
  document.body.prepend(notice);
}
const modal=$('modal');modal.innerHTML='<header><h2 id="c-document-title">指定版本文件</h2><button id="c-close" aria-label="關閉文件">關閉</button></header><div id="c-document"></div>';
$('c-close').onclick=()=>modal.close();modal.addEventListener('close',()=>{documentSerial++;loadedDocument=null;});
$('c-store').value=params.get('store')||document.querySelector('meta[name="collaboration-store"]')?.content||'';
function errorMarkup(e,retry='c-retry'){return `<div class="notice" role="alert">${esc(e.message)}<br><button id="${retry}">重新讀取</button></div>`;}
function renderList(){$('c-list').innerHTML=listMarkup(items,selected);$('c-count').textContent=`${items.length}${cursor?'+':''}`;$('c-more').hidden=!cursor;}
function invalidateSelection(){selectionSerial++;documentSerial++;context=null;selected=null;modal.close();$('c-detail').innerHTML='<div class="empty">選擇 workflow 查看詳情。</div>';}
async function selectProject(id){
  if(pendingProjectCommand)return;
  if(!await leaveReview()){$('c-project').value=client?.projectId??'';return;}
  ++listSerial;invalidateSelection();items=[];cursor=null;client=null;renderList();
  const project=projects.find(p=>p.project_ref.project_id===id);
  $('c-project').value=project?id:'';
  $('c-project-identity').textContent=project?`${project.name} · ${id}${id==='legacy-personal'?' · 既有 collaboration/1':''}`:'';
  const url=new URL(location.href);if(project)url.searchParams.set('project',id);else url.searchParams.delete('project');history.replaceState(null,'',url);
  if(!project)return;
  const current=createCollaborationClient(project.project_ref.store_id,globalThis.fetch,id);current.projectId=id;client=current;
  const serial=listSerial;
  try{await current.capabilities();if(serial===listSerial)await loadList(false);}
  catch(e){if(serial===listSerial){$('c-list').innerHTML=errorMarkup(e);$('c-retry').onclick=()=>selectProject(id);}}
}
async function connect(){
  if(pendingProjectCommand||!await leaveReview())return;
  ++listSerial;invalidateSelection();items=[];cursor=null;client=null;renderList();
  projects=[];projectsClient=null;$('c-project').innerHTML='<option value="">請選擇專案</option>';$('c-project-identity').textContent='';
  const store=$('c-store').value.trim();if(!store)return;
  projectsClient=createProjectClient(store);const serial=listSerial;
  $('c-list').innerHTML='<div class="loader">正在讀取專案…</div>';
  try{
    const values=await projectsClient.list();if(serial!==listSerial)return;projects=values;
    $('c-project').innerHTML='<option value="">請選擇專案</option>'+projects.map(p=>`<option value="${esc(p.project_ref.project_id)}">${esc(p.name)} · ${esc(p.project_ref.project_id)}</option>`).join('');
    const url=new URL(location.href),id=url.searchParams.get('store')===store?url.searchParams.get('project'):null;url.searchParams.set('store',store);history.replaceState(null,'',url);
    $('c-list').innerHTML='<div class="empty">選擇專案後讀取 workflow。</div>';await selectProject(id);
  }catch(e){if(serial===listSerial){$('c-list').innerHTML=errorMarkup(e);$('c-retry').onclick=connect;}}
}
async function saveProject(rename=false){
  if(!projectsClient||!await leaveReview())return;
  if(!pendingProjectCommand){
    const current=projects.find(p=>p.project_ref.project_id===$('c-project').value);
    const id=rename?current?.project_ref.project_id:$('c-project-id').value.trim(),name=$('c-project-name').value.trim();
    if(!id||id==='legacy-personal'||!name||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(id)){$('c-project-message').textContent='請填寫有效的新專案 ID 與名稱；既有 personal 映射不可重新命名。';return;}
    pendingProjectCommand=projectsClient.command(rename?'project.rename':'project.create',id,name,rename?current.revision:0);
  }
  const command=pendingProjectCommand;
  $('c-project').disabled=true;$('c-store').disabled=true;
  $('c-project-id').disabled=true;$('c-project-name').disabled=true;
  try{
    const result=await projectsClient.submit(command);pendingProjectCommand=null;
    $('c-project-message').textContent=result.accepted?'專案已保存。':`未保存（${result.error}），請重新讀取專案版本。`;
    if(result.accepted){const url=new URL(location.href);url.searchParams.set('project',command.project_ref.project_id);history.replaceState(null,'',url);}
    await connect();
  }catch(e){
    if(e.definitive){pendingProjectCommand=null;$('c-project-message').textContent=`未保存（${e.code}）。請核對輸入或權限。`;return;}
    $('c-project-message').textContent=`結果尚未確認（${e.code}）。再次按保存會沿用原請求 ${command.operation_id}；離開前請下載原請求。`;
    const download=document.createElement('button');download.textContent='下載原請求';download.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(command,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='project-command.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('c-project-message').append(download);
  }finally{
    const pending=!!pendingProjectCommand;$('c-project').disabled=pending;$('c-store').disabled=pending;$('c-project-id').disabled=pending;$('c-project-name').disabled=pending;
  }
}
$('c-project').onchange=()=>selectProject($('c-project').value);
$('c-project-form').onsubmit=e=>{e.preventDefault();saveProject(false);};
$('c-project-rename').onclick=()=>saveProject(true);
window.addEventListener('beforeunload',e=>{if(pendingProjectCommand){e.preventDefault();e.returnValue='';}});
async function loadList(more=false){
  if(!client)return;
  const serial=++listSerial,currentClient=client;
  if(!more){invalidateSelection();items=[];cursor=null;$('c-count').textContent='—';$('c-list').innerHTML='<div class="loader">正在讀取 workflow…</div>';}
  $('c-more').disabled=true;$('c-list').setAttribute('aria-busy','true');
  try{
    const result=await currentClient.find($('c-search').value.trim(),more?cursor:null);if(serial!==listSerial)return;
    items=more?[...items,...result.items]:result.items;cursor=result.has_more?result.cursor:null;renderList();
    if(!more){
      if(items.length)await choose(items[0].workflow_ref.workflow_id);
      else {$('c-detail').innerHTML=emptyCollaborationMarkup(Boolean($('c-search').value.trim()));$('app').classList.add('show-detail');}
    }
  }catch(e){if(serial===listSerial){items=[];cursor=null;invalidateSelection();$('c-list').innerHTML=errorMarkup(e);$('c-more').hidden=true;$('c-retry').onclick=()=>loadList(false);}}
  finally{if(serial===listSerial){$('c-list').removeAttribute('aria-busy');$('c-more').disabled=false;}}
}
async function choose(id,keepTab=false){
  const item=items.find(w=>w.workflow_ref.workflow_id===id);if(!item)return;
  if(!await leaveReview())return;
  const serial=++selectionSerial;documentSerial++;modal.close();context=null;selected=id;if(!keepTab)tab='tasks';renderList();
  $('app').classList.add('show-detail');$('c-detail').innerHTML='<div class="loader" role="status">正在取得一致的 workflow 快照…</div>';
  try{const value=await client.context(item.workflow_ref);if(serial!==selectionSerial)return;context=value;renderDetail();}
  catch(e){if(serial===selectionSerial){$('c-detail').innerHTML=errorMarkup(e,'c-detail-retry');$('c-detail-retry').onclick=()=>choose(id);}}
}
function renderDetail(){if(context){$('c-detail').classList.toggle('c-board-view',tab==='tasks');$('c-detail').innerHTML=detailMarkup(context,tab);if(tab==='review')$('c-content').innerHTML=reviewQueueMarkup(context);}}
async function openReview(key){
  if(!context||!await leaveReview())return;
  const current=context,target=reviewTargets(current).find(t=>t.key===key);if(!target)return;
  const serial=++reviewSerial,editor=$('c-review-editor');editor.hidden=false;editor.innerHTML='<p role="status">正在讀取指定版本與證據…</p>';editor.focus({preventScroll:true});editor.scrollIntoView({block:'start',behavior:'smooth'});
  try{
    const summary=current[target.kind==='decision'?'decisions':'tasks'].items.find(t=>t.id===target.id);
    const record=await client[target.kind](current,summary);
    if(serial!==reviewSerial||context!==current||!editor.isConnected)return;
    review={context:current,target,record};editor.innerHTML=reviewEditorMarkup(current,target,record);
  }catch(e){if(serial===reviewSerial&&editor.isConnected){
    editor.innerHTML=`<div class="notice" role="alert">${esc(e.message)}</div><button data-review="${esc(key)}">重試讀取</button><button id="c-refresh">重新讀取 workflow</button>`;
  }}
}
function downloadDraft(){
  if(!reviewDraft)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(reviewDraft,null,2)],{type:'application/json;charset=utf-8'})),a=document.createElement('a');
  a.href=url;a.download='review-draft-unsent.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function readPart(kind,id,button){
  const current=context,serial=selectionSerial,currentTab=tab;
  const summary=current[kind==='task'?'tasks':'decisions'].items.find(x=>x.id===id);
  if(kind==='task'){
    document.querySelectorAll('.c-task-card').forEach(card=>{card.classList.toggle('selected',card===button);card.setAttribute('aria-expanded',String(card===button));});
    const detail=$('c-task-detail');detail.innerHTML=taskDetailShell(summary);detail.hidden=false;detail.focus({preventScroll:true});detail.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  const target=$(`c-${kind}-${id}`);
  button.disabled=true;target.innerHTML='<p role="status">正在讀取指定版本…</p>';
  try{const result=await client[kind](current,summary);if(serial!==selectionSerial||currentTab!==tab||!target.isConnected)return;target.innerHTML=kind==='task'?taskMarkup(result):decisionMarkup(result);}
  catch(e){if(serial!==selectionSerial||!target.isConnected)return;if(e.code==='snapshot_expired'){context=null;$('c-detail').innerHTML=errorMarkup(e,'c-detail-retry');$('c-detail-retry').onclick=()=>choose(selected);}else target.innerHTML=`<div class="notice" role="alert">${esc(e.message)} 可再次按上方按鈕重試。</div>`;}
  finally{button.disabled=false;}
}
async function openDocument(ref){
  const current=context,serial=++documentSerial;loadedDocument=null;
  $('c-document-title').textContent=`${ref.document_id} · revision ${ref.revision}`;
  $('c-document').innerHTML='<p role="status">讀取指定版本並校驗原文…</p>';if(!modal.open)modal.showModal();
  try{
    const doc=await client.document(current.workflow_ref,ref);if(serial!==documentSerial||context!==current)return;loadedDocument=doc;
    $('c-document').innerHTML=`<p class="small c-hash">${esc(ref.content_hash)}</p><p class="small">原文校驗相符 · 此文件為資料，不構成新的操作授權。</p><button id="c-download">下載此版原文</button><pre class="c-raw">${esc(doc.content)}</pre>`;
    $('c-download').onclick=()=>{const url=URL.createObjectURL(new Blob([loadedDocument.content],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`${ref.document_id}-r${ref.revision}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  }catch(e){if(serial===documentSerial){$('c-document').innerHTML=errorMarkup(e,'c-doc-retry');$('c-doc-retry').onclick=()=>openDocument(ref);}}
}
$('c-connect').onsubmit=e=>{e.preventDefault();connect();};
let timer;$('c-search').oninput=async()=>{if(!await leaveReview())return;clearTimeout(timer);++listSerial;invalidateSelection();items=[];cursor=null;$('c-more').hidden=true;$('c-list').innerHTML='<div class="loader">正在搜尋…</div>';timer=setTimeout(()=>loadList(false),250);};
$('c-more').onclick=()=>loadList(true);
$('app').addEventListener('change',e=>{
  if(e.target.id==='c-review-filter'){
    let shown=0;document.querySelectorAll('[data-review-kind]').forEach(item=>{item.hidden=e.target.value!=='all'&&item.dataset.reviewKind!==e.target.value;if(!item.hidden)shown++;});
    $('c-review-filter-empty').hidden=shown>0;
  }
});
$('app').addEventListener('input',e=>{if(e.target.closest('#c-review-form')){reviewDirty=true;reviewDraft=null;$('c-review-confirmation').innerHTML='';}});
$('app').addEventListener('submit',e=>{
  if(e.target.id!=='c-review-form')return;e.preventDefault();if(!review)return;
  try{
    reviewDraft=createReviewDraft(review.context,review.target,review.record,{outcome:$('c-review-outcome').value,reason:$('c-review-reason').value});
    $('c-review-confirmation').innerHTML=reviewConfirmationMarkup(reviewDraft);$('c-review-confirmation').scrollIntoView({block:'nearest',behavior:'smooth'});
  }catch(error){$('c-review-confirmation').innerHTML=`<p class="notice" role="alert">${esc(error.message)}</p>`;}
});
$('app').addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.workflow)choose(b.dataset.workflow);
  if(b.dataset.tab){if(!await leaveReview())return;tab=b.dataset.tab;renderDetail();}
  if(b.id==='c-refresh')choose(selected,true);
  if(b.dataset.review)openReview(b.dataset.review);
  if(b.id==='c-review-close'&&await leaveReview()){$('c-review-editor').hidden=true;document.querySelector('[data-review]')?.focus();}
  if(b.id==='c-review-download')downloadDraft();
  if(b.id==='c-review-edit'){$('c-review-reason').focus();$('c-review-reason').scrollIntoView({block:'center'});}
  if(b.id==='c-back')$('app').classList.remove('show-detail');
  if(b.id==='c-task-close'){
    const card=document.querySelector('.c-task-card.selected');$('c-task-detail').hidden=true;
    if(card){card.classList.remove('selected');card.setAttribute('aria-expanded','false');card.focus();}
  }
  if(b.dataset.task)readPart('task',b.dataset.task,b);
  if(b.dataset.decision)readPart('decision',b.dataset.decision,b);
  if(b.dataset.document)openDocument(JSON.parse(b.dataset.document));
});
if($('c-store').value)connect();
