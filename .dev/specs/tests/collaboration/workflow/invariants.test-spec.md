# 協作 Workflow 不變條件與故障接受 正式測試規格

## 脈絡、類型與來源

- 類型：formal-test；操作：normalize；狀態：草案 v2（2026-10-13），全部 `not_run`。
- 範圍：協作一致性、授權、完整 command state、未知結果與 immutable facts。
- 行為規格：[collaboration/workflow/entity/workflow.spec.md](../../../collaboration/workflow/entity/workflow.spec.md)；測試環境與整體狀態見[共通規則](../../README.md)。
- 文件初始化基準：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；產品／測試來源仍固定 `3e7ee13cda8de27c8a069a062ffd0d289584722e`，兩者不混為新執行結果。
- 來源權威：Issue #3（updatedAt `2026-10-12T13:28:04Z`）保留 R01–R06／B01–B14／V01–V21；協作精確 wire 以 collaboration-v1 README／schema／vectors 為準；既有相容性來源為 ARCHITECTURE.md、PLATFORM-CONTRACT.md、各 src README 及現存 test source。code-only 回復項目仍為觀察／計畫，不提升為已核准產品要求。

## 環境、資料與隔離

最小層級為純 domain reducer＋application／合成 atomic repository，足以檢查狀態、授權分支、receipt 及版本；V04／V08 的真正 storage 競爭／rollback 另需 hosted integration。時間固定 `2026-10-12T00:00:00.000Z`。WorkflowRef 固定 `{store_id:local,namespace:personal,record_kind:collaboration,workflow_id:WF}`。

可信 A=`{owner_id:owner,actor:{subject_id:A,kind:agent,binding_id:grant-A},capabilities:[read,plan,execute,manage]}`；B 同 owner、subject B／binding grant-B；H 為 human／interactive-H，另具 decide／change_scope。每列重新建立資料，沒有列間相依。

P1 原文 `# Plan 1\n`；revision=1、hash 由原文的獨立 SHA-256 oracle 固定。T1 工作定義 D1：scope included=合成領域驗證、excluded=部署；description=完成 T1；completion_criteria=[交付結果]；dependencies=[]；plan_basis=P1；inputs=[]；expected_artifacts=[]；decision_ids=[]。必要交付 R-T1 引用 T1。正常 result summary=完成、criterion_results=[{criterion_index:0,outcome:satisfied,explanation:依定義交付,evidence_ids:[]}]、artifacts/evidence/limitations=[]。空 evidence 合法性以完成條件為準，不增設固定最少筆數。

H1 handoff 固定 completed=已保存進度、remaining=尚待完成、next_step=依原定義接手、artifact_refs/blockers/limitations=[]、next_actor_hint=B。正常命令具 profile=`workflow-board/collaboration/1`、schema=`1.0`、完整 ref、新 operation ID 及 Given 的 workflow revision。

除 replay 以外，每次 accepted 應增加 workflow revision 一次，並使 state／child facts／event／accepted receipt 原子可見。可持久保存的 domain／CAS rejection 應保存 rejected receipt，但 state、文件、事件與 workflow revision 不變；此規則只適用新 collaboration profile。確切事件 schema 依既有契約／domain 輸出，本文不創造未固定的公開事件 API。

測試層級與真實／替代邊界：domain／application／合成故障注入；真實 hosted storage 尚缺。每個情境與負例資料列獨立建立 Given，不以表格列順序共用狀態；清理僅針對執行者自己的 fixture，不自動清除 crash orphan；清理依既有授權。

## GWT 情境與具體斷言

### FT-I01

來源標籤：FT-I01／V10,V21。層級：domain／application／合成故障注入；真實 hosted storage 尚缺。

**Given**：T1/T2 完整 command state。

**When**：P2 令 T1 依賴自己、不存在 missing、跨 workflow WF2.T1 或 T1↔T2 循環（四獨立列）。

**Then**：invalid_dependency／dependency_cycle；P2／定義／events 不存；不是截斷 DAG 通過。

### FT-I02

來源標籤：FT-I02／V08,V21。層級：domain／application／合成故障注入；真實 hosted storage 尚缺。

**Given**：repo incomplete=true，WF 可見部分 T1。

**When**：claim T1。

**Then**：incomplete_command_state；不以部分資料接受；無本機 fallback。

### FT-I03

來源標籤：FT-I03／V07,V08。層級：domain／application／合成故障注入；真實 hosted storage 尚缺。

**Given**：O1 尚無 durable 結果；repo failBeforeCommit=true。

