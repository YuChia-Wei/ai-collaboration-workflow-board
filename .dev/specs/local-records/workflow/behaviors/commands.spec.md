# Local 九種受控紀錄命令

## Context and sources

- Type：`production`；operation：`spec-author normalize`。
- Status/version：2026-10-13 正規化草案 v2；整理既有內容，沒有新增產品政策或核准。
- Owner/context：Local workflow-record application。
- Scope：九種明列子契約；共用授權/receipt/CAS/完整aggregate驗證。
- 文件搬移基線：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；行為來源基線：`3e7ee13cda8de27c8a069a062ffd0d289584722e`（src 未變）。
- Source authority：GitHub Issues／Projects、ARCHITECTURE.md、PLATFORM-CONTRACT.md 與 relevant src README 保持各自權威。程式推導屬來源觀察，不等於產品意圖已核准。
- IDs：保留舊 EB／BA／LP 規則 ID；BH/LR 是本次編輯的命令子契約標號，不是新來源需求或測試 ID。本次不改正式測試 ID，不執行產品測試或宣稱 hosted capabilities。

## Behavior contract

`LP-01`：bindings 為 token→`{principal,namespaces:{namespace:[roles]}}`。ROLES=`read/write/approve/export`，各 permission 必須個別存在；write 不自動 imply read/export/approve。Token 缺 binding→401 unauthenticated；namespace 沒有該 role→403 forbidden。Read/context/document/event/blob/operation 需 read，command 除 approve 都需 write，approve 需 approve，export 需 export。Binding 檔與 token 不寫 tracked source、browser storage 或 export。這是 local synthetic bearer binding，不是生產 login。

Command envelope：`namespace/workflow_id/operation_id/expected_revision/type/payload`，optional `client/session`（缺則 unknown）；namespace/operation ID 非空 string，client/session 為 nonblank text。expected_revision 是 type=int 且≥0，bool 拒絕。payload object，type 僅九種 command。Principal 來自 binding；client/session 自報，不供授權或 Agent identity。

`LP-02`：operation identity 為 namespace+operation_id。先驗證 principal/command permission，再在 write transaction 查 accepted receipt；相同 principal 且完整 command canonical hash 相同→回原 receipt，不重新 CAS。不同 principal/payload→409 idempotency_payload_mismatch。新命令全 workflow revision CAS；子 step/document 不獨立 CAS，不自動改 revision 重播。create expected=0 且 workflow ID 未存在；現況 has_workflow 按 ID 全 store 判重，不僅 namespace。

成功 result 精確欄位：`accepted:true,operation_id,workflow_id,revision,event_seq,payload_hash,principal`。接受後 workflow revision+1，event before/after 連續且綁定 command/operation/principal/client/session/identity_source/time；blob bytes、aggregate、event、receipt 同交易，任一步失敗全部 rollback。Rejected 命令沒有接受 receipt/event。receipt query 404 不必然證明網路失敗前未寫入，須以原 operation reconciliation 處理。

### 共同接受契約


### LR-01：create_workflow

- Type：production 子契約；同一 profile 的命令家族，共用 envelope、授權、CAS 與候選驗證。
- Actor/trigger：有權呼叫者提交 `create_workflow`。
- Inputs / preconditions：title,goal,authorized_scope,source,policy_version,template_version,next_step,next_owner 必須在 payload；optional required_documents/legacy_mapping/external_links/limitations
- Main behavior / outputs / postconditions / failures：建立 planned、空子集合，revision1；missing_field/invalid_workflow_field/invalid_source_provenance；exists→409 already_exists
- State effects：按該命令更新 Workflow candidate；共同驗證或交易失敗不部分接受。

### LR-02：update_workflow

- Type：production 子契約；同一 profile 的命令家族，共用 envelope、授權、CAS 與候選驗證。
- Actor/trigger：有權呼叫者提交 `update_workflow`。
- Inputs / preconditions：僅 next_step,next_owner,limitations,required_documents,blockers,status
- Main behavior / outputs / postconditions / failures：檢查 status 邊與全 candidate；invalid_workflow_fields/illegal_transition
- State effects：按該命令更新 Workflow candidate；共同驗證或交易失敗不部分接受。

### LR-03：add_step

- Type：production 子契約；同一 profile 的命令家族，共用 envelope、授權、CAS 與候選驗證。
- Actor/trigger：有權呼叫者提交 `add_step`。
- Inputs / preconditions：unique string id，order,owner_skill,title
- Main behavior / outputs / postconditions / failures：加 planned step、空 blockers/evidence、result null；invalid_or_duplicate_step/missing_step_fields/invalid_step_fields
- State effects：按該命令更新 Workflow candidate；共同驗證或交易失敗不部分接受。

### LR-04：update_step

