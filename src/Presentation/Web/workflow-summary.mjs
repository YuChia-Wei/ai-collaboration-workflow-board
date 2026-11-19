import {Marked} from 'marked';
import {escapeContent as esc} from './content-view.mjs';
import {markdownMarkup,richTextMarkup} from './document-view.mjs';

export function planDocument(workflow){
 const docs=Object.values(workflow.documents||{});
 const entry=docs.find(d=>d.name===workflow.entrypoint||d.source_path===workflow.entrypoint);
 return entry&&!entry.binary_reference&&/\.md$/i.test(entry.name)?entry:null;
}

// Read an explicitly named purpose/scope section, never infer a new summary.
// Keep full Markdown blocks so paragraphs, lists and code are not cut mid-way.
export function planExcerpt(content){
 const tokens=new Marked().lexer(String(content));
 const purpose=/^(?:(?:\d+[.)]?\s+)?(?:goal|objective|purpose|scope|accepted product scope|product scope|目標|目的|工作範圍|產品範圍|授權範圍))(?:\s*[:：].*)?$/i;
 let start=tokens.findIndex(t=>t.type==='heading'&&purpose.test(t.text.trim()));
 const heading=start>=0?tokens[start]:null;
 if(start<0)start=tokens.findIndex(t=>t.type!=='heading'&&t.type!=='space')-1;
 const blocks=[];
 for(const token of tokens.slice(start+1)){
  if(token.type==='heading'&&(!heading||token.depth<=heading.depth))break;
  if(token.type!=='space')blocks.push(token);
 }
 if(!blocks.length)return null;
 return {title:heading?.text||'計畫開頭',lead:blocks[0].raw,rest:blocks.slice(1).map(t=>t.raw).join('\n')};
}

export async function verifyPlanDocument(data,meta){
 const r=data?.revision,doc=data?.document;
 const expected=meta.revisions?.find(r=>r.revision===1)?.hash||meta.source_hash;
 if(doc?.id!==meta.id||r?.revision!==1||typeof r.content!=='string'||!expected)throw Error('文件版本不符');
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(r.content));
 const actual=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
 if(actual!==expected.replace(/^sha256:/,''))throw Error('文件完整性不符');
 return data;
}

export function workflowSummaryMarkup(workflow,state={}){
 const source=workflow.record_mode==='source_snapshot',doc=source?planDocument(workflow):null;
 const excerpt=state.excerpt;
 const content=excerpt?markdownMarkup(excerpt.lead):richTextMarkup(workflow.goal||'尚未記錄目標。');
 return `<section class="workflow-summary" aria-label="${source?'來源計畫摘要':'工作目標'}"><div class="summary-heading"><h2>${source?'計畫與工作範圍':'工作目標'}</h2>${doc?`<button data-doc="${esc(doc.id)}">閱讀完整計畫 ↗</button>`:''}</div>
 ${source?`<p class="summary-origin">${excerpt?`摘自 ${esc(doc.name)} · ${esc(excerpt.title)}`:state.loading?'正在讀取固定版本計畫；以下為既有匯入摘錄。':'匯入時的片段，可能不完整。'}</p>`:''}
 <div class="summary-body">${content}</div>
 ${excerpt?.rest?`<details class="summary-more"><summary>展開此段完整內容</summary>${markdownMarkup(excerpt.rest)}</details>`:''}
 ${state.error?'<p class="summary-note">完整計畫暫時無法載入，請使用上方入口重試。</p>':''}</section>`;
}
