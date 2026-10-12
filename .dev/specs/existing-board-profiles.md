# 既有 Board、legacy 與來源快照規格

## 文件狀態與適用範圍

本文件為 production/entity 規格草案；規則從 immutable source commit `3e7ee13cda8de27c8a069a062ffd0d289584722e` 恢復，狀態為「觀察到的既有行為」，不是新增產品政策的核准。本文的 `EB-*` 為文件內追蹤 ID。新協作 profile `workflow-board/collaboration/1` 另見本目錄的協作規格，Python 原型另見 [local-prototype.md](local-prototype.md)。不能因欄位名稱相近而混用三者狀態、身分或 hash 規則。

來源權威為 `ARCHITECTURE.md`、`src/board/backend/README.md` 與下列來源；部署平台的具體驗證仍須依 `DEPLOYMENT.md` 與 provider evidence 判定。原始 Issues 的完整核准歷程未在本文件重新驗證；code-only 規則保留此限制。重建時若要改變相容行為，應提出明確決策，而非把本草案的整理視為變更授權。

## 模型及讀寫隔離

| 模式 | 可觀察意義 | 所有權及可變性 | lifecycle |
| --- | --- | --- | --- |
| `board` | 本人線上人工紀錄；`framework-board/1` | trusted owner 的 Workflow 持有 tasks、documents、文字 evidence、logs、handoffs；可用 commands 寫入 | `pending/in_progress/completed/deferred` |
| `legacy` | 舊版線上合成紀錄；命令沒有 `service_contract_version` | trusted owner 隔離；既有紀錄可用舊 commands 更新；HTTP 禁止建立新 legacy | `planned/active/blocked/completed` |
| `source_snapshot` | 固定 repository commit 的來源原文及共通欄位投影 | 唯讀固定 dataset；不是某 owner 的執行紀錄 | 保留原值，包括 `done`、未記錄；不自動映射到新 lifecycle |

`EB-01`：同名 ID 可以存在於不同模式，選取及文件讀取必須攜帶 mode。`auto` 詳情查詢的優先順序為 Board → source snapshot → legacy。新 Board 不讀寫來源 snapshot；legacy command 若 workflow ID 存在於來源 snapshot，拒絕 `source_snapshot_readonly`。

## 人工 Workflow 的結構

| 欄位/集合 | 意義、限制、初始值 |
| --- | --- |
| `id/workflow_id` | 同一 workflow identity。ID 為 1–160 字元，首字為 ASCII 英數、其餘英數/`.`/`_`/`-`；排除 `__proto__`, `constructor`, `prototype` |
| `title/goal/workflow_kind/owner_skill/authorized_scope/next_step/next_owner` | 都是不可空白文字；不是可信 actor identity 或權限憑證 |
| `service_contract_version` | 必須 `framework-board/1`；`execution_kind=human`, `lifecycle_contract=1.0`, `schema_version=1.0` |
| `namespace/record_mode` | 固定 `personal/board` |
| `status/current_phase` | 初始 `pending/planning`；transition 可映射 `in_progress/execution`, `deferred/deferred`, `completed/completed` |
| `revision` | 新 workflow 建立前為 0；每個接受命令 +1，不能按 task/document 各自 CAS |
| `source` | `repo/commit/branch` 可省略或 null；若 repo 有值，需無 user/password 的 HTTPS URL；commit 與 branch 是來源描述，不是執行驗證 |
| `work_items` | 至多 30 個 object，各 `url` 為非空 HTTPS 開頭文字；是關聯，不建立外部 Issue/PR |
| `extensions` | object；不自動增加 domain 行為 |
| `required_documents` | document ID 索引；create required document 時加入；目前沒有退役 required document 的命令 |
| `steps` | Task 的 ID→record map；並非新協作模型的 task-definition/assignment |
| `documents/evidence/logs/handoffs` | 文件 metadata/revision 索引、文字證據、日誌與交接；不執行 evidence command 字串 |

