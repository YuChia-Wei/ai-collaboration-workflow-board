# 協作 Workflow 正式測試規格

類型：formal-test；草案 v1；本次全部 not_run。權威：Issue #3（updatedAt `2026-10-12T13:28:04Z`）R01–R06、B01–B14、V01–V21；精確 wire 與接受協定由 `src/board/contracts/collaboration-v1/{README.md,schema.json}` 固定。來源程式均綁基準 commit `3e7ee13cda8de27c8a069a062ffd0d289584722e`。來源測試對照是已閱讀的 action／assertion，不是執行證據。

## 環境與固定資料

最小層級為純 domain reducer＋application／合成 atomic repository，足以檢查狀態、授權分支、receipt 及版本；V04／V08 的真正 storage 競爭／rollback 另需 hosted integration。時間固定 `2026-10-12T00:00:00.000Z`。WorkflowRef 固定 `{store_id:local,namespace:personal,record_kind:collaboration,workflow_id:WF}`。

可信 A=`{owner_id:owner,actor:{subject_id:A,kind:agent,binding_id:grant-A},capabilities:[read,plan,execute,manage]}`；B 同 owner、subject B／binding grant-B；H 為 human／interactive-H，另具 decide／change_scope。每列重新建立資料，沒有列間相依。

P1 原文 `# Plan 1\n`；revision=1、hash 由原文的獨立 SHA-256 oracle 固定。T1 工作定義 D1：scope included=合成領域驗證、excluded=部署；description=完成 T1；completion_criteria=[交付結果]；dependencies=[]；plan_basis=P1；inputs=[]；expected_artifacts=[]；decision_ids=[]。必要交付 R-T1 引用 T1。正常 result summary=完成、criterion_results=[{criterion_index:0,outcome:satisfied,explanation:依定義交付,evidence_ids:[]}]、artifacts/evidence/limitations=[]。空 evidence 合法性以完成條件為準，不增設固定最少筆數。

H1 handoff 固定 completed=已保存進度、remaining=尚待完成、next_step=依原定義接手、artifact_refs/blockers/limitations=[]、next_actor_hint=B。正常命令具 profile=`workflow-board/collaboration/1`、schema=`1.0`、完整 ref、新 operation ID 及 Given 的 workflow revision。

除 replay 以外，每次 accepted 應增加 workflow revision 一次，並使 state／child facts／event／accepted receipt 原子可見。可持久保存的 domain／CAS rejection 應保存 rejected receipt，但 state、文件、事件與 workflow revision 不變；此規則只適用新 collaboration profile。確切事件 schema 依既有契約／domain 輸出，本文不創造未固定的公開事件 API。

## R／B 產品例子

以下 B ID 保留 Issue #3 原義；較長前置序列全部放在 Given。Then 以讀回狀態與 receipt／原文為 oracle。

