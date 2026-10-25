# Board #22：project scope 本機驗證與交接

日期：2026-10-25（Asia/Taipei）。來源為
[#22](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/22)，
開工時本機 `main` 與遠端 `main` 均讀回
`ea161dcbbe045eb9b22468348da94fcae4bba567`，工作樹乾淨；工作分支為
`codex/22-project-scope`。本紀錄描述該基準後的本機實作，不是 Issue closure、
正式資料採用或 hosted 驗收。

## 實作與相容決定

- 新增 [collaboration/2 wire contract](../../src/Contracts/CollaborationV2/README.md)、
  ProjectRef／WorkflowRef、project create/list/read/rename、UI 選擇、CLI `--project`／`--contract` 及 `v2_` MCP tools。
- D1 新增 project registry 與明確 `project_id` 的 snapshots/chunks/facts/heads/operations/cursors。
  Workflow 與 project 管理共用 `(owner,store,project,operation)` 空間；原 domain reducers 與 batch/CAS/attempt guard 保留。
- `legacy-personal` 是每個 owner/store 的固定 V1 映射。新 migration 只有 CREATE TABLE／INDEX，
  不搬移、刪除、解析或重寫舊內容。V2 workflow API 對此保留 ID 明確拒絕。
- 同 owner 多 project 不提供跨 owner 分享、獨立 Agent、人類核准或組織 IAM。

## 已執行驗證

環境為 Windows、Node 22.14.0、Python 3.13.14；Node SQLite 是本機 D1-shaped adapter，
不是 hosted D1。F: 已讀回 `RAMDRIVE`、ready，暫存限 `F:/tmp/board-project-scope`；
沒有改全域 TEMP/TMP，沒有把正式資料或憑證放到 RAM disk。

| 驗證 | 結果與界線 |
| --- | --- |
| `npm test` | 通過：各 suite 共回報 110 個 scenarios，另有 architecture checks、109 組 schema/encoding assertions、28 個 V1 與 4 個 V2 Python vectors。不是全部不同層級驗證的單一測試數。 |
| `npm run build` | 通過：Worker、hosting manifest 與新增 schema migration 封裝。 |
| `npm run validate` | 通過：artifact ESM／原 manifest／精確 migration bytes，及禁用 runtime codegen 的 bundled Worker 9 個 transport scenarios，包含 V2 project HTTP/MCP 與 operation collision。 |
| `npm run test:tooling` | 5 個情境通過；preview 路徑、legacy/current trial 與 migration pin 保護。 |
| `src/Tests/project-scope.mjs` | 9 個情境通過（P00–P08），含真實 CLI 子程序及 loopback MCP HTTP client。 |
| 原版 Worker 相容回復 | 由 `git archive ea161dc` 在 F: 建置原版 Worker；在已套新增 migration 的合成 DB 讀 V1 原文及重播原 receipt，再切回新版讀同一 V2 project/workflow。`baseline_worker_rollback=passed`。 |
| 實際瀏覽器 | Playwright CLI＋Edge 獨立合成 profile：A/B 使用相同 workflow IDs，切換後顯示各自 scope；建立 `browser-C`、改顯示名稱、reload 後 ID 仍為 `browser-C`。觀察到 console errors/warnings 均為 0。 |

P00–P08 的覆蓋：stable ID／rename、權限篩選；同 workflow/operation ID 的 A/B
獨立 context/task/document/handoff/checkpoint；owner/project/store/額外偽造欄位拒絕；
跨 project find/context cursor 與 exact document hash 防混用；同 project 改 payload／target 拒絕；
CAS 競爭與 durable rejection；零筆 CAS／中間 SQL fault rollback；lost response 原請求重播；
舊表逐列相同及原 receipt/digest 不變；CLI/Web 回覆 ref 核對。

原版 Worker 回復驗證可選執行（一般 CI 不預先擁有該舊 artifact）：

```powershell
$env:WORKFLOW_BOARD_TEST_ROOT='F:\tmp\board-project-scope'
$env:BOARD_BASELINE_WORKER='F:\tmp\board-project-scope\baseline-ea161dc\dist\server\index.js'
npm run test:projects
```

未指定 `BOARD_BASELINE_WORKER` 時 test 輸出 `baseline_worker_rollback=not-run`，
不把無舊 artifact 的一般測試冒充已完成 rollback。
本次最終回歸日誌是 F: 下的 `npm-test.log`、`project-scope.log`、`tooling-test.log`；
瀏覽器 snapshots／PNG 與 preview evidence 也在該暫存。它們是會隨 RAM disk 消失的合成證據，
不是備份或 durable record store。可重現的 assertions 保存在 repository。

## Review 與修正

兩個唯讀 subagents 使用已安裝 `code-reviewer`，分別檢查 Core/D1/WebApi 及
CLI/MCP/Web；首輪 subject 是工作樹相對上述基準，受審 runtime 檔案首尾 hash 無漂移。
Core/D1 沒有支持的 P1/P2 finding。Client review 的兩項 P2 已修正並加入回歸：

1. 首次 response lost 後，即使同請求 retry 收到 403，仍保留原 command／operation ID 與 unknown 狀態；不能宣稱第一次未保存。
2. CLI 可用 `query --contract 2 --project legacy-personal` 讀 V2 `project.read`，
   也可用 `query --contract 2` 讀 `project.legacy.preview`，不需虛構 project。

初次測試亦揭露 fixture 缺 required fields、舊 tool-count assertions 尚未納入 V2、
文件完整性 fixture 缺 WorkflowRef，均修正後重新通過。舊 Worker 第一次從不同 cwd 啟動
未在預期 F: 位置產生 artifact，改由該快照根目錄建置後才執行上述 rollback 驗證。
沒有把這些未通過的嘗試當成成功證據。

## AC 與尚缺證據

| Issue 驗收 | 本次可支持的結果 |
| --- | --- |
| AC01 | API/CLI/Web 建立、查詢及改名後 stable ID；新 CLI 子程序與 browser reload 可讀回。正式登入/session 尚未測。 |
| AC02–AC04 | 本機同 ID A/B、exact reads、receipt、cursor、owner guards、CAS/replay 等已驗證；hosted D1 未驗證。 |
| AC05 | 四個入口有明確 scope；實際 CLI 程序、MCP HTTP 及瀏覽器已在合成 loopback 完成操作。選定 Sites plugin 新對話與 hosted 兩 client 驗收未做。 |
| AC06 | 新增 migration、read-only preview、舊 row／digest／receipt 保留與原版 Worker 相容回復已本機驗證；正式資料 migration/read-back 未執行。 |
| AC07 | 契約列明 #6 manifest 的 project mapping 與保留要求。完整 export/import/restore、備份與故障還原仍未實作，不能據此關閉 #6。 |
| AC08 | 契約與使用指南明確區分同 owner 專案、owner 隔離與完整 IAM，並分開本機／hosted 證據。 |

沒有 push、PR、merge、Issue closure、Site deploy、資料清除／正式匯入、audience 或 credential 變更。
沒有執行會建立原生 Credential Manager entry 的 `test:windows-cli`；Windows launcher 本身未修改。
後續發布仍需明確授權，維持原 owner-private Site，並在正式採用前執行 hosted scope／client 驗收。