`EB-02`：workflow 基本 metadata 的 UTF-8 JSON bytes 不超過 64,000，計算時排除 steps/documents/evidence/logs/handoffs。個別 task/document metadata/entry 的 64,000-byte storage admission 見 adapters 規格，不能誤當全部 aggregate 上限。

Task 具 `id/task_id/workflow_id/schema_version/title/owner_skill/status/order/created_at/updated_at/template_source/template_version/execution_kind/model/reasoning_effort/result_summary/finding_status/evidence_ids/dependencies/extensions`。新 task 狀態 pending，order 為現有 tasks 數 +1，`finding_status=open`、`result_summary=null`、`execution_kind=human`、model/effort null。依賴只能指向已存在且不是自身的 task；新增方向因此不建立循環。驗證不是任意 task DAG 編輯器。

## 人工命令規格

共同 envelope：`service_contract_version`, `workflow_id`, `operation_id`, `expected_revision`, `type`, `payload`。operation ID 為非空文字且至多 160 字元；payload 為 object。整個命令的 UTF-8 bytes ≤300,000。expected revision 為非負整數。payload 未列出的欄位拒絕 `invalid_fields`。成功 receipt：`accepted:true`, `service_contract_version`, `operation_id`, `workflow_id`, `revision`, `principal`, `payload_hash`。

| 命令 | payload / 前置條件 | 可觀察後置條件及主要拒絕 |
| --- | --- | --- |
| `create_workflow` | title, goal, workflow_kind, owner_skill, authorized_scope, next_step, next_owner；optional source/work_items/extensions；ID 尚不存在，expected=0 | 建立上述初始 aggregate；revision=1。存在→`workflow_exists`；錯誤 revision→`revision_conflict` |
| `update_workflow` | 只容許上述 create 可寫欄位 | 合併 candidate 後再驗證；更新 updated_at、revision。沒有 status 直接寫入，也不能更換 profile |
| `add_task` | id,title,owner_skill；optional dependencies/extensions；workflow 未 completed | 新 task pending；依賴皆已存在；重複/欄位不完整→`invalid_task`；不合法依賴→`invalid_dependency` |
| `transition` | optional task_id/status/result_summary/finding_status/deferred_reason/resume_condition/evidence_ids/next_task_id/workflow_status/workflow_result/workflow_finding_status/next_step/next_owner | 在同一 candidate 更新目前 task、可啟動下一 task、workflow 狀態與交接資訊；整組通過才接受。下段列完整不變量 |
| `document` | id,action；optional name/content/required/final/relation | action=create/revise/rename/archive；文件與 revision 規則見下段 |
| `log` | text 非空，UTF-8 ≤32,000 | 保存 `{text,at}`；entry ID 為 operation ID；`invalid_log` |
| `handoff` | next_step,next_owner 非空；blockers/failures/limitations 都是非空文字元素的 array，可空 array | 保存交接並更新 workflow 的下一步/owner；`invalid_handoff` |
| `evidence` | id 尚不存在、command/result 非空；outcome=`passed/failed/interrupted/blocked/not_run`；environment 為 object；optional source_commit | 保存 observed_at 與原 payload；`invalid_evidence`。人工 Board 未要求 source_commit 非空或 environment 非空，不可把 local 嚴格規則當既有規則 |

`EB-03`：candidate 的所有 task 都要驗證 title、owner_skill、status、evidence_ids；evidence refs 必須存在。Completed task 必須非空 result_summary 且 finding_status 為 `addressed/no_findings`，**沒有必須至少一筆 evidence 的規則**。Deferred task 要非空延期理由與恢復條件。

`EB-04`：workflow in_progress 時恰好一個 in_progress task；其他 workflow status 不得有 in_progress task。啟動 task 的依賴都必須 completed。next_task_id 只可選 pending/deferred task 且依賴完成。可在同一 transition 完成舊 task 並啟動新 task；若只完成唯一 active task 而仍保留 in_progress workflow，拒絕 `exactly_one_active_task`。completed task 不能再 transition；completed workflow 不能 add_task/transition。

