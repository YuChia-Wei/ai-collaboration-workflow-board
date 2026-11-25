# AI Collaboration Workflow Board

Workflow Board 讓人從首頁看到自己的產品與正在進行的工作。建立產品後，即可在 **Scrum Board** 手動建立 Epic、Feature、User Story 與 Task，排列同層待辦，也能獨立登記 Bug。私有待辦由 Board 保存，無須設定外部服務。從任一項待辦可以建立或連結 workflow，之後在 **Workflow Board** 查閱實作進度、證據與交接。[網頁使用方式](src/Presentation/Web/README.md)

Scrum Board 可按類型推進工作，在狀態看板選擇交付對象及目標環境。例如 Bug 仍在重驗時，可以分別看到測試環境已讀回修正版本、客戶尚待交付。每個產品可調整流程、登記交付範圍、部署嘗試與環境讀回。這些紀錄保存於 Board，實際部署由原有發布工具執行。[工作狀態與交付規格](.dev/specs/portfolio/backlog/lifecycle-and-delivery.spec.md)

開發協作選配 Framework v0.23.1 的 16 個 skills 與 `engineering-common@0.4.3`。原架構 skill 的用途由 `domain-model-designer` 與 `software-architect` 接續。精確清單與驗證見 [FRAMEWORK-INSTALLATION.md](FRAMEWORK-INSTALLATION.md)，Agent 入口見 [AGENTS.md](AGENTS.md)，開始方式見 [第一個有界任務](.dev/guides/first-task.md)。

開發設計、規格與經驗紀錄集中於 [.dev 開發資源](.dev/README.md)。[產品演進初期設計](.dev/design/product-evolution/README.md) 保存 Board 產品範圍、Roadmap、部署選項與 Framework 記憶提案；它是帶日期的設計快照，工作狀態仍以各專案 GitHub Issues／Projects 為準。

| 路徑 | 用途 |
| --- | --- |
| `src/Core/Workflows/` | Workflow 領域規則、應用案例與 ports |
| `src/Presentation/` | Web、WebApi、Cli、Mcp 與共用 transport；各入口自行組裝依賴 |
| `src/Infrastructure/` | D1 持久化、可信身分、來源 catalog 與 runtime adapters |
| `src/Contracts/` | 可攜訊息 schema、範例與跨語言向量 |
| `src/Tooling/`、`src/Tests/` | 建置／驗證工具與產品測試 |
| `src/Prototypes/WorkflowRecords/` | Python 本機紀錄服務：SQLite、HTTP CLI、MCP stdio、可攜匯出／還原與合成資料測試 |
| `.github/workflows/ci.yml` | GitHub Actions 測試、建置、產物保存 |

正式網站的產品與工作由 Sites D1 保存。本機預覽另外建立合成 fixture。Python 原型有自己的契約與儲存模型。

程式依領域規則、應用案例、輸入／輸出 adapters 分類。具體依賴方向與保留的限制見 [ARCHITECTURE.md](ARCHITECTURE.md)。詳細契約見 [網站說明](Docs/board.md) 與 [本機服務說明](src/Prototypes/WorkflowRecords/README.md)。

連接線上 Board 的新 [CLI 使用指南](Docs/cli.md) 包含啟動方式、雙層認證、
JSON／exit code、精確版本讀取與跨 session 接手。2026-10-20 已完成私有 Site
部署、線上合成驗收及 Windows 認證管理員配置；日常直接使用指南中的
`windows-cli.ps1 run workflow-records-private ...`。這與 Python 本機原型的 CLI 分開。

[MCP 使用指南](Docs/mcp.md) 說明「工作紀錄室」plugin 的連線、只讀接手、
版本與錯誤處理，以及與 CLI 的雙向交接；已完成獨立新對話的唯讀接手驗收。

Node package、lockfile、Drizzle 設定與 Sites manifest 位於 repo 根目錄，保留單一建置與部署。來源目錄採 PascalCase；舊路徑與命令的對照見 [搬移指南](.dev/guides/source-layout-migration.md)。

## 建置與測試

網站需要 Node.js 22.13 以上；GitHub Actions 使用 Node.js 24。從 repo 根目錄執行：

```powershell
npm ci
npm test
npm run build
npm run test:tooling
npm run validate
```

Python 使用 3.13，無第三方套件依賴：

```powershell
python -B -m src.Prototypes.WorkflowRecords.Tests.test_layout
python -B -m src.Prototypes.WorkflowRecords.Tests.test_review_regressions
python -B -m src.Prototypes.WorkflowRecords.Tests.test_acceptance
```

Actions 在 push、pull request 與手動執行時，於 Linux／Windows 執行本機契約測試，並建置、驗證 Worker。建置結果保存為短期 Actions artifact，沒有提交到原始碼 Git。Workflow 加入 repo 後仍需 push 才會開始 hosted run。

### 試用產品總覽與兩種看板

完成 `npm ci` 後，在儲存庫根目錄執行下列指令，再開啟終端顯示的本機網址。

```powershell
npm run build
npm run preview:portfolio
```

首頁顯示虛構的「澄河」和「石庭」。進入澄河的 Scrum Board，沿 #11 或 #12 都可打開「整理時段資料」。在首頁選「調查時區差異」並補連澄河 #11，接著可從另一個瀏覽器工作階段進入同一網址，由 #11 讀回調查的證據與下一步。預覽執行正常的 Web UI 與 Worker，本機伺服器使用獨立的記憶體 SQLite；停止預覽後，再啟動即還原初始情境。

要試用空白的私有看板，可以從首頁建立一個產品，在 Scrum Board 依序新增 Epic、Feature、User Story 和 Task。登記 Bug 時填寫預期與實際行為，也可指出受影響的 User Story。回到待辦清單即可調整同層順序，在項目詳情可編輯、關閉或重開。[私有 Scrum Board 領域設計](.dev/design/product-evolution/native-scrum-backlog.md)

要試用交付追溯，可先建立一張 Bug，將其移到 Retesting，在產品新增 QA 環境後，分別登記修正版的部署嘗試及 QA 讀回。再建立一筆列出該 Bug 的交付草案，填入確切產物、受領對象與依據。從該 Bug 詳情和產品看板確認工作狀態、交付範圍及 QA 最後觀察版本。[操作指引](src/Presentation/Web/README.md)

`npm run test:portfolio-browser` 在組建後啟動自己的預覽，透過兩個獨立的瀏覽器工作階段自動驗收。Windows 預設使用已安裝的 Edge，其他平台使用 Chrome，也可以用環境變數 `BOARD_BROWSER_PATH` 指定本機 Chromium 執行檔。[合成情境與驗收方式](.dev/design/product-evolution/github-v1-examples.md)

本機啟動與狀態目錄見 [LOCAL-SETUP.md](LOCAL-SETUP.md)。預設測試輸出放在已忽略的 `.runtime/`。

## 部署

先將已驗證的變更推到 GitHub `main`，讀回遠端 commit，再以相同的完整 Git tree 建置並部署到既有私人 Site。發布前核對產物，發布後核對正式版本與 GitHub commit。[部署流程](DEPLOYMENT.md)

歷史 P0/P1 平台評估保留於 [PLATFORM-CONTRACT.md](PLATFORM-CONTRACT.md)，其中未實作的平台敘述屬於當時本機 prototype 的範圍。

一個產品對應一個 Board project。CLI／MCP 的專案識別及既有協作資料讀取規則見 [collaboration/2 契約](src/Contracts/CollaborationV2/README.md)。