- Type：production 子契約；同一 profile 的命令家族，共用 envelope、授權、CAS 與候選驗證。
- Actor/trigger：有權呼叫者提交 `update_step`。
- Inputs / preconditions：僅 id,status,blockers,result,evidence_ids；step 存在
- Main behavior / outputs / postconditions / failures：合法 lifecycle + merged invariant；step_not_found/invalid_step_fields/illegal_transition/missing_required_evidence
- State effects：按該命令更新 Workflow candidate；共同驗證或交易失敗不部分接受。

### LR-05：document

- Type：production 子契約；同一 profile 的命令家族，共用 envelope、授權、CAS 與候選驗證。
- Actor/trigger：有權呼叫者提交 `document`。
- Inputs / preconditions：id/action=create,revise,rename,archive；create optional name/kind/step_id/required，step_id若有需存在
- Main behavior / outputs / postconditions / failures：文件版本規則見 [Document lifecycle](../entity/workflow.spec.md#document-lifecycle)；missing_document_id/invalid_document_action/document_exists/document_not_found
- State effects：按該命令更新 Workflow candidate；共同驗證或交易失敗不部分接受。

### LR-06：log

- Type：production 子契約；同一 profile 的命令家族，共用 envelope、授權、CAS 與候選驗證。
- Actor/trigger：有權呼叫者提交 `log`。
- Inputs / preconditions：text 為 string，最終 aggregate validator 要 nonblank
- Main behavior / outputs / postconditions / failures：追加 payload+at；missing_log/invalid_logs
- State effects：按該命令更新 Workflow candidate；共同驗證或交易失敗不部分接受。

### LR-07：handoff

- Type：production 子契約；同一 profile 的命令家族，共用 envelope、授權、CAS 與候選驗證。
- Actor/trigger：有權呼叫者提交 `handoff`。
- Inputs / preconditions：next_step,next_owner,blockers,failures,limitations 都存在且類型/文字合規
- Main behavior / outputs / postconditions / failures：追加 handoff+at，更新 workflow next fields；incomplete_handoff/invalid_handoff
- State effects：按該命令更新 Workflow candidate；共同驗證或交易失敗不部分接受。

### LR-08：evidence

- Type：production 子契約；同一 profile 的命令家族，共用 envelope、授權、CAS 與候選驗證。
- Actor/trigger：有權呼叫者提交 `evidence`。
- Inputs / preconditions：[LP-04 的 provenance/environment](../entity/workflow.spec.md#identity-and-structure)，optional blob_base64
- Main behavior / outputs / postconditions / failures：immutable evidence+blob bytes，同交易；invalid_blob/blob_too_large/invalid_or_duplicate_evidence
- State effects：按該命令更新 Workflow candidate；共同驗證或交易失敗不部分接受。

### LR-09：approve

- Type：production 子契約；同一 profile 的命令家族，共用 envelope、授權、CAS 與候選驗證。
- Actor/trigger：有權呼叫者提交 `approve`。
- Inputs / preconditions：document_id 存在、最新 revision final、principal 從未為該 workflow authored document event
- Main behavior / outputs / postconditions / failures：append approval `{document_id,revision,principal,at}`；document_not_found/not_final/403 independent_approval_required
- State effects：按該命令更新 Workflow candidate；共同驗證或交易失敗不部分接受。

局部 reducers 的 payload whitelist 不是全 commands 統一 strict closed schema：create/add_step/log/handoff 等保留來源可接受欄位，不自行新增拒絕規則。最終 candidate validator 是共同 gate。Unsupported ACL/publish/SQL/provider command→403 unsupported_command。

## Rules and state effects

`LP-05`：獨立 approval 採保守 workflow-wide authorship：曾為該 workflow authored document event 的 principal 都不能 approve，即使不是當前文件作者。Approval 指向精確 final revision；後續 successor 不改原 approval 指向。歷史 approval 在 preflight 檢查其 final reference、principal/role 與 replay admission；當前 token 不從歷史角色授權。

## Technical binding

Python canonical command digest、SQLite BEGIN IMMEDIATE acceptance 與事件序號見 [Local adapter](../../adapters/clients-and-storage.spec.md)；狀態／文件不變量見 [Workflow entity](../entity/workflow.spec.md)；HTTP status 是 adapter mapping。

## Verification expectations

LP-01/02/05：same ID/hash/principal、permission-before-replay、CAS、完整candidate、rollback、不變身份。每個子契約均有輸入/前置/輸出/失敗。 本次僅文件正規化與來源/內容核對；不是 scenario 執行結果。

## Assumptions, conflicts and open decisions

不是所有payload都closed schema；保留來源acceptedfields，不能因normalize增加policy。

## Source bindings and coverage limits

src/local/application/workflows.py；src/local/domain/{workflow,validation,serialization}.py；src/local/application/ports.py。 Source path 以 repository root 或該段明示的 src/board/backend、src/local 基底解析；全部綁定行為來源 commit。歷史測試與 provider 證據仍只適用各自 immutable subject；本次沒有重新認證。
