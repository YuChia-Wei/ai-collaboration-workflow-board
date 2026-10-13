# 協作 Workflow 命令接受與狀態轉移 正式測試規格

## 脈絡、類型與來源

- 類型：formal-test；操作：normalize；狀態：草案 v2（2026-10-13），全部 `not_run`。
- 範圍：協作 Workflow aggregate 的 19 個命令與 R01–R05 產品例子。
- 行為規格：[collaboration/workflow/entity/workflow.spec.md](../../../collaboration/workflow/entity/workflow.spec.md)；測試環境與整體狀態見[共通規則](../../README.md)。
- 文件初始化基準：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；產品／測試來源仍固定 `3e7ee13cda8de27c8a069a062ffd0d289584722e`，兩者不混為新執行結果。
- 來源權威：Issue #3（updatedAt `2026-10-12T13:28:04Z`）保留 R01–R06／B01–B14／V01–V21；協作精確 wire 以 collaboration-v1 README／schema／vectors 為準；既有相容性來源為 ARCHITECTURE.md、PLATFORM-CONTRACT.md、各 src README 及現存 test source。code-only 回復項目仍為觀察／計畫，不提升為已核准產品要求。

## 環境、資料與隔離

最小層級為純 domain reducer＋application／合成 atomic repository，足以檢查狀態、授權分支、receipt 及版本；V04／V08 的真正 storage 競爭／rollback 另需 hosted integration。時間固定 `2026-10-12T00:00:00.000Z`。WorkflowRef 固定 `{store_id:local,namespace:personal,record_kind:collaboration,workflow_id:WF}`。

可信 A=`{owner_id:owner,actor:{subject_id:A,kind:agent,binding_id:grant-A},capabilities:[read,plan,execute,manage]}`；B 同 owner、subject B／binding grant-B；H 為 human／interactive-H，另具 decide／change_scope。每列重新建立資料，沒有列間相依。

P1 原文 `# Plan 1\n`；revision=1、hash 由原文的獨立 SHA-256 oracle 固定。T1 工作定義 D1：scope included=合成領域驗證、excluded=部署；description=完成 T1；completion_criteria=[交付結果]；dependencies=[]；plan_basis=P1；inputs=[]；expected_artifacts=[]；decision_ids=[]。必要交付 R-T1 引用 T1。正常 result summary=完成、criterion_results=[{criterion_index:0,outcome:satisfied,explanation:依定義交付,evidence_ids:[]}]、artifacts/evidence/limitations=[]。空 evidence 合法性以完成條件為準，不增設固定最少筆數。

H1 handoff 固定 completed=已保存進度、remaining=尚待完成、next_step=依原定義接手、artifact_refs/blockers/limitations=[]、next_actor_hint=B。正常命令具 profile=`workflow-board/collaboration/1`、schema=`1.0`、完整 ref、新 operation ID 及 Given 的 workflow revision。

除 replay 以外，每次 accepted 應增加 workflow revision 一次，並使 state／child facts／event／accepted receipt 原子可見。可持久保存的 domain／CAS rejection 應保存 rejected receipt，但 state、文件、事件與 workflow revision 不變；此規則只適用新 collaboration profile。確切事件 schema 依既有契約／domain 輸出，本文不創造未固定的公開事件 API。

測試層級與真實／替代邊界：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。每個情境與負例資料列獨立建立 Given，不以表格列順序共用狀態；清理僅針對執行者自己的 fixture，不自動清除 crash orphan；清理依既有授權。

## GWT 情境與具體斷言

### B01

來源標籤：B01／R01,V16。層級：domain/app。

**Given**：WF draft、P1／scope 已存；T1 pending 無前置、輸入齊備。

**When**：A `workflow.start {}`。

**Then**：WF active；T1 claimable；assignment=null；不產生 claim。

### B02

來源標籤：B02／R01,V03。層級：domain/app。

**Given**：T0 completed；A1 completed；A2 已由 A 以 X-A2/D1 有效承接；B1 仍由 B 承接，B2 pending；T3 depends=[A2,B2]。

**When**：A 以 X-A2/D1 提交 A2 成果。

**Then**：A2 completed；B 線 assignment 保留；T3 不 ready；當獨立資料列 B2 也 completed 時 T3 ready，無自動 claim。

### B03

來源標籤：B03／R01,V04。層級：app／真實 storage。

**Given**：revision=20、T1 ready、無 assignment；A/B 各持不同 operation ID。

**When**：同時 claim T1，均 expected_revision=20。

**Then**：恰一 accepted；revision=21；唯一 assignment 綁 winner；loser rejected；讀回不能覆寫 winner。

### B04

