import {canonicalJson} from '../../../Core/Workflows/Domain/collaboration-values.mjs';
import {workflowAttention} from '../../../Core/Workflows/Domain/portfolio.mjs';
import {defaultFlows} from '../../../Core/Workflows/Domain/pbi-lifecycle.mjs';
import {defaultSprintSettings} from '../../../Core/Workflows/Domain/sprint-planning.mjs';
import {createDeliveryRepository} from './delivery-repository.mjs';

export function createPortfolioRepository(db) {
 const stmt=(sql,...args)=>db.prepare(sql).bind(...args);
 const scope='owner=? AND store_id=? AND project_id=?';
 async function catalog(owner,store,project){
  const row=await stmt('SELECT revision,body FROM portfolio_catalogs WHERE '+scope,owner,store,project).first();
  return row?{...JSON.parse(row.body),revision:row.revision}:{revision:0,coverage:'unknown',observed_at:null,pbis:[]};
 }
 async function backlog(owner,store,project,withHistory=false){
  const args=[owner,store,project];
  // Pin the planning settings, sprint dates, ordered cards and their history to one read.
  const unionHistory=withHistory?` UNION ALL SELECT 'history',revision,item_id,0,body FROM portfolio_item_transitions WHERE ${scope}`:'';
  const {results}=await stmt(`SELECT 'item' AS kind,revision,item_id,position,body FROM portfolio_backlog_items WHERE ${scope}
   UNION ALL SELECT 'config',revision,'',0,body FROM portfolio_lifecycles WHERE ${scope}
   UNION ALL SELECT 'settings',revision,'',0,json_object('duration_weeks',duration_weeks,'start_weekday',start_weekday)
    FROM portfolio_sprint_settings WHERE ${scope}
   UNION ALL SELECT 'sprint',revision,start_date,0,json_object('sprint_id',sprint_id,'name',name,'start_date',start_date,'end_date',end_date)
    FROM portfolio_sprints WHERE ${scope}
   ${unionHistory} ORDER BY kind,position,item_id,revision`,...args,...args,...args,...args,...(withHistory?args:[])).all();
  const children=new Map(),histories=new Map(),sprints=[];
  let revision=0,flows=defaultFlows(),sprint_settings=defaultSprintSettings;
  for(const row of results){
   revision=Math.max(revision,row.revision);
   const item=JSON.parse(row.body);
   if(row.kind==='config'){flows=item;continue;}
   if(row.kind==='settings'){sprint_settings=item;continue;}
   if(row.kind==='sprint'){sprints.push(item);continue;}
   if(row.kind==='history'){
    if(!histories.has(row.item_id))histories.set(row.item_id,[]);
    histories.get(row.item_id).push(item);continue;
   }
   item.state_id??=null;
   item.sprint_id??=null;
   if(withHistory)item.state_history=histories.get(row.item_id)??[];
   if(!children.has(item.parent_id))children.set(item.parent_id,[]);
   children.get(item.parent_id).push(item);
  }
  const items=[];
  function visit(parent){
   for(const child of children.get(parent)??[]){items.push(child);visit(child.item_id);}
  }
  visit(null);
  return {revision,items,flows,sprint_settings,sprints};
 }
 async function selectedBacklogItems(owner,store,project,ids){
  if(!ids.length)return [];
  const {results}=await stmt(`SELECT body FROM portfolio_backlog_items WHERE ${scope}
   AND item_id IN (SELECT value FROM json_each(?))`,owner,store,project,JSON.stringify(ids)).all();
  return results.map(row=>{
   const item=JSON.parse(row.body);
   item.sprint_id??=null;
   return item;
  });
 }
 async function saveBacklog(owner,c,digest,change,failure){
  const args=[owner,c.store_id,c.project_id];
  const key=canonicalJson([...args,c.operation_id]),attempt=crypto.randomUUID();
  const base={operation_id:c.operation_id,store_id:c.store_id,project_id:c.project_id,request_digest:digest};
  const next=c.expected_revision+1;
  const receipt=failure
   ? {...base,accepted:false,revision:c.expected_revision,error:failure.error,failure}
   : {...base,accepted:true,revision:next};
  const conflict={...base,accepted:false,error:'revision_conflict',failure:{error:'revision_conflict',category:'conflict',details:{}}};
  // A command prepared against a different head has no applicable change,
  // even if another writer reaches the requested version before this batch.
  const preparedAt=failure?.error==='revision_conflict'?null:c.expected_revision;
  const gate="EXISTS(SELECT 1 FROM project_collaboration_operations WHERE key=? AND attempt=? AND outcome='accepted')";
  const fence=[key,attempt];
  const statements=[stmt(`WITH head AS (SELECT MAX(
   COALESCE((SELECT MAX(revision) FROM portfolio_backlog_items WHERE ${scope}),0),
   COALESCE((SELECT revision FROM portfolio_lifecycles WHERE ${scope}),0),
   COALESCE((SELECT revision FROM portfolio_sprint_settings WHERE ${scope}),0),
   COALESCE((SELECT MAX(revision) FROM portfolio_sprints WHERE ${scope}),0)) AS revision)
   INSERT INTO project_collaboration_operations(key,owner,store_id,project_id,workflow_id,operation_id,digest,attempt,outcome,receipt)
   SELECT ?,?,?,?,'',?,?,?,CASE WHEN revision=? THEN ? ELSE 'rejected' END,
    CASE WHEN revision=? THEN ? ELSE json_set(?,'$.revision',revision,'$.failure.details.current_revision',revision) END
   FROM head WHERE 1 ON CONFLICT(key) DO NOTHING`,
   ...args,...args,...args,...args,key,...args,c.operation_id,digest,attempt,preparedAt,failure?'rejected':'accepted',preparedAt,JSON.stringify(receipt),JSON.stringify(conflict))];
  if(change?.sprint_settings){
   const {duration_weeks,start_weekday}=change.sprint_settings;
   statements.push(stmt(`INSERT INTO portfolio_sprint_settings(owner,store_id,project_id,duration_weeks,start_weekday,revision)
    SELECT ?,?,?,?,?,? WHERE ${gate} ON CONFLICT(owner,store_id,project_id) DO UPDATE SET
    duration_weeks=excluded.duration_weeks,start_weekday=excluded.start_weekday,revision=excluded.revision`,
    ...args,duration_weeks,start_weekday,next,...fence));
  }
  if(change?.sprint){
   const {sprint_id,name,start_date,end_date}=change.sprint;
   statements.push(stmt(`INSERT INTO portfolio_sprints(owner,store_id,project_id,sprint_id,name,start_date,end_date,revision)
    SELECT ?,?,?,?,?,?,?,? WHERE ${gate}`,...args,sprint_id,name,start_date,end_date,next,...fence));
  }
  if(change?.flows){
   statements.push(stmt(`INSERT INTO portfolio_lifecycles(owner,store_id,project_id,revision,body) SELECT ?,?,?,?,? WHERE ${gate}
    ON CONFLICT(owner,store_id,project_id) DO UPDATE SET revision=excluded.revision,body=excluded.body`,
    ...args,next,JSON.stringify(change.flows),...fence));
  }
  if(change?.item){
   const {item,from,position}=change;
   if(c.command==='backlog.move'&&from!==position){
    const earlier=position<from,low=earlier?position:from+1,high=earlier?from-1:position;
    statements.push(stmt(`UPDATE portfolio_backlog_items SET position=position+? WHERE ${scope}
     AND parent_id IS ? AND position BETWEEN ? AND ? AND ${gate}`,earlier?1:-1,...args,item.parent_id,low,high,...fence));
   }
   statements.push(stmt(`INSERT INTO portfolio_backlog_items(owner,store_id,project_id,item_id,parent_id,position,revision,body)
    SELECT ?,?,?,?,?,?,?,? WHERE ${gate} ON CONFLICT(owner,store_id,project_id,item_id)
    DO UPDATE SET position=excluded.position,revision=excluded.revision,body=excluded.body`,
    ...args,item.item_id,item.parent_id,position,next,JSON.stringify(item),...fence));
   statements.push(stmt(`INSERT INTO mutation_guard(id,ok) VALUES(?,CASE WHEN NOT ${gate} OR EXISTS(
    SELECT 1 FROM portfolio_backlog_items WHERE ${scope} AND item_id=? AND revision=?) THEN 1 ELSE 0 END)`,
    attempt,...fence,...args,item.item_id,next));
   statements.push(stmt('DELETE FROM mutation_guard WHERE id=?',attempt));
   if(change.history){
    statements.push(stmt(`INSERT INTO portfolio_item_transitions(owner,store_id,project_id,item_id,revision,body)
     SELECT ?,?,?,?,?,? WHERE ${gate}`,...args,item.item_id,next,JSON.stringify(change.history),...fence));
   }
  }
  await db.batch(statements);
 }
 async function overview(owner,store,project,legacy){
  const prefix=legacy?'collaboration_':'project_collaboration_';
  const columns=legacy?['owner','store_id','workflow_id']:['owner','store_id','project_id','workflow_id'];
  const matches=alias=>columns.map(col=>alias+'.'+col+'=a.'+col).join(' AND ');
  const scopeFilter=legacy?'owner=? AND store_id=?':scope;
  const bindings=legacy?[owner,store]:[owner,store,project];
  const [meta,rows]=await Promise.all([
   stmt("SELECT revision,json_extract(body,'$.coverage') AS coverage,json_extract(body,'$.observed_at') AS observed_at FROM portfolio_catalogs WHERE "+scope,owner,store,project).first(),
   stmt(`WITH heads AS (SELECT * FROM ${prefix}heads WHERE ${scopeFilter}),
    active AS (SELECT h.*,s.summary FROM heads h JOIN ${prefix}snapshots s USING(${columns.join(',')},revision)
      WHERE json_extract(s.summary,'$.status')='active'),
    counts AS (SELECT COUNT(*) AS workflow_count FROM heads)
    SELECT counts.workflow_count,a.workflow_id,a.summary,
      CASE WHEN a.workflow_id IS NOT NULL AND json_type(a.summary,'$.attention') IS NULL THEN
       (SELECT group_concat(body,'') FROM (SELECT c.body FROM ${prefix}chunks c
        WHERE ${matches('c')} AND c.revision=a.revision ORDER BY c.position)) END AS old_state,
      (SELECT COALESCE(SUM(CASE json_extract(f.body,'$.action') WHEN 'unlinked' THEN -1 ELSE 1 END * json_array_length(f.body,'$.pbis')),0)
       FROM ${prefix}facts f WHERE ${matches('f')} AND f.kind='portfolio_links' AND f.revision<=a.revision) AS pbi_count
    FROM counts LEFT JOIN active a ON 1 ORDER BY a.workflow_id`,...bindings).all()
  ]);
  const cards=rows.results.filter(r=>r.workflow_id!==null).map(row=>{
   const {attention,...summary}=JSON.parse(row.summary);
   return {...summary,...(attention??workflowAttention(JSON.parse(row.old_state))),workflow_id:row.workflow_id,
    source:legacy?'collaboration/1':'collaboration/2',pbi_count:row.pbi_count};
  });
  return {catalog:meta??{revision:0,coverage:'unknown',observed_at:null},workflow_count:rows.results[0].workflow_count,workflows:cards};
 }
 async function replace(owner,c,digest){
  const args=[owner,c.store_id,c.project_id], attempt=crypto.randomUUID();
  const key=canonicalJson([...args,c.operation_id]);
  const current='COALESCE((SELECT revision FROM portfolio_catalogs WHERE '+scope+'),0)';
  const accepted={operation_id:c.operation_id,request_digest:digest,accepted:true,revision:c.expected_revision+1};
  const rejected={...accepted,accepted:false,error:'revision_conflict'};
  const gate="EXISTS(SELECT 1 FROM project_collaboration_operations WHERE key=? AND attempt=? AND outcome='accepted')";
  await db.batch([
   stmt("INSERT INTO project_collaboration_operations(key,owner,store_id,project_id,workflow_id,operation_id,digest,attempt,outcome,receipt) SELECT ?,?,?,?,'',?,?,?,CASE WHEN "+current+"=? THEN 'accepted' ELSE 'rejected' END,CASE WHEN "+current+"=? THEN ? ELSE json_set(?,'$.revision',"+current+") END ON CONFLICT(key) DO NOTHING",
    key,...args,c.operation_id,digest,attempt,...args,c.expected_revision,...args,c.expected_revision,JSON.stringify(accepted),JSON.stringify(rejected),...args),
   stmt('INSERT INTO portfolio_catalogs(owner,store_id,project_id,revision,body) SELECT ?,?,?,?,? WHERE '+gate+' ON CONFLICT(owner,store_id,project_id) DO UPDATE SET revision=excluded.revision,body=excluded.body',
    ...args,accepted.revision,JSON.stringify(c.catalog),key,attempt),
   stmt('INSERT INTO mutation_guard(id,ok) VALUES(?,CASE WHEN NOT '+gate+' OR EXISTS(SELECT 1 FROM portfolio_catalogs WHERE '+scope+' AND revision=?) THEN 1 ELSE 0 END)',
    attempt,key,attempt,...args,accepted.revision),
   stmt('DELETE FROM mutation_guard WHERE id=?',attempt)
  ]);
 }
 // One SQLite statement pins every head and associated fact to the same read.
 async function workflows(owner,store,project,legacy){
  const prefix=legacy?'collaboration_':'project_collaboration_';
  const keys=legacy?'owner,store_id,workflow_id':'owner,store_id,project_id,workflow_id';
  const predicate=legacy?'owner=? AND store_id=?':scope;
  const args=legacy?[owner,store]:[owner,store,project];
  const result=await stmt(`WITH heads AS (SELECT * FROM ${prefix}heads WHERE ${predicate})
   SELECT workflow_id,revision,kind,position,body FROM (
    SELECT h.workflow_id,h.revision,'state' AS kind,c.position,c.body FROM heads h JOIN ${prefix}chunks c USING(${keys},revision)
    UNION ALL
    SELECT h.workflow_id,f.revision,f.kind,f.position,f.body FROM heads h JOIN ${prefix}facts f USING(${keys})
    WHERE f.revision<=h.revision AND f.kind IN ('portfolio_links','handoffs','evidence','checkpoints')
   ) ORDER BY workflow_id,revision,kind,position`,...args).all();
  const groups=new Map();
  for(const row of result.results){
   if(!groups.has(row.workflow_id))groups.set(row.workflow_id,{chunks:[],history:[],evidence:[],checkpoints:[],latest_handoff:null});
   const group=groups.get(row.workflow_id);
   if(row.kind==='state')group.chunks.push(row.body);
   else if(row.kind==='portfolio_links')group.history.push(JSON.parse(row.body));
   else if(row.kind==='evidence')group.evidence.push(JSON.parse(row.body));
   else if(row.kind==='checkpoints')group.checkpoints.push(JSON.parse(row.body));
   else group.latest_handoff=JSON.parse(row.body);
  }
  return [...groups.values()].map(({chunks,...facts})=>({state:JSON.parse(chunks.join('')),...facts}));
 }
 return {catalog,replace,backlog,selectedBacklogItems,saveBacklog,workflows,overview,...createDeliveryRepository(db)};
}
