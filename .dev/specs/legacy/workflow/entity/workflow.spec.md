# Legacy workflow-record aggregate

## Context and sources

- Type：`entity`；operation：`spec-author normalize`。
- Status/version：2026-10-13 正規化草案 v2；整理既有內容，沒有新增產品政策或核准。
- Owner/context：Board legacy。
- Scope：保留 planned/active/blocked/completed 的既有紀錄；與人工/協作 profile 分離。
- 文件搬移基線：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；行為來源基線：`3e7ee13cda8de27c8a069a062ffd0d289584722e`（src 未變）。
- Source authority：GitHub Issues／Projects、ARCHITECTURE.md、PLATFORM-CONTRACT.md 與 relevant src README 保持各自權威。程式推導屬來源觀察，不等於產品意圖已核准。
- IDs：保留舊 EB／BA／LP 規則 ID；本次不改正式測試 ID，不執行產品測試或宣稱 hosted capabilities。

## Identity and structure

Legacy Workflow 有 id/title/goal/next_step/next_owner/status/revision/required_documents 與 steps/documents/evidence/logs/handoffs。Step 保存 id/title/order/owner_skill/status/result/evidence_ids/blockers；Document 保存 id/name/kind/required/deleted/revisions。這是同 Workflow 內部成員，來源欄位不能當可信 actor。

## Invariants and lifecycle

`EB-07`：狀態邊為 planned→active、active→blocked/completed、blocked→active；completed 無外出邊。Step 同樣規則。Completed step 要非空 result 且至少一筆存在的 evidence；completed workflow 要至少一 step、全完成、所有 required documents 存在未 deleted。此模型沒有人工 profile 的「恰好一 active task」要求。

### Document revision

Revision 保留 previous/content/hash/final/relation/created_at/finding_ids/decision_ids；前版 final 時只能追加 relation 為 erratum/addendum/successor 的新版本，不覆寫原文；required document 禁止 archive，允許的 archive 保留全部歷史。

## Technical binding

JS reducer src/board/backend/domain/legacy-workflow.mjs；舊資料/receipt/hash 與 migrations 保留。本文不是 new collaboration store。

## Verification expectations

EB-07：合法/非法邊、完成與 evidence、required archive、原文保留。 本次僅文件正規化與來源/內容核對；不是 scenario 執行結果。

## Assumptions, conflicts and open decisions

沒有因 legacy 相容而開放新的 HTTP create 或精確文件 route。

## Source bindings and coverage limits

src/board/backend/domain/legacy-workflow.mjs；application/legacy.mjs；ARCHITECTURE.md。 Source path 以 repository root 或該段明示的 src/board/backend、src/local 基底解析；全部綁定行為來源 commit。歷史測試與 provider 證據仍只適用各自 immutable subject；本次沒有重新認證。
