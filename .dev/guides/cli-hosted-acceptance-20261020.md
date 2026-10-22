# Issue #16 CLI 線上驗收與 Windows 使用入口

日期：2026-10-20。範圍為 owner 授權的既有私有 Workflow Board、Windows／
PowerShell 7、Node.js >=22.13、單 owner／共用 Agent binding。
CLI 與後續 #17 MCP 都先連接此線上服務；本機 APP／ADE 評估另行處理。

## 日常使用

兩項服務憑證已依 owner 選擇保存於目前 Windows 使用者的認證管理員。
從 repo 根目錄執行：

```powershell
pwsh -NoProfile -File .\src\board\scripts\windows-cli.ps1 status workflow-records-private
pwsh -NoProfile -File .\src\board\scripts\windows-cli.ps1 run workflow-records-private capabilities --json
pwsh -NoProfile -File .\src\board\scripts\windows-cli.ps1 run workflow-records-private find --query '合成 CLI 驗收' --json
pwsh -NoProfile -File .\src\board\scripts\windows-cli.ps1 run workflow-records-private context --workflow cli-acceptance-20261020-09deaee3 --all --json
```

Profile：`workflow-records-private`。Windows 一般認證項目：
`WorkflowBoard:workflow-records-private`。Board credential ID：
`cli-owner-20261020`，到期日為 **2026-11-19 22:38:52（台灣時間）**，
實際值由 `status` 讀回。沒有設定排程或到期通知。

