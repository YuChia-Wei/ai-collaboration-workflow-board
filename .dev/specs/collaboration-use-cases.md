# Board 協作命令與查詢用例規格

## 狀態、來源及解讀方式

本文件為 `spec-author/draft` 的 production 規格，涵蓋 `workflow-board/collaboration/1` schema `1.0` 全部19 種命令、8 種查詢與接受協定。UC/CQ/OP 編號為新增草稿標籤。實體定義、值與容量見 [領域實體規格](collaboration-domain.md)。原需求 R01–R06、B01–B14、V01–V21 保持原 ID；本文件不把文件撰寫當作自動化執行證據。

固定程式基線為 `3e7ee13cda8de27c8a069a062ffd0d289584722e`：[README](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/contracts/collaboration-v1/README.md)、[schema](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/contracts/collaboration-v1/schema.json)、[domain](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/domain/collaboration-workflow.mjs)、[application](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/application/collaboration.mjs)、[ports](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/application/collaboration-ports.mjs)。Issue #3 的已完成設計與 #4 契約是意圖來源；root 擷取的 live Issue 快照見索引 provenance。此作者讀取 #3 快照，updatedAt=`2026-10-12T13:28:04Z`。

命令 application/reducer 已存在，但新 profile 的 production storage、可信 Agent 認證、query handlers、snapshot、HTTP/MCP routes 尚未提供。表內「結果」表示契約或觀察到的命令核心結果；不表示呼叫現行網站可取得。人工作業 profile、legacy、local 的同名能力不能代替。

## 共通命令入口及授權

每個 command required envelope 為 `service_contract_version,schema_version,workflow_ref,operation_id,expected_revision,command,payload`。payload 精確欄位見各 UC；所有欄位 required，即使值為 null 或空陣列。create expected_revision=0，其餘正整數。client 不提供 owner/actor；accessContext 由可信 adapter 提供 `owner_id,actor,capabilities`。未認證／未授權先拒絕，不洩漏受保護 current revision、文件或回條。

所有命令需要 read；其他能力按目前核心對應：workflow.create、plan.revise、document.append、decision.open、handoff.record、checkpoint.append 要 plan；其他 workflow.* 要 manage；task.claim/progress/complete 要 execute；task.release/block 要 execute 或 manage；task.unblock 要 plan；task.cancel 要 manage；decision.resolve 要 decide。plan 中的 carry_forward/waive 另核對 decide＋required_decider；requirement_dispositions 變更另要 change_scope。capability 是需求語意，production credential 如何提供它仍屬 #5/#6。

除 create 外 WorkflowRef 必須與載入狀態精確匹配，expected_revision 要目前 workflow revision。命令讀取完整 invariants_complete state；不可用分頁 context 驗證 DAG/結案。completed/cancelled workflow 只允許 document.append、handoff.record、checkpoint.append。每次成功均產生 workflow revision+1、updated_at、單一 domain event、effects、accepted receipt；各 UC 只列額外結果。拒絕不改狀態或寫 domain facts/event。

## OP-01 原子接受、重試與並行

