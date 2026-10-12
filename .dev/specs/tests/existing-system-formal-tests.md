# 既有人工 Board、local 原型與架構正式測試規格

formal-test 草案 v1；基準 commit `3e7ee13cda8de27c8a069a062ffd0d289584722e`；全部本次 not_run。權威來源：ARCHITECTURE.md、PLATFORM-CONTRACT.md、src/board/README.md、src/local/README.md，及下列已閱讀的 test source。這些現有行為是重建相容性的觀察基準，沒有把所有 code-only 細節升為新產品需求。協作 profile 的多 assignment 與新的 durable rejection 不能套用至舊人工／legacy／local。

## 人工 framework-board/1 與 legacy

資料：owner=local-test-owner；WF=contract-test；human profile lifecycle1.0；T1/T2，T2dependsT1；固定 clock。Node SQLite 套 D1 prepare/batch 的替代 adapter，本機 integration，不是 hostedD1。每列獨立 fixture；Then 的全表 dump 用於比較 workflow/tasks/docs/revisions/entries/events/operations/mutation_guard。

| ID | Given | When | Then | 來源測試／限制 |
| --- | --- | --- | --- | --- |
| FT-H01 | 原 source_records 有 untouched row；新 humanworkflow 欄位包含 extensions.domain_field | create_workflow | source 原 body 不變；execution_kind=human；statuspending；不捏造 AI/model/source.repo；extensions 保留 | board.mjs append-only schema…／human profile records… |
| FT-H02 | WFpending，T1/T2pending；T2 依 T1 | transition T1in_progress；拒絕列另加無 dependencyT3in_progress | 正例 workflowin_progress 且唯一 T1active；secondactive 拒絕 exactly_one_active_task；未滿前置 T2→unmet_dependencies；直接 workflow_status=in_progress 但零 in_progress task 拒絕 | board.mjs active workflow…／start workflow and first task… |
| FT-H03 | T1in_progress，T2pending | transition T1completed result_summary=完成實作 finding_status=addressed next_task_id=T2 | T1completed、T2in_progress 同次；evidence_ids=[]仍合法；缺 result→missing_task_result 且完整 dump 不變 | completed task requires result… |
| FT-H04 | T3pending | transition deferred reason=範圍外 resume_condition=另行啟動 | 保留 deferred，不改 blocked；缺任一 context→missing_deferred_context；workflowcompletion 不能忽略 deferred | deferred preserves reason…／workflow completion refuses deferred… |
| FT-H05 | T2 為最後 in_progress task；T3 及其他 tasks 已 completed | 同命令 complete T2/workflow，附兩級 result/findings | WFcompleted,current_phasecompleted；缺整體 result 或仍未完成 task 拒絕；終態 task 結果保留 | workflow completion…正例；terminal 拒絕額外矩陣需補 |
| FT-H06 | ownerA/B 同 WF 與 T1ID；A 有 doc1 | ownerB 讀 A 的 doc／operation；無認證讀 list | 不洩資料，document/receipt404；無認證 401；各 owner 修訂獨立；舊 demo create endpoint403 | same workflow ID…／document and receipt routes…／contracts identity boundary… |
| FT-H07 | O1accepted，後續 revision 已增加 | 原 owner 重送同 O1/body | 原 receipt；無新 event/revision；改 payload→conflict；舊 profile 保留既有 receipt 格式/hash/scope，不移植新 rejectedreceipt 協定 | board lost response…／contracts durable idempotency… |
| FT-H08 | 新命令 stale、zero-rowupdate、late receipt failure 三獨立列 | documentrename 或 log | wholetransactionrollback，documents/events/receipt 不部分留下；舊 profile 拒絕沒有 durablerejectedreceipt | board stale CAS…／contracts stale CAS…zero rows…late receipt…；真實 D1 仍缺 |
| FT-H09 | doc1 content240000chars/final，已有 10revisions | 指定 revision1 讀；另列追加無 relation | oldrevision 保持 exactcontent/hash；歷史總量>2MB 而 workflowrow<10000；final 追加無關係→final_requires_successor；addendum 保留舊版 | multi-megabyte document history… |
| FT-H10 | 未建立 doc 名 toString；task ID __proto__/constructor/prototype 不存在 | archive toString 或 transition 保留 taskID | document_not_found/task_not_found 且 sharedprototype 不變；toString 明確 create 後可讀；source.repo javascript:拒絕 invalid_source | inherited document names…／reserved and inherited task IDs…／source URL rejects… |
| FT-H11 | legacy demo-travel requiredplan final，stepcompleted 附 result/evidence | archive plan；或 update_step result 空白 | required_document_archive_forbidden／missing_required_evidence；state/events/receipts 不變；可 append addendum 但不可刪歷史 | contracts required document archive…／completed result/evidence… |
| FT-H12 | legacy optional doc 兩 revisions | archive optional | deletedtrue，兩版原文保留；新 profile、source 不誤路由至 legacy | contracts optional document tombstone…；profile routing 見 FT-P08 |

