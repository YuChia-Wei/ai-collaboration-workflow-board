# Workflow Board MCP 使用指南

首版選定 **Codex 中的「工作紀錄室」Sites plugin**，連接既有私有線上 Board。
它與 [CLI](cli.md) 共用 `workflow-board/collaboration/1` application 與 D1 資料；
認證入口不同。MCP server 已由 #5 交付，#17 補上使用指南與雙向交接驗收。
目前為單 owner／共用 Agent binding，session 名稱不會建立另一個 actor。

## 連線與確認

1. 使用原 owner 的帳號，在 Plugins 找到「工作紀錄室」。既有 plugin ID 是
   `plugin_asdk_app_sites_4463576e26d081918dee0f01d0f3f8d2`。
   若尚未安裝／連線，從 plugin card 或 **Plugins → Personal → Created by you**
   進行 Install、Connect，完成平台要求的登入。既有連線不需要重新建立 Site。
2. 在支援該 plugin 的 Codex／Work 對話以 `@` 選取「工作紀錄室」，先要求讀取
   capabilities。只有網站畫面能開啟，不代表 MCP 已連線。
3. 核對回應的 store、namespace、版本與操作清單。工具可能在 client 顯示為
   `app_capabilities` 或帶 connector 前綴；server 工具名稱為 `capabilities`。
4. 新 session 先使用下方「只讀接手提示」。取得完整脈絡後，再依 owner 的實際
   授權執行 claim／progress／release。

