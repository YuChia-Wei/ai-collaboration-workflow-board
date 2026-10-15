# 程式碼結構與依賴方向

以 workflow 的領域規則與既有契約為整理單位，採用 DDD 的領域分類、Clean Architecture 的依賴方向，以及 Hexagonal Architecture 的 ports/adapters。Board 新協作模型以 Workflow 為聚合根，task／document 是其邊界內的成員。Board 與 local 原型分開演進，不為相似的名稱共用不同的資料模型。

```text
src/
  board/
    frontend/                  瀏覽器 HTML、樣式、互動與 HTTP client
    backend/
      domain/                  workflow 規則、值、錯誤與摘要
      application/             commands、queries 與 repository ports
      adapters/inbound/http/   Request、Response、路由與 Sites 身分入口
      adapters/inbound/mcp/    協作工具、JSON-RPC transport 與共用錯誤映射
      adapters/inbound/shared/ 嚴格 JSON wire parser
      adapters/outbound/d1/    D1 SQL、持久資料、交易 batch
      adapters/outbound/runtime/ 系統時鐘 adapter
      adapters/outbound/static/  固定來源 catalog adapter
      index.mjs                後端依賴組裝入口
      schema/migrations/       資料庫版本與 Drizzle metadata
      data/                    固定來源版本的唯讀 catalog
    contracts/collaboration-v1/ JSON schemas、跨語言向量及接受協定
    scripts/                   建置、產物驗證與本機 preview 工具
    tests/                     契約與 adapter 測試
  local/
    domain/                    驗證、序列化與 command reducer
    application/               workflow 服務、可攜套件驗證
    adapters/inbound/          HTTP server、CLI、MCP
    adapters/outbound/         SQLite 與 HTTP client
    assets/                    HTML 與匯出 schema
    tools/                     fixture seed 與 delivery 工具
    tests/                     整合與 review regression 測試
    *.py                       python -m 的薄入口
```

Domain 不知道 HTTP 或 D1／SQLite。應用層描述用例，adapter 處理平台協定與持久化細節；入口負責組合依賴。Node runtime 的一次性匯入與合成 seed 不提供線上入口，保留在測試 fixture 中。

Board 保留單一 package、版本、CI 與 Sites 部署。Frontend 只處理呈現、瀏覽器狀態與 HTTP 呼叫，不 import backend；backend 不 import frontend 原始碼。`contracts/` 只放可攜訊息規範與向量，不成為共用 domain 實作或雜項工具目錄。架構測試檢查雙向來源依賴邊界。

`scripts/build.mjs` 是部署組裝點：先編譯 frontend，再將產生的 HTML／JS 注入 backend 的頁面供應入口，最後輸出一個 Worker ESM。原始碼分區不要求分開部署。未來拆成前後端服務時，從此組裝點與前端 HTTP client 調整資源供應、API origin、認證及跨來源策略，後端 domain／application 與 wire contracts 可保留；這些未來部署能力目前未宣稱已驗證。

Board 的內層只接收 plain DTO、已解碼 records、語意錯誤及注入的 clock／source projection。HTTP status、URLSearchParams、D1 results 與 JSON row decoding 由 adapters 處理。架構檢查及替代 ports 的行為測試約束此方向。

`workflow-board/collaboration/1` 為獨立協作 profile，使用一個 Workflow aggregate 維護 task DAG、assignment generation、plan／decision revisions 及必要交付。其 domain reducers 與 application 命令接受用例已有本機 BDD automation；19 種 commands、8 種 query DTO 與 JS／Python hash 向量見 [協作契約](src/board/contracts/collaboration-v1/README.md)。新協作 repository 的 accept／reject 必須原子綁定 operation digest，不能把 unknown 當成已拒絕。

WB-04 MVP 已加入 D1 adapter、不可變 query snapshots、HTTP／MCP routes 與伺服器設定的 Agent binding adapter，並通過本機 SQL／transport 驗證。協作資料使用獨立資料表；命令以單一 batch 保存 accepted／rejected outcome，CAS、快照、facts 與事件均受同一 attempt 保護。快照分段保存以避免大 aggregate 成為單一大列；文件 facts 保留指定版本原文。Query application 只接收 decoded repository 值。

2026-10-14 已部署第 7 版，讀回 hosted D1 新表與平台 MCP discovery；真實 Site plugin client 的合成讀寫及 D1 故障情境仍未驗證。身分與 store 設定缺少時拒絕存取；本次採用的單 owner binding 不能區分同 owner 下的不同 Agent sessions，也不授予 human／decide／change_scope。部署與接入狀態見 [MVP 操作說明](src/board/COLLABORATION-MVP.md)。舊人工 profile、legacy、source snapshot 及 Python 原型保持各自語意。

既有人工／legacy profile 的重構保留命令接受、CAS、event 與 receipt 的原子性。相同 operation ID 的重試先讀持久 receipt，仍檢查 payload 與 principal；不以新 revision 自動重播衝突。既有 hosted 資料表、migration bytes、source catalog 與私有身分語意保持相容。

Python portable restore 還有較重的 application/adapter 協作，沒有宣稱所有交易細節都已抽象成完全可替換的 storage port。現階段以保留可驗證的契約與清楚的功能邊界為優先；不新增沒有用途的 aggregate base class、泛用 repository 或 DI framework。

網站信任 Sites 轉送的 authenticated-user header。若將來改用其他 hosting，必須提供新的可信身分 adapter 與實際資料遷移驗證，再進行切換。

`dist/`、`node_modules/`、preview 狀態與 `.runtime/` 均由根目錄 `.gitignore` 排除。原 repository policy checker 已於 `3e7ee13` 移除；SQL migrations 和唯讀 catalog 是可重現的來源輸入，保留在 Git。
