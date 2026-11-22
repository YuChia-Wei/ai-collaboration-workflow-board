import {createProjectClient} from './project-client.mjs';
import {escapeContent as esc, structuredMarkup} from './content-view.mjs';
import {badge} from './collaboration-view.mjs';
import {workspaceHeader, workspaceLabel, workspaceTitle} from './workspace-shell.mjs';
const params = new URLSearchParams(location.search);
const store = params.get('store') || document.querySelector('meta[name="collaboration-store"]')?.content || '';
const product = params.get('product');
const app = document.getElementById('app');
const keyOf = p => JSON.stringify([p.repository_id, p.issue_id]);
const titleOf = p => `#${p.number} ${p.title}`;
const coverageLabels = {complete:'完整', partial:'部分', unknown:'尚未讀取', stale:'來源過期'};
function url(values = {}) {
  return '?' + new URLSearchParams({view:'portfolio', ...(store ? {store} : {}), ...values});
}
function link(label, values, style='') {
  return `<a class="${style}" href="${esc(url(values))}">${esc(label)}</a>`;
}
function block(title, body) {
  return `<section class="pf-section"><h2>${esc(title)}</h2>${body}</section>`;
}
function note(text) {return `<p class="small">${esc(text)}</p>`;}
function pbiLink(id,p) {
  return link(titleOf(p), {product:id, repo:p.repository_id, pbi:p.issue_id});
}
const legacy = id => id === 'legacy-personal';
const flowLink = (id,w) => link(w.title, legacy(id) ? {view:'collaboration',project:id,workflow:w.workflow_id} : {product:id,flow:w.workflow_id});
const productLink = (id,name) => link(name,legacy(id) ? {view:'collaboration',project:id} : {product:id});
function scopeInfo(c) {
  return note(`PBI 來源：${coverageLabels[c.coverage] || c.coverage} · 觀察時間：${c.observed_at || '尚未提供'}`);
}
function issueCard(id,p) {
  return `<article class="pf-card"><h3>${pbiLink(id,p)}</h3>${note([p.repository_id,p.issue_state,p.project_status && 'Project 狀態：'+p.project_status].filter(Boolean).join(' · '))}</article>`;
}
function workflowCard(id,w) {
  const details = [
    ...(w.blocked_tasks||[]).map(t=>'受阻：'+(t.title||t.id)),
    ...(w.pending_decisions||[]).map(d=>'待決：'+(d.title||d.id))
  ];
  const associations=Array.isArray(w.pbis) ? w.pbis.map(titleOf).join('、') : w.pbi_count ? `關聯 ${w.pbi_count} 項 PBI` : '';
  return `<article class="pf-card"><div>${badge(w.status)}</div><h3>${flowLink(id,w)}</h3>${note(w.workflow_id+' · '+(w.source||'協作紀錄')+' · 最近更新：'+(w.updated_at||'尚未提供'))}
  ${details.length ? `<p class="warn">${esc(details.join('；'))}</p>`:''}
  ${note(associations||'尚未關聯 PBI')}</article>`;
}
async function request(kind, input) {
  const response = await fetch('/api/portfolio/v1/'+kind,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  const result = await response.json();
  if(kind==='command' && typeof result?.accepted==='boolean'){
    const ref=result.workflow_ref;
    if(result.operation_id!==input.operation_id || ref?.store_id!==store || ref?.project_id!==product || ref?.workflow_id!==input.workflow_id){
      throw new Error('回執與提交的工作不符');
    }
  }
  if (!response.ok || result.accepted === false) {
    throw Object.assign(new Error(result.failure?.error || result.error || '服務無法使用'), {definitive:response.status>=400 && response.status<500, receipt:result.accepted===false});
  }
  return result;
}
async function read(id,overview=false) {
  const result = await request('query',{store_id:store,project_id:id,...(overview?{view:'overview'}:{})});
  const validCatalog=overview ? result.catalog && Number.isSafeInteger(result.workflow_count) : Array.isArray(result.catalog?.pbis);
  if(result.product?.project_id!==id || !validCatalog || !Array.isArray(result.workflows)) throw new Error('資料回覆與產品不符');
  return result;
}
app.className='pf-app';
document.title=workspaceTitle('portfolio');
app.innerHTML=workspaceHeader('portfolio',store)+'<main class="pf-main"><div id="pf-message" role="status"></div><div id="pf-main" aria-live="polite"></div></main>';
const main = document.getElementById('pf-main');
const message = document.getElementById('pf-message');
const grid = cards => `<div class="pf-grid">${cards.join('')}</div>`;
const reload = () => '<button type="button" data-reload>重新讀取</button>';
const recordMessage = text => { message.textContent = text; };
let current;
let pending;
let submitting=false;
function connection() {
  return `<form class="pf-connect" method="get"><input type="hidden" name="view" value="portfolio"><label>資料空間（store ID）<input name="store" required value="${esc(store)}"></label><button>讀取資料空間</button></form>`;
}
async function home(){
  const projects = await createProjectClient(store).list();
  const results = await Promise.allSettled(projects.map(p=>read(p.project_ref.project_id,true)));
  const cards=[],active=[];
  let legacyCard='';
  let unread=0;
  projects.forEach((p,i)=>{
    const id=p.project_ref.project_id;
    const {status,value,reason}=results[i];
    if(status==='rejected') unread++;
    const summary=status==='fulfilled' ? scopeInfo(value.catalog)+note(`執行中 ${value.workflows.length} · 全部流程 ${value.workflow_count}`) : note('讀取失敗：'+reason.message);
    const card=`<article class="pf-card"><h3>${productLink(id,p.name)}</h3>${summary}</article>`;
    if(legacy(id)){
      if(status==='rejected'||value.workflow_count>0)legacyCard=card;
    }else cards.push(card);
    if(value){
      value.workflows.forEach(w=>active.push({id,name:p.name,w}));
    }
  });
  active.sort((a,b)=>String(b.w.updated_at||'').localeCompare(String(a.w.updated_at||'')));
  return `<h1>${workspaceLabel('portfolio')}</h1>${block('產品',cards.length?grid(cards):note('目前沒有可見產品。'))}
    ${block('進行中的工作',(unread?note('部分產品讀取失敗；以下只列已讀取的工作。'):'')+
      (active.length?grid(active.map(({id,name,w})=>`<div class="pf-product-work"><span class="small">${esc(name)}</span>${workflowCard(id,w)}</div>`)):note(unread?'已讀取的產品中沒有進行中的工作。':'目前沒有進行中的工作。')))}
    ${legacyCard?block('既有工作空間',legacyCard):''}
    <p class="small">首頁彙整協作流程。歷史來源與匯入的副本可由 ${link('人工與歷史來源',{view:'records'})} 及 ${link('專案來源副本',{view:'source-replica'})} 查閱。</p>
    <details><summary>資料連線設定</summary>${connection()}</details>${reload()}`;
}
function choices(pbis,selected){
  return pbis.map(p=>`<label class="pf-check"><input type="checkbox" name="pbi" value="${esc(keyOf(p))}" ${selected===keyOf(p)?'checked':''}>${esc(titleOf(p))} <small>${esc(p.repository_id)}</small></label>`).join('') || note('目前沒有可選的 PBI。');
}
function createForm(pbis,selected){
  return `<form data-command="workflow.create"><label>名稱<input name="title" required maxlength="160"></label>
  <label>工作目標<textarea name="goal" required maxlength="4000"></textarea></label>
  <fieldset><legend>關聯 PBI</legend>${choices(pbis,selected)}</fieldset><button class="primary">建立工作流程</button></form>`;
}
function productPage(data){
  const id=data.product.project_id, pbis=data.catalog.pbis, flows=data.workflows;
  const board=params.get('tab')==='workflows';
  const nav=`<nav class="pf-tabs" aria-label="產品看板"><a href="${esc(url({product:id}))}"${board?'':' aria-current="page"'}>Scrum 工作項目（PBI）</a><a href="${esc(url({product:id,tab:'workflows'}))}"${board?' aria-current="page"':''}>Workflow 執行看板</a></nav>`;
  let body;
  if(board){
    body=block('Workflow 執行看板',flows.length?grid(flows.map(w=>workflowCard(id,w))):note('目前沒有工作流程。'));
  }else{
    body=block('Scrum 工作項目（PBI）',scopeInfo(data.catalog)+(pbis.length?grid(pbis.map(p=>issueCard(id,p))):note(data.catalog.coverage==='complete'?'此產品有 0 筆 PBI。':'目前沒有可顯示的 PBI。')));
  }
  return `<h1>${esc(data.product.name)}</h1>${nav}${body}${data.can_plan?block('建立工作流程',createForm(pbis)):note('目前為唯讀權限。')}`;
}
function pbiPage(data){
  const id=data.product.project_id;
  const match=p=>p.issue_id===params.get('pbi')&&p.repository_id===params.get('repo');
  const observed=data.catalog.pbis.find(match);
  const p=observed||data.workflows.flatMap(w=>w.history.flatMap(h=>h.pbis)).find(match);
  if(!p) return `<h1>此產品目前的來源查無該 PBI</h1>${scopeInfo(data.catalog)}`;
  const flows=data.workflows.filter(w=>w.pbis.some(v=>keyOf(v)===keyOf(p)));
  const other=data.workflows.filter(w=>!flows.includes(w));
  const associated=flows.map(w=>`<div>${workflowCard(id,w)}${data.can_plan?unlinkForm(p,w.workflow_id):''}</div>`);
  const add=data.can_plan && observed && other.length ? block('補連既有工作流程',`<form data-command="workflow.link"><input type="hidden" name="pbi" value="${esc(keyOf(p))}"><label>工作流程<select name="flow">${other.map(w=>`<option value="${esc(w.workflow_id)}">${esc(w.title)} · ${esc(w.workflow_id)}</option>`).join('')}</select></label><button>補連工作流程</button></form>`) : '';
  return `<h1>${esc(titleOf(p))}</h1>${note([p.repository_id,p.issue_state,p.project_status&&'Project 狀態：'+p.project_status].filter(Boolean).join(' · '))}${scopeInfo(data.catalog)}
  ${block('關聯工作流程',associated.length?grid(associated):note('尚無關聯工作流程。'))}${add}
  ${!observed?note('此項目已不在目前來源，顯示已保存的 PBI 版本。'):data.can_plan?block('從 PBI 建立工作流程',createForm(data.catalog.pbis,keyOf(p))):note('目前為唯讀權限。')}`;
}
function unlinkForm(p,flowId){
  return `<form data-command="workflow.unlink" data-flow="${esc(flowId)}"><input type="hidden" name="pbi" value="${esc(keyOf(p))}"><button>解除關聯</button></form>`;
}
function flowPage(data) {
  const id=data.product.project_id;
  const w=data.workflows.find(w=>w.workflow_id===params.get('flow'));
  if(!w) return '<h1>此產品查無該工作流程</h1>';
  const candidates=data.catalog.pbis.filter(p=>!w.pbis.some(v=>keyOf(v)===keyOf(p)));
  const linked=w.pbis.map(p=>`<article class="pf-card">${pbiLink(id,p)}${data.can_plan?unlinkForm(p,w.workflow_id):''}</article>`);
  const history=w.history.map(h=>`<li><strong>${esc(({created:'建立',linked:'補連',unlinked:'解除'}[h.action])||h.action)}</strong> · ${esc(h.at)}<p>${h.pbis.map(p=>esc(titleOf(p))+' · '+esc(p.source_version)).join('、')||'無關聯 PBI'}</p></li>`);
  const facts=[...(w.checkpoints||[]),...(w.evidence||[])];
  const origin=w.history.find(h=>h.action==='created');
  const initialPbis=origin?.pbis||[];
  const inheritedRefs=origin?.external_work_refs||[];
  return `<h1>${esc(w.title)}</h1>${badge(w.status)}${note(w.workflow_id+' · '+(w.source||'協作紀錄')+' · 最近更新：'+(w.updated_at||'尚未提供'))}
    ${block('原始工作範圍',`<p>${esc(w.goal)}</p>${w.scope?structuredMarkup(w.scope):''}
    <h3>建立時的 PBI</h3>${initialPbis.length?initialPbis.map(p=>esc(titleOf(p))+' · '+esc(p.source_version)).join('、'):note('建立時未關聯 PBI。')}
    ${inheritedRefs.length?'<h3>既有外部參照</h3>'+structuredMarkup(inheritedRefs):''}`)}
    ${block('關聯 PBI',linked.length?grid(linked):note('尚未關聯 PBI'))}
    ${!data.can_plan?note('目前為唯讀權限。'):candidates.length?block('補連 PBI',`<form data-command="workflow.link"><fieldset><legend>選擇 PBI</legend>${choices(candidates)}</fieldset><button>補連 PBI</button></form>`):''}
    ${block('關聯歷史',history.length?`<ol class="pf-history">${history.join('')}</ol>`:note('尚無關聯變更紀錄。'))}
    ${block('工作證據',facts.length?structuredMarkup(facts):note('尚無工作證據。'))}
    ${block('交接與下一步',w.latest_handoff?structuredMarkup(w.latest_handoff):note('尚無交接紀錄。'))}`;
}
async function load(){
  if(product && legacy(product)){
    location.replace(url({view:'collaboration',project:product,...(params.get('flow')?{workflow:params.get('flow')}:{})}));
    return;
  }
  main.innerHTML=note('正在讀取產品資料…');
  try{
    if(!store) main.innerHTML='<h1>產品總覽</h1>'+note('尚未指定資料空間。')+connection();
    else if(!product) main.innerHTML=await home();
    else{
      current=await read(product);
      const detail=params.has('pbi')||params.has('flow');
      main.innerHTML=`<nav class="pf-crumb">${link('產品總覽',{})}${detail?' ／ '+productLink(product,current.product.name):''}</nav>`+
        (params.has('flow')?flowPage(current):params.has('pbi')?pbiPage(current):productPage(current))+reload();
    }
    document.title=workspaceTitle('portfolio',main.querySelector('h1')?.textContent);
  }catch(error){main.innerHTML=`<h1>讀取失敗</h1><p role="alert">${esc(error.message)}</p>${reload()} ${link('產品總覽',{})}`;}
}
function commandFor(form){
  const command=form.dataset.command;
  const values=new FormData(form);
  const flowId=form.dataset.flow||values.get('flow')||params.get('flow');
  const flow=current.workflows.find(w=>w.workflow_id===flowId);
  const catalog=command==='workflow.unlink'?flow.pbis:current.catalog.pbis;
  const selected=values.getAll('pbi');
  const pbis=selected.map(key=>{
    const p=catalog.find(v=>keyOf(v)===key);
    return {repository_id:p.repository_id,issue_id:p.issue_id,source_version:p.source_version};
  });
  const creating=command==='workflow.create';
  if(!creating&&!pbis.length)throw new Error('請選擇至少一項 PBI。');
  return {command,project_id:product,store_id:store,operation_id:crypto.randomUUID(),
    workflow_id:creating?'wf-'+crypto.randomUUID():flow.workflow_id,expected_revision:creating?0:flow.revision,pbis,
    ...(creating?{title:values.get('title').trim(),goal:values.get('goal').trim()}:{})};
}
async function submit(command) {
  if(submitting)return;
  const retrying=Boolean(pending);
  submitting=true;
  pending=command;
  main.inert=true;
  recordMessage('正在提交…');
  try{
    const result=await request('command',command);
    if(result.accepted!==true)throw new Error('無法確認服務回覆');
    pending=null;
    if(command.command==='workflow.create'){
      location.assign(url({product,flow:command.workflow_id}));
      return;
    }
    recordMessage('服務已接受變更。');
    await load();
  }catch(error){
    if(error.receipt || error.definitive && !retrying){pending=null;recordMessage(`服務拒絕變更：${error.message}。請重新讀取後確認。`);}
    else{
      recordMessage(`結果尚未確認：${error.message}。`);
      const retry=document.createElement('button');
      retry.textContent='重送相同請求';
      retry.onclick=()=>submit(command);
      message.append(retry);
    }
  }finally{main.inert=Boolean(pending);submitting=false;}
}
main.addEventListener('click',event=>{
  if(event.target.closest('[data-reload]'))load();
});
main.addEventListener('submit',event=>{
  const form=event.target.closest('[data-command]');
  if(!form)return;
  event.preventDefault();
  if(pending)return;
  try{submit(commandFor(form));}catch(error){recordMessage(error.message);}
});
window.addEventListener('beforeunload',event=>{
  if(pending){event.preventDefault();event.returnValue='';}
});
load();
