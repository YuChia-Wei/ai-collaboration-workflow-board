# Legacy Workflow 紀錄相容性 正式測試規格

## 脈絡、類型與來源

- 類型：formal-test；操作：normalize；狀態：草案 v2（2026-10-13），全部 `not_run`。
- 範圍：舊紀錄的必要文件、結果／證據、追加修訂與 tombstone。
- 行為規格：[Legacy 實體](../../../legacy/workflow/entity/workflow.spec.md)與 [Legacy 命令](../../../legacy/workflow/behaviors/commands.spec.md)；測試環境與整體狀態見[共通規則](../../README.md)。
- 文件初始化基準：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；產品／測試來源仍固定 `3e7ee13cda8de27c8a069a062ffd0d289584722e`，兩者不混為新執行結果。
- 來源權威：Issue #3（updatedAt `2026-10-12T13:28:04Z`）保留 R01–R06／B01–B14／V01–V21；協作精確 wire 以 collaboration-v1 README／schema／vectors 為準；既有相容性來源為 ARCHITECTURE.md、PLATFORM-CONTRACT.md、各 src README 及現存 test source。code-only 回復項目仍為觀察／計畫，不提升為已核准產品要求。

## 環境、資料與隔離

資料：owner=local-test-owner；WF=contract-test；human profile lifecycle1.0；T1/T2，T2dependsT1；固定 clock。Node SQLite 套 D1 prepare/batch 的替代 adapter，本機 integration，不是 hosted D1。每列獨立 fixture；Then 的全表 dump 用於比較 workflow/tasks/docs/revisions/entries/events/operations/mutation_guard。

測試層級與真實／替代邊界：舊 profile domain／Node SQLite 替代 storage；不移植新 rejected receipt。每個情境與負例資料列獨立建立 Given，不以表格列順序共用狀態；清理僅針對執行者自己的 fixture，不自動清除 crash orphan；清理依既有授權。

## GWT 情境與具體斷言

### FT-H11

來源標籤：FT-H11。層級：舊 profile domain／Node SQLite 替代 storage；不移植新 rejected receipt。

**Given**：legacy demo-travel required plan final，step completed 附 result/evidence。

**When**：archive plan；或 update_step result 空白。

**Then**：required_document_archive_forbidden／missing_required_evidence；state/events/receipts 不變；可 append addendum 但不可刪歷史。

### FT-H12

來源標籤：FT-H12。層級：舊 profile domain／Node SQLite 替代 storage；不移植新 rejected receipt。

**Given**：legacy optional doc 兩 revisions。

**When**：archive optional。

**Then**：deleted=true，兩版原文保留；新 profile、source 不誤路由至 legacy。

## 規則覆蓋與排除

本檔唯一正式定義的情境為：FT-H11, FT-H12。其他 IDs 是追溯引用，不重複定義。每項成功／拒絕／邊界斷言沿用原始 v1；「來源存在」僅為靜態來源映射，不能把整個 V criterion 標示通過。Issue #3 完整 R/B/V 矩陣見[索引](../../README.md)，技術來源及未覆蓋變體見下節。

## 執行與證據界線

本次 `not_run`：未執行產品測試、啟動服務、建立真實 browser／Agent session、建置或部署。normalize 只重組文件、改善可讀性並保留來源狀態。來源 fixture、schema 或 assert 名稱不是執行紀錄；future execution 必須綁不可變 commit、scenario/data row、actual identifier、環境、原始輸出及每個 Then 的證據。自我檢查不代表獨立驗收。

## 未知、衝突與開放問題

每個來源欄保留的缺口、部分覆蓋、觀察及未實作界線仍有效；不能因移入新目錄而改為 implemented／passed。需要的未定 oracle／真實邊界由原 Issue owner 收斂；不新增 runner、框架、固定批准、產品權限或部署要求。

## 技術 binding 與既有測試來源

以下保留原始 actual test identifier／部分來源／缺口；完整具名清冊見[來源清冊](../../test-source-inventory.md)。語言、repository adapter、runner 與錯誤 mapping 是技術 binding，與上面的行為斷言分開。

| 情境 ID | 既有來源及限制 |
| --- | --- |
| FT-H11 | contracts required document archive…／completed result/evidence… |
| FT-H12 | contracts optional document tombstone…；profile routing 見 FT-P08 |
