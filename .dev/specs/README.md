# Workflow Board 領域與測試規格

本目錄供後續開發者依行為契約重建系統，不依賴私人對話。2026-10-13 依初始化後的 [AGENTS](../../AGENTS.md)、[第一個有界任務指引](../guides/first-task.md)及已安裝 `spec-author` 進行 **normalize**，採領域／聚合／規格種類整理。

本輪輸入版本為 `aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`。產品 `src/` 與原規格行為基線 `3e7ee13cda8de27c8a069a062ffd0d289584722e` 相同，因此保留原行為來源及歷史 Issue 快照；初始化後的協作規則、導航及已修正的 README／ARCHITECTURE 另綁定本輪輸入版本。兩種基線不能混稱為本次執行證據，詳見[來源說明](sources/README.md)。

## 先讀哪一份

| 需要 | 入口 |
| --- | --- |
| 理解產品邊界、共同語言與不同紀錄類型 | [領域地圖](domain-map.md) |
| 重建新協作聚合 | [Workflow 實體規格](collaboration/workflow/entity/workflow.spec.md) |
| 實作新協作命令 | [命令接受協定](collaboration/workflow/behaviors/command-acceptance.spec.md)，再從下表選 19 個使用案例 |
| 實作有界查詢、指定版本、快照 | [Context](collaboration/queries/workflow-context.spec.md)、[分頁](collaboration/queries/context-page.spec.md)及查詢目錄 |
| 保留既有人工 Board／legacy 相容性 | [人工聚合](board-human/workflow/entity/workflow.spec.md)、[人工命令](board-human/workflow/behaviors/commands.spec.md)，legacy 路徑見[搬移對照](migration-map.md) |
| 重建來源 catalog／舊人端介面 | [Catalog 查詢](source-catalog/queries/catalog.spec.md)、[瀏覽器 adapter](board-web/adapters/browser.spec.md) |
| 重建本機原型及可攜資料 | [Local 聚合](local-records/workflow/entity/workflow.spec.md)、[Local 命令](local-records/workflow/behaviors/commands.spec.md)、[匯出／還原](local-records/portability/export-restore.spec.md) |
| 找到對應驗證情境與既有 test binding | [正式測試規格索引](tests/README.md)、[需求追溯](coverage.md) |
| 了解重建順序、未完成能力及來源差異 | [重建導引](reconstruction.md)、[未決事項](gaps-and-decisions.md) |
| 核對這次整理方式與審閱範圍 | [搬移對照](migration-map.md)、[整理審閱紀錄](normalization-review.md) |

## 新協作行為目錄

| 原 ID | 命令／可觀察行為 | 規格 |
| --- | --- | --- |
| OP01 | 命令接受、重播、拒絕及未知結果 | [接受協定](collaboration/workflow/behaviors/command-acceptance.spec.md) |
| UC01 | workflow.create | [建立工作](collaboration/workflow/behaviors/create-workflow.spec.md) |
| UC02 | plan.revise | [修訂計畫](collaboration/workflow/behaviors/revise-plan.spec.md) |
| UC03 | document.append | [追加文件版本](collaboration/workflow/behaviors/append-document.spec.md) |
| UC04 | workflow.start | [開始工作](collaboration/workflow/behaviors/start-workflow.spec.md) |
| UC05 | workflow.pause | [暫停工作](collaboration/workflow/behaviors/pause-workflow.spec.md) |
| UC06 | workflow.resume | [恢復工作](collaboration/workflow/behaviors/resume-workflow.spec.md) |
| UC07 | workflow.complete | [完成工作](collaboration/workflow/behaviors/complete-workflow.spec.md) |
| UC08 | workflow.cancel | [取消工作](collaboration/workflow/behaviors/cancel-workflow.spec.md) |
| UC09 | task.claim | [承接任務](collaboration/workflow/behaviors/claim-task.spec.md) |
| UC10 | task.progress | [回報進度](collaboration/workflow/behaviors/report-task-progress.spec.md) |
| UC11 | task.release | [釋出承接](collaboration/workflow/behaviors/release-task.spec.md) |
| UC12 | task.block | [記錄阻礙](collaboration/workflow/behaviors/block-task.spec.md) |
| UC13 | task.unblock | [解除阻礙](collaboration/workflow/behaviors/unblock-task.spec.md) |
| UC14 | task.complete | [完成任務](collaboration/workflow/behaviors/complete-task.spec.md) |
| UC15 | task.cancel | [取消任務](collaboration/workflow/behaviors/cancel-task.spec.md) |
| UC16 | decision.open | [提出指定問題](collaboration/workflow/behaviors/open-decision.spec.md) |
| UC17 | decision.resolve | [記錄決定](collaboration/workflow/behaviors/resolve-decision.spec.md) |
| UC18 | handoff.record | [保存交接](collaboration/workflow/behaviors/record-handoff.spec.md) |
| UC19 | checkpoint.append | [追加觀察](collaboration/workflow/behaviors/append-checkpoint.spec.md) |

