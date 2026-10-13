# Local Records 用例與客戶端整合 正式測試規格

## 脈絡、類型與來源

- 類型：formal-test；操作：normalize；狀態：草案 v2（2026-10-13），全部 `not_run`。
- 範圍：獨立本機 workflow-record context 的命令、批准、證據與 HTTP／CLI／MCP。
- 行為規格：[local-records/workflow/behaviors/commands.spec.md](../../local-records/workflow/behaviors/commands.spec.md)；測試環境與整體狀態見[共通規則](../README.md)。
- 文件初始化基準：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；產品／測試來源仍固定 `3e7ee13cda8de27c8a069a062ffd0d289584722e`，兩者不混為新執行結果。
- 來源權威：Issue #3（updatedAt `2026-10-12T13:28:04Z`）保留 R01–R06／B01–B14／V01–V21；協作精確 wire 以 collaboration-v1 README／schema／vectors 為準；既有相容性來源為 ARCHITECTURE.md、PLATFORM-CONTRACT.md、各 src README 及現存 test source。code-only 回復項目仍為觀察／計畫，不提升為已核准產品要求。

## 環境、資料與隔離

這是另一個 workflow-record context，states planned/active/blocked/completed 等以本機 validation 為準；不要套 Boardtaskassignment 語意。Python3.13/Git，實際 loopbackHTTP+SQLite，CLI/MCP stdio 子程序；publicdemo tokens 僅 fixture。每列 store/path/namespace 隔離。角色 writer/read/export、reader/read、reviewer/approve 與 principal 分開；沒有線上登入、externalwriter 或真實資料 migration 授權。

測試層級與真實／替代邊界：Python SQLite、真 loopback HTTP／CLI／MCP 子程序；regression 部分 fault injection。每個情境與負例資料列獨立建立 Given，不以表格列順序共用狀態；清理僅針對執行者自己的 fixture，不自動清除 crash orphan；清理依既有授權。

## GWT 情境與具體斷言

### FT-L01

來源標籤：FT-L01。層級：Python SQLite、真 loopback HTTP／CLI／MCP 子程序；regression 部分 fault injection。

**Given**：50 steps synthetic-416，CLI A 寫 log 後退出，新 MCP B initialize/listtools。

**When**：B context 後按 revision 續寫 log（有意 cross-client 序列）。

**Then**：context 完整 50 steps、missing-required 明列、handoffs/evidencefailure/sourcecommit 保留；B 新事件 revision+1；transcript real_agent_E2E=false；不證真實 agents。

### FT-L02

來源標籤：FT-L02。層級：Python SQLite、真 loopback HTTP／CLI／MCP 子程序；regression 部分 fault injection。

**Given**：50 steps、external link example.invalid/416。

**When**：HTTP list external link。

**Then**：一筆 workflow、50 steps；沒有 providerwriter；不創建 Issue。

### FT-L03

來源標籤：FT-L03。層級：Python SQLite、真 loopback HTTP／CLI／MCP 子程序；regression 部分 fault injection。

**Given**：兩 log 同 expected revision，不同 operation ID。

**When**：真正兩 threadHTTP 同時 POST。

**Then**：sorted status=[200,409]、revision delta1；loser 不留 event/receipt。

### FT-L04

來源標籤：FT-L04。層級：Python SQLite、真 loopback HTTP／CLI／MCP 子程序；regression 部分 fault injection。

**Given**：T2planned，未有 evidence。

**When**：update_step completed（另列先 active 再 missing evidence complete）。

**Then**：illegal_transition 或 missing_required_evidence 422；snapshot 不變；該 operation 查 404（既有 local 語意）。

### FT-L05

來源標籤：FT-L05。層級：Python SQLite、真 loopback HTTP／CLI／MCP 子程序；regression 部分 fault injection。

**Given**：O1log durable 但 response 被丟；clientoutboxignored；離線 port1 另列。

**When**：submit 原 O1；另列原 ID 改 body。

**Then**：originalaccepted once/replay 相同；改 body 409；offline 最多 3 attempts（operation GET 失敗也消耗 attempt，可能 0 POST）,pending/retry_exhausted；readerdenial 一次即 rejected、不 retry。

