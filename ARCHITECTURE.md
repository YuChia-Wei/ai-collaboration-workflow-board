# 程式碼結構與依賴方向

以 workflow 的領域規則與既有契約為整理單位，採用 DDD 的領域分類、Clean Architecture 的依賴方向，以及 Hexagonal Architecture 的 ports/adapters。Board 新協作模型以 Workflow 為聚合根，task／document 是其邊界內的成員。Board 與 Python 原型分開演進，不為相似的名稱共用不同的資料模型。

```text
src/
  Core/Workflows/
    Domain/                   workflow aggregate、值、規則與錯誤
    Application/              commands、queries 與 ports
  Presentation/
    Web/                      瀏覽器 HTML、樣式、互動與 HTTP client
    WebApi/                   HTTP routes、DTO、Worker entry.mjs
    Cli/                      main.mjs 組裝、run.mjs 協調、遠端 HTTP client
    Mcp/                      tools、JSON-RPC transport 與錯誤映射
    Shared/                   現有共用 JSON／transport 驗證
  Infrastructure/
    Persistence/D1/           repositories、schema.ts、Migrations/
    Identity/                 Sites 與 collaboration 身分 adapters
    SourceCatalog/            固定來源 catalog 與 projection
    Runtime/                  系統 clock adapter
  Contracts/CollaborationV1/   JSON schemas、範例與跨語言向量
  Tooling/                    建置、產物驗證與本機 preview 工具
  Tests/                      契約與 adapter 測試、Fixtures/
  Prototypes/WorkflowRecords/  獨立 Python 本機原型
    Domain/                   驗證、序列化與 command reducer
    Application/              workflow 服務、可攜套件驗證
    Adapters/Inbound/         HTTP server、CLI、MCP stdio
    Adapters/Outbound/        SQLite 與 HTTP client
    Assets/                   HTML 與匯出 schema
    Tools/                    fixture seed 與 delivery 工具
    Tests/                    整合與 review regression 測試
    *.py                      python -m 的薄入口
```

Domain 不知道 HTTP 或 D1／SQLite。應用層描述用例，adapter 處理平台協定與持久化細節；入口負責組合依賴。Node runtime 的一次性匯入與合成 seed 不提供線上入口，保留在測試 fixture 中。

Board 在 repo 根目錄保留單一 package、版本、CI 與 Sites 部署。目錄採 PascalCase；`src`、工具規定的 `.openai`、Drizzle `meta` 及產物路徑保留其既有名稱，檔名不強制改成 PascalCase。舊來源定位與新命令見 [搬移指南](.dev/guides/source-layout-migration.md)。

依賴由外向內：Domain 不依賴 Application 或外層；Application 依賴 Domain 與自己定義的 ports；Infrastructure 實作這些 ports，不依賴 Presentation。Web 只處理呈現、瀏覽器狀態與 HTTP 呼叫，不 import 核心或伺服器來源。`Contracts/` 只放可攜訊息規範與向量，不成為共用 domain 實作或雜項工具目錄。正式產品不依賴 Python 原型。

組裝留在各入口附近：WebApi 的 `entry.mjs` 與 `collaboration-services.mjs` 選擇 D1、身分與 clock adapters；Cli 的 `main.mjs` 建立遠端 client 並交給 `run.mjs`。Mcp 目前由 WebApi host 提供 transport。入口的組裝可以依賴 Infrastructure，其餘展現處理使用注入的能力。沒有獨立 Hosts／CompositionRoots 專案，也不為統一注入建立全域容器；不同入口必要的重複組裝可保留。尚未實作的 Desktop、GraphQL 不建立空模組。

`src/Tooling/build.mjs` 是部署產物組裝點：先編譯 Web，再將產生的 HTML／JS 注入 WebApi 的頁面供應入口，最後輸出一個 Worker ESM。原始碼分區不要求分開部署。未來拆成前後端服務時，從此組裝點與前端 HTTP client 調整資源供應、API origin、認證及跨來源策略，核心與 wire contracts 可保留；這些未來部署能力目前未宣稱已驗證。

