# 實際測試來源清冊

基準 commit `3e7ee13cda8de27c8a069a062ffd0d289584722e`；2026-10-13 靜態清冊。每個名稱從基準測試原始碼讀取，來源存在不等於完整 coverage 或執行通過；本次全部 not_run。GWT 與重要 Then 對照見其他正式測試規格。上一輪 Board graph 索引不足／失敗後採已追蹤來源 fallback；本輪確認 src 未變，保留該來源清冊，未重跑索引或產品測試。

| 路徑 | 實際 identifier | 證據層次 | 本次結果 |
| --- | --- | --- | --- |
| `src/board/tests/board.mjs` | append-only schema preserves pre-existing imported rows | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/board.mjs` | human profile records real metadata without synthetic AI identity | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/board.mjs` | inherited document names cannot create phantom documents or alter shared objects | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/board.mjs` | source URL rejects executable schemes before Markdown link rewriting | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/board.mjs` | reserved and inherited task IDs cannot mutate object prototypes | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/board.mjs` | active workflow rejects zero active tasks without any partial writes | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/board.mjs` | start workflow and first task atomically; reject a second active task | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/board.mjs` | completed task requires result and findings but no arbitrary evidence minimum | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/board.mjs` | deferred preserves reason and resume condition; no mapping to blocked | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/board.mjs` | workflow completion refuses deferred tasks, then completes last task atomically | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/board.mjs` | same workflow ID and task ID coexist across owners; revisions are private | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/board.mjs` | multi-megabyte document history stays out of workflow row; exact revisions retained | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/board.mjs` | lost response replays receipt before stale revision check | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/board.mjs` | stale CAS, zero-row D1 update, and late receipt error roll back all entity changes | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/board.mjs` | document and receipt routes bind owner; old demo creation endpoint disabled | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/board.mjs` | canonical task wins duplicate ID; raw timestamps and deferred state survive projection | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/board.mjs` | snapshot unknowns stay unknown, and document history/final status is not fabricated | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/board.mjs` | paged API filters original statuses and returns bounded summaries | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/collaboration.mjs` | B01: draft ready permits start without automatically claiming | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | B02: two workstreams progress independently and join waits for both | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | B03: concurrent claims accept one assignment and reject the other without overwrite | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | B04: release and reclaim fence old assignment even with the latest workflow revision | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | handoff information and checkpoint do not release or claim tasks | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | B06: an active definition cannot change; appended plan bytes are not partially retained | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | B07: unrelated plan revision leaves an active assignment and its old basis valid | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | B08: changed decision basis requires reconsideration and cannot be self-approved by an Agent | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | B09: an accepted but lost response replays without another domain effect or clock call | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | B10: a stale operation has a durable rejection; a reconciled request needs a new ID | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | B11: paused workflow accepts existing completion and rejects new claims | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | B12: cancelled dependency does not make downstream work ready | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | B13: required delivery cannot be cancelled into completion without authorized scope disposition | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | invalid DAGs, missing input versions and undeclared changes are rejected atomically | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | workflow cancellation closes all active assignments and rejects delayed completion | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | criteria and newly raised blocking decisions still constrain an active assignment | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | management release uses the real manager and does not impersonate the executor | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | unavailable and incomplete state never trigger local fallback or falsely accepted outcomes | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | owner/store/actor constraints run before replay and domain access | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | caller mutation during IO and reducer output mutation cannot change accepted inputs | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | UTF-8 metadata, context header and document limits reject all effects atomically | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | block records handoff, progress evidence stays immutable, and unblock requires a new claim | 合成 ports／domain／mapping | not_run |
| `src/board/tests/collaboration.mjs` | a plan cannot erase original delivery requirements or bypass a human decision disposition | 合成 ports／domain／mapping | not_run |
| `src/board/tests/contracts.mjs` | durable idempotency checked before CAS | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/contracts.mjs` | stale CAS rejected without partial event/receipt | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/contracts.mjs` | D1 zero rows forces CHECK rollback (SQLite adapter simulation) | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/contracts.mjs` | late receipt failure rolls back aggregate and event | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/contracts.mjs` | required document archive rejected without losing history | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/contracts.mjs` | completed result/evidence invariants and final addendum | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/contracts.mjs` | identity boundary and unsupported privileged commands | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/contracts.mjs` | optional document tombstone keeps revisions | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/contracts.mjs` | completed import endpoint rejects missing and previously valid capability | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/contracts.mjs` | staging rejects hash tampering and is idempotent | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/contracts.mjs` | partial activation rolls back demo cleanup and visibility | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/contracts.mjs` | verified activation preserves unrelated records and exact documents | 本機 SQLite／D1 batch 替代 | not_run |
| `src/board/tests/platform-ports.mjs` | Given plain persistence and a fixed clock, When creating, Then no platform objects enter the use case | 合成 ports／domain／mapping | not_run |
| `src/board/tests/platform-ports.mjs` | Given an accepted commit with lost response, When replaying, Then the original receipt survives | 合成 ports／domain／mapping | not_run |
| `src/board/tests/platform-ports.mjs` | Given decoded records and a projection port, When querying, Then summaries do not require driver envelopes | 合成 ports／domain／mapping | not_run |
| `src/board/tests/platform-ports.mjs` | Given a different trusted identity adapter, When HTTP queries, Then client owner headers cannot override it | 合成 ports／domain／mapping | not_run |
| `src/board/tests/platform-ports.mjs` | Given an unknown profile, When submitting, Then it cannot fall into the legacy command path | 合成 ports／domain／mapping | not_run |
| `src/board/tests/platform-ports.mjs` | Given one domain failure, When mapping HTTP or MCP, Then code and details are preserved without HTTP in the domain | 合成 ports／domain／mapping | not_run |
| `src/local/tests/test_acceptance.py` | `test_01_http_cli_to_new_mcp_session` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_acceptance.py` | `test_02_fifty_steps_no_external_writer` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_acceptance.py` | `test_03_concurrent_cas` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_acceptance.py` | `test_04_illegal_and_missing_evidence_rollback` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_acceptance.py` | `test_05_lost_response_and_bounded_outbox` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_acceptance.py` | `test_06_namespaces_roles_and_auth` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_acceptance.py` | `test_07_documents_revisions_tombstones` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_acceptance.py` | `test_08_export_preflight_corruption` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_acceptance.py` | `test_09_store_reopen_idempotency` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_acceptance.py` | `test_zz_restore_original_offline_and_continue` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_layout.py` | `test_domain_and_application_depend_inward` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_layout.py` | `test_outbox_allows_ignored_runtime_and_refuses_source_or_tracked_paths` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_layout.py` | `test_http_serves_relocated_asset_and_namespace_scoped_blob` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_review_regressions.py` | `test_01_completed_step_no_status_cannot_lose_result_or_evidence` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_review_regressions.py` | `test_02_any_step_evidence_references_must_exist` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_review_regressions.py` | `test_03_completion_checks_candidate_required_documents` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_review_regressions.py` | `test_04_every_command_preserves_terminal_workflow` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_review_regressions.py` | `test_05_receipt_command_identity_and_roles_must_match` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_review_regressions.py` | `test_06_restore_rejects_invalid_lifecycle_and_types` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_review_regressions.py` | `test_07_null_evidence_and_whitespace_cannot_complete` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_review_regressions.py` | `test_08_exhausted_write_budget_still_reconciles` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_review_regressions.py` | `test_09_default_final_third_attempt_response_loss` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_review_regressions.py` | `test_10_context_has_one_snapshot` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_review_regressions.py` | `test_11_late_receipt_failure_rolls_back_everything` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_review_regressions.py` | `test_12_identity_history_and_retry_guards` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_review_regressions.py` | `test_13_restore_no_empty_final_visibility_or_overwrite_race` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_review_regressions.py` | `test_14_restore_process_crash_before_publication` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |
| `src/local/tests/test_review_regressions.py` | `test_15_required_archive_admission_and_optional_tombstone_roundtrip` | 本機 SQLite；acceptance 含真 loopback HTTP／CLI／MCP 子程序，regression 部分 fault injection | not_run |

## 不使用 named test 的檢查來源

- `src/board/tests/architecture.mjs`：兩層 import／平台滲透、frontend/backend 邊界、Board/legacy reducer 不改 input、receipt replay 先於 load/commit，使用直接 assertion／console labels。
- `src/board/tests/portable-contract.mjs`：examples 的 id/schema、negative 命名資料列、vectors.valid/invalid/documents 的 id、request digest、operation key、operation result、JS 非 JSON 值／深度／bytes；詳見 FT-P01–P10，不是 lifecycle suite。
- `src/board/tests/portable-vectors.py`：stdlib 獨立 parse/canonical/hash 跑同一 frozen vectors；編碼跨語言，不證明 persistence/runtime compatibility。
- `src/board/tests/fixtures/{seed,source-import,collaboration-memory}.mjs`：測試準備／fault injection；不是 production source import／協作 repository／對外 endpoint。

## 重建接手的 coverage 狀態

名稱中的 B01–B04、B06–B13 對應產品例子，但 B09 實際 action 是 claim，Issue 的 complete replay 需獨立資料列；B05（新 session context）與 B14（指定協作 document revision）沒有同義的已實作 query automation。其他同名 handoff/checkpoint 測試只證明命令不改承接，不等於 B05。全部 V01–V21 逐項缺口見 collaboration/workflow/commands.test-spec.md（B05／B14 詳細 query 斷言見 collaboration/queries.test-spec.md；完整 V 矩陣見 README.md），不能因找到一個近似名稱就整項標 covered。

新增未來 automation 時，交付 scenario/data-row → source ID → actual identifier → Given fixture／When call／每個 Then assertion → exact execution evidence。沒有語意對應的 identifier 必須列缺口；不要以 assertion_groups／test count 取代產品 coverage。


## Normalize 狀態

本輪只依語意邊界重組111個正式情境定義，87個具名測試來源列完整保留；具體 GWT 與技術binding分節。文件初始化HEAD為aa5ba552，產品來源仍3e7ee13；全部not_run。canonical map見本目錄README。
