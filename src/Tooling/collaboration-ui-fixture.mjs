// Explicit synthetic dataset for WB-07 acceptance. Produces a plan only; no IO,
// credentials, automatic seeding, or production Worker import.
import {contentDigest} from '../Core/Workflows/Domain/collaboration-values.mjs';

export async function collaborationUiFixture(storeId,runId,observedAt){
 const envelope={service_contract_version:'workflow-board/collaboration/1',schema_version:'1.0'};
 const scope={included:'合成資料：驗證 workflow、工作狀態、待決策、文件 revision 與交接資訊的畫面呈現',excluded:'真實工作完成、人類核准、跨帳號授權、GitHub 狀態同步及正式資料遷移'};
 const source={original:'Workflow Board #7',provider:'github',scope:'YuChia-Wei/ai-collaboration-workflow-board',work_id:'7',url:'https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/7',observed_at:observedAt,source_version:null,availability:'available'};
 const steps=[],documents=[];
 const makeRef=suffix=>({store_id:storeId,namespace:'personal',record_kind:'collaboration',workflow_id:runId+'-'+suffix});
 function command(ref,label,name,payload,assignmentTask=null){
  const expectedRevision=steps.filter(step=>step.request.workflow_ref.workflow_id===ref.workflow_id).length;
  steps.push({label,assignment_task:assignmentTask,request:{...envelope,workflow_ref:ref,operation_id:ref.workflow_id+'-'+label,expected_revision:expectedRevision,command:name,payload}});
 }
 async function plan(ref,tasks,content){
  const document={document_id:'plan',revision:1,content_hash:await contentDigest(content)};
  documents.push({workflow_ref:ref,ref:document,content});
  command(ref,'plan','plan.revise',{plan:{document_id:'plan',expected_document_revision:0,content},execution_impact:'declared',task_changes:tasks.map(([id,title,dependencies])=>({kind:'add',definition:{id,title,description:'合成畫面驗收情境；不代表此項產品工作已實作或驗收。',scope,completion_criteria:['能顯示此合成情境與證據限制'],dependencies,plan_basis:document,inputs:[],expected_artifacts:[],decision_ids:[],workstream:null}})),unaffected_task_ids:[],decision_dispositions:[],completion_requirements:tasks.map(([id,title])=>({id:'R-'+id,description:title,task_ids:[id],document_refs:[]})),requirement_dispositions:[]});
  return document;
 }
 const claim=(ref,id)=>command(ref,'claim-'+id,'task.claim',{task_id:id,expected_definition_revision:1,session:{label:'wb07-synthetic-fixture',client:'selected-authenticated-client',skill_id:null}});
 const complete=(ref,id,doc)=>command(ref,'complete-'+id,'task.complete',{task_id:id,result:{summary:'合成完成樣本：只供畫面驗收，不代表真實功能完成。',criterion_results:[{criterion_index:0,outcome:'satisfied',explanation:'此結果為預先設計的合成資料。',evidence_ids:[]}],artifacts:[{kind:'document',ref:doc}],evidence:[],limitations:['合成資料；沒有 PO 核准或產品驗收結論。']}},id);
 const active=makeRef('active');
 command(active,'create','workflow.create',{title:'[合成驗收] Workflow 協作與交接',goal:'供 #7 比較完成、執行中、受阻及待處理工作，並核對下一步與原版文件。',scope,skill:{id:'software-development-orchestrator',version:'0.2.0'},external_work_refs:[source]});
 const activePlan=await plan(active,[['DONE','已完成工作範例',[]],['DOING','執行中工作範例',['DONE']],['BLOCKED','等待補充證據範例',[]],['NEXT','下一位接手工作範例',['DOING']]],'# 合成畫面驗收計畫\n\n這份 workflow 只供 #7 測試 UI，不代表 Issue #5 或 #7 已完成。\n\n- DONE：完成但未經人類接受。\n- DOING：已認領並回報進度。\n- BLOCKED：缺少證據且有待人決策。\n- NEXT：前置工作未完成，不能認領。\n\nGitHub Issues 仍是工作管理權威；線上與本機證據分開保存。');
 command(active,'start','workflow.start',{});
 claim(active,'DONE');complete(active,'DONE',activePlan);
 claim(active,'DOING');
 command(active,'progress','task.progress',{task_id:'DOING',summary:'合成進度：已確認欄位，下一步檢查文件 revision 與交接內容的呈現。',evidence:[]},'DOING');
 claim(active,'BLOCKED');
 const handoff={completed:'合成樣本：已收集需求與目前進度。',remaining:'補充驗收證據，並由人決定呈現方式。',next_step:'先讀 plan@1 與待決策問題；補充證據後依受控命令解除阻擋。',artifact_refs:[{kind:'document',ref:activePlan}],blockers:['缺少畫面驗收證據'],limitations:['單 owner Agent binding；未驗證跨帳號或人類決策。'],next_actor_hint:'取得同一授權範圍的後續工作階段'};
 command(active,'block','task.block',{task_id:'BLOCKED',reason:'合成阻礙：缺少畫面驗收證據。',handoff},'BLOCKED');
 command(active,'decision','decision.open',{decision_id:'D-UI',question:'[合成] 詳情頁先呈現哪一項資訊？',options:['阻礙與下一步','文件 revision 與證據'],required_decider:{kind:'human'},blocks:{task_ids:['BLOCKED'],workflow_closure:true},basis:[activePlan]});
 command(active,'handoff','handoff.record',{task_id:'NEXT',handoff:{...handoff,next_step:'先讀 workflow context 與 plan@1；等待 DOING 完成，不擴大允許範圍。'}});

 const finished=makeRef('completed');
 command(finished,'create','workflow.create',{title:'[合成驗收] 已完成的 workflow',goal:'讓 UI 分辨 workflow 完成與人類接受成果，並保留原始計畫。',scope,skill:{id:'software-development-orchestrator',version:'0.2.0'},external_work_refs:[source]});
 const finishedPlan=await plan(finished,[['RESULT','已完成成果範例',[]]],'# 已完成 workflow 的合成範例\n\n此為展示完成狀態的測試資料；不構成人類核准、正式交付或產品驗收。');
 command(finished,'start','workflow.start',{});claim(finished,'RESULT');complete(finished,'RESULT',finishedPlan);
 command(finished,'finish','workflow.complete',{summary:'合成 workflow 完成樣本；不代表 PO 接受成果。',document_refs:[finishedPlan]});
 return {purpose:'WB-07 synthetic UI acceptance only',envelope,workflow_refs:[active,finished],steps,documents,expected:{active:{status:'active',tasks:{DONE:'completed',DOING:'in_progress',BLOCKED:'blocked',NEXT:'pending'},pending_decisions:1,handoffs:2},completed:{status:'completed',tasks:{RESULT:'completed'}}},execution_rule:'Use only a selected authenticated client. Resolve assignment_task from workflow.context immediately before its first submission and save the exact resolved request. After an unknown outcome recover the original operation_id; never regenerate its request. Stop on failure or unexpected existing workflow.'};
}