## Source snapshot 與 Web 呈現

Snapshot 為固定 Git catalog；不能因來源 unknown 或歷史 done/deferred 而捏造 human lifecycle。來源 import fixture 只存在 tests；線上 import endpoint 已停用。

| ID | Given | When | Then | 來源／缺口 |
| --- | --- | --- | --- | --- |
| FT-S01 | catalog installation workflow 同 ISSUE-354 存在 task canonical 及舊重複來源 | sourceprojection/list | 唯一 ISSUE-354 來源/tasks/；rawtimestamp `2026-09-23T16:10:34+00:00`不改；deferred 保留；source-only 結果文字不被升為產品通過 | board canonical task wins duplicate ID… |
| FT-S02 | catalog legacy `2026-05-dotnet-script-to-analyzer-transition`缺 lifecycle/status/final/time | detail/documentread | statusnull、lifecycle 未宣告；一版 snapshot，created_atnull、final 未宣告；不捏造歷史 | board snapshot unknowns stay unknown… |
| FT-S03 | 固定 catalog201WF／1752docs；20unrecorded | list limit5,statusunrecorded | total20、items5、has_moretrue；每項 statusnull、摘要不含完整 documents | board paged API filters original statuses…；數量僅基準 fixture，不是永遠產品要求 |
| FT-S04 | sourceSnapshot 只讀；已停用 importendpoint；testfixture 暫存 dataset=40 個 a | 線上 source-import 有/無 previously-validkey；或 source ID log | 403、不能改 source；fixturestage 同 hash 可 idempotent、wronghash 拒絕、partialactivate 全 rollback、verifiedactivate 保留 unrelatednative 與 exactdocs | contracts completed import endpoint…staging…partial activation…verified activation…；不能把 fixture 當 productionroute |
| FT-U01 | source detail 含 unknownstatus、原 timestamps、externalrefs、binaryattachmentmetadata | browser 載 detail/doc | 顯示未記錄／來源限定、原 timestamp；binary 只描述固定 link/size/hash 及實體在 repo，不假裝 bytes 已遷入；人工 model 不適用；無 source 編輯 controls | frontend app.mjs renderOverview/renderTasks/renderDocumentPane；無 browserautomation 來源，計畫 |
| FT-U02 | Markdown 含 script/iframe/img、javascriptlink、relative saved doc、relative 未保存 file | browser renderMarkdown | 危險 tags/attributes 被清理；savedrelative 指本地 document；未保存 relative 僅在 HTTPS 無 credentialrepo/commit 可構造固定 Gitlink；外部 targetblank+noopener noreferrer；rawview 保留 escaped 原文 | frontend markdown 函數；sourceURL 測試只涵蓋 backend 拒絕，DOMjourney 缺口 |
| FT-U03 | commandO1 已提交但 fetcherror 或無效 json；sessionStorage 存 pendingbody；使用者保留 input | 點確認／重試原操作 | 先 GEToperationO1，404 才重送相同 body/ID；accepted 清 pending/refetch；5xx 維持 pending；不同 payload 不能提交直到協調；409 保留可核對輸入且不自動新 ID 重播 | frontend api/commit/renderPending；Web 真實 networkfailure 測試缺口；舊 404 策略不代表新 profileunknown 可改 body |
| FT-U04 | list/requestA 慢於 B；先選 WF1 後 WF2；docF1 慢於 F2 | 舊 A/F1response 遲到 | serialguard 使畫面維持 B/WF2/F2；不顯示錯 workflow 文件；document 按需讀而非列表帶原文 | frontend loadList/choose/loadDocument；browserautomation 缺口 |

