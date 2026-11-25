import {escapeContent as esc, structuredMarkup} from './content-view.mjs';
import {availablePbis, itemForm, kindName, nativeBoard, nativeDetail} from './native-backlog.mjs';
import {deliveryBoard, deliveryCard} from './delivery-view.mjs';
import {descendantDelivery, layoutNav, statusBoard} from './pbi-status-board.mjs';

export const pbiKey = p => JSON.stringify(p.source === 'native' ? {native:p.item_id} : [p.repository_id, p.issue_id]);
const pbiTitle = p => p.source === 'native' ? p.title : `#${p.number} ${p.title}`;
const pbiSource = p => p.source === 'native' ? '自建 · '+kindName(p) : p.repository_id;
const lifecycle = new Map([
  ['draft','草稿'], ['active','執行中'], ['paused','暫停'], ['completed','已完成'], ['cancelled','已取消']
]);
const coverage = {complete:'已完整讀取', partial:'部分已讀取', unknown:'尚未讀取', stale:'來源過期'};
const issueState = state => state === 'closed' ? '已關閉' : '開啟中';
const hint = text => `<p class="hint">${esc(text)}</p>`;
const empty = text => `<p class="empty">${esc(text)}</p>`;
const cards = items => `<div class="cards">${items.join('')}</div>`;
const section = (title, body) => `<section class="section"><h2>${esc(title)}</h2>${body}</section>`;
const pill = (label, tone='') => `<span class="pill ${tone}">${esc(label)}</span>`;
const status = state => pill(lifecycle.get(state) || state, lifecycle.has(state) ? state : '');
const reload = '<button class="secondary" type="button" data-reload>重新讀取</button>';
const clock = new Intl.DateTimeFormat('zh-TW', {year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'});
function when(value) {
  if (!value) return '尚未提供';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? esc(value) : `<time datetime="${esc(value)}" title="${esc(value)}">${esc(clock.format(date))}</time>`;
}
function catalogNote(catalog) {
  return `<p class="hint">外部 PBI 來源：${esc(coverage[catalog.coverage] || catalog.coverage)}${catalog.observed_at ? ' · 觀察時間 '+when(catalog.observed_at) : ''}</p>`;
}
function choices(pbis, selected) {
  return pbis.map(p => `<label class="choice"><input type="checkbox" name="pbi" value="${esc(pbiKey(p))}" ${selected === pbiKey(p) ? 'checked' : ''}><span>${esc(pbiTitle(p))} <small>${esc(pbiSource(p))}</small></span></label>`).join('') || hint('目前沒有可選的 PBI。');
}
function createForm(pbis, selected) {
  return `<form class="edit-form" data-command="workflow.create"><label>名稱<input name="title" required maxlength="160"></label>
    <label>工作目標<textarea name="goal" required maxlength="4000" rows="2"></textarea></label>
    <fieldset><legend>關聯 PBI</legend>${choices(pbis,selected)}</fieldset><button class="primary">建立工作流程</button></form>`;
}
function unlinkForm(p, flowId) {
  return `<form class="inline-form" data-command="workflow.unlink" data-flow="${esc(flowId)}"><input type="hidden" name="pbi" value="${esc(pbiKey(p))}"><button>解除關聯</button></form>`;
}
function boardLanes(groups, card) {
  return `<div class="lanes">${groups.map(([label,items]) => `<div class="lane"><h3>${esc(label)} <span class="lane-count">${items.length}</span></h3>${items.map(card).join('')}</div>`).join('')}</div>`;
}
function groupBy(items, keyOf) {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}
function attentionItems(workflow) {
  const tasks = workflow.blocked_tasks.map(task => '受阻：'+(task.title || task.id));
  const decisions = workflow.pending_decisions.map(decision => '待決：'+(decision.title || decision.id));
  return [...tasks, ...decisions];
}
function attentionList(items) {
  return items.length ? '<ul class="attention">'+items.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>' : '';
}
function scopeFields(scope) {
  if (!scope) return '';
  return `<dl class="facts">${[['範圍內',scope.included],['範圍外',scope.excluded]].filter(([,v])=>v).map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}
function detailFacts(value) {
  return `<details class="fact-detail"><summary>查看紀錄欄位</summary>${structuredMarkup(value)}</details>`;
}
function handoffView(record) {
  if (!record) return empty('尚無交接紀錄。');
  const handoff = record.handoff;
  if (!handoff) return structuredMarkup(record);
  return `<div class="panel handoff">${handoff.next_step ? '<h3>下一步</h3><p>'+esc(handoff.next_step)+'</p>' : ''}
    <dl class="facts">${[['已完成',handoff.completed],['待完成',handoff.remaining],['接手者',handoff.next_actor_hint]].filter(([,v])=>v).map(([k,v])=>`<div><dt>${k}</dt><dd>${typeof v==='string'?esc(v):structuredMarkup(v)}</dd></div>`).join('')}</dl>${detailFacts(record)}</div>`;
}
function evidenceView(workflow) {
  const entries = [...workflow.checkpoints, ...workflow.evidence];
  if (!entries.length) return empty('尚無工作證據。');
  return `<ul class="timeline">${entries.map(entry => `<li>${entry.observation ? '<p>'+esc(entry.observation)+'</p>'+detailFacts(entry) : structuredMarkup(entry)}</li>`).join('')}</ul>`;
}

export function createPortfolioPages(url) {
  function link(label, values, className='', active=false) {
    return `<a href="${esc(url(values))}"${className ? ' class="'+className+'"' : ''}${active ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
  }
  const pbiLink = (id,p) => link(pbiTitle(p), p.source === 'native'
    ? {product:id,item:p.item_id} : {product:id,repo:p.repository_id,pbi:p.issue_id});
  const flowLink = (id,w) => link(w.title,{product:id,flow:w.workflow_id});
  function header() {
    return `<header class="masthead"><div class="mast-inner"><a class="brand" href="${esc(url())}" aria-label="返回產品總覽"><span class="board-mark" aria-hidden="true"><i></i><i></i><i></i></span>Workflow Board</a></div></header>`;
  }
  function title(name, aside='') {
    return `<div class="page-heading"><h1>${esc(name)}</h1>${aside}</div>`;
  }
  function crumbs(product, board) {
    return `<nav class="crumbs" aria-label="瀏覽路徑">${link('產品總覽',{})}<span aria-hidden="true">/</span>
      ${board ? link(product.name,{product:product.project_id})+'<span aria-hidden="true">/</span><span>'+esc(board)+'</span>' : '<span>'+esc(product.name)+'</span>'}</nav>`;
  }
  function boardNav(id, workflows) {
    return `<nav class="board-nav" aria-label="產品看板">${link('Scrum Board',{product:id},'',!workflows)}${link('Workflow Board',{product:id,tab:'workflows'},'',workflows)}</nav>`;
  }
  function flowCard(id,w,productName='',heading='h3') {
    const count = w.pbis?.length ?? w.pbi_count;
    return `<article class="work-card"><div class="card-meta">${status(w.status)}${productName ? '<span>'+esc(productName)+'</span>' : ''}</div>
      <${heading}>${flowLink(id,w)}</${heading}>${w.goal?'<p class="card-goal">'+esc(w.goal)+'</p>':''}
      ${attentionList(attentionItems(w))}
      <p class="card-foot">${count ? '關聯 '+count+' 項 PBI' : '尚未關聯 PBI'} · 最近更新 ${when(w.updated_at)}</p></article>`;
  }
  function connection(store) {
    return `<form class="connect" method="get"><label>資料空間（store ID）<input name="store" required value="${esc(store)}"></label><button>讀取資料空間</button></form>`;
  }
  function overview(projects, results, canCreate) {
    const active = [];
    let unread = 0;
    const list = projects.map((project,i) => {
      const id=project.project_ref.project_id;
      const result=results[i];
      let summary;
      if (result.status==='fulfilled') {
        const {workflows,workflow_count}=result.value;
        workflows.forEach(w => active.push({id,name:project.name,w}));
        summary=`<p class="product-summary"><strong>${workflows.length}</strong> 執行中 <span>／</span> ${workflow_count} 個流程</p>`;
      } else {
        unread++;
        summary=hint('讀取失敗：'+result.reason.message);
      }
      return `<article class="product-card"><div class="product-name"><h3>${link(project.name,{product:id})}</h3><small>${esc(id)}</small></div>
        ${summary}<nav class="product-actions" aria-label="${esc(project.name)}的看板">${link('Scrum Board',{product:id})}${link('Workflow Board',{product:id,tab:'workflows'})}</nav></article>`;
    });
    active.sort((a,b)=>String(b.w.updated_at||'').localeCompare(String(a.w.updated_at||'')));
    const totals = `<dl class="totals"><div><dt>產品數</dt><dd>${projects.length}</dd></div><div><dt>${unread?'已讀取產品執行中':'執行中流程'}</dt><dd>${active.length}</dd></div></dl>`;
    const running = active.length ? cards(active.map(({id,name,w})=>flowCard(id,w,name))) : empty(unread ? '已讀取的產品中沒有進行中的工作。':'目前沒有進行中的工作。');
    const create = canCreate ? `<details class="item-editor" data-new-product${projects.length ? '' : ' open'}><summary>新增私人產品</summary>
      <form class="edit-form" data-command="project.create"><label>產品名稱<input name="name" required maxlength="160"></label><button class="primary">建立產品</button></form></details>` : '';
    return title('產品總覽',totals)+'<div class="overview">'+section('產品',(list.length ? `<div class="directory">${list.join('')}</div>` : empty('目前沒有可見產品。'))+create)+
      section('進行中的工作',(unread ? hint('部分產品讀取失敗，以下只列已讀取的工作。'):'')+running)+
      `</div><footer class="tools">${reload}</footer>`;
  }
  function productBoard(data, workflows, params=new URLSearchParams()) {
    const {product,catalog}=data;
    const id=product.project_id;
    let body;
    if (workflows) {
      const groups = groupBy(data.workflows,w=>w.status);
      const states = [...new Set([...lifecycle.keys(), ...groups.keys()])].filter(s=>groups.has(s));
      body=section('工作流程',states.length ? boardLanes(states.map(s=>[lifecycle.get(s)||s,groups.get(s)]),w=>flowCard(id,w,'','h4')) : empty('目前沒有工作流程。'));
      if (data.can_plan) body+=section('建立工作流程',createForm(availablePbis(data)));
    } else {
      const hasProject=catalog.pbis.some(p=>p.project_status);
      const group=p=>hasProject?(p.project_status || '未指定 Project 狀態'):issueState(p.issue_state);
      const groups=groupBy(catalog.pbis,group);
      const linkCounts=new Map();
      for (const w of data.workflows) for (const p of w.pbis) {
        const key=pbiKey(p);
        linkCounts.set(key,(linkCounts.get(key)||0)+1);
      }
      const issueCard = p => {
        const linked=linkCounts.get(pbiKey(p))||0;
        return `<article class="work-card"><div class="card-meta"><span>${esc(p.repository_id)}</span></div><h4>${pbiLink(id,p)}</h4>
          <p class="card-foot">${issueState(p.issue_state)} · ${linked ? '關聯 '+linked+' 個流程' : '尚無關聯工作流程'}</p></article>`;
      };
      const stages=params.get('layout')==='stages';
      body=layoutNav(data,url,stages);
      if(stages) return crumbs(product)+title(product.name)+boardNav(id,false)+body+statusBoard(data,params,url)+reload;
      body+=nativeBoard(data,pbiLink,linkCounts,pbiKey)+deliveryBoard(data);
      if (catalog.coverage!=='unknown' || groups.size) {
        const noItems=catalog.coverage==='complete' ? '外部來源有 0 筆 PBI。' : '目前沒有可顯示的外部 PBI。';
        body+=section('產品待辦項目',catalogNote(catalog)+(groups.size ? boardLanes([...groups],issueCard) : empty(noItems)));
      } else {
        body+=hint('尚未載入外部來源的 PBI。');
      }
    }
    return crumbs(product)+title(product.name)+boardNav(id,workflows)+body+(data.can_plan?'':hint('目前為唯讀權限。'))+reload;
  }
  function detailShell(product, board, name, body) {
    return crumbs(product,board)+title(name)+boardNav(product.project_id,board==='Workflow Board')+body+reload;
  }
  function pbiPage(data, repo, issue, nativeId=null) {
    const {product,catalog,workflows,can_plan}=data;
    const id=product.project_id;
    const matches=p=>nativeId !== null ? p.source==='native' && p.item_id===nativeId : p.source!=='native' && p.repository_id===repo && p.issue_id===issue;
    const observed=availablePbis(data).find(matches);
    const p=observed || workflows.flatMap(w=>w.history.flatMap(event=>event.pbis)).find(matches);
    if (!p) return detailShell(product,'Scrum Board','此產品目前的來源查無該 PBI',nativeId===null ? catalogNote(catalog) : '');
    const linked=workflows.filter(w=>w.pbis.some(matches));
    const candidates=workflows.filter(w=>!linked.includes(w));
    let body;
    if (p.source==='native') {
      body=nativeDetail(p,data,pbiLink);
      if (can_plan && observed) body+=itemForm(data,p);
      if (observed) body+=deliveryCard(data,p)+descendantDelivery(data,p,url);
    } else {
      body=`<div class="detail-meta">${pill(issueState(p.issue_state))}${p.project_status ? pill(p.project_status):''}<span>${esc(p.repository_id)}</span></div>${catalogNote(catalog)}`;
    }
    body+=section('關聯工作流程',linked.length ? cards(linked.map(w=>`<div>${flowCard(id,w)}${can_plan?unlinkForm(p,w.workflow_id):''}</div>`)) : empty('尚無關聯工作流程。'));
    if (can_plan && observed && candidates.length) {
      body+=section('補連既有工作流程',`<form class="edit-form" data-command="workflow.link"><input type="hidden" name="pbi" value="${esc(pbiKey(p))}"><label>工作流程<select name="flow">${candidates.map(w=>`<option value="${esc(w.workflow_id)}">${esc(w.title)} · ${esc(w.workflow_id)}</option>`).join('')}</select></label><button>補連工作流程</button></form>`);
    }
    if (!observed) body+=hint('此項目已不在目前來源，顯示已保存的 PBI 版本。');
    else if (can_plan) body+=section('從 PBI 建立工作流程',createForm(availablePbis(data),pbiKey(p)));
    else body+=hint('目前為唯讀權限。');
    return detailShell(product,'Scrum Board',pbiTitle(p),body);
  }
  function workflowPage(data, workflowId) {
    const {product,workflows,can_plan}=data;
    const w=workflows.find(w=>w.workflow_id===workflowId);
    if (!w) return detailShell(product,'Workflow Board','此產品查無該工作流程','');
    const linkedKeys=new Set(w.pbis.map(pbiKey));
    const candidates=availablePbis(data).filter(p=>!linkedKeys.has(pbiKey(p)));
    const origin=w.history.find(h=>h.action==='created');
    const initialPbis=origin?.pbis||[];
    const inherited=origin?.external_work_refs||[];
    let body=`<div class="detail-meta">${status(w.status)}<span>${esc(w.workflow_id)}</span><span>最近更新 ${when(w.updated_at)}</span></div>`;
    const attention=attentionItems(w);
    if (attention.length) body+=section('待處理事項',attentionList(attention));
    body+=section('原始工作範圍',`<div class="panel"><p class="goal">${esc(w.goal)}</p>${scopeFields(w.scope)}
      <h3>建立時的 PBI</h3>${initialPbis.length?initialPbis.map(p=>esc(pbiTitle(p))+' · '+esc(p.source_version)).join('、'):hint('建立時未關聯 PBI。')}
      ${inherited.length ? '<h3>建立時的外部參照</h3>'+structuredMarkup(inherited):''}</div>`);
    body+=section('關聯 PBI',w.pbis.length ? cards(w.pbis.map(p=>`<article class="work-card"><h3>${pbiLink(product.project_id,p)}</h3>${hint(pbiSource(p))}${can_plan?unlinkForm(p,workflowId):''}</article>`)) : empty('尚未關聯 PBI'));
    if (can_plan && candidates.length) body+=section('補連 PBI',`<form class="edit-form" data-command="workflow.link"><fieldset><legend>選擇 PBI</legend>${choices(candidates)}</fieldset><button>補連 PBI</button></form>`);
    if (!can_plan) body+=hint('目前為唯讀權限。');
    body+=section('交接與下一步',handoffView(w.latest_handoff))+section('工作證據',evidenceView(w));
    const actions={created:'建立',linked:'補連',unlinked:'解除'};
    const events=w.history.map(h=>`<li><strong>${esc(actions[h.action]||h.action)}</strong> · ${when(h.at)}<p>${h.pbis.map(p=>esc(pbiTitle(p))+' · '+esc(p.source_version)).join('、')||'無關聯 PBI'}</p></li>`);
    body+=section('關聯歷史',events.length ? `<ol class="timeline">${events.join('')}</ol>` : empty('尚無關聯變更紀錄。'));
    return detailShell(product,'Workflow Board',w.title,body);
  }
  return {header,overview,productBoard,pbiPage,workflowPage,
    connect:() => title('產品總覽')+hint('尚未指定資料空間。')+connection(''),
    failure:error => title('讀取失敗')+`<p role="alert">${esc(error.message)}</p>${reload}`
  };
}
