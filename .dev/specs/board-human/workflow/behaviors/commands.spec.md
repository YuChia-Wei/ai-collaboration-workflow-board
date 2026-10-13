# 人工 Board 八種受控命令

## Context and sources

- Type：`production`；operation：`spec-author normalize`。
- Status/version：2026-10-13 正規化草案 v2；整理既有內容，沒有新增產品政策或核准。
- Owner/context：Board 人工 Workflow。
- Scope：八個明列命令子契約，共用接受協定，未增加獨立 child CRUD。
- 文件搬移基線：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；行為來源基線：`3e7ee13cda8de27c8a069a062ffd0d289584722e`（src 未變）。
- Source authority：GitHub Issues／Projects、ARCHITECTURE.md、PLATFORM-CONTRACT.md 與 relevant src README 保持各自權威。程式推導屬來源觀察，不等於產品意圖已核准。
- IDs：保留舊 EB／BA／LP 規則 ID；BH/LR 是本次編輯的命令子契約標號，不是新來源需求或測試 ID。本次不改正式測試 ID，不執行產品測試或宣稱 hosted capabilities。

## Behavior contract

### 共同接受契約

共同 envelope：`service_contract_version`, `workflow_id`, `operation_id`, `expected_revision`, `type`, `payload`。operation ID 為非空文字且至多 160 字元；payload 為 object。整個命令的 UTF-8 bytes ≤300,000。expected revision 為非負整數。payload 未列出的欄位拒絕 `invalid_fields`。成功 receipt：`accepted:true`, `service_contract_version`, `operation_id`, `workflow_id`, `revision`, `principal`, `payload_hash`。

### BH-01：`create_workflow`