| ID／來源 | 層級 | Given | When | Then 可觀測斷言 | 現存來源／缺口 |
| --- | --- | --- | --- | --- | --- |
| B01／R01,V16 | domain/app | WF draft、P1／scope 已存；T1 pending 無前置、輸入齊備 | A `workflow.start {}` | WF active；T1 claimable；assignment=null；不產生 claim | collaboration.mjs `B01: draft ready permits start without automatically claiming` |
| B02／R01,V03 | domain/app | T0 completed；A1 completed；A2 已由 A 以 X-A2/D1 有效承接；B1 仍由 B 承接，B2 pending；T3 depends=[A2,B2] | A 以 X-A2/D1 提交 A2 成果 | A2 completed；B 線 assignment 保留；T3 不 ready；當獨立資料列 B2 也 completed 時 T3 ready，無自動 claim | `B02: two workstreams progress independently and join waits for both`；label 不改 readiness 的獨立變體尚需補 |
| B03／R01,V04 | app／真實 storage | revision=20、T1 ready、無 assignment；A/B 各持不同 operation ID | 同時 claim T1，均 expected_revision=20 | 恰一 accepted；revision=21；唯一 assignment 綁 winner；loser rejected；讀回不能覆寫 winner | `B03: concurrent claims accept one assignment and reject the other without overwrite`；memory；hosted gap |
| B04／R02,V05 | domain/app | A 的 X1/gen1 已 release＋H1；B 的 X2/gen2 有效；WF 最新 revision=23 | A 以 revision=23 和 X1/gen1 `task.complete` | assignment_expired；B/X2/gen2 保留；無 result/event；不能靠新 revision 恢復舊承接 | `B04: release and reclaim fence old assignment even with the latest workflow revision` |
| B05／R02,V02,V11,V14 | query/client | H1、P1、T1 均在 snapshot revision=23；新 session 沒有私人聊天及本機 workflow 檔 | 新 session 讀 `workflow.context` | 同 revision header／tasks／handoffs；H1 的成果、限制、未完成、下一步、refs 可取得；missing 明列；無新 assignment | **缺口**：現存同名 handoff/checkpoint 測試只證明寫入不 release/claim，不能證明 query／真實 sessions |
| B06／R03,V06 | domain/app | A 以 X1/gen1/D1/P1 執行 T1 | `plan.revise` 同時提交 P2 與替換 T1 completion_criteria=[新條件] | rejected active_assignment；plan 仍 P1、D1/X1 保留；P2 原文不留下 | `B06: an active definition cannot change; appended plan bytes are not partially retained` |
| B07／R03,V17 | domain/app | T1 以 D1/P1/X1 執行；P2 只改未承接 T2，unaffected_task_ids=[T1] 已接受 | A 以最新 WF revision 完成 T1 | accepted；result basis=P1/D1；T1 不需重新 claim；T2 definition_revision=2 | `B07: unrelated plan revision leaves an active assignment and its old basis valid` |
| B08／R03,V18 | domain/app＋identity | Q1 由 H 依 P1 決定 A；T1 已 release；P2 改 T1 basis；明列 reconsider | A 修 plan 至 P2 | 舊 Q1 revision／H 保留；新增 pending revision 依 P2；A 就算具 decide 也不能 resolve required_decider=human | `B08: changed decision basis requires reconsideration and cannot be self-approved by an Agent`；trusted identity integration gap |
| B09／R04,V07 | app＋storage | O1 的 T1 complete 已 durable accepted，回應遺失，後續 WF revision 已變 | 同 A 重送完全相同 O1/body | 完全原 receipt；result／event／revision 不再增加；不呼叫 clock／load／CAS | 現存 B09 使用 **task.claim**；可證明通用 replay，來源 B09 的 complete 專用資料列未直接存在 |
| B10／R04,V07,V08 | app＋storage | A/B 讀 revision=20；A claim A1 已到 21 | B/O-B 以 20 claim B1 | durable rejected revision_conflict；A1 保留；B1 pending；同 O-B replay 原拒絕；修為 21 仍用 O-B→operation_payload_conflict；新 ID 可重新協調 | `B10: a stale operation has a durable rejection; a reconciled request needs a new ID` |
| B11／R05,V16,V19 | domain/app | WF paused；T1/X1 有效；T2 ready | A complete T1 | T1 completed；T2 沒 assignment；paused claim T2 rejected task_not_ready；無自動 resume | `B11: paused workflow accepts existing completion and rejects new claims` |
| B12／R05,V10 | domain/app | T2 depends=[T1]；T1 pending | A cancel T1 reason=取消 | T1 cancelled；T2 不 ready；claim T2 rejected task_not_ready；取消不能視為 dependency completed | `B12: cancelled dependency does not make downstream work ready` |
| B13／R05,V20 | domain/app | T1 completed；必要 R-T2 引用 cancelled T2；無 disposition | A `workflow.complete summary=宣稱完成` | incomplete_requirements；WF 保留 active；無 closure event；H change_scope 合法 excluded/follow_up 處置是另一獨立成功變體 | `B13: required delivery cannot be cancelled into completion without authorized scope disposition` |
| B14／R06,V11 | query/integration | F revision3 可讀；revision2 不存在；所請 ref 明列 2 及 hash | `document.read` revision2 | not_found/revision unavailable；不回 revision3；不產生寫入 | **缺口**：collaboration query 未接入；舊 profile 的指定文件版本測試不能替代 |

