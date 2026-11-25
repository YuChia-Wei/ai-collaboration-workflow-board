import {escapeContent as esc} from './content-view.mjs';

const field = (label,name,value='',required=false,max=300) =>
  `<label>${esc(label)}<input name="${name}" value="${esc(value)}" maxlength="${max}"${required?' required':''}></label>`;
const hidden = (name,value) => `<input type="hidden" name="${name}" value="${esc(value)}">`;
const option = (value,label,selected=false) => `<option value="${esc(value)}"${selected?' selected':''}>${esc(label)}</option>`;
const select = (label,name,choices) => `<label>${esc(label)}<select name="${name}">${choices}</select></label>`;
const form = (command,body,action) => `<form class="edit-form" data-command="delivery.${command}">${body}<button>${esc(action)}</button></form>`;
const details = (title,body) => `<details class="item-editor"><summary>${esc(title)}</summary>${body}</details>`;
const panel = (heading,body) => `<article class="panel"><h3>${esc(heading)}</h3>${body}</article>`;
const blank = message => `<p class="hint">${esc(message)}</p>`;
const historyTime = row => new Date(row.occurred_at).getTime();
const newest = rows => rows.reduce((found,row)=>!found || historyTime(row)>=historyTime(found)?row:found,null);
const scopeEntry = (record,id) => record.scope.find(row=>row.item_id===id && row.included);
const resultName = result => result==='succeeded'?'成功':'失敗';
const modeName = mode => ({deploy:'部署',retry:'重試',rollback:'回復'})[mode];

function environmentStatus(model,id) {
  const observation=newest(model.observations.filter(row=>row.environment_id===id));
  const lastAttempt=newest(model.attempts.filter(row=>row.environment_id===id));
  return {observation,environmentCurrent:Boolean(observation && (!lastAttempt || historyTime(observation)>=historyTime(lastAttempt)))};
}

export function itemMilestones(data,item,{recipient='',environmentId=data.delivery.policy.primary_environment_id}={}) {
  const model=data.delivery;
  const applicable=model.applicability.find(row=>row.item_id===item.item_id);
  const {observation,environmentCurrent}=environmentStatus(model,environmentId);
  const handoffs=model.handoffs.filter(row=>row.status==='recorded' && (!recipient || row.recipient===recipient));
  // Rollback scope identifies affected work; it does not prove the reverted
  // feature exists in the restored artifact.
  const deployments=environmentCurrent && applicable?.deployable!==false ? model.attempts.filter(row=>row.result==='succeeded' && row.effect==='install' &&
    row.environment_id===environmentId && row.artifact===observation.artifact && historyTime(row)<=historyTime(observation)) : [];
  const match = (records,coverage) => newest(records.filter(record=>scopeEntry(record,item.item_id)?.coverage===coverage));
  return {delivered:match(handoffs,'full'),partialDelivery:match(handoffs,'partial'),deployed:match(deployments,'full'),
    partialDeployment:match(deployments,'partial'),deployable:applicable?.deployable!==false,observation,environmentCurrent};
}

