# 記錄決定或豁免（UC-17）

## 背景與來源

- 類型：production；操作：normalize；草案 v1，未新增核准。
- 所屬：Workflow 協作 context 的 Workflow 聚合；命令 `decision.resolve`。
- 範圍：一個既有命令的行為契約；不包含 production adapter 交付。

行為來源固定為 `3e7ee13cda8de27c8a069a062ffd0d289584722e`：[契約 README](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/contracts/collaboration-v1/README.md)、[schema](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/contracts/collaboration-v1/schema.json)、[domain reducer](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/domain/collaboration-workflow.mjs)、[application](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/application/collaboration.mjs)、[ports](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/blob/3e7ee13cda8de27c8a069a062ffd0d289584722e/src/board/backend/application/collaboration-ports.mjs)。需求權威為 [Issue #3](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/3) 及 [#4](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/4)；原有 R／B／V 編號保持不變。Issue #3 擷取時 updatedAt=`2026-10-12T13:28:04Z`。本次 normalize 僅整理既有規格，沒有新增核准、實作或執行證據。

## 行為契約

- 觸發者：由可信身分邊界提供的呼叫者，能力及目前狀態須符合下列前提。
- 輸入 payload：decision_id、expected_decision_revision、basis、outcome、value、reason；精確 required／nullable／型別／長度依固定 schema。
- 前提：read、decide，且符合 required_decider；目前 pending；revision 與 basis 精確匹配；並滿足 [共通命令接受規格](command-acceptance.spec.md) 的 envelope、身分、CAS、終態及容量規則。
- 可觀察輸出：成功回 accepted receipt；確定且可持久記錄的拒絕回 rejected receipt。未知結果依 OP-01 協調，不能冒稱拒絕。
- 後置條件：追加 decided 或 waived revision；保存實際 actor／理由／時間；成功增加 Workflow revision 一次，狀態、facts、event 與 receipt 原子可見。
- 拒絕／失敗：decision_not_found、decision_revision_conflict、decision_actor_mismatch、decision_already_resolved、invalid_command；一般形狀／身分／CAS 錯誤仍適用。拒絕不留下部分領域效果。

## 規則、狀態效果與替代路徑

payload=`decision_id,expected_decision_revision,basis,outcome,value,reason`；read/decide 且符合原 required_decider。revision 及 basis 完整順序相等、當前 pending。outcome=decided 要非空 value、waived 要 null；新 revision+1/status，並記 value/reason/actor/decided_at history。拒絕 decision_not_found/decision_revision_conflict/decision_actor_mismatch/decision_already_resolved；形狀錯誤 invalid_command。Agent 不可自填 human；options 不是現行 value 枚舉限制。R03/B08/V18。

## 合作邊界與操作語意

[Workflow entity 規格](../entity/workflow.spec.md) 保有 CD-01–CD-09 的不變條件。所有寫入經同一聚合接受點；子實體引用不授予獨立 CRUD。重試、排序、原子性、可信 clock／ID 與事件名稱依 OP-01；不引入新的租約、排程或批准階段。

## 接受與驗證期待

來源規則／情境：R03、B08、V18；新測試定位標籤 `FT-C17`。[命令正式測試規格](../../../tests/collaboration/workflow/commands.test-spec.md) 應以正例及拒絕讀回驗證上述結果；[跨命令不變條件測試規格](../../../tests/collaboration/workflow/invariants.test-spec.md) 補驗原子性與歷史。這是驗證義務，不是執行結果。

## 技術 binding 與實作觀察

目前命令核心使用 JavaScript ESM 的 reducer/application，以 plain DTO 與注入 repository、clock、ID ports 協作；wire schema 為 JSON Schema 2020-12。此語言及函式寫法不是領域契約。新 profile 尚無 production storage、可信 Agent 認證及 HTTP／MCP routes；合成 repository 不證明 hosted 交易。

## 假設、來源差異與待決

本文保留既有語意，不以程式代替 owner 的需求決定。能力如何由可信 credential 提供及 production 接受／拒絕交易由 #5／#6 承接；自然語言成果品質及外部程序狀態不由結構驗證證明。容量的 schema 拒絕與 `limit_exceeded` 差異見共通規格 GAP-17；不得以此 normalization 假裝已收斂。
