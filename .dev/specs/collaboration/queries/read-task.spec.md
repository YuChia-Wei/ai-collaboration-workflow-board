# 讀取指定 Task 定義（CQ-05）

## 背景與來源

- 類型：production（query）；操作：normalize；草案 v1，未新增核准。
- 所屬：Workflow 協作 context 的查詢用例；query `task.read`。
- 狀態：DTO／語意已有契約；新 profile 的 query handler、snapshot／storage 及 transport 尚未實作。

行為來源固定為 `3e7ee13cda8de27c8a069a062ffd0d289584722e`：[契約 README](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/contracts/collaboration-v1/README.md)、[schema](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/contracts/collaboration-v1/schema.json)、[domain reducer](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/domain/collaboration-workflow.mjs)、[application](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/application/collaboration.mjs)、[ports](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/application/collaboration-ports.mjs)。需求權威為 [Issue #3](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/3) 及 [#4](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/4)；原有 R／B／V 編號保持不變。Issue #3 擷取時 updatedAt=`2026-10-12T13:28:04Z`。本次 normalize 僅整理既有規格，沒有新增核准、實作或執行證據。

## 行為契約

- 觸發者：可信身分及 read 能力的呼叫者；身分來自 adapter，不接受 payload 指定 owner／actor。
- 輸入 envelope：`service_contract_version,schema_version,query,payload`，精確版本相等，拒絕未知欄位。
- required payload：`workflow_ref,task_id,definition_revision,at_revision`；所有 required 欄位都須提供；schema 允許 null 時也不得省略。
- 前提：本查詢指定的 owner／store／namespace 或 WorkflowRef 可讀；查詢授權先於私有讀取；必要版本與 cursor 依本用例及共通規格驗證。
- 可觀察輸出／後置條件：以下結果契約；查詢不建立 assignment、不改 task／decision／Workflow lifecycle、不增加命令事件。

## 結果與規則

task_record=`workflow_ref,snapshot_revision,summary,definition,result`；精確 snapshot 及 definition 版次；summary 包括 status/revision/dependencies/plan_basis/assignment/ready/claimable/blocking_decision_ids

所有精確欄位、required、nullable、enum、陣列上限與錯誤形狀以固定 schema 的 query 及 named result definition 為準。
[共通 envelope、容量、錯誤與快照邊界](../workflow/behaviors/command-acceptance.spec.md) 固定完整 context header、同 revision 分頁／點讀及 missing 語意；不得把最新資料當成指定舊版。Find 不宣稱跨 Workflow 原子全站 snapshot。Resume 是 context 加按需指定版本讀取的 client 用例，不自動 claim。

## 拒絕、失敗與操作語意

未認證／未授權拒絕不洩漏他人資料。形狀或版本錯誤不得 fallback 至 human／legacy／source。

指定 task／definition revision 不存在時明確 not_found／revision_not_found；無法保存 at_revision 對應 snapshot 時回 snapshot_expired。不得用目前定義或目前 assignment 代替指定 snapshot 狀態；definition_revision 及 at_revision 都必須為正整數。

## 接受與驗證期待

原來源情境：R03、R06、V11、V17；查詢定位標籤 `FT-Q05`。[查詢正式測試規格](../../tests/collaboration/queries.test-spec.md) 指定 setup、observable oracle 與真實 storage／client 證據；[協定正式測試規格](../../tests/collaboration/protocol.test-spec.md) 補 wire、bytes 與版本。全部是驗證義務，不是執行結果。

## 技術 binding、假設與待決

Wire DTO 使用 JSON Schema 2020-12；application query port 與未來 identity／repository／transport 是技術 binding，不能從 DTO 存在推定 production 可用。具體 credential、cursor 簽名、排序／搜尋匹配、snapshot 保存政策由 #5／#6 收斂；不自行補未決搜索規則或 TTL。能力宣告須以實際 runtime 可用能力為準。GAP-17 的 shape／容量錯誤差異保留在共通規格。