function scopeInputs(items, selected) {
  return `<fieldset><legend>涵蓋的 PBI 與成果</legend>${items.map(item=>`<details${item.item_id===selected?' open':''}><summary>${esc(item.title)}</summary>
    <label class="choice"><input type="checkbox" name="item_id" value="${esc(item.item_id)}"${item.item_id===selected?' checked':''}>列入本筆紀錄</label>
    ${select('範圍','included:'+item.item_id,option('yes','納入')+option('no','延期'))}
    ${select('涵蓋程度','coverage:'+item.item_id,option('partial','部分成果')+option('full','整項成果'))}
    ${field('確切成果或延期原因','outcome:'+item.item_id,'',false,1000)}</details>`).join('')}</fieldset>`;
}
const occurredField = '<label>實際時間（留白使用送出時間）<input type="datetime-local" step="0.001" name="occurred_at"></label>';
const evidenceField = () => field('證據或紀錄依據','evidence','',true,2000);
const artifactField = (value='',required=true) => field('確切版本或產物識別','artifact',value,required);
function draftForm(data,item) {
  if(!data.backlog.items.length)return blank('先建立 PBI，再選取本次交付的範圍。');
  return form('draft',artifactField('',false)+field('交付對象','recipient',data.delivery.policy.recipient,false,160)+
    scopeInputs(data.backlog.items,item?.item_id),'保存交付草案');
}
function attemptForm(data,item) {
  const envs=data.delivery.environments.filter(env=>!env.retired);
  if(!data.backlog.items.length || !envs.length)return blank('登記部署需要一個可使用的環境及至少一項 PBI。');
  const envChoices=envs.map(env=>option(env.environment_id,env.name)).join('');
  const previous=data.delivery.attempts.map(row=>option(row.attempt_id,`${row.environment_name} · ${row.artifact} · ${resultName(row.result)} · ${row.occurred_at}`)).join('');
  return form('attempt',select('部署環境','environment_id',envChoices)+artifactField()+
    select('嘗試類型','mode',option('deploy','部署')+option('retry','重試')+option('rollback','回復'))+
    select('重試或回復所引用的嘗試','previous_id',option('','首次部署')+previous)+
    select('嘗試結果','result',option('succeeded','成功')+option('failed','失敗'))+
    occurredField+evidenceField()+scopeInputs(data.backlog.items,item?.item_id),'登記部署嘗試');
}
function environmentForm(env) {
  const status=env?select('啟用狀態','retired',option('no','使用中',!env.retired)+option('yes','停用',env.retired)):'';
  return form('environment',hidden('environment_id',env?.environment_id??'')+field('環境名稱','name',env?.name,true,160)+
    field('環境用途','purpose',env?.purpose)+status,env?'儲存環境':'建立環境');
}
function policyForm(model) {
  const p=model.policy;
  const envChoices=model.environments.filter(row=>!row.retired).map(row=>option(row.environment_id,row.name,row.environment_id===p.primary_environment_id)).join('');
  return form('policy',select('預設追蹤環境','primary_environment_id',option('','未指定')+envChoices)+
    field('指定交付對象（留白可逐筆指定）','recipient',p.recipient,false,160)+
    field('交付必要證據類別','evidence_kind',p.evidence_kind,true,160),'儲存交付政策');
}
function observeForm(model) {
  if(!model.environments.length)return blank('先建立要讀回的環境。');
  return form('observe',select('讀回環境','environment_id',model.environments.map(row=>option(row.environment_id,row.name+(row.retired?'（停用）':''))).join(''))+
    artifactField()+occurredField+evidenceField(),'保存實際版本讀回');
}
function scopeView(rows) {
  return '<ul>'+rows.map(row=>`<li>${esc(row.title)}（PBI 版本 ${esc(row.source_version)}） · ${row.included?(row.coverage==='full'?'整項':'部分'):'延期'} · ${esc(row.outcome)}</li>`).join('')+'</ul>';
}
function handoffView(row,model,canPlan) {
  let facts=`<p>${esc(row.recipient||'對象待定')} · ${esc(row.artifact||'產物待定')}</p>`+scopeView(row.scope);
  if(row.status==='recorded') facts+=`<p>交付時間 ${esc(row.occurred_at)} · ${esc(row.evidence_kind)} · ${esc(row.evidence)}</p>`;
  else if(canPlan)facts+=details('登記實際交付',form('record',hidden('handoff_id',row.handoff_id)+artifactField(row.artifact)+
    field('實際交付對象','recipient',model.policy.recipient||row.recipient,true,160)+
    field('證據類別','evidence_kind',model.policy.evidence_kind,true,160)+evidenceField()+occurredField,'確認並登記交付'));
  return panel(row.status==='draft'?'交付草案':'已交付',facts);
}
function attemptView(row) {
  return panel(`${row.environment_name} · ${modeName(row.mode)}${resultName(row.result)}`,
    `<p>${esc(row.artifact)} · ${esc(row.occurred_at)} · ${esc(row.evidence)}</p>`+scopeView(row.scope)+
    `<small>嘗試 ${esc(row.attempt_id)}${row.previous_id?' · 引用 '+esc(row.previous_id):''}</small>`);
}
function environments(model,canPlan) {
  const cards=model.environments.map(env=>{
    const {observation,environmentCurrent}=environmentStatus(model,env.environment_id);
    const current=observation ? (environmentCurrent?'最近確認':'目前版本待確認，上次讀回')+' '+observation.artifact+' · '+observation.occurred_at : '運行版本未知';
    let body=`<p>${esc(env.purpose)}${env.retired?' · 停用':''}${model.policy.primary_environment_id===env.environment_id?' · 預設追蹤':''}</p><p>${esc(current)}</p>`;
    const reads=model.observations.filter(row=>row.environment_id===env.environment_id);
    if(reads.length)body+=details('環境讀回紀錄','<ul>'+reads.map(row=>`<li>${esc(row.artifact)} · ${esc(row.occurred_at)} · ${esc(row.evidence)}</li>`).join('')+'</ul>');
    if(canPlan)body+=details('編輯 '+env.name,environmentForm(env));
    return panel(env.name,body);
  }).join('');
  return cards || blank('尚未設定部署環境。');
}

