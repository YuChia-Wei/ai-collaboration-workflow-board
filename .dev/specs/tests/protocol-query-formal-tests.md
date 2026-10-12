# 協定、編碼及查詢正式測試規格

類型 formal-test，草案 v1；commit `3e7ee13cda8de27c8a069a062ffd0d289584722e`；本次 not_run。權威為 collaboration-v1 README §2–3、§5–7、schema.json、vectors.json 與 Issue #3 R04/R06、V01/V07/V11–V15/V21。Schema/examples/vectors 是固定契約資料；test source 的 assertion 是可實作方式；兩者均不等於已執行證據。

## 資料與層級

純編碼測試不需 DB；必須使用固定向量 expected canonical/digest，不從被測編碼器生成預期值。JSON Schema 需 2020-12 及真正 date-time assertion（如 `2026-02-30` 拒絕），不能只用 regex。`portable-vectors.py` 是 Python 獨立向量實作，與 JS 對相同固定 oracle。

Query／transport integration 使用 owner=owner、store=local、namespace=personal、WF；A/H 可信身分同協作規格。context revision=20；P1 含完整 goal/scope/skill/external refs/必要交付；tasks 共 25 個、每頁最多 20；缺文件 F2 明列 missing。新 profile query handlers、production storage、HTTP/MCP routes 與可信身分尚未提供，FT-Q 情境全部為待實作規格，不把 DTO 存在當成執行能力。

## Wire、hash 及接受協定

| ID／來源 | Given | When | Then（每組列分開執行） | 現存來源／邊界 |
| --- | --- | --- | --- | --- |
| FT-P01／§2 | vectors.valid 指定 json 與固定 canonical/digest | strict parse→canonical→SHA-256 | unicode-values 字鍵 a 先 z；numeric-looking-keys 順序 1,10,2；utf16-key-order 為 a,😀,U+E000；nested 保留 array 順序；max-safe 整數保持值；逐向量 canonical 及 digest 完全相等 | portable-contract.mjs valid loop＋portable-vectors.py；純編碼 |
| FT-P02／§2 | vectors.invalid 每個 json | parseContractJson 一次 | duplicate-property／escaped-duplicate、unsafe-integer、decimal `1.0`、exponent `1e3`、negative-zero、NaN、unpaired surrogate、leading-zero、trailing-data/comma、bad escape 等均 invalid_json；不得先 parse 後忽略重複 key | portable-contract.mjs invalid loop；Python vectors 對照 |
| FT-P03／§2,schema | 正常 task.claim command | 單獨改 owner、actor、profile、schema、record_kind、missingstore、unsafe/fractional/null/0revision、missingpayload、unknownfield、clientassignment、blank/reserved/nonASCIIID 後驗 schema | 每列 reject；required null 與省略不等價；create revision0 與其他>0 分開；任意 schema minor 不因 major 相同接受 | portable-contract.mjs `negative`實際命名 rows；additional 全 command schema variants 仍需補 |
| FT-P04／§2,§6 | 原文 LF/CRLF、composed/decomposed 字串、null-present/absent 固定向量 | contentDigest 或 valueDigest | LF/CRLF 不同 hash；é與 e+combining 不同；null/absent 不同；無 BOM 或正規化；原文 hash 不 hash JSON literal；invalid JS undefined/NaN/Infinity/-0/fraction/bigint/Date/sparsearray/cycle/surrogate 拒絕 invalid_json_value | portable-contract.mjs documents/valid/rejectedvalues；純編碼 |
| FT-P05／§2 limits,V21 | 有效 shape 資料；每列 UTF-8 bytes 邊界：request300000/300001、doc256000/256001、metadata64000/64001、header16000/16001、response64000/64001；tasks100/101、decisions100/101、dependencies32/33 | parse/command/query 該邊界入口 | 等於上限且其他條件合法可接受；累積 domain task／decision 101 或 bytes 超限以 limit_exceeded 為預期；單份 command schema maxItems 超限（如 dependencies 33／task_changes 101）現行 application 先回 invalid_command；不截斷／部分 state；多 byte 中文字依 UTF-8 bytes 非 charcount；必要 header 完整或拒絕 | portable-contract.mjs 300001；collaboration.mjs UTF-8…超限部分；全部 exact boundary 及 query response 缺口 |
| FT-P06／§6,V07 | vectors.request 可信 authority/command 與固定 digest；O1scope=[owner,local,O1] | requestDigest；各列改 owner/binding/revision/target/payload/arrayorder | 原 digest 等於固定值；每種改動 digest 不同；operationKey 不含 workflowID，改 target 仍查同 O1；不同 owner/store 獨立；hash 不授權 | portable-contract.mjs request alter loop/operationKey；store/payload/arrayorder 完整矩陣需補 |
| FT-P07／§3,V15 | payload 試圖自填 owner/actor/human；sessionlabel=H；可信 identity 為 A | transport 接受該 request | shape 或授權拒絕；session 不得建立 H；同 owner 非同 assignment；失敗不透露他人 revision/docs/receipt；credential rotation 保留既有 binding 語意 | schema negative＋platform-ports trusted identity；新 credential integration 缺口 |
| FT-P08／§1,§7,V12 | 現行/api/commands 僅人工及 legacy 可用 | service_contract_version=workflow-board/collaboration/1 或 future/99 | 501 unsupported_profile；不進 legacy、不寫另一 record、不廣告 implemented；null/array/number command→422invalid_command | platform-ports.mjs `Given an unknown profile…`；不是新 route 存在證据 |
| FT-P09／§7 | Fault(code=example,category,details={current_revision:4}) | HTTP/MCP mapping 各一次 | invalid422、unauthenticated401、forbidden403、not_found404、conflict409、limit413、unsupported501、unavailable503；MCPisError=true；code/details 相等；domain 無 status；unknown technicalerror 不洩 SQL/token/stack | platform-ports.mjs `Given one domain failure…`；mapping pure，非 MCPtransport |
| FT-P10／§6 | operation 結果資料列 accepted receipt、rejectedreceipt、unknown 無 receipt | schema 驗 operation_result | outcome 與 receipt.accepted 必須一致；unknown 不能帶 rejectedreceipt；durable rejection 不等 partial 成功；資料列不得混用 | portable-contract.mjs rejected operation result assertions |

