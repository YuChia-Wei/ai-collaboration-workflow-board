import {Marked} from 'marked';
import {parseDocument} from 'yaml';
import {escapeContent as esc,narrativeMarkup,structuredMarkup,rawDisclosure,safeContentUrl} from './content-view.mjs';

// Render Markdown with a deliberately small HTML surface: source HTML remains
// text, images never fetch remote data, and links must be explicitly resolved.
export function markdownMarkup(content,{resolveLink}={}){
 const parser=new Marked({gfm:true,renderer:{
  html({text}){return esc(text);},
  image({text}){return `<span class="document-image-label">圖片：${esc(text||'未命名')}</span>`;},
  link({href,tokens}){
   const label=this.parser.parseInline(tokens),file=resolveLink?.(href);
   if(file&&['data-file','data-doc'].includes(file.attribute))return `<a href="#document" ${file.attribute}="${esc(file.value)}">${label}</a>`;
   const url=safeContentUrl(href);
   return url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`:`<span title="${esc(href)}">${label}</span>`;
  },
  checkbox({checked}){return `<span class="document-check" aria-label="${checked?'已勾選':'未勾選'}">${checked?'☑':'☐'}</span>`;}
 }});
 return `<div class="document-prose">${parser.parse(String(content))}</div>`;
}

export function richTextMarkup(value){
 if(value!==null&&typeof value==='object')return structuredMarkup(value)+rawDisclosure(value);
 const content=String(value??'未記錄');
 if(/^\s*[\[{]/.test(content)){try{return structuredMarkup(readStructured(content,'JSON'))+rawDisclosure(content);}catch{}}
 return content.length>300000?narrativeMarkup(content):markdownMarkup(content);
}

function readStructured(content,format){
 // JSON syntax is checked separately; YAML's document model additionally rejects
 // duplicate keys and keeps large integer values exact in the reading view.
 if(format==='JSON')JSON.parse(content);
 const doc=parseDocument(content,{schema:format==='JSON'?'json':'core',uniqueKeys:true,intAsBigInt:true});
 if(doc.errors.length||doc.warnings.length)throw Error('unreadable_document');
 return doc.toJS({maxAliasCount:0});
}

export function documentMarkup(content,{name='',kind='',resolveLink}={}){
 const original=String(content??'');
 if(!original)return '<div class="empty">這份文件沒有內容。</div>';
 const type=kind.toLowerCase(),extension=name.split('.').at(-1).toLowerCase();
 let format=/^(md|markdown)$/.test(extension)||type.includes('markdown')?'Markdown':extension==='json'||type.includes('json')?'JSON':/^(yaml|yml)$/.test(extension)||type.includes('yaml')?'YAML':'文字';
 if(format==='文字'&&/^[\s]*[\[{]/.test(original)){try{JSON.parse(original);format='JSON';}catch{}}
 if(format==='文字'&&/^(?:#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```)|\*\*[^\n]+\*\*/m.test(original))format='Markdown';
 // Keep the browser responsive on large attachments; the exact source is still
 // available through the existing download and raw-source controls.
 if(original.length>300000)return `<p class="warn">文件較大，請下載閱讀完整內容。</p>${rawDisclosure(original,'查看完整原文')}`;
 let body;
 try{
  body=format==='JSON'||format==='YAML'?structuredMarkup(readStructured(original,format))
   :format==='Markdown'?markdownMarkup(original,{resolveLink})
   :/^(js|mjs|ts|py|sql|css|sh|ps1|html|xml)$/.test(extension)?`<pre class="document-code"><code>${esc(original)}</code></pre>`
   :narrativeMarkup(original);
 }catch{
  return `<p class="warn" role="alert">無法將這份 ${esc(format)} 文件完整轉成閱讀檢視。原文保持不變，請展開或下載查看。</p>${rawDisclosure(original,'查看完整原文')}`;
 }
 return `<div class="document-reading"><div class="document-format"><span>${esc(format)}</span>閱讀檢視</div>${body}</div>${rawDisclosure(original,'查看完整原文')}`;
}

export function resolveReplicaLink(href,path,files){
 try{
  const url=new URL(href,'https://replica.invalid/'+path);
  if(url.origin!=='https://replica.invalid'||href.startsWith('#'))return null;
  const target=decodeURIComponent(url.pathname.slice(1)),index=files.findIndex(file=>file.path===target);
  return index<0?null:{attribute:'data-file',value:index};
 }catch{return null;}
}

export function fileLibraryMarkup(files){
 const groupFor=path=>/\.(md|markdown)$/i.test(path)?'文件與報告':/\.(json|ya?ml)$/i.test(path)?'工作紀錄':'其他附件';
 return ['文件與報告','工作紀錄','其他附件'].map(group=>{
  const entries=files.map((file,index)=>({file,index})).filter(({file})=>groupFor(file.path)===group);
  return entries.length?`<section class="file-group"><h3>${group}<span>${entries.length}</span></h3><div class="file-grid">${entries.map(({file,index})=>`<button class="file-card" data-file="${index}"><span class="file-type">${esc(file.path.includes('.')?file.path.split('.').at(-1).toUpperCase():'FILE')}</span><span class="file-name"><strong>${esc(file.path.split('/').at(-1))}</strong><small>${esc(file.path)}</small></span><span class="file-size">${Number.isFinite(file.size)?`${(file.size/1024).toFixed(1)} KB`:'開啟'} →</span></button>`).join('')}</div></section>`:'';
 }).join('')||'<div class="empty">沒有來源文件。</div>';
}