架構測試檢查上述來源依賴與 import 路徑大小寫；它是本次重構的邊界防護，不代表完整 CA 合規認證。

Board 的內層只接收 plain DTO、已解碼 records、語意錯誤及注入的 clock／source projection。HTTP status、URLSearchParams、D1 results 與 JSON row decoding 由 adapters 處理。架構檢查及替代 ports 的行為測試約束此方向。

`workflow-board/collaboration/1` 為獨立協作 profile，使用一個 Workflow aggregate 維護 task DAG、assignment generation、plan／decision revisions 及必要交付。其 domain reducers 與 application 命令接受用例已有本機 BDD automation；19 種 commands、8 種 query DTO 與 JS／Python hash 向量見 [協作契約](src/Contracts/CollaborationV1/README.md)。新協作 repository 的 accept／reject 必須原子綁定 operation digest，不能把 unknown 當成已拒絕。

WB-04 MVP 已加入 D1 adapter、不可變 query snapshots、HTTP／MCP routes 與伺服器設定的 Agent binding adapter，並通過本機 SQL／transport 驗證。協作資料使用獨立資料表；命令以單一 batch 保存 accepted／rejected outcome，CAS、快照、facts 與事件均受同一 attempt 保護。快照分段保存以避免大 aggregate 成為單一大列；文件 facts 保留指定版本原文。Query application 只接收 decoded repository 值。

2026-10-15 已在第 10 版完成真實 Site plugin client 的兩組合成讀寫、回執恢復／重送、分頁與歷史快照，並比對 hosted D1 的 2 個 heads 與 18 筆 operations。2026-10-17 補齊單 owner 範圍權限／撤銷的本機驗證及介面比較；使用者確認合成畫面，tokens／debit 未量測，沒有節省宣稱。D1 故障／備份還原另屬 #6。身分與 store 設定缺少時拒絕存取；本次採用的單 owner binding 不能區分同 owner 下的不同 Agent sessions，也不授予 human／decide／change_scope。部署與接入狀態見 [MVP 操作說明](Docs/collaboration-mvp.md)。舊人工 profile、legacy、source snapshot 及 Python 原型保持各自語意。

既有人工／legacy profile 的重構保留命令接受、CAS、event 與 receipt 的原子性。相同 operation ID 的重試先讀持久 receipt，仍檢查 payload 與 principal；不以新 revision 自動重播衝突。既有 hosted 資料表、migration bytes、source catalog 與私有身分語意保持相容。

Python portable restore 還有較重的 application/adapter 協作，沒有宣稱所有交易細節都已抽象成完全可替換的 storage port。現階段以保留可驗證的契約與清楚的功能邊界為優先；不新增沒有用途的 aggregate base class、泛用 repository 或 DI framework。

網站信任 Sites 轉送的 authenticated-user header。若將來改用其他 hosting，必須提供新的可信身分 adapter 與實際資料遷移驗證，再進行切換。

#16 CLI 的遠端 HTTP client 只使用 versioned DTO，不讀寫 DB。
collaboration HTTP 的新增服務認證 adapter 以 server-side token digest 映射到
既有 owner，再解析原 `COLLABORATION_BINDINGS`，沒有建立另一套 actor 或 domain
規則。Sites 服務存取只負責私有 origin 入口，Board 專用 credential 才負責此
應用程式的身分綁定；兩者必須分開。既有 MCP 仍採原 Sites identity adapter。
2026-10-20 已部署至既有私有 Site 並完成合成驗收；Windows 啟動 adapter 從目前
使用者的認證管理員讀取 profile，只向 Node 子程序注入秘密，不改變業務契約。
設定與使用契約見
[CLI 說明](Docs/cli.md)。

`dist/`、`node_modules/`、preview 狀態與 `.runtime/` 均由根目錄 `.gitignore` 排除。原 repository policy checker 已於 `3e7ee13` 移除；SQL migrations 和唯讀 catalog 是可重現的來源輸入，保留在 Git。
