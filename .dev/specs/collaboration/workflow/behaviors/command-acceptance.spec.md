# 共通命令接受規格（OP-01）

## 狀態、來源及解讀方式

本文件為 `spec-author/normalize` 的 production 規格，涵蓋 `workflow-board/collaboration/1` schema `1.0` 全部19 種命令、8 種查詢與接受協定。UC／CQ／OP 編號為第一版規格的局部標籤，本輪保留原 ID。實體定義、值與容量見 [領域實體規格](../entity/workflow.spec.md)。原需求 R01–R06、B01–B14、V01–V21 保持原 ID；本文件不把文件撰寫當作自動化執行證據。

固定程式基線為 `3e7ee13cda8de27c8a069a062ffd0d289584722e`：[README](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/contracts/collaboration-v1/README.md)、[schema](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/contracts/collaboration-v1/schema.json)、[domain](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/domain/collaboration-workflow.mjs)、[application](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/application/collaboration.mjs)、[ports](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/application/collaboration-ports.mjs)。Issue #3 的已完成設計與 #4 契約是意圖來源；上一輪擷取的 Issue 快照見來源清單；本輪未重新判定線上狀態。#3 快照，updatedAt=`2026-10-12T13:28:04Z`。

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

accepted receipt required：`accepted=true,service_contract_version,schema_version,workflow_ref,operation_id,request_digest,before_revision,revision,actor,accepted_at,effects`；effects 元素含 kind/id/revision。rejected receipt required：`accepted=false` 加同版本/ref/operation/digest/actor、`expected_revision,current_revision|null,recorded_at,failure:{error,category,details}`。Event 含版本/ref/operation/revision/actor/occurred_at/name/effects；event 與 receipt 的責任不同，receipt 不表示產品核准。

核心使用事件名稱 WorkflowCreated、WorkflowStarted、WorkflowPaused、WorkflowResumed、WorkflowCancelled、WorkflowCompleted、PlanRevised、DocumentAppended、TaskClaimed、TaskProgressRecorded、TaskReleased、TaskBlocked、TaskUnblocked、TaskCompleted、TaskCancelled、DecisionOpened、DecisionRecorded、HandoffRecorded、CheckpointAppended。每個新命令接受一次，重送讀回不新增事件。


## 共通查詢 envelope 與快照邊界

共通 query envelope=`service_contract_version,schema_version,query,payload`，精確 profile/schema 相等、未知欄位拒絕。Actor/owner 來自可信邊界，read 授權先於私有查詢。各查詢文件描述期待行為，不能以 DTO 存在宣稱可運行。

context header required=`title,goal,scope,status,plan,skill,external_work_refs,completion_requirements,requirement_dispositions,result`，不截斷。集合 page 含 items/total/has_more/cursor；可以少於 limit 以守64000 bytes，有非空剩餘須有效 cursor；has_more=false 時 cursor=null。單項無法裝入預算要 limit_exceeded，不返回無法前進空頁；missing 明列缺漏，不能當完整。

首個 context 與 page/task/decision 讀須同 snapshot；無法保留 snapshot 要 snapshot_expired，client 丟舊頁並重取，不混新舊。Find 不保證跨 workflow 原子結案或任意時點全站 snapshot。document 指定版本不存在不能替代；client resume=context＋按需版本讀取，讀不到必要資訊保留缺漏後再判斷是否可執行，不自動 claim（R02/R06/B05/B14/V11/V21）。具體游標簽名、排序、expiry/retention 及 query 實現由#5/#6 收斂；不可自行補未知搜索匹配方式。

## 錯誤、驗證期待與範圍限制

Fault 只有 error/category/details，領域無 HTTP status。category transport 對應 invalid→422、unauthenticated→401、forbidden→403、not_found→404、conflict→409、limit_exceeded→413、unsupported→501、unavailable→503；MCP 工具 isError=true 保留 code/details，認證挑戰及 JSON-RPC 錯誤由 transport 處理。新 profile 錯誤 body=`{error,category,details}`；舊人工 error body 語意保持其獨立契約。

