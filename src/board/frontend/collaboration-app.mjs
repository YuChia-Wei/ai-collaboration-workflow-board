import {createCollaborationClient} from './collaboration-client.mjs';
import {esc,listMarkup,detailMarkup,taskMarkup,taskDetailShell,decisionMarkup,emptyCollaborationMarkup} from './collaboration-view.mjs';

const $=id=>document.getElementById(id);
let client,items=[],cursor=null,context=null,selected=null,tab='tasks',listSerial=0,selectionSerial=0,documentSerial=0,loadedDocument=null;
const preview=document.querySelector('meta[name="collaboration-preview"]')?.content;
const params=new URLSearchParams(location.search);
$('app').className='app c-app';
$('app').innerHTML=`<aside class="rail"><div class="brand"><span class="mark">≡</span>工作紀錄室</div><div><div class="rail-label">我的空間</div><nav><a class="c-nav current" href="?view=collaboration">Workflow 協作</a><a class="c-nav" href="/">人工與來源紀錄 ↗</a></nav></div><span class="stamp">${preview?'本機合成預覽':'私人協作空間'}</span><div class="rail-note"><strong>從進度到接手</strong>查看交辦、待決策問題與指定版本成果。<br>每一種完成，分開確認。</div></aside>
<section class="list"><div class="list-head"><h1>Workflow 協作</h1><span class="count" id="c-count">—</span></div><form id="c-connect"><label for="c-store">資料空間（store ID）</label><div class="c-connect"><input id="c-store" required placeholder="輸入已設定的 store ID"><button type="submit">讀取</button></div></form><label class="c-label" for="c-search">搜尋 workflow 名稱</label><input id="c-search" class="search" type="search" placeholder="搜尋名稱"><div id="c-list" aria-live="polite"><div class="empty">指定資料空間後讀取協作紀錄。</div></div><button id="c-more" hidden>載入更多</button><p class="small">唯讀檢視 · 不會自動認領工作<br>人工與來源快照另有獨立入口。</p></section>
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
async function connect(){
  ++listSerial;invalidateSelection();items=[];cursor=null;renderList();
  const store=$('c-store').value.trim();if(!store)return;
  client=createCollaborationClient(store);const serial=listSerial;
  $('c-list').innerHTML='<div class="loader">正在確認資料空間…</div>';
  try{await client.capabilities();if(serial!==listSerial)return;const url=new URL(location.href);url.searchParams.set('store',store);history.replaceState(null,'',url);await loadList(false);}
  catch(e){if(serial===listSerial){$('c-list').innerHTML=errorMarkup(e);$('c-retry').onclick=connect;}}
}
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
async function choose(id){
  const item=items.find(w=>w.workflow_ref.workflow_id===id);if(!item)return;
  const serial=++selectionSerial;documentSerial++;modal.close();context=null;selected=id;tab='tasks';renderList();
  $('app').classList.add('show-detail');$('c-detail').innerHTML='<div class="loader" role="status">正在取得一致的 workflow 快照…</div>';
  try{const value=await client.context(item.workflow_ref);if(serial!==selectionSerial)return;context=value;renderDetail();}
  catch(e){if(serial===selectionSerial){$('c-detail').innerHTML=errorMarkup(e,'c-detail-retry');$('c-detail-retry').onclick=()=>choose(id);}}
}
function renderDetail(){if(context){$('c-detail').classList.toggle('c-board-view',tab==='tasks');$('c-detail').innerHTML=detailMarkup(context,tab);}}
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
let timer;$('c-search').oninput=()=>{clearTimeout(timer);++listSerial;invalidateSelection();items=[];cursor=null;$('c-more').hidden=true;$('c-list').innerHTML='<div class="loader">正在搜尋…</div>';timer=setTimeout(()=>loadList(false),250);};
$('c-more').onclick=()=>loadList(true);
$('app').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.workflow)choose(b.dataset.workflow);
  if(b.dataset.tab){tab=b.dataset.tab;renderDetail();}
  if(b.id==='c-refresh')choose(selected);
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