## Python local prototype

這是另一個 workflow-record context，states planned/active/blocked/completed 等以本機 validation 為準；不要套 Boardtaskassignment 語意。Python3.13/Git，實際 loopbackHTTP+SQLite，CLI/MCP stdio 子程序；publicdemo tokens 僅 fixture。每列 store/path/namespace 隔離。角色 writer/read/export、reader/read、reviewer/approve 與 principal 分開；沒有線上登入、externalwriter 或真實資料 migration 授權。

| ID | Given | When | Then | 實際 identifier（test_acceptance.py 除特別標註） |
| --- | --- | --- | --- | --- |
| FT-L01 | 50steps synthetic-416，CLI A 寫 log 後退出，新 MCP B initialize/listtools | B context 後按 revision 續寫 log（有意 cross-client 序列） | context 完整 50steps、missing-required 明列、handoffs/evidencefailure/sourcecommit 保留；B 新事件 revision+1；transcript real_agent_E2E=false；不證真實 agents | test_01_http_cli_to_new_mcp_session |
| FT-L02 | 50steps、externallink example.invalid/416 | HTTP list externallink | 一筆 workflow、50steps；沒有 providerwriter；不創建 Issue | test_02_fifty_steps_no_external_writer |
| FT-L03 | 兩 log 同 expectedrevision，不同 operationID | 真正兩 threadHTTP 同時 POST | sortedstatus=[200,409]、revisiondelta1；loser 不留 event/receipt | test_03_concurrent_cas |
| FT-L04 | T2planned，未有 evidence | update_step completed（另列先 active 再 missing evidence complete） | illegal_transition 或 missing_required_evidence422；snapshot 不變；該 operation 查 404（既有 local 語意） | test_04_illegal_and_missing_evidence_rollback |
| FT-L05 | O1log durable 但 response 被丟；clientoutboxignored；離線 port1 另列 | submit 原 O1；另列原 ID 改 body | originalaccepted once/replay 相同；改 body409；offline 最多 3 attempts（operation GET 失敗也消耗 attempt，可能 0 POST）,pending/retry_exhausted；readerdenial 一次即 rejected、不 retry | test_05_lost_response_and_bounded_outbox；reopen test_09_store_reopen_idempotency |
| FT-L06 | writer/demo；reader 只讀；reviewer 批准；invalidtoken/othernamespace | 各列讀/寫/approve/acl/publish/sql/create_issue／Originoutside | other403、invalid401、writerprivileged403、readerwrite403、reviewerapprove200 但 log403、outsideOrigin403；trustedprincipal 不取 payloadactor | test_06_namespaces_roles_and_auth；regression12 |
| FT-L07 | finalplanrev1 附 DEC-1；scratchoptional | doccreate/revise-addendum/rename/archive 各獨立列 | final 無 relation422；明確 addendum 新增 rev2，rev1decisionrefs 保留；rename 不改歷史；scratchtombstone；指定 planrev1 原文可讀 | test_07_documents_revisions_tombstones |
| FT-L08 | required_documents 含 plan；另列 indexed-only requiredflagfalse 但 index 含它 | archive document | required_document_archive_forbidden422，payload 不變；只有 indexed-only 且 required=false 的文件移出必要 index 後才可 archive；required=true 的文件必須保留必要索引，不能藉移出繞過；optional 兩版+tombstoneexport/restore 等值 | regressions test_15_required_archive_admission_and_optional_tombstone_roundtrip |
| FT-L09 | E1blob=`atomic`bytes、base64 有效、command/result/outcome/source/environment 完整 | evidence command | blobhash 為原 bytesSHA-256，metadata 不存 base64；duplicateID 拒絕；invalidbase64→invalid_blob；>1MiB→blob_too_large413；不能執行 evidence.command；跨 namespaceblob404 | layout namespace_scoped_blob；regression11 rollback；base64/size 正反完整矩陣為 code-derived 計畫 |
| FT-L10 | reviewer 具 approve；finaldoc 由不同 principal 作者；另一列 reviewer 曾撰寫同 workflow 任一文件／nonfinal | approve document | 保存 currentfinalrevision+actualprincipal；同 workflow 曾撰寫任一文件的 principal → independent_approval_required403，nonfinal→not_final；writer 無 approve 先拒絕 | acceptance06 正例；同作者/nonfinal code-derived 計畫，非已觀測通過 |
| FT-L11 | completedstepT1 有 result/E1 | update_step 不帶 status 但 result 空白／evidence=[]；或 evidenceidsmissing/string/null | missing_required_evidence／invalid_step_relationship422；既有 complete 成果不能退化；export 仍 valid | regression01/02 |
| FT-L12 | activeWF 必要 plan；plannedcandidate 加入 missingdoc；completedWF 另列 | completed＋required_documents=[new-missing]；或 completed 後 addunfinishedstep | missing_required_documents/incomplete_steps；候選完整狀態驗證；終態仍可 log/finaladdendum 但不能重開或破壞結案 | regression03/04 |
| FT-L13 | evidence 內容 null/blank/emptyenv/inventedoutcome 各列；有效 failed evidence 另列 | evidence 或 complete resultwhitespace | invalid_evidence_content 或對應 422；failed evidence 可保留調查完成，不能被寫成 passed；result 空白不能 complete | regression07 |
| FT-L14 | maxwriteattempts 已用完但最後 O1 可能 accepted；另列第三次 response 丟失 | 再 submit/reconcile 原 outbox | 仍先 operationGET；accepted 停止 POST；attemptbudget 不阻止讀回；保持原 ID 與 result | regression08/09 |
| FT-L15 | context 讀取中另一 connection 可寫下一 revision | context 一次 | workflowrev 與 events[-1].after_revision 同 snapshot；後續 context 才見 rev+1；不混版 | regression10 |
| FT-L16 | receiptINSERT triggerabort，evidenceblob 候選已準備 | command evidence | SQLiteIntegrityError；workflow/events/operations/blobs 全 rollback；atomicblobhash 無 row | regression11 |