### FT-L06

來源標籤：FT-L06。層級：Python SQLite、真 loopback HTTP／CLI／MCP 子程序；regression 部分 fault injection。

**Given**：writer/demo；reader 只讀；reviewer 批准；invalid token/other namespace。

**When**：各列讀/寫/approve/acl/publish/sql/create_issue／Originoutside。

**Then**：other 403、invalid 401、writer privileged 403、reader write 403、reviewer approve 200 但 log 403、outside Origin 403；trusted principal 不取 payload actor。

### FT-L07

來源標籤：FT-L07。層級：Python SQLite、真 loopback HTTP／CLI／MCP 子程序；regression 部分 fault injection。

**Given**：final plan revision 1 附 DEC-1；scratch optional。

**When**：doccreate/revise-addendum/rename/archive 各獨立列。

**Then**：final 無 relation 422；明確 addendum 新增 rev 2，revision 1 decision refs 保留；rename 不改歷史；scratch tombstone；指定 plan revision 1 原文可讀。

### FT-L08

來源標籤：FT-L08。層級：Python SQLite、真 loopback HTTP／CLI／MCP 子程序；regression 部分 fault injection。

**Given**：required_documents 含 plan；另列 indexed-only required flag=false 但 index 含它。

**When**：archive document。

**Then**：required_document_archive_forbidden 422，payload 不變；只有 indexed-only 且 required=false 的文件移出必要 index 後才可 archive；required=true 的文件必須保留必要索引，不能藉移出繞過；optional 兩版+tombstone export/restore 等值。

### FT-L09

來源標籤：FT-L09。層級：Python SQLite、真 loopback HTTP／CLI／MCP 子程序；regression 部分 fault injection。

**Given**：E1blob=`atomic`bytes、base64 有效、command/result/outcome/source/environment 完整。

**When**：evidence command。

**Then**：blob hash 為原 bytes 的 SHA-256，metadata 不存 base64；duplicate ID 拒絕；invalid base64→invalid_blob；>1MiB→blob_too_large 413；不能執行 evidence.command；跨 namespace blob 404。

### FT-L10

來源標籤：FT-L10。層級：Python SQLite、真 loopback HTTP／CLI／MCP 子程序；regression 部分 fault injection。

**Given**：reviewer 具 approve；finaldoc 由不同 principal 作者；另一列 reviewer 曾撰寫同 workflow 任一文件／non-final。

**When**：approve document。

**Then**：保存 current final revision+actual principal；同 workflow 曾撰寫任一文件的 principal → independent_approval_required 403，non-final→not_final；writer 無 approve 先拒絕。

### FT-L11

來源標籤：FT-L11。層級：Python SQLite、真 loopback HTTP／CLI／MCP 子程序；regression 部分 fault injection。

**Given**：completed step T1 有 result/E1。

**When**：update_step 不帶 status 但 result 空白／evidence=[]；或 evidenceidsmissing/string/null。

**Then**：missing_required_evidence／invalid_step_relationship 422；既有 complete 成果不能退化；export 仍 valid。

### FT-L12

來源標籤：FT-L12。層級：Python SQLite、真 loopback HTTP／CLI／MCP 子程序；regression 部分 fault injection。

**Given**：activeWF 必要 plan；plannedcandidate 加入 missingdoc；completed WF 另列。

**When**：completed＋required_documents=[new-missing]；或 completed 後 add unfinished step。

**Then**：missing_required_documents/incomplete_steps；候選完整狀態驗證；終態仍可 log/finaladdendum 但不能重開或破壞結案。

### FT-L13

來源標籤：FT-L13。層級：Python SQLite、真 loopback HTTP／CLI／MCP 子程序；regression 部分 fault injection。

**Given**：evidence 內容 null/blank/emptyenv/inventedoutcome 各列；有效 failed evidence 另列。

**When**：evidence 或 complete resultwhitespace。

**Then**：invalid_evidence_content 或對應 422；failed evidence 可保留調查完成，不能被寫成 passed；result 空白不能 complete。

