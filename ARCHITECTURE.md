# 程式碼結構與依賴方向

以 workflow 的領域規則與既有契約為整理單位，採用 DDD 的領域分類、Clean Architecture 的依賴方向，以及 Hexagonal Architecture 的 ports/adapters。Board 新協作模型以 Workflow 為聚合根，task／document 是其邊界內的成員。Board 與 local 原型分開演進，不為相似的名稱共用不同的資料模型。

```text
src/
  board/
    domain/                    workflow 規則、值、錯誤與摘要
    application/               commands、queries 與 repository ports
    contracts/collaboration-v1/ JSON schemas、跨語言向量及接受協定
    adapters/inbound/http/      Request、Response、路由與 Sites 身分入口
    adapters/inbound/mcp/       共用 domain 錯誤映射；尚無協作 transport
    adapters/inbound/shared/    嚴格 JSON wire parser
    adapters/outbound/d1/       D1 SQL、持久資料、交易 batch
    adapters/outbound/runtime/  系統時鐘 adapter
    adapters/outbound/static/   固定來源 catalog adapter
    index.mjs                  依賴組裝入口
    web/                       瀏覽器 UI
    schema/migrations/         資料庫版本與 Drizzle metadata
    data/                      固定來源版本的唯讀 catalog
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
  tools/
    check_repository.py        src 與生成產物政策
```

Domain 不知道 HTTP 或 D1／SQLite。應用層描述用例，adapter 處理平台協定與持久化細節；入口負責組合依賴。Node runtime 的一次性匯入與合成 seed 不提供線上入口，保留在測試 fixture 中。

Board 的內層只接收 plain DTO、已解碼 records、語意錯誤及注入的 clock／source projection。HTTP status、URLSearchParams、D1 results 與 JSON row decoding 由 adapters 處理。架構檢查及替代 ports 的行為測試約束此方向。

`workflow-board/collaboration/1` 為獨立協作 profile，使用一個 Workflow aggregate 維護 task DAG、assignment generation、plan／decision revisions 及必要交付。其 domain reducers 與 application 命令接受用例已有本機 BDD automation；19 種 commands、8 種 query DTO 與 JS／Python hash 向量見 [協作契約](src/board/contracts/collaboration-v1/README.md)。新協作 repository 的 accept／reject 必須原子綁定 operation digest，不能把 unknown 當成已拒絕。

新 profile 尚未接入生產 persistence、可信 Agent 身分、query snapshots 或 HTTP／MCP routes；現行服務不廣告此能力。Context／resume、指定文件版本讀取及 hosted storage 驗證由 #5／#6／#7 承接。舊人工 profile、legacy 與 source snapshot 保持各自相容語意，本機 Python 原型也不因此成為新協作服務。

既有人工／legacy profile 的重構保留命令接受、CAS、event 與 receipt 的原子性。相同 operation ID 的重試先讀持久 receipt，仍檢查 payload 與 principal；不以新 revision 自動重播衝突。既有 hosted 資料表、migration bytes、source catalog 與私有身分語意保持相容。

Python portable restore 還有較重的 application/adapter 協作，沒有宣稱所有交易細節都已抽象成完全可替換的 storage port。現階段以保留可驗證的契約與清楚的功能邊界為優先；不新增沒有用途的 aggregate base class、泛用 repository 或 DI framework。

網站信任 Sites 轉送的 authenticated-user header。若將來改用其他 hosting，必須提供新的可信身分 adapter 與實際資料遷移驗證，再進行切換。

`dist/`、`node_modules/`、preview 狀態與 `.runtime/` 均由根目錄 `.gitignore` 排除。CI 會檢查程式檔案位於 `src/`，並拒絕被追蹤的生成目錄。SQL migrations 和唯讀 catalog 是可重現的來源輸入，保留在 Git。
