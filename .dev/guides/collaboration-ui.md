# #7 Workflow 協作前端試行

來源：[WB-06 / Issue #7](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/7)，2026-10-15 讀回仍 open、沒有留言。初始切片授權涵蓋本機 UI、必要串接與測試；後續使用者另行授權部署到原私有 Site，並於檢視版本 10 後要求本機 commit 與結案評估。提交範圍包含 UI 所需、同 checkout 原有的 #5 transport／storage 實作與測試，不代表 #5 或 #7 全部驗收完成。未進行 GitHub push／PR／merge 或 Issue 關閉。

## 最小使用流程

1. 從 Workflow 協作列表找出 workflow，預設開啟工作看板；總覽保留允許範圍、目前承接者與來源觀察。
2. 看板依 task 的實際狀態分為待處理、執行中、受阻、已完成；其他狀態（例如已取消）有資料時另列。欄頭顯示數量，空欄不消失。卡片顯示承接者、未完成的前置工作、阻擋決策與該工作最後一筆交接的阻礙。點選卡片可展開指定工作定義、文件與完成成果，收合後焦點回到卡片。讀取不會認領或改變工作狀態。
3. 在「決策」查看問題、指定 basis revision、候選選項與已記錄的決定；沒有可信 human 身分時不提供核准操作。
4. 在「文件與成果」或交接中開啟精確文件版本，校驗 hash 後閱讀／下載原文。
5. 在「交接」查看已完成、尚未完成、阻礙、限制、下一步與文件 refs；接手不擴大允許範圍。

執行工作 completed、workflow completed、PO 決策、交接紀錄與人類接受分開呈現。不以工作數比例表示業務驗收；沒有 session 結束或人類接受資料時明確標示未提供。

## 啟動本機合成預覽

從 repository root：

```powershell
npm --prefix src/board run build
npm --prefix src/board run preview:collaboration -- --port 4178
```

開啟 `http://127.0.0.1:4178/?view=collaboration&store=board-ui-preview`。Node.js 需支援 node:sqlite（至少 22.13）。預設輸出至 `.runtime/wb07-ui/<時間>/preview-evidence.json`；若傳 `--output`，路徑相對目前工作目錄，應使用新的獨立資料夾。既有 #5 `.runtime` 證據不作寫入目標。

此 preview 以原 `collaboration-ui-fixture.mjs` 的 17 個命令經由打包 Worker 建立兩筆 workflow，再切換為 read capability。資料位於每次程序啟動時新建的記憶體 SQLite，停止程序即不保留；evidence 另保存 accepted receipts、contexts、觀察時間與 Worker SHA-256。沒有連線到 Sites，也沒有把 fixtures 加入 production API。

Preview 僅監聽 127.0.0.1，檢查 Host／Origin，僅暴露頁面與 queries；commands／MCP 及人工寫入 routes 不開放。使用固定的本機合成身分，不能視為真實 Sites 認證驗證。遠端裝置的 localhost 不會連到這台主機；請使用同一台主機瀏覽器或已保存截圖，不以公開 tunnel／部署替代。

## 檢查與證據

```powershell
npm --prefix src/board run test:collaboration-ui
npm --prefix src/board test
npm --prefix src/board run build
npm --prefix src/board run validate
```

UI 測試 `tests/collaboration-ui.mjs` 的 UI-01–09 涵蓋真實本機 HTTP composition root／SQLite 查詢、原文版本、Agent 只讀、缺漏、分頁快照、hash 錯誤、HTML escaping、權限拒絕和空資料。快照／內容毀損案例使用查詢邊界故障注入，不宣稱 hosted 故障證據。

2026-10-14 本機既有完整 suites、新增 9 個 UI 情境與 build／validate 通過。瀏覽器曾發現文件按鈕將 ref 編成陣列而遭 invalid_command 拒絕，已修正為精確 document ref 物件，並將「呈現按鈕的 payload → 真實 API」納入 UI-03。最終瀏覽器檢查結果與截圖保存於 `.runtime/wb07-ui/browser/`，不是產品驗收或正式核准。

最終 Playwright 檢查完成 10 項：workflow 總覽、工作定義／成果、缺證據提示、文件校驗／下載、待人決策、交接、手機無水平溢出、完成不等於人類接受、空結果。390px 下 body／document 寬度皆 390px；無 JavaScript page error；10 個 browser POST 全部為 queries。下載原文 SHA-256 為 `00620d2f92f02ca5f05a4e00fce2be879e34e0ffb68957bf9eb037bf3beba543`，與 plan@1 相符。沙箱內預覽曾無法連線，改以同主機 loopback 程序後完成檢查；沒有開放遠端網路或發布。

## 驗收對照與尚待決策

| Issue 條件 | 此切片結果 | 限制／後續 |
| --- | --- | --- |
| AC01 | 本機合成檢視：來源、交辦、範圍、承接者、工作狀態與交接下一步 | 逐筆 task.progress 尚未由 query DTO 提供；未擴充版本化契約 |
| AC02 | 畫面分開列出工作完成、決策、交接、人類接受與 session 資訊缺口 | 沒有真實人類接受／session 結束資料 |
| AC03 | 文件與決策 basis 使用精確 revision，工作／決策綁定同一 snapshot | 尚無審核寫入、歷史決策瀏覽或內容變更後重新審核流程 |
| AC04 | 讀取權限拒絕、缺漏、版本不存在、快照／hash 不符均明確處理 | 未實作 human 審核命令；不宣稱過期審核操作驗證完成 |
| AC05 | 可沿工作、決策、交接取得範圍、阻礙、下一步、結果與指定文件 | 只驗證合成資料；結果無證據時明示未附證據 |
| AC06 | Agent 合成提交後由 UI 讀取同一 workflow 的接手資訊 | PO 決策／要求補充→另一 actor 接手→人類接受完整流程未完成；跨帳號未驗證 |

後續需由 owner 選定可信 human 接入方式、PO／開發者身分範圍，以及本次審核操作和必要證據；不能把現有 Agent binding 改名冒用 human。`decision.resolve` 既有 domain command 可以表達決策，但人類成果接受的業務事件／revision 對象仍須明確選定。需要呈現 progress／session／完整決策歷史時，應另處理查詢契約版本與相容性。

本切片不包含 Sprint、估點、工時、容量、燃盡圖、自動派工、GitHub 雙向同步或完整四層產品階層。

## 2026-10-14 私有線上試看

使用者後續要求「部署到線上，我要看一下實際互動成果」。已發布至原私有 Site 的版本 **8**，Sites deployment status 為 `succeeded`。

- [協作畫面入口](https://workflow-records-private.yuchia-wei.chatgpt.site/?view=collaboration&store=workflow-records-private-collaboration)
- Sites source commit：`b1080d24c5039fa271356e03b5573eae8ae58fda`。
- Version ID：`appgprj_6ac43f23ec3c81919461f88468fa21fe~appgver_1ca5517254a0819197e29cbf4e18892b`。
- Deployment ID：`appgdep_6acf35a28008819183c1fafb40dd2774`。
- 讀回 audience：custom、僅一位 owner、0 groups、0 external visitors。

發佈前以官方流程 build／validate，5 個 bundled transport 與 9 個 UI 測試通過；發布檔與本次本機已驗證 Worker 及 9 個 migration／metadata 檔案逐一核對一致。Windows helper 的 packaging 路徑失敗後，以相同官方 packager 和 Git Bash 可識別路徑完成封裝，沒有修改 Worker 或 migration。封裝與部署證據分別保存在 `.runtime/wb07-ui/sites-package-verification.json` 及 `.runtime/wb07-ui/sites-hosted-verification.json`。

線上 database overview／table read 顯示 `collaboration_heads` 為空。兩組合成 workflow 尚未寫入，新增線上測試資料的問題仍待使用者選定。瀏覽器可到達私有登入入口，但目前瀏覽器未登入，轉到 OpenAI 登入頁；未完成登入後畫面及線上 workflow 點選驗證。部署成功、本機合成互動驗證與線上資料／互動驗證分別記錄，不宣稱完整產品驗收。

## 2026-10-15 工作看板更新

依使用者要求「直覺地在看板上看到 task 的進度」，以 generic UI slice 更新原協作頁。看板成為預設頁籤，使用同一 collaboration/1 查詢快照；沒有新增後端狀態、進度百分比、拖曳改狀態或人工核准行為。卡片點選展開詳情；桌面版縮短上方資訊，手機版欄位直向排列。

已發布版本 **9**，Sites status `succeeded`；來源 commit `149f5d4da1301f038b8de2f0b255fd2cb9c97c2b`，deployment `appgdep_6acfa9202c2481919fca45cdfde64a68`。保持原 owner-private audience，沒有新增線上示範資料。

10 項 UI 情境、5 項 bundled transport 情境、build／artifact validate 通過。UI-10 驗證實際四種狀態的歸欄、取消狀態另欄、空欄保留及卡片文字 escaping。本機瀏覽器確認預設看板、卡片展開／收合、重新讀取與手機版；390px viewport 的 document width 為 375px，沒有水平溢出，console errors 為空。發布的 Worker SHA-256 `1ce05ba02a5e3a32d0efe234e13299f46ba31403ec85341358cd46ba4e97871e` 與本機預覽一致。證據與截圖在 `.runtime/wb07-kanban/`；線上登入後互動仍未驗證。

## 2026-10-15 首頁預設看板與既有資料修正

使用者回報看板沒有內容，並要求預設看板。當次線上查詢確認 collaboration_heads 尚無資料；原人工紀錄 test 存在，但沒有 task。版本 9 的協作看板只讀 collaboration/1，因此不會呈現原 framework-board/1 的人工紀錄與來源快照。

首頁現在直接以任務看板呈現選取的既有 workflow，切換 workflow 也預設看板。人工紀錄沒有 task 時，顯示明確原因與新增任務入口；卡片可開啟對應任務明細。來源快照保持唯讀與原始狀態，歷史 done、延期和未記錄狀態各自呈現。協作資料保留獨立入口，空資料時提供返回既有工作看板的連結，並從公開 store 設定帶入資料空間。

已發布版本 **10**，Sites deployment status 為 `succeeded`，保留 owner-private audience。

- [預設工作看板](https://workflow-records-private.yuchia-wei.chatgpt.site/)
- Sites source commit：`9d4280a3c19740101e74580f708205cf0b202d56`。
- Version ID：`appgprj_6ac43f23ec3c81919461f88468fa21fe~appgver_c4d11f54a38481918b6da1551d417040`。
- Deployment ID：`appgdep_6ad03e4c6eac8191ae1c6f0c83ba68d2`。
- Worker SHA-256：`d0053e2a4b208921ebb78df68ea90de77dce742fb781c668477bbf3a9ee782ab`。

完整 npm test、build、artifact validate 與 12 項 UI 情境通過。新增 UI-11 覆蓋人工空任務、來源狀態與唯讀限制；UI-12 覆蓋公開 store HTML 設定與注入防護。本機瀏覽器確認預設看板、合成任務歸欄、卡片明細、返回看板、新增任務表單入口及協作空資料說明；沒有提交表單。

登入後線上瀏覽器已確認首頁預設開啟 test 的空任務看板，以及來源紀錄 2026-10-04-v019-finalization 的四張已完成卡片。這是線上讀取與呈現證據，沒有新增線上資料或驗證寫入。瀏覽器截圖介面逾時，未取得此次畫面截圖；互動檢查以可存取性樹讀回確認。部署與檢查摘要保存在 `.runtime/wb07-default/verification.json`。本次未進行 GitHub push、PR、merge 或 Issue 關閉。

## 2026-10-15 提交與結案評估

使用者已檢視版本 10，表示目前畫面不錯並要求先 commit。此次保存可執行的整合快照；保留 #5 原有實作與證據，不將其剩餘工作歸入 #7 完成聲明。提交前核對 38 個變更的非 Markdown 程式／設定／測試檔案，與版本 10 的 Sites source checkout 逐位元相同，因此沿用上述完整測試、build 與 validate 結果；新增的結案紀錄只影響文件。

依當日即時讀取的 Issue #7 原始範圍，結論為 **保留 open**。畫面認可涵蓋本次看板體驗，未取消下列原有交付責任：

| 條件 | 現況與剩餘工作 |
| --- | --- |
| T01／T02、AC01／AC05 | 已提供最小使用流程、列表、看板、詳情、文件、決策與交接檢視；目前證據範圍如上，未宣稱全部角色的完整產品驗收。 |
| AC02 | 以分開欄位與缺資料說明避免誤認；session 結束與人類接受成果的真實資料／呈現仍未完成。 |
| T03、AC03 | 尚無可信 human 身分下的核准／要求修改入口；審核歷史與內容更新後需重新判定的流程仍待完成。 |
| T04、AC04 | 已驗證查詢權限、缺漏及文件版本／hash；未驗證人類審核寫入的未授權、過期版本、必要證據不足等情境。 |
| AC06 | 尚未完成 Agent 提交 → PO 決策／要求補充 → 開發者／另一 Agent 接手 → 人類接受成果的完整合成情境；跨帳號能力仍未驗證。 |

下一步先選定 PO／開發者的可信身分範圍、核准與要求修改操作、必要證據，以及人類接受成果所綁定的版本，再實作與驗證 T03／T04／AC06。#5 的真實 client 合成寫入及 token 比較證據仍屬該 Issue，不能由本次看板 commit 取代。此次沒有修改 Issues／Projects，沒有將待決策項目視為已豁免。