## 匯出、preflight、還原及故障復原

| ID | Given | When | Then | 來源 |
| --- | --- | --- | --- | --- |
| FT-X01 | namespace demo 含 WF/events/operations/blobs/rolemapping | export | manifestcounts 與 payload 對應、payloadhash 正確；無 writer/readertoken、bindingcredentials；external_effects_enabled=false | acceptance08；明列 secret 排除，不代表已 productionprivacy 驗收 |
| FT-X02 | X01package，各列篡 packagehash/blob/relationship/revision/operationpayloadhash/unsafeexternalflag；必要時重算 outerhash | preflight | 六列 Fault；不能只靠 outerhash 接受內部不一致；不寫 target | acceptance08 |
| FT-X03 | 篡 receipt accepted/ID/principal/hash/revisionbool、eventcommandnamespace/WF/operation/revision、missingroles/forgedapproval/divergentsnapshot/client 各列 | preflight/restore | Fault；target 不存在；history/command/receipt/principal/role 須對應；重算 hash 不能洗白錯誤歷史 | regression05 |
| FT-X04 | status 未知/非 string、revisionbool、required_documentsnull、stepstateinvented | restore；命令 expected_revision=true 另列 | 拒絕 invalidlifecycle/types；不創 target；bool 不當 integer | regression06 |
| FT-X05 | 匯出 pack valid；target 不存在；新 bindings 新 token；原 HTTP／DB 可讀；restore 完成後，continuation 前關閉原 HTTP 並將原 DB 移出可用 path | restore 至新 store → 關閉原來源 → 新 store 續寫（有意 cutover sequence） | workflows/events/operations/blobs 與原 pack 完全相等；oldtoken401、新 token 可讀寫、newlogevent+1；existingtarget 拒絕、不覆寫；emptybindings 失敗且 target 不存在 | acceptance test_zz_restore_original_offline_and_continue；synthetic rehearsal，非正式 migration |
| FT-X06 | restore 使用 temporaryDB；最終 target 尚不存在；競爭者寫 targetbytes=`other owner target` | controlledrestorepublicationrace | target 未完整前不可見；conflict409；不覆寫／刪競爭者 bytes | regression13；os.link fault injection，不等跨所有 filesystem 證明 |
| FT-X07 | childrestore 在建表後 publication 前停住，target 不存在 | terminate child 後重試同 package 至新 target | crash 不 publish 半 DB；重試 valid、再次 export/preflightvalid；orphan 僅證據不自動 purge | regression14；真實 processcrash、本機 filesystem |