1. inbound 解析階段拒絕 wire 格式、重複 keys、未知欄位、版本與 bytes 超限；建立可信身分。application 拷貝 input/access，validateCommand、canonical command bytes≤300000、read＋command capability、storeId 匹配後再查 operation。
2. content_hash 為原文 UTF-8 bytes 的 SHA-256；request_digest 為 canonical JSON `{purpose:"workflow-board-command-v1",authority:{owner_id,actor},command}` 的 SHA-256。expected_revision、全部 payload、目標及完整 actor 都參與 digest。canonical object keys 依 UTF-16 排序，陣列順序不變、無 normalization/BOM/額外空白、安全十進位整數；hash 不是權限或簽章。
3. operation key 是 canonical `[owner_id,store_id,operation_id]`，不包含 workflow ID。查到 accepted/rejected 且 digest 相同，直接回原 receipt，不再 CAS/load/clock/domain。不同 digest→operation_payload_conflict，不能改 principal/目標/payload/revision 重用 ID。
4. 未知 outcome 才 load complete command state、取得 clock，檢查 CAS/domain，生成 ID/facts/effects。成功提交 repository.accept，交易內先核對競爭的 operation binding，再 CAS；state、children、原文、history、event、receipt 全部或皆無。兩個不同 operation 同 revision 競爭，一個接受，另一個 definitive CAS rejection；不同 task 不因此覆寫彼此。
5. 已通過形狀/身分檢查、可持久記錄的確定 domain/CAS 拒絕以 repository.reject 保存原 digest 的 rejected receipt。reject 與 accept 在同 operation key 序列化，不能產生矛盾結果。unavailable/unsupported 不在核心 domain catch 內記為 definitive rejection；load 失敗/不完整亦不宣稱持久拒絕。
6. accept/reject 回傳未知或 driver exception 時，application 查原 operation；查得原 definitive 結果就回原 receipt；否則 storage_unavailable。不存在只表示 unknown，不表示從未寫入。client 保留 ID 及原請求查詢／重試；確認拒絕後，讀回協調，改內容用新 ID。operation outcomes 隨 workflow 保留，沒有清除／重用 ID 命令。

accepted receipt required：`accepted=true,service_contract_version,schema_version,workflow_ref,operation_id,request_digest,before_revision,revision,actor,accepted_at,effects`；effects 元素含 kind/id/revision。rejected receipt required：`accepted=false` 加同版本/ref/operation/digest/actor、`expected_revision,current_revision\|null,recorded_at,failure:{error,category,details}`。Event 含版本/ref/operation/revision/actor/occurred_at/name/effects；event 與 receipt 的責任不同，receipt 不表示產品核准。

核心使用事件名稱 WorkflowCreated、WorkflowStarted、WorkflowPaused、WorkflowResumed、WorkflowCancelled、WorkflowCompleted、PlanRevised、DocumentAppended、TaskClaimed、TaskProgressRecorded、TaskReleased、TaskBlocked、TaskUnblocked、TaskCompleted、TaskCancelled、DecisionOpened、DecisionRecorded、HandoffRecorded、CheckpointAppended。每個新命令接受一次，重送讀回不新增事件。

## 19 種命令

### UC-01 workflow.create

Actor 是有 read/plan 的可信呼叫者。payload=`title,goal,scope,skill,external_work_refs`；title≤160、goal≤4000、skill `{id,version\|null}`、external_work_refs≤30。ref 不存在、expected_revision=0。建立 draft/revision 1，plan/result/latest_handoff=null、tasks/decisions/document_heads 空、requirements/dispositions 空，保存建立及更新時間。允許先沒有 plan/tasks；不得覆蓋既有 ref（workflow_exists）；external refs 不被當成外部已更新或已讀取的證據。驗證期待：可引用多個 PBI 且 unresolved 保留（V01），source/legacy 同 ID 不 fallback（R06/V12）。

### UC-02 plan.revise

payload=`plan,execution_impact,task_changes,unaffected_task_ids,decision_dispositions,completion_requirements,requirement_dispositions`，全部 required。plan 是 DocumentWrite；impact=`none\|declared`；task change 是 add(definition) 或 replace(definition,expected_definition_revision)。workflow 非終態、read/plan，必要時另要 decide/change_scope。

先核對 changed/unaffected 不重複、不交集，每個未終態 task 恰好處置一次，unaffected 只引用現有非終態 task。none 要 changes/dispositions 空且交付清單及範圍處置完全相同。保存 plan 新 revision，其 role 固定；全部新／replace definitions 的 plan_basis 精確等於新 plan ref。add ID 不存在；replace 存在、非終態、無有效 assignment、definition revision 相符。保存 definition 新 revision；未受影響 task 及其 plan basis 不動。