- Type：production 子契約；同一 profile 的命令家族，共用 envelope、授權、CAS 與候選驗證。
- Actor/trigger：有權呼叫者提交 `create_workflow`。
- Inputs / preconditions：title, goal, workflow_kind, owner_skill, authorized_scope, next_step, next_owner；optional source/work_items/extensions；ID 尚不存在，expected=0
- Main behavior / outputs / postconditions / failures：建立 [Workflow 初始 aggregate](../entity/workflow.spec.md#identity-and-structure)；revision=1。存在→`workflow_exists`；錯誤 revision→`revision_conflict`
- State effects：按該命令更新 Workflow candidate；共同驗證或交易失敗不部分接受。

### BH-02：`update_workflow`

- Type：production 子契約；同一 profile 的命令家族，共用 envelope、授權、CAS 與候選驗證。
- Actor/trigger：有權呼叫者提交 `update_workflow`。
- Inputs / preconditions：只容許上述 create 可寫欄位
- Main behavior / outputs / postconditions / failures：合併 candidate 後再驗證；更新 updated_at、revision。沒有 status 直接寫入，也不能更換 profile
- State effects：按該命令更新 Workflow candidate；共同驗證或交易失敗不部分接受。

### BH-03：`add_task`

- Type：production 子契約；同一 profile 的命令家族，共用 envelope、授權、CAS 與候選驗證。
- Actor/trigger：有權呼叫者提交 `add_task`。
- Inputs / preconditions：id,title,owner_skill；optional dependencies/extensions；workflow 未 completed
- Main behavior / outputs / postconditions / failures：新 task pending；依賴皆已存在；重複/欄位不完整→`invalid_task`；不合法依賴→`invalid_dependency`
- State effects：按該命令更新 Workflow candidate；共同驗證或交易失敗不部分接受。

### BH-04：`transition`

- Type：production 子契約；同一 profile 的命令家族，共用 envelope、授權、CAS 與候選驗證。
- Actor/trigger：有權呼叫者提交 `transition`。
- Inputs / preconditions：optional task_id/status/result_summary/finding_status/deferred_reason/resume_condition/evidence_ids/next_task_id/workflow_status/workflow_result/workflow_finding_status/next_step/next_owner
- Main behavior / outputs / postconditions / failures：在同一 candidate 更新目前 task、可啟動下一 task、workflow 狀態與交接資訊；整組通過才接受。下段列完整不變量
- State effects：按該命令更新 Workflow candidate；共同驗證或交易失敗不部分接受。

### BH-05：`document`

- Type：production 子契約；同一 profile 的命令家族，共用 envelope、授權、CAS 與候選驗證。
- Actor/trigger：有權呼叫者提交 `document`。
- Inputs / preconditions：id,action；optional name/content/required/final/relation
- Main behavior / outputs / postconditions / failures：action=create/revise/rename/archive；文件與 revision 規則見下段
- State effects：按該命令更新 Workflow candidate；共同驗證或交易失敗不部分接受。

### BH-06：`log`

- Type：production 子契約；同一 profile 的命令家族，共用 envelope、授權、CAS 與候選驗證。
- Actor/trigger：有權呼叫者提交 `log`。
- Inputs / preconditions：text 非空，UTF-8 ≤32,000
- Main behavior / outputs / postconditions / failures：保存 `{text,at}`；entry ID 為 operation ID；`invalid_log`
- State effects：按該命令更新 Workflow candidate；共同驗證或交易失敗不部分接受。

### BH-07：`handoff`

- Type：production 子契約；同一 profile 的命令家族，共用 envelope、授權、CAS 與候選驗證。
- Actor/trigger：有權呼叫者提交 `handoff`。
- Inputs / preconditions：next_step,next_owner 非空；blockers/failures/limitations 都是非空文字元素的 array，可空 array
- Main behavior / outputs / postconditions / failures：保存交接並更新 workflow 的下一步/owner；`invalid_handoff`
- State effects：按該命令更新 Workflow candidate；共同驗證或交易失敗不部分接受。

### BH-08：`evidence`

- Type：production 子契約；同一 profile 的命令家族，共用 envelope、授權、CAS 與候選驗證。
- Actor/trigger：有權呼叫者提交 `evidence`。
- Inputs / preconditions：id 尚不存在、command/result 非空；outcome=`passed/failed/interrupted/blocked/not_run`；environment 為 object；optional source_commit
- Main behavior / outputs / postconditions / failures：保存 observed_at 與原 payload；`invalid_evidence`。人工 Board 未要求 source_commit 非空或 environment 非空，不可把 local 嚴格規則當既有規則
- State effects：按該命令更新 Workflow candidate；共同驗證或交易失敗不部分接受。


## Rules and state effects

`EB-03`：candidate 的所有 task 都要驗證 title、owner_skill、status、evidence_ids；evidence refs 必須存在。Completed task 必須非空 result_summary 且 finding_status 為 `addressed/no_findings`，**沒有必須至少一筆 evidence 的規則**。Deferred task 要非空延期理由與恢復條件。

`EB-04`：workflow in_progress 時恰好一個 in_progress task；其他 workflow status 不得有 in_progress task。啟動 task 的依賴都必須 completed。next_task_id 只可選 pending/deferred task 且依賴完成。可在同一 transition 完成舊 task 並啟動新 task；若只完成唯一 active task 而仍保留 in_progress workflow，拒絕 `exactly_one_active_task`。completed task 不能再 transition；completed workflow 不能 add_task/transition。

`EB-05`：completed workflow 至少一 task、所有 task completed、phase completed/closed、非空 workflow result_summary、finding_status addressed/no_findings、所有 required documents 存在且未 deleted。Deferred workflow 要理由/恢復條件。人工 profile 沒有宣告完整的狀態轉移邊表；nonterminal transition 是否可返回 pending 由上述 candidate invariants 決定，不可擅加 local 的 planned→active 邊規則。完成後仍可有合規文件增補、log、handoff/evidence 或 metadata update，所有命令均重新驗證 terminal 不變量。

`EB-06`：create 不可覆用 ID；name 預設 ID、kind=markdown、required/final 轉為 boolean。create/revise content 必須 string，UTF-8 ≤256,000；可以空字串，不能新增未觀察到的非空規則。每次內容修訂分配連續 revision 從 1 開始、保存 SHA-256(content UTF-8)、final、relation、created_at。原內容不可覆寫。若最新 revision final=true，後續需 `erratum/addendum/successor`；缺少則 `final_requires_successor`。

rename 只變 metadata name，要求非空文字；archive 保存 deleted=true/deleted_at，不刪任何 revision。當 ID 位於 required_documents，一律拒絕 `required_document_archive_forbidden`，所有 lifecycle 相同。已 deleted 文件不允許 revise/rename/archive。查閱 archived 原始 revision 仍是合法讀取；寫拒絕不等於歷史不可讀。

## Technical binding

命令傳输與儲存的 source binding：src/board/backend/application/board.mjs；D1 commit 與 hash/receipt scope 見 board-web/adapters/persistence.spec.md。300,000/256,000/32,000 是觀察到的 UTF-8 bytes admission，而非所有實作語言的字元數。

## Verification expectations

EB-03..06：每種 command 正反例、同時接續 task、原文/terminal 保留；技術接受涵蓋 BA-03/04。 本次僅文件正規化與來源/內容核對；不是 scenario 執行結果。

## Assumptions, conflicts and open decisions

人工狀態未宣告 local 的完整邊表；只保留 candidate invariants。

## Source bindings and coverage limits

src/board/backend/domain/board-workflow.mjs；application/board.mjs；domain/errors.mjs。 Source path 以 repository root 或該段明示的 src/board/backend、src/local 基底解析；全部綁定行為來源 commit。歷史測試與 provider 證據仍只適用各自 immutable subject；本次沒有重新認證。