入口只注入該次 Node 程序環境，未建立秘密檔案、永久環境變數或包含 token 的
命令歷史；不輸出 token，也不讓 profile 的憑證被 `--endpoint` 改送至其他站點。
換電腦／Windows 使用者需要重新配置。完整安裝、讀寫命令、續期與移除方式見
[CLI 說明](../../Docs/cli.md#這台-windows-電腦的日常用法)。

## 整合與部署身分

| 層級 | 實際結果 |
| --- | --- |
| 首次 GitHub 整合 | [PR #19](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/pull/19)，merge commit `6bc74d45c42f9d5e51f705bb106cd6344565b3c2` |
| 精確 main CI | [run 39438420709](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/actions/runs/39438420709)，completed／success |
| Site | https://workflow-records-private.yuchia-wei.chatgpt.site |
| Site source | `e2d6b2a13366240412ca202f4d5ac064728fd8f1`；101 個 Board tracked source files 與上述 GitHub main 相同 |
| Saved version | 第 13 版，`appgprj_6ac43f23ec3c81919461f88468fa21fe~appgver_f0c0f5e541408191b922929a56d1537c` |
| 初次部署 | `appgdep_6ad77a10cfac8191979cf179237ec789`，succeeded，environment revision 4 |
| 憑證輪替後部署 | 同一 saved version，`appgdep_6ad77d23f938819191229b42d9c42ca4`，succeeded，environment revision 5 |
| Worker SHA-256 | `4bc8f1324fb7427f3edb188de25d9d49e048965167fca1726957ae8f1e2a7ef2` |
| Archive SHA-256 | `5493462cd3988c70d8354f47e75f2e7ec761b84fb71df3ccc7c16e0995ab1dfe` |
| Access | 維持 custom、僅原 owner、沒有 groups；未改為公開 |

GitHub source commit 與 Sites source commit 不同，分開列示。Windows 憑證入口與
本文件是其後的 CLI 端交付，不改變此版 Worker。原 Sites plugin 的認證保留；
本次服務認證只用於 collaboration HTTP，直接通用 MCP 接入仍由 #17 處理。

## 實測流程與 AC 對照

線上 workflow：`cli-acceptance-20261020-09deaee3`，標題
「[合成 CLI 驗收 20261020] 跨程序接手」。資料均為合成；最終 revision 8，
active，T1 已 release、沒有 assignment；T2 因 D1 待人決策而不可 claim。
保留一筆交接與 plan@1，沒有把 workflow active 誤稱為工作已完成或人類接受。

| AC | 已執行與結果 | 證據界限 |
| --- | --- | --- |
| AC01 安裝／啟動 | 從精確 main archive 的乾淨目錄執行 npm ci、help、version；CLI 0.1.0 成功讀取正式 capabilities。Windows vault profile 另以新 PowerShell／Node 程序讀回及連線成功 | Windows／PowerShell 7；沒有 npm 全域發布或其他 OS installer |
| AC02 最小流程／接手 | CLI create → plan → start → claim → progress → release，另開 pending decision；新 Node 程序完整讀回 scope、阻礙、下一步及 plan@1。context 不 claim | 單 owner／共用 Agent；不是跨使用者身分隔離 |
| AC03 輸出與結果 | 成功 exit 0、缺憑證 exit 2、業務／認證拒絕 exit 4、刻意丟棄回應後 unknown exit 5；stdout 單一 JSON，診斷在 stderr | exit 3 等其他 transport 情境已有本機測試；不宣稱全部供應商故障均在線上注入 |
| AC04 分頁與版本 | `context --limit 1 --all` 完整讀回兩個 tasks、decision、handoff；task at_revision=4 保留 in_progress，head=8 則為 pending；plan@1 原 bytes／hash 相符，錯 hash 被拒 | 跨頁 snapshot 錯配／缺漏等異常仍由本機測試覆蓋 |
| AC05 重送與 unknown | create 同檔 replay 為完全相同回執；變造同 ID payload 回 operation_payload_conflict；舊 revision 回 revision_conflict。正式 server 回應後，驗收 client 刻意丟棄一次 checkpoint POST 回應，CLI 保持 unknown，查回／同檔 replay 為相同 receipt，revision 只從 7 增至 8 | 丟棄發生在 client 測試注入點；不是宣稱 provider 自然斷線或 D1 outage |
| AC06 認證與權限 | 正式雙層認證成功；缺 token 在 CLI 拒絕，錯 token 回 invalid_service_credential，錯 store 回 store_mismatch。輪替至 Windows vault 保存的新 token 後，新 token 成功、舊 token 立即拒絕 | 過期／readonly binding／偽造 actor 的其餘情境沿用本機及 bundled Worker 測試；未改原 owner binding 或測跨帳號 OAuth |
| AC07 與既有 MCP 等價 | 真實 Codex Site plugin 讀到與 CLI 相同 context、建立回執。相同 checkpoint 經 MCP replay 取得完全相同 accepted receipt；相同 stale claim replay 保留原 rejected receipt | MCP 另帶 error_code=INVALID_ARGUMENT 的 transport metadata；比較時保留它與業務 failure 的區別。這不是 #17 新 MCP 模式的驗收 |

線上 command 共 8 筆 accepted、1 筆持久 rejected。重送與變造 payload 沒有新增
成功效果。回應遺失的 operation ID 是 `fefde999-91fd-4d8d-b531-b29df368cbae`；
其原 request、unknown、reconciliation、CLI replay 與 MCP replay 在驗收時均保留；
2026-10-21 清理後改留最小摘要，見下方說明。

## Windows 憑證入口的原生驗證

`npm --prefix src/board run test:windows-cli` 通過。測試以唯一合成 profile 驗證：
跨程序保存／讀取、CLI version 啟動、endpoint／scope override 拒絕、無效或過期
設定不覆蓋既有項目、輸出不含秘密，以及只移除自己建立的測試項目。
正式 profile 另以真實 capabilities 與接手流程驗證，沒有用測試項目冒充。

初次測試發現 PowerShell JSON 日期自動轉型及 PATH 多個 Node 候選，修正為明確
JSON 字串解析與 PATH 第一個 Node 後通過。不是所有 PowerShell 7 小版本的矩陣
驗證，也不是認證管理員的完整安全稽核。一般執行不會列舉其他認證項目。

## 操作證據與未擴大宣稱

驗收時本機 `.runtime/integration-20261020/` 保留 command files、清除秘密的 CLI／MCP
回應、`assertions.json`、打包 archive 與執行輔助檔。這些是執行機證據，並非
GitHub 附件；秘密只在授權的 Windows vault、Sites server digest 配置與程序
記憶體中。原暫時驗收程序已結束，舊 token 已撤銷。

2026-10-21 再次唯讀核對後，依 owner 授權刪除上述暫存。保留
[Lesson 與清理說明](../lessons/README.md) 及其最小證據摘要；
原始 command／response／archive 已不在本機，摘要不是可重播的原始封存。

乾淨安裝第一次因 sandbox DNS 失敗，改用獲准的網路環境後成功。官方包裝 helper
已推送 source，但預設 bash 處理 Windows 路徑失敗；改用 Git Bash 的 `/c/...`
路徑執行相同官方腳本後完成封裝。只有實際成功部署才列為發布。

`npm ci` 回報既有 lockfile 相依的 6 筆 audit 提示（5 moderate、1 high）；
本次沒有採用 `npm audit fix --force` 或擅自升級相依，也沒有將安裝成功當成
依賴安全稽核通過。具體可達性未在本單評估。

人類審核 #13／#14、多 Agent #11、供應商故障與備份還原 #6、完整交付自動化 #8
均不由本單替代。#18 已先整合結案；#16 的 CLI／文件整合完成後才開始 #17。