**When**：claim T1。

**Then**：storage_unavailable；domain snapshot 不變；operation=unknown；重試保留 O1 原 body。

### FT-I04

來源標籤：FT-I04／V15。層級：domain／application／合成故障注入；真實 hosted storage 尚缺。

**Given**：A O1 已 accepted；A capabilities=[]。

**When**：replay O1。

**Then**：forbidden 先於 receipt 與 domain 讀取；不能洩漏 O1；B 同 owner 重送 A/body 因可信 actor digest 不同→operation_payload_conflict。

### FT-I05

來源標籤：FT-I05／V18。層級：domain／application／合成故障注入；真實 hosted storage 尚缺。

**Given**：Q1 human 決定 P1；T1 已 release；P2 改 basis。

**When**：A 用 carry_forward 或 waive 處置 Q1（各列）。

**Then**：decision_actor_mismatch；舊 human 決定/阻擋歷史保留；H 同權成功為獨立待補列。

### FT-I06

來源標籤：FT-I06／V20。層級：domain／application／合成故障注入；真實 hosted storage 尚缺。

**Given**：R-T1 必要交付已存在。

**When**：P2 刪 R-T1；或改其定義；或 Agent excluded 無 change_scope。

**Then**：requirement_history_required／對應契約拒絕；原交付保留；follow_up 需 ref。

### FT-I07

來源標籤：FT-I07／V15,V17。層級：domain／application／合成故障注入；真實 hosted storage 尚缺。

**Given**：execute 開始時 command.task_id=T1，access A。

**When**：caller 在 IO 間把 task_id/subject 改 other。

**Then**：accepted 仍指 T1/A；另列修改 reducer 輸出不能改原 aggregate。

### FT-I08

來源標籤：FT-I08／V16,V19。層級：domain／application／合成故障注入；真實 hosted storage 尚缺。

**Given**：每個成功/拒絕/replay 轉移後。

**When**：讀回所有 tasks 與 assignment history。

**Then**：in_progress 恰一 active assignment；其他狀態零 active；同 task generation 嚴格增加；不同 WF revision 不等於 definition/gen。

## 規則覆蓋與排除

本檔唯一正式定義的情境為：FT-I01, FT-I02, FT-I03, FT-I04, FT-I05, FT-I06, FT-I07, FT-I08。其他 IDs 是追溯引用，不重複定義。每項成功／拒絕／邊界斷言沿用原始 v1；「來源存在」僅為靜態來源映射，不能把整個 V criterion 標示通過。Issue #3 完整 R/B/V 矩陣見[索引](../../README.md)，技術來源及未覆蓋變體見下節。

## 執行與證據界線

本次 `not_run`：未執行產品測試、啟動服務、建立真實 browser／Agent session、建置或部署。normalize 只重組文件、改善可讀性並保留來源狀態。來源 fixture、schema 或 assert 名稱不是執行紀錄；future execution 必須綁不可變 commit、scenario/data row、actual identifier、環境、原始輸出及每個 Then 的證據。自我檢查不代表獨立驗收。

## 未知、衝突與開放問題

每個來源欄保留的缺口、部分覆蓋、觀察及未實作界線仍有效；不能因移入新目錄而改為 implemented／passed。需要的未定 oracle／真實邊界由原 Issue owner 收斂；不新增 runner、框架、固定批准、產品權限或部署要求。

新 collaboration profile 的可信 identity、production persistence、query snapshots、HTTP／MCP transport 尚未接入；domain／application 或 DTO 存在不證明 hosted capability。

## 技術 binding 與既有測試來源

以下保留原始 actual test identifier／部分來源／缺口；完整具名清冊見[來源清冊](../../test-source-inventory.md)。語言、repository adapter、runner 與錯誤 mapping 是技術 binding，與上面的行為斷言分開。

| 情境 ID | 既有來源及限制 |
| --- | --- |
| FT-I01 | domain；invalid DAGs…前三列；跨 workflow 需補 |
| FT-I02 | app；unavailable and incomplete state… |
| FT-I03 | synthetic fault；unavailable and incomplete state…；real commit unknown gap |
| FT-I04 | app；owner/store/actor constraints…＋B09；可信 transport gap |
| FT-I05 | a plan cannot erase…；H 成功 carry_forward/waive gap |
| FT-I06 | a plan cannot erase…＋B13；follow_up 正反例需補 |
| FT-I07 | caller mutation during IO… |
| FT-I08 | B01/B04、block records…部分；全 19 commands property sweep 尚缺 |
