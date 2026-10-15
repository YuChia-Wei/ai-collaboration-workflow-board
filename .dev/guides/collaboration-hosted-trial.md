# #5 線上串接與 #7 合成驗收資料

## 目標與授權

2026-10-14，使用者要求先完成 #5 的資料串接設定，讓 #7 改畫面時有資料可驗收。沿用本人私有的「工作紀錄室」，使用合成資料；GitHub Issues／Projects 仍是工作管理權威。本機試行與線上證據分開保存。

本次設定採 Site owner 對應單一 Agent binding，允許 read／plan／execute／manage。所有該 owner 的工作階段共用 actor，沒有同 owner 多 Agent 身分隔離，也沒有人的決策權限。設定存於 Sites runtime environment；不將 owner ID、binding 設定內容或憑證放入 repository。

## 最新接續：第 7 版與真實 client 驗證

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

產生器：[collaboration-ui-fixture.mjs](../../src/board/scripts/collaboration-ui-fixture.mjs)。它只回傳操作計畫，不連線、不自動執行、不修改 production Worker。

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
