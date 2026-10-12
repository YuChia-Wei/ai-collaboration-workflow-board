# Python local workflow-record 原型規格

## 文件狀態與有界脈絡

本 production/entity/adapter 草案的來源版本為 `3e7ee13cda8de27c8a069a062ffd0d289584722e`；`LP-*` 為草案 ID。本文從來源恢復「已觀察到的合成、本機紀錄服務」，沒有宣稱新的產品核准、實際測試執行、真 coding-agent E2E 或 hosted adapter 相容。規範來源為 `src/local/README.md`、`ARCHITECTURE.md`、`PLATFORM-CONTRACT.md`；精確 code anchors 列於末段。

Local Workflow 是工作紀錄 aggregate，包含 steps/documents/evidence/logs/handoffs/approvals。它不是 task board dispatch engine，也不是新協作 Workflow 的 assignment-generation 模型；不得把同名欄位直接跨 profile 遷移。所有 evidence command 都只是描述；服務不執行 shell/SQL、不建立外部 Issue、不發布、不暗中寫 Git 作 fallback。

## Identity、授權與 concurrency

`LP-01`：bindings 為 token→`{principal,namespaces:{namespace:[roles]}}`。ROLES=`read/write/approve/export`，各 permission 必須個別存在；write 不自動 imply read/export/approve。Token 缺 binding→401 unauthenticated；namespace 沒有該 role→403 forbidden。Read/context/document/event/blob/operation 需 read，command 除 approve 都需 write，approve 需 approve，export 需 export。Binding 檔與 token 不寫 tracked source、browser storage 或 export。這是 local synthetic bearer binding，不是生產 login。

Command envelope：`namespace/workflow_id/operation_id/expected_revision/type/payload`，optional `client/session`（缺則 unknown）；namespace/operation ID 非空 string，client/session 為 nonblank text。expected_revision 是 type=int 且≥0，bool 拒絕。payload object，type 僅九種 command。Principal 來自 binding；client/session 自報，不供授權或 Agent identity。

`LP-02`：operation identity 為 namespace+operation_id。先驗證 principal/command permission，再在 write transaction 查 accepted receipt；相同 principal 且完整 command canonical hash 相同→回原 receipt，不重新 CAS。不同 principal/payload→409 idempotency_payload_mismatch。新命令全 workflow revision CAS；子 step/document 不獨立 CAS，不自動改 revision 重播。create expected=0 且 workflow ID 未存在；現況 has_workflow 按 ID 全 store 判重，不僅 namespace。

成功 result 精確欄位：`accepted:true,operation_id,workflow_id,revision,event_seq,payload_hash,principal`。接受後 workflow revision+1，event before/after 連續且綁定 command/operation/principal/client/session/identity_source/time；blob bytes、aggregate、event、receipt 同交易，任一步失敗全部 rollback。Rejected 命令沒有接受 receipt/event。receipt query 404 不必然證明網路失敗前未寫入，須以原 operation reconciliation 處理。

## Workflow、step 與 evidence 不變量

Workflow 要非空 id/namespace/title/goal/authorized_scope/policy_version/template_version/next_step/next_owner；source 要 object，repo/commit/branch 皆 nonblank。這裡 repo 是 provenance，不額外宣告 HTTPS 規則。status planned/active/blocked/completed；revision非負 int；required_documents 為 unique nonblank string list；legacy_mapping object、external_links list、limitations nonblank string list；steps/documents/evidence 為 maps。各 identity 必須與 map key 一致。

`LP-03`：Workflow 和 step 狀態邊均 planned→active、active→blocked/completed、blocked→active，completed terminal。Step 需非負 int order、nonblank title/owner_skill、unique existing evidence IDs、blockers text list、result null或string。Completed step 要非空 result 且至少一筆 evidence。Completed workflow 要至少一 step、全 completed、所有 required documents 存在且未 tombstone。每個 command 都驗證合併 candidate，包括已完成 aggregate；可追加 valid log/document addenda，但不得新增 unfinished step 或移除完成所需 evidence/document/result。Valid failed/blocked/interrupted evidence 可以支持完成調查，result 必須如實描述結果；沒有「outcome 必須 passed」條件。

