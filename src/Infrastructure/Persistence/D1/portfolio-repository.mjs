import {canonicalJson} from '../../../Core/Workflows/Domain/collaboration-values.mjs';
import {workflowAttention} from '../../../Core/Workflows/Domain/portfolio.mjs';

export function createPortfolioRepository(db) {
 const stmt=(sql,...args)=>db.prepare(sql).bind(...args);
 const scope='owner=? AND store_id=? AND project_id=?';
 async function catalog(owner,store,project){
  const row=await stmt('SELECT revision,body FROM portfolio_catalogs WHERE '+scope,owner,store,project).first();
  return row?{...JSON.parse(row.body),revision:row.revision}:{revision:0,coverage:'unknown',observed_at:null,pbis:[]};
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
 return {catalog,replace,workflows,overview};
}
