# Local HTTP、CLI、MCP 與 storage adapters

## Context and sources

- Type：`adapter`；operation：`spec-author normalize`。
- Status/version：2026-10-13 正規化草案 v2；整理既有內容，沒有新增產品政策或核准。
- Owner/context：Local inbound clients / outbound persistence。
- Scope：同一local application的現有adapters；不新增hosted平台或第三方client配置。
- 文件搬移基線：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；行為來源基線：`3e7ee13cda8de27c8a069a062ffd0d289584722e`（src 未變）。
- Source authority：GitHub Issues／Projects、ARCHITECTURE.md、PLATFORM-CONTRACT.md 與 relevant src README 保持各自權威。程式推導屬來源觀察，不等於產品意圖已核准。
- IDs：保留舊 EB／BA／LP 規則 ID；本次不改正式測試 ID，不執行產品測試或宣稱 hosted capabilities。

## Interface contract and mapping

| HTTP | 輸入/授權 | 成功 output |
| --- | --- | --- |
| GET `/` | 無 token | local record editor HTML |
| GET `/health` | 無 token | ready=true,external_effects_enabled=false,mode=synthetic-local-only |
| GET `/v1/workflows` | namespace 預設demo；optional external_link；read | workflows list；link以exact equality 在 external_links 的文字或 object.url 比對 |
| GET `/v1/workflows/{id}/context` | namespace/read | 上述 complete context |
| GET `/v1/documents/{id}/{revision}` | namespace/workflow_id/read | 指定正整數原始 revision；0不表示latest；not_found404 |
| GET `/v1/operations/{id}` | namespace/read | accepted receipt；not_found404 |
| GET `/v1/events` | namespace/after，預設0/read | seq>after 的 retained events |
| GET `/v1/blobs/{hash}` | namespace/read；hash須由該namespace evidence引用 | `{hash,blob_base64}`；不以猜中hash取得別namespace bytes |
| GET `/v1/export` | namespace/export | immutable cutoff portable package |
| POST `/v1/commands` | bearer/command permission；Content-Length 1..2MiB | accepted receipt；path或Origin不合法拒絕 |

HTTP服務只listen127.0.0.1；POST Origin只能缺省或 http://127.0.0.1:port/http://localhost:port。回 JSON UTF-8、Cache-Control no-store、Content-Length。Fault映射其status與 `{error,...details}`；解析ValueError/KeyError/TypeError→422 invalid_request。Test-only response-drop header只在fault_injection開啟時接受，不能當正式故障能力。UI為JSON command/context editor，提交前讓使用者核對 expected_revision、不同寫入換 operation ID、相同重試保留ID；文件顯示first revision及tombstone，不假裝任務派送。

## CLI / MCP interface and retry failures

CLI提供 context/list/operation/export/submit，base預設http://127.0.0.1:8765、namespace demo、token可由WORKFLOW_TOKEN提供。HTTP client timeout=3秒且關閉proxy；這是現行binding，不是產品全域SLA。Read輸出 `{status,data}`，成功 exit0 否則1；export只在200寫output。submit讀JSON檔及指定outbox，輸出持久entry。Outbox必須在Git以外或explicitly ignored且untracked runtime目錄；tracked/nonignored paths拒絕，不偷偷把紀錄寫進repo。

`LP-08`：entry保存 command/status/attempts/observations，status pending/accepted/conflict/rejected，same ID另一command本機即拒絕。每次retry先read receipt；200且payload_hash相符→accepted、不同→conflict；401/403→rejected；404才允許原command POST；其他lookup failure保持不確定。Lifetime最多3 attempts，跨session持久化；lookup network failure也消耗attempt防無限迴圈。POST200 accepted，409 conflict，其他<500 rejected，5xx/network保留pending。最後仍可一次bounded read-only reconciliation；exhaustion時pending+retry_exhausted=true，不再POST。檔案以temp+replace保存。不能改身份、換Git儲存或自動增revision逃避conflict。

`LP-09`：MCP為stdio每行JSON-RPC2.0，initialize回protocol2025-03-26、serverInfo local-workflow-records/0.1.0、tools.listChanged=false；必須initialize及notifications/initialized後才tools/list/call，ping回{}。Tools僅workflow_context(namespace,workflow_id)、workflow_command(command)、operation_result(namespace,operation_id)。Tools/list schemas對外禁止附加欄位，但bridge實際轉發仍由HTTP/application驗證，不聲稱bridge完整schema驗證。Call result為text content JSON `{status,data}` 且isError=status≥400；unknown method→-32601；bridge解析/參數/未知tool例外→-32602。Token取environment，不從tool argument授權。這個協定integration不代表已配置/驗證Codex、Claude、Gemini完整Agent操作。

## Repository boundary policies

`BA-07`：Local HTTP 只 bind127.0.0.1；bearer→bindings 中 principal+namespace role，read/write/approve/export 分開。CLI/MCP 使用 HTTP client，不能直接碰 SQLite。Client/session 是自報 metadata。完整 route/command/package/outbox 行為見 [Local 行為與查詢](../workflow/behaviors/queries.spec.md)及[可攜套件](../portability/export-restore.spec.md)。local repository port 使用 opaque transaction：begin_read/begin_write、load/has_workflow、operation/events/workflows、document_authored、put_blobs/append_event/save_workflow/save_operation、export_payload/blob/all_blobs。transaction 的 commit/rollback 由 repository context manager 決定。

