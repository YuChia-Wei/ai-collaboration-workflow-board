import {createProjectClient} from './project-client.mjs';
import {createPortfolioPages, pbiKey} from './portfolio-pages.mjs';

const params = new URLSearchParams(location.search);
const store = params.get('store') || document.querySelector('meta[name="collaboration-store"]')?.content || '';
const product = params.get('product');

function url(values = {}) {
  const query = new URLSearchParams(store ? {store, ...values} : values);
  return query.size ? '?' + query.toString() : location.pathname;
}
const pages = createPortfolioPages(url);
const app = document.getElementById('app');
app.innerHTML = pages.header() + '<main><div id="feedback" role="status"></div><div id="page" aria-live="polite"></div></main>';
const main = document.getElementById('page');
const message = document.getElementById('feedback');
const recordMessage = text => { message.textContent = text; };
let current;
let pending;
let submitting = false;
let readSequence = 0;

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

async function load() {
  const sequence = ++readSequence;
  main.setAttribute('aria-busy','true');
  main.innerHTML='<p class="hint">正在讀取產品資料…</p>';
  try {
    let html;
    if (!store) {
      html=pages.connect();
    } else if (!product) {
      const projects=(await createProjectClient(store).list()).filter(p=>p.project_ref.project_id!=='legacy-personal');
      const results=await Promise.allSettled(projects.map(p=>read(p.project_ref.project_id,true)));
      html=pages.overview(projects,results);
    } else {
      const data=await read(product);
      if (sequence!==readSequence) return;
      current=data;
      if (params.has('flow')) html=pages.workflowPage(data,params.get('flow'));
      else if (params.has('pbi')) html=pages.pbiPage(data,params.get('repo'),params.get('pbi'));
      else html=pages.productBoard(data,params.get('tab')==='workflows');
    }
    if (sequence===readSequence) main.innerHTML=html;
  } catch(error) {
    if (sequence===readSequence) main.innerHTML=pages.failure(error);
  } finally {
    if (sequence===readSequence) {
      document.title=(main.querySelector('h1')?.textContent || '產品總覽')+' · Workflow Board';
      main.removeAttribute('aria-busy');
    }
  }
}

function commandFor(form){
  const command=form.dataset.command;
  const values=new FormData(form);
  const flowId=form.dataset.flow||values.get('flow')||params.get('flow');
  const flow=current.workflows.find(w=>w.workflow_id===flowId);
  const catalog=command==='workflow.unlink'?flow.pbis:current.catalog.pbis;
  const selected=values.getAll('pbi');
  const pbis=selected.map(key=>{
    const p=catalog.find(v=>pbiKey(v)===key);
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
