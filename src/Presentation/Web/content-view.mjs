// Read-only presentation of structured facts. Never normalizes source values.
export const escapeContent=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fieldNames={id:'識別碼',title:'標題',name:'名稱',description:'說明',summary:'摘要',goal:'目標',status:'狀態',kind:'類型',type:'類型',version:'版本',revision:'修訂',workflow:'工作流程',workflow_id:'工作流程 ID',task_id:'任務 ID',tasks:'任務',steps:'步驟',owner_skill:'負責 skill',owner:'負責人',result:'結果',result_summary:'成果摘要',evidence:'證據',evidence_ids:'證據 ID',outcome:'結果狀態',scope:'範圍',included:'允許處理',excluded:'排除事項',dependencies:'前置任務',completion_criteria:'完成條件',criterion_results:'條件結果',explanation:'說明',limitations:'限制',blockers:'阻礙',next_step:'下一步',next_actor_hint:'接手者提示',completed:'已完成事項',remaining:'待完成事項',reason:'理由',deferred_reason:'延期理由',resume_condition:'恢復條件',created_at:'建立時間',updated_at:'更新時間',completed_at:'完成時間',observed_at:'觀察時間',source:'來源',source_id:'來源 ID',source_revision:'來源版本',source_commit:'來源 commit',source_root:'來源目錄',source_path:'來源路徑',source_version:'來源版本',original_id:'原始 ID',original_workflow_id:'原始工作流程 ID',repository_id:'Repository',project_id:'專案 ID',namespace:'命名空間',store_id:'資料空間',record_kind:'紀錄類型',schema_version:'資料格式版本',service_contract_version:'服務契約版本',template_version:'模板版本',template_source:'模板來源',lifecycle_contract:'生命週期契約',mapping_version:'對應格式版本',view_provenance:'欄位來源',file:'檔案',path:'路徑',selector:'欄位位置',files:'檔案',actor:'執行者',subject_id:'身分 ID',binding_id:'身分綁定',environment:'執行環境',command:'執行命令',content_hash:'內容雜湊',sha256:'SHA-256',document_id:'文件 ID',document_refs:'指定文件',artifact_refs:'成果參照',finding_ids:'Finding ID',finding_status:'Findings 結論',model:'模型',reasoning_effort:'推理強度',requirement_id:'交付要求 ID',decision_ref:'決策依據',disposition:'處置',branch:'分支',base_commit:'基準 commit',url:'連結',references:'參考資料',notes:'補充說明'};
const statuses={pending:'待處理',in_progress:'進行中',completed:'已完成',blocked:'受阻',deferred:'延期',done:'歷史 done',active:'執行中',draft:'草稿',paused:'暫停',cancelled:'已取消',passed:'通過',failed:'失敗',not_run:'未執行',interrupted:'中斷',accepted:'已接受',rejected:'已拒絕',waived:'已豁免'};
export function safeContentUrl(value){try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}}
export function narrativeMarkup(value){return `<div class="readable-text">${escapeContent(value??'未記錄')}</div>`;}
export function structuredMarkup(value){
 let remaining=600,limited=false;
 const render=(item,depth=0,key='')=>{
  if(--remaining<0||depth>7){limited=true;return '<span class="content-muted">此段請展開原始資料查看</span>';}
  if(item===null||item===undefined)return '<span class="content-muted">未提供</span>';
  if(typeof item==='boolean')return `<span class="value-boolean">${item?'是':'否'}</span>`;
  if(typeof item!=='object'){
   if(item==='')return '<span class="content-muted">空白</span>';
   if(['status','outcome','finding_status','disposition'].includes(key)&&Object.hasOwn(statuses,String(item)))return `<span class="content-status">${escapeContent(statuses[item])}<small>${escapeContent(item)}</small></span>`;
   const href=typeof item==='string'?safeContentUrl(item):null;
   return href?`<a class="content-link" href="${escapeContent(href)}" target="_blank" rel="noopener noreferrer">${escapeContent(item)} ↗</a>`:narrativeMarkup(item);
  }
  if(Array.isArray(item)){
   if(!item.length)return '<span class="content-muted">沒有項目</span>';
   const visible=item.slice(0,Math.max(0,remaining));if(visible.length<item.length)limited=true;
   return `<ol class="content-list">${visible.map((entry,index)=>`<li><span class="content-index">${index+1}</span><div>${render(entry,depth+1,key)}</div></li>`).join('')}</ol>`;
  }
  const entries=Object.entries(item),visible=entries.slice(0,Math.max(0,remaining));if(visible.length<entries.length)limited=true;
  if(!entries.length)return '<span class="content-muted">沒有欄位</span>';
  return `<dl class="content-fields">${visible.map(([name,entry])=>`<div class="content-field${entry!==null&&typeof entry==='object'?' content-field-wide':''}"><dt>${escapeContent(Object.hasOwn(fieldNames,name)?fieldNames[name]:name)}${Object.hasOwn(fieldNames,name)?`<small>${escapeContent(name)}</small>`:''}</dt><dd>${render(entry,depth+1,name)}</dd></div>`).join('')}</dl>`;
 };
 const markup=render(value);
 return `<div class="structured-content">${markup}${limited?'<p class="warn">內容較多，閱讀檢視僅展開部分欄位；完整資料請查看原文或下載。</p>':''}</div>`;
}
export function rawDisclosure(content,label='查看原始資料'){
 return `<details class="raw-disclosure"><summary>${escapeContent(label)}</summary><pre class="c-raw">${escapeContent(typeof content==='string'?content:JSON.stringify(content,null,2))}</pre></details>`;
}
