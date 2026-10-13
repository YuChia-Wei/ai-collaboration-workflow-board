# Legacy 相容命令

## Context and sources

- Type：`production`；operation：`spec-author normalize`。
- Status/version：2026-10-13 正規化草案 v2；整理既有內容，沒有新增產品政策或核准。
- Owner/context：Board legacy Workflow。
- Scope：既有命令服務與 HTTP 入口相容，不建立新 profile。
- 文件搬移基線：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；行為來源基線：`3e7ee13cda8de27c8a069a062ffd0d289584722e`（src 未變）。
- Source authority：GitHub Issues／Projects、ARCHITECTURE.md、PLATFORM-CONTRACT.md 與 relevant src README 保持各自權威。程式推導屬來源觀察，不等於產品意圖已核准。
- IDs：保留舊 EB／BA／LP 規則 ID；本次不改正式測試 ID，不執行產品測試或宣稱 hosted capabilities。

## Behavior contract

legacy envelope 沒有 profile；內部服務仍具 create_workflow，但 `/api/commands` 明確禁止 create，回 `legacy_creation_disabled`。HTTP 重建若開放此入口將改變既有政策。update_workflow 僅 title/goal/next_step/next_owner/status/required_documents；add_step 要 unique id/title，order 自動追加、owner_skill 預設本人；update_step 只 id/status/result/evidence_ids/blockers。document 支援 create/revise/rename/archive，revision record 保留 previous/content/hash/final/relation/created_at/finding_ids/decision_ids；final successor 與 required archive 限制見 [Document revision](../entity/workflow.spec.md#document-revision)。log text 非空；handoff 必須完整三個 array 與 next fields；evidence 必須非空 id/command/result/source_commit、四種 outcome（無 not_run）、非空 environment 且值不得 null、文字不得空；拒絕 blob_base64 `attachments_not_supported_in_preview`。上述較寬鬆 environment 並未完全採用 Python scalar 檢查。

## Rules and state effects

`EB-07`：狀態邊為 planned→active、active→blocked/completed、blocked→active；completed 無外出邊。Step 同樣規則。Completed step 要非空 result 且至少一筆存在的 evidence；completed workflow 要至少一 step、全完成、所有 required documents 存在未 deleted。此模型沒有人工 profile 的「恰好一 active task」要求。

## Technical binding

命令 application 使用 owner-scoped operation key、原 digest/receipt、whole-workflow CAS；HTTP 禁止 create 的 binding 見 board-web/adapters/http.spec.md；D1 acceptance 見 persistence.spec.md。

## Verification expectations

EB-07、BA-01/03/04：state/receipt/event atomicity、source readonly、原 command retry。 本次僅文件正規化與來源/內容核對；不是 scenario 執行結果。

## Assumptions, conflicts and open decisions

legacy 精確 document query 未映射到現行 HTTP；新增需決策。

## Source bindings and coverage limits

src/board/backend/domain/legacy-workflow.mjs；application/legacy.mjs；adapters/inbound/http/handler.mjs。 Source path 以 repository root 或該段明示的 src/board/backend、src/local 基底解析；全部綁定行為來源 commit。歷史測試與 provider 證據仍只適用各自 immutable subject；本次沒有重新認證。
