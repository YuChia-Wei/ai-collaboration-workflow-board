# Issue #17 MCP 使用模式與雙向交接驗收

2026-10-20。本紀錄只涵蓋既有私有線上 Site、
單 owner／共用 Agent，以及合成 workflow。#18、#16 已依序完成後才開始本單。

**選定 client 的雙向交接與獨立新對話唯讀接手均已通過。**
雙向寫入使用原 Codex 對話的「工作紀錄室」plugin；owner 另明確授權建立獨立
Codex 對話，完成下述新 session 驗收。新對話沿用已安裝連線，未重新安裝／OAuth，
也未取得底層 transport session ID 或新的 discovery wire trace。

## 交付與被測版本

- 使用入口：[MCP.md](../../src/board/MCP.md)，含設定、可信授權、版本／支援矩陣、
  只讀接手提示、CLI 映射、unknown／衝突處理及退出方式。
- GitHub runtime 基線：main `b2a2bf3588cea1bbe4e368b429bc5c8f39c6c7d1`，
  [CI 39442371227](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/actions/runs/39442371227)
  成功。#17 只新增文件，沒有修改 Worker／CLI／schema。
- 線上 Site 第 13 版、environment revision 5，source
  `e2d6b2a13366240412ca202f4d5ac064728fd8f1`，deployment
  `appgdep_6ad77d23f938819191229b42d9c42ca4`。
  Worker SHA-256 `4bc8f1324fb7427f3edb188de25d9d49e048965167fca1726957ae8f1e2a7ef2`。
  完整部署關係見 [#16 驗收](cli-hosted-acceptance-20261020.md)；本單未新增部署。
- 真實 MCP client：目前 Codex 對話中的 Sites plugin
  `plugin_asdk_app_sites_4463576e26d081918dee0f01d0f3f8d2`。
  使用一般已連線工具呼叫，不以手填可信 header 或本機替身冒充。
- CLI：Windows PowerShell 7 每次啟動新 Node 程序，透過既有 Windows credential
  profile `workflow-records-private`。未複製／輸出秘密。

## 既有證據與缺口

| 需求 | 沿用／新增證據 | 判定界限 |
| --- | --- | --- |
| Transport／modern discovery／26 tools | [#5 結案](collaboration-closeout-20261017.md) 的平台 trace；本次真實工具可呼叫，capabilities 讀回 18 commands＋8 queries | 本次沒有擷取新的 discovery wire trace |
| Legacy initialize／版本錯誤／readonly filtering／直接呼叫防繞過 | #5 的 production root 與 bundled Worker 測試；#16 main CI 仍通過相關 suite | 本機證據，未停用真實 owner binding／跨帳號 OAuth |
| 缺漏／固定頁／缺 snapshot | #5 本機與 hosted 證據沿用；本次 MCP limit=1 讀同 revision 8，revision 1000 回 snapshot_expired | 沒有自然 TTL；缺漏故障注入仍為既有本機證據 |
| 遺失回應與原 operation 恢復 | #16 正式 server POST 後 client 丟棄回應、unknown、同檔 replay；本次 MCP 查無 operation 仍 unknown，雙向 receipt replay 相同 | 沒有新增 MCP 網路斷線注入，不把 unknown 當拒絕 |
| 操作說明／client matrix | 新 MCP.md，官方安裝步驟與目前原始碼核對 | 文字核對不等於全新 client 完成安裝 |
| CLI ↔ MCP 明確交接 | 本次真實 plugin＋新的 CLI 程序，下述六筆命令與讀回 | 同一等價 owner actor；不是多 Agent 身分驗證 |
| 獨立新 MCP 對話依新指南接手 | 新對話完成 10 次真實唯讀呼叫，讀完 revision 14、精確文件及 handoffs | 新的應用對話／接手；未宣稱重新建立底層連線或重新 OAuth |

## 本次線上流程

Workflow：`cli-acceptance-20261020-09deaee3`，沿用 #16 合成資料。
起點 revision 8：T1 pending／無 assignment，T2 因 pending D1 不可 claim。
先以 MCP 讀 capabilities、find、context(limit=1)、第二頁、T1 定義與 plan@1；
讀取沒有改變 assignment。

| 模式／命令 | Operation ID | 效果 |
| --- | --- | --- |
| MCP task.claim | `66096932-a278-460a-b8dd-be175e4da23f` | 8 → 9，generation 2 |
| MCP task.progress | `30dabbb9-1959-47b6-8627-396a69aa65b7` | 9 → 10 |
| MCP task.release | `f5e21324-87be-469d-958f-3b6d2594f8d8` | 10 → 11，保存 handoff、釋放 assignment |
| CLI task.claim | `dd401c67-be6a-4989-bde1-98f6a31e13c5` | 11 → 12，generation 3 |
| CLI task.progress | `1750d66e-feff-424a-a918-1de7d897a91f` | 12 → 13 |
| CLI task.release | `59a4d035-23d6-4a34-8584-7ee7ccd60cce` | 13 → 14，保存 handoff、釋放 assignment |

MCP release 後，CLI 新程序讀完整 context 與精確文件，再明確 claim。
CLI release 後，MCP 讀回最終完整 context、查 CLI operation、用原 envelope replay；
CLI 也 replay 了 MCP 的 release。雙向 receipt 與原 accepted receipt 完整相等，
沒有新增成功效果。最終 context 完整 DTO 相等，revision 14，共三筆 handoffs。

Plan 固定為 `plan@1`，
`sha256:0ab06bf64e2ed50a103917456f34d4feb6c6634924e82c0e47ff14b15e87f9f5`。
兩模式讀回的原文相等，另計 UTF-8 SHA-256 核對相符。
MCP 錯 hash → `document_hash_mismatch`；缺 revision 1000 → `snapshot_expired`；
錯 store → `store_mismatch`。上述 `isError=true`、保留業務 error；
查無 operation 則 `outcome=unknown`、`isError=false`，不表示命令已失敗。

驗收輔助腳本第一次錯讀 `assignment.ref` 的結構，停止於已成功的 CLI claim。
修正輔助腳本後，使用保存的 revision 12／原 assignment 繼續 progress／release；
未重建 workflow、沒有以新 ID 重複 claim。產品程式沒有因這次腳本錯誤修改。

最終 workflow 仍 active；T1 pending／沒有 assignment，T2 仍受 D1 阻擋。
這是保留可接手的合成情境，並非宣稱 task／workflow 完成或真人接受。
保存的 handoff 明列下一個獨立 MCP session 應先只讀。

## AC 狀態

| 條件 | 結果 |
| --- | --- |
| AC01 設定／授權／探索 | 選定範圍通過：指南、官方設定流程、真實連線與新對話探索；protocol metadata 沿用 #5，沒有冒稱本次新 handshake |
| AC02 權限探索與拒絕 | 選定範圍有證據：18＋8 能力、無 human decision tool；直接繞過與唯讀 binding 沿用本機測試 |
| AC03 最小流程／新 session | 通過：MCP claim／progress／release，加獨立新對話讀回 scope／阻礙／文件，前後無自動 claim |
| AC04 分頁／缺漏／版本 | 選定範圍有證據：本次固定頁／精確文件／缺 snapshot＋既有本機缺漏與版本拒絕 |
| AC05 unknown／重送／錯誤分層 | 選定範圍有證據：本次雙向 replay／unknown，加 #16 丟棄回應與原拒絕、#5 protocol 測試 |
| AC06 雙向接手 | 通過上述真實線上合成流程與完整 DTO／receipt／hash 比較 |
| AC07 證據界限 | 文件已分層；一般 client 認證未支援、tokens／actual debit 未量測 |

原始 request／response 與 `assertions.json` 位於執行機
`.runtime/mcp17-20261020/`（Git 忽略），不是 GitHub 附件。所有新增斷言通過；
文件變更不另新增產品測試或重跑已通過的整套 suite。PR CI 依既有 workflow 執行。

## 獨立新對話驗收

Owner 明確選擇「建立獨立的唯讀驗收對話」。實際建立的對話為
「驗證 Workflow Board MCP 新 session 唯讀接手」，
ID `01a159d4-0fab-7182-918e-7233ff10e79d`，
turn `01a159d4-12b7-71c2-a803-d575a7a862a3`，completed。
未指定模型覆寫，沿用使用者預設。原對話讀取其完成報告與 tool call 紀錄，
沒有要求它傳送跨對話訊息。

新對話依指南直接使用真實 plugin：capabilities 1 次、find 2 次、context 2 次、
context.page 3 次、task.read 1 次、document.read 1 次，共 10 次業務唯讀呼叫。
能力為 18 commands／8 queries，沒有 decision.resolve。全部頁為 revision 14，
tasks 2／2、decisions 1／1、handoffs 3／3；scope、missing=[]、T2 的 D1 blocker、
最新 handoff 與精確文件均讀回。最後 context 仍是 revision 14，兩個 task
assignment 都是 null；沒有 claim 或其他寫入。

完整 workflow ID 搜尋空結果，改用標題後命中；已核對目前 repository adapter
依 title 搜尋，並將這個使用限制補入 MCP.md。這不是 workflow 遺失。
新對話的 tool_search 介面回 unsupported call，改用可用工具 metadata 探索後，
10 次業務 MCP 呼叫均成功；探索介面失敗與業務結果分開記錄。

新對話另核對 plan@1 原文與 UTF-8 SHA-256（64 bytes），與上述 hash 相符。
完整報告與呼叫紀錄保存在同一執行機目錄的 `new-session-result.json`。
`assertions.json` 是主對話雙向比較的證據；新對話結果另存，不改寫早先的證據時間點。

結論限 #17 選定的 Codex Site plugin、單 owner／共用 Agent 與合成資料。
Tasks／AC 已有相應證據；GitHub PR 整合及 Issue 關閉仍分開記錄。
