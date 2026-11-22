# Workflow Board 產品演進設計

## 目前從這裡開始（2026-11-22）

先啟動[實際 Web UI 的合成預覽](../../../README.md#試用產品總覽與兩種看板)，從產品總覽選一個產品，在 Scrum Board 查看 PBI、在 Workflow Board 接手工作。兩者共用同一份工作關聯。接著閱讀[產品範圍](product-scope.md)、[第一版 PBI、順序與現有 Issues 對照](board-roadmap.md)及[合成驗收範例](github-v1-examples.md)。GitHub Issues／Projects 的整合及寫回接在畫面驗收之後。[初期離線樣稿](github-v1-demo.html)

本輪承接四段歷史討論：保留 Board 的進度與交接職責、各入口共用的領域規則、協作優先於執行管理，以及交付與實際部署各自的證據。2026-11-22 的範圍修訂取代早期只保存外部 PBI 引用的決定。[設計與 Issues](codex://threads/01a1695f-9b8f-7791-83d2-45a5b2096306) · [核心與展現層](codex://threads/01a163de-8baf-71a3-8616-5432296b47e2) · [本機 APP 與 ADE](codex://threads/01a15947-03ec-7380-b1e2-94ae5c77f5b5) · [來源架構與部署](codex://threads/01a11682-b2ec-7823-9596-57f3d51696e2)

產品研究參考了兩種實務：AICF 用 GitHub Project 及工作階層來規劃，ArchPrecept 從 repository Issues 拆出可交付的工作。兩組虛構範例各自重建其中一種作業條件，測試程式只開啟本地樣稿。[AICF Project](https://github.com/users/YuChia-Wei/projects/3) · [ArchPrecept Issues](https://github.com/YuChia-Wei/ArchPrecept/issues)

## 初期設計背景（2026-10-20 至 2026-10-22）

這組文件完整整理本次討論形成的產品定位、技術限制、架構取捨、記憶構想、既有工作對應與未決事項，供初期設計及後續回查。採主題式整理，合併重複內容並修正後續已查明的差異，不是逐字對話稿。使用者已接受整體方向，並指定保存於 `.dev/`、分開 Board 與 Framework 的工作，以及在 Framework 建立記憶提案。

## 閱讀順序

| 文件 | 回答的問題 |
| --- | --- |
| [產品範圍](product-scope.md) | Board 要解決什麼問題？哪些工作屬於 Framework 或實際 Agent client？ |
| [Board Roadmap](board-roadmap.md) | 現有工作哪些已完成、哪些仍開啟？未來 Epic／Feature／Story 如何分組？ |
| [架構與部署設計](architecture-and-deployment.md) | 現有核心能否延伸到服務與桌面？C#、Rust、Tauri、WinUI、資料庫及離線模式如何取捨？ |
| [Framework 記憶提案與交接](framework-memory-proposal.md) | 短／中／長期記憶如何沿用 ADR、Lesson、Workflow？接手者應交付什麼？ |
| [研究與討論依據](research-and-discussion.md) | 外部產品的授權、現行架構與研究證據支持哪些結論？哪些推論已被修正？ |
| [方向與待決事項](decisions-and-questions.md) | 哪些是 owner 已選定方向、哪些只是候選？下一步需收斂哪些決策？ |

## 2026-10-22 初期文件的效力與證據

- **已接受方向**：本次對話的產品定位、責任分工、語言偏好、階段取捨與文件保存方式。這不是所有細部設計或候選工具的採用決定。
- **目前事實**：2026-10-22 逐筆讀取的 GitHub Issue 狀態與最終交付紀錄，以及當前專案文件。Board 本機與遠端 `main` 均核對為 `dee43c9e7ee91138fe3b15276468236385222981`；接續 owner 搬移 Lessons 並 force push 後的基線。
- **既有執行證據**：連結到 10/20 驗收紀錄及 10/21 保留摘要。本次沒有重跑產品測試、線上驗收或部署。舊紀錄中的執行結果不改寫成 10/22 新執行結果。
- **候選／推論**：未選定的 UI、部署模式、記憶工具與設計拆分。外部官方文件只支持該產品所述能力，不證明本專案已整合或適用所有企業環境。
- **工作權威**：Board 與 Framework 各自的 live Issues／Projects。此處 Roadmap 是設計快照；既有工作改以最新 Issue 為準，不復活已退役的 Board #1 工作總覽。

本次產物為開發文件與 Framework 提案。沒有初始化 ADR／Lesson／Workflow store，沒有安裝候選套件，也沒有把候選方案改成已採納規則。後續實作、提交、推送、PR、合併與部署依各自實際授權處理。

Framework 交接入口已建立為 [Proposal #486](https://github.com/YuChia-Wei/ai-collaboration-framework/issues/486)，完整交接內容直接保存在 Issue，無需等待本地設計文件推送後才能閱讀。

## 專案事實入口

[根目錄說明](../../../README.md)、[架構](../../../ARCHITECTURE.md)、[部署契約](../../../DEPLOYMENT.md)、[Board](../../../Docs/board.md)、[collaboration/1](../../../src/Contracts/CollaborationV1/README.md)、[MVP 範圍](../../../Docs/collaboration-mvp.md)、[CLI](../../../Docs/cli.md)、[MCP](../../../Docs/mcp.md)、[獨立本機原型](../../../src/Prototypes/WorkflowRecords/README.md)。

早期規格及說明若仍保留「transport／persistence 待整合」或舊 PR 狀態，需對照後續 #5／#16／#17 的最終證據；不得僅依舊段落否認已完成能力，也不能由已完成入口推定人類審核、多 Agent 隔離或完整退出能力已完成。

來源目錄已於 2026-10-22 調整；帶日期文件中的舊定位請參照 [搬移對照](../../guides/source-layout-migration.md)。歷史證據不因連結更新而成為本次驗收結果。
