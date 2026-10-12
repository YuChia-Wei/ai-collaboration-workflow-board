# 程式碼結構與依賴方向

以 workflow／task／document 聚合與既有契約為整理單位，採用 DDD 的領域分類、Clean Architecture 的依賴方向，以及 Hexagonal Architecture 的 ports/adapters。兩個實作分開演進，不為相似的名稱共用不同的資料模型。

```text
src/
  board/
    domain/                    workflow 規則、值、錯誤與摘要
    application/               commands、queries 與 repository ports
    adapters/inbound/http/      Request、Response、路由與 Sites 身分入口
    adapters/outbound/d1/       D1 SQL、持久資料、交易 batch
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

這次重構保留命令接受、CAS、event 與 receipt 的原子性。相同 operation ID 的重試先讀持久 receipt，仍檢查 payload 與 principal；不以新 revision 自動重播衝突。既有 hosted 資料表、migration bytes、source catalog 與私有身分語意保持相容。

Python portable restore 還有較重的 application/adapter 協作，沒有宣稱所有交易細節都已抽象成完全可替換的 storage port。現階段以保留可驗證的契約與清楚的功能邊界為優先；不新增沒有用途的 aggregate base class、泛用 repository 或 DI framework。

網站信任 Sites 轉送的 authenticated-user header。若將來改用其他 hosting，必須提供新的可信身分 adapter 與實際資料遷移驗證，再進行切換。

`dist/`、`node_modules/`、preview 狀態與 `.runtime/` 均由根目錄 `.gitignore` 排除。CI 會檢查程式檔案位於 `src/`，並拒絕被追蹤的生成目錄。SQL migrations 和唯讀 catalog 是可重現的來源輸入，保留在 Git。