平台的安裝與登入流程依 [OpenAI MCP 官方說明](https://learn.chatgpt.com/docs/extend/mcp)
核對（2026-10-20）。介面位置可能因 client／帳號而異；plugin、Site、帳號權限
各自生效。沒有權限時由 owner 處理，不把私有 Site 改成公開。

| 應核對項目 | 本專案目前值／範圍 |
| --- | --- |
| Site | https://workflow-records-private.yuchia-wei.chatgpt.site |
| MCP resource | 同站點 `/mcp`；由 Sites plugin 管理連線 |
| Store／namespace | `workflow-records-private-collaboration`／`personal` |
| 業務契約／schema | `workflow-board/collaboration/1`／`1.0` |
| Server identity | `workflow-board`／`0.1.0`；見 server discovery metadata |
| MCP protocol | 實作 `2026-07-28` modern discovery 與 `2025-11-25` legacy initialize |
| 目前 owner binding | read／plan／execute／manage；18 commands、8 queries |
| 不可用操作 | `decision.resolve` 等 human-only 操作；Agent 工具不廣告此能力 |

Capabilities 是業務能力讀回，不含 MCP protocol／server version。
Protocol/server metadata 由 client discovery 取得；#5 保存了選定平台的 modern
discovery 證據。Legacy 路徑有本機測試，不能據此宣稱每個通用 client 已在線上支援。

工具沒有出現時，先確認 plugin 已安裝且 connected、目前對話已選取它，以及 Site
已發布含 MCP 的版本。若仍失敗，保留沒有秘密的錯誤與版本交給 owner。不要讀取
瀏覽器 cookie、Codex auth 檔或手填 `oai-authenticated-user-id` 當登入方法。

## 支援矩陣與認證邊界

| 接入方式 | 認證與狀態 |
| --- | --- |
| 選定 Codex Site plugin | Sites 可信 ingress 身分 → Board owner binding；已有真實合成讀寫與本次雙向交接 |
| Board Node CLI 0.1.0 | Sites Service Access ＋ Board service credential，經 collaboration HTTP routes；Windows 保存與輪替見 CLI 指南 |
| 通用 Streamable HTTP client／直接設定 `/mcp` | 本版未提供已驗收的外部認證流程；不可把 CLI 的兩項 token 搬入此 URL 當作已支援 |
| Board Node stdio MCP server | 本版沒有此入口 |
| `src/Prototypes/WorkflowRecords` Python MCP stdio | 獨立本機原型、不同資料庫與模型，不是這個線上 collaboration store 的代理 |
| CI／無人值守／其他帳號／獨立多 Agent | 未驗收；#11 身分隔離與 #13／#14 人類審核分開處理 |

Sites plugin 每次請求解析登入 owner，再使用 `COLLABORATION_BINDINGS` 決定 actor
與能力。Session label 只供觀察；不得自行傳 actor、owner 或 capability。
停用 binding 後請求應拒絕；本機測試已覆蓋，沒有在線上停用 owner 的 binding。

結束對話不代表釋放 task。要交接時先 `task.release` 或依實際情境 block／handoff，
再離開 client；要停止使用連線，從 plugin card 的連線管理中解除連線／移除。
移除本機 CLI credential 不會撤銷 MCP plugin，反之亦然。管理者的 Board binding
撤銷是另一項操作，會影響共用該 binding 的模式，須依實際授權處理。

## 只讀接手提示

在新對話選取 plugin 後，可貼以下提示。把 workflow ID 換成目標；這份合成資料
可以用來驗證讀回，不應被誤認為正式工作：

```text
使用「工作紀錄室」MCP，先只讀，不 claim 或寫入。
store_id = workflow-records-private-collaboration
namespace = personal
workflow_id = cli-acceptance-20261020-09deaee3
service_contract_version = workflow-board/collaboration/1
schema_version = 1.0

先讀 capabilities，確認可用操作。用標題「合成 CLI 驗收」搜尋 workflow.find，
再以指定 workflow_id 呼叫 workflow.context 取得脈絡。
如 tasks、decisions、handoffs 有 has_more，逐頁讀完同一 revision。
讀取 T1 的指定 definition_revision 與 context revision，以及 plan 指定 revision/hash。
報告 goal、scope、missing、阻礙、最近 handoff、next_step、task assignment 與文件原文。
若任何資料缺漏或版本不符，明確列出，不用最新版替代；讀取不表示承接。
```

## 從探索到交接

每個工具使用其公布的 JSON Schema。所有 envelope 都帶 service/schema version；
查詢參數放 `payload`，寫入另帶 `workflow_ref`、`operation_id`、
`expected_revision`、`command`。`workflow_ref` 必須包含
`record_kind: collaboration`、store、namespace、workflow ID。
完整形狀見 [可攜契約及範例](../src/Contracts/CollaborationV1/README.md)。

目前 `workflow.find.q` 依標題片段比對；完整 workflow ID 不保證命中。
已知 ID 時直接使用 `workflow_context`，不要把 find 空結果當成 workflow 不存在。

1. **確認能力與範圍**：`capabilities` → `workflow_find` → `workflow_context`。
   `missing` 不為空時先處理所需輸入，不因部分摘要可讀就自行承接。
2. **完整讀取**：逐一處理 tasks／decisions／handoffs 的 `has_more`。
   把原始 cursor 原樣交給 `context_page`，核對回傳 revision 與起始 context 相同。
   Cursor 不能改寫，也不是授權憑證。
3. **指定版次**：用 `task_read` 的 at_revision、definition_revision 讀精確 task；
   用 `document_read` 的 document_id、revision、content_hash 讀精確原文。不可
   把 latest 當成指定版本，不把 aggregate 全量載入當成必要步驟。
4. **明確承接**：確認 owner 已授權執行、task claimable、所需輸入完整後，
   `task_claim` 使用剛取得的 expected_revision／expected_definition_revision。
   保存 receipt，從新的 context／task 讀取 `assignment.ref`。
5. **回報與交接**：`task_progress` 帶 assignment_id、generation、
   definition_revision，保存最新 workflow revision。完成本次工作但要換模式／
   session 時，`task_release` 寫下 completed、remaining、next_step、artifact_refs、
   blockers、limitations，並釋放 assignment。Progress 不等於 task complete。
6. **下一個操作者**：重新讀 context、指定文件、handoff，確認 assignment 為空，
   再依授權 claim。新 claim 取得新 assignment／generation；不要沿用前一代。

命令送出前先保存完整 request；新的意圖才產生新的 operation ID。
文件引用同時保存 ID、revision、hash。寫入使用最新已確認 revision；
遇到衝突時回到查詢與業務判斷，不能默默改 revision 重送。

## CLI／MCP 對照

| CLI（`run PROFILE` 後） | MCP server 工具 | 共用語意 |
| --- | --- | --- |
| `capabilities` | `capabilities` | 版本、能力、限制 |
| `find --query TEXT` | `workflow_find` | 摘要搜尋與原查詢 cursor |
| `context --workflow ID --all` | `workflow_context` ＋ `context_page` | 固定 snapshot；MCP 呼叫方自行追完所有頁 |
| `task --workflow ID --task T1 --at-revision N --definition-revision D` | `task_read` | 指定 task／snapshot |
| `decision ...` | `decision_read` | 指定 decision／snapshot |
| `document ... --document-revision N --hash HASH` | `document_read` | 精確 bytes／hash |
| `operation --workflow ID --operation UUID` | `operation_get` | accepted／rejected／unknown |
| `submit --file original.json` | 對應 command 工具，例如 `task_claim`、`task_progress`、`task_release` | 同一 envelope、principal-bound digest 與 receipt |

CLI JSON 多一層 `workflow-board-cli/1`，業務內容在 `data`；MCP 在
`structuredContent`，同時可能提供文字 content 與 `isError`。
跨模式比較業務 DTO／receipt，另外保留 transport metadata。不要把 MCP 的
`error_code: INVALID_ARGUMENT` 誤認為業務 `revision_conflict` 被改掉。
只有映射到等價可信 actor／權限時，才比較 replay 與寫入效果。

實際雙向流程為：CLI release → MCP 完整讀回 → MCP claim／progress／release →
新的 CLI 程序完整讀回 → CLI claim／progress／release → MCP 再讀回。
每次 claim 都是明確寫入；context 不會替你承接。

## 錯誤、未知結果與恢復

| 觀察 | 下一步 |
| --- | --- |
| MCP JSON-RPC protocol error（例如不支援版本／工具） | 修正 client/protocol；不當成 accepted receipt，也不自動換 ID 重試寫入 |
| `isError: true`，含業務 error／rejected receipt | 保留業務 error、details 與 receipt；工具呼叫成功送達不代表命令被接受 |
| 網路回應遺失、不可判讀，或 `operation_get.outcome = unknown` | 先以原 operation ID 查回；保留完整原 request，不換 ID、不修改 payload／revision |
| 查得 accepted／rejected | 比對原操作；需要 replay 時將完全相同 envelope 送回原 command 工具，由後端核對 digest；不重複效果 |
| `operation_payload_conflict` | 同 ID 對應不同內容；停止，找回原 request |
| `revision_conflict` | 原拒絕仍可查回；重讀 context，處理衝突後才為新的意圖建立新命令 |
| `snapshot_expired` | 丟棄舊 baseline 的頁面集合，重新取 context；不可拼接新舊頁 |
| `document_hash_mismatch`／`missing` | 保存原引用與缺漏，處理正確輸入；不改用最新版冒充 |
| `store_mismatch`／未授權 | 檢查帳號、Site／binding／store 設定；不從結果推測其他 owner 的資料 |

`unknown` 不表示沒有寫入；`operation_get` 回覆成功也可能仍然 unknown。
CLI 的 unknown 額外保留 reconciliation，仍需原檔重送以確認 digest；詳見
[CLI 恢復規則](cli.md#命令與回傳契約)。MCP 不替呼叫者保存原 request 或自動恢復。

collaboration/1 尚無 TTL／刪除清理；本版的 `snapshot_expired` 表示所需 snapshot
不存在，不能把測試缺少 revision 當作自然到期。更多保留與容量限制見
[GAP-17 與 #5 結案紀錄](../.dev/guides/collaboration-closeout-20261017.md)。

## 驗收狀態

#5 的 transport、權限過濾及 protocol 證據沿用；#16 已驗證 CLI 正式入口與
unknown／receipt。#17 新增本次真實 plugin 與 CLI 的雙向交接、文件與錯誤對照，
細節見 [2026-10-20 MCP 驗收紀錄](../.dev/guides/mcp-handoff-acceptance-20261020.md)。

雙向寫入由既有已連線對話完成；另建立獨立新 Codex 對話，依本指南完成
10 次真實唯讀呼叫，讀完整 revision 14 與精確文件，前後沒有自動 claim。
新對話沿用已安裝的 plugin 連線；沒有重新 OAuth，也未取得新的底層 handshake
trace，不能把新對話驗收擴張為任意 client／認證流程皆已支援。
未量測 tokens、模型成功率或 actual debit，不宣稱節省。
