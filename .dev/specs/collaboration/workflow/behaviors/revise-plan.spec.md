# 修訂計畫與工作定義（UC-02）

## 背景與來源

- 類型：production；操作：normalize；草案 v1，未新增核准。
- 所屬：Workflow 協作 context 的 Workflow 聚合；命令 `plan.revise`。
- 範圍：一個既有命令的行為契約；不包含 production adapter 交付。

行為來源固定為 `3e7ee13cda8de27c8a069a062ffd0d289584722e`：[契約 README](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/contracts/collaboration-v1/README.md)、[schema](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/contracts/collaboration-v1/schema.json)、[domain reducer](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/domain/collaboration-workflow.mjs)、[application](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/application/collaboration.mjs)、[ports](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/application/collaboration-ports.mjs)。需求權威為 [Issue #3](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/3) 及 [#4](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/4)；原有 R／B／V 編號保持不變。Issue #3 擷取時 updatedAt=`2026-10-12T13:28:04Z`。本次 normalize 僅整理既有規格，沒有新增核准、實作或執行證據。

## 行為契約

- 觸發者：由可信身分邊界提供的呼叫者，能力及目前狀態須符合下列前提。
- 輸入 payload：plan、execution_impact、task_changes、unaffected_task_ids、decision_dispositions、completion_requirements、requirement_dispositions；精確 required／nullable／型別／長度依固定 schema。
- 前提：read、plan；Workflow 非終態；決策沿用／豁免及範圍處置須額外授權；並滿足 [共通命令接受規格](command-acceptance.spec.md) 的 envelope、身分、CAS、終態及容量規則。
- 可觀察輸出：成功回 accepted receipt；確定且可持久記錄的拒絕回 rejected receipt。未知結果依 OP-01 協調，不能冒稱拒絕。
- 後置條件：新文件／定義／決策版本及交付清單同次接受；成功增加 Workflow revision 一次，狀態、facts、event 與 receipt 原子可見。
- 拒絕／失敗：active_assignment、definition_conflict、decision_disposition_required、requirement_history_required；一般形狀／身分／CAS 錯誤仍適用。拒絕不留下部分領域效果。

## 規則、狀態效果與替代路徑

payload=`plan,execution_impact,task_changes,unaffected_task_ids,decision_dispositions,completion_requirements,requirement_dispositions`，全部 required。plan 是 DocumentWrite；impact=`none|declared`；task change 是 add(definition) 或 replace(definition,expected_definition_revision)。workflow 非終態、read/plan，必要時另要 decide/change_scope。

先核對 changed/unaffected 不重複、不交集，每個未終態 task 恰好處置一次，unaffected 只引用現有非終態 task。none 要 changes/dispositions 空且交付清單及範圍處置完全相同。保存 plan 新 revision，其 role 固定；全部新／replace definitions 的 plan_basis 精確等於新 plan ref。add ID 不存在；replace 存在、非終態、無有效 assignment、definition revision 相符。保存 definition 新 revision；未受影響 task 及其 plan basis 不動。

文件/decision/input refs 存在；改掉 decision basis 文件須明示 disposition，移除 decision_ids 關聯須 waive。decision dispositions 不重複、expected_decision_revision 正確、basis 存在；reconsider→pending 新版本，carry_forward 要原 decided 且合法決定者、保留 value，waive 要合法決定者/value=null；全部保存新 decision history。既有 CompletionRequirement 完整保留，IDs 去重，新增引用存在且至少一個 task/document；任何 disposition 清單改變要 change_scope；follow_up 非 null。存在 tasks 時要非空交付清單。最後驗證完整 DAG、limits/header 預算。任一步失敗整筆不接受。

特有拒絕：invalid_task_changes、missing_task_disposition、undeclared_execution_change、invalid_plan_basis、task_exists/task_not_found、terminal_task、active_assignment、definition_conflict、decision_disposition_required、decision_revision_conflict、decision_actor_mismatch、decision_required、invalid_requirements、requirement_history_required、missing_follow_up、document_revision_conflict、document_role_conflict、revision_not_found、invalid_dependency/dependency_cycle、limit_exceeded。R03/B06–B08/V06/V17/V18 需驗證原 plan/tasks/decision 全部保留；V21 禁止截斷狀態驗證。

## 合作邊界與操作語意

[Workflow entity 規格](../entity/workflow.spec.md) 保有 CD-01–CD-09 的不變條件。所有寫入經同一聚合接受點；子實體引用不授予獨立 CRUD。重試、排序、原子性、可信 clock／ID 與事件名稱依 OP-01；不引入新的租約、排程或批准階段。

## 接受與驗證期待

來源規則／情境：R03、B06–B08、V06、V17、V18、V21；新測試定位標籤 `FT-C02`。[命令正式測試規格](../../../tests/collaboration/workflow/commands.test-spec.md) 應以正例及拒絕讀回驗證上述結果；[跨命令不變條件測試規格](../../../tests/collaboration/workflow/invariants.test-spec.md) 補驗原子性與歷史。這是驗證義務，不是執行結果。

## 技術 binding 與實作觀察

目前命令核心使用 JavaScript ESM 的 reducer/application，以 plain DTO 與注入 repository、clock、ID ports 協作；wire schema 為 JSON Schema 2020-12。此語言及函式寫法不是領域契約。新 profile 尚無 production storage、可信 Agent 認證及 HTTP／MCP routes；合成 repository 不證明 hosted 交易。

## 假設、來源差異與待決

本文保留既有語意，不以程式代替 owner 的需求決定。能力如何由可信 credential 提供及 production 接受／拒絕交易由 #5／#6 承接；自然語言成果品質及外部程序狀態不由結構驗證證明。容量的 schema 拒絕與 `limit_exceeded` 差異見共通規格 GAP-17；不得以此 normalization 假裝已收斂。
