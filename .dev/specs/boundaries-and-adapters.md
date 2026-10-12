# 系統邊界、介面與 adapter 規格

## 狀態、方向與來源

本 adapter 草案綁定 `3e7ee13cda8de27c8a069a062ffd0d289584722e`。`BA-*` 是草案追蹤 ID；程式推導的現況標示為「觀察」，不把安裝、編譯、SQLite 或 synthetic 測試當作 hosted provider 驗證。架構依據 `ARCHITECTURE.md`、`PLATFORM-CONTRACT.md`、`src/board/{frontend,backend}/README.md`、`src/local/README.md`。Domain/application 接收 plain records、語意錯誤及注入 clock；不接收 Request、D1 SQL statement 或 SQLite connection 的平台能力。Local repository 的 opaque transaction handle 與 portable restore 尚有平台協作，不能宣稱完全 storage neutral。

| 邊界 | 消費者 → 提供者 | 允許穿越的值 | 禁止推論 |
| --- | --- | --- | --- |
| Board HTTP | browser → 人工/legacy/source services | profile-aware command/query DTO、trusted owner | client-supplied owner/skill 是可信 actor |
| Board persistence | application → owner-scoped repositories | 完整 command state、change、receipt、digest | query projection 足以驗證完整 aggregate |
| Source projection | query service → static catalog + source storage | dataset、source records/document metadata | snapshot 是 live Git history 或最新外部狀態 |
| 新協作 command ports | collaboration application → future repository | access/ref、完整 invariant state、atomic acceptance、operation outcome | 現有 D1/HTTP/MCP 已支援 collaboration/1 |
| Local HTTP/CLI/MCP | loopback clients → local service | namespace-scoped command/context/receipt/package | 可跨平台公開服務或真實 Agent E2E |
| Local persistence/restore | service → SQLite/portable adapter | opaque transaction、workflow/events/operations/blobs | SQLite 原子性直接證明 D1/R2/PostgreSQL 相容 |

## 既有 Board inbound HTTP

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

## 既有 outbound ports 與接受交易

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

`BA-04`：commit 必須讓 state、task/document changes、全部新增 revisions、entry、event 與 receipt 在同一 atomic acceptance，CAS expected revision 失敗不得留下其中任何寫入。D1 觀察：先 conditional UPDATE/create，後續 writes 以 workflow revision+last_operation gate 約束；operations insert 後 mutation_guard 檢查 receipt 存在，CHECK failure 迫使 batch rollback。不能替換成「batch 執行完才看 changes」：zero-row UPDATE 不一定 SQL error。需在真 provider 驗證並發二寫、同 ID不同內容、response loss、guard failure/rollback；本規格未執行這些驗證。

持久 binding 為 `board_workflows/board_tasks/board_documents/board_revisions/board_entries`、legacy tables、shared events/operations/source tables。Board task/document metadata 與 entry body 各≤64,000 bytes；revision content 分離儲存。Migration `0000/0001/0002` bytes 是既有來源輸入，不因重建草案重新編號或覆寫。Board load 聚合 parent、tasks、docs、revision metadata、entries；revision 原文按需查詢。其多查詢讀取沒有已宣告 pinned snapshot protocol；不要把新協作 snapshot 保證加到既有 load。

## 新協作 adapter 的必要契約與尚未實作處

`BA-05`：AccessContext=`{owner_id,actor:{subject_id,kind:human|agent,binding_id},capabilities}` 必須由可信 inbound identity/authorization adapter 提供。WorkflowRef=`{store_id,namespace:personal,record_kind:collaboration,workflow_id}` 為明確目標；owner、binding、capability 不能由使用者 command 自行授權。Clock 和 IdFactory 注入；`next(kind:assignment|handoff|checkpoint)` 產生新且抗碰撞 ID，不重用歷史 identity。

Repository 必備四個 operations：

