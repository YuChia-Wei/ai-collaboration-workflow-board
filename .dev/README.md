# 開發資源

本目錄保存 Workflow Board 開發過程使用的設計、規格、驗證指引與經驗紀錄。依專案 owner 於 2026-10-22 確認的目錄分工，這類累積資源放在 `.dev/`；`docs/` 或 `notes/` 若使用，供專案正式說明文件或筆記，不作開發資源的預設收納處。產品程式仍放在 `src/`。

| 入口 | 用途 |
| --- | --- |
| [產品演進初期設計](design/product-evolution/README.md) | Board 產品範圍與 Roadmap、架構與部署選項、Framework 記憶提案、研究來源及待決事項 |
| [既有規格集](specs/README.md) | 2026-10-13 基線的 production／entity／adapter／test 規格；保留各文件自己的時間與證據邊界 |
| [第一個有界任務](guides/first-task.md) | 從現行 Issue 與專案契約開始工作 |
| [CLI 線上驗收紀錄](guides/cli-hosted-acceptance-20261020.md) | 已執行的 CLI 合成情境與限制 |
| [MCP 接手驗收紀錄](guides/mcp-handoff-acceptance-20261020.md) | 選定 client、新對話及跨介面接手證據 |
| [Lessons](lessons/README.md) | 候選經驗、來源與保留摘要；不等同已採納專案規則 |

GitHub Issues／Projects 是工作狀態與優先順序的權威；設計文件提供帶日期的規劃和證據導引，不另維護一份進度總帳。初期設計不會自動升格為正式規格、ADR 或實作授權。

`notes/lessons/` 已由 owner 搬至 `.dev/lessons/`。既有 Lesson 紀錄中保留的舊路徑可透過這個搬移關係定位；例如 `notes/lessons/evidence/board-interfaces-20261021.json` 現在位於 [保留摘要](lessons/evidence/board-interfaces-20261021.json)。本次設計留存不改寫 Lesson 的生命週期內容或歷史。