來源標籤：B04／R02,V05。層級：domain/app。

**Given**：A 的 X1/gen1 已 release＋H1；B 的 X2/gen2 有效；WF 最新 revision=23。

**When**：A 以 revision=23 和 X1/gen1 `task.complete`。

**Then**：assignment_expired；B/X2/gen2 保留；無 result/event；不能靠新 revision 恢復舊承接。

### B06

來源標籤：B06／R03,V06。層級：domain/app。

**Given**：A 以 X1/gen1/D1/P1 執行 T1。

**When**：`plan.revise` 同時提交 P2 與替換 T1 completion_criteria=[新條件]。

**Then**：rejected active_assignment；plan 仍 P1、D1/X1 保留；P2 原文不留下。

### B07

來源標籤：B07／R03,V17。層級：domain/app。

**Given**：T1 以 D1/P1/X1 執行；P2 只改未承接 T2，unaffected_task_ids=[T1] 已接受。

**When**：A 以最新 WF revision 完成 T1。

**Then**：accepted；result basis=P1/D1；T1 不需重新 claim；T2 definition_revision=2。

### B08

來源標籤：B08／R03,V18。層級：domain/app＋identity。

**Given**：Q1 由 H 依 P1 決定 A；T1 已 release；P2 改 T1 basis；明列 reconsider。

**When**：A 修 plan 至 P2。

**Then**：舊 Q1 revision／H 保留；新增 pending revision 依 P2；A 就算具 decide 也不能 resolve required_decider=human。

### B09

來源標籤：B09／R04,V07。層級：app＋storage。

**Given**：O1 的 T1 complete 已 durable accepted，回應遺失，後續 WF revision 已變。

**When**：同 A 重送完全相同 O1/body。

**Then**：完全原 receipt；result／event／revision 不再增加；不呼叫 clock／load／CAS。

### B10

來源標籤：B10／R04,V07,V08。層級：app＋storage。

**Given**：A/B 讀 revision=20；A claim A1 已到 21。

**When**：B/O-B 以 20 claim B1。

**Then**：durable rejected revision_conflict；A1 保留；B1 pending；同 O-B replay 原拒絕；修為 21 仍用 O-B→operation_payload_conflict；新 ID 可重新協調。

### B11

來源標籤：B11／R05,V16,V19。層級：domain/app。

**Given**：WF paused；T1/X1 有效；T2 ready。

**When**：A complete T1。

**Then**：T1 completed；T2 沒 assignment；paused claim T2 rejected task_not_ready；無自動 resume。

### B12

來源標籤：B12／R05,V10。層級：domain/app。

**Given**：T2 depends=[T1]；T1 pending。

**When**：A cancel T1 reason=取消。

**Then**：T1 cancelled；T2 不 ready；claim T2 rejected task_not_ready；取消不能視為 dependency completed。

### B13

來源標籤：B13／R05,V20。層級：domain/app。

**Given**：T1 completed；必要 R-T2 引用 cancelled T2；無 disposition。

**When**：A `workflow.complete summary=宣稱完成`。

**Then**：incomplete_requirements；WF 保留 active；無 closure event；H change_scope 合法 excluded/follow_up 處置是另一獨立成功變體。

### FT-C01

來源標籤：FT-C01 workflow.create。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：ref 不存在；A/new O，expected_revision=0，title=Test、goal=驗證、scope／skill=test,null、external_work_refs=[]。

**When**：提交 `workflow.create` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：draft revision 1、無 plan/tasks 合法；同 ref 新 operation 再 create 不覆蓋既有；create 非 0 先 shape reject。

### FT-C02

來源標籤：FT-C02 plan.revise。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：WF draft P1；T1 pending；P2 expected_doc_revision=1；replace T1 expected_definition_revision=1，其他未終態明列 unaffected。

**When**：提交 `plan.revise` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：P2/doc 2、T1/D2 與所有變更一次接受；漏列／重複列、終態 replace、active assignment、錯 document revision rejected；execution_impact=none 不得有 task/decision/requirement 差異。

### FT-C03

來源標籤：FT-C03 document.append。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：P1 已存；new supporting doc F expected_doc_revision=0 content=資料。

**When**：提交 `document.append` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：F1 保存原文/hash；目前 plan 仍 P1；再次 append F expected 1→F2；錯 doc revision/超 bytes 拒絕。

### FT-C04

來源標籤：FT-C04 workflow.start。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：draft P1／scope；T1 ready；start {}。

**When**：提交 `workflow.start` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：active、無 assignment；缺 plan／無 ready 拒絕；不加入固定批准。

### FT-C05

來源標籤：FT-C05 workflow.pause。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：active T1/X1；pause reason=暫停新工作。

