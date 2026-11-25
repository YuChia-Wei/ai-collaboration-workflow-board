import {escapeContent as esc} from './content-view.mjs';

const kinds={epic:'Epic',feature:'Feature',user_story:'User Story',task:'Task',bug:'Bug'};
const option=(id,label,selected)=>`<option value="${esc(id)}"${id===selected?' selected':''}>${esc(label)}</option>`;
const stateOptions=(states,selected)=>states.map(state=>option(state.id,state.label,selected)).join('');
const coarseLabel=status=>status==='open'?'開啟中':'已關閉';
export function stateLabel(item,data){
 return data.lifecycle?.flows[item.kind]?.states.find(state=>state.id===item.state_id)?.label??coarseLabel(item.status)+'（舊版）';
}

function changeControls(item,data){
 const flow=data.lifecycle.flows[item.kind];
 const edges=flow.transitions.filter(edge=>edge.from===item.state_id);
 const choices=item.state_id?flow.states.filter(state=>edges.some(edge=>edge.to===state.id)):flow.states.filter(state=>state.category===item.status);
 const states=choices.map(state=>{
  const edge=edges.find(candidate=>candidate.to===state.id);
  return `<option value="${esc(state.id)}" data-mode="${esc(edge?.mode??'normal')}">${esc(state.label)}</option>`;
 }).join('');
 const otherBugs=data.backlog.items.filter(candidate=>candidate.kind==='bug'&&candidate.item_id!==item.item_id);
 const resolutionForm=item.kind==='bug'?`<label data-resolution hidden>結案處置<select name="resolution" disabled>
  <option value="">請選擇</option><option value="duplicate">Duplicate · 重複通報</option><option value="wont_fix">Won’t fix · 不修正</option></select></label>
  <label data-original hidden>原始 Bug<select name="original_id" disabled><option value="">請選擇</option>
  ${otherBugs.map(bug=>option(bug.item_id,bug.title+' · '+bug.item_id,null)).join('')}</select></label>`:'';
 return `<form class="edit-form" data-command="backlog.transition" data-item="${esc(item.item_id)}">
  <label>${item.state_id?'轉換至':'將舊版狀態對應到'}<select name="to_state" required><option value="">選擇狀態</option>${states}</select></label>
  ${resolutionForm}<label>原因<textarea name="reason" maxlength="4000" rows="2"></textarea></label>
  <button class="primary">${item.state_id?'更新工作狀態':'套用工作流程'}</button></form>`;
}
export function itemLifecycle(item,data){
 if(!data.lifecycle)return '';
 const history=item.state_history??[];
 const records=history.map(entry=>{
  const action=(entry.from?esc(entry.from.label)+' → ':'建立於 ')+esc(entry.to.label);
  const resolution={duplicate:'重複通報',wont_fix:'不修正'}[entry.resolution];
  return `<li><strong>${action}</strong> · <time datetime="${esc(entry.at)}">${esc(entry.at)}</time> · ${esc(entry.actor.subject_id)}
   ${resolution?'<div>'+resolution+(entry.original_id?' · 原單 '+esc(entry.original_id):'')+'</div>':''}
   ${entry.reason?'<p>'+esc(entry.reason)+'</p>':''}</li>`;
 }).join('');
 return `<section class="section" data-item-lifecycle><h2>工作狀態</h2><p>${esc(stateLabel(item,data))}</p>${data.can_plan?changeControls(item,data):''}
  <h3>狀態歷史</h3>${history.length?'<ol class="timeline">'+records+'</ol>':'<p>尚無狀態變更紀錄。</p>'}</section>`;
}

