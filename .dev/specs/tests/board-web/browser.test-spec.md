# Board Web 瀏覽器呈現與寫入協調 正式測試規格

## 脈絡、類型與來源

- 類型：formal-test；操作：normalize；狀態：草案 v2（2026-10-13），全部 `not_run`。
- 範圍：畫面誠實呈現、Markdown、安全連結、pending operation 與非同步 selection。
- 行為規格：[board-web/adapters/browser.spec.md](../../board-web/adapters/browser.spec.md)；測試環境與整體狀態見[共通規則](../README.md)。
- 文件初始化基準：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；產品／測試來源仍固定 `3e7ee13cda8de27c8a069a062ffd0d289584722e`，兩者不混為新執行結果。
- 來源權威：Issue #3（updatedAt `2026-10-12T13:28:04Z`）保留 R01–R06／B01–B14／V01–V21；協作精確 wire 以 collaboration-v1 README／schema／vectors 為準；既有相容性來源為 ARCHITECTURE.md、PLATFORM-CONTRACT.md、各 src README 及現存 test source。code-only 回復項目仍為觀察／計畫，不提升為已核准產品要求。

## 環境、資料與隔離

受控 HTTP responses、固定 source catalog、可觀測 DOM／network；每情境隔離 browser sessionStorage 與 pending body。使用者的實際網站／資料不可作 fixture。

測試層級與真實／替代邊界：目前為 frontend source 恢復的計畫；真正 browser journey 尚缺。每個情境與負例資料列獨立建立 Given，不以表格列順序共用狀態；清理僅針對執行者自己的 fixture，不自動清除 crash orphan；清理依既有授權。

## GWT 情境與具體斷言

### FT-U01

來源標籤：FT-U01。層級：目前為 frontend source 恢復的計畫；真正 browser journey 尚缺。

**Given**：source detail 含 unknown status、原 timestamps、external refs、binary attachment metadata。

**When**：browser 載 detail/doc。

**Then**：顯示未記錄／來源限定、原 timestamp；binary 只描述固定 link/size/hash 及實體在 repo，不假裝 bytes 已遷入；人工 model 不適用；無 source 編輯 controls。

### FT-U02

來源標籤：FT-U02。層級：目前為 frontend source 恢復的計畫；真正 browser journey 尚缺。

**Given**：Markdown 含 script/iframe/img、javascriptlink、relative saved doc、relative 未保存 file。

**When**：browser renderMarkdown。

**Then**：危險 tags/attributes 被清理；savedrelative 指本地 document；未保存 relative 僅在 HTTPS 無 credentialrepo/commit 可構造固定 Gitlink；外部 targetblank+noopener noreferrer；rawview 保留 escaped 原文。

### FT-U03

來源標籤：FT-U03。層級：目前為 frontend source 恢復的計畫；真正 browser journey 尚缺。

**Given**：commandO1 已提交但 fetcherror 或無效 json；sessionStorage 存 pendingbody；使用者保留 input。

**When**：點確認／重試原操作。

**Then**：先 GEToperationO1，404 才重送相同 body/ID；accepted 清 pending/refetch；5xx 維持 pending；不同 payload 不能提交直到協調；409 保留可核對輸入且不自動新 ID 重播。

### FT-U04

來源標籤：FT-U04。層級：目前為 frontend source 恢復的計畫；真正 browser journey 尚缺。

**Given**：list/requestA 慢於 B；先選 WF1 後 WF2；docF1 慢於 F2。

**When**：舊 A/F1response 遲到。

**Then**：serialguard 使畫面維持 B/WF2/F2；不顯示錯 workflow 文件；document 按需讀而非列表帶原文。

## 規則覆蓋與排除

本檔唯一正式定義的情境為：FT-U01, FT-U02, FT-U03, FT-U04。其他 IDs 是追溯引用，不重複定義。每項成功／拒絕／邊界斷言沿用原始 v1；「來源存在」僅為靜態來源映射，不能把整個 V criterion 標示通過。Issue #3 完整 R/B/V 矩陣見[索引](../README.md)，技術來源及未覆蓋變體見下節。

## 執行與證據界線

本次 `not_run`：未執行產品測試、啟動服務、建立真實 browser／Agent session、建置或部署。normalize 只重組文件、改善可讀性並保留來源狀態。來源 fixture、schema 或 assert 名稱不是執行紀錄；future execution 必須綁不可變 commit、scenario/data row、actual identifier、環境、原始輸出及每個 Then 的證據。自我檢查不代表獨立驗收。

## 未知、衝突與開放問題

每個來源欄保留的缺口、部分覆蓋、觀察及未實作界線仍有效；不能因移入新目錄而改為 implemented／passed。需要的未定 oracle／真實邊界由原 Issue owner 收斂；不新增 runner、框架、固定批准、產品權限或部署要求。

## 技術 binding 與既有測試來源

以下保留原始 actual test identifier／部分來源／缺口；完整具名清冊見[來源清冊](../test-source-inventory.md)。語言、repository adapter、runner 與錯誤 mapping 是技術 binding，與上面的行為斷言分開。

| 情境 ID | 既有來源及限制 |
| --- | --- |
| FT-U01 | frontend app.mjs renderOverview/renderTasks/renderDocumentPane；無 browserautomation 來源，計畫 |
| FT-U02 | frontend markdown 函數；sourceURL 測試只涵蓋 backend 拒絕，DOMjourney 缺口 |
| FT-U03 | frontend api/commit/renderPending；Web 真實 networkfailure 測試缺口；舊 404 策略不代表新 profileunknown 可改 body |
| FT-U04 | frontend loadList/choose/loadDocument；browserautomation 缺口 |