## 19 個 command 的完整測試義務

FT-C01–C19 是本地新情境，對應 schema 的每一個命令。表格包含一個正例及應另外實作的拒絕資料列；拒絕沿用上述完整原子斷言。這是實作目標，非執行結果。

| ID／command | Given／When | Then 正例與拒絕 oracle | 來源測試對照 |
| --- | --- | --- | --- |
| FT-C01 workflow.create | ref 不存在；A/new O，expected_revision=0，title=Test、goal=驗證、scope／skill=test,null、external_work_refs=[] | draft revision1、無 plan/tasks 合法；同 ref 新 operation 再 create 不覆蓋既有；create 非 0 先 shape reject | B01 fixture 正例；重建同 ref／revision 反例需補 |
| FT-C02 plan.revise | WF draft P1；T1 pending；P2 expected_doc_revision=1；replace T1 expected_definition_revision=1，其他未終態明列 unaffected | P2/doc2、T1/D2 與所有變更一次接受；漏列／重複列、終態 replace、active assignment、錯 document revision rejected；execution_impact=none 不得有 task/decision/requirement 差異 | B06/B07、invalid DAGs…、a plan cannot erase…；漏列/重複列/終態 exhaustive rows 需補 |
| FT-C03 document.append | P1 已存；new supporting doc F expected_doc_revision=0 content=資料 | F1 保存原文/hash；目前 plan 仍 P1；再次 append F expected1→F2；錯 doc revision/超 bytes 拒絕 | UTF-8…有超限拒絕；supporting/result 正常及 doc CAS 完整表需補 |
| FT-C04 workflow.start | draft P1／scope；T1 ready；start {} | active、無 assignment；缺 plan／無 ready 拒絕；不加入固定批准 | B01 |
| FT-C05 workflow.pause | active T1/X1；pause reason=暫停新工作 | paused、X1 仍有效；禁止新 claim；已有 progress/complete/release 可保存 | B11；progress/release paused 獨立資料列需補 |
| FT-C06 workflow.resume | paused T1 pending；resume {} | active；不自動 claim；非 paused 拒絕 | B11 正例；非法狀態需補 |
| FT-C07 workflow.complete | active/paused；T1completed，全部終態，R-T1fulfilled，無 assignment/closure decision | completed＋summary/refs；all-cancelled、無 completed、未交付、pending、assignment、closure decision 均拒絕 | B13；criteria…；各 closure 拒絕獨立資料列需補 |
| FT-C08 workflow.cancel | active；T1/X1、T2pending；reason=停止工作 remaining=尚未交付 | WFcancelled；所有非終態 taskcancelled；X1 失效；已 completed 結果不改；遲到 complete 拒絕；不聲稱程序停止 | workflow cancellation closes…；completed child 保留需補 |
| FT-C09 task.claim | active T1ready/D1；A claim expected_definition_revision=1 session=null | server 新 X1/gen1 綁 A/D1/P1；第二 claim 拒絕；staleD／外部 input unresolved／decisionpending／dependency 取消拒絕；session 不授權 | B02/B03/B04/B10、criteria…；input 條件完整表需補 |
| FT-C10 task.progress | active/paused X1/gen1/D1 綁 A；summary=驗證中、evidence E1/not_run | 保存觀察與 evidence；不改 scope/criteria；同 E1 不覆寫；wrong actor/expired generation/definition 拒絕 | block records handoff…、B04；獨立 definition mismatch row 需補 |
| FT-C11 task.release | T1/X1in_progress；A 或 H/manage，H1 | handoff 保存＋assignment 結束同次；T1pending；原 actor A 和 ended_by H 區別；不自動 Bclaim；無 handoff 拒絕 | B04、management release uses… |
| FT-C12 task.block | T1/X1in_progress；A，reason=缺少輸入、H1 | blocked＋handoff、X1 結束；不自動 claim；缺 reason／錯 assignment 拒絕 | block records handoff… |
| FT-C13 task.unblock | T1blocked、無 assignment；resolution=輸入已補足 | pending、無 assignment；仍須重新 claim；非 blocked／缺 resolution 拒絕 | block records handoff…正例；拒絕表需補 |
| FT-C14 task.complete | active/paused X1 有效；criterion_index0 satisfied 結果 | completed／結果保留 D1/P1，X1 結束；missing/duplicate/extra criterion index、not_satisfied、decisionpending、wrongactor 拒絕；無固定 evidence 數門檻 | criteria…、B04/B07/B11；索引完整拒絕矩陣需補 |
| FT-C15 task.cancel | pending/blocked 無 assignment，reason=取消；另一資料列 in_progress 提供 X1+H1 | cancelled；in_progress assignment 結束＋handoff；缺 X1/H1 拒絕；cancelled 不滿足 dependency | B12/B13；active cancel 完整資料列需補 |
| FT-C16 decision.open | Q1 不存在；question=選擇方案、options=[A,B]、requiredhuman、blocksT1/closure、basisP1 | Q1pending/rev1；T1blockedbydecision；duplicateQ1／missingbasis 不能替換阻擋 | B08、criteria…；duplicate/open 替代反例需補 |
| FT-C17 decision.resolve | Q1pending/rev1、basisP1、requiredhuman；H expected1 outcome=decided value=A reason=採用 | Q1 新 rev2、實際 H 與 P1 保留；waived 獨立列 value=null；stale rev／basis mismatch／Agent 冒 human 拒絕 | B08；waived 成功／stalebasis 資料列需補 |
| FT-C18 handoff.record | T1/X1 有效；A，task_idT1/H1 | 保存交辦資訊；X1 仍有效；next_actor_hintB 不授權；不 release/claim | handoff information and checkpoint… |
| FT-C19 checkpoint.append | WF completed；observation=結案附註、next_step=無、document_refs=[] | append 觀察；WF 仍 completed；task/assignment/decision 不改；refs 存在性檢查；不復活執行 | B13 及 handoff information…；錯 refs 完整資料列需補 |

