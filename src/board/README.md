# 工作紀錄室：Framework workflow board

本人私有的繁體中文工作流程紀錄網站。呈現 ai-collaboration-framework 的 Git 工作紀錄快照，保留來源 ID、狀態、task 原始 metadata 與文件原文；匯入資料為唯讀，原 repo 保持原狀。另可建立本人的網站紀錄。

資料由 Sites D1 保存；瀏覽器儲存不是紀錄來源。文件內容與修訂目前保存在 D1，此預覽不支援檔案附件或 R2。Sites 存取政策限制為本人，API 使用平台轉送的登入使用者身分分隔紀錄。

不再自動建立合成範例。此次匯入保留指定 Git tree 的目前文件；更早的 Git 修訂未匯入。二進位附件保留固定版本來源連結與 hash，附件實體仍在 Git。此匯入不是原 repo 工作流程的權威切換，也不包含本機 coding agent 或 MCP plugin 接入。

來源紀錄與文件分表保存，避免大型 workflow 超過 D1 單列限制。匯入經持久 staging、完整 row hash 核對後，以同一交易切換可見資料並只移除三個已知合成流程。網站原有其他紀錄保留；清理前另有 repo 外備份。完成後移除暫時 runtime secret，且服務程式固定拒絕一次性匯入端點；即使舊 runtime 仍提供該 secret，也不能使用。

## 本地驗證

新增的 [Workflow Board CLI](CLI.md) 透過 collaboration HTTP API 連接 Board。
首版服務憑證 adapter 已部署至私有 Site；Windows 使用者可從認證管理員安全啟動，
日常命令、到期日與輪替方式見指南，線上合成驗收記錄與本機測試分列。
使用 `node src/board/backend/cli.mjs help`（repo 根目錄）查看入口。

[MCP 使用指南](MCP.md) 提供「工作紀錄室」Sites plugin 的設定、版本／認證矩陣、
只讀接手提示及 CLI 對照。雙向合成交接與獨立新對話的唯讀接手已實測；
不把 CLI 服務憑證當成通用 MCP client 的已支援登入方式。

在 repository 根目錄先進入 Node 專案；建置輸出在 `src/board/dist/`，由 Git 忽略。

```powershell
Set-Location src/board
npm ci
npm test
npm run build
npm run validate
```

契約測試以 Node SQLite 模擬 D1 batch，覆蓋防重放、版本衝突、零列更新、交易回滾、文件保留與身分邊界；不等於 hosted D1 端到端驗證。

`npm test` 也需要 Python 3，執行獨立的跨語言編碼向量。協作核心保留 23 個合成 repository 情境；MVP 另有 10 個 SQL／query 情境及 5 個 transport 情境，`validate` 會對打包後 Worker 重跑 transport 流程。這些與既有人工 profile 回歸及 hosted 驗證是不同證據。CI 配置 Node 24 與 Python 3.13。

## 程式邊界

`src/board` 保留一套 package、建置及部署。來源分為 `frontend/`、`backend/` 與 `contracts/`；後端內部再按領域、使用案例與技術介面分類：

| 路徑 | 責任 |
| --- | --- |
| `backend/domain/board-workflow.mjs` | 人工 workflow／task 的狀態、完成條件、文件修訂及 reducer |
| `backend/domain/legacy-workflow.mjs` | 既有紀錄的相容規則與 reducer |
| `backend/domain/collaboration-workflow.mjs`、`collaboration-values.mjs` | 新協作 aggregate、DAG、承接世代、plan／decision 規則與可攜編碼 |
| `contracts/collaboration-v1/` | 新 profile 的 JSON Schema、範例、跨語言向量與版本契約 |
| `backend/domain/errors.mjs`、`values.mjs`、`summary.mjs` | 契約錯誤、值驗證、hash 與摘要投影 |
| `backend/application/` | 命令、防重放、revision 衝突處理與查詢；`ports.mjs` 定義儲存契約 |
| `backend/adapters/inbound/http/` | 路由、HTTP 請求／回應與受信任的身分來源 |
| `backend/adapters/outbound/d1/` | D1 SQL、owner 隔離、CAS 與 guarded atomic batch |
| `backend/index.mjs` | 組裝 application、D1 adapter 與 HTTP adapter 的 composition root |
| `frontend/` | 瀏覽器介面與 Markdown 清理 |
| `backend/schema/schema.ts`、`backend/schema/migrations/` | Drizzle schema 與可版本管理的 SQL migrations |
| `backend/data/source-catalog.json` | 固定 Git tree 的唯讀來源投影，屬來源資料而非建置成品 |
| `scripts/`、`tests/` | 建置／驗證工具與契約測試；歷史匯入工具只放在 test fixtures |

前後端透過 HTTP／DTO 溝通，不相互 import 原始碼。Build script 將前端產物注入後端頁面入口，仍輸出同一個 Sites Worker；目錄分離不代表分開部署。