## 八個查詢的 GWT 規格

| ID／query／來源 | Given | When | Then | 證據需要／缺口 |
| --- | --- | --- | --- | --- |
| FT-Q01 capabilities／V12 | 現行 runtime 只有 human+legacy；新 profile 尚無 query/persistence/identity/transport | 查 capabilities | 僅實際可用 profile/commands/queries/limits；不得 listedcollaboration implemented；future 可用時完整版本相等協商 | 新 capabilities query 未實作；需 runtimeintegration |
| FT-Q02 workflow.find／V13 | authenticated owner，指定 store=local／namespace=personal；有兩個獨立 workflow，limit=20 | workflow.find 取得有界摘要 | 每項只有契約列明的 workflow_ref/title/status/revision；不跨 source／legacy fallback；find 最多 50 筆；cursor 綁 owner/store/query/baseline；過期重取 | 新 query 缺口；外部 ref 搜尋条件未由現行契約固定，不作本情境 oracle |
| FT-Q03 workflow.context／B05,V02,V11,V21 | WFrev20，P1 完整 header、25tasks、Q1、H1，F2missing | context pagesize20 | 完整 header 且 revision20；tasks<=20+total25/has_moretrue/有效 cursor；decisions/handoffs 同 snapshot；missingF2 明列；不 claim；bytes 不足可以少於 20，不能省 header 欄位 | schema context 存在；handler/storage 完整缺口 |
| FT-Q04 context.page／V21 | Q03cursor 綁 owner/local/WF/tasks/rev20/position20；當下 WF 已 rev21 | context.page 原 cursor | 若 snapshot20 保留：回剩 5tasks，同 rev20、has_morefalse/cursor=null；失去 20→snapshot_expired；跨 owner/store/WF/section 改 cursor 拒絕；單項>bytes→limit_exceeded，不回 has_more 且空頁永不前進 | productionquery/storage 缺口；cursor 簽章/不透明機制由 adapter 決定 |
| FT-Q05 task.read／V11,V17 | snapshot20 T1/D1；current21 已改 T2/D2 | task.read at_revision20 definition_revision1 | T1 完整 D1、當時 status/assignment/result；不混 current21；不存在 definition/expiredsnapshot 明確 failure；taskread 不改 lifecycle | DTO 僅 schema，實作缺口 |
| FT-Q06 decision.read／V09,V18 | Q1rev2=H/P1decidedA；currentQ1rev3=P2pending | decision.read at_revision20 decision_revision2 | 原問題/阻擋範圍/P1/valueA/實際 H 保留；不以 rev3 替代；read 不 resolve | DTO 僅 schema，實作缺口 |
| FT-Q07 document.read／B14,V02,V11 | F revision3 存在，revision2missing；另外正例 P1 原文/hash 存在 | document.read 精確 DocumentRevisionRef | 正例原文及 hash 相等；missing2→not_found，不能改 3；同名 WF2.F 不能讀代替；revision0 不可 latest；hashmismatch 不能冒完整原文 | schema document-query revision0negative；新 query/storage 缺口 |
| FT-Q08 operation.get／R04,V07,V13 | O1accepted/rejected/無記錄三列；每列 owner/store/ref 固定且 read 授權 | operation.get O1 | accepted 回原 receipt；rejected 回完整 failure；absence→unknown；先 scopekey 查再核對 ref；unknown 保留原 ID/body 查詢或重試；不替換 ID 或本機 Git/SQLite 另寫；read 權限先於私有 receipt | collaboration fixture operation unknown 為替代；applicationquery/client／storage 缺口 |