**When**：提交 `workflow.pause` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：paused、X1 仍有效；禁止新 claim；已有 progress/complete/release 可保存。

### FT-C06

來源標籤：FT-C06 workflow.resume。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：paused T1 pending；resume {}。

**When**：提交 `workflow.resume` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：active；不自動 claim；非 paused 拒絕。

### FT-C07

來源標籤：FT-C07 workflow.complete。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：active/paused；T1 completed，全部終態，R-T1 fulfilled，無 assignment/closure decision。

**When**：提交 `workflow.complete` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：completed＋summary/refs；all-cancelled、無 completed、未交付、pending、assignment、closure decision 均拒絕。

### FT-C08

來源標籤：FT-C08 workflow.cancel。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：active；T1/X1、T2 pending；reason=停止工作 remaining=尚未交付。

**When**：提交 `workflow.cancel` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：WF cancelled；所有非終態 task cancelled；X1 失效；已 completed 結果不改；遲到 complete 拒絕；不聲稱程序停止。

### FT-C09

來源標籤：FT-C09 task.claim。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：active T1 ready/D1；A claim expected_definition_revision=1 session=null。

**When**：提交 `task.claim` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：server 新 X1/gen1 綁 A/D1/P1；第二 claim 拒絕；stale D／外部 input unresolved／decision pending／dependency 取消拒絕；session 不授權。

### FT-C10

來源標籤：FT-C10 task.progress。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：active/paused X1/gen1/D1 綁 A；summary=驗證中、evidence E1/not_run。

**When**：提交 `task.progress` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：保存觀察與 evidence；不改 scope/criteria；同 E1 不覆寫；wrong actor/expired generation/definition 拒絕。

### FT-C11

來源標籤：FT-C11 task.release。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：T1/X1 in_progress；A 或 H/manage，H1。

**When**：提交 `task.release` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：handoff 保存＋assignment 結束同次；T1 pending；原 actor A 和 ended_by H 區別；不自動 B claim；無 handoff 拒絕。

### FT-C12

來源標籤：FT-C12 task.block。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：T1/X1 in_progress；A，reason=缺少輸入、H1。

**When**：提交 `task.block` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：blocked＋handoff、X1 結束；不自動 claim；缺 reason／錯 assignment 拒絕。

### FT-C13

來源標籤：FT-C13 task.unblock。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：T1 blocked、無 assignment；resolution=輸入已補足。

**When**：提交 `task.unblock` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：pending、無 assignment；仍須重新 claim；非 blocked／缺 resolution 拒絕。

### FT-C14

來源標籤：FT-C14 task.complete。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：active/paused X1 有效；criterion_index 0 satisfied 結果。

**When**：提交 `task.complete` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：completed／結果保留 D1/P1，X1 結束；missing/duplicate/extra criterion index、not_satisfied、decision pending、wrong actor 拒絕；無固定 evidence 數門檻。

### FT-C15

來源標籤：FT-C15 task.cancel。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：pending/blocked 無 assignment，reason=取消；另一資料列 in_progress 提供 X1+H1。

**When**：提交 `task.cancel` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：cancelled；in_progress assignment 結束＋handoff；缺 X1/H1 拒絕；cancelled 不滿足 dependency。

### FT-C16

來源標籤：FT-C16 decision.open。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：Q1 不存在；question=選擇方案、options=[A,B]、required human、blocks T1/closure、basis P1。

**When**：提交 `decision.open` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：Q1 pending/rev 1；T1 blockedbydecision；duplicate Q1／missing basis 不能替換阻擋。

### FT-C17

來源標籤：FT-C17 decision.resolve。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：Q1 pending/rev 1、basis P1、required human；H expected 1 outcome=decided value=A reason=採用。

**When**：提交 `decision.resolve` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：Q1 新 rev 2、實際 H 與 P1 保留；waived 獨立列 value=null；stale rev／basis mismatch／Agent 冒 human 拒絕。

### FT-C18

來源標籤：FT-C18 handoff.record。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：T1/X1 有效；A，task_id T1/H1。

**When**：提交 `handoff.record` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：保存交辦資訊；X1 仍有效；next_actor_hint B 不授權；不 release/claim。

### FT-C19

來源標籤：FT-C19 checkpoint.append。層級：domain／application 與合成 atomic repository；指定競爭／rollback 情境另需真實 storage。

**Given**：WF completed；observation=結案附註、next_step=無、document_refs=[]。

**When**：提交 `checkpoint.append` 命令，採 Given 中的 payload／版本；拒絕變體分開執行。。

**Then**：append 觀察；WF 仍 completed；task/assignment/decision 不改；refs 存在性檢查；不復活執行。