## 跨命令不變條件與故障情境

| ID／來源 | Given | When | Then | 層級／來源 |
| --- | --- | --- | --- | --- |
| FT-I01／V10,V21 | T1/T2 完整 commandstate | P2 令 T1 依賴自己、不存在 missing、跨 workflow WF2.T1 或 T1↔T2 循環（四獨立列） | invalid_dependency／dependency_cycle；P2／定義／events 不存；不是截斷 DAG 通過 | domain；invalid DAGs…前三列；跨 workflow 需補 |
| FT-I02／V08,V21 | repo incomplete=true，WF 可見部分 T1 | claim T1 | incomplete_command_state；不以部分資料接受；無本機 fallback | app；unavailable and incomplete state… |
| FT-I03／V07,V08 | O1 尚無 durable 結果；repo failBeforeCommit=true | claim T1 | storage_unavailable；domain snapshot 不變；operation=unknown；重試保留 O1 原 body | synthetic fault；unavailable and incomplete state…；real commit unknown gap |
| FT-I04／V15 | A O1 已 accepted；A capabilities=[] | replay O1 | forbidden 先於 receipt 與 domain 讀取；不能洩漏 O1；B 同 owner 重送 A/body 因可信 actor digest 不同→operation_payload_conflict | app；owner/store/actor constraints…＋B09；可信 transport gap |
| FT-I05／V18 | Q1human 決定 P1；T1 已 release；P2 改 basis | A 用 carry_forward 或 waive 處置 Q1（各列） | decision_actor_mismatch；舊 human 決定/阻擋歷史保留；H 同權成功為獨立待補列 | a plan cannot erase…；H 成功 carry_forward/waive gap |
| FT-I06／V20 | R-T1 必要交付已存在 | P2 刪 R-T1；或改其定義；或 Agent excluded 無 change_scope | requirement_history_required／對應契約拒絕；原交付保留；follow_up 需 ref | a plan cannot erase…＋B13；follow_up 正反例需補 |
| FT-I07／V15,V17 | execute 開始時 command.task_id=T1，access A | caller 在 IO 間把 task_id/subject 改 other | accepted 仍指 T1/A；另列修改 reducer 輸出不能改原 aggregate | caller mutation during IO… |
| FT-I08／V16,V19 | 每個成功/拒絕/replay 轉移後 | 讀回所有 tasks 與 assignmenthistory | in_progress 恰一 active assignment；其他狀態零 active；同 taskgen 嚴格增加；不同 WF revision 不等於 definition/gen | B01/B04、block records…部分；全 19commands property sweep 尚缺 |

