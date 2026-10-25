# Workflow Board collaboration/2：同 owner 的專案範圍

本契約實作 [Board #22](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/22)。
`workflow-board/collaboration/2`／schema `2.0` 在既有 Workflow aggregate、revision、
assignment、domain commands 與 owner binding 上加入穩定 project identity。
這是同 owner 下的資料隔離；不是跨 owner 分享、組織帳務、獨立 Agent credential 或完整 RBAC。
`namespace=personal` 仍代表 owner 私有範圍，不能代替 `project_id`。

本機 SQL、HTTP、MCP、Web client 與實際 CLI 子程序的證據見
[驗證紀錄](../../../.dev/guides/project-scope-acceptance.md)。沒有部署本版本，
不能把這份契約當作現在線上 Site 已提供的能力。

## 版本與來源

- [schema.json](schema.json)：JSON Schema 2020-12，根節點驗 command；query 與結果以 `#/$defs/<name>` 取得。
- [examples.json](examples.json)：專案建立、workflow 建立與查詢範例。
- [vectors.json](vectors.json)：固定的 project／workflow digest 與 operation key 向量；JS 與獨立 Python encoder 都驗證它們。
- 未在此變更的 19 種 workflow commands、8 種 workflow queries、內容 hash、
  canonical JSON、DAG、assignment、文件 revision、確定性拒絕與 unknown 語意，
  沿用 [collaboration/1](../CollaborationV1/README.md)。V2 schema 是明確獨立版本，
  不能只改 V1 envelope 而省略 project。

| 入口 | V2 契約 |
| --- | --- |
| Command HTTP | `POST /api/collaboration/v2/commands` |
| Query HTTP | `POST /api/collaboration/v2/queries` |
| MCP transport | 原 `/mcp`，V2 工具名稱加 `v2_`，例如 `v2_workflow_context`、`v2_project_create` |
| Envelope | `service_contract_version: "workflow-board/collaboration/2"`, `schema_version: "2.0"` |
| 認證 | 沿用原 Sites owner／Board service credential；client 不得填 owner 或 actor |

HTTP v1 路徑只接受 V1，v2 只接受 V2；MCP 無前綴工具只接受 V1，`v2_` 工具只接受 V2。
版本不符回 `unsupported_profile`／`unsupported_schema`，沒有跨版本 fallback。
MCP protocol version 與業務契約版本各自獨立。`tools/list` 維持權限篩選：
`read` 可以讀 registry，`plan` 才能建立／重新命名專案；任何操作都不新增 human／decide／change_scope 權限。

## Identity 與選擇

Project ID 在 `(authenticated owner, store_id)` 內唯一，建立後固定；名稱可以改且不必唯一。
ID 採既有 `id` 型別：1–160 個 ASCII 字元，開頭為英數，其餘允許英數、`.`、`_`、`-`，
區分大小寫，不做正規化；`constructor`、`prototype`、`__proto__` 不合法。
`legacy-personal` 保留給舊資料映射，不能建立或重新命名。

```json
{
  "store_id": "workflow-records-private-collaboration",
  "namespace": "personal",
  "project_id": "framework",
  "record_kind": "collaboration",
  "workflow_id": "WF-416"
}
```

以上是 V2 WorkflowRef。ProjectRef 只有 `store_id`、`namespace`、`project_id`。
Workflow、task、document、decision、handoff、checkpoint、歷史 snapshot 都在完整 WorkflowRef 內。
DocumentRevisionRef 保留 `document_id/revision/content_hash`，必須與完整 WorkflowRef 一起使用；
相同文件 ID／hash 不表示跨專案可互換。

專案必須先由 `project.create` 建立。缺少 project 的 V2 DTO 回 `invalid_command`；
未知或另一 owner 的 project 回 `project_not_found`，不隱式建立；store 不符回 `store_mismatch`。
V2 對 `legacy-personal` 的 workflow 請求回 `legacy_project_requires_v1`。
同 owner 的呼叫者若具有原有能力，可以明確選擇其任一 project；project 不充當 ACL。
正確的 B ref 是 B 的合法請求，服務無法推斷呼叫者心裡原本想選 A，因此 client 必須核對回覆的完整 scope。

## Registry commands 與 queries

Project command envelope 使用 `project_ref`，不使用 `workflow_ref`，並帶
`operation_id`、`expected_revision`、`command`、`payload`。

| 操作 | Payload／前提 | 結果 |
| --- | --- | --- |
| `project.create` | `{name}`，`expected_revision=0`，ID 尚不存在 | `project_receipt`；成功 revision 1 |
| `project.rename` | `{name}`，目前 project revision；不能改 ID | `project_receipt`；成功 revision +1 |
| `project.list` | `{store_id, namespace:"personal", limit:1..100, cursor:null或原cursor}` | `project_list`；先列固定 legacy 映射，再按 project ID 排序 |
| `project.read` | `{project_ref}` | `project`：名稱、revision、`workflow_contract` |
| `project.operation.get` | `{project_ref, operation_id}` | `project_operation_result`：accepted／rejected／unknown |
| `project.legacy.preview` | `{store_id, namespace:"personal"}` | `legacy_preview`：映射與原表 counts，不寫資料 |

Project receipt 包含 `accepted`、`project_ref`、`operation_id`、`request_digest`、
`expected_revision`、`revision`、`error`。成功 `error=null`；CAS 失敗為 durable
`accepted=false, error="revision_conflict"`，`revision` 是當時實際版本（不存在為 0）。
重新查 project 後，只有不同的新請求才使用新 operation ID。
Registry commands 原子保存 project revision 與 receipt，使用與 workflow 相同的 D1 batch／attempt guard。

`project.list` cursor 綁 owner/store/limit/位置；這是 live registry 列舉，名稱可能在分頁間更新，
不是備份 snapshot。Workflow find 則保留原不可變列舉 baseline，並額外綁定 project；
context cursor 綁完整 WorkflowRef、section、snapshot revision 與頁面位置。
跨 owner/project cursor 不可使用，回 `invalid_cursor` 或 `snapshot_expired`，不能改讀新頁或另一專案。

`capabilities`／`workflow.find` 的 payload 在 V1 欄位外必須加 `project_id`；
capabilities 結果也回傳它。其餘 workflow queries 由完整 WorkflowRef 帶 project。
Workflow capabilities 列出 workflow 操作；registry 操作由版本化 schema 與 MCP discovery 描述。

## Operation ID 與重播

V2 的 operation scope key 固定為 canonical JSON：

```text
[owner_id, store_id, project_id, operation_id]
```

同 project 的 **project 管理與所有 workflows 共用 operation ID 空間**；key 不加 workflow ID。
同 ID 改 payload、actor、revision、command 或 workflow 會回 `operation_payload_conflict`。
A/B 可使用相同 workflow ID 與 operation ID，各自得到自己的 receipt；B 不會重播 A 的結果。
`operation.get` 核對 WorkflowRef；`project.operation.get` 只讀 project 管理結果。
取錯 target／receipt 類型回 `operation_target_mismatch`。在另一 project 查不到 ID 是 `unknown`，
不透露它是否存在 A，也不表示可以改寫原未知請求。

Workflow request digest：`sha256:` + SHA-256(canonical JSON)：

```text
{purpose:"workflow-board-command-v2",authority:{owner_id,actor},command}
```

Project 管理使用 `purpose:"workflow-board-project-command-v2"`。
authority 由服務取得，並非 client 簽章；全 envelope（含 project）參與 digest。
V1 的 purpose、key、receipt bytes 完全不變。失去回應後保留原完整請求與 project，
查原 operation；用同一請求重送才會核對原 digest，不以目前 UI 選擇覆寫 scope。

## 相容映射、預覽與回復

Migration `0004_polite_electro.sql` **僅新增** registry 及 `project_collaboration_*` 表。
原 collaboration/1 資料表、ID、序列化內容、revision、events、receipts、未知欄位與 cursor
均留在原位置；migration 不解析或重寫原 body，也不清除資料。
每個 owner/store 的 V1 固定映射為 `legacy-personal`，`project.read/list` 回
`workflow_contract:"workflow-board/collaboration/1"`。這不推定舊紀錄原本屬於哪個 repository。

升級流程：先保存既有部署／資料保護資訊，在適當驗證環境套新增 migration，再讀
`project.legacy.preview` 對照映射和 counts，透過 V1 讀原指定版本文件與原 request replay。
Preview 是唯讀盤點，不是原子 export cutoff；持續寫入時各表 counts 可能反映不同時間。
正式升級、備份與 hosted read-back 需要各自執行，不能以本機 fixture 代替。

相容回復是切回原 application 版本，**保留新增表**：V1 繼續使用原表，V2 新資料暫時不可透過舊
application 存取，重新升級後仍在原 project。沒有自動降版轉寫、刪表 down migration、project 搬移、
任意重新歸屬或 ID 重用；不能把 rollback 解讀成將 V2 資料還原成 V1。
原 client 的 V1 請求永遠指向固定 legacy scope，不受 Web 選擇或最近使用 project 影響。

## Framework adapter 接手順序

1. 從 V2 `project.list` 取得 stable ID 與 workflow contract；若工具／路由不存在，回報 provider 尚未升級。
2. 由使用者選擇或專案設定保存完整 ProjectRef；不要依顯示名稱猜 ID，也不要把 path 前綴當隔離。
3. 明確建立缺少的 project，再讀其 capabilities。Project selection 本身不授予 workflow 寫入權。
4. 用完整 WorkflowRef 做 find/context、固定 revision 的 task/decision/document 讀取；保留 missing 和 cursor。
5. 在 command 與本機待恢復請求中保存版本、ProjectRef、WorkflowRef、operation ID、expected revision、原 payload。
6. 在新 session 重讀同 project 的 context／receipt；未知結果只用同 scope 原請求協調。回覆 scope 不符即拒絕採用。

## #6 的完整恢復缺口

本功能不提供完整 export／restore。#6 的 manifest 必須版本化保存來源 owner/store、stable project IDs、
顯示名稱及 revisions、workflow refs、全部歷史 snapshots/chunks/facts、原文文件、events、
accepted/rejected operation receipts 與原 digest。還原預檢必須明列 owner/store/project identity mapping、
碰撞規則、未知欄位保留及 operation key/digest 的處置，不能換 ID 後偽稱原 request 可重播。
Registry cursor 與 workflow cursor 的可攜／失效政策也需明訂。
完整備份、內容完整性、可信身分重綁、原子 cutoff、故障還原及 hosted 驗證仍由 #6 擁有，這裡沒有宣稱完成。
