import {canonicalJson} from '../../../Core/Workflows/Domain/collaboration-values.mjs';
import {defaultDeliveryPolicy} from '../../../Core/Workflows/Domain/delivery.mjs';

export function createDeliveryRepository(db) {
  const stmt=(sql,...bindings)=>db.prepare(sql).bind(...bindings);
  const scope='owner=? AND store_id=? AND project_id=?';
  async function delivery(owner,store,project) {
    const state={revision:0,policy:defaultDeliveryPolicy(),environments:[],handoffs:[],attempts:[],observations:[],applicability:[]};
    const {results}=await stmt('SELECT kind,revision,body FROM portfolio_delivery_records WHERE '+scope+' ORDER BY revision',owner,store,project).all();
    const collections={environment:state.environments,handoff:state.handoffs,attempt:state.attempts,observation:state.observations,applicability:state.applicability};
    for(const row of results){
      const body=JSON.parse(row.body);
      if(row.kind==='policy')state.policy=body;
      else collections[row.kind].push(body);
      state.revision=row.revision;
    }
    return state;
  }
  async function saveDelivery(owner,c,digest,change,failure) {
    const args=[owner,c.store_id,c.project_id];
    const key=canonicalJson([...args,c.operation_id]), attempt=crypto.randomUUID();
    const base={operation_id:c.operation_id,store_id:c.store_id,project_id:c.project_id,request_digest:digest};
    const next=c.expected_revision+1;
    const receipt=failure ? {...base,accepted:false,revision:c.expected_revision,error:failure.error,failure} : {...base,accepted:true,revision:next};
    const stale={...base,accepted:false,error:'revision_conflict',failure:{error:'revision_conflict',category:'conflict',details:{}}};
    const preparedAt=failure?.error==='revision_conflict' ? null : c.expected_revision;
    const gate="EXISTS(SELECT 1 FROM project_collaboration_operations WHERE key=? AND attempt=? AND outcome='accepted')";
    const statements=[stmt(`WITH head AS (SELECT COALESCE(MAX(revision),0) AS revision FROM portfolio_delivery_records WHERE ${scope})
      INSERT INTO project_collaboration_operations(key,owner,store_id,project_id,workflow_id,operation_id,digest,attempt,outcome,receipt)
      SELECT ?,?,?,?,'',?,?,?,CASE WHEN revision=? THEN ? ELSE 'rejected' END,
          CASE WHEN revision=? THEN ? ELSE json_set(?,'$.revision',revision,'$.failure.details.current_revision',revision) END
      FROM head WHERE 1 ON CONFLICT(key) DO NOTHING`,
      ...args,key,...args,c.operation_id,digest,attempt,preparedAt,failure?'rejected':'accepted',preparedAt,JSON.stringify(receipt),JSON.stringify(stale))];
    if(change){
      statements.push(stmt(`INSERT INTO portfolio_delivery_records(owner,store_id,project_id,kind,id,revision,body)
        SELECT ?,?,?,?,?,?,? WHERE ${gate}
        ON CONFLICT(owner,store_id,project_id,kind,id) DO UPDATE SET revision=excluded.revision,body=excluded.body`,
        ...args,change.kind,change.id,next,JSON.stringify(change.body),key,attempt));
      statements.push(stmt(`INSERT INTO mutation_guard(id,ok) VALUES(?,CASE WHEN NOT ${gate} OR EXISTS(
        SELECT 1 FROM portfolio_delivery_records WHERE ${scope} AND kind=? AND id=? AND revision=?) THEN 1 ELSE 0 END)`,
        attempt,key,attempt,...args,change.kind,change.id,next));
      statements.push(stmt('DELETE FROM mutation_guard WHERE id=?',attempt));
    }
    await db.batch(statements);
  }
  return {delivery,saveDelivery};
}
