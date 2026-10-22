# #5 線上串接與 #7 合成驗收資料

## 目標與授權

2026-10-14，使用者要求先完成 #5 的資料串接設定，讓 #7 改畫面時有資料可驗收。沿用本人私有的「工作紀錄室」，使用合成資料；GitHub Issues／Projects 仍是工作管理權威。本機試行與線上證據分開保存。

本次設定採 Site owner 對應單一 Agent binding，允許 read／plan／execute／manage。所有該 owner 的工作階段共用 actor，沒有同 owner 多 Agent 身分隔離，也沒有人的決策權限。設定存於 Sites runtime environment；不將 owner ID、binding 設定內容或憑證放入 repository。

## 最新結果：2026-10-15 第 10 版真實 client 合成讀寫

使用者於重新啟動電腦後要求先檢查 plugin，再授權依計畫完成線上合成讀寫及驗證。首次原請求已成功，昨天的 connector schema rejection 在此次重試沒有再發生；保留原 operation ID、payload 與歷史失敗證據。

此次沿用已部署的第 **10** 版，沒有重新部署。Site source `9d4280a3c19740101e74580f708205cf0b202d56`，deployment `appgdep_6ad03e4c6eac8191ae1c6f0c83ba68d2` 為 `succeeded`，environment revision 3，Worker SHA-256 `d0053e2a4b208921ebb78df68ea90de77dce742fb781c668477bbf3a9ee782ab`。本機 Git commit 為 `4dc65ce49f467cdf9d734e6b6cc95be79e9f6b3e`；Sites source 與本機 Git 身分分開記錄。

兩筆合成 workflow 的 **17 筆命令全部 accepted**：

| Workflow | 線上狀態 |
| --- | --- |
| `wb07-acceptance-20261014-active` | revision 11、active；DONE completed、DOING in_progress、BLOCKED blocked、NEXT pending；1 個待人決策、2 筆交接、plan@1 |
| `wb07-acceptance-20261014-completed` | revision 6、completed；RESULT completed、plan@1；明示尚無人類接受成果結論 |

### 自動驗證結果與限制

| 項目 | 2026-10-15 真實 plugin／D1 結果 |
| --- | --- |
| 原操作恢復及重送 | create 原回執查回及同請求重送完全一致；未增加 workflow revision |
| 過期 revision | 以新 operation ID 提交 expected_revision 6、現況 11 的進度請求，被 `revision_conflict` 拒絕；查回與重送均為原拒絕回執，head 仍 11 |
| Context | 目標、範圍、來源及其原觀察時間、工作狀態、阻擋決策、交接下一步、文件 revision 均讀回；missing 明列為空 |
| 分頁 | limit 1 遍歷 4 個 tasks、2 筆 handoffs 及 2 筆 workflow 摘要，內容與完整讀取相同，末頁 has_more=false／cursor=null |
| 游標邊界 | 跨 workflow 使用 cursor、變更搜尋條件沿用 cursor，均 `invalid_cursor / forbidden` |
| 歷史快照 | 當前 revision 11 已完成的 DONE，指定 revision 4 仍讀到 in_progress 且 result=null |
| 不存在的快照／重取 | 指定不存在的 revision 1000 回 `snapshot_expired`，重新讀取 baseline 成功；這不是自然到期或清理後的快照測試 |
| 文件／點讀 | 兩份 plan@1 原文、指定 hash 與本機計畫一致；錯誤 hash 回 `document_hash_mismatch`；task／decision 指定版本可讀 |
| 權限 | 錯誤 store 回 `store_mismatch / forbidden`；discovery 僅列 18 Agent commands／8 queries，沒有 decision_resolve。未執行跨帳號或撤銷實測 |
| D1 獨立讀回 | 完整分頁讀回 2 個 heads、18 個唯一 operations（17 accepted、1 rejected），逐筆 receipt 與 plugin 相符 |