## 恢復協調與 end-to-end 邊界

FT-Q09（V14，計畫）：Given 兩個真實 Agent sessions 沒有本機 workflow 檔、A 建立 plan/tasks 後結束、H 以可信 human 身分可決定 Q1；When 新 session B 依完整 store/ref 執行 resume client 用例（context 及必要指定版本讀取為同一有意序列）；Then B 可見 P1/D1/H1/限制及 missing，不自動 claim，經有權 claim 後才能回報；人端可看到實際 actor／決定；不能靠私人聊天補必要資料。需要 #5/#7 的真實 client transcript、identity 與 storage 證據。Python 兩 protocolclients 不能完成此驗收。

FT-Q10（V13，計畫）：Given 遠端 command O1 回 503／commit 未知，client 持原 body 與 stableID；When 遠端恢復後查 operation O1；Then 已 accepted 用原 receipt、已 rejected 先讀回協調再用新 ID、unknown 保持原 ID/body 再查或重試；無本機 fallback 寫入。需要真實中斷與恢復 fixture；故障注入與 UIpending 可以驗 client 策略，但不足以證明 provider commit。

## 開放 oracle 與排除

Snapshot 保留／備份政策、cursor 具體編碼與可信 credential 機制由#5/#6 收斂，本文只固定 binding／failure 語意；不得用隨意 TTL 創造新要求。若未來平台不能保存 snapshot20，正確結果是 snapshot_expired，不混版。外部 PBI 內容由 Agent 取得；測試不新增 PMconnector 或要求 Board 讀外部 provider。沒有跨 workflow 原子 snapshot 或跨服務事件 delivery 保證。本次自我檢查未執行任何 wire/schema/hash/query 測試。


FT-Q11（V01，create＋context 計畫）：Given 一份 workflow.create payload 的 external_work_refs 有 PBI416/available 與 PBI417/unresolved，兩者保留原始文字、來源及已知／未知欄位；When 有權 A 建立 WF；Then aggregate 讀回保留兩個 refs，不捏造 417 內容；另以獨立 query 資料列驗證 context header 忠實保留兩者及解析狀態。同一 PBI 被另個 WF 引用仍合法，不以外部 PBI ID 強制唯一。這是 command／context 的義務，不要求 find_result 增加 external refs 或 missing 欄位。需要 domain 多引用 automation 與 context 真實 client，現有正常 fixture 的空 external_work_refs 不足以證明。


來源衝突（GAP17）：契約 README 對超限統稱 limit_exceeded，但 schema maxItems 拒絕透過現行 command validation 先回 invalid_command；shape 容量拒絕與 domain 累積容量拒絕必須分開紀錄，待契約 owner 統一錯誤 oracle。本文不把統一 error code 當已通過，也不以 schema 失敗替代 domain 限制試驗。