`BA-08`：SQLite BEGIN IMMEDIATE 把完整 command 接受流程圍在 write transaction，context/export 用 read transaction，WAL 下 state/events 一致 cutoff。可攜 export 不包含 token；歷史 role_mapping 只是描述，restore 必須提供新 current bindings。preflight 不寫 target；local reducer isolated replay 是校驗手段，絕不能重播 external effects。若改為 DB+object storage，先保存 immutable hash bytes，再 commit reference；尚未證明 cross D1/R2 transaction。Orphan 清理需要獨立 retention 決策，不得當本次 restore cleanup 延伸授權。

## Identity mapping

`LP-01`：bindings 為 token→`{principal,namespaces:{namespace:[roles]}}`。ROLES=`read/write/approve/export`，各 permission 必須個別存在；write 不自動 imply read/export/approve。Token 缺 binding→401 unauthenticated；namespace 沒有該 role→403 forbidden。Read/context/document/event/blob/operation 需 read，command 除 approve 都需 write，approve 需 approve，export 需 export。Binding 檔與 token 不寫 tracked source、browser storage 或 export。這是 local synthetic bearer binding，不是生產 login。

Command envelope：`namespace/workflow_id/operation_id/expected_revision/type/payload`，optional `client/session`（缺則 unknown）；namespace/operation ID 非空 string，client/session 為 nonblank text。expected_revision 是 type=int 且≥0，bool 拒絕。payload object，type 僅九種 command。Principal 來自 binding；client/session 自報，不供授權或 Agent identity。

## Technical binding

### Runtime

現況 Python 3.13 + Git、標準函式庫、SQLite WAL，無 pip package 要求；composition root 為 `src/local/service.py`；薄入口為 `python -m src.local.service/client/mcp_bridge/demo`（各自選一個 module）。Runtime/DB/bindings/outbox/evidence 位於 ignored `.runtime`，不污染 tracked source。Seeder 拒絕覆寫 existing store。本文不規定新的部署 port 或真 token，README 示範 fixture 只供合成測試。


HTTP listen/Origin、3秒timeout/proxy禁用、stdio版本、opaque transaction、SQLite BEGIN IMMEDIATE/WAL、filesystem outbox temp+replace為現況binding。不是新語言/hosting通用SLA。

## Verification expectations

LP-01/07/08/09、BA-07/08：roles、routes、response errors、跨session lifetime budget、no-Git fallback、MCP初始化/工具/namespace、read/write atomicity。 本次僅文件正規化與來源/內容核對；不是 scenario 執行結果。

## Assumptions, conflicts and open decisions

生產identity/provider/storage/Agentclient/跨DB-object transaction尚未由local成功解決；orphan cleanup有獨立scope。

## Source bindings and coverage limits

src/local/application/ports.py；adapters/inbound/{http,cli,mcp}.py；adapters/outbound/{sqlite,http_client,portable_sqlite}.py；assets/ui.html；src/local/README.md。 Source path 以 repository root 或該段明示的 src/board/backend、src/local 基底解析；全部綁定行為來源 commit。歷史測試與 provider 證據仍只適用各自 immutable subject；本次沒有重新認證。


## Preserved source / coverage notes

現況 Python 3.13 + Git、標準函式庫、SQLite WAL，無 pip package 要求；composition root 為 `src/local/service.py`；薄入口為 `python -m src.local.service/client/mcp_bridge/demo`（各自選一個 module）。Runtime/DB/bindings/outbox/evidence 位於 ignored `.runtime`，不污染 tracked source。Seeder 拒絕覆寫 existing store。本文不規定新的部署 port 或真 token，README 示範 fixture 只供合成測試。

待驗證 oracle 為 `LP-01` role 隔離/approval、`LP-02` same ID/hash/principal/CAS/rollback/response loss、`LP-03..06` completion/evidence/final/tombstone、`LP-07..09` 完整 context/精確 revision/outbox budget/MCP fresh session、`LP-10..12` 附件完整性/receipt-history tamper/no-overwrite/interruption/rebinding。正式測試另見本目錄 test 規格；歷史 README 列出的接受與 review 結果只適用其原 immutable subjects，本次草案不重新認證。

來源綁定（全部上述 HEAD）：`src/local/domain/{workflow,validation,serialization}.py`；`application/{workflows,ports,portable}.py`；`adapters/inbound/{http,cli,mcp}.py`；`adapters/outbound/{sqlite,http_client,portable_sqlite}.py`；`assets/{ui.html,export-schema.json}`；`src/local/README.md`。開放決策：生產 identity/provider/storage、完整 required retirement、export retention、真 Agent integration、跨 DB/object store 交易及 real-data migration 皆仍未由 local 成功解決。`PLATFORM-CONTRACT.md` 的 Sites/D1/R2 未實作陳述僅指這個 local profile，不能誤讀為 repo 沒有獨立 Worker Board。
