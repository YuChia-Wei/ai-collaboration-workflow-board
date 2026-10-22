export const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={draft:'草稿',active:'執行中',paused:'已暫停',cancelled:'已取消',completed:'已完成',pending:'待處理',in_progress:'執行中',blocked:'受阻',decided:'已決定',waived:'已豁免'};
export const badge=s=>`<span class="badge ${esc(s)}">${esc(labels[s]||s)}</span>`;
const text=x=>esc(x??'未提供');
const fact=(label,value)=>`<div><dt>${esc(label)}</dt><dd>${text(value)}</dd></div>`;
const lines=items=>items?.length?`<ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="small">未記錄</p>';
const actor=a=>a?`${a.subject_id} · ${a.kind} · binding ${a.binding_id}`:'目前無承接者';
const safeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
export const documentKey=r=>JSON.stringify({document_id:r.document_id,revision:r.revision,content_hash:r.content_hash});
export const documentButton=r=>r?`<button class="c-doc" data-document="${esc(documentKey(r))}">${esc(r.document_id)} <span>revision ${r.revision} ↗</span></button>`:'';
const artifacts=items=>(items||[]).map(a=>a.kind==='document'?documentButton(a.ref):`<p class="small">外部參考：${text(a.ref?.original)}${safeUrl(a.ref?.url)?` · <a href="${esc(safeUrl(a.ref.url))}" target="_blank" rel="noopener noreferrer">開啟來源 ↗</a>`:''}</p>`).join('');

export function listMarkup(items,selected) {
  return items.map(w=>`<button class="item ${w.workflow_ref.workflow_id===selected?'selected':''}" data-workflow="${esc(w.workflow_ref.workflow_id)}"><div class="c-row">${badge(w.status)}<span class="small">r${w.revision}</span></div><h2>${esc(w.title)}</h2><p class="monospace">${esc(w.workflow_ref.workflow_id)}</p><span class="c-open">查看進度與交接 →</span></button>`).join('')||'<div class="empty">沒有符合的協作 workflow。此處不會改讀人工或來源快照資料。</div>';
}

export function emptyCollaborationMarkup(search=false){
  return `<div class="c-board-heading"><h1>協作看板</h1><a href="/">查看既有工作看板 →</a></div><div class="warn"><strong>${search?'沒有符合搜尋條件的協作工作流程':'目前尚無協作工作流程'}</strong><p>${search?'請調整左側搜尋條件。':'這個資料空間目前沒有協作 task。你在原畫面建立的人工紀錄與既有來源快照，請從「查看既有工作看板」開啟。'}</p></div><div class="c-board" role="region" aria-label="工作進度看板">${['pending','in_progress','blocked','completed'].map(s=>`<section class="c-column c-column-${s}" aria-label="${labels[s]}"><header><h3><span class="c-dot"></span>${labels[s]}</h3><span class="c-column-count">0</span></header><p class="c-column-empty">目前沒有工作</p></section>`).join('')}</div>`;
}

export function detailMarkup(c,tab) {
  const w=c.workflow,tasks=c.tasks.items,decisions=c.decisions.items,pending=decisions.filter(d=>d.status==='pending'),handoffs=c.handoffs.items;
  const next=handoffs.at(-1)?.handoff.next_step;
  const counts=['completed','in_progress','blocked','pending'].map(s=>({s,n:tasks.filter(t=>t.status===s).length}));
  return `<div class="topline"><button id="c-back" class="subtle">← 工作流程列表</button><span>協作紀錄 · workflow revision ${c.revision}</span><button id="c-refresh">重新讀取</button></div>
  <div class="hero"><div><div class="eyebrow">WORKFLOW / 協作進度</div><h1>${esc(w.title)}</h1></div>${badge(w.status)}</div><p class="goal">${esc(w.goal)}</p>
  <div class="c-stats">${counts.map(({s,n})=>`<div><strong>${n}</strong><span>${labels[s]}工作</span></div>`).join('')}</div><p class="small">工作數量是執行狀態統計，不代表業務驗收進度。</p>
  <div class="next"><div><div class="next-label">交接紀錄中的下一步</div><div class="next-text">${text(next??'尚無交接下一步；請先查閱工作與計畫。')}</div><div class="next-owner">${esc(handoffs.at(-1)?.handoff.next_actor_hint||'下一位尚未指定')} · 交接不擴大允許範圍</div></div></div>
  ${c.missing.length?`<div class="warn" role="alert"><strong>接手資料有缺漏，不能視為完整內容</strong>${lines(c.missing.map(m=>`${m.kind} · ${m.ref}：${m.reason}`))}</div>`:''}
  <nav class="tabs" aria-label="Workflow 詳情">${[['tasks',`工作看板 ${tasks.length}`],['review','審閱工作區'],['overview','總覽'],['decisions',`決策 ${pending.length} 待處理`],['documents','文件與成果'],['handoff',`交接 ${handoffs.length}`]].map(([id,name])=>`<button data-tab="${id}" class="${tab===id?'on':''}" aria-current="${tab===id?'page':'false'}">${name}</button>`).join('')}</nav>
  <div id="c-content">${tab==='review'?'':tab==='overview'?overview(c):tab==='tasks'?taskList(c):tab==='decisions'?decisionList(c):tab==='documents'?documents(c):handoffList(c)}</div>`;
}

function overview(c) {
  const w=c.workflow,active=c.tasks.items.filter(t=>t.assignment);
  return `<section class="panel"><h2>交辦與允許範圍</h2><dl class="c-facts">${fact('允許處理',w.scope.included)}${fact('排除事項',w.scope.excluded)}${fact('規劃 skill',`${w.skill.id} @ ${w.skill.version??'未提供版本'}`)}${fact('目前承接者',active.length?active.map(t=>`${t.id}：${actor(t.assignment.actor)}`).join('\n'):'目前無有效承接')}</dl></section>
  <section class="panel"><h2>分開確認每一種完成</h2><div class="c-semantics">${[['Agent session','契約未提供結束狀態'],['執行工作',`${c.tasks.items.filter(t=>t.status==='completed').length} 筆已提交完成結果`],['PO 決策',`${c.decisions.items.filter(d=>d.status==='pending').length} 筆待決策；詳見決策依據`],['交接',`${c.handoffs.items.length} 筆紀錄；須另查前置條件與授權`],['人類接受成果','未提供接受紀錄；不能由 workflow 完成推定']].map(([a,b])=>`<div><strong>${a}</strong><p>${esc(b)}</p></div>`).join('')}</div></section>
  <section class="panel"><h2>來源與觀察時間</h2>${w.external_work_refs.map(r=>`<article class="c-source"><strong>${esc(r.original)}</strong>${safeUrl(r.url)?` <a href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">開啟來源 ↗</a>`:''}<dl class="c-facts">${fact('來源系統 / 工作識別',`${r.provider??'未提供'} / ${r.work_id??'未提供'}`)}${fact('來源範圍',r.scope)}${fact('觀察時間（UTC）',r.observed_at)}${fact('來源版本',r.source_version)}${fact('可用性',r.availability)}</dl></article>`).join('')||'<p>沒有外部來源關聯。</p>'}<p class="small">此為記錄中的來源觀察；GitHub Issues／Projects 仍是原工作管理權威。</p></section>
  <details class="panel"><summary>完整接手識別</summary><pre>${esc(JSON.stringify(c.workflow_ref,null,2))}</pre><p>snapshot revision：${c.revision}</p></details>`;
}
function taskList(c) {
  const tasks=c.tasks.items;
  const columns=['pending','in_progress','blocked','completed',...new Set(tasks.map(t=>t.status).filter(s=>!['pending','in_progress','blocked','completed'].includes(s)))];
  return `<div class="c-board-heading"><div><h2>工作看板</h2><p class="small">依目前狀態分欄 · 點選卡片查看工作定義與成果</p></div><span class="small">${tasks.length} 項工作 · 快照 r${c.revision}</span></div>
  <div class="c-board" role="region" aria-label="工作進度看板" tabindex="0">${columns.map(status=>{
    const items=tasks.filter(t=>t.status===status);
    return `<section class="c-column c-column-${esc(status)}" aria-label="${esc(labels[status]||status)}"><header><h3><span class="c-dot"></span>${esc(labels[status]||status)}</h3><span class="c-column-count" aria-label="${items.length} 項工作">${items.length}</span></header><div class="c-column-cards">${items.map(t=>{
      const handoff=[...c.handoffs.items].reverse().find(h=>h.task_id===t.id)?.handoff;
      const waiting=t.dependencies.filter(id=>tasks.find(d=>d.id===id)?.status!=='completed');
      return `<button class="c-task-card" data-task="${esc(t.id)}" aria-controls="c-task-detail" aria-expanded="false"><span class="c-card-id">${esc(t.id)} <span>v${t.definition_revision}</span></span><strong>${esc(t.title)}</strong><span class="c-card-owner">${esc(t.assignment?.actor?.subject_id||'目前無承接者')}</span>${t.blocking_decision_ids.length?`<span class="c-card-blocker">待決策 · ${esc(t.blocking_decision_ids.join('、'))}</span>`:''}${status==='blocked'&&handoff?.blockers?.length?`<span class="c-card-blocker">${esc(handoff.blockers.join('；'))}</span>`:''}${waiting.length?`<span class="c-card-note">等待前置 · ${esc(waiting.join('、'))}</span>`:''}${status==='pending'&&t.claimable?'<span class="c-card-ready">可開始 · 尚未認領</span>':''}${status==='completed'?'<span class="c-card-done">已提交完成結果</span>':''}<span class="c-card-open">查看工作與成果 ↗</span></button>`;
    }).join('')||'<p class="c-column-empty">目前沒有工作</p>'}</div></section>`;
  }).join('')}</div>${!tasks.length?'<p class="empty">尚無工作；新增工作後會依狀態顯示於看板。</p>':''}
  <p class="small c-board-note">唯讀狀態快照 · 重新讀取可取得最新狀態。已完成代表提交結果，仍須另確認人類接受。</p>
  <section class="panel c-task-detail" id="c-task-detail" tabindex="-1" hidden></section>`;
}
export function taskDetailShell(t) {
  return `<div class="c-row"><h2>${esc(t.id)} · ${esc(t.title)}</h2><button id="c-task-close" aria-label="收合工作詳情">收合</button></div>${badge(t.status)}<p class="small">${esc(actor(t.assignment?.actor))}</p><dl class="c-facts">${fact('前置工作',t.dependencies.join('、')||'無')}${fact('阻擋決策',t.blocking_decision_ids.join('、')||'無')}${fact('快照下可認領',t.claimable?'符合條件；仍需受控認領命令':'目前不符合')}${fact('Session（描述資訊）',t.assignment?.session?.label??'未提供；不代表 session 已結束')}</dl>${documentButton(t.plan_basis)}<div id="c-task-${esc(t.id)}"></div>`;
}
export function taskMarkup(r) {
  const d=r.definition,result=r.result;
  return `<div class="c-expanded"><p>${esc(d.description)}</p><dl class="c-facts">${fact('允許範圍',d.scope.included)}${fact('排除事項',d.scope.excluded)}</dl><h4>完成條件</h4>${lines(d.completion_criteria)}<h4>必要輸入</h4>${artifacts(d.inputs)||'<p class="small">未列出</p>'}<h4>預期產物</h4>${lines(d.expected_artifacts)}<h4>提交結果</h4>${result?`<p>${esc(result.summary)}</p><p class="small">${esc(actor(result.actor))} · ${esc(result.completed_at)}</p>${result.criterion_results.map(x=>`<p>條件 ${x.criterion_index+1} · ${esc(x.outcome)}：${esc(x.explanation)}</p>`).join('')}${artifacts(result.artifacts)}<h4>證據</h4>${result.evidence.length?`<pre>${esc(JSON.stringify(result.evidence,null,2))}</pre>`:'<div class="warn">未附證據，工作完成不等於品質已確認。</div>'}<h4>限制</h4>${lines(result.limitations)}`:'<p class="small">尚無完成成果。查詢契約未提供逐筆進度回報；阻礙與下一步請見交接紀錄。</p>'}</div>`;
}
function decisionList(c) {
  return `<div class="warn"><strong>人類審核尚未啟用</strong><br>目前 Agent binding 不具 human 決策權限。本頁僅供檢視；不會以 Agent 身分核准、要求修改或接受成果。後續操作須綁定可信 human 身分與明確 revision。</div>${c.decisions.items.map(d=>`<article class="panel"><div class="c-row"><h3>${esc(d.question)}</h3>${badge(d.status)}</div><p class="small">${esc(d.id)} · 決策 revision ${d.revision} · 決定者 ${esc(d.required_decider.kind)}</p><p>阻擋工作：${esc(d.blocks.task_ids.join('、')||'無')} · ${d.blocks.workflow_closure?'阻擋 workflow 結案':'不阻擋結案'}</p><h4>此決策的指定依據</h4>${d.basis.map(documentButton).join('')}<p class="small">依據後續變動需重新判定，不能將舊決策自動套用新內容。此頁只顯示本快照的決策版本。</p><button data-decision="${esc(d.id)}">查看選項與決策結果</button><div id="c-decision-${esc(d.id)}"></div></article>`).join('')||'<div class="empty">此快照沒有決策紀錄；不表示人類已接受成果。</div>'}`;
}
export function decisionMarkup(r) {
  const result=r.resolution;
  return `<div class="c-expanded"><h4>候選選項</h4>${lines(r.options)}<h4>決策結果</h4>${result?`<dl class="c-facts">${fact('結果',result.value??result.outcome)}${fact('理由',result.reason)}${fact('實際決定者',actor(result.actor))}${fact('決策時間',result.decided_at)}</dl>`:'<p>尚未決定。需由符合要求的人類透過受控命令處理。</p>'}</div>`;
}
function documents(c) {
  const w=c.workflow;
  return `<section class="panel"><h2>目前計畫</h2>${documentButton(w.plan)||'<p>尚無計畫。</p>'}<p class="small">每次開啟使用 document ID、revision 與內容 hash，不自動改讀最新版。</p></section><section class="panel"><h2>必要交付</h2>${w.completion_requirements.map(r=>`<article class="c-source"><h3>${esc(r.id)} · ${esc(r.description)}</h3><p class="small">工作：${esc(r.task_ids.join('、')||'無')}</p>${r.document_refs.map(documentButton).join('')}</article>`).join('')||'<p>尚無必要交付清單。</p>'}${w.requirement_dispositions.length?`<h3>交付處置</h3><pre>${esc(JSON.stringify(w.requirement_dispositions,null,2))}</pre>`:''}</section><section class="panel"><h2>Workflow 結果</h2>${w.result?`<p>${text(w.result.summary??w.result.reason)}</p>${artifacts((w.result.document_refs||[]).map(ref=>({kind:'document',ref})))}`:'<p>尚無整體完成結果。</p>'}<p class="small">各工作提交的成果與證據可在「工作」查閱。這些紀錄不構成人類接受。</p></section>`;
}
function handoffList(c) {
  return `<h2>交接紀錄</h2><p class="small">接手提示不是授權或自動認領。須沿用允許範圍，核對目前前置條件與缺漏。</p>${[...c.handoffs.items].reverse().map(r=>{const h=r.handoff;return `<article class="panel"><div class="c-row"><h3>工作 ${esc(r.task_id??'整體 workflow')}</h3><span class="badge">紀錄 r${r.workflow_revision}</span></div><p class="small">${esc(actor(r.actor))}<br>${esc(r.created_at)}</p><dl class="c-facts">${fact('已完成',h.completed)}${fact('尚未完成',h.remaining)}${fact('下一步',h.next_step)}${fact('接手者提示',h.next_actor_hint)}</dl><h4>阻礙</h4>${lines(h.blockers)}<h4>限制</h4>${lines(h.limitations)}${artifacts(h.artifact_refs)}</article>`;}).join('')||'<div class="empty">尚無交接紀錄。</div>'}`;
}