## 規則覆蓋與排除

本檔唯一正式定義的情境為：B01, B02, B03, B04, B06, B07, B08, B09, B10, B11, B12, B13, FT-C01, FT-C02, FT-C03, FT-C04, FT-C05, FT-C06, FT-C07, FT-C08, FT-C09, FT-C10, FT-C11, FT-C12, FT-C13, FT-C14, FT-C15, FT-C16, FT-C17, FT-C18, FT-C19。其他 IDs 是追溯引用，不重複定義。每項成功／拒絕／邊界斷言沿用原始 v1；「來源存在」僅為靜態來源映射，不能把整個 V criterion 標示通過。Issue #3 完整 R/B/V 矩陣見[索引](../../README.md)，技術來源及未覆蓋變體見下節。

## 執行與證據界線

本次 `not_run`：未執行產品測試、啟動服務、建立真實 browser／Agent session、建置或部署。normalize 只重組文件、改善可讀性並保留來源狀態。來源 fixture、schema 或 assert 名稱不是執行紀錄；future execution 必須綁不可變 commit、scenario/data row、actual identifier、環境、原始輸出及每個 Then 的證據。自我檢查不代表獨立驗收。

## 未知、衝突與開放問題

每個來源欄保留的缺口、部分覆蓋、觀察及未實作界線仍有效；不能因移入新目錄而改為 implemented／passed。需要的未定 oracle／真實邊界由原 Issue owner 收斂；不新增 runner、框架、固定批准、產品權限或部署要求。

新 collaboration profile 的可信 identity、production persistence、query snapshots、HTTP／MCP transport 尚未接入；domain／application 或 DTO 存在不證明 hosted capability。

## 技術 binding 與既有測試來源

以下保留原始 actual test identifier／部分來源／缺口；完整具名清冊見[來源清冊](../../test-source-inventory.md)。語言、repository adapter、runner 與錯誤 mapping 是技術 binding，與上面的行為斷言分開。

| 情境 ID | 既有來源及限制 |
| --- | --- |
| B01 | collaboration.mjs `B01: draft ready permits start without automatically claiming` |
| B02 | `B02: two workstreams progress independently and join waits for both`；label 不改 readiness 的獨立變體尚需補 |
| B03 | `B03: concurrent claims accept one assignment and reject the other without overwrite`；memory；hosted gap |
| B04 | `B04: release and reclaim fence old assignment even with the latest workflow revision` |
| B06 | `B06: an active definition cannot change; appended plan bytes are not partially retained` |
| B07 | `B07: unrelated plan revision leaves an active assignment and its old basis valid` |
| B08 | `B08: changed decision basis requires reconsideration and cannot be self-approved by an Agent`；trusted identity integration gap |
| B09 | 現存 B09 使用 **task.claim**；可證明通用 replay，來源 B09 的 complete 專用資料列未直接存在 |
| B10 | `B10: a stale operation has a durable rejection; a reconciled request needs a new ID` |
| B11 | `B11: paused workflow accepts existing completion and rejects new claims` |
| B12 | `B12: cancelled dependency does not make downstream work ready` |
| B13 | `B13: required delivery cannot be cancelled into completion without authorized scope disposition` |
| FT-C01 | B01 fixture 正例；重建同 ref／revision 反例需補 |
| FT-C02 | B06/B07、invalid DAGs…、a plan cannot erase…；漏列/重複列/終態 exhaustive rows 需補 |
| FT-C03 | UTF-8…有超限拒絕；supporting/result 正常及 doc CAS 完整表需補 |
| FT-C04 | B01 |
| FT-C05 | B11；progress/release paused 獨立資料列需補 |
| FT-C06 | B11 正例；非法狀態需補 |
| FT-C07 | B13；criteria…；各 closure 拒絕獨立資料列需補 |
| FT-C08 | workflow cancellation closes…；completed child 保留需補 |
| FT-C09 | B02/B03/B04/B10、criteria…；input 條件完整表需補 |
| FT-C10 | block records handoff…、B04；獨立 definition mismatch row 需補 |
| FT-C11 | B04、management release uses… |
| FT-C12 | block records handoff… |
| FT-C13 | block records handoff…正例；拒絕表需補 |
| FT-C14 | criteria…、B04/B07/B11；索引完整拒絕矩陣需補 |
| FT-C15 | B12/B13；active cancel 完整資料列需補 |
| FT-C16 | B08、criteria…；duplicate/open 替代反例需補 |
| FT-C17 | B08；waived 成功／stale basis 資料列需補 |
| FT-C18 | handoff information and checkpoint… |
| FT-C19 | B13 及 handoff information…；錯 refs 完整資料列需補 |
