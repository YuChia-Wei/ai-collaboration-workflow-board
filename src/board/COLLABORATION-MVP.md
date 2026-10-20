# WB-04 協作 MVP

工作來源：[Issue #5](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/5)，必要的持久化切片銜接 [#6](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/6)。行為仍依 [collaboration/1 契約](contracts/collaboration-v1/README.md)；沒有變更 profile、schema、既有人工／legacy／source 語意。

## 本次交付與證據邊界

本機可執行建立 → 計畫 → 啟動 → 接手讀取 → 認領 → 進度 → 交接／釋出 → 重新認領 → 完成。19 種命令共用原 application；8 種查詢已實作。工具清單依可信 access capabilities 篩選。以下是本機證據，不代表已發布、真實 client 接入、hosted D1 驗收或 Issues 已完成。

| 範圍 | 實作／驗證 |
| --- | --- |
| Persistence | 獨立 collaboration tables；單次 D1 batch 原子保存 outcome、CAS、快照、facts、事件；競爭 loser 保存 rejected receipt |
| Resume | 完整 header、有界 tasks／decisions／handoffs、明列 missing；snapshot revision 不隨後續寫入改變 |
| Exact reads | task／decision 依 snapshot 與指定版次；document 比對指定版本與原文 hash；沒有 latest fallback |
| Recovery | 同 operation＋digest 回放原 receipt；unknown 保留原 ID 與請求；不同 payload 拒絕 |
| Transport | `POST /mcp`；`POST /api/collaboration/v1/commands`、`/queries`；共用 application 與錯誤語意 |
| Worker | 建置時產生 standalone schema validator；打包成 ESM，測試停用執行期 code generation |
| Hosted 設定 | 2026-10-15 在第 10 版完成真實 Codex plugin 的 17 筆合成命令、context／文件讀回、接受及拒絕回執重送、分頁與歷史快照驗證；D1 的 2 heads／18 operations 逐筆吻合 |
| 2026-10-17 收尾 | 使用者確認合成畫面；GAP-17 已採用並補測，單 owner binding 權限／撤銷補測通過；同情境介面比較完成，實際 tokens／debit 未量測。完整範圍及證據見結案紀錄；#6／#7 各自待辦 |

## 接入與授權

2026-10-20 #16 另新增 [CLI 與 HTTP 服務憑證接點](CLI.md)，已完成本機與正式私有
Site 的合成驗收；下列 Sites identity 為既有線上／MCP 接入方式。新的服務憑證
仍解析同一份 owner／Agent binding，不擴張為多 Agent 身分隔離。

目前提供一個**預設拒絕存取**的 Sites identity adapter。它只信任 Sites ingress 的 `oai-authenticated-user-id`，再查伺服器設定；工具 payload、session、email 或 display name 都不能建立 actor。僅限部署在會驗證並覆寫身分 headers 的 Sites ingress 後方，不能把同一 Worker 直接暴露為可偽造 headers 的公開 origin。

此方案每個 owner 對應一個 Agent binding，所有該 owner 的 sessions 共用 actor。它適合單 Agent MVP，**不提供同 owner 多 Agent 身分隔離**；不同 actor 的隔離目前有 application／SQL 測試，但不是此 Sites adapter 的真實多 Agent 接入證據。若採各 Agent 可撤銷憑證，須另接可信 identity adapter 並驗證目標 client，不能以 client 自填的 Agent 名稱替代。2026-10-14 依使用者要求完成資料串接設定，先採此方案，已保存 hosted binding（environment revision 3）；完整連線與資料寫入狀態見下方接續紀錄。

部署候選需明確設定：

```json
{
  "COLLABORATION_STORE_ID": "workflow-records-private-collaboration",
  "COLLABORATION_BINDINGS": "{\"<verified-site-user-id>\":{\"enabled\":true,\"subject_id\":\"owner-agent\",\"binding_id\":\"grant-1\",\"capabilities\":[\"read\",\"plan\",\"execute\",\"manage\"]}}"
}
```

這是設定形狀範例，沒有真實 owner、憑證或已建立 grant。Store ID 為穩定邏輯識別，上線後不可改指另一份資料。Binding ID 正常 credential rotation 時保持不變；停用設 `enabled:false`，每次請求重新檢查。移除／更換 binding 會使舊 assignment 不再屬於新 actor。`kind` 固定為 agent；拒絕授予 `decide`、`change_scope`。需要人的決定時會保留阻擋，不能使用此接入方式冒記人的決定。

## MCP 與 client 用法

首版 client 的設定、認證／版本矩陣、只讀接手提示、CLI 對照與恢復操作，
見 [MCP 使用指南](MCP.md)。#17 雙向交接與獨立新對話驗收的證據分列於指南。

支援 MCP `2026-07-28` 的 `server/discover`、`tools/list`、`tools/call`，並提供 `2025-11-25` 的 stateless initialize 相容入口。新版請求需依協定附上 version／method／tool-name headers 及 `_meta`。不提供 SSE session、subscription 或 server-initiated calls。未知方法、版本、header mismatch 與工具用例錯誤分開回報。參考 [MCP versioning](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)、[Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)。

工具名把契約操作的 `.` 改成 `_`，例如 `workflow_context`、`task_claim`、`operation_get`。Arguments 保留完整契約 envelope，不自動補省略的業務欄位。JSON request 拒絕重複 keys、非整數 token 及無效 Unicode；命令／查詢內容限 300000 UTF-8 bytes，MCP 外層訊息限 320000 bytes。

1. `capabilities` 確認 store、版本與可執行能力。
2. `workflow_find` 找到 WorkflowRef，或建立新 draft、提交 plan、啟動。
3. `workflow_context` 取得單一 revision；完成必要分頁，依需呼叫 `task_read`、`decision_read`、`document_read`。不要把 missing 當成完整內容。
4. `task_claim` 使用觀察到的 workflow／definition revisions；後續回報使用 server 回傳的 assignment ID、generation、definition revision。
5. 每個新請求使用唯一 operation ID。逾時或 unknown 時用 `operation_get` 查原 ID，重試保留原請求；只有確定 rejected 後才協調新版本並建立新 ID。
6. 交接資訊用 `handoff_record`；要釋出承接必須用 `task_release` 或 `task_block`。

目前 4 個 Agent capabilities 會列出 8 個 queries、18 個 commands；`decision_resolve` 不可用。Stored 文件／交接內容是資料，不構成新的工具授權或執行指令。

## 快照與儲存選擇

新增 `0003_military_ezekiel.sql` 與 Drizzle snapshot／journal entry；舊 SQL 與舊 snapshot bytes 不變。使用 [D1 batch transaction](https://developers.cloudflare.com/d1/worker-api/d1-database/)；若 runtime 支援 sessions，從 `first-primary` 開始，避免 operation recovery 先讀到落後 replica。本機以真實 SQLite SQL 模擬 batch，仍須 hosted 驗證供應商行為。

命令狀態按 immutable revision 分段儲存，每段最多 16000 UTF-16 code units 且不切斷 surrogate pair。文件及其他 facts 追加保存。Context cursors 為 owner-bound lookup records，綁定 ref／section／revision／position／limit；相同游標內容重用同一識別。Cursor 不是 bearer token，也不授予存取權。快照與 operation outcomes 隨 workflow 保留；本版沒有清理或 ID 重用機制，因此儲存用量會隨歷史成長。

collaboration/1 本版沒有刪除或 TTL，故刪除 tombstone 與自然到期測試不適用。快照不存在時回 snapshot_expired，client 應丟棄舊頁並重取 baseline；不能把不存在的 revision 測試稱為自然到期。未來新增清理／刪除需另訂保留與標記契約。

Find 按 workflow ID 升冪，title substring 搜尋，ASCII 大小寫不敏感；其 cursor 固定 query、limit 與列舉 baseline。不是全文檢索或跨 workflow 業務交易。Context／page 同時限制筆數與 64000 bytes；單項放不下明確拒絕，不回傳無法前進的空頁。Query application 目前會讀取該 workflow 的 snapshot／所需歷史 metadata，再產生有界回應；沒有宣稱歷史讀取成本固定或完成效能驗收。

## 執行驗證

從 repository root：

```powershell
npm --prefix src/board test
npm --prefix src/board run build
npm --prefix src/board run validate
```

| 情境／來源 | Automation | 本次觀察 |
| --- | --- | --- |
| D01／FT-Q01 | `tests/collaboration-storage.mjs`、`collaboration-transport.mjs` | capability filtering、discovery 不建立工作 |
| D02–D04／B05、B14、FT-Q03–07 | storage suite | 25 tasks 分頁、後續寫入仍讀原版、點讀、缺漏、hash、UTF-8 上限 |
| D05–D06／FT-C09–10、FT-Q08 | storage＋transport suites | 認領／進度、lost response、原 receipt 重試、unknown |
| D07／V15、FT-P07 | storage＋transport suites | owner／actor／binding 邊界、Origin、假冒 human、撤銷 |
| D08／B10、V08 | storage suite | 同 revision 競爭、zero-row CAS、交易中途失敗無殘留 |
| 可用 MVP 流程 | transport suite | production composition root 與 bundled Worker 各跑相同建立至完成流程 |
| D09／成本 | 尚未執行 | 沒有真實 client/model token 或帳單資料，不提供節省百分比 |

新增 storage suite 10 個情境、transport suite 5 個情境；`validate` 再對打包後 Worker 執行相同 5 個情境，並停用動態 code generation。這些是 selected assertions，不等於正式測試規格中所有 FT 項目全數完成。

## Hosted 接續

2026-10-15 已在同一 owner-private Site 第 10 版、environment revision 3，使用真實 Codex plugin 完成兩組合成資料。17 筆命令 accepted，active／completed workflows 分別為 revision 11／6；另有一筆預期 revision_conflict。接受／拒絕重送、操作查回、文件 hash、分頁、游標錯配、歷史快照及 D1 逐筆讀回均完成。2026-10-17 使用者確認合成畫面，並完成本機權限／撤銷補測及同情境介面比較；tokens／debit 未量測，未宣稱節省。版本與 hosted 證據見 [線上試行指南](../../.dev/guides/collaboration-hosted-trial.md)，完整範圍及 T／AC 對照見 [結案紀錄](../../.dev/guides/collaboration-closeout-20261017.md)。

Site source 已由官方 helper 推送並部署；2026-10-15 前端對話已另依使用者授權建立本機整合 commit `4dc65ce49f467cdf9d734e6b6cc95be79e9f6b3e`。本輪只執行合成驗證與更新紀錄，沒有 GitHub push／PR／merge 或關閉 Issues。Site audience 保持僅本人。