export function deliveryBoard(data) {
  const model=data.delivery;
  if(!model)return '';
  const recipient=model.policy.recipient||'交付時指定';
  let body=`<p>交付對象 ${esc(recipient)} · 必要證據 ${esc(model.policy.evidence_kind)}</p>`;
  if(data.can_plan)body+=details('設定交付政策',policyForm(model))+details('新增環境',environmentForm());
  body+=environments(model,data.can_plan);
  if(data.can_plan)body+=details('新增交付草案',draftForm(data))+details('登記部署嘗試',attemptForm(data))+details('登記環境讀回',observeForm(model));
  return `<section class="section"><h2>交付與環境</h2>${body}`+
    details('交付紀錄',model.handoffs.map(row=>handoffView(row,model,data.can_plan)).join('')||blank('尚無交付紀錄。'))+
    details('部署嘗試紀錄',model.attempts.map(attemptView).join('')||blank('尚無部署嘗試。'))+'</section>';
}

function familyOf(data,item) {
  const children=new Map();
  for(const candidate of data.backlog.items){
    if(!children.has(candidate.parent_id))children.set(candidate.parent_id,[]);
    children.get(candidate.parent_id).push(candidate);
  }
  const family=[];
  function add(node){family.push(node);for(const child of children.get(node.item_id)??[])add(child);}
  add(item);
  return family;
}
export function deliveryCard(data,item) {
  const model=data.delivery;
  if(!model || item.source!=='native')return '';
  const family=familyOf(data,item), ids=new Set(family.map(node=>node.item_id));
  const related=row=>row.scope.some(entry=>ids.has(entry.item_id));
  const handoffs=model.handoffs.filter(related);
  const current=itemMilestones(data,item);
  const msg=current.deployable ? (current.deployed?'預設環境已確認 '+current.deployed.artifact:current.partialDeployment?'預設環境已確認部分成果 '+current.partialDeployment.artifact:'尚無此項成果在預設環境生效的確認紀錄。') : '部署不適用';
  let body=blank(msg);
  if(data.can_plan){
    body+=details('設定部署適用性',form('applicability',hidden('item_id',item.item_id)+select('此項目是否需要部署','deployable',option('yes','適用',current.deployable)+option('no','不適用',!current.deployable)),'儲存適用性'));
    body+=details('新增交付草案',draftForm(data,item));
    if(current.deployable)body+=details('登記部署嘗試',attemptForm(data,item));
  }
  body+=handoffs.map(row=>handoffView(row,model,data.can_plan)).join('')||blank('尚無此項目或子項目的交付紀錄。');
  body+=model.attempts.filter(related).map(attemptView).join('');
  return `<section class="section"><h2>交付與部署</h2>${body}</section>`;
}

export function deliveryCommand(base,form,values,current) {
  const command={...base,expected_revision:current.delivery.revision};
  const get=name=>String(values.get(name)??'').trim();
  const fields=(...names)=>Object.fromEntries(names.map(name=>[name,get(name)]));
  const occurredAt=()=>get('occurred_at')?new Date(get('occurred_at')).toISOString():new Date().toISOString();
  const selection=()=>values.getAll('item_id').map(item_id=>{
    const outcome=get('outcome:'+item_id);
    if(!outcome)throw new Error('請填寫每個勾選項目的確切成果或延期原因。');
    return {item_id,included:get('included:'+item_id)==='yes',coverage:get('coverage:'+item_id),outcome};
  });
  switch(base.command) {
    case 'delivery.environment':return {...command,...fields('name','purpose'),environment_id:get('environment_id')||crypto.randomUUID(),retired:get('retired')==='yes'};
    case 'delivery.policy':return {...command,...fields('recipient','evidence_kind'),primary_environment_id:get('primary_environment_id')||null};
    case 'delivery.applicability':return {...command,item_id:get('item_id'),deployable:get('deployable')==='yes'};
    case 'delivery.draft':return {...command,...fields('recipient','artifact'),handoff_id:crypto.randomUUID(),scope:selection()};
    case 'delivery.record':return {...command,...fields('handoff_id','recipient','artifact','evidence','evidence_kind'),occurred_at:occurredAt()};
    case 'delivery.attempt':return {...command,...fields('result','mode','artifact','environment_id','evidence'),attempt_id:crypto.randomUUID(),previous_id:get('previous_id')||null,scope:selection(),occurred_at:occurredAt()};
    case 'delivery.observe':return {...command,...fields('environment_id','artifact','evidence'),observation_id:crypto.randomUUID(),occurred_at:occurredAt()};
  }
}
