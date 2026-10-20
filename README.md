# AI Collaboration Workflow Board

工作流程、任務與文件紀錄專案。所有程式碼專案都位於 `src/`；網站建置結果、preview、SQLite、憑證與測試證據不進入 Git。

開發協作已選配 Framework v0.20.1 的 15 個 skills 與 `engineering-common@0.3.0`，包含 `ai-context-init@0.2.1`；既有最小協作起點初始化保留。測試設計入口已由 `bdd-gwt-test-designer` 遷移為 `test-designer`。精確清單、驗證及使用限制見 [FRAMEWORK-INSTALLATION.md](FRAMEWORK-INSTALLATION.md)，Agent 入口見 [AGENTS.md](AGENTS.md)，開始方式見 [第一個有界任務](.dev/guides/first-task.md)。這是開發工具採用，不增加 Board runtime 相依。

| 路徑 | 用途 |
| --- | --- |
| `src/board/` | 單一 Sites 系統；`frontend/` 放瀏覽器程式，`backend/` 放 Worker／領域／D1，`contracts/` 放可攜訊息契約 |
| `src/local/` | Python 本機紀錄服務：SQLite、HTTP CLI、MCP stdio、可攜匯出／還原與合成資料測試 |
| `.github/workflows/ci.yml` | GitHub Actions 測試、建置、產物保存 |

兩個實作有自己的契約與儲存模型，沒有隱含的雙向同步。網站保存既有 framework 來源快照與人工 board 紀錄；本機服務使用合成 fixture。資料來源的權威切換與真實資料遷移需要各自的驗證。

程式依領域規則、應用案例、輸入／輸出 adapters 分類。具體依賴方向與保留的限制見 [ARCHITECTURE.md](ARCHITECTURE.md)。詳細契約見 [網站說明](src/board/README.md) 與 [本機服務說明](src/local/README.md)。

連接線上 Board 的新 [CLI 使用指南](src/board/CLI.md) 包含啟動方式、雙層認證、
JSON／exit code、精確版本讀取與跨 session 接手。2026-10-20 已完成私有 Site
部署、線上合成驗收及 Windows 認證管理員配置；日常直接使用指南中的
`windows-cli.ps1 run workflow-records-private ...`。這與 Python 本機原型的 CLI 分開。

## 建置與測試

網站需要 Node.js 22.13 以上；GitHub Actions 使用 Node.js 24。從 repo 根目錄執行：

```powershell
npm --prefix src/board ci
npm --prefix src/board test
npm --prefix src/board run build
npm --prefix src/board run validate
```

Python 使用 3.13，無第三方套件依賴：

```powershell
python -B -m src.local.tests.test_layout
python -B -m src.local.tests.test_review_regressions
python -B -m src.local.tests.test_acceptance
```

Actions 在 push、pull request 與手動執行時，於 Linux／Windows 執行本機契約測試，並建置、驗證 Worker。建置結果保存為短期 Actions artifact，沒有提交到原始碼 Git。Workflow 加入 repo 後仍需 push 才會開始 hosted run。

本機啟動與狀態目錄見 [LOCAL-SETUP.md](LOCAL-SETUP.md)。預設測試輸出放在已忽略的 `.runtime/`。

## 部署

目前保留同一個 ChatGPT Sites project、D1 binding 與私有存取方式。`src/board/.openai/hosting.json` 只保存平台連結與邏輯 binding，沒有憑證。GitHub Actions 的建置成功與 Sites 的發布成功是兩個不同狀態。

2026-10-07 核對結果：Sites 原生支援建置、儲存版本與部署；符合資格的帳號另有短期推送後私有發布能力。公開文件尚未建立可由一般 GitHub Actions 長期、無人值守直接發布既有 Sites 的 CLI／API 契約。完整流程、已確認能力與尚待確認事項見 [DEPLOYMENT.md](DEPLOYMENT.md)。

歷史 P0/P1 平台評估保留於 [PLATFORM-CONTRACT.md](PLATFORM-CONTRACT.md)，其中未實作的平台敘述屬於當時本機 prototype 的範圍。
