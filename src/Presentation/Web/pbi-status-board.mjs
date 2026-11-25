import {escapeContent as esc} from './content-view.mjs';
import {kindName, nativeItems} from './native-backlog.mjs';
import {itemMilestones} from './delivery-view.mjs';

const types = ['epic','feature','user_story','task','bug'];
const option = (value,label,selected) => `<option value="${esc(value)}"${value===selected?' selected':''}>${esc(label)}</option>`;
const selectedKind = (requested,items) => types.includes(requested) ? requested :
  (items.find(i=>i.kind==='user_story') ?? items[0])?.kind ?? 'user_story';

function criteria(data,params) {
  const policy=data.delivery.policy;
  return {
    kind:selectedKind(params.get('kind'),nativeItems(data)),
    recipient:params.get('recipient') ?? policy.recipient ?? '',
    environmentId:params.get('environment') ?? policy.primary_environment_id ?? ''
  };
}

export function layoutNav(data,url,stages) {
  const product=data.product.project_id;
  return `<nav class="layout-nav" aria-label="Scrum Board 檢視">
    <a href="${esc(url({product}))}"${stages?'':' aria-current="page"'}>階層清單</a>
    <a href="${esc(url({product,layout:'stages'}))}"${stages?' aria-current="page"':''}>狀態看板</a>
  </nav>`;
}

function filters(data,scope) {
  const {environments,handoffs,policy}=data.delivery;
  const recipients=[...new Set([scope.recipient,policy.recipient,...handoffs.map(h=>h.recipient)].filter(Boolean))];
  return `<form class="stage-filters" data-stage-filters>
    <label>項目類型<select name="kind">${types.map(k=>option(k,kindName({kind:k}),scope.kind)).join('')}</select></label>
    <label>交付對象<select name="recipient">${option('','全部對象',scope.recipient)}${recipients.map(r=>option(r,r,scope.recipient)).join('')}</select></label>
    <label>部署環境<select name="environment">${option('','未指定',scope.environmentId)}${environments.map(e=>option(e.environment_id,e.name+(e.retired?'（已停用）':''),scope.environmentId)).join('')}</select></label>
    <button>套用檢視</button></form>`;
}

function stageCard(item,url,product,canPlan,detail='') {
  return `<article class="work-card stage-card" data-stage-item="${esc(item.item_id)}"${canPlan?' draggable="true"':''}>
    <h4><a href="${esc(url({product,item:item.item_id}))}">${esc(item.title)}</a></h4>
    ${detail ? '<p class="card-foot">'+esc(detail)+'</p>' : ''}
  </article>`;
}

function lane(label,cards,intent,state='') {
  return `<section class="lane stage-lane" data-stage-intent="${esc(intent)}" data-stage-target="${esc(state)}">
    <h3>${esc(label)} <span class="lane-count">${cards.length}</span></h3>${cards.join('')}</section>`;
}

export function statusBoard(data,params,url) {
  const scope=criteria(data,params);
  const product=data.product.project_id;
  const items=nativeItems(data).filter(i=>i.kind===scope.kind);
  const flow=data.lifecycle.flows[scope.kind];
  const card=(i,detail='')=>stageCard(i,url,product,data.can_plan,detail);
  const byState=flow.states.map(s=>lane(s.label,items.filter(i=>i.state_id===s.id).map(i=>card(i)),'transition',s.id));
  const unmapped=items.filter(i=>!i.state_id);
  if(unmapped.length) byState.push(lane('沿用舊版開關狀態',unmapped.map(i=>card(i,i.status==='closed'?'已關閉':'開啟中')),''));
  const delivered=[],deployed=[];
  for(const item of items) {
    const m=itemMilestones(data,item,scope);
    const handoff=m.delivered ?? m.partialDelivery;
    if(handoff) delivered.push(card(item,[m.delivered?'全項交付':'部分交付',handoff.recipient,handoff.artifact].filter(Boolean).join(' · ')));
    const deployment=m.deployed ?? m.partialDeployment;
    if(deployment) deployed.push(card(item,[m.deployed?'全項部署':'部分部署',deployment.artifact].filter(Boolean).join(' · ')));
  }
  const target=data.delivery.environments.find(e=>e.environment_id===scope.environmentId);
  return filters(data,scope)+`<section class="section"><h2>工作狀態</h2>
    <div class="lanes stage-lanes">${byState.join('')}</div></section>
    <section class="section"><h2>交付與部署</h2><div class="milestone-lanes">
    ${lane('Delivered · '+(scope.recipient||'全部對象'),delivered,'delivery')}
    ${lane('Deployed · '+(target?.name||'未指定環境'),deployed,target && !target.retired?'deployment':'')}
    </div></section>`;
}

