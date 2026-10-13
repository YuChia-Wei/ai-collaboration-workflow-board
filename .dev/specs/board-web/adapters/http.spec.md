# 現行 Board HTTP 與 Sites 身分 adapter

## Context and sources

- Type：`adapter`；operation：`spec-author normalize`。
- Status/version：2026-10-13 正規化草案 v2；整理既有內容，沒有新增產品政策或核准。
- Owner/context：Board inbound HTTP。
- Scope：既有人工/legacy/source routes、trusted owner、Origin、query coercion、error mapping；沒有新協作 routes。
- 文件搬移基線：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；行為來源基線：`3e7ee13cda8de27c8a069a062ffd0d289584722e`（src 未變）。
- Source authority：GitHub Issues／Projects、ARCHITECTURE.md、PLATFORM-CONTRACT.md 與 relevant src README 保持各自權威。程式推導屬來源觀察，不等於產品意圖已核准。
- IDs：保留舊 EB／BA／LP 規則 ID；本次不改正式測試 ID，不執行產品測試或宣稱 hosted capabilities。

## Interface contract and mapping

`BA-01`：`/` GET 回組裝後頁面（HTML UTF-8、no-store、nosniff）；API paths 需 `/api/`。`/api/source-import` 一律 `import_forbidden`。其餘 API 由部署提供 resolveOwner；Sites adapter 讀 `oai-authenticated-user-id`，其可信前提是 Sites 移除 caller 偽造 header 並注入平台身分。Owner 缺失→401 signin_required；移到其他 hosting 必須建立可信身分 adapter，不能直接暴露相同 header 信任規則。

| Method/route | 輸入 | 結果、重要對應 |
| --- | --- | --- |
| GET `/api/source-status` | authenticated owner | dataset/counts/manifest hash/projection availability |
| GET `/api/workflows` | q/status/kind/owner_skill/mode/offset/limit | list DTO；HTTP 先 parse/default/clamp 分頁參數，詳見下段；直接 application DTO 的非法 bounds 才由 application 拒絕 |
| GET `/api/workflows/{id}` | mode 預設 auto | `{workflow,missing_required_documents}`；404 not_found |
| GET `/api/workflows/{id}/documents/{docId}` | mode，revision 0 為最新 | `{document,revision}`；Board/source 支援；legacy 沒有此 query mapping |
| GET `/api/operations/{id}` | owner 隔離 operation ID | 持久接受 receipt；不存在404 operation_not_found |
| POST `/api/commands` | JSON command，≤300,000 UTF-8 bytes | profile=framework-board/1 → boardCommand；沒有 profile→legacyCommand，但禁止 legacy create；其他 profile→501 unsupported_profile |

POST Origin absent 或等於 request URL origin 才允許，否則403 origin_forbidden。此為現行同源門檻，不等於新的跨 origin CORS 契約。JSON parse/object/envelope failures→422。既有 handler 的 parse 採一般 JSON.parse；新協作 strict wire parsing（duplicate key 等）不能誤宣稱全部既有 API 已套用。

既有 HTTP pagination 的精確轉換是十進位 `parseInt`：offset 缺省／無法解析時為 0，再限制至少 0；limit 缺省／無法解析或解析為 0 時為 30，再限制 1–50。因此 `offset=-1` 變 0、`limit=999` 變 50、`limit=0` 變 30、`limit=abc` 變 30；不能將這些 HTTP 請求統一改為 422。Application 接收已轉換的 plain DTO；直接呼叫 application 時不合法 bounds 的拒絕仍保留。這是舊介面的相容行為，不替新協作 query 決定寬鬆解析規則。

`BA-02`：Fault category→HTTP：invalid422、not_found404、conflict409、forbidden403、unauthenticated401、limit_exceeded413、unsupported501、unavailable503。舊 API body 為 `{error,...details}`；未識別 exception 對外503 `{error:storage_unavailable}`，server 可記錄概略錯誤。協作共用 mapping 定義 `{error,category,details}`，但 mapping 函式存在不是 transport route 已存在。Board MCP 目前只有 errors mapping，沒有完整協作 tools transport。

## Failure contract

BA-02 的 category/status/body 及 BA-01 origin/profile/authentication 拒絕均屬 transport mapping；business commands 在 application 執行。

## Technical binding

Worker composition root 注入 createApplication/getPage/resolveOwner；Sites header 信任有平台前提，其他 hosting 需替換可信 resolver。現行 parser 一般 JSON.parse；協作 strict parser 不代表已套用舊 route。

## Verification expectations

BA-01/02：每 route 的 mapping、profile separation、owner/Origin、防偽造、pagination coercion、storage failure；沒有本次 HTTP 執行。 本次僅文件正規化與來源/內容核對；不是 scenario 執行結果。

## Assumptions, conflicts and open decisions

新 hosting、cross-origin credential、真 client 與 revoked identity 行為仍待決策/驗證。

## Source bindings and coverage limits

src/board/backend/adapters/inbound/http/{handler,queries,errors,responses,sites-identity}.mjs；adapters/inbound/mcp/errors.mjs；backend/index.mjs。 Source path 以 repository root 或該段明示的 src/board/backend、src/local 基底解析；全部綁定行為來源 commit。歷史測試與 provider 證據仍只適用各自 immutable subject；本次沒有重新認證。