文件/decision/input refs 存在；改掉 decision basis 文件須明示 disposition，移除 decision_ids 關聯須 waive。decision dispositions 不重複、expected_decision_revision 正確、basis 存在；reconsider→pending 新版本，carry_forward 要原 decided 且合法決定者、保留 value，waive 要合法決定者/value=null；全部保存新 decision history。既有 CompletionRequirement 完整保留，IDs 去重，新增引用存在且至少一個 task/document；任何 disposition 清單改變要 change_scope；follow_up 非 null。存在 tasks 時要非空交付清單。最後驗證完整 DAG、limits/header 預算。任一步失敗整筆不接受。

特有拒絕：invalid_task_changes、missing_task_disposition、undeclared_execution_change、invalid_plan_basis、task_exists/task_not_found、terminal_task、active_assignment、definition_conflict、decision_disposition_required、decision_revision_conflict、decision_actor_mismatch、decision_required、invalid_requirements、requirement_history_required、missing_follow_up、document_revision_conflict、document_role_conflict、revision_not_found、invalid_dependency/dependency_cycle、limit_exceeded。R03/B06–B08/V06/V17/V18 需驗證原 plan/tasks/decision 全部保留；V21 禁止截斷狀態驗證。

### UC-03 document.append

payload=`document,purpose`；purpose=`supporting\|result`，document `{document_id,expected_document_revision,content}`。read/plan；允許終態附加。expected document revision 匹配 head（首次0），purpose 不能改，content≤256000 UTF-8 bytes。由原文計 hash，追加 revision+1 history、更新 head；不改目前 plan、不改 task lifecycle。拒絕 document_revision_conflict、document_role_conflict、limit_exceeded。指定原文 hash 與 CRLF/LF 可重現；document 不是任意狀態 patch。

### UC-04 workflow.start

payload=`{}`；read/manage。draft、plan 非 null 且至少一個 ready task；ready 定義見領域 CD-03。成功 active，不建立 assignment。拒絕 illegal_transition/no_ready_task。R01/B01/V16：draft 已可 ready，避免 active/readiness 循環。

### UC-05 workflow.pause

payload=`reason`（1–4000 非空白）；read/manage。active→paused，保存 pause_reason。新 claim 禁止，現有 assignment 保留並可回報。其他狀態 illegal_transition。R05/B11/V19：不宣稱外部程序已停止。

### UC-06 workflow.resume

payload=`{}`；read/manage。paused→active，移除 pause_reason；不重建/認領 task。其他狀態 illegal_transition。這是 lifecycle 恢復；與 read-only client resume/context 有不同語意。

### UC-07 workflow.complete

payload=`summary,document_refs`；summary≤8000、refs≤32；read/manage。active/paused，至少一個 completed task，所有 tasks completed/cancelled 且無 assignment；requirements 非空。每個未合法處置的要求之 task_refs completed、document_refs 精確存在。無 pending decision 阻擋 closure/任一 task 或被任一 task.definition.decision_ids 引用。payload refs 精確存在。成功 completed/result=`summary,document_refs,actor,completed_at`。

拒絕 illegal_transition/incomplete_tasks/incomplete_requirements/decision_required/revision_not_found。R05/B13/V20：全 cancelled、必要交付取消無處置、無關 completed 不能冒充結案。結案不替外部 PBI 關閉、不代表部署/品質驗收。

### UC-08 workflow.cancel

payload=`reason,remaining`，各≤4000；read/manage。任何非終態 workflow。所有未終態 tasks→cancelled，其有效 assignment 追加 cancelled fact 並失效；已有 completed/cancelled tasks 歷史保持。workflow→cancelled/result reason/remaining/actor/completed_at。遲到回報 terminal_workflow；不證明 external process 已停止。R05/V19。

### UC-09 task.claim

payload=`task_id,expected_definition_revision,session\|null`；read/execute。workflow active、task pending 無 assignment、所有前置 completed、external inputs available 且 observed_at 非 null、無阻擋 pending decision；definition revision 相符。可信 IDs port 產生新 assignment ID，generation+1，綁完整 actor、definition revision、task plan basis/session/started_at；task→in_progress，追加 active assignment history。拒絕 task_not_found、task_not_ready、definition_conflict、duplicate_generated_id/invalid_generated_id（unavailable）。R01/B02–B03/V03–V04/V16：同 task 競爭只有一個有效承接，不同 ready tasks 可在 CAS 協調後並行。