1. `loadForCommand(owner,ref,command)`：null 或完整 `{state,invariants_complete:true,document_refs,evidence}`；不得傳裁切 query DTO。
2. `operation(owner,storeId,operationId)`：回 `{outcome:accepted|rejected,receipt}` 或 `{outcome:unknown}`。驗證 owner/store/requested target；unknown 不是 definitive rejection。
3. `accept(change)`：change 含 owner/ref/expected_revision/operation_key/digest/actor/next_state、documents/task_definitions/decision_revisions/assignments/handoffs/checkpoints/evidence facts、events、receipt。先檢查 prior digest binding，再 CAS；全 commit 或全無。
4. `reject(owner,ref,operationKey,digest,receipt)`：只持久 definitive rejection receipt，不變更 domain state/event；與 accept 同 key 序列化，不覆蓋或產生互相矛盾結果。

Assignment facts 是 assignment ref + workflow_revision 的 immutable lifecycle snapshot；close append fact，不改原 claim。Command loading 僅按 reference validation 所需讀歷史，但必須完整驗證當下 invariants。Driver exception 可造成 unknown，application 查原 operation；receipt absence 不讓 adapter 自行改 expected_revision/operation ID 再嘗試。具體 wire DTO/acceptance protocol 以 `src/board/contracts/collaboration-v1/` 和本目錄協作規格為準。

`BA-06`：query port 為 find(access,query),context(access,ref,limit),contextPage(access,ref,section,cursor),task(access,ref,taskId,definitionRevision,atRevision),decision(access,ref,decisionId,decisionRevision,atRevision),document(access,ref,documentRef)。所有 page/point read 固定同一 workflow revision；不能維持 snapshot→snapshot_expired，不偷換新版頁面／文件。可信 Agent binding/撤銷、cursor signing、query snapshots、production persistence、HTTP/MCP routes 仍是後續 #5/#6/#7 的設計/實作工作；現行服務不能廣告已支援此 profile。

## Local adapters 摘要

`BA-07`：Local HTTP 只 bind127.0.0.1；bearer→bindings 中 principal+namespace role，read/write/approve/export 分開。CLI/MCP 使用 HTTP client，不能直接碰 SQLite。Client/session 是自報 metadata。完整 route/command/package/outbox 行為見 [local-prototype.md](local-prototype.md)。local repository port 使用 opaque transaction：begin_read/begin_write、load/has_workflow、operation/events/workflows、document_authored、put_blobs/append_event/save_workflow/save_operation、export_payload/blob/all_blobs。transaction 的 commit/rollback 由 repository context manager 決定。

`BA-08`：SQLite BEGIN IMMEDIATE 把完整 command 接受流程圍在 write transaction，context/export 用 read transaction，WAL 下 state/events 一致 cutoff。可攜 export 不包含 token；歷史 role_mapping 只是描述，restore 必須提供新 current bindings。preflight 不寫 target；local reducer isolated replay 是校驗手段，絕不能重播 external effects。若改為 DB+object storage，先保存 immutable hash bytes，再 commit reference；尚未證明 cross D1/R2 transaction。Orphan 清理需要獨立 retention 決策，不得當本次 restore cleanup 延伸授權。

## Verification、開放決策及來源綁定

Adapter acceptance 要核對每個 request→domain mapping、profile routing、owner isolation、Origin、error category/status/body、same-operation retry/CAS/unknown、complete command state、document bytes/hash、source version mismatch、pinned page expiration、transaction rollback、clean restore no-overwrite。Mock/fake repository 能驗證協調，不能代替 D1/R2 provider 原子性或真實帳號撤銷。本文沒有任何執行通過聲明。

Source anchors（全部 immutable HEAD）：`application/ports.mjs`、`application/{board,legacy,queries}.mjs`、`application/collaboration-ports.mjs`、`adapters/inbound/http/{handler,queries,errors,sites-identity,responses}.mjs`、`adapters/inbound/shared/strict-json.mjs`、`adapters/inbound/mcp/errors.mjs`、`adapters/outbound/d1/{board-repository,legacy-repository,source-repository,repositories}.mjs`、`adapters/outbound/{runtime/clock,static/source-projection}.mjs`（均於 src/board/backend）；`src/local/application/ports.py`、`src/local/adapters/inbound/{http,cli,mcp}.py`、`src/local/adapters/outbound/{sqlite,http_client,portable_sqlite}.py`。重建還需 owner 決定 hosting、身分 lifecycle、storage retention、backup/restore target、cross-origin 認證及真 Agent client acceptance；不從原型臆造 credentials、timeout 或成本承諾。