`LP-04`：Evidence 要非空 id/command/result/source_commit，outcome 僅 passed/failed/interrupted/blocked（無 not_run）。environment 必須非空 object，key nonblank；值僅 str/int/float/bool，不能 null，文字不能空白。所有 evidence 都保存 blob_hash/observed_at，blob_base64 缺省為空 bytes；base64 嚴格驗證，decoded ≤1MiB，SHA-256 bytes 作為 immutable identity。Evidence 不接受空殼 completion shell；保存 evidence 字串不表示實際執行或 provider 證明。

## 命令目錄

| Type | payload 與前置條件 | 結果及拒絕 |
| --- | --- | --- |
| create_workflow | title,goal,authorized_scope,source,policy_version,template_version,next_step,next_owner 必須在 payload；optional required_documents/legacy_mapping/external_links/limitations | 建立 planned、空子集合，revision1；missing_field/invalid_workflow_field/invalid_source_provenance；exists→409 already_exists |
| update_workflow | 僅 next_step,next_owner,limitations,required_documents,blockers,status | 檢查 status 邊與全 candidate；invalid_workflow_fields/illegal_transition |
| add_step | unique string id，order,owner_skill,title | 加 planned step、空 blockers/evidence、result null；invalid_or_duplicate_step/missing_step_fields/invalid_step_fields |
| update_step | 僅 id,status,blockers,result,evidence_ids；step 存在 | 合法 lifecycle + merged invariant；step_not_found/invalid_step_fields/illegal_transition/missing_required_evidence |
| document | id/action=create,revise,rename,archive；create optional name/kind/step_id/required，step_id若有需存在 | 文件版本規則見下段；missing_document_id/invalid_document_action/document_exists/document_not_found |
| log | text 為 string，最終 aggregate validator 要 nonblank | 追加 payload+at；missing_log/invalid_logs |
| handoff | next_step,next_owner,blockers,failures,limitations 都存在且類型/文字合規 | 追加 handoff+at，更新 workflow next fields；incomplete_handoff/invalid_handoff |
| evidence | 上述 provenance/environment，optional blob_base64 | immutable evidence+blob bytes，同交易；invalid_blob/blob_too_large/invalid_or_duplicate_evidence |
| approve | document_id 存在、最新 revision final、principal 從未為該 workflow authored document event | append approval `{document_id,revision,principal,at}`；document_not_found/not_final/403 independent_approval_required |

局部 reducers 的 payload whitelist 不是全 commands 統一 strict closed schema：create/add_step/log/handoff 等保留來源可接受欄位，不自行新增拒絕規則。最終 candidate validator 是共同 gate。Unsupported ACL/publish/SQL/provider command→403 unsupported_command。

`LP-05`：獨立 approval 採保守 workflow-wide authorship：曾為該 workflow authored document event 的 principal 都不能 approve，即使不是當前文件作者。Approval 指向精確 final revision；後續 successor 不改原 approval 指向。歷史 approval 在 preflight 檢查其 final reference、principal/role 與 replay admission；當前 token 不從歷史角色授權。

## Document identity、version chain 與 retirement

Document 為 id/name/kind/step_id/required/deleted/revisions；name/kind nonblank，step ref 若有必須存在，required/deleted 必須 bool。create 必須新 identity，revision從1開始；content為string（可空），hash=SHA256 UTF-8，previous=`n-1`（首版null）、final bool、relation、finding_ids/decision_ids unique text list、created_at。relation 僅 null/erratum/addendum/successor/derived；若前版final，只可 erratum/addendum/successor。Final 原文不能覆寫。

`LP-06`：rename只更新name；archive保存deleted/deleted_at，保留全部內容及tombstone。required=true 文件必須留在 required_documents index；當 ID 在 index 內，任何 lifecycle archive 都422 required_document_archive_forbidden。這不是先 archive 再 restore API，原型無 required retirement/replacement 命令。Optional tombstone 可 export/restore 且精確舊版仍可讀；deleted 文件不允許新的 revise/rename/archive。

