# 人工 Board Workflow 命令相容性 正式測試規格

## 脈絡、類型與來源

- 類型：formal-test；操作：normalize；狀態：草案 v2（2026-10-13），全部 `not_run`。
- 範圍：framework-board/1 人工 metadata、單一 active task、文件與 operation。
- 行為規格：[board-human/workflow/behaviors/commands.spec.md](../../../board-human/workflow/behaviors/commands.spec.md)；測試環境與整體狀態見[共通規則](../../README.md)。
- 文件初始化基準：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；產品／測試來源仍固定 `3e7ee13cda8de27c8a069a062ffd0d289584722e`，兩者不混為新執行結果。
- 來源權威：Issue #3（updatedAt `2026-10-12T13:28:04Z`）保留 R01–R06／B01–B14／V01–V21；協作精確 wire 以 collaboration-v1 README／schema／vectors 為準；既有相容性來源為 ARCHITECTURE.md、PLATFORM-CONTRACT.md、各 src README 及現存 test source。code-only 回復項目仍為觀察／計畫，不提升為已核准產品要求。

## 環境、資料與隔離

資料：owner=local-test-owner；WF=contract-test；human profile lifecycle1.0；T1/T2，T2dependsT1；固定 clock。Node SQLite 套 D1 prepare/batch 的替代 adapter，本機 integration，不是 hosted D1。每列獨立 fixture；Then 的全表 dump 用於比較 workflow/tasks/docs/revisions/entries/events/operations/mutation_guard。

測試層級與真實／替代邊界：Node SQLite／D1 batch 替代的本機 integration；不等 hosted D1。每個情境與負例資料列獨立建立 Given，不以表格列順序共用狀態；清理僅針對執行者自己的 fixture，不自動清除 crash orphan；清理依既有授權。

## GWT 情境與具體斷言

### FT-H01

來源標籤：FT-H01。層級：Node SQLite／D1 batch 替代的本機 integration；不等 hosted D1。

**Given**：原 source_records 有 untouched row；新 humanworkflow 欄位包含 extensions.domain_field。

**When**：create_workflow。

**Then**：source 原 body 不變；execution_kind=human；status pending；不捏造 AI/model/source.repo；extensions 保留。

### FT-H02

來源標籤：FT-H02。層級：Node SQLite／D1 batch 替代的本機 integration；不等 hosted D1。

**Given**：WFpending，T1/T2 pending；T2 依 T1。

**When**：transition T1in_progress；拒絕列另加無 dependencyT3in_progress。

**Then**：正例 workflowin_progress 且唯一 T1active；second active 拒絕 exactly_one_active_task；未滿前置 T2→unmet_dependencies；直接 workflow_status=in_progress 但零 in_progress task 拒絕。

### FT-H03

來源標籤：FT-H03。層級：Node SQLite／D1 batch 替代的本機 integration；不等 hosted D1。

**Given**：T1in_progress，T2 pending。

**When**：transition T1 completed result_summary=完成實作 finding_status=addressed next_task_id=T2。

**Then**：T1 completed、T2in_progress 同次；evidence_ids=[]仍合法；缺 result→missing_task_result 且完整 dump 不變。

### FT-H04

來源標籤：FT-H04。層級：Node SQLite／D1 batch 替代的本機 integration；不等 hosted D1。

**Given**：T3pending。

**When**：transition deferred reason=範圍外 resume_condition=另行啟動。

**Then**：保留 deferred，不改 blocked；缺任一 context→missing_deferred_context；workflowcompletion 不能忽略 deferred。

### FT-H05

來源標籤：FT-H05。層級：Node SQLite／D1 batch 替代的本機 integration；不等 hosted D1。

**Given**：T2 為最後 in_progress task；T3 及其他 tasks 已 completed。

**When**：同命令 complete T2/workflow，附兩級 result/findings。

**Then**：WFcompleted,current_phasecompleted；缺整體 result 或仍未完成 task 拒絕；終態 task 結果保留。

### FT-H06

來源標籤：FT-H06。層級：Node SQLite／D1 batch 替代的本機 integration；不等 hosted D1。

**Given**：owner A/B 同 WF 與 T1ID；A 有 doc 1。

**When**：ownerB 讀 A 的 doc／operation；無認證讀 list。