Domain 不依賴 HTTP 或資料庫；application 使用 repository ports，D1 adapter 實作交易。新增紀錄及既有紀錄保有各自的契約和儲存格式。HTTP adapter 不執行 SQL，composition root 負責選擇平台身分來源。領域 reducer 可在沒有 D1、HTTP 或網路的環境執行。

建置使用 esbuild 封裝 Worker ESM 於 `dist/server/index.js`，並將 schema migrations 放在 Sites 使用的 `dist/.openai/drizzle/`。`.openai/hosting.json` 保留既有 Sites project 的 metadata。[GitHub Actions CI](../../.github/workflows/ci.yml) 負責可重現的安裝、測試、建置與 artifact 驗證；部署環境與身分設定請參閱 repository 根目錄的部署說明。GitHub repo 的 push／merge 與遠端部署為各自的操作。

## 新版 board

來源快照與線上人工紀錄有不同 namespace。畫面按來源 workflow ID 顯示最近紀錄，支援名稱、ID、Issue／PR、kind、owner skill、status 及來源篩選，API 分頁回傳最多 50 筆摘要。文件按需載入，不把所有原文混入詳情回應。Markdown 支援表格、程式碼區塊及連結，渲染後清理 HTML；同 workflow 的相對連結開啟保存的來源文件。

`backend/data/source-catalog.json` 是既有匯入 Git tree 的唯讀欄位投影，固定來源 `a66957e00aa447be887258fa9b55fd89e39e96dd`（v0.19.0）。201 workflows、1752 文件、559 個可辨識任務。`scripts/project-source.mjs <framework-import-folder>` 可從匯入備份及其 manifest 重建；先核對每份輸入 hash，再讀原始 JSON／YAML，canonical tasks 優先。舊版沒有 locator 的状态保持未知，deferred／done 原值保留。metadata 宣告的 work_items 與全文發現的參考連結分開。投影不是新的歷史驗證判定，領域欄位仍在原文；資料集 SHA 不一致時不使用這份投影。

人工新建紀錄使用 `service_contract_version: framework-board/1`、`execution_kind: human` 與 framework 共通欄位，採明確 `lifecycle_contract: 1.0`。人工 model／effort 不適用，不宣稱已成為 framework Git 流程的寫入來源。進行中恰好一個進行中任務；完成任務需摘要與已處理的 findings 結論，無通用證據數量門檻；完成 workflow 要所有 task 完成。延期保留理由及恢復條件。task 完成與下一個 task／workflow 狀態一同提交，避免中間違反契約。

新增 board_workflows／board_tasks／board_documents／board_revisions／board_entries，owner 與 workflow/task/document ID 作複合 key。原有表及資料不改寫；文件每次修訂獨立保存，單版 256 KB，metadata 每列 64 KB。CAS、事件與 receipt 在同一 guarded batch；重試先查持久 receipt 再檢查 revision。瀏覽器僅暫存未確認操作的草稿，已保存紀錄仍以 D1 為準。

AI agents、MCP／CLI adapters、原 repo 權威切換、完整 Git 歷史及二進位附件搬移不在本次實作範圍。`scripts/preview.mjs` 僅以本機記憶體 SQLite 與匯入備份驗證 UI，測試資料不寫入 hosted D1。

## 協作核心與可攜契約（WB-03）

[#3 的 DDD／BDD 模型](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/3) 已落成獨立的 `workflow-board/collaboration/1` 命令核心。19 種 commands 支援明確計畫、並行 task DAG、單 task 承接、交接、決策及結案限制；8 種 queries 的 DTO 與快照契約已定義。完整規則、範例、原子接受及證據對照見 [協作契約](contracts/collaboration-v1/README.md)。

WB-04 MVP 已加入 D1 repository、8 種 queries、HTTP／MCP routes 與明確設定的 Agent binding adapter。本機合成流程可從建立、計畫、認領、進度、交接一路執行至完成，並驗證打包後 Worker。2026-10-15 已在第 10 版以真實 Site plugin 完成兩組合成資料、17 筆接受命令、回執恢復／重送及指定版本讀回，另驗證一筆過期 revision 拒絕；D1 紀錄已逐筆比對。2026-10-17 使用者確認合成畫面，單 owner 範圍補測與介面比較完成；tokens／debit 未量測，未宣稱節省。設定、限制、測試對照與接入步驟見 [COLLABORATION-MVP.md](COLLABORATION-MVP.md)。協作檢視入口與既有人工／source 資料分開，未執行資料遷移。

專案內試用入口為 `npm --prefix src/board run trial:collaboration -- <start|validate|resume|status> <run-id>`。它保存本機 SQLite、固定來源／skill 原文與 Worker、操作回條及驗證輸出，讓新程序可續接；不以線上記錄作唯一證據。步驟與證據限制見 [試行指南](../../.dev/guides/collaboration-trial.md)。
