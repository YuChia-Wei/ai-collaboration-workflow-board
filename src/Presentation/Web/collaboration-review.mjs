import {esc,documentButton,taskMarkup,decisionMarkup} from './collaboration-view.mjs';

// A browser draft, not a collaboration command or an authorization claim.
export const reviewAvailability=Object.freeze({enabled:false,reason:'審核服務與可信人類授權尚未接入。草稿不會送出，也不會改變工作狀態。'});
export function reviewTargets(c){
  return [
    ...c.decisions.items.filter(d=>d.status==='pending').map(d=>({key:`decision:${d.id}`,kind:'decision',id:d.id,title:d.question,version:d.revision})),
    ...c.tasks.items.filter(t=>t.status==='completed').map(t=>({key:`task:${t.id}`,kind:'task',id:t.id,title:t.title,version:t.definition_revision})),
  ];
}
export function reviewQueueMarkup(c){
  const targets=reviewTargets(c);
  return `<section class="panel"><h2>審閱工作區</h2><p>先閱讀依據與成果，再整理意見供後續處理。已提交結果不等於正式送審或人類接受。</p><div class="warn">${esc(reviewAvailability.reason)}</div><label class="c-label" for="c-review-filter">篩選審閱項目</label><select id="c-review-filter"><option value="all">全部項目</option><option value="decision">待決策問題</option><option value="task">已提交工作成果</option></select><div id="c-review-queue">${targets.map(t=>`<article class="c-review-item" data-review-kind="${t.kind}"><div><span class="small">${t.kind==='decision'?'待決策問題':'已提交結果 · 審核狀態未提供'} · ${esc(t.id)}</span><h3>${esc(t.title)}</h3><p class="small">${t.kind==='decision'?'決策':'工作定義'}版本 ${t.version}</p></div><button data-review="${esc(t.key)}">開啟審閱</button></article>`).join('')||'<p class="empty">目前沒有待決策問題或已提交工作成果。</p>'}</div><p id="c-review-filter-empty" class="empty" hidden>此篩選沒有項目。</p></section><section id="c-review-editor" class="panel" tabindex="-1" hidden></section>`;
}
export function reviewEditorMarkup(c,target,record){
  const decision=target.kind==='decision';
  const refs=decision?record.decision.basis:[record.summary.plan_basis];
  return `<div class="c-row"><h2>${esc(target.title)}</h2><button id="c-review-close">關閉審閱</button></div><p class="small">${esc(target.id)} · workflow 快照 r${c.revision} · ${decision?'決策':'工作定義'}版本 ${target.version}</p><h3>審閱依據</h3>${refs.filter(Boolean).map(documentButton).join('')}${decision?decisionMarkup(record):taskMarkup(record)}<form id="c-review-form"><h3>整理審閱意見</h3><p class="small">僅保留在本頁記憶體，離開或重新整理會遺失；可下載草稿交接。以下選擇不會解除阻礙或表示已接受。</p><label for="c-review-outcome">建議處理方式</label><select id="c-review-outcome" name="outcome" required><option value="">請選擇</option><option value="${decision?'approve':'accept'}">${decision?'建議核准':'建議接受成果'}</option><option value="request_changes">要求修改／補充</option></select><label for="c-review-reason">意見與理由</label><textarea id="c-review-reason" name="reason" rows="5" maxlength="4000" required placeholder="說明依據、需補充內容或已知限制"></textarea><p class="small">證據請以上方指定版本為準；本頁未判定是否滿足後端必要證據規則。</p><button type="submit">預覽審閱草稿</button></form><div id="c-review-confirmation" aria-live="polite"></div>`;
}
export function createReviewDraft(c,target,record,{outcome,reason}){
  const allowed=target.kind==='decision'?['approve','request_changes']:['accept','request_changes'];
  if(!allowed.includes(outcome)||typeof reason!=='string'||!reason.trim()||reason.length>4000)throw Error('請選擇處理方式並填寫 1–4000 字的意見。');
  const match=reviewTargets(c).find(t=>t.key===target.key);
  const identity=target.kind==='decision'?record.decision:record.summary;
  if(!match||match.version!==target.version||record.snapshot_revision!==c.revision||identity.id!==target.id||
    (target.kind==='decision'?identity.revision:identity.definition_revision)!==target.version||
    !['store_id','namespace','record_kind','workflow_id'].every(k=>record.workflow_ref?.[k]===c.workflow_ref[k]))throw Error('審閱資料與目前快照不符，請重新讀取。');
  return {format:'workflow-board/review-draft/1',status:'unsent',workflow_ref:structuredClone(c.workflow_ref),snapshot_revision:c.revision,
    target:{kind:target.kind,id:target.id,revision:target.version},
    basis:structuredClone(target.kind==='decision'?record.decision.basis:[record.summary.plan_basis].filter(Boolean)),
    proposed_outcome:outcome,reason:reason.trim(),
    notice:'未送出、未授權、未核准；此草稿不是可直接執行的 API 命令。接手時必須重讀現況與證據。'};
}
export function reviewConfirmationMarkup(draft){
  const labels={approve:'建議核准',accept:'建議接受成果',request_changes:'要求修改／補充'};
  return `<section class="c-review-confirm"><h3>確認草稿 · 尚未送出</h3><dl class="c-facts"><div><dt>審閱對象</dt><dd>${esc(draft.target.id)} · 版本 ${draft.target.revision}</dd></div><div><dt>讀取快照</dt><dd>r${draft.snapshot_revision}</dd></div><div><dt>建議處理</dt><dd>${labels[draft.proposed_outcome]}</dd></div><div><dt>意見</dt><dd>${esc(draft.reason)}</dd></div></dl><p class="warn">${esc(reviewAvailability.reason)}</p><div class="c-review-actions"><button type="button" id="c-review-edit">返回修改</button><button type="button" id="c-review-download">下載交接草稿</button><button type="button" disabled aria-describedby="c-review-unavailable">送出審核（尚未啟用）</button></div><p id="c-review-unavailable" class="small">下載不會保存到 Board。正式審核歷史與成果接受狀態尚未提供。</p><button type="button" data-tab="handoff">查看既有交接資訊 →</button></section>`;
}