## Reads 與 transport 契約

`LP-07`：context 在單一 read transaction 讀 workflow+events，回完整 retained document revisions/evidence、不截斷；document_index 回 id/name/deleted/required 與 revision/hash index。包含 `complete:true`, missing_required_documents，`pending_outbox:'client-local: inspect CLI outbox before handoff'`, `source_check_required:true`, `external_observations_are_current:false`。完整 context 不表示外部 Issue/Git 現況仍有效；接手者需檢查 drift 與 client outbox。

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

## CLI、outbox 與 MCP

CLI提供 context/list/operation/export/submit，base預設http://127.0.0.1:8765、namespace demo、token可由WORKFLOW_TOKEN提供。HTTP client timeout=3秒且關閉proxy；這是現行binding，不是產品全域SLA。Read輸出 `{status,data}`，成功 exit0 否則1；export只在200寫output。submit讀JSON檔及指定outbox，輸出持久entry。Outbox必須在Git以外或explicitly ignored且untracked runtime目錄；tracked/nonignored paths拒絕，不偷偷把紀錄寫進repo。

`LP-08`：entry保存 command/status/attempts/observations，status pending/accepted/conflict/rejected，same ID另一command本機即拒絕。每次retry先read receipt；200且payload_hash相符→accepted、不同→conflict；401/403→rejected；404才允許原command POST；其他lookup failure保持不確定。Lifetime最多3 attempts，跨session持久化；lookup network failure也消耗attempt防無限迴圈。POST200 accepted，409 conflict，其他<500 rejected，5xx/network保留pending。最後仍可一次bounded read-only reconciliation；exhaustion時pending+retry_exhausted=true，不再POST。檔案以temp+replace保存。不能改身份、換Git儲存或自動增revision逃避conflict。

`LP-09`：MCP為stdio每行JSON-RPC2.0，initialize回protocol2025-03-26、serverInfo local-workflow-records/0.1.0、tools.listChanged=false；必須initialize及notifications/initialized後才tools/list/call，ping回{}。Tools僅workflow_context(namespace,workflow_id)、workflow_command(command)、operation_result(namespace,operation_id)。Tools/list schemas對外禁止附加欄位，但bridge實際轉發仍由HTTP/application驗證，不聲稱bridge完整schema驗證。Call result為text content JSON `{status,data}` 且isError=status≥400；unknown method→-32601；bridge解析/參數/未知tool例外→-32602。Token取environment，不從tool argument授權。這個協定integration不代表已配置/驗證Codex、Claude、Gemini完整Agent操作。

## Export format、preflight 與 clean restore

`LP-10`：package唯一top-level keys manifest/payload；manifest format=workflow-portable、version/schema_version=1、namespace、cutoff_seq=max exported event seq（空0）、exported_at、payload_sha256、counts、secrets_included=false、identity_rebinding_required=true、external_effects_enabled=false。payload唯一keys workflows/events/operations/blobs/role_mapping；前四中的blobs為hash→base64 map，其餘list。包含所有workflow IDs/source/old refs/doc revisions/tombstones/events/acceptedoperations/attachment bytes。role_mapping為principal+roles的歷史描述，絕不含bearer。

Portable hashing 以 JSON 的 Unicode 原字元、遞迴排序 object keys、compact separators（逗號/冒號）序列化，再對 UTF-8 bytes 作 SHA-256；array 保留順序。`ensure_ascii=false` 不把非 ASCII 文字轉成 escape。內容 revision hash 使用 UTF-8 原文，blob 使用 bytes。不得把 Python portable hash 替換成 Board 或新協作 hash 而不改 version/向量。現況 Python serializer 未禁止 NaN 等 Python JSON 擴充數值；跨語言重建是否需收緊，必須另定相容策略，不自行宣告為嚴格 JSON。

