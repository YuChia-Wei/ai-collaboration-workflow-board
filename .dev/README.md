# 開發資源

本目錄保存 Workflow Board 開發過程使用的設計、規格、驗證指引與經驗紀錄。依專案 owner 於 2026-10-22 確認的目錄分工，這類累積資源放在 `.dev/`；`docs/` 或 `notes/` 若使用，供專案正式說明文件或筆記，不作開發資源的預設收納處。產品程式仍放在 `src/`。

| 入口 | 用途 |
| --- | --- |
| [產品演進設計](design/product-evolution/README.md) | 目前的產品範圍、GitHub 第一版 Roadmap 與 Issue 對照，也保留早期架構、部署與 Framework 記憶提案 |
| [原生 Scrum 待辦設計](design/product-evolution/native-scrum-backlog.md) · [項目與操作規格](specs/portfolio/backlog/native-backlog.spec.md) | 無外部來源時，手動建立及排列產品工作、登錄 Bug，並連到 workflow |
| [PBI 生命週期與交付設計](design/product-evolution/pbi-lifecycle-and-delivery.md) · [狀態及追溯規格](specs/portfolio/backlog/lifecycle-and-delivery.spec.md) | 產品可配置各類型工作狀態，記錄部分交付、部署與獨立的環境讀回 |
| [離線互動樣稿](design/product-evolution/github-v1-demo.html) · [示範與驗收情境](design/product-evolution/github-v1-examples.md) | 用兩個虛構產品走過首頁、PBI 與 workflow；查看交付取捨，以及如何在隔離環境驗收 GitHub 操作 |
| [既有規格集](specs/README.md) | 2026-10-13 基線的 production／entity／adapter／test 規格；保留各文件自己的時間與證據邊界 |
| [第一個有界任務](guides/first-task.md) | 從現行 Issue 與專案契約開始工作 |
| [CLI 線上驗收紀錄](guides/cli-hosted-acceptance-20261020.md) | 已執行的 CLI 合成情境與限制 |
| [MCP 接手驗收紀錄](guides/mcp-handoff-acceptance-20261020.md) | 選定 client、新對話及跨介面接手證據 |
| [Lessons](lessons/README.md) | 候選經驗、來源與保留摘要；不等同已採納專案規則 |

GitHub Issues／Projects 是工作狀態與優先順序的權威；設計文件提供帶日期的規劃和證據導引，不另維護一份進度總帳。初期設計不會自動升格為正式規格、ADR 或實作授權。

`notes/lessons/` 已由 owner 搬至 `.dev/lessons/`。既有 Lesson 紀錄中保留的舊路徑可透過這個搬移關係定位；例如 `notes/lessons/evidence/board-interfaces-20261021.json` 現在位於 [保留摘要](lessons/evidence/board-interfaces-20261021.json)。本次設計留存不改寫 Lesson 的生命週期內容或歷史。

來源目錄已於 2026-10-22 調整；帶日期文件中的舊定位請參照 [搬移對照](guides/source-layout-migration.md)。歷史證據不因連結更新而成為本次驗收結果。

[#22 專案隔離驗證](guides/project-scope-acceptance.md) 記錄本機實作、相容映射與尚缺的 hosted／完整恢復證據。