### UC-10 task.progress

payload=`task_id,assignment,summary,evidence`；summary≤8000、evidence≤32；read/execute。active/paused、非終態 task、有效 ref 且原 actor。保存/核對 evidence，progress=`summary,evidence_ids,actor,at`；保留 definition/assignment/status，不改 criteria/scope。拒絕 terminal_task/illegal_transition/assignment_expired/definition_conflict/assignment_actor_mismatch/invalid_evidence/evidence_exists/revision_not_found。R02/V05/V15 的舊 ref 與同 owner 不同 actor 都不能回報。

### UC-11 task.release

payload=`task_id,assignment,handoff`；read 以及 execute 或 manage。active/paused、非終態、有有效 ref；原 actor 或 manage。先驗 artifact document refs，再同次保存 handoff、新 released assignment fact，assignment=null/task=pending。拒絕 ref、actor、文件錯誤；不自動分配。R02/B04/V05：新 claim 是新 generation，舊 assignment 即使最新 workflow revision 仍不能完成。

### UC-12 task.block

payload=`task_id,assignment,reason,handoff`；reason≤4000；與 release 相同身分及有效性。原子 handoff＋blocked assignment fact，task→blocked、assignment=null/block_reason=reason。不可只留 handoff 當已釋出；pause 不阻止此命令。後續 unblock 或 plan 調整不自動 claim。

### UC-13 task.unblock

payload=`task_id,resolution`；resolution≤4000；read/plan。task blocked 且無 assignment、workflow 非終態。保存 unblock_resolution、task→pending；ready 仍重新依 DAG/input/decision 計算。其他狀態 illegal_transition；terminal_task/terminal_workflow 保護終態。

### UC-14 task.complete

payload=`task_id,assignment,result`；read/execute。active/paused、非終態 task、有有效 ref 且原 actor、無 task 阻擋 pending decision。result 的 criterion_results 要對目前全部 criteria 恰好一筆、0-based index 唯一且不缺、不超界、全部 satisfied；結果 artifact 文件版次有效，evidence ID 唯一/不可改寫，每個 criterion evidence_id 均已存在或同命令新增。expected_artifacts 非空要 artifacts 非空。

保存 result，加 definition_revision、plan_basis、actor、completed_at；追加 completed assignment fact，assignment=null/task=completed。前置完成可使下游 ready，沒有自動開始。拒絕 incomplete_criteria/invalid_evidence_reference/missing_required_artifacts、decision_required 及一般 ref/actor 錯誤。R03/B07/V17：無關 P2 只需 workflow CAS 協調，仍按 D1/P1 完成；R05/B11：paused 可完成。結果結構不證明每項自然語言 artifact 或品質已符合。

### UC-15 task.cancel

payload=`task_id,assignment\|null,reason,handoff\|null`，全部 required；read/manage。非終態 task/workflow。有 assignment 時必須同時給當前 ref 與 handoff，核對當前 ref（manage 可代結束）並保存 handoff/ cancelled assignment fact；無 assignment 要 assignment=null。task→cancelled/cancel_reason=reason。無有效 assignment 時 nullable handoff 並不自動保存（目前核心觀察）；需要單獨 handoff.record。

拒絕 terminal_task、handoff_required、assignment_expired、definition_conflict、assignment_actor_mismatch、revision_not_found。R05/B12/V10：取消不使下游 ready；不替必要交付建立範圍處置。

### UC-16 decision.open

payload=`decision_id,question,options,required_decider,blocks,basis`；read/plan。新 ID、blocks task IDs 及 basis 文件存在。創建 revision 1/pending/resolution=null，保存完整 decision fact。question≤4000、options≤16 各≤1000、basis≤32。已有 ID decision_exists。若 task 正執行，新 pending 阻擋可禁止 complete 但仍允許 progress/handoff。不把所有 task 自動變 approval（R03/R06/V09）。

