# 協作 查詢、指定版本與接手 正式測試規格

## 脈絡、類型與來源

- 類型：formal-test；操作：normalize；狀態：草案 v2（2026-10-13），全部 `not_run`。
- 範圍：八種查詢與 resume／unknown 協調；B05／B14 的唯一正式定義。
- 行為規格：[collaboration/queries/workflow-context.spec.md](../../collaboration/queries/workflow-context.spec.md)；測試環境與整體狀態見[共通規則](../README.md)。
- 文件初始化基準：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；產品／測試來源仍固定 `3e7ee13cda8de27c8a069a062ffd0d289584722e`，兩者不混為新執行結果。
- 來源權威：Issue #3（updatedAt `2026-10-12T13:28:04Z`）保留 R01–R06／B01–B14／V01–V21；協作精確 wire 以 collaboration-v1 README／schema／vectors 為準；既有相容性來源為 ARCHITECTURE.md、PLATFORM-CONTRACT.md、各 src README 及現存 test source。code-only 回復項目仍為觀察／計畫，不提升為已核准產品要求。

## 環境、資料與隔離

純編碼測試不需 DB；必須使用固定向量 expected canonical/digest，不從被測編碼器生成預期值。JSON Schema 需 2020-12 及真正 date-time assertion（如 `2026-02-30` 拒絕），不能只用 regex。`portable-vectors.py` 是 Python 獨立向量實作，與 JS 對相同固定 oracle。

Query／transport integration 使用 owner=owner、store=local、namespace=personal、WF；A/H 可信身分同協作規格。context revision=20；P1 含完整 goal/scope/skill/external refs/必要交付；tasks 共 25 個、每頁最多 20；缺文件 F2 明列 missing。新 profile query handlers、production storage、HTTP/MCP routes 與可信身分尚未提供，FT-Q 情境全部為待實作規格，不把 DTO 存在當成執行能力。

最小層級為純 domain reducer＋application／合成 atomic repository，足以檢查狀態、授權分支、receipt 及版本；V04／V08 的真正 storage 競爭／rollback 另需 hosted integration。時間固定 `2026-10-12T00:00:00.000Z`。WorkflowRef 固定 `{store_id:local,namespace:personal,record_kind:collaboration,workflow_id:WF}`。

可信 A=`{owner_id:owner,actor:{subject_id:A,kind:agent,binding_id:grant-A},capabilities:[read,plan,execute,manage]}`；B 同 owner、subject B／binding grant-B；H 為 human／interactive-H，另具 decide／change_scope。每列重新建立資料，沒有列間相依。

P1 原文 `# Plan 1\n`；revision=1、hash 由原文的獨立 SHA-256 oracle 固定。T1 工作定義 D1：scope included=合成領域驗證、excluded=部署；description=完成 T1；completion_criteria=[交付結果]；dependencies=[]；plan_basis=P1；inputs=[]；expected_artifacts=[]；decision_ids=[]。必要交付 R-T1 引用 T1。正常 result summary=完成、criterion_results=[{criterion_index:0,outcome:satisfied,explanation:依定義交付,evidence_ids:[]}]、artifacts/evidence/limitations=[]。空 evidence 合法性以完成條件為準，不增設固定最少筆數。

H1 handoff 固定 completed=已保存進度、remaining=尚待完成、next_step=依原定義接手、artifact_refs/blockers/limitations=[]、next_actor_hint=B。正常命令具 profile=`workflow-board/collaboration/1`、schema=`1.0`、完整 ref、新 operation ID 及 Given 的 workflow revision。

除 replay 以外，每次 accepted 應增加 workflow revision 一次，並使 state／child facts／event／accepted receipt 原子可見。可持久保存的 domain／CAS rejection 應保存 rejected receipt，但 state、文件、事件與 workflow revision 不變；此規則只適用新 collaboration profile。確切事件 schema 依既有契約／domain 輸出，本文不創造未固定的公開事件 API。

測試層級與真實／替代邊界：query／client／storage integration 的待實作計畫；DTO 不是 query 執行證據。每個情境與負例資料列獨立建立 Given，不以表格列順序共用狀態；清理僅針對執行者自己的 fixture，不自動清除 crash orphan；清理依既有授權。

## GWT 情境與具體斷言

### B05

來源標籤：B05／R02,V02,V11,V14。層級：query/client。

**Given**：H1、P1、T1 均在 snapshot revision=23；新 session 沒有私人聊天及本機 workflow 檔。

**When**：新 session 讀 `workflow.context`。

**Then**：同 revision header／tasks／handoffs；H1 的成果、限制、未完成、下一步、refs 可取得；missing 明列；無新 assignment。

### B14

來源標籤：B14／R06,V11。層級：query/integration。

