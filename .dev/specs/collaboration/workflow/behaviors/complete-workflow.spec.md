# 完成 Workflow（UC-07）

## 背景與來源

- 類型：production；操作：normalize；草案 v1，未新增核准。
- 所屬：Workflow 協作 context 的 Workflow 聚合；命令 `workflow.complete`。
- 範圍：一個既有命令的行為契約；不包含 production adapter 交付。

行為來源固定為 `3e7ee13cda8de27c8a069a062ffd0d289584722e`：[契約 README](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/contracts/collaboration-v1/README.md)、[schema](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/contracts/collaboration-v1/schema.json)、[domain reducer](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/domain/collaboration-workflow.mjs)、[application](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/application/collaboration.mjs)、[ports](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/application/collaboration-ports.mjs)。需求權威為 [Issue #3](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/3) 及 [#4](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/4)；原有 R／B／V 編號保持不變。Issue #3 擷取時 updatedAt=`2026-10-12T13:28:04Z`。本次 normalize 僅整理既有規格，沒有新增核准、實作或執行證據。

## 行為契約

- 觸發者：由可信身分邊界提供的呼叫者，能力及目前狀態須符合下列前提。
- 輸入 payload：summary、document_refs；精確 required／nullable／型別／長度依固定 schema。
- 前提：read、manage；active 或 paused；至少一個 completed task，所有 tasks 終態且無 assignment；必要交付及阻擋決策符合規則；並滿足 [共通命令接受規格](command-acceptance.spec.md) 的 envelope、身分、CAS、終態及容量規則。
- 可觀察輸出：成功回 accepted receipt；確定且可持久記錄的拒絕回 rejected receipt。未知結果依 OP-01 協調，不能冒稱拒絕。
- 後置條件：Workflow 成為 completed，保存摘要、文件引用、實際 actor 與時間；成功增加 Workflow revision 一次，狀態、facts、event 與 receipt 原子可見。
- 拒絕／失敗：illegal_transition、incomplete_tasks、incomplete_requirements、decision_required、revision_not_found；一般形狀／身分／CAS 錯誤仍適用。拒絕不留下部分領域效果。

## 規則、狀態效果與替代路徑

payload=`summary,document_refs`；summary≤8000、refs≤32；read/manage。active/paused，至少一個 completed task，所有 tasks completed/cancelled 且無 assignment；requirements 非空。每個未合法處置的要求之 task_ids 所引用的 tasks 均為 completed、document_refs 精確存在。無 pending decision 阻擋 closure/任一 task 或被任一 task.definition.decision_ids 引用。payload refs 精確存在。成功 completed/result=`summary,document_refs,actor,completed_at`。

拒絕 illegal_transition/incomplete_tasks/incomplete_requirements/decision_required/revision_not_found。R05/B13/V20：全 cancelled、必要交付取消無處置、無關 completed 不能冒充結案。結案不替外部 PBI 關閉、不代表部署/品質驗收。

## 合作邊界與操作語意

[Workflow entity 規格](../entity/workflow.spec.md) 保有 CD-01–CD-09 的不變條件。所有寫入經同一聚合接受點；子實體引用不授予獨立 CRUD。重試、排序、原子性、可信 clock／ID 與事件名稱依 OP-01；不引入新的租約、排程或批准階段。

## 接受與驗證期待

來源規則／情境：R05、B13、V20；新測試定位標籤 `FT-C07`。[命令正式測試規格](../../../tests/collaboration/workflow/commands.test-spec.md) 應以正例及拒絕讀回驗證上述結果；[跨命令不變條件測試規格](../../../tests/collaboration/workflow/invariants.test-spec.md) 補驗原子性與歷史。這是驗證義務，不是執行結果。

## 技術 binding 與實作觀察

目前命令核心使用 JavaScript ESM 的 reducer/application，以 plain DTO 與注入 repository、clock、ID ports 協作；wire schema 為 JSON Schema 2020-12。此語言及函式寫法不是領域契約。新 profile 尚無 production storage、可信 Agent 認證及 HTTP／MCP routes；合成 repository 不證明 hosted 交易。

## 假設、來源差異與待決

本文保留既有語意，不以程式代替 owner 的需求決定。能力如何由可信 credential 提供及 production 接受／拒絕交易由 #5／#6 承接；自然語言成果品質及外部程序狀態不由結構驗證證明。容量的 schema 拒絕與 `limit_exceeded` 差異見共通規格 GAP-17；不得以此 normalization 假裝已收斂。