export function descendantDelivery(data,item,url) {
  if(!['feature','epic'].includes(item.kind))return '';
  const children=new Map();
  for(const child of nativeItems(data)){
    if(!children.has(child.parent_id))children.set(child.parent_id,[]);
    children.get(child.parent_id).push(child);
  }
  const rows=[];
  function visit(parent) {
    for(const child of children.get(parent)??[]) {
      const {delivered,partialDelivery}=itemMilestones(data,child,{recipient:''});
      const record=delivered??partialDelivery;
      const label=record ? [delivered?'全項交付':'部分交付',record.recipient,record.artifact].filter(Boolean).join(' · ') : '尚無交付紀錄';
      rows.push(`<li><a href="${esc(url({product:data.product.project_id,item:child.item_id}))}">${esc(child.title)}</a> · ${esc(label)}</li>`);
      visit(child.item_id);
    }
  }
  visit(item.item_id);
  return rows.length ? `<details class="item-editor"><summary>下層項目的交付情形</summary><ul>${rows.join('')}</ul></details>` : '';
}

export function stageDropTarget(data,params,cardId,lane) {
  if(!data?.can_plan || !lane) return null;
  const item=nativeItems(data).find(i=>i.item_id===cardId);
  if(!item)return null;
  const {stageIntent:intent,stageTarget:target}=lane.dataset;
  const result={product:data.product.project_id,item:cardId,intent};
  const scope=criteria(data,params);
  if(intent==='transition') {
    const flow=data.lifecycle.flows[item.kind];
    const allowed=item.state_id
      ? flow.transitions.some(t=>t.from===item.state_id&&t.to===target)
      : flow.states.some(state=>state.id===target&&state.category===item.status);
    if(!allowed)return null;
    return {...result,to:target};
  }
  if(intent==='delivery')return {...result,recipient:scope.recipient};
  if(intent==='deployment' && data.delivery.environments.some(e=>e.environment_id===scope.environmentId&&!e.retired) &&
     !data.delivery.applicability.some(rule=>rule.item_id===cardId&&!rule.deployable)){
    return {...result,environment:scope.environmentId};
  }
  return null;
}

// Bring the ordinary editable form into view. Dropping a card never submits it.
export function focusStageAction(main,params) {
  const forms={transition:'backlog.transition',delivery:'delivery.draft',deployment:'delivery.attempt'};
  const intent=params.get('intent');
  if(!Object.hasOwn(forms,intent))return;
  const name=forms[intent];
  const form=main.querySelector('form[data-command="'+name+'"]');
  if(!form)return;
  for(const [param,field] of [['to','to_state'],['recipient','recipient'],['environment','environment_id']]){
    const value=params.get(param),input=form.elements.namedItem(field);
    if(!value||!input)continue;
    if(input.tagName==='SELECT'&&![...input.options].some(o=>o.value===value))return;
    input.value=value;
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }
  for(let el=form.parentElement;el;el=el.parentElement)if(el.tagName==='DETAILS')el.open=true;
  form.querySelector('select,input:not([type=hidden]),textarea,button')?.focus();
  form.scrollIntoView({block:'center'});
}
