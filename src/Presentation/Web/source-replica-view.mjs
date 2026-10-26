import {esc} from './collaboration-view.mjs';
import {recordBoardMarkup} from './record-board.mjs';

const issueLabels={unresolved_task_reference:'任務引用找不到對應定義',invalid_source_document:'文件格式無法解析',unrecognized_task_document:'無法辨識任務欄位',unsupported_task_format:'尚不支援此任務格式',duplicate_task_id:'重複任務 ID，請查閱來源',invalid_task_id:'任務 ID 無效',invalid_task_status:'任務狀態格式無效',document_too_large:'文件超過任務解析上限',non_regular_document:'連結或特殊檔案保留原文',task_limit:'任務數超過單一看板解析上限'};
export function replicaBoardMarkup(board){
 return `${board.issue_count?`<div class="warn" role="alert"><strong>部分來源內容未能完整轉為任務</strong><p>${board.issue_count} 項需查閱原文；以下顯示已辨識的任務。</p><ul>${board.issues.map(x=>`<li>${esc(x.path??'來源 metadata')}：${esc(issueLabels[x.code]??x.code)}</li>`).join('')}</ul>${board.issue_count>board.issues.length?'<p>僅列出部分問題，請查閱來源文件。</p>':''}</div>`:''}${recordBoardMarkup({record_mode:'source_snapshot',steps:board.tasks})}<section id="r-task-detail" class="panel c-task-detail" tabindex="-1" hidden></section>`;
}
export function replicaTaskMarkup(task,fileIndex){
 const fact=(label,value)=>`<div><dt>${esc(label)}</dt><dd>${esc(value||'未記錄')}</dd></div>`;
 return `<div class="c-row"><h2>${esc(task.title)}</h2><button id="r-task-close">收合</button></div><dl class="c-facts">${fact('任務',task.id)}${fact('來源狀態',task.status)}${fact('負責人',task.owner_skill)}${fact('前置任務',task.dependencies.join('、'))}</dl><h3>工作內容</h3><p class="r-task-text">${esc(task.description||'來源沒有另記工作說明。')}</p><h3>成果</h3><p class="r-task-text">${esc(task.result_summary||'來源沒有記錄成果摘要。')}</p>${task.deferred_reason?`<h3>延期理由</h3><p>${esc(task.deferred_reason)}</p>`:''}${task.details_truncated?'<p class="warn">這裡顯示內容摘要，完整內容請開啟原文。</p>':''}<p class="small">${esc(task.source_path??'來源 metadata')} · ${esc(task.source_selector)}</p>${fileIndex>=0?`<button data-file="${fileIndex}">開啟任務原文</button>`:'<p class="small">任務定義保存在下方「來源與版本」的 metadata。</p>'}`;
}