**Given**：F revision 3 可讀；revision 2 不存在；所請 ref 明列 2 及 hash。

**When**：`document.read` revision 2。

**Then**：not_found/revision unavailable；不回 revision 3；不產生寫入。

### FT-Q01

來源標籤：FT-Q01 capabilities／V12。層級：query／client／storage integration 的待實作計畫；DTO 不是 query 執行證據。

**Given**：現行 runtime 只有 human+legacy；新 profile 尚無 query/persistence/identity/transport。

**When**：查 capabilities。

**Then**：僅實際可用 profile/commands/queries/limits；不得 listedcollaboration implemented；future 可用時完整版本相等協商。

### FT-Q02

來源標籤：FT-Q02 workflow.find／V13。層級：query／client／storage integration 的待實作計畫；DTO 不是 query 執行證據。

**Given**：authenticated owner，指定 store=local／namespace=personal；有兩個獨立 workflow，limit=20。

**When**：workflow.find 取得有界摘要。

**Then**：每項只有契約列明的 workflow_ref/title/status/revision；不跨 source／legacy fallback；find 最多 50 筆；cursor 綁 owner/store/query/baseline；過期重取。

### FT-Q03

來源標籤：FT-Q03 workflow.context／B05,V02,V11,V21。層級：query／client／storage integration 的待實作計畫；DTO 不是 query 執行證據。

**Given**：WFrev20，P1 完整 header、25tasks、Q1、H1，F2missing。

**When**：context pagesize20。

**Then**：完整 header 且 revision20；tasks<=20+total25/has_moretrue/有效 cursor；decisions/handoffs 同 snapshot；missingF2 明列；不 claim；bytes 不足可以少於 20，不能省 header 欄位。

### FT-Q04

來源標籤：FT-Q04 context.page／V21。層級：query／client／storage integration 的待實作計畫；DTO 不是 query 執行證據。

**Given**：Q03cursor 綁 owner/local/WF/tasks/rev20/position20；當下 WF 已 rev21。

**When**：context.page 原 cursor。

**Then**：若 snapshot 20 保留：回剩 5tasks，同 rev20、has_morefalse/cursor=null；失去 20→snapshot_expired；跨 owner/store/WF/section 改 cursor 拒絕；單項>bytes→limit_exceeded，不回 has_more 且空頁永不前進。

### FT-Q05

來源標籤：FT-Q05 task.read／V11,V17。層級：query／client／storage integration 的待實作計畫；DTO 不是 query 執行證據。

**Given**：snapshot 20 T1/D1；current21 已改 T2/D2。

**When**：task.read at_revision20 definition_revision1。

**Then**：T1 完整 D1、當時 status/assignment/result；不混 current21；不存在 definition／expired snapshot 明確 failure；taskread 不改 lifecycle。

### FT-Q06

來源標籤：FT-Q06 decision.read／V09,V18。層級：query／client／storage integration 的待實作計畫；DTO 不是 query 執行證據。

**Given**：Q1rev2=H/P1decidedA；currentQ1rev3=P2pending。

**When**：decision.read at_revision20 decision_revision2。

**Then**：原問題/阻擋範圍/P1/valueA/實際 H 保留；不以 rev 3 替代；read 不 resolve。

### FT-Q07

來源標籤：FT-Q07 document.read／B14,V02,V11。層級：query／client／storage integration 的待實作計畫；DTO 不是 query 執行證據。

**Given**：F revision 3 存在，revision2missing；另外正例 P1 原文/hash 存在。

**When**：document.read 精確 DocumentRevisionRef。

**Then**：正例原文及 hash 相等；missing2→not_found，不能改 3；同名 WF2.F 不能讀代替；revision0 不可 latest；hashmismatch 不能冒完整原文。

### FT-Q08

來源標籤：FT-Q08 operation.get／R04,V07,V13。層級：query／client／storage integration 的待實作計畫；DTO 不是 query 執行證據。

**Given**：O1accepted/rejected/無記錄三列；每列 owner/store/ref 固定且 read 授權。

**When**：operation.get O1。

**Then**：accepted 回原 receipt；rejected 回完整 failure；absence→unknown；先 scope key 查再核對 ref；unknown 保留原 ID/body 查詢或重試；不替換 ID 或本機 Git/SQLite 另寫；read 權限先於私有 receipt。

### FT-Q09

來源與狀態：FT-Q09（V14，計畫）。

**Given**：兩個真實 Agent sessions 沒有本機 workflow 檔、A 建立 plan/tasks 後結束、H 以可信 human 身分可決定 Q1。

**When**：新 session B 依完整 store/ref 執行 resume client 用例（context 及必要指定版本讀取為同一有意序列）。

