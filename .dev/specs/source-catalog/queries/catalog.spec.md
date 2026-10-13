# 來源 catalog 與跨模式紀錄查詢

## Context and sources

- Type：`production`；operation：`spec-author normalize`。
- Status/version：2026-10-13 正規化草案 v2；整理既有內容，沒有新增產品政策或核准。
- Owner/context：Board query/source catalog。
- Scope：list、summary、source status、workflow detail/document reads；來源不可寫。
- 文件搬移基線：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；行為來源基線：`3e7ee13cda8de27c8a069a062ffd0d289584722e`（src 未變）。
- Source authority：GitHub Issues／Projects、ARCHITECTURE.md、PLATFORM-CONTRACT.md 與 relevant src README 保持各自權威。程式推導屬來源觀察，不等於產品意圖已核准。
- IDs：保留舊 EB／BA／LP 規則 ID；本次不改正式測試 ID，不執行產品測試或宣稱 hosted capabilities。

## Behavior contract

`EB-08`：list 合併 owner Board、固定 active dataset 的 source projection、owner legacy，回 `items/total/all_total/offset/limit/has_more/facets/source_commit/source_projection_available`。順序保留 repository/projection 順序；本文不新增全域 sort。q 最多 200 字元轉小寫，在 id/title/goal/owner_skill/workflow_kind/work_items URLs/referenced_work_items URLs 搜尋；status/kind/owner_skill/mode 使用精確 equality。Application DTO 要 offset≥0、limit=1..50；HTTP 先以 parse/default/clamp 轉換，預設 limit=30，負數／過大／無法解析值不必然拒絕，精確映射見 [BA-01](../../board-web/adapters/http.spec.md)。facets 為未篩選全部 records 的 distinct sorted kinds/owners/statuses；缺 status 視為 unrecorded。task/document counts 來源可為 repository 聚合；tombstone 文件計數不自動當未完成工作。

摘要至少保留 id,title,goal,record_mode,namespace,status,workflow_kind,owner_skill,current_phase,updated_at,revision,task_count,task_counts,document_count,unparsed_task_count,work_items,referenced_work_items,source(repo/commit),lifecycle_contract。缺失資訊保留 null/未記錄，不合成執行結果。

`EB-09`：source-status 回 active dataset、workflow_count、document_count、row_hash_manifest_sha256（records/documents manifest 的 canonical hash）與 projection_available。只有 active dataset 與固定 projection.dataset 相等才宣告投影可用。Source detail 有 row 而無對應投影時，提供來源 workflow 與「尚未建立共通欄位投影」note，status 從 source_status 保留，documents={}；不得補出結構化 tasks 或假裝解析完整。Source document 只有 revision=0/latest 或 1，其他 revision→`revision_not_found`；回 snapshot=true、created_at/final=null，原 repo 更早歷史未匯入。Binary source 附件只有固定版本連結/大小/hash，不保證本服務持有 bytes。

## Rules and state effects

| 模式 | 可觀察意義 | 所有權及可變性 | lifecycle |
| --- | --- | --- | --- |
| `board` | 本人線上人工紀錄；`framework-board/1` | trusted owner 的 Workflow 持有 tasks、documents、文字 evidence、logs、handoffs；可用 commands 寫入 | `pending/in_progress/completed/deferred` |
| `legacy` | 舊版線上合成紀錄；命令沒有 `service_contract_version` | trusted owner 隔離；既有紀錄可用舊 commands 更新；HTTP 禁止建立新 legacy | `planned/active/blocked/completed` |
| `source_snapshot` | 固定 repository commit 的來源原文及共通欄位投影 | 唯讀固定 dataset；不是某 owner 的執行紀錄 | 保留原值，包括 `done`、未記錄；不自動映射到新 lifecycle |

`EB-01`：同名 ID 可以存在於不同模式，選取及文件讀取必須攜帶 mode。`auto` 詳情查詢的優先順序為 Board → source snapshot → legacy。新 Board 不讀寫來源 snapshot；legacy command 若 workflow ID 存在於來源 snapshot，拒絕 `source_snapshot_readonly`。

## Technical binding

Static source-catalog/projection 與 D1 source repository 提供資料；HTTP pagination parse/default/clamp 詳見 board-web/adapters/http.spec.md。固定 commit 原文不是更早 Git 歷史；binary metadata 不意味 bytes 已移入服務。

## Verification expectations

EB-01/08/09：mode priority、pagination/search/facets、unknown/缺 projection、不捏造原文或歷史。 本次僅文件正規化與來源/內容核對；不是 scenario 執行結果。

## Assumptions, conflicts and open decisions

來源投影完整性及更早 Git 歷史匯入待決策；沒有 source-import 線上寫入。

## Source bindings and coverage limits

src/board/backend/application/queries.mjs；domain/summary.mjs；adapters/outbound/{static/source-projection,d1/source-repository}.mjs；backend/data/source-catalog.json。 Source path 以 repository root 或該段明示的 src/board/backend、src/local 基底解析；全部綁定行為來源 commit。歷史測試與 provider 證據仍只適用各自 immutable subject；本次沒有重新認證。
