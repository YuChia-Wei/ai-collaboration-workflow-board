import {contentDigest} from '../Core/Workflows/Domain/collaboration-values.mjs';

// All product names, work items and observations in this preview are fictional.
export async function seedPortfolioPreview(call, store) {
  await call('/api/commands', {
    service_contract_version:'framework-board/1', type:'create_workflow', workflow_id:'opening-hours',
    operation_id:'seed-opening-hours', expected_revision:0, payload:{
      title:'確認場地開放時間', goal:'對照公告與預約時段。', workflow_kind:'場地維護', owner_skill:'場地管理',
      authorized_scope:'此合成範例', next_step:'核對週末時段。', next_owner:'值班人員'
    }
  });
  const v2 = {service_contract_version:'workflow-board/collaboration/2', schema_version:'2.0'};
  const observedAt = '2026-01-07T08:00:00.000Z';
  function pbi(repository_id, number, title, project_status) {
    return {repository_id, issue_id:'issue-'+number, number, title, project_status,
      issue_state:'open', observed_at:observedAt, source_version:'snapshot-1'};
  }
  const slots = pbi('sample-river',11,'列出可預約時段','進行中');
  const exports = pbi('sample-river',12,'匯出預約明細','待辦');
  const river = [slots,exports,pbi('sample-river',13,'顯示場地說明','待辦')];
  const court = [pbi('sample-court',11,'產生範例目錄',null)];
  for (const [project_id,name,pbis] of [['river','澄河',river],['court','石庭',court]]) {
    await call('/api/collaboration/v2/commands', {...v2, operation_id:'seed-product', expected_revision:0,
      command:'project.create', project_ref:{store_id:store, namespace:'personal', project_id}, payload:{name}});
    await call('/api/portfolio/v1/command', {store_id:store, project_id, operation_id:'seed-catalog',
      command:'catalog.replace', expected_revision:0, catalog:{coverage:'complete', observed_at:observedAt, pbis}});
  }
  const workflows = [
    {id:'WF-31', title:'整理時段資料', goal:'核對預約與匯出共用的時段資料。', pbis:[slots,exports],
      evidence:'平日與假日各有一組可預約時段。', next:'核對兩組時段的起訖時間。'},
    {id:'WF-32', title:'調查時區差異', goal:'確認跨日預約顯示的日期。', pbis:[], decision:'預約頁顯示時區',
      evidence:'跨日預約在兩個時區顯示不同日期。', next:'確認預約頁採用的時區，再覆核跨日範例。'}
  ];
  for (const flow of workflows) {
    const ref = {store_id:store, namespace:'personal', project_id:'river', record_kind:'collaboration', workflow_id:flow.id};
    await call('/api/portfolio/v1/command', {store_id:store, project_id:'river', operation_id:'create-'+flow.id,
      command:'workflow.create', workflow_id:flow.id, expected_revision:0, title:flow.title, goal:flow.goal,
      pbis:flow.pbis.map(({repository_id,issue_id,source_version})=>({repository_id,issue_id,source_version}))});
    let revision = 1;
    const send = (command,payload) => call('/api/collaboration/v2/commands', {...v2, workflow_ref:ref,
      expected_revision:revision++, operation_id:flow.id+'-'+command, command, payload});
    const content = '# '+flow.title+'\n'+flow.goal;
    const plan = {document_id:'plan', revision:1, content_hash:await contentDigest(content)};
    const task = {id:'T1', title:flow.title, description:flow.goal, scope:{included:flow.goal,excluded:'正式部署'},
      completion_criteria:[flow.next], dependencies:[], plan_basis:plan, inputs:[], expected_artifacts:[], decision_ids:[], workstream:null};
    await send('plan.revise', {plan:{document_id:'plan',expected_document_revision:0,content}, execution_impact:'declared',
      task_changes:[{kind:'add',definition:task}], unaffected_task_ids:[], decision_dispositions:[],
      completion_requirements:[{id:'R1',description:flow.goal,task_ids:['T1'],document_refs:[]}], requirement_dispositions:[]});
    await send('workflow.start', {});
    if (flow.decision) await send('decision.open', {decision_id:'timezone', question:flow.decision,
      options:['場地時區','使用者時區'], required_decider:{kind:'human'}, blocks:{task_ids:['T1'],workflow_closure:true}, basis:[plan]});
    await send('checkpoint.append', {observation:flow.evidence,next_step:flow.next,document_refs:[plan]});
    await send('handoff.record', {task_id:null, handoff:{completed:flow.evidence, remaining:flow.next, next_step:flow.next,
      artifact_refs:[{kind:'document',ref:plan}], blockers:[], limitations:[], next_actor_hint:null}});
  }
}