### UC-17 decision.resolve

payload=`decision_id,expected_decision_revision,basis,outcome,value,reason`；read/decide 且符合原 required_decider。revision 及 basis 完整順序相等、當前 pending。outcome=decided 要非空 value、waived 要 null；新 revision+1/status，並記 value/reason/actor/decided_at history。拒絕 decision_not_found/decision_revision_conflict/decision_actor_mismatch/decision_already_resolved；形狀錯誤 invalid_command。Agent 不可自填 human；options 不是現行 value 枚舉限制。R03/B08/V18。

### UC-18 handoff.record

payload=`task_id\|null,handoff`；read/plan，終態可追加。task 非 null 須存在，artifact 文件 refs 存在，server 生成 handoffID，保存 實際 actor、時間及 workflow revision 並更新 latest_handoff_id。不改 task/assignment/decision；next_actor_hint 只是提示。R02/B05/V02/V14：只讀及交辦不等于已認領，unfinished release 必須用 release/block。

### UC-19 checkpoint.append

payload=`observation,next_step,document_refs`；observation≤8000、next_step≤4000、refs≤32；read/plan，終態可追加。指定 refs 存在；server 生成 checkpointID、保存 實際 actor、時間及 workflow revision。保持 task/assignment/decision/workflowstatus。Framework conditional checkpoint 須經明確 adapter 映射，不得塞任意 payload 模擬 task.lifecycle。

## 8 種查詢：契約已固定，核心 handlers 未實作

共通 query envelope=`service_contract_version,schema_version,query,payload`，精確 profile/schema 相等、未知欄位拒絕。Actor/owner 來自可信邊界，read 授權先於私有查詢。下表是期待行為，不能以 DTO 存在宣稱可運行。

| 本地 ID／query | required payload | 結果型別與語意 |
| --- | --- | --- |
| CQ-01 capabilities | store_id,namespace=personal | capabilities 含版本/store/namespace/commands/queries/limits/contract_status；只廣告實際可用能力。未完成新 profile 不得標 implemented |
| CQ-02 workflow.find | store_id,namespace,q,limit,cursor 或 null | find_result items/has_more/cursor；q≤200，limit 1–50；在 owner 指定 store/namespace 有界摘要，不 source/legacy fallback。cursor 綁定 owner/store/query 及列舉基線，過期 snapshot_expired |
| CQ-03 workflow.context | workflow_ref,limit | context 含版本/ref/revision/workflow header/tasks/decisions/handoffs/missing；limit 1–20，同一 revision，完整 header，集合有界分頁 |
| CQ-04 context.page | workflow_ref,section,cursor | section=tasks/decisions/handoffs，返回 context_page，cursor 綁定 owner/store/workflow/section/snapshot/query 位置，不能跨目標或混 revision |
| CQ-05 task.read | workflow_ref,task_id,definition_revision,at_revision | task_record=`workflow_ref,snapshot_revision,summary,definition,result`；精確 snapshot 及 definition 版次；summary 包括 status/revision/dependencies/plan_basis/assignment/ready/claimable/blocking_decision_ids |
| CQ-06 decision.read | workflow_ref,decision_id,decision_revision,at_revision | decision_record=`workflow_ref,snapshot_revision,decision,resolution,options`；返回指定 snapshot 之指定 decision 版次，真實 actor 及 basis，不用最新版本替代 |
| CQ-07 document.read | workflow_ref,document_ref | document=`workflow_ref,ref,content,created_at,actor`；指定 ID/revision/hash 的原文。不存在 not_found（更具體穩定 code 見錯誤目錄），不返回 latest，hash 不符不能假裝完整 |
| CQ-08 operation.get | workflow_ref,operation_id | operation_result accepted/rejected/unknown；先按 已認證 owner、store 與 operation ID 讀原結果，再核對 WorkflowRef。未知不是安全的新操作或 definitive rejection |