## 架構、執行路徑與生成產物

| ID | Given／When | Then | 來源／限制 |
| --- | --- | --- | --- |
| FT-A01 | 固定 baseline 全部 Boarddomain/application.mjs；檢查 imports 與平台使用 | domain 只 domain，application 只 domain/application；不 importruntime／adapter，不 Request/Response/URLSearchParams/D1results/SQL/rowJSONdecoding/systemclock/HTTPstatus | architecture.mjs；靜態 regex 可漏動態技巧，不等全部 runtime 依賴證明 |
| FT-A02 | frontend/backend 所有 modules；檢查 static/literaldynamicimports | 各自只本側或 contracts；frontend 不能 importbackend，backend 不能 importfrontend；buildcomposition 可產一 Worker | architecture.mjs；buildbundle 另需 artifactcheck |
| FT-A03 | pureBoard/legacy reducer 輸入；注入 fixedclock/plainrepo/catalog | reducer 不改 input；plainDTO/decodedrecords 可運作；replay 不 load/clock/write；Fault 無 HTTPstatus | architecture.mjs＋platform-ports.mjs sixnamedtests |
| FT-A04 | localdomain/application 全部 PythonAST；檢查 imports | domain 不 application；兩層不 sqlite3/http/urllib/adapters；compositionroot 組裝 | test_layout SourceLayout.test_domain_and_application_depend_inward；portableapplication/adapter 交易協作仍未全抽象 |
| FT-A05 | Given outbox 為 `.runtime/layout-check/` 下 ignored、untracked 檔案，另有 `src/local/outbox.json` 及 tracked `.gitignore` 負例；When 執行 validate_outbox；HTTP 資產另列獨立資料例 | 只容許 ignored、untracked runtime／Git 外 path；source／tracked 拒絕；HTTP `/` 提供搬移後 `ui.html` 的精確 bytes | layout outbox…／http_serves_relocated_asset… |
| FT-A06 | package/buildartifact 與 trackedfilelist；按 policy 檢查 | 驗證 productcode 在 src、生成 dist/node_modules/runtime 不 tracked、WorkerESM 無 Node-onlyruntimeimports | 所需 policy 為 ARCHITECTURE／PLATFORM；**缺口**：README 提 src/tools/check_repository.py 但目前不存在，CI repositoryjob 沒有 policyrun；不得列為可執行 gate 或宣稱 active。本文件不修 code/CI |

## 執行與未決限制

本次只閱讀 source、撰寫與自我檢查。沒有啟動 HTTP、MCP、browser、DB 測試、export／restore 或 build。真實 Sitesidentity、hostedD1/R2、Webbrowserjourney、真實 Agents、正式 migration、backuprecovery 與 missingrepositorygate 需各自提供實際 evidence；本機 source 測試可作重建 oracle，但不可替代要求的真實邊界。