**Then**：B 可見 P1/D1/H1/限制及 missing，不自動 claim，經有權 claim 後才能回報；人端可看到實際 actor／決定；不能靠私人聊天補必要資料。

技術證據缺口：需要 #5/#7 的真實 client transcript、identity 與 storage 證據。Python 兩 protocol clients 不能完成此驗收。

### FT-Q10

來源與狀態：FT-Q10（V13，計畫）。

**Given**：遠端 command O1 回 503／commit 未知，client 持原 body 與 stable ID。

**When**：遠端恢復後查 operation O1。

**Then**：已 accepted 用原 receipt、已 rejected 先讀回協調再用新 ID、unknown 保持原 ID/body 再查或重試；無本機 fallback 寫入。

技術證據缺口：需要真實中斷與恢復 fixture；故障注入與 UI pending 可以驗 client 策略，但不足以證明 provider commit。

### FT-Q11

來源與狀態：FT-Q11（V01，create＋context 計畫）。

**Given**：一份 workflow.create payload 的 external_work_refs 有 PBI416/available 與 PBI417/unresolved，兩者保留原始文字、來源及已知／未知欄位。

**When**：有權 A 建立 WF。

**Then**：aggregate 讀回保留兩個 refs，不捏造 417 內容；另以獨立 query 資料列驗證 context header 忠實保留兩者及解析狀態。同一 PBI 被另個 WF 引用仍合法，不以外部 PBI ID 強制唯一。這是 command／context 的義務，不要求 find_result 增加 external refs 或 missing 欄位。

技術證據缺口：需要 domain 多引用 automation 與 context 真實 client，現有正常 fixture 的空 external_work_refs 不足以證明。

## 規則覆蓋與排除

本檔唯一正式定義的情境為：B05, B14, FT-Q01, FT-Q02, FT-Q03, FT-Q04, FT-Q05, FT-Q06, FT-Q07, FT-Q08, FT-Q09, FT-Q10, FT-Q11。其他 IDs 是追溯引用，不重複定義。每項成功／拒絕／邊界斷言沿用原始 v1；「來源存在」僅為靜態來源映射，不能把整個 V criterion 標示通過。Issue #3 完整 R/B/V 矩陣見[索引](../README.md)，技術來源及未覆蓋變體見下節。

## 執行與證據界線

本次 `not_run`：未執行產品測試、啟動服務、建立真實 browser／Agent session、建置或部署。normalize 只重組文件、改善可讀性並保留來源狀態。來源 fixture、schema 或 assert 名稱不是執行紀錄；future execution 必須綁不可變 commit、scenario/data row、actual identifier、環境、原始輸出及每個 Then 的證據。自我檢查不代表獨立驗收。

## 未知、衝突與開放問題

每個來源欄保留的缺口、部分覆蓋、觀察及未實作界線仍有效；不能因移入新目錄而改為 implemented／passed。需要的未定 oracle／真實邊界由原 Issue owner 收斂；不新增 runner、框架、固定批准、產品權限或部署要求。

新 collaboration profile 的可信 identity、production persistence、query snapshots、HTTP／MCP transport 尚未接入；domain／application 或 DTO 存在不證明 hosted capability。

## 技術 binding 與既有測試來源

以下保留原始 actual test identifier／部分來源／缺口；完整具名清冊見[來源清冊](../test-source-inventory.md)。語言、repository adapter、runner 與錯誤 mapping 是技術 binding，與上面的行為斷言分開。

| 情境 ID | 既有來源及限制 |
| --- | --- |
| B05 | **缺口**：現存同名 handoff/checkpoint 測試只證明寫入不 release/claim，不能證明 query／真實 sessions |
| B14 | **缺口**：collaboration query 未接入；舊 profile 的指定文件版本測試不能替代 |
| FT-Q01 | 新 capabilities query 未實作；需 runtimeintegration |
| FT-Q02 | 新 query 缺口；外部 ref 搜尋条件未由現行契約固定，不作本情境 oracle |
| FT-Q03 | schema context 存在；handler/storage 完整缺口 |
| FT-Q04 | productionquery/storage 缺口；cursor 簽章/不透明機制由 adapter 決定 |
| FT-Q05 | DTO 僅 schema，實作缺口 |
| FT-Q06 | DTO 僅 schema，實作缺口 |
| FT-Q07 | schema document-query revision0negative；新 query/storage 缺口 |
| FT-Q08 | collaboration fixture operation unknown 為替代；applicationquery/client／storage 缺口 |
| FT-Q09 | 現有 automation 尚缺；原情境列明實際 client／storage 證據需要。 |
| FT-Q10 | 現有 automation 尚缺；原情境列明實際 client／storage 證據需要。 |
| FT-Q11 | 現有 automation 尚缺；原情境列明實際 client／storage 證據需要。 |