### FT-L14

來源標籤：FT-L14。層級：Python SQLite、真 loopback HTTP／CLI／MCP 子程序；regression 部分 fault injection。

**Given**：maximum write attempts 已用完但最後 O1 可能 accepted；另列第三次 response 丟失。

**When**：再 submit/reconcile 原 outbox。

**Then**：仍先 operation GET；accepted 停止 POST；attempt budget 不阻止讀回；保持原 ID 與 result。

### FT-L15

來源標籤：FT-L15。層級：Python SQLite、真 loopback HTTP／CLI／MCP 子程序；regression 部分 fault injection。

**Given**：context 讀取中另一 connection 可寫下一 revision。

**When**：context 一次。

**Then**：workflowrev 與 events[-1].after_revision 同 snapshot；後續 context 才見 rev+1；不混版。

### FT-L16

來源標籤：FT-L16。層級：Python SQLite、真 loopback HTTP／CLI／MCP 子程序；regression 部分 fault injection。

**Given**：receipt INSERT trigger abort，evidence blob 候選已準備。

**When**：command evidence。

**Then**：SQLite IntegrityError；workflow/events/operations/blobs 全 rollback；atomicblob hash 無 row。

## 規則覆蓋與排除

本檔唯一正式定義的情境為：FT-L01, FT-L02, FT-L03, FT-L04, FT-L05, FT-L06, FT-L07, FT-L08, FT-L09, FT-L10, FT-L11, FT-L12, FT-L13, FT-L14, FT-L15, FT-L16。其他 IDs 是追溯引用，不重複定義。每項成功／拒絕／邊界斷言沿用原始 v1；「來源存在」僅為靜態來源映射，不能把整個 V criterion 標示通過。Issue #3 完整 R/B/V 矩陣見[索引](../README.md)，技術來源及未覆蓋變體見下節。

## 執行與證據界線

本次 `not_run`：未執行產品測試、啟動服務、建立真實 browser／Agent session、建置或部署。normalize 只重組文件、改善可讀性並保留來源狀態。來源 fixture、schema 或 assert 名稱不是執行紀錄；future execution 必須綁不可變 commit、scenario/data row、actual identifier、環境、原始輸出及每個 Then 的證據。自我檢查不代表獨立驗收。

## 未知、衝突與開放問題

每個來源欄保留的缺口、部分覆蓋、觀察及未實作界線仍有效；不能因移入新目錄而改為 implemented／passed。需要的未定 oracle／真實邊界由原 Issue owner 收斂；不新增 runner、框架、固定批准、產品權限或部署要求。

## 技術 binding 與既有測試來源

以下保留原始 actual test identifier／部分來源／缺口；完整具名清冊見[來源清冊](../test-source-inventory.md)。語言、repository adapter、runner 與錯誤 mapping 是技術 binding，與上面的行為斷言分開。

| 情境 ID | 既有來源及限制 |
| --- | --- |
| FT-L01 | test_01_http_cli_to_new_mcp_session |
| FT-L02 | test_02_fifty_steps_no_external_writer |
| FT-L03 | test_03_concurrent_cas |
| FT-L04 | test_04_illegal_and_missing_evidence_rollback |
| FT-L05 | test_05_lost_response_and_bounded_outbox；reopen test_09_store_reopen_idempotency |
| FT-L06 | test_06_namespaces_roles_and_auth；regression12 |
| FT-L07 | test_07_documents_revisions_tombstones |
| FT-L08 | regressions test_15_required_archive_admission_and_optional_tombstone_roundtrip |
| FT-L09 | layout namespace_scoped_blob；regression11 rollback；base64/size 正反完整矩陣為 code-derived 計畫 |
| FT-L10 | acceptance06 正例；同作者/nonfinal code-derived 計畫，非已觀測通過 |
| FT-L11 | regression01/02 |
| FT-L12 | regression03/04 |
| FT-L13 | regression07 |
| FT-L14 | regression08/09 |
| FT-L15 | regression10 |
| FT-L16 | regression11 |
