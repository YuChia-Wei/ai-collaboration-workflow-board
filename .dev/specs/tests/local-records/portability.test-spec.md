# Local Records 匯出與還原 正式測試規格

## 脈絡、類型與來源

- 類型：formal-test；操作：normalize；狀態：草案 v2（2026-10-13），全部 `not_run`。
- 範圍：可攜 package、preflight、角色重綁、原子 publish 與 crash recovery。
- 行為規格：[local-records/portability/export-restore.spec.md](../../local-records/portability/export-restore.spec.md)；測試環境與整體狀態見[共通規則](../README.md)。
- 文件初始化基準：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；產品／測試來源仍固定 `3e7ee13cda8de27c8a069a062ffd0d289584722e`，兩者不混為新執行結果。
- 來源權威：Issue #3（updatedAt `2026-10-12T13:28:04Z`）保留 R01–R06／B01–B14／V01–V21；協作精確 wire 以 collaboration-v1 README／schema／vectors 為準；既有相容性來源為 ARCHITECTURE.md、PLATFORM-CONTRACT.md、各 src README 及現存 test source。code-only 回復項目仍為觀察／計畫，不提升為已核准產品要求。

## 環境、資料與隔離

這是另一個 workflow-record context，states planned/active/blocked/completed 等以本機 validation 為準；不要套 Boardtaskassignment 語意。Python3.13/Git，實際 loopbackHTTP+SQLite，CLI/MCP stdio 子程序；publicdemo tokens 僅 fixture。每列 store/path/namespace 隔離。角色 writer/read/export、reader/read、reviewer/approve 與 principal 分開；沒有線上登入、externalwriter 或真實資料 migration 授權。

每列獨立 export package／新 target path；target 必須不存在；role bindings 重新提供。原 HTTP／DB 離線時序由 FT-X05 固定，不能改寫為正式 migration 證據。

測試層級與真實／替代邊界：真本機 SQLite／filesystem／process integration 與受控 race；合成 rehearsal。每個情境與負例資料列獨立建立 Given，不以表格列順序共用狀態；清理僅針對執行者自己的 fixture，不自動清除 crash orphan；清理依既有授權。

## GWT 情境與具體斷言

### FT-X01

來源標籤：FT-X01。層級：真本機 SQLite／filesystem／process integration 與受控 race；合成 rehearsal。

**Given**：namespace demo 含 WF/events/operations/blobs/rolemapping。

**When**：export。

**Then**：manifest counts 與 payload 對應、payload hash 正確；無 writer/reader token、binding credentials；external_effects_enabled=false。

### FT-X02

來源標籤：FT-X02。層級：真本機 SQLite／filesystem／process integration 與受控 race；合成 rehearsal。

**Given**：FT-X01 package，各列篡 package hash/blob/relationship/revision/operationpayload hash/unsafe external flag；必要時重算 outer hash。

**When**：preflight。

**Then**：六列 Fault；不能只靠 outer hash 接受內部不一致；不寫 target。

### FT-X03

來源標籤：FT-X03。層級：真本機 SQLite／filesystem／process integration 與受控 race；合成 rehearsal。

**Given**：篡 receipt accepted/ID/principal/hash/revisionbool、eventcommandnamespace/WF/operation/revision、missingroles/forgedapproval/divergentsnapshot/client 各列。

**When**：preflight/restore。

**Then**：Fault；target 不存在；history/command/receipt/principal/role 須對應；重算 hash 不能洗白錯誤歷史。

### FT-X04

來源標籤：FT-X04。層級：真本機 SQLite／filesystem／process integration 與受控 race；合成 rehearsal。

**Given**：status 未知/非 string、revisionbool、required_documentsnull、stepstateinvented。

**When**：restore；命令 expected_revision=true 另列。

**Then**：拒絕 invalidlifecycle/types；不創 target；bool 不當 integer。

### FT-X05

來源標籤：FT-X05。層級：真本機 SQLite／filesystem／process integration 與受控 race；合成 rehearsal。

**Given**：匯出 pack valid；target 不存在；新 bindings 新 token；原 HTTP／DB 可讀；restore 完成後，continuation 前關閉原 HTTP 並將原 DB 移出可用 path。

**When**：restore 至新 store → 關閉原來源 → 新 store 續寫（有意 cutover sequence）。

**Then**：workflows/events/operations/blobs 與原 pack 完全相等；oldtoken 401、新 token 可讀寫、newlogevent+1；existingtarget 拒絕、不覆寫；emptybindings 失敗且 target 不存在。

### FT-X06

來源標籤：FT-X06。層級：真本機 SQLite／filesystem／process integration 與受控 race；合成 rehearsal。

**Given**：restore 使用 temporary DB；最終 target 尚不存在；競爭者寫 target bytes=`other owner target`。

**When**：受控的 restore publication race。

**Then**：target 未完整前不可見；conflict 409；不覆寫／刪競爭者 bytes。

### FT-X07

來源標籤：FT-X07。層級：真本機 SQLite／filesystem／process integration 與受控 race；合成 rehearsal。

**Given**：child restore 在建表後 publication 前停住，target 不存在。

**When**：terminate child 後重試同 package 至新 target。

**Then**：crash 不 publish 半 DB；重試 valid、再次 export/preflight valid；orphan 僅證據不自動 purge。

## 規則覆蓋與排除

本檔唯一正式定義的情境為：FT-X01, FT-X02, FT-X03, FT-X04, FT-X05, FT-X06, FT-X07。其他 IDs 是追溯引用，不重複定義。每項成功／拒絕／邊界斷言沿用原始 v1；「來源存在」僅為靜態來源映射，不能把整個 V criterion 標示通過。Issue #3 完整 R/B/V 矩陣見[索引](../README.md)，技術來源及未覆蓋變體見下節。

## 執行與證據界線

本次 `not_run`：未執行產品測試、啟動服務、建立真實 browser／Agent session、建置或部署。normalize 只重組文件、改善可讀性並保留來源狀態。來源 fixture、schema 或 assert 名稱不是執行紀錄；future execution 必須綁不可變 commit、scenario/data row、actual identifier、環境、原始輸出及每個 Then 的證據。自我檢查不代表獨立驗收。

## 未知、衝突與開放問題

每個來源欄保留的缺口、部分覆蓋、觀察及未實作界線仍有效；不能因移入新目錄而改為 implemented／passed。需要的未定 oracle／真實邊界由原 Issue owner 收斂；不新增 runner、框架、固定批准、產品權限或部署要求。

## 技術 binding 與既有測試來源

以下保留原始 actual test identifier／部分來源／缺口；完整具名清冊見[來源清冊](../test-source-inventory.md)。語言、repository adapter、runner 與錯誤 mapping 是技術 binding，與上面的行為斷言分開。

| 情境 ID | 既有來源及限制 |
| --- | --- |
| FT-X01 | acceptance08；明列 secret 排除，不代表已 productionprivacy 驗收 |
| FT-X02 | acceptance08 |
| FT-X03 | regression05 |
| FT-X04 | regression06 |
| FT-X05 | acceptance test_zz_restore_original_offline_and_continue；synthetic rehearsal，非正式 migration |
| FT-X06 | regression13；os.link fault injection，不等跨所有 filesystem 證明 |
| FT-X07 | regression14；真實 process crash、本機 filesystem |
