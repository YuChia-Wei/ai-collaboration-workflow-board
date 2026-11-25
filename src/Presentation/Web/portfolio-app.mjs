import {createProjectClient} from './project-client.mjs';
import {createCollaborationClient} from './collaboration-client.mjs';
import {createPortfolioPages, pbiKey} from './portfolio-pages.mjs';
import {updateSprintDates} from './sprint-planning.mjs';
import {availablePbis, kindFields, nativeItems} from './native-backlog.mjs';
import {lifecycleChange, lifecycleClick, lifecycleCommand} from './pbi-lifecycle.mjs';
import {deliveryCommand} from './delivery-view.mjs';
import {focusStageAction, stageDropTarget} from './pbi-status-board.mjs';

const params = new URLSearchParams(location.search);
const store = params.get('store') || document.querySelector('meta[name="collaboration-store"]')?.content || '';
const product = params.get('product');
const projectClient = createProjectClient(store);

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
    const workflow=input.command.startsWith('workflow.');
    const ref=workflow ? result.workflow_ref : result;
    if(result.operation_id!==input.operation_id || ref?.store_id!==input.store_id || ref?.project_id!==input.project_id ||
        (workflow && ref?.workflow_id!==input.workflow_id) || (!workflow && !Number.isSafeInteger(result.revision))) throw new Error('回執與提交的項目不符');
  }
  if (!response.ok || result.accepted === false) {
    throw Object.assign(new Error(result.failure?.error || result.error || '服務無法使用'), {definitive:response.status>=400 && response.status<500, receipt:result.accepted===false});
  }
  return result;
}
async function read(id,overview=false) {
  const result = await request('query',{store_id:store,project_id:id,...(overview?{view:'overview'}:{})});
  const validCatalog=overview ? result.catalog && Number.isSafeInteger(result.workflow_count) : Array.isArray(result.catalog?.pbis);
  const validBacklog=overview || result.backlog && Number.isSafeInteger(result.backlog.revision) && Array.isArray(result.backlog.items);
  if(result.product?.project_id!==id || !validCatalog || !validBacklog || !Array.isArray(result.workflows)) throw new Error('資料回覆與產品不符');
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
      const projects=(await projectClient.list()).filter(p=>p.project_ref.project_id!=='legacy-personal');
      const results=await Promise.allSettled(projects.map(p=>read(p.project_ref.project_id,true)));
      // A new owner has no project overview from which to learn their plan capability.
      const resolved=results.find(result=>result.status==='fulfilled');
      const canCreate=resolved ? resolved.value.can_plan :
        await createCollaborationClient(store).capabilities().then(c=>Array.isArray(c.commands) && c.commands.includes('workflow.create'),()=>false);
      html=pages.overview(projects,results,canCreate);
    } else {
      const data=await read(product);
      if (sequence!==readSequence) return;
      current=data;
      if (params.has('flow')) html=pages.workflowPage(data,params.get('flow'));
      else if (params.has('item') || params.has('pbi')) html=pages.pbiPage(data,params.get('repo'),params.get('pbi'),params.get('item'));
      else html=pages.productBoard(data,params.get('tab')==='workflows',params);
    }
    if (sequence===readSequence) {
      main.innerHTML=html;
      if (params.has('item') && params.has('intent')) focusStageAction(main,params);
    }
  } catch(error) {
    if (sequence===readSequence) main.innerHTML=pages.failure(error);
  } finally {
    if (sequence===readSequence) {
      document.title=(main.querySelector('h1')?.textContent || '產品總覽')+' · Workflow Board';
      main.removeAttribute('aria-busy');
    }
  }
}

