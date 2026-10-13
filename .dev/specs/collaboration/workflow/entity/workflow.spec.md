# Workflow 聚合實體規格

## 文件定位與來源

本文件是 `spec-author/normalize` 的 entity 規格，涵蓋 `workflow-board/collaboration/1`、訊息 schema `1.0`。CD 編號是本文件新增的草稿標籤，不取代 Issue 原有 B01–B14、R01–R06 或 V01–V21。文件整理已存在的產品契約及程式觀察，不代表新增架構已核准、服務已部署或測試已執行。

固定來源 commit：`3e7ee13cda8de27c8a069a062ffd0d289584722e`。以下連結皆綁定該版本：

- [ARCHITECTURE.md](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/ARCHITECTURE.md)：Workflow 聚合及 profile 邊界。
- [協作契約 README](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/contracts/collaboration-v1/README.md)：版本、容量、命令、查詢及接受協定。
- [schema.json](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/contracts/collaboration-v1/schema.json)：所有 wire 欄位、required、nullable、enum 及長度的精確來源。
- [domain reducer](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/domain/collaboration-workflow.mjs)、[值編碼](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/domain/collaboration-values.mjs)：觀察到的記憶體模型與規則。
- [協作 ports](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/application/collaboration-ports.mjs)：完整命令狀態與不可變歷史要求。
- 工作權威：[Issue #2](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/2)、[#3](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/3)、[#4](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/4)。Issue 是可變來源，讀取證據及原 ID 對照見專案規格索引；程式不能自行取代 owner 的需求決定。

新協作 domain reducers 與命令 application 已存在。可信 Agent 身分、production repository、query snapshots、HTTP/MCP transport 與 Web UI 尚未接入。人工 `framework-board/1`、legacy、source snapshot、Python local 使用自己的模型；本規格不把它們的同名 task、revision 或 receipt 當成此 domain 的實作。


類型：entity；模型種類：Workflow aggregate root；所屬：Workflow 協作 context；草案 v1。此次 normalize 使用專案選定目錄與 prose template，沒有新增獨立 aggregate 或持久化決策。

## 身分與結構

### CD-01 聚合、識別及值

Workflow 是聚合根，Task、Decision、目前 assignment、必要交付及 plan 版本在同一接受點維護。Document、TaskDefinition、DecisionRevision、Assignment lifecycle facts、Handoff、Checkpoint、Evidence 是同次交易寫出的歷史資料；它們具有引用與歷史身分，不因此成為各自可獨立修改的聚合。

| 值／身分 | 精確結構及語意 | 約束 |
| --- | --- | --- |
| WorkflowRef | `store_id, namespace, record_kind, workflow_id` | namespace=`personal`、record_kind=`collaboration`；store_id 為穩定邏輯 store，不能以任意 URL 替換；owner 身分由可信邊界提供 |
| ActorRef | `subject_id, kind, binding_id` | kind=`human\|agent`；binding 是穩定委派關係，不是 token；完整值比較識別承接者 |
| SessionRef | `label, client, skill_id` | 描述性資訊；assignment session 可 null；不建立 actor 身分 |
| DocumentRevisionRef | `document_id, revision, content_hash` | revision>0；hash=`sha256:` 加 64 位小寫 hex；其完整身分還含外層 WorkflowRef |
| AssignmentRef | `assignment_id, generation, definition_revision` | 三者必須與有效承接完全匹配；ID 不是權限憑證 |
| Scope | `included[], excluded[]` | 字串清單；workflow 原 scope 建立後固定，task 有自己的 scope 描述 |
| ExternalRef | `original, provider, scope, work_id, url, observed_at, source_version, availability` | 除 original/availability 外可 null；url 非 null 為 HTTPS；availability=`available\|partial\|unresolved`；不得推定外部資料已擷取或已授權 |
| InputRef | `{kind:document,ref:DocumentRevisionRef}` 或 `{kind:external,ref:ExternalRef}` | 文件須在同 workflow 指定版本存在；external 在 ready 判定需 available 且 observed_at 非 null |

所有 ID 為大小寫有別的 1–160 ASCII 字元，首字英數，其後英數／`.`／`_`／`-`；保留 `constructor`、`prototype`、`__proto__`。Revision 是 0–9007199254740991 的安全整數；workflow create 的 expected revision=0，其餘 >0。遞增超界以 limit_exceeded 拒絕。Timestamp 為 Gregorian 年 0001–9999、UTC 固定毫秒格式，須驗證實際日期。

Unicode 原文不做 NFC、大小寫、換行或空白正規化；孤立 surrogate 拒絕。required 欄位不可省略，null 與空字串不等價。Wire 使用安全十進位整數 token，拒絕 -0、小數、exponent、重複 key、未知欄位。這些是編碼及 schema 邊界，不能以 reducer 假設已驗證取代入口驗證。

### CD-02 Workflow 狀態

| 欄位 | 內容與來源 |
| --- | --- |
| workflow_ref、revision | 聚合識別及每次接受後的 workflow revision |
| title、goal、scope、skill、external_work_refs | create 輸入；skill=`{id,version}`，version 可 null；首版建立後固定 |
| status | `draft\|active\|paused\|completed\|cancelled` |
| plan | null 或目前 DocumentRevisionRef；只由 plan.revise 改變 |
| tasks、decisions、document_heads | 以 ID 建索引的完整命令狀態；document head 保存 ref、purpose |
| completion_requirements、requirement_dispositions | 必要交付原定義及明示範圍處置 |
| latest_handoff_id | 最新交辦的 ID 或 null，沒有 assignment 釋出語意 |
| created_at、updated_at | 可信 clock；每次接受更新 updated_at |
| result | null、completed summary/document_refs/actor/completed_at，或 cancelled reason/remaining/actor/completed_at |
| pause_reason | pause 時的理由；resume 移除；內部表示不直接等於 context header DTO |

create 成功從不存在建立 draft，接受後 revision=1。draft→active 需要目前 plan 及至少一個 ready task。active→paused 阻止新 claim；已承接仍可 progress、release、block、complete。paused→active 不自動 claim。active/paused→completed 要符合 CD-08。所有非終態可 cancel，保留原因及剩餘工作；所有未終態 tasks 轉 cancelled，有效 assignment 結束。completed/cancelled 禁止 lifecycle、task、plan、decision 變更，仍允許 document.append、handoff.record、checkpoint.append，並照常增加 workflow revision。取消是記錄轉移，不是外部程序停止的證據。

### CD-03 Task 與定義版本

Task 身分是外層 workflow 加 task ID。TaskDefinition 的 required 欄位是 `id,title,description,scope,completion_criteria,dependencies,plan_basis,inputs,expected_artifacts,decision_ids,workstream`。title≤160、description≤8000；completion criteria 1–32 個，每項≤1000；dependencies 最多32 且去重，inputs/expected_artifacts/decision_ids 最多32，decision_ids 去重；workstream 為 null 或≤160 字串。非空文字須符合 schema 的非空白條件。

內部 Task 包含 `id,definition,definition_revision,status,generation,assignment,result,progress`，以及命令寫入的 block_reason、unblock_resolution、cancel_reason。新 task definition_revision=1、generation=0、status=pending、assignment/result/progress=null。replace 遞增定義版本；保留原 status/generation/progress、assignment=null/result=null；completed/cancelled 不可 replace，有 active assignment 不可 replace。每版定義以 fact 留存。

| 目前狀態 | 允許變化 | 必要條件 |
| --- | --- | --- |
| pending | claim→in_progress、cancel→cancelled、plan replace 保留 pending | claim 要 CD-04 的 ready 及 active workflow |
| in_progress | progress 保留、release→pending、block→blocked、complete→completed、cancel→cancelled | 有效 AssignmentRef；actor/能力符合命令；釋出／阻擋／取消保存 handoff |
| blocked | unblock→pending、cancel→cancelled、plan replace 保留 blocked | unblock 要 resolution 且無 assignment；不自動 claim |
| completed/cancelled | 無 task 狀態變更 | terminal_task 拒絕 |

task status=in_progress 當且僅當有效 assignment 非 null。cancelled dependency 不等於 completed。所有 task 的 dependencies 必須同 workflow 存在、不可自指、整張 DAG 無循環；單 task 最多32 dependencies。ready 不依賴 workflow active；claimable=ready 且 workflow active。這使 draft 可判斷 ready 以啟動，又使 paused 明確不可認領。

### CD-04 Assignment 與並行

Assignment 包含 `ref, actor, plan_basis, session, started_at`；ref 由可信 ID port 產生 assignment_id、Task generation+1、當時 definition_revision。它綁定 claim 當時的完整 actor 與 task 的 plan basis；其他 task 的修改或 workflow revision 增加不自行使 assignment 失效。workflow CAS 仍要求每個新 command 用目前 expected_revision。

有效性逐項檢查 assignment_id/generation、definition_revision、actor。錯誤依序可能是 assignment_expired、definition_conflict、assignment_actor_mismatch；同 owner 不足以回報另一 actor 的 assignment。release/block 可由 manage 操作者代為執行，記錄實際 ended_by；complete/progress 必須原 actor。task.cancel 需 manage，有有效 assignment 時仍以原 actor 或 manage 的授權方式核對指定 ref；無 assignment 要 payload.assignment=null。

claim 與終止都追加 immutable assignment fact，包含 task_id、status（active/released/blocked/completed/cancelled）、ended_at、ended_by、workflow_revision；結束不是覆寫 claim fact。重新 claim 得到新 ID 與 generation；舊 ref 即使碰巧使用最新 workflow revision 仍失效。ID port 必須提供新鮮且不可重用的歷史 ID；reducer 檢查格式及目前 active assignment 重複，但完整歷史碰撞保證仍是 port 的責任。

### CD-05 Document、Plan、修訂影響

Document 是不可變 revision 原文：`workflow_ref,ref,content,created_at,actor`。DocumentWrite=`document_id,expected_document_revision,content`；不存在要 expected_document_revision=0，存在要匹配 head，產生 revision+1。content_hash 由原文 UTF-8 bytes 算出，非 client 自填；CRLF/LF 得不同 hash。purpose=`plan|supporting|result` 首次建立後不可改。

plan.revise 的新 plan 本身也是新增文件版次，與 tasks/decisions/requirements 同次接受；新／replace task 的 plan_basis 必須精確等於這份新 ref。unaffected task 保留舊 plan basis。所有未終態 task 必須在 task_changes 或 unaffected_task_ids 恰好出現一次，兩者不可交集。不可刪除 task 歷史；取消走 task.cancel。

execution_impact=none 要 task_changes、decision_dispositions 皆空，completion_requirements 與 requirement_dispositions 完全相同。declared 表示呼叫者明示影響；服務驗證版本、引用與授權，不宣稱理解自然語言 diff。replace 改掉既有 decision 所依據的 task 文件時，須明示該 decision disposition；移除 task.decision_ids 中關聯則須 waive，不可透過移除引用解除阻擋。

### CD-06 Decision 與版本沿用

Decision 的 `id,revision,question,options,required_decider,blocks,basis,status,resolution` 中，blocks=`{task_ids[],workflow_closure}`，basis 是指定文件 refs，required_decider=`{kind:human}` 或 `{kind:subject,subject_id}`。open 建 revision=1/status=pending/resolution=null；引用 task 與文件須存在。pending 且 blocks.task_ids 包含 task 或 task.decision_ids 引用 decision，皆阻擋該 task；新增同名或其他問題不能消除原 pending decision。

resolve 要 decision revision 及 basis 陣列完全相等（包含順序），pending 及 decide 能力；human 要可信 human actor，subject 要指定 subject_id。decided 要非空 value，waived value=null；記 reason、actor、decided_at，新 revision+1。options 是上下文提示，現行 schema/reducer 不限制 value 必須是 options 成員。

plan disposition 包含 decision_id、expected_decision_revision、action、basis、reason。reconsider→新 pending revision/resolution=null；carry_forward 要先前 decided，保留原 value，產生新 decided revision 並記目前 actor/reason/time；waive→新 waived revision/value=null。carry_forward/waive 均須符合原 required_decider；reconsider 由 plan 授權路徑執行。每版 decision 追加 fact，不覆寫歷史決定。

### CD-07 Evidence、Result、Handoff、Checkpoint

Evidence=`id,summary,outcome,observed_at,artifact_refs,limitations`；outcome=`passed|failed|blocked|interrupted|not_run`，observed_at 可 null。同命令 evidence IDs 不重複；既有 ID 只能提交完全相同值，否則 evidence_exists。文件 artifacts 精確查版本。外部 artifacts 的存在及品質不由結構檢查證實。

Task Result=`summary,criterion_results,artifacts,evidence,limitations`；每個 criterion result=`criterion_index,outcome,explanation,evidence_ids`，outcome=`satisfied|not_satisfied|not_evaluated`。complete 必須涵蓋全部目前 definition criteria（0-based index、不重複、不缺漏、全部 satisfied）；所引用 evidence 必須存在或同命令新增。expected_artifacts 非空時 artifacts 必須至少一筆；現行實作未逐項比對每個自然語言 artifact 描述。接受後加 definition_revision/plan_basis/actor/completed_at，保存完成當時依據。Evidence outcome 不會自動推導 criterion satisfaction；成果品質、發布及正式採用不由 task.completed 宣稱。

Handoff=`completed,remaining,next_step,artifact_refs,blockers,limitations,next_actor_hint`。record 產生 server ID，保存 `id,task_id|null,actor,created_at,workflow_revision,handoff`；task.release/block/cancel 可同次保存並結束 assignment，單獨 handoff.record 保留 assignment。next_actor_hint 只是提示，不授予權限。Checkpoint 保存 observation、next_step、document_refs，加 server ID/actor/created_at/workflow_revision；不改 lifecycle。這些歷史可在 workflow 終態追加。

### CD-08 必要交付及結案不變條件

CompletionRequirement=`id,description,task_ids,document_refs`，至少一個 task 或文件引用，皆須存在。原定義須在每次 plan.revise 完整保留；新增要求用新 ID，不能覆寫／刪除舊要求。RequirementDisposition=`requirement_id,kind,reason,follow_up_ref`，kind=`excluded|follow_up`；follow_up 要非 null 可追溯外部 ref。變更處置清單需 change_scope 能力，取消 task reason 不能替代範圍處置。

完成 workflow 要 active/paused、至少一個 completed task、所有 tasks completed/cancelled 且無有效 assignment、必要交付清單非空。每個未處置要求的 task_ids 都 completed、document_refs 精確存在；合法處置保留原定義並表達 excluded/follow_up。任何 pending decision 若阻擋 closure、任何 task 或被 task.decision_ids 引用，皆拒絕 closure。completed result 保存 summary、指定 document refs、實際 actor、完成時間。

### CD-09 容量、歷史與重建約束

request≤300000 UTF-8 bytes；文件≤256000；單筆 metadata≤64000；完整 context header≤16000；context/page response≤64000。每 workflow≤100 tasks、100 decisions；page≤20、find≤50。Schema 字元 maxLength 與 UTF-8 byte 上限都要滿足。命令不可截斷接受，header 必須完整；超界 limit_exceeded。

Workflow revision、TaskDefinitionRevision、DecisionRevision、DocumentRevision、Assignment generation 是不同軸，不可用單一 revision 代替。重建需保存目前完整 invariant state 與上列 immutable facts、event、accepted/rejected receipt；query projections 不可代替命令狀態，缺少歷史也不能拿 latest 填指定版次。

## 驗證期待、差異及待決

正式測試規格應逐項覆蓋身分隔離、DAG、ready/claimable、有效承接、plan 完整處置、決策版本、範圍排除、結案、原文 hash 及 metadata limits；所有通過結論須另附真實執行證據。本文件只做來源對照及文字檢查。

已知邊界：owner/actor credential lifecycle、持久儲存及 cursor/snapshot 保留策略由 #5/#6/#7 承接；目前只有 ports 契約。自然語言 scope 細化是否仍在授權內、成果品質、外部 ref 是否真實可讀、每項 expected artifact 對應均需 owner 或更完整驗證規則，不能假設 reducer 已判斷。

來源衝突不得藉重建解決：Issue 決策優先由 owner 核對，schema 決定 wire 形狀，README 決定接受語意，程式描述目前實作；若各者不同，保持差異，修規格與修程式各自取得授權。命令前後條件及原子接受詳見 [共通命令接受規格](../behaviors/command-acceptance.spec.md)。


## 不變條件追溯

| 原標籤 | 不變條件所在段落 | 無效狀態的結果 |
| --- | --- | --- |
| CD-01 | 識別／值／編碼 | 格式或引用拒絕，不建立其他 profile 紀錄 |
| CD-02 | Workflow 生命週期 | illegal_transition／terminal_workflow |
| CD-03 | 定義及 DAG | definition_conflict／invalid_dependency／dependency_cycle |
| CD-04 | assignment 與 generation | assignment_expired／assignment_actor_mismatch |
| CD-05 | 原文版本及 plan 影響 | document_revision_conflict／active_assignment／invalid_plan_basis |
| CD-06 | decision basis／修訂 | decision_revision_conflict／decision_actor_mismatch |
| CD-07 | 不可改寫成果與證據 | evidence_exists／incomplete_criteria |
| CD-08 | 必要交付及結案 | incomplete_requirements／decision_required |
| CD-09 | 容量及完整命令狀態 | limit_exceeded 或目前 schema 路徑 invalid_command（GAP-17） |

## 生命週期與操作定位

各命令的輸入、前後條件與錯誤位於 behaviors/ 下的 UC-01–UC-19 production 規格；CD-02–CD-08 保留允許轉移及歷史語意。共通接受條件見 [OP-01](../behaviors/command-acceptance.spec.md)。

## 技術 binding 及驗證定位

目前 JavaScript ESM 使用完整記憶體 command state 與不可變 facts；SQL table、API DTO 與記憶體表示不要求相同。[不變條件正式測試規格](../../../tests/collaboration/workflow/invariants.test-spec.md) 和 [命令正式測試規格](../../../tests/collaboration/workflow/commands.test-spec.md) 保留原 R／B／V 及 FT 情境。未執行測試，也不以文件搬移證明 compliance。