證據保存在 `.runtime/sites-wb07-fixture/hosted/verification-20261015.json` 與 `assertions-20261015.json`；每筆最終 request 與 response 保存在 `hosted/operations/<operation_id>/`。資料庫 owner 與複合 key 未寫入新證據檔；回執與業務資料保留。搜尋採 title substring，因此 q=wb07 不會匹配 workflow ID；空 q 列舉及分頁已確認兩筆資料。

### 使用者線上驗收

開啟[協作畫面](https://workflow-records-private.yuchia-wei.chatgpt.site/?view=collaboration&store=workflow-records-private-collaboration)，使用原本 owner 帳號登入；頁面若保留先前空結果，按重新讀取。

1. 列表應顯示「[合成驗收] Workflow 協作與交接」及「[合成驗收] 已完成的 workflow」。
2. 第一筆看板應各有一張已完成、執行中、受阻、待處理卡片；開啟 BLOCKED／NEXT，核對阻礙、待決策與前置依賴。
3. 查看「決策」「文件與成果」「交接」：D-UI 待人決策、plan@1 可閱讀／下載、兩筆交接含下一步與範圍限制。
4. 第二筆顯示 workflow 完成，同時明確區分沒有 PO 核准或人類接受成果。
5. 回報資料是否完整、用詞是否易懂，以及手機／桌面卡片與文件是否易讀。本輪不要求操作人類核准；目前沒有可信 human 審核寫入入口。

2026-10-17 使用者回覆「目前看起來 OK」，作為上述合成資料畫面試用確認。這不代表 #7 人類審核／成果接受功能已驗收；資料均為合成。

### #5 收尾結果（2026-10-17）

- AC01 的選定 Codex plugin 合成讀寫已取得 hosted 證據；未宣稱其他 SDK／CI client 支援或獨立 initialize trace 已全部驗證。
- AC02／AC03 的本次固定情境已驗證；容量極限與缺漏等本機結果不能擴張為全部 hosted 情境。
- AC04：collaboration/1 沒有刪除／清理／TTL／ID 重用；刪除標記及自然過期不適用，固定快照、游標綁定與缺快照重取已有證據。儲存會隨歷史成長。
- AC05：補齊本機與相同 bundled Worker 的無／失效 binding、唯讀工具與寫入拒絕、每次請求撤銷及未授權 discovery 驗證。未中斷線上 binding，未宣稱跨帳號 OAuth 或同 owner 多 Agent 隔離。
- AC06：已完成 2 個相同情境 × 2 介面 × 5 次 loopback 比較，20/20 固定結果正確；往返相同，MCP 回應 bytes 較多。實際模型 tokens／debit 仍未量測；沒有節省宣稱。
- GAP-17：owner 於 2026-10-17 採用 shape 與 aggregate／UTF-8 bytes 的區分。契約已更新，101 筆單次陣列、100+1 累積 task 與文件 bytes 邊界通過測試。
- #7 的人類審核／要求修改與成果接受仍屬另一項工作；#6 的供應商故障、備份／還原也沒有由這次正常讀寫取代。

完整 T／AC 對照、實測數字、命令與限制見 [2026-10-17 結案驗證紀錄](collaboration-closeout-20261017.md)。四項收尾完成，沒有新增需使用者操作的線上驗收。

以下第 7／6 版段落保留為 **2026-10-14 歷史紀錄**；當中的「尚未寫入」「等待重新載入」不代表本節的最新結果。

## 歷史接續：第 7 版與真實 client 驗證

2026-10-14 使用者要求載入「工作紀錄室」並繼續串接。26 個工具已載入；真實 Codex client 的 capabilities、workflow.find 與 operation.get 已成功。

第一次 workflow.create 在 connector 參數驗證階段失敗，錯誤將合法多字標題、scope、skill ID 及 HTTPS URL 判為不符合 `\S`／`^https://`。目前 connector 採 full-string matching，與原 JSON Schema substring pattern 語意不同。修正只投影 MCP tool inputSchema 的這兩個 patterns，保留 portable schema 與 application 驗證。來源及 bundled Worker 的既有 5 個 transport 情境通過，新增多字、繁體中文、多行與 URL assertion。

修正已發布至同一私有 Site：

- 版本 **7**；source commit `3e548a65006493988fb1f65db1f2e926648bb44a`。
- Saved version：`appgprj_6ac43f23ec3c81919461f88468fa21fe~appgver_388ec8e1739c81919a7f4dfc20b66cba`。
- Deployment：`appgdep_6acf1f1a8bac8191a8a81f2f9f537a0d`，`succeeded`，environment revision 3。
- Worker SHA-256：`4596d7fc43af3bc186a6755f0696829cfe6c8dd0e110037531c4f32671983184`。
- 平台重新執行 server/discover 與 tools/list，皆 HTTP 200；get_site 回傳同一 plugin ID。

**仍未完成線上合成寫入。** 新版發布後，此對話的 connector 呼叫仍回報舊 patterns；保留三次 client schema rejection 及原請求。原 operation.get 為 unknown，尚無接受回執。下一步是重新載入對話的 plugin 工具定義，再使用原 request／operation ID；不能修改原 ID 的 payload 或用單字資料繞過問題。這不是部署授權不足，也不是工具未安裝。

目前證據：`.runtime/sites-hosted-verification-v7.json`、`sites-package-verification-v7.json`、`sites-source-manifest-v7.json`，以及 `.runtime/sites-wb07-fixture/hosted/` 的 preflight、request 與 sanitized rejection。下列第 6 版資訊保留為初次設定歷史，接續以第 7 版為準。

## 初次設定與發布（第 6 版歷史）

| 項目 | 2026-10-14 讀回結果 |
| --- | --- |
| Site | https://workflow-records-private.yuchia-wei.chatgpt.site |
| Project | `appgprj_6ac43f23ec3c81919461f88468fa21fe` |
| 版本 | 6 |
| Site source commit | `7f652c7ff5d12a4f4ab7f004c7343bc1b5053c13` |
| Saved version | `appgprj_6ac43f23ec3c81919461f88468fa21fe~appgver_81d54f08c8c08191bac19a39c9d2318c` |
| Deployment | `appgdep_6acf17cbd83081918bf45e3512f8afc1`，`succeeded` |
| Environment revision | 3 |
| Audience | custom、僅一位 owner、0 external visitors、沒有 groups |
| MCP | `has_mcp: true`，`/mcp`；OAuth resource 與完整 MCP URL 相同 |
| Plugin | `plugin_asdk_app_sites_4463576e26d081918dee0f01d0f3f8d2`，「工作紀錄室」，原生工具回報 already installed |

Worker SHA-256：`1c9e15074d7d5c54cd8d5a0339105de98a6b35232c27128f98e59602a4d38894`。本機、隔離 Site checkout 與封裝內 Worker bytes 相同。`0000`–`0002` migration 保留，新增 `0003`；封裝內 SQL、snapshots 與 journal 均逐檔比對。

建置已改用目前 Sites 支援的 `dist/.openai/drizzle/`。Site 舊 checkout 的 root `drizzle/` 也同步為相同 canonical migration bytes，避免官方 packager 保留舊 sidecar。官方 source helper 已推送 Site source；Windows Bash 路徑失敗後，使用同一官方 packager 與 `/c/...` 路徑完成 archive。此 source repository 與本專案 GitHub repository 分開；本次沒有 GitHub commit／push／merge 或關閉 Issue。

## 證據與尚待完成事項

| 檢查 | 結果與限制 |
| --- | --- |
| 本機 build／validate | 通過；含打包 Worker 的 5 個既有 transport 情境 |
| 部署／runtime 設定 | 最新第 7 版成功，使用 environment revision 3；第 6 版為初次發布歷史 |
| D1 schema | 讀回 collaboration_heads／chunks／snapshots／facts／operations／cursors 六張新表 |
| 平台 MCP 探索 | 第 6、7 版皆讀回 server/discover 及 tools/list HTTP 200；第 7 版詳見最新接續紀錄 |
| 真實 client 操作 | 26 個工具已載入；capabilities、workflow.find 與 operation.get 成功。寫入仍受本對話舊 schema 阻擋，需重新載入工具定義 |
| 線上合成資料 | 尚未寫入；2026-10-14 讀回 collaboration_heads 為空 |
| Tokens／成功率比較 | 未量測；不以 bytes 或本機流程冒充 AC06 |
| #7 UI | 尚未新增 collaboration 顯示或人類審核操作 |

平台 saved-version 的 archive content hash 與本機 gzip archive digest 分別保存，不宣稱兩者是相同容器 bytes。來源與 Worker／migration 內容的比對另存於本機 evidence。

## 已準備的合成資料

產生器：[collaboration-ui-fixture.mjs](../../src/Tooling/collaboration-ui-fixture.mjs)。它只回傳操作計畫，不連線、不自動執行、不修改 production Worker。

固定 store：`workflow-records-private-collaboration`；namespace：`personal`；record kind：`collaboration`。

| Workflow ID | 最終情境 |
| --- | --- |
| `wb07-acceptance-20261014-active` | active，revision 11；DONE completed、DOING in_progress、BLOCKED blocked、NEXT pending；1 個待人決策、2 筆交接、plan@1 |
| `wb07-acceptance-20261014-completed` | completed，revision 6；RESULT completed；保留 plan@1；明示沒有 PO 接受成果的結論 |

兩筆共 17 個 commands 已以第 6 版的相同 Worker＋本機 SQLite 跑通，並檢查工作狀態、決策、交接和文件原文。第 7 版另通過來源及 bundled Worker 的 transport 驗證；尚未重跑這 17 個 fixture commands。這些是本機驗證，不能宣稱線上資料已建立。

## 接續操作

1. 在目前對話重新選取／提及「工作紀錄室」plugin，重新送出接續訊息，以載入第 7 版工具定義。重用已發布的 Site plugin，不另建 App 或改用自填 owner header。
2. 先呼叫 `capabilities` 及 `workflow.find`，核對 store 和現有 IDs。若發現相同 workflow，先讀原操作結果，不能覆寫或重新生成同 ID 的 payload。
3. 讀取 `.runtime/sites-wb07-fixture/plan.json`。依 steps 次序提交 request；`assignment_task` 不屬於傳輸 DTO，需先從最新 workflow.context 讀取該 task 的 assignment.ref，加入 payload.assignment。
4. **第一次提交前保存最終 request**；每一步讀回 accepted receipt 與 revision。回應不明時，保留原 request 和 operation ID，用 operation.get 查回，不以新 assignment／revision 重組舊 ID 的請求。
5. 完成後用真實 client 讀回兩筆 context、指定 document ref；再用 Sites D1 read-only 工具比對 heads／operations，保存本機記錄與線上觀察。此時才把「線上合成資料」改為已驗證。
6. 另驗證相同 request 重送、receipt 查回、過期 revision 拒絕、沒有 decision_resolve 權限。#5 AC06 的 token benchmark 仍是另一項未完成驗收。

## 本機證據位置

- `.runtime/sites-source-manifest.json`：從本專案複製到 Site checkout 的來源路徑與 raw SHA-256。
- `.runtime/sites-package-verification.json`：封裝內 Worker、migration 與 manifest 比對。
- `.runtime/sites-collaboration-20261014.tar.gz`：實際提供給 Sites 的本機 archive。
- `.runtime/sites-hosted-source/`：Sites 官方 helper 開啟及推送的隔離 source checkout。
- `.runtime/sites-wb07-fixture/plan.json`、`local-verification.json`：合成計畫與本機操作／狀態證據。
- `.runtime/collaboration-trials/board-mvp-20261014-02/`：前一輪本機跨程序試行；保留原始來源與結果，不改寫為 hosted 證據。
