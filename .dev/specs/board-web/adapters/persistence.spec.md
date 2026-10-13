# 既有 Board/legacy storage、clock 與 catalog ports

## Context and sources

- Type：`adapter`；operation：`spec-author normalize`。
- Status/version：2026-10-13 正規化草案 v2；整理既有內容，沒有新增產品政策或核准。
- Owner/context：Board outbound adapters。
- Scope：現行 owner-scoped repositories、operation acceptance；不提供 new collaboration storage。
- 文件搬移基線：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；行為來源基線：`3e7ee13cda8de27c8a069a062ffd0d289584722e`（src 未變）。
- Source authority：GitHub Issues／Projects、ARCHITECTURE.md、PLATFORM-CONTRACT.md 與 relevant src README 保持各自權威。程式推導屬來源觀察，不等於產品意圖已核准。
- IDs：保留舊 EB／BA／LP 規則 ID；本次不改正式測試 ID，不執行產品測試或宣稱 hosted capabilities。

## Interface contract and mapping

| Port | operations | 回值與契約 |
| --- | --- | --- |
| Clock | `now()` | UTC ISO timestamp（毫秒），注入 application，一次 command change 用同一 time |
| BoardRepository | load(owner,id), document(owner,id,docId,revision), revision(owner,id), commit(change) | load→完整既有 aggregate 或 null；document→metadata+原文精確 revision；revision→integer/undefined；commit 無成功 DTO，由 application 回 receipt |
| LegacyRepository | load,revision,commit | owner-scoped legacy aggregate，保持舊 hash/命令/receipt |
| OperationRepository | find(key),byOwner(owner,id) | find→`{digest,receipt}`/null；byOwner→receipt/null；不可洩漏其他 owner |
| SourceRepository | active,exists,record,document,detail,manifests | active dataset/null；record→dataset/workflow；document/detail may null；manifest→records/documents，用於 source hash |
| SourceProjection | dataset,list(dataset),find(dataset,id) | 靜態可用版本投影；版本不符不可宣告可用 |
| Repositories query | listRecords(owner) | board/legacy/taskCounts/documentCounts；repository 的 documented order 原樣保留 |

`BA-03`：既有命令 digest 是完整 command 的 stable JSON：object keys 遞迴排序，array 順序保留，以 UTF-8 SHA-256；string content hash 是原文 bytes。Operation key 為 `owner + ':' + operation_id`，不是 workflow-local key。先查 receipt，digest 不同→409 operation_payload_conflict，相同→回原 receipt，**先於 revision CAS**。新命令 candidate admission 接受後才 commit；commit exception 再查原 receipt，若存在回原成功；沒有 receipt 且最新 revision 不等 before→revision_conflict；其餘 transport/storage error 外映射503。Absent receipt 不足以證明失敗；此舊流程與新協作三態 outcome 契約要分開。


## Failure contract

BA-03：digest conflict、CAS conflict、storage exception 及原 receipt reconciliation；absence 不是失敗證明。

## Boundary policies

本 adapter 草案綁定 `3e7ee13cda8de27c8a069a062ffd0d289584722e`。`BA-*` 是草案追蹤 ID；程式推導的現況標示為「觀察」，不把安裝、編譯、SQLite 或 synthetic 測試當作 hosted provider 驗證。架構依據 `ARCHITECTURE.md`、`PLATFORM-CONTRACT.md`、`src/board/{frontend,backend}/README.md`、`src/local/README.md`。Domain/application 接收 plain records、語意錯誤及注入 clock；不接收 Request、D1 SQL statement 或 SQLite connection 的平台能力。Local repository 的 opaque transaction handle 與 portable restore 尚有平台協作，不能宣稱完全 storage neutral。