`EB-05`：completed workflow 至少一 task、所有 task completed、phase completed/closed、非空 workflow result_summary、finding_status addressed/no_findings、所有 required documents 存在且未 deleted。Deferred workflow 要理由/恢復條件。人工 profile 沒有宣告完整的狀態轉移邊表；nonterminal transition 是否可返回 pending 由上述 candidate invariants 決定，不可擅加 local 的 planned→active 邊規則。完成後仍可有合規文件增補、log、handoff/evidence 或 metadata update，所有命令均重新驗證 terminal 不變量。

## 文件版本與 tombstone

`EB-06`：create 不可覆用 ID；name 預設 ID、kind=markdown、required/final 轉為 boolean。create/revise content 必須 string，UTF-8 ≤256,000；可以空字串，不能新增未觀察到的非空規則。每次內容修訂分配連續 revision 從 1 開始、保存 SHA-256(content UTF-8)、final、relation、created_at。原內容不可覆寫。若最新 revision final=true，後續需 `erratum/addendum/successor`；缺少則 `final_requires_successor`。

rename 只變 metadata name，要求非空文字；archive 保存 deleted=true/deleted_at，不刪任何 revision。當 ID 位於 required_documents，一律拒絕 `required_document_archive_forbidden`，所有 lifecycle 相同。已 deleted 文件不允許 revise/rename/archive。查閱 archived 原始 revision 仍是合法讀取；寫拒絕不等於歷史不可讀。

## legacy 相容規格

`EB-07`：狀態邊為 planned→active、active→blocked/completed、blocked→active；completed 無外出邊。Step 同樣規則。Completed step 要非空 result 且至少一筆存在的 evidence；completed workflow 要至少一 step、全完成、所有 required documents 存在未 deleted。此模型沒有人工 profile 的「恰好一 active task」要求。

legacy envelope 沒有 profile；內部服務仍具 create_workflow，但 `/api/commands` 明確禁止 create，回 `legacy_creation_disabled`。HTTP 重建若開放此入口將改變既有政策。update_workflow 僅 title/goal/next_step/next_owner/status/required_documents；add_step 要 unique id/title，order 自動追加、owner_skill 預設本人；update_step 只 id/status/result/evidence_ids/blockers。document 支援 create/revise/rename/archive，revision record 保留 previous/content/hash/final/relation/created_at/finding_ids/decision_ids；final successor 與 required archive 限制相同。log text 非空；handoff 必須完整三個 array 與 next fields；evidence 必須非空 id/command/result/source_commit、四種 outcome（無 not_run）、非空 environment 且值不得 null、文字不得空；拒絕 blob_base64 `attachments_not_supported_in_preview`。上述較寬鬆 environment 並未完全採用 Python scalar 檢查。

## 查詢、來源 catalog 與摘要

`EB-08`：list 合併 owner Board、固定 active dataset 的 source projection、owner legacy，回 `items/total/all_total/offset/limit/has_more/facets/source_commit/source_projection_available`。順序保留 repository/projection 順序；本文不新增全域 sort。q 最多 200 字元轉小寫，在 id/title/goal/owner_skill/workflow_kind/work_items URLs/referenced_work_items URLs 搜尋；status/kind/owner_skill/mode 使用精確 equality。Application DTO 要 offset≥0、limit=1..50；HTTP 先以 parse/default/clamp 轉換，預設 limit=30，負數／過大／無法解析值不必然拒絕，精確映射見 [BA-01](boundaries-and-adapters.md)。facets 為未篩選全部 records 的 distinct sorted kinds/owners/statuses；缺 status 視為 unrecorded。task/document counts 來源可為 repository 聚合；tombstone 文件計數不自動當未完成工作。

摘要至少保留 id,title,goal,record_mode,namespace,status,workflow_kind,owner_skill,current_phase,updated_at,revision,task_count,task_counts,document_count,unparsed_task_count,work_items,referenced_work_items,source(repo/commit),lifecycle_contract。缺失資訊保留 null/未記錄，不合成執行結果。