| 原 ID | 查詢 | 規格 |
| --- | --- | --- |
| CQ01 | capabilities | [能力](collaboration/queries/capabilities.spec.md) |
| CQ02 | workflow.find | [搜尋摘要](collaboration/queries/find-workflows.spec.md) |
| CQ03 | workflow.context | [一致接手上下文](collaboration/queries/workflow-context.spec.md) |
| CQ04 | context.page | [同快照分頁](collaboration/queries/context-page.spec.md) |
| CQ05 | task.read | [指定任務版本](collaboration/queries/read-task.spec.md) |
| CQ06 | decision.read | [指定決策版本](collaboration/queries/read-decision.spec.md) |
| CQ07 | document.read | [指定文件版本](collaboration/queries/read-document.spec.md) |
| CQ08 | operation.get | [原操作結果](collaboration/queries/operation-result.spec.md) |

## 文件責任與採用格式

`ai-context-init` 建立協作起點，不會自動提供完整產品規格或強制機器格式。本次依使用者選定的 `.dev/specs/` 根目錄，採用 `spec-author` 的一般 Markdown 範本與語意所有權指引；以下是這次整理的文件約定，不新增產品行為或 framework 管理設定。

- **entity**：描述一個聚合或實體的識別、資料值、所有權、不變條件與允許轉移。Workflow 的子成員留在該聚合規格，不因有 ID 就另建 aggregate。
- **production**：描述選定使用案例的 actor／trigger、輸入、前置條件、輸出、後置條件及失敗。新協作命令與查詢各有獨立文件；既有相容介面的命令族可以在同一有界文件中保留逐命令子契約。
- **adapter**：描述外部入口、協定、資料映射、身分、錯誤與儲存保證。程式語言、runtime、資料表與測試綁定分開列明。
- **formal-test**：以獨立情境的 Given／When／Then、驗證層級、測試資料、oracle、來源 test binding 與缺口表達。情境文字不是執行結果。

每份規格保留類型、狀態、主題／所有權、來源、驗證期待與未決事項。來源中的 CD／UC／CQ／OP／EB／BA／LP 與 R／B／V／FT 編號保留；版面搬移不重新編號、不消除已知矛盾。實作語言與儲存技術放在技術綁定區；公開 wire 欄位名與其精確值仍是跨語言契約的一部分。

## 必要的機器可讀契約

詳細 wire 結構仍採用版本化的 [collaboration/1 schema](../../src/Contracts/CollaborationV1/schema.json)、[examples](../../src/Contracts/CollaborationV1/examples.json)、[vectors](../../src/Contracts/CollaborationV1/vectors.json)及[契約 README](../../src/Contracts/CollaborationV1/README.md)。Local 可攜資料採用自己的 [export schema](../../src/Prototypes/WorkflowRecords/Assets/export-schema.json)。它們是重建輸入，不能只取本目錄 Markdown 而丟棄；本次未複製出第二套可能漂移的 schema。

## 來源權威與證據界線

| 標記 | 意義 |
| --- | --- |
| 已接受設計 | Issue #2／#3 的方向及設計、#4 收斂的契約；不等於所有 adapter 已實作 |
| 來源觀察 | 固定程式／測試來源顯示的現況；不把 code-only 細節升為新增產品政策 |
| 待實作契約 | 已固定語意但缺執行路徑，不能廣告為 runtime capabilities |
| 待審核需求／未決 | 後續 Issue 尚未接受的詳細 AC、實作選擇與缺口，不由 normalize 代為決定 |
| 來源存在／部分來源／缺口 | 測試程式的對應程度，均不等於本輪執行通過 |

GitHub Issues／Projects 仍為工作權威。[Issue 快照](sources/)保留上一輪讀取版本；本次整理沒有重新判定線上工作狀態。新協作 query、production persistence、可信 Agent 身分、HTTP／MCP 與新 UI 的缺口仍有效。產品測試、hosted CI、部署及真正重建另一套實作均未在這次文件整理中執行。

來源目錄已於 2026-10-22 調整；帶日期文件中的舊定位請參照 [搬移對照](../guides/source-layout-migration.md)。歷史證據不因連結更新而成為本次驗收結果。