| 邊界 | 消費者 → 提供者 | 允許穿越的值 | 禁止推論 |
| --- | --- | --- | --- |
| Board HTTP | browser → 人工/legacy/source services | profile-aware command/query DTO、trusted owner | client-supplied owner/skill 是可信 actor |
| Board persistence | application → owner-scoped repositories | 完整 command state、change、receipt、digest | query projection 足以驗證完整 aggregate |
| Source projection | query service → static catalog + source storage | dataset、source records/document metadata | snapshot 是 live Git history 或最新外部狀態 |
| 新協作 command ports | collaboration application → future repository | access/ref、完整 invariant state、atomic acceptance、operation outcome | 現有 D1/HTTP/MCP 已支援 collaboration/1 |
| Local HTTP/CLI/MCP | loopback clients → local service | namespace-scoped command/context/receipt/package | 可跨平台公開服務或真實 Agent E2E |
| Local persistence/restore | service → SQLite/portable adapter | opaque transaction、workflow/events/operations/blobs | SQLite 原子性直接證明 D1/R2/PostgreSQL 相容 |

## Technical binding

`BA-04`：commit 必須讓 state、task/document changes、全部新增 revisions、entry、event 與 receipt 在同一 atomic acceptance，CAS expected revision 失敗不得留下其中任何寫入。D1 觀察：先 conditional UPDATE/create，後續 writes 以 workflow revision+last_operation gate 約束；operations insert 後 mutation_guard 檢查 receipt 存在，CHECK failure 迫使 batch rollback。不能替換成「batch 執行完才看 changes」：zero-row UPDATE 不一定 SQL error。需在真 provider 驗證並發二寫、同 ID不同內容、response loss、guard failure/rollback；本規格未執行這些驗證。

持久 binding 為 `board_workflows/board_tasks/board_documents/board_revisions/board_entries`、legacy tables、shared events/operations/source tables。Board task/document metadata 與 entry body 各≤64,000 bytes；revision content 分離儲存。Migration `0000/0001/0002` bytes 是既有來源輸入，不因重建草案重新編號或覆寫。Board load 聚合 parent、tasks、docs、revision metadata、entries；revision 原文按需查詢。其多查詢讀取沒有已宣告 pinned snapshot protocol；不要把新協作 snapshot 保證加到既有 load。

Workflow metadata admission 規則保留 EB-02；64,000 bytes 限制不是整個 aggregate 的歷史內容上限。

## Verification expectations

BA-03/04、EB-02：gate/guard/rollback、two writers、duplicate operation、lost response、資料/owner隔離；真 D1 需 provider 證據。 本次僅文件正規化與來源/內容核對；不是 scenario 執行結果。

## Assumptions, conflicts and open decisions

既有多查詢 load 沒有 pinned snapshot 保證。Hosting/retention/backup 不能由 synthetic ports 測試推定。

## Source bindings and coverage limits

src/board/backend/application/ports.mjs；application/{board,legacy,queries}.mjs；adapters/outbound/d1/{board-repository,legacy-repository,source-repository,repositories}.mjs；outbound/runtime/clock.mjs；outbound/static/source-projection.mjs。 Source path 以 repository root 或該段明示的 src/board/backend、src/local 基底解析；全部綁定行為來源 commit。歷史測試與 provider 證據仍只適用各自 immutable subject；本次沒有重新認證。


## Preserved source / coverage notes

Adapter acceptance 要核對每個 request→domain mapping、profile routing、owner isolation、Origin、error category/status/body、same-operation retry/CAS/unknown、complete command state、document bytes/hash、source version mismatch、pinned page expiration、transaction rollback、clean restore no-overwrite。Mock/fake repository 能驗證協調，不能代替 D1/R2 provider 原子性或真實帳號撤銷。本文沒有任何執行通過聲明。

Source anchors（全部 immutable HEAD）：`application/ports.mjs`、`application/{board,legacy,queries}.mjs`、`application/collaboration-ports.mjs`、`adapters/inbound/http/{handler,queries,errors,sites-identity,responses}.mjs`、`adapters/inbound/shared/strict-json.mjs`、`adapters/inbound/mcp/errors.mjs`、`adapters/outbound/d1/{board-repository,legacy-repository,source-repository,repositories}.mjs`、`adapters/outbound/{runtime/clock,static/source-projection}.mjs`（均於 src/board/backend）；`src/local/application/ports.py`、`src/local/adapters/inbound/{http,cli,mcp}.py`、`src/local/adapters/outbound/{sqlite,http_client,portable_sqlite}.py`。重建還需 owner 決定 hosting、身分 lifecycle、storage retention、backup/restore target、cross-origin 認證及真 Agent client acceptance；不從原型臆造 credentials、timeout 或成本承諾。
