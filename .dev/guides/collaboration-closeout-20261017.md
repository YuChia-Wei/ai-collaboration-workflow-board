# WB-04／Issue #5 結案驗證紀錄（2026-10-17）

## 範圍與決定

來源為 [Issue #5](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/5) 的 T01–T04、AC01–AC06，以及 owner 於 2026-10-17 採用的四項結案收尾與 GAP-17 決定。Owner 回覆「目前看起來 OK」作為本次合成資料畫面試用確認；不擴張為 #7 人類核准／成果接受功能的驗收。

選定 client 為 Codex Site plugin，範圍為同一 private Site owner 共用單一 Agent binding（read／plan／execute／manage）。同 owner sessions 共用 actor；沒有多 Agent 身分隔離或可信 human 決策入口。一般 SDK／CI、跨帳號實測、真實 binding 的線上撤銷、供應商故障／備份還原不在此次結案驗證範圍。

## 被測版本與證據分層

- 線上證據沿用 [試行指南](collaboration-hosted-trial.md) 的 2026-10-15 原始結果：Site 第 10 版、environment revision 3、Sites source `9d4280a3c19740101e74580f708205cf0b202d56`、deployment `appgdep_6ad03e4c6eac8191ae1c6f0c83ba68d2`。本次未重新部署或重做線上寫入。
- 本機基準 Git HEAD：`4dc65ce49f467cdf9d734e6b6cc95be79e9f6b3e`，外加本次文件、測試與 benchmark 變更；沒有修改 production runtime。
- 實測 bundled Worker SHA-256：`d0053e2a4b208921ebb78df68ea90de77dce742fb781c668477bbf3a9ee782ab`，與已記錄第 10 版 Worker 相同。相同 bytes 可重用 runtime 身分，但本機 SQLite 結果仍不是 hosted D1 或 OAuth 驗證。
- 本機環境：Windows／PowerShell、Node.js v22.14.0；SQLite 使用 Node 內建 `node:sqlite` 與真實 migrations／transactions，D1 API 由測試 adapter 提供。
- 原始 hosted 證據：`.runtime/sites-wb07-fixture/hosted/verification-20261015.json`、`assertions-20261015.json` 與每筆操作 request／response。新量測：`.runtime/wb04-closeout-20261017/benchmark.json`；含時間、Git HEAD、Worker／benchmark SHA-256 與 20 次逐筆結果。這些原始檔留在執行 workspace，沒有宣稱是 GitHub 附件。

## 相同情境比較（AC06）

[可重跑程式](../../src/board/scripts/collaboration-benchmark.mjs) 使用實際 bundled Worker、暫時的 127.0.0.1 HTTP server、記憶體內 SQLite 與相同的 20 筆 pending tasks。兩個 profile 都先取得 context／workflow detail；文件情境再讀 plan@1。每個情境／profile 執行 5 次，共 20 次。

比較的共同 observable outcome 是 goal、授權範圍文字、全部 task ID／title／status，以及指定文件原文。程式逐筆 assert 與同一 oracle 相等；不把人工 profile 宣稱為支援 collaboration 的 assignment／decision／多 Agent 寫入語意。新介面額外資料保留在傳輸量內，未為比較刪除。

| 固定情境 | 介面 | 每次往返 | request body bytes | response body bytes | 固定結果 |
| --- | --- | ---: | ---: | ---: | --- |
| 取得目標、範圍與 20 筆工作狀態 | 原 HTTP | 1 | 0 | 10,514 | 5/5 oracle 通過 |
| 同上 | collaboration MCP | 1 | 536 | 15,222 | 5/5 oracle 通過 |
| 取得 context 後讀 plan@1 | 原 HTTP | 2 | 0 | 15,278 | 5/5 oracle 通過 |
| 同上 | collaboration MCP | 2 | 1,195 | 25,055 | 5/5 oracle 通過 |

所有回應 HTTP 200。表中為每組第一次結果；原始 JSON 保留所有重複結果（JSON-RPC ID 位數可能影響 bytes）。這裡的往返是真實 loopback HTTP 請求；初始化／探索另計，不重複攤入每次已連接情境。

MCP 初次 `server/discover` 與 `tools/list` 共 2 次往返；request bodies 253＋248 bytes，response bodies 414＋68,800 bytes。26 個工具的 catalog JSON 為 68,732 bytes，含 schema 及 metadata。原 HTTP 沒有 MCP catalog，記為不適用，並非零 schema tokens。

**結果：往返沒有減少，新介面此次 wire bytes 較多，未證明節省 tokens。** MCP 同時傳送文字 content 與 structuredContent，且 context 語意不同，均包含在真實回應內。此量測只計 UTF-8 JSON bodies，不含 headers／TLS、模型 prompt、client 對工具結果的序列化。schema／模型輸入／模型輸出 tokens 與 actual debit 均為 **未量測（null）**；沒有模型呼叫或可歸屬該情境的 usage。固定腳本 5/5 不是模型任務成功率的統計估計。

重跑命令（需使用新的輸出檔，程式拒絕覆寫既有證據）：

```powershell
node --experimental-sqlite src/board/scripts/collaboration-benchmark.mjs --artifact --output=.runtime/wb04-closeout-rerun/benchmark.json
```

首次 sandbox 執行因 127.0.0.1 `EACCES` 未取得量測；允許 loopback 後發現 benchmark 對舊 detail response 漏取 `workflow` wrapper，修正後完成上述 20 次。這些是執行環境／量測程式問題，沒有修改產品來取得通過。

## 權限與 GAP-17 補測

`tests/collaboration-transport.mjs` 經 production root 與 bundled Worker 驗證：

- 沒有可信 owner、Origin 不符、binding 停用／缺少／未綁定 owner、錯誤 capability 設定均拒絕；未授權 discovery 不回私有 workflow。
- 已有 workflow 可讀後，每次請求重新解析 binding。改為停用後讀寫／discovery 全拒絕；唯讀 binding 可以查詢、只列 8 個 query tools，寫入被拒；拒絕前後 operations 表未變。
- Legacy initialize／initialized notification、選定 modern discovery、版本／method 不符、重複 JSON keys、偽造 actor 等覆蓋完整保留。這是本機 protocol／identity adapter 驗證；未停用真實 owner 的線上 binding。
- 101 筆單次 task_changes 回 HTTP 422 `invalid_command`，不建立 operation；形狀合法但文件超過 256000 UTF-8 bytes 回 HTTP 413 `limit_exceeded`，保留拒絕回執、MCP isError=true，重送相同 receipt，workflow 不變。

`tests/collaboration-storage.mjs` 新增累積容量情境：已有 100 tasks 時，以合法單筆 add 提交第 101 筆，得到 `limit_exceeded`；snapshot／facts／head 不變，拒絕回執可查回／重送。這與單次陣列 shape 超限分開驗證。

## 游標與刪除適用性（AC04）

collaboration/1 沒有刪除、歷史清理、ID 重用或 TTL 機制；snapshot／cursor／operations 隨 workflow 保留，儲存會成長。刪除 tombstone、delta-delete feed 與自然到期測試為本版不適用；既有人工／legacy profile 的 archive 行為不移植為 collaboration 承諾。

Cursor 綁定 owner、store、workflow／section 或 find query 與基線，不能授予存取。缺快照回 `snapshot_expired`；丟棄舊頁並重新取 baseline。錯用 scope／query 被拒，歷史頁不混入較新修改。2026-10-15 線上已驗證不存在 revision 1000 後重取成功，**不是**自然到期證據。未來新增清理／刪除需另外定義保留及 tombstone 契約並驗證。

## 完整驗收對照

本表以 Issue 原有 AC 的每個獨立要求展開；結論限上述 owner 選定範圍，不外推為所有 client／認證方式／生產運作已驗收。來源、授權與適用性由本節及「範圍與決定」固定；實作入口為 `backend/adapters/inbound/http/`、`backend/application/collaboration-queries.mjs` 與 D1 repository，斷言見 transport／storage／domain tests。

| 條件／要求 | 證據與結果 | 界限 |
| --- | --- | --- |
| AC01 初始化／探索 | 平台已記錄 modern server/discover、tools/list 200；選定真實 Codex plugin 載入 26 工具；本機 legacy initialize／initialized、版本及錯誤處理通過 | 選定 client 使用 modern discovery；沒有獨立 hosted legacy initialize trace |
| AC01 授權查詢／合成寫入／分層 | 2026-10-15 真實 plugin 17 accepted，D1 逐筆核對；本機與 hosted 分開列 | 只有選定 private Site client |
| AC02 目標／授權範圍／source／阻礙／文件 revision／下一步 | hosted verification 及 UI 試用確認；domain／storage／UI tests 通過 | UI 確認限本次合成資料 |
| AC02 缺漏／分頁 | hosted limit=1 全遍歷與歷史點讀；本機缺文件及 bytes 邊界測試通過 | 缺漏與極限故障注入屬本機 |
| AC03 文件按需／receipt | hosted 兩份 plan@1 原文／hash 相符；17 accepted／1 rejected receipts 可用 | 不以完整 aggregate 代替 receipt |
| AC03 遺失回應／查原操作 | hosted operation.get 與同請求重送相等；SQLite commit 後 lost-response injection 通過 | 未注入真實網路斷線；已確認恢復 API |
| AC04 游標範圍／baseline | hosted 跨 workflow／改 query 游標拒絕、缺 snapshot 後重取；本機 owner scope 及固定頁基線通過 | TTL／刪除／tombstone 本版不適用，理由如上 |
| AC05 未授權／越權 | hosted store／cursor 拒絕；新增本機無／停用／不合法 binding、唯讀寫入拒絕，operations 不變 | 不冒稱跨帳號 OAuth 或線上撤銷實測 |
| AC05 discovery／真實接入 | 未授權 discovery 拒絕；已授權依 capability 過濾，無 human decision tool；真實 plugin 讀寫證明接入 | 單 owner 共用 actor；開啟頁面不作 plugin 證據 |
| AC06 同情境／往返／結果 | 上述 2 情境 × 2 介面 × 5 次，20/20 固定 oracle 通過；逐次 bytes／往返保存 | 沒有節省結論或模型成功機率估計 |
| AC06 tokens／debit／不可觀測 | schema／input／output tokens、debit 明列 null／未量測 | 符合 AC06 允許未量測的條款，不以 bytes 換算 |

T01：選定 client、manifest／deployment／private 身分與官方契約來源已有試行紀錄。T02：projection、缺漏、分頁及容量邊界已驗證。T03：選定協定初始化／探索／通知／版本／錯誤與認證邊界已有分層證據。T04：選定 client hosted 合成讀寫與上述比較報告完成；tokens 保留未量測。

## 執行結果與結論

- `npm --prefix src/board test`：exit 0；含 109 組 portable assertions、28 個 Python vectors、23 個 domain、11 個 storage、7 個 transport、12 個既有 contracts、18 個 board、12 個 UI 情境及 architecture／ports checks。
- 新增 legacy initialized notification 斷言後，`npm --prefix src/board run validate`：exit 0；artifact ESM／migration／identity 檢查通過，禁用 runtime code generation 下 7 個 transport 情境通過。
- 上述 benchmark：exit 0，20/20 固定 oracle 通過。

Authoring：owner 已採用四項收尾及 GAP-17。Structure：一般 Markdown 紀錄，沒有 CBF 結構驗證宣稱。Semantics：GAP-17 與程式區分一致，游標／刪除適用性明列。Runtime：依選定範圍，AC01–AC06 均有對應證據或 AC 明允許的未量測；結論為 **compliant-within-scope**。此結論不代表節省 tokens、所有 OAuth client 支援或 #6／#7 已結案。

這四項收尾沒有新增需 owner 操作的線上測試。原始 tokens 若日後成為決策需求，須另選可歸屬 usage 的模型 client 量測；若要驗證線上撤銷，另選可中斷的 binding。GitHub push／PR／merge、Issue 狀態與重新部署依各自授權處理。
