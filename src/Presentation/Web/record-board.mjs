const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={pending:'待處理',in_progress:'進行中',completed:'已完成',deferred:'延期',done:'done · 歷史狀態',planned:'尚未開始',active:'active · 來源狀態',blocked:'有阻礙',unrecorded:'來源未記錄'};
const readable=x=>typeof x==='string'?x:JSON.stringify(x);

// Present the selected record's own statuses; never normalize historical or
// deferred states to another profile's lifecycle.
export function recordBoardMarkup(w){
  const tasks=Object.values(w.steps||{}),editable=w.record_mode==='board'&&w.status!=='completed';
  const status=t=>t.status||'unrecorded';
  const columns=['pending','in_progress','blocked','completed',...new Set(tasks.map(status).filter(s=>!['pending','in_progress','blocked','completed'].includes(s)))];
  return `<section class="record-board"><div class="c-board-heading"><div><h2>任務看板</h2><p class="small">${tasks.length} 項 task · 點選卡片查看詳情</p></div>${editable?'<button data-action="addTask">＋ 新增任務</button>':''}</div>
  ${!tasks.length?`<div class="warn"><strong>這個 workflow 目前沒有 task</strong><br>${w.record_mode==='board'?'你已建立工作流程，但還沒有新增任務。使用「新增任務」後，卡片會出現在待處理欄。':'這份來源紀錄沒有可辨識的結構化任務；請在「文件」查閱原始計畫。'}</div>`:''}
  <div class="c-board" role="region" aria-label="任務進度看板" tabindex="0">${columns.map(s=>{
    const items=tasks.filter(t=>status(t)===s);
    return `<section class="c-column c-column-${esc(s)}" aria-label="${esc(labels[s]||s)}"><header><h3><span class="c-dot"></span>${esc(labels[s]||s)}</h3><span class="c-column-count">${items.length}</span></header><div class="c-column-cards">${items.map(t=>`<button class="c-task-card" data-open-task="${esc(t.id)}"><span class="c-card-id">${esc(t.id)}</span><strong>${esc(t.title||t.id)}</strong><span class="c-card-owner">${esc(t.owner_skill||'負責人未記錄')}</span>${t.dependencies?.length?`<span class="c-card-note">前置任務 · ${esc(t.dependencies.join('、'))}</span>`:''}${s==='deferred'?`<span class="c-card-blocker">延期理由 · ${esc(t.deferred_reason?readable(t.deferred_reason):'未記錄')}</span>`:''}${t.result_summary||t.result?`<span class="c-card-result">${esc(readable(t.result_summary||t.result))}</span>`:''}<span class="c-card-open">查看任務詳情 ↗</span></button>`).join('')||'<p class="c-column-empty">目前沒有任務</p>'}</div></section>`;
  }).join('')}</div><p class="small">${w.record_mode==='source_snapshot'?'來源快照保留原始狀態；未記錄、歷史 done 與延期分開呈現。':'卡片依儲存的任務狀態呈現；新增或更新後會重新讀取。'}任務完成不等於產品驗收。</p></section>`;
}
