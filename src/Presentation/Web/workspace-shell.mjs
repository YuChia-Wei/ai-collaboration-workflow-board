import {escapeContent} from './content-view.mjs';

const pages = {
  portfolio: '產品總覽',
  collaboration: 'Workflow 協作',
  'source-replica': '專案來源副本',
  records: '人工與歷史來源'
};

export function workspaceLabel(view) {
  return pages[view];
}

export function workspaceTitle(view, context = '') {
  return `${context || workspaceLabel(view)} · 工作紀錄室`;
}

export function workspaceHref(view, store) {
  const params = new URLSearchParams({view});
  if (store) params.set('store', store);
  return '?' + params.toString();
}

export function workspaceHeader(current, store) {
  const links = Object.entries(pages).map(([view, label]) => {
    const active = view === current ? ' aria-current="page"' : '';
    return `<a href="${escapeContent(workspaceHref(view, store))}"${active}>${label}</a>`;
  });
  return `<header class="workspace-header"><strong>工作紀錄室</strong><nav aria-label="工作空間">${links.join('')}</nav></header>`;
}
