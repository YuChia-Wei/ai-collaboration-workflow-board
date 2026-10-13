# Local portable export、preflight 與 restore

## Context and sources

- Type：`production`；operation：`spec-author normalize`。
- Status/version：2026-10-13 正規化草案 v2；整理既有內容，沒有新增產品政策或核准。
- Owner/context：Local portability application。
- Scope：三個明列互相關聯子契約：export一致cutoff、preflight唯讀校驗、restore新store/rebinding。
- 文件搬移基線：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；行為來源基線：`3e7ee13cda8de27c8a069a062ffd0d289584722e`（src 未變）。
- Source authority：GitHub Issues／Projects、ARCHITECTURE.md、PLATFORM-CONTRACT.md 與 relevant src README 保持各自權威。程式推導屬來源觀察，不等於產品意圖已核准。
- IDs：保留舊 EB／BA／LP 規則 ID；本次不改正式測試 ID，不執行產品測試或宣稱 hosted capabilities。

## Behavior contract

### Export 子契約

Actor需export permission；輸入namespace；output為下述manifest/payload；不包括bindingtokens。

`LP-10`：package唯一top-level keys manifest/payload；manifest format=workflow-portable、version/schema_version=1、namespace、cutoff_seq=max exported event seq（空0）、exported_at、payload_sha256、counts、secrets_included=false、identity_rebinding_required=true、external_effects_enabled=false。payload唯一keys workflows/events/operations/blobs/role_mapping；前四中的blobs為hash→base64 map，其餘list。包含所有workflow IDs/source/old refs/doc revisions/tombstones/events/acceptedoperations/attachment bytes。role_mapping為principal+roles的歷史描述，絕不含bearer。

### Preflight 子契約

Actor提供package；target不寫入；成功回valid/counts/payload_sha256/identity_rebinding_required/external_effects_enabled；不合規回上述LP-11錯誤。

`LP-11`：preflight 不寫 target，依序確認 format/安全 flags/payload hash/counts/型態、unique workflow/operation/principal IDs、role 子集合、namespace 關係、seq 唯一且遞增、每個 workflow event revision 從 0 連續 +1、command expected_revision/type/refs/client/session、operation digest/principal 和精確 accepted receipt、event/operation 數量/cutoff、blob base64/hash、全部 aggregate/document chain/hash/reference/completion/approval。不符合回對應 422，例如 unsupported_schema/unsafe_manifest/package_hash_mismatch/count_mismatch/event_revision_gap/invalid_operation_result/blob_hash_mismatch/invalid_workflow_revision；不良結構統一 invalid_package_structure。

歷史校驗還要依原命令及歷史角色推導作者語意狀態，比對 workflow 與 blob bytes；只能排除服務生成的時間，不忽略作者內容、關係或結果。不同→history_snapshot_mismatch/history_blob_mismatch。校驗不能對外重播副作用，也不能寫 target。具體 isolated replay binding 另見 Technical binding。

### Restore 子契約

`LP-12`：先 preflight，要求尚不存在的新 target 及至少一個該 namespace 的新 write binding；existing target →409 restore_requires_new_store，沒有明確 rebinding →explicit_rebinding_required。完整 durable state/事件/receipt/附件校驗完成前，不發布 final target；發布時不得覆寫競爭者 target。失敗不刪既有 final target；重試不使用半成品當最終 store。

具體 filesystem/SQLite 的現況選擇與故障限制另見 Technical binding，移到其他 persistence 不得降低上述可觀察保證。

Restore 不 replay commands、不帶舊 token、不發 external effects；新 current bindings 與 historical roles 分開。Export → preflight → 停用舊 store → restore 新 store → 拒舊 token → 接受新 event 是 local exit 驗證目標，不能據此宣告 D1/R2/PostgreSQL 遷移或真實 workflow cutover 完成。

## Technical binding

### Canonical serialization / hashes

Portable hashing 以 JSON 的 Unicode 原字元、遞迴排序 object keys、compact separators（逗號/冒號）序列化，再對 UTF-8 bytes 作 SHA-256；array 保留順序。`ensure_ascii=false` 不把非 ASCII 文字轉成 escape。內容 revision hash 使用 UTF-8 原文，blob 使用 bytes。不得把 Python portable hash 替換成 Board 或新協作 hash 而不改 version/向量。現況 Python serializer 未禁止 NaN 等 Python JSON 擴充數值；跨語言重建是否需收緊，必須另定相容策略，不自行宣告為嚴格 JSON。

### Local reducer replay

其後在 isolated in-memory local repository 按歷史 role 建立 replay service，逐 event 套用 local reducers，比對作者提供的 semantic workflow 與 blob bytes。只排除 service 生成的 at/deleted_at/created_at/observed_at 時間；作者內容、關係及結果不得忽略。history_snapshot_mismatch/history_blob_mismatch 拒絕。此校驗不重播 webhooks/provider writes，不建立 target。即使重新計算 hash 的快照仍需 history 語意校驗，不能僅用 hash 當安全證明。

### SQLite restore publication

`LP-12`：restore 先完成 preflight，target 已存在→409 restore_requires_new_store；explicit new bindings 必須至少一個該 namespace 的 write principal，否則 explicit_rebinding_required。在 target 同 directory 建立 unique `.restore-*.sqlite`，匯入全部 durable tables 與 role history，讀回比對 workflow/events/operations/blob bytes，checkpoint/flush/fsync 後以 os.link 原子且不覆寫的方式發布。既有 target 或 publication race 必須保護另一 owner 的 file；不支援 hard-link 的 filesystem 直接失敗，不用覆寫 fallback。失敗只清自己的 temporary/WAL/SHM，不能刪 target；process kill 可留可辨識 orphan，但不能發布空 final store，retry 用新 temp file。

LP-12 的 same-directory temporary SQLite、WAL checkpoint/fsync/os.link 是目前 restore 技術 binding；其他 store 必須保留不覆寫、完整校驗、rebind 與無外部 effects 的行為。Portable canonical/hash/NaN 限制已明列上段；schema為src/local/assets/export-schema.json。

## Verification expectations

LP-10..12：全部retainedbytes/revisions/receipts、tamper/historicalsemantic replay、newstore/nooverwrite/race/crash/rebinding；local不是D1/PostgreSQL驗證。 本次僅文件正規化與來源/內容核對；不是 scenario 執行結果。

## Assumptions, conflicts and open decisions

NaN的跨語言相容/收緊、retention/backup及真實資料migration皆待決策；SQLite成功不能當provider證明。

## Source bindings and coverage limits

src/local/application/portable.py；adapters/outbound/portable_sqlite.py；assets/export-schema.json；src/local/README.md；PLATFORM-CONTRACT.md。 Source path 以 repository root 或該段明示的 src/board/backend、src/local 基底解析；全部綁定行為來源 commit。歷史測試與 provider 證據仍只適用各自 immutable subject；本次沒有重新認證。