`EB-09`：source-status 回 active dataset、workflow_count、document_count、row_hash_manifest_sha256（records/documents manifest 的 canonical hash）與 projection_available。只有 active dataset 與固定 projection.dataset 相等才宣告投影可用。Source detail 有 row 而無對應投影時，提供來源 workflow 與「尚未建立共通欄位投影」note，status 從 source_status 保留，documents={}；不得補出結構化 tasks 或假裝解析完整。Source document 只有 revision=0/latest 或 1，其他 revision→`revision_not_found`；回 snapshot=true、created_at/final=null，原 repo 更早歷史未匯入。Binary source 附件只有固定版本連結/大小/hash，不保證本服務持有 bytes。

## 瀏覽器可見行為

`EB-10`：列表顯示模式、原始/映射狀態、ID、workflow_kind、owner_skill、task 完成數與文件數。completed+historical done 計入顯示完成數，done 保留「歷史狀態」標示；unparsed tasks 明示只計已辨識任務。filter/search 改變時 offset 回 0，每頁 30；空結果有提示。新 list/detail/document 請求的結果只在其 serial 仍為最新時顯示，避免舊回應覆蓋新 selection。

概覽、任務、文件、日誌、交接、證據分頁均是呈現。Source/legacy 不顯示人工編輯 actions；來源 entrypoint/locator/task 原文連結保留。Task metadata model/effort 對 human 顯示不適用；來源宣告的 model/effort 不代表可信 Agent。來源完成不代表 Issue/PR/發布/產品驗收完成。

文件選取後才載原文，Board 可選精確 revision、切換 Markdown/raw、追加 revision/rename；僅 optional 文件可 archive。Markdown parse 後 sanitize；禁止 script/style/iframe/object/embed/form/input/img/video/audio 與 style attribute。文字 metadata/raw 需 escape。相對來源連結優先連到保存的 source document；找不到時，以可信 HTTPS repo+commit 建立固定 Git 版本連結；沒有來源則去除 link；外連使用 noopener/noreferrer。不因預覽執行文件中的 command。

`EB-11`：提交前保存完整 pending command 到 sessionStorage。網路斷線、無效 JSON 或 5xx 表示未確認，保留 operation ID/payload，阻止不同新 command 搶用 pending；非未確認錯誤可清 pending，表單輸入仍保留。重試先 GET receipt，404 才 POST 原 command；成功清 pending、刷新列表與 Board detail。這是人工/legacy 已有 receipt 行為，不可移植為新協作 unknown outcome 的重新接受策略。CAS conflict 顯示需重新讀取核對，不能自動改 expected_revision 重播。

## 接受準則與追蹤

重建接受至少涵蓋：`EB-01` 模式/owner 隔離；`EB-03..05` 完成、延期、單一 active 及同時接續；`EB-06` exact revisions/final successor/tombstone；`EB-07` legacy 邊與禁止建立；`EB-08..09` search/facets/缺 projection/原文；`EB-10..11` stale response、安全預覽、pending 和 conflict。這些是待驗證 oracle，非本次測試通過聲明。正式測試規格另由本目錄 test 文件管理。

來源綁定：immutable HEAD 下 `src/board/backend/domain/{board-workflow,legacy-workflow,summary,values}.mjs`（模型/候選驗證/hash）、`application/{board,legacy,queries,ports}.mjs`（命令/receipt/query）、`adapters/inbound/http/handler.mjs`（現行入口）、`adapters/outbound/d1/board-repository.mjs`（持久欄位/大小）、`adapters/outbound/static/source-projection.mjs` 與 `backend/data/source-catalog.json`（固定 catalog）、`frontend/app.mjs`（UI）。開放決策：是否收緊人工 evidence provenance、是否新增 required retirement、是否提供 legacy 精確文件 HTTP 讀取、來源投影完整性及更早 Git 歷史匯入，均需另行核准；本文不宣告已解決。
