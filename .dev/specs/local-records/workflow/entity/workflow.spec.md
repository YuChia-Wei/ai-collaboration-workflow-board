# Local Workflow record aggregate

## Context and sources

- Type：`entity`；operation：`spec-author normalize`。
- Status/version：2026-10-13 正規化草案 v2；整理既有內容，沒有新增產品政策或核准。
- Owner/context：Local workflow-record bounded context。
- Scope：Workflow、step、document、evidence、approval 的 identity/invariants；不套 Board assignment。
- 文件搬移基線：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；行為來源基線：`3e7ee13cda8de27c8a069a062ffd0d289584722e`（src 未變）。
- Source authority：GitHub Issues／Projects、ARCHITECTURE.md、PLATFORM-CONTRACT.md 與 relevant src README 保持各自權威。程式推導屬來源觀察，不等於產品意圖已核准。
- IDs：保留舊 EB／BA／LP 規則 ID；本次不改正式測試 ID，不執行產品測試或宣稱 hosted capabilities。

## Identity and structure

Workflow 要非空 id/namespace/title/goal/authorized_scope/policy_version/template_version/next_step/next_owner；source 要 object，repo/commit/branch 皆 nonblank。這裡 repo 是 provenance，不額外宣告 HTTPS 規則。status planned/active/blocked/completed；revision非負 int；required_documents 為 unique nonblank string list；legacy_mapping object、external_links list、limitations nonblank string list；steps/documents/evidence 為 maps。各 identity 必須與 map key 一致。

`LP-03`：Workflow 和 step 狀態邊均 planned→active、active→blocked/completed、blocked→active，completed terminal。Step 需非負 int order、nonblank title/owner_skill、unique existing evidence IDs、blockers text list、result null或string。Completed step 要非空 result 且至少一筆 evidence。Completed workflow 要至少一 step、全 completed、所有 required documents 存在且未 tombstone。每個 command 都驗證合併 candidate，包括已完成 aggregate；可追加 valid log/document addenda，但不得新增 unfinished step 或移除完成所需 evidence/document/result。Valid failed/blocked/interrupted evidence 可以支持完成調查，result 必須如實描述結果；沒有「outcome 必須 passed」條件。

`LP-04`：Evidence 要非空 id/command/result/source_commit，outcome 僅 passed/failed/interrupted/blocked（無 not_run）。environment 必須非空 object，key nonblank；值僅 str/int/float/bool，不能 null，文字不能空白。所有 evidence 都保存 blob_hash/observed_at，blob_base64 缺省為空 bytes；base64 嚴格驗證，decoded ≤1MiB，SHA-256 bytes 作為 immutable identity。Evidence 不接受空殼 completion shell；保存 evidence 字串不表示實際執行或 provider 證明。

## Document lifecycle

Document 為 id/name/kind/step_id/required/deleted/revisions；name/kind nonblank，step ref 若有必須存在，required/deleted 必須 bool。create 必須新 identity，revision從1開始；content為string（可空），hash=SHA256 UTF-8，previous=`n-1`（首版null）、final bool、relation、finding_ids/decision_ids unique text list、created_at。relation 僅 null/erratum/addendum/successor/derived；若前版final，只可 erratum/addendum/successor。Final 原文不能覆寫。

`LP-06`：rename只更新name；archive保存deleted/deleted_at，保留全部內容及tombstone。required=true 文件必須留在 required_documents index；當 ID 在 index 內，任何 lifecycle archive 都422 required_document_archive_forbidden。這不是先 archive 再 restore API，原型無 required retirement/replacement 命令。Optional tombstone 可 export/restore 且精確舊版仍可讀；deleted 文件不允許新的 revise/rename/archive。

## Approval invariant

`LP-05`：獨立 approval 採保守 workflow-wide authorship：曾為該 workflow authored document event 的 principal 都不能 approve，即使不是當前文件作者。Approval 指向精確 final revision；後續 successor 不改原 approval 指向。歷史 approval 在 preflight 檢查其 final reference、principal/role 與 replay admission；當前 token 不從歷史角色授權。

## Invalid-state outcomes

不合法 lifecycle 邊→illegal_transition；completed step 缺結果/evidence→missing_required_evidence；completed workflow 缺步驟完成→incomplete_steps，缺必要文件→missing_required_documents；required=true 移出 index→required_index_mismatch；final 追加無 successor relation→final_requires_successor；required archive→required_document_archive_forbidden。候選無效不改已接受 aggregate。

## Technical binding

Python domain 只處理候選 records；SQLite/HTTP 移到 adapter。Document hash 用原文UTF-8、blob hash 用 bytes；內部dict不要求新語言照抄。LP-04 的 base64/1MiB 限制是現行附件 boundary。

## Verification expectations

LP-03..06：完成/證據/final链/tombstone/unique IDs/workflow-wide approval作者隔離。 本次僅文件正規化與來源/內容核對；不是 scenario 執行結果。

## Assumptions, conflicts and open decisions

required=true 無 retirement；required=false indexed-only 可先移除 index 再 archive。不要因此開放 required=true 移出 index。

## Source bindings and coverage limits

src/local/domain/{workflow,validation,serialization}.py；src/local/README.md；ARCHITECTURE.md。 Source path 以 repository root 或該段明示的 src/board/backend、src/local 基底解析；全部綁定行為來源 commit。歷史測試與 provider 證據仍只適用各自 immutable subject；本次沒有重新認證。


## Context boundary

Local Workflow 是工作紀錄 aggregate，包含 steps/documents/evidence/logs/handoffs/approvals。它不是 task board dispatch engine，也不是新協作 Workflow 的 assignment-generation 模型；不得把同名欄位直接跨 profile 遷移。所有 evidence command 都只是描述；服務不執行 shell/SQL、不建立外部 Issue、不發布、不暗中寫 Git 作 fallback。
