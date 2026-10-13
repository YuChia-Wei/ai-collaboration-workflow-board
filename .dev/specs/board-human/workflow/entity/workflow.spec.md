# 人工 Board Workflow aggregate

## Context and sources

- Type：`entity`；operation：`spec-author normalize`。
- Status/version：2026-10-13 正規化草案 v2；整理既有內容，沒有新增產品政策或核准。
- Owner/context：Board 人工紀錄。
- Scope：Workflow、Task、Document 的 identity、ownership、state invariants；不是新協作 assignment 模型。
- 文件搬移基線：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；行為來源基線：`3e7ee13cda8de27c8a069a062ffd0d289584722e`（src 未變）。
- Source authority：GitHub Issues／Projects、ARCHITECTURE.md、PLATFORM-CONTRACT.md 與 relevant src README 保持各自權威。程式推導屬來源觀察，不等於產品意圖已核准。
- IDs：保留舊 EB／BA／LP 規則 ID；本次不改正式測試 ID，不執行產品測試或宣稱 hosted capabilities。

## Identity and structure

| 模式 | 可觀察意義 | 所有權及可變性 | lifecycle |
| --- | --- | --- | --- |
| `board` | 本人線上人工紀錄；`framework-board/1` | trusted owner 的 Workflow 持有 tasks、documents、文字 evidence、logs、handoffs；可用 commands 寫入 | `pending/in_progress/completed/deferred` |
| `legacy` | 舊版線上合成紀錄；命令沒有 `service_contract_version` | trusted owner 隔離；既有紀錄可用舊 commands 更新；HTTP 禁止建立新 legacy | `planned/active/blocked/completed` |
| `source_snapshot` | 固定 repository commit 的來源原文及共通欄位投影 | 唯讀固定 dataset；不是某 owner 的執行紀錄 | 保留原值，包括 `done`、未記錄；不自動映射到新 lifecycle |

`EB-01`：同名 ID 可以存在於不同模式，選取及文件讀取必須攜帶 mode。`auto` 詳情查詢的優先順序為 Board → source snapshot → legacy。新 Board 不讀寫來源 snapshot；legacy command 若 workflow ID 存在於來源 snapshot，拒絕 `source_snapshot_readonly`。

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

Task 具 `id/task_id/workflow_id/schema_version/title/owner_skill/status/order/created_at/updated_at/template_source/template_version/execution_kind/model/reasoning_effort/result_summary/finding_status/evidence_ids/dependencies/extensions`。新 task 狀態 pending，order 為現有 tasks 數 +1，`finding_status=open`、`result_summary=null`、`execution_kind=human`、model/effort null。依賴只能指向已存在且不是自身的 task；新增方向因此不建立循環。驗證不是任意 task DAG 編輯器。

## Invariants and lifecycle

`EB-03`：candidate 的所有 task 都要驗證 title、owner_skill、status、evidence_ids；evidence refs 必須存在。Completed task 必須非空 result_summary 且 finding_status 為 `addressed/no_findings`，**沒有必須至少一筆 evidence 的規則**。Deferred task 要非空延期理由與恢復條件。

`EB-04`：workflow in_progress 時恰好一個 in_progress task；其他 workflow status 不得有 in_progress task。啟動 task 的依賴都必須 completed。next_task_id 只可選 pending/deferred task 且依賴完成。可在同一 transition 完成舊 task 並啟動新 task；若只完成唯一 active task 而仍保留 in_progress workflow，拒絕 `exactly_one_active_task`。completed task 不能再 transition；completed workflow 不能 add_task/transition。

`EB-05`：completed workflow 至少一 task、所有 task completed、phase completed/closed、非空 workflow result_summary、finding_status addressed/no_findings、所有 required documents 存在且未 deleted。Deferred workflow 要理由/恢復條件。人工 profile 沒有宣告完整的狀態轉移邊表；nonterminal transition 是否可返回 pending 由上述 candidate invariants 決定，不可擅加 local 的 planned→active 邊規則。完成後仍可有合規文件增補、log、handoff/evidence 或 metadata update，所有命令均重新驗證 terminal 不變量。

### Document

`EB-06`：create 不可覆用 ID；name 預設 ID、kind=markdown、required/final 轉為 boolean。create/revise content 必須 string，UTF-8 ≤256,000；可以空字串，不能新增未觀察到的非空規則。每次內容修訂分配連續 revision 從 1 開始、保存 SHA-256(content UTF-8)、final、relation、created_at。原內容不可覆寫。若最新 revision final=true，後續需 `erratum/addendum/successor`；缺少則 `final_requires_successor`。

rename 只變 metadata name，要求非空文字；archive 保存 deleted=true/deleted_at，不刪任何 revision。當 ID 位於 required_documents，一律拒絕 `required_document_archive_forbidden`，所有 lifecycle 相同。已 deleted 文件不允許 revise/rename/archive。查閱 archived 原始 revision 仍是合法讀取；寫拒絕不等於歷史不可讀。

## Technical binding

人工 profile 公開識別為 `framework-board/1`；namespace=personal、record_mode=board。規則的欄位與限制屬相容契約，不要求沿用 JavaScript classes。具體 D1 分表、UTF-8/hash、HTTP mapping 另見 board-web adapter 規格。

`EB-02`：workflow 基本 metadata 的 UTF-8 JSON bytes 不超過 64,000，計算時排除 steps/documents/evidence/logs/handoffs。個別 task/document metadata/entry 的 64,000-byte storage admission 見 adapters 規格，不能誤當全部 aggregate 上限。

## Verification expectations

EB-01..06：模式隔離、完整 candidate、單一 in_progress、completion、延期、final successor、tombstone。 本次僅文件正規化與來源/內容核對；不是 scenario 執行結果。

## Assumptions, conflicts and open decisions

目前沒有 required document retirement；是否收緊人工 evidence provenance 需另行決策。

## Source bindings and coverage limits

src/board/backend/domain/{board-workflow,values}.mjs；application/board.mjs；ARCHITECTURE.md；src/board/backend/README.md。 Source path 以 repository root 或該段明示的 src/board/backend、src/local 基底解析；全部綁定行為來源 commit。歷史測試與 provider 證據仍只適用各自 immutable subject；本次沒有重新認證。


## Preserved source / coverage notes

重建接受至少涵蓋：`EB-01` 模式/owner 隔離；`EB-03..05` 完成、延期、單一 active 及同時接續；`EB-06` exact revisions/final successor/tombstone；`EB-07` legacy 邊與禁止建立；`EB-08..09` search/facets/缺 projection/原文；`EB-10..11` stale response、安全預覽、pending 和 conflict。這些是待驗證 oracle，非本次測試通過聲明。正式測試規格另由本目錄 test 文件管理。

來源綁定：immutable HEAD 下 `src/board/backend/domain/{board-workflow,legacy-workflow,summary,values}.mjs`（模型/候選驗證/hash）、`application/{board,legacy,queries,ports}.mjs`（命令/receipt/query）、`adapters/inbound/http/handler.mjs`（現行入口）、`adapters/outbound/d1/board-repository.mjs`（持久欄位/大小）、`adapters/outbound/static/source-projection.mjs` 與 `backend/data/source-catalog.json`（固定 catalog）、`frontend/app.mjs`（UI）。開放決策：是否收緊人工 evidence provenance、是否新增 required retirement、是否提供 legacy 精確文件 HTTP 讀取、來源投影完整性及更早 Git 歷史匯入，均需另行核准；本文不宣告已解決。
