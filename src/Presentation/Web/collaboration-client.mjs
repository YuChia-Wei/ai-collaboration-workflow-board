const envelope = {service_contract_version:'workflow-board/collaboration/1', schema_version:'1.0'};
const messages = {
  signin_required:'請先使用有權限的帳號登入。', forbidden:'目前身分沒有此資料的讀取權限。',
  storage_unavailable:'協作服務尚未設定或暫時無法使用。', store_mismatch:'資料空間識別不符，請核對 store ID。',
  snapshot_expired:'這份快照已過期。請重新讀取 workflow；舊頁面已捨棄。',
  revision_not_found:'指定版本不存在，沒有改讀最新版。', document_integrity_error:'文件內容校驗失敗，停止顯示。',
  document_hash_mismatch:'文件版本或內容識別不符，停止顯示。', invalid_response:'服務回覆不符合查詢的版本，停止顯示。',
};
export const queryError = code => Object.assign(new Error(messages[code] || `讀取失敗（${code}），請重試。`), {code});
const sameRef = (a,b) => a && b && ['store_id','namespace','project_id','record_kind','workflow_id'].every(k=>a[k]===b[k]);
const sameDocument = (a,b) => a && b && ['document_id','revision','content_hash'].every(k=>a[k]===b[k]);

export function createCollaborationClient(storeId, fetcher=globalThis.fetch, projectId=null) {
  const project=projectId&&projectId!=='legacy-personal'?projectId:null;
  const profile=project?{service_contract_version:'workflow-board/collaboration/2',schema_version:'2.0'}:envelope;
  const scope={store_id:storeId,namespace:'personal',...(project?{project_id:project}:{})};
  async function query(name,payload) {
    const ref=payload.workflow_ref??payload;
    if(ref.store_id!==storeId||ref.namespace!=='personal'||(ref.project_id??null)!==project)throw queryError('project_mismatch');
    let response;
    try { response=await fetcher(`/api/collaboration/v${project?2:1}/queries`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...profile,query:name,payload})}); }
    catch { throw queryError('network_unavailable'); }
    let data;
    try { data=await response.json(); } catch { throw queryError('invalid_response'); }
    if(!response.ok) throw queryError(data.error || 'storage_unavailable');
    return data;
  }
  return {
    async capabilities(){const value=await query('capabilities',scope);if(value.store_id!==storeId||value.namespace!=='personal'||(value.project_id??null)!==project||value.service_contract_version!==profile.service_contract_version)throw queryError('invalid_response');return value;},
    async find(q='',cursor=null){const value=await query('workflow.find',{...scope,q,limit:20,cursor});if(!Array.isArray(value.items)||value.items.some(x=>x.workflow_ref.store_id!==storeId||x.workflow_ref.namespace!=='personal'||(x.workflow_ref.project_id??null)!==project))throw queryError('invalid_response');return value;},
    async context(ref) {
      const c=await query('workflow.context',{workflow_ref:ref,limit:20});
      if(!sameRef(ref,c.workflow_ref)) throw queryError('invalid_response');
      for(const section of ['tasks','decisions','handoffs']) {
        const seen=new Set();
        while(c[section].has_more) {
          const cursor=c[section].cursor;
          if(!cursor || seen.has(cursor)) throw queryError('invalid_response');
          seen.add(cursor);
          const next=await query('context.page',{workflow_ref:ref,section,cursor});
          if(next.revision!==c.revision || next.section!==section || !sameRef(ref,next.workflow_ref)) throw queryError('snapshot_expired');
          c[section]={...next.page,items:[...c[section].items,...next.page.items]};
        }
        if(c[section].items.length!==c[section].total) throw queryError('invalid_response');
      }
      return c;
    },
    async task(c,t) {
      const record=await query('task.read',{workflow_ref:c.workflow_ref,at_revision:c.revision,task_id:t.id,definition_revision:t.definition_revision});
      if(record.snapshot_revision!==c.revision || !sameRef(record.workflow_ref,c.workflow_ref) || record.summary.id!==t.id || record.summary.definition_revision!==t.definition_revision) throw queryError('snapshot_expired');
      return record;
    },
    async decision(c,d) {
      const record=await query('decision.read',{workflow_ref:c.workflow_ref,at_revision:c.revision,decision_id:d.id,decision_revision:d.revision});
      if(record.snapshot_revision!==c.revision || !sameRef(record.workflow_ref,c.workflow_ref) || record.decision.id!==d.id || record.decision.revision!==d.revision) throw queryError('snapshot_expired');
      return record;
    },
    async document(ref,documentRef) {
      const doc=await query('document.read',{workflow_ref:ref,document_ref:documentRef});
      if(!sameRef(doc.workflow_ref,ref)) throw queryError('invalid_response');
      if(!sameDocument(doc.ref,documentRef)) throw queryError('document_hash_mismatch');
      const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(doc.content));
      const digest='sha256:'+Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
      if(digest!==documentRef.content_hash) throw queryError('document_integrity_error');
      return doc;
    },
  };
}
