# Local context、關聯、原文與 receipt 查詢

## Context and sources

- Type：`production`；operation：`spec-author normalize`。
- Status/version：2026-10-13 正規化草案 v2；整理既有內容，沒有新增產品政策或核准。
- Owner/context：Local workflow-record query service。
- Scope：namespace-scoped完整context/精確revision/events/blob/receipt；不自動claim或續寫。
- 文件搬移基線：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；行為來源基線：`3e7ee13cda8de27c8a069a062ffd0d289584722e`（src 未變）。
- Source authority：GitHub Issues／Projects、ARCHITECTURE.md、PLATFORM-CONTRACT.md 與 relevant src README 保持各自權威。程式推導屬來源觀察，不等於產品意圖已核准。
- IDs：保留舊 EB／BA／LP 規則 ID；本次不改正式測試 ID，不執行產品測試或宣稱 hosted capabilities。

## Behavior contract

`LP-07`：context 在單一 read transaction 讀 workflow+events，回完整 retained document revisions/evidence、不截斷；document_index 回 id/name/deleted/required 與 revision/hash index。包含 `complete:true`, missing_required_documents，`pending_outbox:'client-local: inspect CLI outbox before handoff'`, `source_check_required:true`, `external_observations_are_current:false`。完整 context 不表示外部 Issue/Git 現況仍有效；接手者需檢查 drift 與 client outbox。


## Inputs, outputs and failure outcomes

Context/get workflow 需namespace+workflowID/read；operation需namespace+operationID/read，不存在not_found；events按seq>after；workflowlist可external_link exact equality；blob需該namespace引用才回hash/base64，否則not_found。指定文件版次為正整數；0不是latest。

## Technical binding

精確 HTTP routes在 clients-and-storage.spec.md；read transaction固定workflow/events快照，WAL讓writer不中斷reader cutoff。

## Verification expectations

LP-07：全部保留原文/索引、missing明示、source-current=false、exactrevision、namespaceblob隔離及context一致。 本次僅文件正規化與來源/內容核對；不是 scenario 執行結果。

## Assumptions, conflicts and open decisions

complete context不是外部PM/Git現況或client outbox已清。

## Source bindings and coverage limits

src/local/application/workflows.py；adapters/inbound/http.py；adapters/outbound/sqlite.py。 Source path 以 repository root 或該段明示的 src/board/backend、src/local 基底解析；全部綁定行為來源 commit。歷史測試與 provider 證據仍只適用各自 immutable subject；本次沒有重新認證。
