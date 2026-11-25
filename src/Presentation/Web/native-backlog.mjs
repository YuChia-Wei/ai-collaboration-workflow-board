import {escapeContent as esc} from './content-view.mjs';
import {stateLabel,itemLifecycle,lifecycleSetup} from './pbi-lifecycle.mjs';
import {sprintField,sprintLabel,sprintPlanning} from './sprint-planning.mjs';

const kinds = {
  epic: 'Epic', feature: 'Feature', user_story: 'User Story', task: 'Task', bug: 'Bug'
};
const parentKind = {feature: 'epic', user_story: 'feature', task: 'user_story'};
export const kindName = item => kinds[item.kind];
export const nativeItems = data => data.backlog?.items ?? [];
export const availablePbis = data => [...nativeItems(data), ...data.catalog.pbis];

function options(items, selected) {
  const counts = new Map();
  for (const item of items) counts.set(item.title, (counts.get(item.title) ?? 0) + 1);
  return items.map(item => {
    const label = counts.get(item.title) > 1 ? item.title+' · '+item.item_id : item.title;
    return `<option value="${esc(item.item_id)}"${item.item_id === selected ? ' selected' : ''}>${esc(label)}</option>`;
  }).join('');
}

export function kindFields(kind, items, item) {
  if (kind === 'bug') {
    const stories = items.filter(candidate => candidate.kind === 'user_story');
    return `<label>預期行為<textarea name="expected_behavior" required maxlength="4000" rows="2">${esc(item?.expected_behavior)}</textarea></label>
      <label>實際行為<textarea name="actual_behavior" required maxlength="4000" rows="2">${esc(item?.actual_behavior)}</textarea></label>
      <label>受影響的 User Story<select name="related_story_id"><option value="">未指定</option>${options(stories, item?.related_story_id)}</select></label>`;
  }
  if (item || !parentKind[kind]) return '';
  const parents = items.filter(candidate => candidate.kind === parentKind[kind]);
  return `<label>上層 ${kinds[parentKind[kind]]}<select name="parent_id" required><option value="">選擇上層項目</option>${options(parents)}</select></label>`;
}

export function itemForm(data, item) {
  const items=nativeItems(data);
  const creating = !item;
  const kind = item?.kind ?? 'epic';
  const kindOptions = Object.entries(kinds).map(([value, label]) => {
    const needsParent = parentKind[value] && !items.some(candidate => candidate.kind === parentKind[value]);
    return `<option value="${value}"${needsParent ? ' disabled' : ''}>${label}${needsParent ? '（請先建立 '+kinds[parentKind[value]]+'）' : ''}</option>`;
  });
  const kindInput = creating ? `<label>類型<select name="kind">${kindOptions.join('')}</select></label>` : '';
  const status = creating ? '' : item.state_id ? `<input type="hidden" name="status" value="${esc(item.status)}">` :
    `<label><span id="edit-status-label">狀態</span><select name="status" aria-labelledby="edit-status-label"><option value="open">開啟中</option><option value="closed"${item.status === 'closed' ? ' selected' : ''}>已關閉</option></select></label>`;
  return `<details class="item-editor" ${creating ? 'data-new-item' : 'data-edit-item'}${creating && !items.length ? ' open' : ''}>
    <summary>${creating ? '新增 PBI' : '編輯 PBI'}</summary>
    <form class="edit-form" data-command="backlog.${creating ? 'create' : 'edit'}"${creating ? '' : ' data-item="'+esc(item.item_id)+'"'}>
      ${kindInput}<label>標題<input name="title" required maxlength="300" value="${esc(item?.title)}"></label>
      <label>說明<textarea name="description" maxlength="4000" rows="3">${esc(item?.description)}</textarea></label>
      ${sprintField(data.backlog.sprints,item?.sprint_id)}
      <div data-kind-fields>${kindFields(kind, items, item)}</div>${status}
      <button class="primary">${creating ? '建立 PBI' : '儲存變更'}</button>
    </form></details>`;
}

export function nativeBoard(data, pbiLink, linkCounts, pbiKey) {
  const items = nativeItems(data);
  const sprints=new Map(data.backlog.sprints.map(s=>[s.sprint_id,s]));
  const children = new Map();
  for (const item of items) {
    if (!children.has(item.parent_id)) children.set(item.parent_id, []);
    children.get(item.parent_id).push(item);
  }
  function moves(siblings, i) {
    if (!data.can_plan || siblings.length < 2) return '';
    const move = (direction, before) => `<button type="submit" name="before_id" value="${esc(before)}" aria-label="${direction}">${direction}</button>`;
    return `<form class="item-moves" data-command="backlog.move" data-item="${esc(siblings[i].item_id)}">
      ${i > 0 ? move('上移', siblings[i-1].item_id) : ''}
      ${i+1 < siblings.length ? move('下移', siblings[i+2]?.item_id ?? '') : ''}</form>`;
  }
  function tree(siblings) {
    return `<ol class="backlog-tree">${siblings.map((item,i) => {
      const linked = linkCounts.get(pbiKey(item)) || 0;
      return `<li data-item-id="${esc(item.item_id)}"><div class="backlog-row">
        <span class="item-kind">${kindName(item)}</span><div class="item-summary">${pbiLink(data.product.project_id,item)}
        <small>${esc(stateLabel(item,data))}${sprints.has(item.sprint_id)?' · '+esc(sprints.get(item.sprint_id).name):''}${linked ? ' · 關聯 '+linked+' 個流程' : ''}</small></div>
        ${moves(siblings,i)}</div>${children.has(item.item_id) ? tree(children.get(item.item_id)) : ''}</li>`;
    }).join('')}</ol>`;
  }
  const list = items.length ? tree(children.get(null) ?? []) : '<p class="empty">目前沒有自建 PBI。</p>';
  return `<section class="section"><h2>自建產品待辦</h2>${sprintPlanning(data)}${list}${data.can_plan ? itemForm(data) : ''}${lifecycleSetup(data)}</section>`;
}

export function nativeDetail(item, data, pbiLink) {
  const items = nativeItems(data);
  const find = id => items.find(candidate => candidate.item_id === id);
  const itemLink = id => {
    const target = find(id);
    return target ? pbiLink(data.product.project_id,target) : esc(id);
  };
  const facts = [];
  const sprint=data.backlog.sprints.find(s=>s.sprint_id===item.sprint_id);
  facts.push(['Sprint',esc(sprint?sprintLabel(sprint):(item.sprint_id||'尚未排入 Sprint'))]);
  if (item.parent_id) facts.push(['上層項目', itemLink(item.parent_id)]);
  if (item.description) facts.push(['說明', esc(item.description)]);
  if (item.kind === 'bug') {
    facts.push(['預期行為',esc(item.expected_behavior)], ['實際行為',esc(item.actual_behavior)]);
    if (item.related_story_id) facts.push(['受影響的 User Story',itemLink(item.related_story_id)]);
  }
  const children = items.filter(candidate => candidate.parent_id === item.item_id);
  if (children.length) facts.push(['下層項目', `<ul>${children.map(child => '<li>'+pbiLink(data.product.project_id, child)+'</li>').join('')}</ul>`]);
  return `<div class="detail-meta"><span class="item-kind">${kindName(item)}</span><span>${esc(stateLabel(item,data))}</span><span>自建 PBI · 版本 ${esc(item.source_version)}</span></div>
    ${facts.length ? '<dl class="panel facts">'+facts.map(([label,value]) => '<div><dt>'+label+'</dt><dd>'+value+'</dd></div>').join('')+'</dl>' : ''}${itemLifecycle(item,data)}`;
}