context header required=`title,goal,scope,status,plan,skill,external_work_refs,completion_requirements,requirement_dispositions,result`，不截斷。集合 page 含 items/total/has_more/cursor；可以少於 limit 以守64000 bytes，有非空剩餘須有效 cursor；has_more=false 時 cursor=null。單項無法裝入預算要 limit_exceeded，不返回無法前進空頁；missing 明列缺漏，不能當完整。

首個 context 與 page/task/decision 讀須同 snapshot；無法保留 snapshot 要 snapshot_expired，client 丟舊頁並重取，不混新舊。Find 不保證跨 workflow 原子結案或任意時點全站 snapshot。document 指定版本不存在不能替代；client resume=context＋按需版本讀取，讀不到必要資訊保留缺漏後再判斷是否可執行，不自動 claim（R02/R06/B05/B14/V11/V21）。具體游標簽名、排序、expiry/retention 及 query 實現由#5/#6 收斂；不可自行補未知搜索匹配方式。

## 錯誤、驗證期待與範圍限制

Fault 只有 error/category/details，領域無 HTTPstatus。category transport 對應 invalid→422、unauthenticated→401、forbidden→403、not_found→404、conflict→409、limit_exceeded→413、unsupported→501、unavailable→503；MCP 工具 isError=true 保留 code/details，認證挑戰及 JSON-RPC 錯誤由 transport 處理。新 profile 錯誤 body=`{error,category,details}`；舊人工 errorbody 語意保持其獨立契約。

穩定錯誤目錄至少有 invalid_command/invalid_json/unsupported_profile/unsupported_schema/signin_required/forbidden/not_found/document_not_found/revision_not_found/revision_conflict/definition_conflict/assignment_expired/assignment_actor_mismatch/task_not_ready/decision_required/decision_actor_mismatch/invalid_dependency/dependency_cycle/terminal_workflow/incomplete_requirements/operation_payload_conflict/snapshot_expired/limit_exceeded/storage_unavailable。各 UC 列出的更具體代碼是此 commit 實現觀察；transport 發布時須明確穩定性，不可只以 status 猜重試。未知技術錯誤不能包含 SQL/token/stack。

| 既有規則 | 本規格接受期待 | 所需證據，非本次執行 |
| --- | --- | --- |
| R01／B01–B03 | UC04/09；不同前置已滿足 task 並行，同 task 唯一 assignment | domain/application 競爭＋真實 storage 原子性，V03/V04/V16 |
| R02／B04–B05 | UC11/12/18、CQ03–07；舊 assignment 失敗、resume 無 claim | actor/generation 負例、新 session 接手，V02/V05/V14 |
| R03／B06–B08 | UC02/14/17；active 定義不可改，無關 revision 保留 assignment，decision 改依據需處置 | 原子 plan 拒絕、history 及身分反例，V06/V09/V17/V18 |
| R04／B09–B10 | OP01；相同請求回原 receipt，CAS 衝突不覆寫 | accepted/rejected replay、不同 principal/ref/payload、故障 unknown、真實 rollback，V07/V08 |
| R05／B11–B13 | UC05/07/08/14/15；paused 報告與新 claim 不同，取消不完成交付 | 狀態/範圍/遲到回報，V10/V19/V20 |
| R06／B14 | CQ07 及身分/版本入口；指定版本不 latest fallback | profile/owner/exactdocument/snapshot/不可用，V01/V11–V15/V21 |

本文件完整列出19command、8query，未新增 lease、scheduler、group aggregate、自由 patch、外部 connector 或自動遷移。指定版本 history、operation 結果、snapshot 及 cursor 等必須由未來 adapter 給實證；僅有記憶體 fixture 或 schema 通過不能證明 hosted/真實 client。正式測試 ID 及 setup/oracle 詳見同目錄正式測試規格，須保持 B/V 原 ID 而非用 UC 取代。

正式測試情境、測試層級及驗證責任見 [測試規格索引](tests/README.md)；此連結不表示測試已執行。