function stateRow(state,initial,adding=false){
 return `<div class="flow-state" data-flow-state><label>狀態代碼<input name="state_id" maxlength="64" pattern="[a-z][a-z0-9_\\-]*" required value="${esc(state.id)}"${adding?'':' readonly'}></label>
  <label>顯示名稱<input name="state_label" maxlength="100" required value="${esc(state.label)}"></label>
  <label>分類<select name="state_category">${option('open','開啟中',state.category)}${option('closed','已關閉',state.category)}</select></label>
  <label><input type="radio" name="flow_initial"${state.id===initial?' checked':''}> 初始狀態</label>
  <button type="button" data-flow-remove-state>移除狀態</button></div>`;
}
function edgeRow(edge,states,kind){
 const blank='<option value="">選擇狀態</option>';
 return `<div class="flow-edge" data-flow-edge><label>從<select name="edge_from" required>${blank}${stateOptions(states,edge.from)}</select></label>
  <label>到<select name="edge_to" required>${blank}${stateOptions(states,edge.to)}</select></label>
  ${kind==='bug'?`<label>轉換方式<select name="edge_mode">${option('normal','一般',edge.mode)}${option('bug_resolution','重複或不修正',edge.mode)}</select></label>`:''}
  <button type="button" data-flow-remove-edge>移除轉換</button></div>`;
}
function flowEditor(kind,data){
 const flow=data.lifecycle.flows[kind];
 if(!data.can_plan){
  const label=id=>flow.states.find(state=>state.id===id)?.label??id;
  return '<p>初始狀態：'+esc(label(flow.initial))+'</p><ul>'+flow.transitions.map(edge=>'<li>'+esc(label(edge.from))+' → '+esc(label(edge.to))+'</li>').join('')+'</ul>';
 }
 return `<form class="edit-form" data-command="lifecycle.configure" data-kind="${kind}">
  <fieldset><legend>工作狀態</legend><div data-flow-states>${flow.states.map(state=>stateRow(state,flow.initial)).join('')}</div>
  <button type="button" data-flow-add-state>新增狀態</button></fieldset>
  <fieldset><legend>允許的轉換</legend><div data-flow-edges>${flow.transitions.map(edge=>edgeRow(edge,flow.states,kind)).join('')}</div>
  <button type="button" data-flow-add-edge>新增轉換</button></fieldset><button class="primary">儲存工作流程</button></form>`;
}
export function lifecycleSetup(data){
 if(!data.lifecycle)return '';
 return `<details class="item-editor" data-lifecycle-settings><summary>工作流程設定</summary>
  <label>工作項目類型<select data-flow-kind>${Object.entries(kinds).map(([id,name])=>option(id,name,'epic')).join('')}</select></label>
  <div data-flow-editor>${flowEditor('epic',data)}</div></details>`;
}
const field=(node,name)=>node.querySelector('[name="'+name+'"]');
function readStates(form){
 return [...form.querySelectorAll('[data-flow-state]')].map(row=>({id:field(row,'state_id').value,label:field(row,'state_label').value,category:field(row,'state_category').value}));
}
function updateEdgeOptions(form){
 const states=readStates(form).filter(state=>state.id);
 for(const select of form.querySelectorAll('[name="edge_from"],[name="edge_to"]')){
  const old=select.value;
  select.innerHTML='<option value="">選擇狀態</option>'+stateOptions(states,old);
 }
}
export function lifecycleClick(target){
 const form=target.closest('form[data-command="lifecycle.configure"]');
 if(!form)return;
 if(target.closest('[data-flow-add-state]'))form.querySelector('[data-flow-states]').insertAdjacentHTML('beforeend',stateRow({id:'',label:'',category:'open'},null,true));
 if(target.closest('[data-flow-add-edge]'))form.querySelector('[data-flow-edges]').insertAdjacentHTML('beforeend',edgeRow({from:'',to:'',mode:'normal'},readStates(form),form.dataset.kind));
 if(target.closest('[data-flow-remove-state]')){target.closest('[data-flow-state]').remove();updateEdgeOptions(form);}
 if(target.closest('[data-flow-remove-edge]'))target.closest('[data-flow-edge]').remove();
}
export function lifecycleChange(target,data){
 if(target.matches('[data-flow-kind]')){
  target.closest('[data-lifecycle-settings]').querySelector('[data-flow-editor]').innerHTML=flowEditor(target.value,data);
  return;
 }
 if(target.matches('form[data-command="lifecycle.configure"] [name="state_id"],form[data-command="lifecycle.configure"] [name="state_label"]'))updateEdgeOptions(target.form);
 const form=target.closest('form[data-command="backlog.transition"]');
 if(!form)return;
 const exceptional=field(form,'to_state').selectedOptions[0]?.dataset.mode==='bug_resolution';
 const resolution=field(form,'resolution'),original=field(form,'original_id');
 if(resolution){
  resolution.closest('label').hidden=!exceptional;resolution.disabled=!exceptional;resolution.required=exceptional;
  const duplicate=exceptional&&resolution.value==='duplicate';
  original.closest('label').hidden=!duplicate;original.disabled=!duplicate;original.required=duplicate;
 }
 field(form,'reason').required=exceptional;
}
export function lifecycleCommand(base,form,data){
 const values=new FormData(form),expected_revision=data.lifecycle.revision;
 if(base.command==='backlog.transition')return {...base,expected_revision,item_id:form.dataset.item,to_state:values.get('to_state'),
  reason:values.get('reason'),resolution:values.get('resolution')||null,original_id:values.get('original_id')||null};
 const states=readStates(form),first=form.querySelector('[name="flow_initial"]:checked');
 if(!first)throw new Error('請選擇初始狀態。');
 const transitions=[...form.querySelectorAll('[data-flow-edge]')].map(row=>({from:field(row,'edge_from').value,to:field(row,'edge_to').value,mode:field(row,'edge_mode')?.value??'normal'}));
 return {...base,expected_revision,kind:form.dataset.kind,flow:{initial:field(first.closest('[data-flow-state]'),'state_id').value,states,transitions}};
}