**Then**：不洩資料，document/receipt 404；無認證 401；各 owner 修訂獨立；舊 demo create endpoint 403。

### FT-H07

來源標籤：FT-H07。層級：Node SQLite／D1 batch 替代的本機 integration；不等 hosted D1。

**Given**：O1accepted，後續 revision 已增加。

**When**：原 owner 重送同 O1/body。

**Then**：原 receipt；無新 event/revision；改 payload→conflict；舊 profile 保留既有 receipt 格式/hash/scope，不移植新 rejectedreceipt 協定。

### FT-H08

來源標籤：FT-H08。層級：Node SQLite／D1 batch 替代的本機 integration；不等 hosted D1。

**Given**：新命令 stale、zero-rowupdate、late receipt failure 三獨立列。

**When**：document rename 或 log。

**Then**：完整交易 rollback，documents/events/receipt 不部分留下；舊 profile 拒絕沒有 durablerejectedreceipt。

### FT-H09

來源標籤：FT-H09。層級：Node SQLite／D1 batch 替代的本機 integration；不等 hosted D1。

**Given**：doc 1 content240000chars/final，已有 10revisions。

**When**：指定 revision 1 讀；另列追加無 relation。

**Then**：old revision 保持 exact content/hash；歷史總量>2MB 而 workflow row<10000；final 追加無關係→final_requires_successor；addendum 保留舊版。

### FT-H10

來源標籤：FT-H10。層級：Node SQLite／D1 batch 替代的本機 integration；不等 hosted D1。

**Given**：未建立 doc 名 toString；task ID __proto__/constructor/prototype 不存在。

**When**：archive toString 或 transition 保留 taskID。

**Then**：document_not_found/task_not_found 且 sharedprototype 不變；toString 明確 create 後可讀；source.repo javascript:拒絕 invalid_source。

## 規則覆蓋與排除

本檔唯一正式定義的情境為：FT-H01, FT-H02, FT-H03, FT-H04, FT-H05, FT-H06, FT-H07, FT-H08, FT-H09, FT-H10。其他 IDs 是追溯引用，不重複定義。每項成功／拒絕／邊界斷言沿用原始 v1；「來源存在」僅為靜態來源映射，不能把整個 V criterion 標示通過。Issue #3 完整 R/B/V 矩陣見[索引](../../README.md)，技術來源及未覆蓋變體見下節。

## 執行與證據界線

本次 `not_run`：未執行產品測試、啟動服務、建立真實 browser／Agent session、建置或部署。normalize 只重組文件、改善可讀性並保留來源狀態。來源 fixture、schema 或 assert 名稱不是執行紀錄；future execution 必須綁不可變 commit、scenario/data row、actual identifier、環境、原始輸出及每個 Then 的證據。自我檢查不代表獨立驗收。

## 未知、衝突與開放問題

每個來源欄保留的缺口、部分覆蓋、觀察及未實作界線仍有效；不能因移入新目錄而改為 implemented／passed。需要的未定 oracle／真實邊界由原 Issue owner 收斂；不新增 runner、框架、固定批准、產品權限或部署要求。

## 技術 binding 與既有測試來源

以下保留原始 actual test identifier／部分來源／缺口；完整具名清冊見[來源清冊](../../test-source-inventory.md)。語言、repository adapter、runner 與錯誤 mapping 是技術 binding，與上面的行為斷言分開。

| 情境 ID | 既有來源及限制 |
| --- | --- |
| FT-H01 | board.mjs append-only schema…／human profile records… |
| FT-H02 | board.mjs active workflow…／start workflow and first task… |
| FT-H03 | completed task requires result… |
| FT-H04 | deferred preserves reason…／workflow completion refuses deferred… |
| FT-H05 | workflow completion…正例；terminal 拒絕額外矩陣需補 |
| FT-H06 | same workflow ID…／document and receipt routes…／contracts identity boundary… |
| FT-H07 | board lost response…／contracts durable idempotency… |
| FT-H08 | board stale CAS…／contracts stale CAS…zero rows…late receipt…；真實 D1 仍缺 |
| FT-H09 | multi-megabyte document history… |
| FT-H10 | inherited document names…／reserved and inherited task IDs…／source URL rejects… |