## Issue #3 的 V01–V21 完整追溯

| 原 ID | 本規格／其他規格情境 | 明確缺口 |
| --- | --- | --- |
| V01 | protocol FT-Q11 | 外部兩 PBI partial/unresolved 的 create/context 真實 client |
| V02 | B05、FT-C02、protocol FT-Q03/Q06 | 新 session 原文+task query 未實作 |
| V03 | B02、FT-C09、FT-I01 | label 相同/不同均不改變 readiness；UI journey |
| V04 | B03/B10 | hosted storage 競爭 |
| V05 | B04、FT-C11 | production fencing integration |
| V06 | B06、FT-C02/C11/C09 | release→newdefinition→claim 整合 |
| V07 | B09/B10、FT-I03、protocol FT-P06/Q08 | 真實回應遺失與 durable operation |
| V08 | FT-I02/I03、existing FT-H08 | 新 profile 實際 storage atomic 接受/拒絕 |
| V09 | B08、FT-C07/C14/C17 | 真實 humanidentity；UI decision |
| V10 | B12、FT-I01 | 跨 workflow 依賴完整拒絕列 |
| V11 | B05/B14、protocol FT-Q03–Q07 | snapshot queries 及指定 revision 實作 |
| V12 | existing FT-H01/H02/S04、protocol FT-P08 | 新舊 profile 相容 actualruntime |
| V13 | FT-I03、protocol FT-Q08 | 新 profile 遠端 unavailable 恢復 client |
| V14 | B05、existing FT-L01 | Python protocolclients 僅替代；真實 Agents+人端仍缺 |
| V15 | FT-I04、B04/B08、protocol FT-P07 | credential binding 反偽造實際 integration |
| V16 | B01/B11、FT-I08 | 全命令 assignment 一致性完整掃描 |
| V17 | B07、FT-I07 | productionCAS integration |
| V18 | B08、FT-I05 | rename/remove/nonblocking 繞過及有效 H 沿用/豁免完整表 |
| V19 | B11、FT-C08/C11/C12 | paused progress/handoff 及真實 delayedrequest |
| V20 | B13、FT-C07、FT-I06 | allcancelled/unrelatedcompleted 反例、UI 範圍摘要 |
| V21 | FT-I01/I02、protocol FT-Q03/Q04/P05 | 真實 snapshot 保存/過期、單項超限及不前進 cursor |

## 開放事項與自我檢查

目前測試只覆蓋上述「來源存在」的具體斷言；文件沒有替某個缺口造假通過。需由 #5/#6/#7 決定及實作可信 identity、production 接受/拒絕交易、query snapshots 與 UI。規格未要求額外固定 PO gate、微服務、lease、scheduler 或本機工作目錄鎖。自然語言結果品質、發布及採用不由結構化完成判斷證明。自我檢查範圍：保留 B/R/V ID、每列主要 When、明列 Given 與 Then、每個 command 有驗證義務、mock/real 邊界及執行狀態分開；不宣稱獨立審查。