`LP-11`：preflight 不寫 target，依序確認 format/安全 flags/payload hash/counts/型態、unique workflow/operation/principal IDs、role 子集合、namespace 關係、seq 唯一且遞增、每個 workflow event revision 從 0 連續 +1、command expected_revision/type/refs/client/session、operation digest/principal 和精確 accepted receipt、event/operation 數量/cutoff、blob base64/hash、全部 aggregate/document chain/hash/reference/completion/approval。不符合回對應 422，例如 unsupported_schema/unsafe_manifest/package_hash_mismatch/count_mismatch/event_revision_gap/invalid_operation_result/blob_hash_mismatch/invalid_workflow_revision；不良結構統一 invalid_package_structure。

其後在 isolated in-memory local repository 按歷史 role 建立 replay service，逐 event 套用 local reducers，比對作者提供的 semantic workflow 與 blob bytes。只排除 service 生成的 at/deleted_at/created_at/observed_at 時間；作者內容、關係及結果不得忽略。history_snapshot_mismatch/history_blob_mismatch 拒絕。此校驗不重播 webhooks/provider writes，不建立 target。即使重新計算 hash 的快照仍需 history 語意校驗，不能僅用 hash 當安全證明。

`LP-12`：restore 先完成 preflight，target 已存在→409 restore_requires_new_store；explicit new bindings 必須至少一個該 namespace 的 write principal，否則 explicit_rebinding_required。在 target 同 directory 建立 unique `.restore-*.sqlite`，匯入全部 durable tables 與 role history，讀回比對 workflow/events/operations/blob bytes，checkpoint/flush/fsync 後以 os.link 原子且不覆寫的方式發布。既有 target 或 publication race 必須保護另一 owner 的 file；不支援 hard-link 的 filesystem 直接失敗，不用覆寫 fallback。失敗只清自己的 temporary/WAL/SHM，不能刪 target；process kill 可留可辨識 orphan，但不能發布空 final store，retry 用新 temp file。

Restore 不 replay commands、不帶舊 token、不發 external effects；新 current bindings 與 historical roles 分開。Export → preflight → 停用舊 store → restore 新 store → 拒舊 token → 接受新 event 是 local exit 驗證目標，不能據此宣告 D1/R2/PostgreSQL 遷移或真實 workflow cutover 完成。

## Runtime binding 與待驗證條件

現況 Python 3.13 + Git、標準函式庫、SQLite WAL，無 pip package 要求；composition root 為 `src/local/service.py`；薄入口為 `python -m src.local.service/client/mcp_bridge/demo`（各自選一個 module）。Runtime/DB/bindings/outbox/evidence 位於 ignored `.runtime`，不污染 tracked source。Seeder 拒絕覆寫 existing store。本文不規定新的部署 port 或真 token，README 示範 fixture 只供合成測試。

待驗證 oracle 為 `LP-01` role 隔離/approval、`LP-02` same ID/hash/principal/CAS/rollback/response loss、`LP-03..06` completion/evidence/final/tombstone、`LP-07..09` 完整 context/精確 revision/outbox budget/MCP fresh session、`LP-10..12` 附件完整性/receipt-history tamper/no-overwrite/interruption/rebinding。正式測試另見本目錄 test 規格；歷史 README 列出的接受與 review 結果只適用其原 immutable subjects，本次草案不重新認證。

來源綁定（全部上述 HEAD）：`src/local/domain/{workflow,validation,serialization}.py`；`application/{workflows,ports,portable}.py`；`adapters/inbound/{http,cli,mcp}.py`；`adapters/outbound/{sqlite,http_client,portable_sqlite}.py`；`assets/{ui.html,export-schema.json}`；`src/local/README.md`。開放決策：生產 identity/provider/storage、完整 required retirement、export retention、真 Agent integration、跨 DB/object store 交易及 real-data migration 皆仍未由 local 成功解決。`PLATFORM-CONTRACT.md` 的 Sites/D1/R2 未實作陳述僅指這個 local profile，不能誤讀為 repo 沒有獨立 Worker Board。