function commandFor(form, submitter){
  const command=form.dataset.command;
  const values=new FormData(form);
  if (command==='project.create') {
    return projectClient.command(command,'product-'+crypto.randomUUID(),values.get('name').trim(),0);
  }
  const base={command,project_id:product,store_id:store,operation_id:crypto.randomUUID()};
  if (command==='backlog.transition' || command==='lifecycle.configure') return lifecycleCommand(base,form,current);
  if (command.startsWith('delivery.')) return deliveryCommand(base,form,values,current);
  if(command==='backlog.configure_sprints')return {...base,expected_revision:current.backlog.revision,
    duration_weeks:Number(values.get('duration_weeks')),start_weekday:Number(values.get('start_weekday'))};
  if(command==='backlog.create_sprint')return {...base,expected_revision:current.backlog.revision,
    sprint_id:'sprint-'+crypto.randomUUID(),name:values.get('name').trim(),start_date:values.get('start_date')};
  if (command.startsWith('backlog.')) {
    const editing=command==='backlog.edit';
    const item_id=form.dataset.item || 'pbi-'+crypto.randomUUID();
    const scope={...base,item_id,expected_revision:current.backlog.revision};
    if (command==='backlog.move') return {...scope,before_id:submitter.value || null};
    const fields={title:values.get('title').trim(), description:values.get('description'),sprint_id:values.get('sprint_id')||null,
      related_story_id:values.get('related_story_id') || null,
      expected_behavior:values.get('expected_behavior') ?? '', actual_behavior:values.get('actual_behavior') ?? ''};
    return editing ? {...scope,...fields,status:values.get('status')} :
      {...scope,...fields,kind:values.get('kind'),parent_id:values.get('parent_id') || null};
  }
  const flowId=form.dataset.flow||values.get('flow')||params.get('flow');
  const flow=current.workflows.find(w=>w.workflow_id===flowId);
  const catalog=command==='workflow.unlink'?flow.pbis:availablePbis(current);
  const selected=values.getAll('pbi');
  const pbis=selected.map(key=>{
    const p=catalog.find(v=>pbiKey(v)===key);
    return p.source==='native' ? {source:'native',item_id:p.item_id,source_version:p.source_version} :
      {repository_id:p.repository_id,issue_id:p.issue_id,source_version:p.source_version};
  });
  const creating=command==='workflow.create';
  if(!creating&&!pbis.length)throw new Error('請選擇至少一項 PBI。');
  return {...base,
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
    const creatingProject=command.command==='project.create';
    const result=creatingProject ? await projectClient.submit(command) : await request('command',command);
    if(result.accepted===false)throw Object.assign(new Error(result.error || '服務拒絕變更'),{receipt:true});
    if(result.accepted!==true)throw new Error('無法確認服務回覆');
    pending=null;
    if(creatingProject){
      location.assign(url({product:command.project_ref.project_id}));
      return;
    }
    if(command.command==='backlog.create'){
      location.assign(url({product,item:command.item_id}));
      return;
    }
    if(command.command==='workflow.create'){
      location.assign(url({product,flow:command.workflow_id}));
      return;
    }
    recordMessage('服務已接受變更。');
    await load();
  }catch(error){
    if(error.receipt || error.definitive && !retrying){
      pending=null;
      if(error.message==='sprint_overlap')recordMessage('這段日期與現有 Sprint 重疊。請選擇不同的開始日期。');
      else recordMessage(`服務拒絕變更：${error.message}。請重新讀取後確認。`);
    }
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
  lifecycleClick(event.target);
  if(event.target.closest('[data-reload]'))load();
});
main.addEventListener('change',event=>{
  const select=event.target;
  lifecycleChange(select,current);
  if(select.matches('form[data-command="backlog.create"] select[name="kind"]')){
    select.form.querySelector('[data-kind-fields]').innerHTML=kindFields(select.value,nativeItems(current));
  }
});
main.addEventListener('input',event=>{
  if(event.target.matches('form[data-command="backlog.create_sprint"] [name=start_date]'))updateSprintDates(event.target);
});
main.addEventListener('submit',event=>{
  if(event.target.matches('[data-stage-filters]')){
    event.preventDefault();
    location.assign(url({product,layout:'stages',...Object.fromEntries(new FormData(event.target))}));
    return;
  }
  const form=event.target.closest('[data-command]');
  if(!form)return;
  event.preventDefault();
  if(pending)return;
  try{submit(commandFor(form,event.submitter));}catch(error){recordMessage(error.message);}
});
let draggedItem=null;
main.addEventListener('dragstart',event=>{
  draggedItem=event.target.closest('[data-stage-item]')?.dataset.stageItem ?? null;
  if(draggedItem)event.dataTransfer.setData('text/plain',draggedItem);
});
main.addEventListener('dragend',()=>{draggedItem=null;});
main.addEventListener('dragover',event=>{
  if(draggedItem&&stageDropTarget(current,params,draggedItem,event.target.closest('[data-stage-intent]')))event.preventDefault();
});
main.addEventListener('drop',event=>{
  const target=stageDropTarget(current,params,draggedItem,event.target.closest('[data-stage-intent]'));
  if(!target)return;
  event.preventDefault();
  draggedItem=null;
  location.assign(url(target));
});
window.addEventListener('beforeunload',event=>{
  if(pending){event.preventDefault();event.returnValue='';}
});
load();
