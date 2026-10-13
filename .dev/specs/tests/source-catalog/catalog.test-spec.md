# 固定來源 Catalog 查詢與唯讀相容性 正式測試規格

## 脈絡、類型與來源

- 類型：formal-test；操作：normalize；狀態：草案 v2（2026-10-13），全部 `not_run`。
- 範圍：固定 source snapshot、未知欄位、分頁與唯讀路徑。
- 行為規格：[source-catalog/queries/catalog.spec.md](../../source-catalog/queries/catalog.spec.md)；測試環境與整體狀態見[共通規則](../README.md)。
- 文件初始化基準：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；產品／測試來源仍固定 `3e7ee13cda8de27c8a069a062ffd0d289584722e`，兩者不混為新執行結果。
- 來源權威：Issue #3（updatedAt `2026-10-12T13:28:04Z`）保留 R01–R06／B01–B14／V01–V21；協作精確 wire 以 collaboration-v1 README／schema／vectors 為準；既有相容性來源為 ARCHITECTURE.md、PLATFORM-CONTRACT.md、各 src README 及現存 test source。code-only 回復項目仍為觀察／計畫，不提升為已核准產品要求。

## 環境、資料與隔離

Snapshot 為固定 Git catalog；不能因來源 unknown 或歷史 done/deferred 而捏造 human lifecycle。來源 import fixture 只存在 tests；線上 import endpoint 已停用。

測試層級與真實／替代邊界：固定 catalog／Node SQLite 測試 fixture；非線上匯入能力。每個情境與負例資料列獨立建立 Given，不以表格列順序共用狀態；清理僅針對執行者自己的 fixture，不自動清除 crash orphan；清理依既有授權。

## GWT 情境與具體斷言

### FT-S01

來源標籤：FT-S01。層級：固定 catalog／Node SQLite 測試 fixture；非線上匯入能力。

**Given**：catalog installation workflow 同 ISSUE-354 存在 task canonical 及舊重複來源。

**When**：sourceprojection/list。

**Then**：唯一 ISSUE-354 來源/tasks/；rawtimestamp `2026-09-23T16:10:34+00:00`不改；deferred 保留；source-only 結果文字不被升為產品通過。

### FT-S02

來源標籤：FT-S02。層級：固定 catalog／Node SQLite 測試 fixture；非線上匯入能力。

**Given**：catalog legacy `2026-05-dotnet-script-to-analyzer-transition`缺 lifecycle/status/final/time。

**When**：detail/documentread。

**Then**：statusnull、lifecycle 未宣告；一版 snapshot，created_atnull、final 未宣告；不捏造歷史。

### FT-S03

來源標籤：FT-S03。層級：固定 catalog／Node SQLite 測試 fixture；非線上匯入能力。

**Given**：固定 catalog201WF／1752docs；20unrecorded。

**When**：list limit5,statusunrecorded。

**Then**：total20、items5、has_moretrue；每項 statusnull、摘要不含完整 documents。

### FT-S04

來源標籤：FT-S04。層級：固定 catalog／Node SQLite 測試 fixture；非線上匯入能力。

**Given**：source snapshot 只讀；已停用 import endpoint；testfixture 暫存 dataset=40 個 a。

**When**：線上 source-import 有/無 previously-validkey；或 source ID log。

**Then**：403、不能改 source；fixture stage 同 hash 可 idempotent、wrong hash 拒絕、partial activate 全 rollback、verified activate 保留 unrelated native 與 exact docs。

## 規則覆蓋與排除

本檔唯一正式定義的情境為：FT-S01, FT-S02, FT-S03, FT-S04。其他 IDs 是追溯引用，不重複定義。每項成功／拒絕／邊界斷言沿用原始 v1；「來源存在」僅為靜態來源映射，不能把整個 V criterion 標示通過。Issue #3 完整 R/B/V 矩陣見[索引](../README.md)，技術來源及未覆蓋變體見下節。

## 執行與證據界線

本次 `not_run`：未執行產品測試、啟動服務、建立真實 browser／Agent session、建置或部署。normalize 只重組文件、改善可讀性並保留來源狀態。來源 fixture、schema 或 assert 名稱不是執行紀錄；future execution 必須綁不可變 commit、scenario/data row、actual identifier、環境、原始輸出及每個 Then 的證據。自我檢查不代表獨立驗收。

## 未知、衝突與開放問題

每個來源欄保留的缺口、部分覆蓋、觀察及未實作界線仍有效；不能因移入新目錄而改為 implemented／passed。需要的未定 oracle／真實邊界由原 Issue owner 收斂；不新增 runner、框架、固定批准、產品權限或部署要求。

## 技術 binding 與既有測試來源

以下保留原始 actual test identifier／部分來源／缺口；完整具名清冊見[來源清冊](../test-source-inventory.md)。語言、repository adapter、runner 與錯誤 mapping 是技術 binding，與上面的行為斷言分開。

| 情境 ID | 既有來源及限制 |
| --- | --- |
| FT-S01 | board canonical task wins duplicate ID… |
| FT-S02 | board snapshot unknowns stay unknown… |
| FT-S03 | board paged API filters original statuses…；數量僅基準 fixture，不是永遠產品要求 |
| FT-S04 | contracts completed import endpoint…staging…partial activation…verified activation…；不能把 fixture 當 productionroute |