穩定錯誤目錄至少有 invalid_command/invalid_json/unsupported_profile/unsupported_schema/signin_required/forbidden/not_found/document_not_found/revision_not_found/revision_conflict/definition_conflict/assignment_expired/assignment_actor_mismatch/task_not_ready/decision_required/decision_actor_mismatch/invalid_dependency/dependency_cycle/terminal_workflow/incomplete_requirements/operation_payload_conflict/snapshot_expired/limit_exceeded/storage_unavailable。各 UC 列出的更具體代碼是此 commit 實現觀察；transport 發布時須明確穩定性，不可只以 status 猜重試。未知技術錯誤不能包含 SQL/token/stack。

| 既有規則 | 本規格接受期待 | 所需證據，非本次執行 |
| --- | --- | --- |
| R01／B01–B03 | UC04/09；不同前置已滿足 task 並行，同 task 唯一 assignment | domain/application 競爭＋真實 storage 原子性，V03/V04/V16 |
| R02／B04–B05 | UC11/12/18、CQ03–07；舊 assignment 失敗、resume 無 claim | actor/generation 負例、新 session 接手，V02/V05/V14 |
| R03／B06–B08 | UC02/14/17；active 定義不可改，無關 revision 保留 assignment，decision 改依據需處置 | 原子 plan 拒絕、history 及身分反例，V06/V09/V17/V18 |
| R04／B09–B10 | OP01；相同請求回原 receipt，CAS 衝突不覆寫 | accepted/rejected replay、不同 principal/ref/payload、故障 unknown、真實 rollback，V07/V08 |
| R05／B11–B13 | UC05/07/08/14/15；paused 報告與新 claim 不同，取消不完成交付 | 狀態/範圍/遲到回報，V10/V19/V20 |
| R06／B14 | CQ07 及身分/版本入口；指定版本不 latest fallback | profile/owner/exactdocument/snapshot/不可用，V01/V11–V15/V21 |

本文件提供 19 種 command 與 8 種 query 共用的接受／讀取邊界，各用例由獨立 production 文件定義；未新增 lease、scheduler、group aggregate、自由 patch、外部 connector 或自動遷移。指定版本 history、operation 結果、snapshot 及 cursor 等必須由未來 adapter 提供實證；僅有記憶體 fixture 或 schema 通過不能證明 hosted/真實 client。正式測試 ID 及 setup/oracle 詳見測試規格索引中的正式測試規格，須保持 B/V 原 ID 而非用 UC 取代。

正式測試情境、測試層級及驗證責任見 [測試規格索引](../../../tests/README.md)；此連結不表示測試已執行。


## 容量與錯誤分類（GAP-17，2026-10-17 已決定）

歷史差異：契約 README 曾對超限概括要求 `limit_exceeded`，application 則先驗證 schema。2026-10-17 使用者明確採用下列區分，本節取代原「待 owner 收斂」狀態，其他基線描述保留為歷史來源：

- 單次請求不符合 schema（包括 maxItems／maxLength）→ `invalid_command`／category `invalid`。例如單命令 `task_changes=101`、`decision_dispositions=101` 或單 task `dependencies=33`。
- 請求形狀合法，但 aggregate 累積容量或 UTF-8 bytes 超限 → `limit_exceeded`／category `limit_exceeded`。例如目前已有 100 tasks，再以合法的一筆 add 增加第 101 項；字元長度合法的文件原文超過 256000 UTF-8 bytes。
- HTTP 映射分別為 422／413；MCP 業務錯誤保留 error／category／details 並標示 isError。Schema 拒絕在 application 接受前發生；能保存的 domain 容量拒絕仍依 OP-01 保留 rejected receipt。拒絕不改 workflow、文件或 domain facts。
- 原始 request bytes 可在 transport 解析／schema 驗證前拒絕。同時違反多項限制時不保證固定錯誤優先順序；驗證每個情境須隔離其預期原因。

此決定收斂規格語意，不自行構成測試通過；來源與 bundled Worker 的執行結果另行記錄。

## 技術 binding 與開放決策

現行 JavaScript ESM、JSON Schema validator、嚴格 JSON parser 及 HTTP／MCP mapper 是技術 binding。Domain Fault 不持有 HTTP status；新 production repository、身分及 query handlers 尚未接入。讀完整 invariant state、原子 accept/reject 及 clock／ID 注入是 port 責任，不能以 HTTP handler 重複領域規則。credential lifecycle、cursor 保留／簽名、storage transaction 與真實故障恢復證據由 #5／#6 承接；沒有新增固定 TTL 或跨 workflow 交易保證。
