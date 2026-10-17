# Workflow Board collaboration/1 契約

本文件承接 [#3 的 DDD／BDD 模型](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/3)，由 [#4](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/4) 固定可攜的用例、資料及接受協定。

**狀態：19 種 domain commands、application 接受用例、8 種 queries、D1 repository 與 HTTP／MCP adapters 已有本機驗證；2026-10-15 在第 10 版完成選定真實 Site plugin client 的合成讀寫、回執重送／恢復、分頁與歷史版本驗證，並比對 D1。2026-10-17 完成單 owner 範圍補測、介面比較及使用者合成畫面確認；tokens／debit 未量測。** 設定缺少時協作 routes 拒絕存取。既有人工 profile `framework-board/1` 與 legacy 保持相容；未知 profile 明確拒絕，不落入 legacy。MVP 接入限制及最新證據見 [操作說明](../../COLLABORATION-MVP.md)。Schema、編碼測試或本機 SQL 通過均不代表 hosted 服務已完成全部驗收。

## 1. 來源與實作邊界

- [schema.json](schema.json) 是 JSON Schema 2020-12；根節點驗證 command，其他型別由 `#/$defs/<name>` 取得。
- [examples.json](examples.json) 是各種獨立訊息的合成形狀範例，不是一串可直接依序執行的 workflow。文件 hash 對應範例原文；其他引用的存在、權限、狀態及版本仍由 application/domain 驗證。
- [vectors.json](vectors.json) 是固定跨語言編碼向量，包含正例、拒絕例、文件 hash 與綁定可信身分的 request digest。
- [目前 ports](../../backend/application/ports.mjs) 已供人工／legacy application 使用；[協作 ports](../../backend/application/collaboration-ports.mjs) 定義 command repository、identity、clock、ID 與 query 語意；[application](../../backend/application/collaboration.mjs) 及 [domain reducer](../../backend/domain/collaboration-workflow.mjs) 已實作命令接受流程。
- 本次有實作：移除內層 HTTP status、URLSearchParams、D1 results／序列化 row、直接系統時間及固定 catalog 依賴；提供編碼器、嚴格 JSON parser、HTTP／MCP error mapping、新協作命令核心與行為驗證。
- WB-04 MVP 已補 query handlers、context snapshots、D1 儲存、HTTP／MCP transport 與預設拒絕存取的 identity adapter。本次串接採單 owner Agent binding，已有選定 client 的 hosted 合成讀寫及唯讀 Web UI；capabilities 只列出當前 access context 可執行的能力。人類審核寫入另屬 #7。

DDD 核心仍是一個 Workflow aggregate。Task、assignment、plan／decision 版本與結案條件由同一接受點維護；HTTP／MCP、SQL、身分來源及時鐘留在 adapters／composition root。Storage table、API DTO 與 aggregate 的記憶體表示不要求相同。

## 2. 版本、識別與資料規則

| 項目 | 契約 |
| --- | --- |
| Service profile | `service_contract_version = workflow-board/collaboration/1` |
| 訊息 schema | `schema_version = 1.0`；與產品 release 及 DB migration 分開 |
| Lifecycle | #3 的 collaboration 模型；不將人工 `lifecycle_contract=1.0` 默默改成多 Agent |
| WorkflowRef | 必含 store_id、namespace=personal、record_kind=collaboration、workflow_id；store_id 是穩定邏輯識別，不是可任意改指的 base URL |
| ID | 大小寫有別，1–160 個 ASCII 字元，首字為字母／數字，後續允許字母、數字、點、底線、連字號；保留字 constructor／prototype／__proto__ 不作實體 ID |
| Revision | 0–9007199254740991 的安全整數；create expected_revision=0，其餘命令 >0；指定文件版次 >0，沒有「0 表示 latest」 |
| Timestamp | Gregorian 年 0001–9999、UTC、固定毫秒，例 `2026-10-12T00:00:00.000Z`；使用 format assertion 驗證真實日期，不只 regex |
| Unknown／missing | Nullable 欄位以 null 表示明確未知；required 不可省略。沒有伺服器偷偷補預設後再 hash；空字串、null、缺欄位不同 |
| Text | Unicode scalar values，不做 NFC、換行、空白或大小寫正規化；拒絕孤立 surrogate |
| Number | Wire JSON 僅十進位整數 token，拒絕小數、exponent、-0、不安全整數及非有限數；ID 與任意精度數值使用字串 |
| 重複 key／額外欄位 | 重複 key 在 parse 階段拒絕，包括跳脫後同名；具體 DTO 拒絕未知欄位，不忽略 actor、owner 或未支援命令 |
| 集合 | 陣列順序保留並參與 digest；需去重的集合由 schema／domain 明列，不在 hash 前自動排序 |
| DocumentRevisionRef | document_id、正整數 revision、sha256 content_hash；屬於外層 WorkflowRef，不能靠同名 ID 跨 workflow 查詢 |

Protocol 版本用完整相等值協商；新欄位、命令或行為須更新相應 schema／profile 並提供相容策略。舊 client 不被要求忽略未知資料。若要新增 schema minor，服務必須明列所支援的完整版本；不得僅憑相同主版號宣稱相容。

首版採保守容量契約：request 300000 UTF-8 bytes、單份文件 256000 bytes、單筆 metadata 64000 bytes、context header 16000 bytes、context／page response 64000 bytes；每 workflow 最多 100 tasks、100 decisions，每 task 最多 32 dependencies，query page 最多 20 個項目，find 最多 50 筆。Schema 的 maxLength 是字元數，**不能代替 UTF-8 bytes 上限**。這些是接受限制，不是效能測試結論；需同時滿足筆數與 bytes。依 2026-10-17 owner 採用的 GAP-17 決定，單次請求不符合 schema（包括 maxItems／maxLength）回報 `invalid_command`；請求形狀合法，但 aggregate 累積容量或 UTF-8 bytes 超限，回報 `limit_exceeded`。Transport 的原始 request bytes 限制可在 schema 驗證前拒絕；不承諾同時違反多項限制時固定先報哪一項。不分段接受命令，也不靜默刪除欄位。所有寫入必須保證必要 context header 可在預算內完整取得。

## 3. 身分與用例入口

HTTP／MCP adapters 都呼叫相同入口：

```text
executeCommand(accessContext, command) -> accepted receipt | rejected receipt
executeQuery(accessContext, query) -> typed query result
```

accessContext 由可信 identity adapter 提供 `owner_id`、ActorRef（subject_id、kind、binding_id）及操作能力；client payload 不得提供這些欄位。binding_id 是穩定的委派／存取 binding，並非 token 或秘密，也不因正常 credential rotation 自動換成另一個 actor。SessionRef 是描述性資訊，不能建立身分。

具體認證由 #5／#6 決定。下面是必須表達的**能力需求**，不是已完成的角色系統：

| 能力 | 意義 |
| --- | --- |
| read | 可讀指定 owner／store／namespace 的資料及原 operation 結果 |
| plan | 在已授權 scope 內建立／修訂計畫與未承接 task 定義 |
| execute | 以目前可信 actor 認領及回報自己的 assignment |
| manage | 暫停、恢復、取消或明確釋出承接；不能冒記成原 Agent 的完成成果 |
| change_scope | 明確修改授權範圍或排除必要交付；一般 plan 能力不能替代 |
| decide | 同時符合 Decision.required_decider；人的決定必須來自可信 human actor |

授權先於私有資料讀取／回條回放。Assignment ID 不是 bearer token；同 owner 不等於同承接者。Decision 沿用、豁免、移除關聯或變更阻擋，也受原 required_decider 約束。認證及授權失敗不回傳他人的 current revision、documents 或 receipts。

HTTP `POST /api/collaboration/v1/commands` 及 `POST /api/collaboration/v1/queries` 作具型別 JSON transport；MCP 使用 `POST /mcp`。這些 routes 已有本機實作，#5 選定 Codex Site plugin 的真實連線與合成讀寫已驗證；支援邊界見操作說明。MCP 工具使用相同 DTO／application；不以通用 SQL、任意 patch 或 checkpoint 模擬 lifecycle 命令。

## 4. 命令與 domain 驗證

每個命令固定攜帶 profile、schema、完整 WorkflowRef、operation_id、expected_revision、command、payload。Command 與 payload 的精確欄位以 schema 為準。

| 命令 | 必須另外驗證的行為 |
| --- | --- |
| workflow.create | 建立 draft；不得覆蓋既有 ref；scope／skill／來源引用完整，允許先沒有 plan／tasks |
| plan.revise | 保存新 plan 原文與任務／決策／交付清單變更；新 document revision = expected_document_revision+1；全部在同一次接受中完成 |
| document.append | 只追加 supporting／result 文件；驗證原文 bytes、hash 與預期文件版本，不藉此更改目前 plan |
| workflow.start | Draft 有目前 plan、scope 及至少一個 ready task；ready 不依賴 workflow active |
| workflow.pause／resume | Active→paused／paused→active；pause 阻止新 claim，但現有 assignment 可以回報／交接／完成 |
| workflow.complete | Active／paused；必要交付完成或具合法處置、所有 tasks 終態、無有效 assignment 或結案阻擋；至少一個 task completed |
| workflow.cancel | 記錄原因及剩餘工作；將所有未終態 task 取消並使其 assignment 失效，不宣稱外部程序已停止 |
| task.claim | Active、pending、前置 completed、輸入條件滿足、無阻擋決策及 assignment；server 產生 assignment ID 與新 generation，綁定 actor／definition revision／plan basis |
| task.progress | Active／paused；actor、assignment ID、generation、definition revision 全部有效；不能改完成條件／scope |
| task.release／block | 原子保存 handoff 並結束 assignment；回到 pending／blocked。原承接者或具 manage 能力者可操作，保留實際 actor |
| task.unblock | 已記錄阻礙的處置，無 active assignment；blocked→pending，不自動 claim |
| task.complete | 有效承接；criterion_results 對應每個 completion criterion，索引不可重複／缺漏，全部 satisfied；保存結果並結束 assignment |
| task.cancel | Pending／blocked 可直接記錄原因；in_progress 須同一命令提供目前 assignment 與 handoff 並終止承接；不可把 cancelled 視為 dependency completed |
| decision.open | 新 ID、指定問題與決定者、明確 task／closure 阻擋範圍及依據版本；不能藉新增同名／替代問題解除既有阻擋 |
| decision.resolve | expected_decision_revision 及 basis 完整匹配；decided 要有 value，waived 的 value=null；決定者要求與授權同時滿足 |
| handoff.record | 保存資訊／完成後交辦意圖；沒有釋出語意。未完成工作的釋出須用 task.release／block，不能只留下 handoff 就認定釋出 |
| checkpoint.append | 保存觀察、指定文件 refs 與下一步；不改 task、assignment、decision 或 workflow lifecycle |

plan.revise 的 task_changes 支援 add／replace；取消用 task.cancel，不透過刪除 task 消除歷史。所有未終態 tasks 必須恰好出現在 task_changes 或 unaffected_task_ids 一次；completed／cancelled 的定義不可 replace。無 active assignment 才能改工作定義，改動後 TaskDefinitionRevision 遞增；未受影響的 task 保留原 plan basis。新增／變更後的整張 DAG 需檢查不存在、自指、跨 workflow 與循環，不接受截斷的 command state。

execution_impact=none 時 task_changes 與 decision_dispositions 必須為空，既有交付及處置清單必須相同。Declared 影響由有權呼叫者提出，服務僅驗證可機械判定的版本／引用／授權；不宣稱已理解自然語言差異。Plan 引用新決策依據時，decision_dispositions 必須明列；reconsider 產生新 pending decision revision 並保留原 revision，carry_forward／waive 須符合原決定者要求。決定紀錄本身不可覆寫，decide／waive 也產生新 revision。

必要交付引用的 task／document 必須存在；既有必要交付的定義保留，新增需求使用新 ID。原交付不再適用時，保留原定義並給予 excluded／follow_up 處置；處置異動要 change_scope 能力與理由，follow_up 須有可追溯 ref。Workflow 的原始 goal／scope／外部 refs 首版建立後固定；計畫與新增 task 表達後續細化，不提供任意 patch 擴大原始授權範圍。取消 task 的 reason 不能單獨替代範圍處置。Task.completed 只表明已提交對應完成條件的結果；服務的結構驗證不證明自然語言成果品質、發布或正式採用。

## 5. 查詢、快照與缺漏

| Query | 精確語意／結果 schema |
| --- | --- |
| capabilities | 只廣告實際可用的 profile、命令／查詢及 limits；未實作的 profile 不回傳 implemented。結果 capabilities |
| workflow.find | 在 authenticated owner 的明確 store／namespace 搜尋有界摘要；不跨 source／legacy fallback。結果 find_result |
| workflow.context | 在同一 workflow revision 取得完整 header（goal、scope、plan、skill、外部 refs、必要交付與處置），及 tasks／decisions／handoffs 有界頁面。結果 context |
| context.page | Cursor 綁定 owner、store、workflow、section、snapshot revision、查詢／頁面位置；同 revision 後續頁。結果 context_page |
| task.read | 以 at_revision 及指定 definition_revision 取得完整工作定義、對應狀態／assignment／結果。結果 task_record |
| decision.read | 以 at_revision 及指定 decision_revision 取得問題、適用範圍、依據及決定結果／實際 actor。結果 decision_record |
| document.read | 按 DocumentRevisionRef 取得原文並核對 content_hash；不存在的版本回報 not_found，不能換成最新版。結果 document |
| operation.get | 先以 owner／store／operation ID 查原結果，再核對所請求的 WorkflowRef。結果 operation_result：accepted、rejected 或 unknown |

Context header 不能截斷；集合頁可少於 limit 以遵守 bytes 上限，須提供 total、has_more、cursor。每個非空剩餘集合要有有效 cursor；若連單項都無法放入預算，回報 limit_exceeded，不回傳不會前進的空頁。has_more=false 時 cursor=null；有缺漏以 missing 明列，缺漏資料不能被當成完整內容。

第一個 context 與其 task／decision 點讀都須對應同一 snapshot。Storage 無法保留該 revision 時回報 snapshot_expired，client 丟棄舊頁並重取 context，不混合新舊頁面。不可用「先讀 revision，分別讀資料後未核對」冒稱一致快照。Find 的 cursor 也綁定 owner／store／query 及列舉基線；過期同樣重取，不保證跨 workflow 原子結案或任意時點的全站 snapshot。

本版 collaboration/1 沒有刪除、清理、TTL 或 ID 重用；snapshot／cursor／operations 隨 workflow 保留。刪除 tombstone 與自然到期情境不適用；不存在快照的拒絕與 baseline 重取仍須明確。新增清理或刪除時須另定保留／標記契約，不能以目前缺快照測試當作自然過期證據。

Resume 是 context＋按需指定版本讀取的 client 用例，不自動 claim。必要 task 定義、decision 結果或指定文件未取得時，client 必須保留缺漏資訊，再決定是否可執行。

## 6. Canonicalization、digest 與原子接受

以 [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785) 的字串 escaping／UTF-16 code unit key ordering 作基礎，採本契約的安全十進位整數子集合；不是支援所有浮點 JCS 輸入的實作。UTF-8 無 BOM、無額外空白，陣列保持順序，object keys 依 UTF-16 順序排序；數字形狀的 keys 也必須如此，不能重建 JS object 後直接 stringify 而讓引擎重新排列。

- content_hash = `sha256:` ＋ SHA-256（原文 UTF-8 bytes）的 64 位小寫 hex；CRLF 與 LF 不同，不能 hash JSON string literal 代替原文。
- request_digest = 同樣的 SHA-256，輸入為 canonical JSON 的 `{purpose:"workflow-board-command-v1",authority:{owner_id,actor},command}`。Actor 包含可信 subject_id、kind、binding_id；expected_revision、目標及全部 payload 均參與 digest。
- operation scope key = canonical JSON 的 `[owner_id,store_id,operation_id]`。不能再加入 workflow ID 讓同一 operation ID 改目標後變成新工作；不同 authenticated owner／store 則各自獨立。
- Hash 不授予權限，不是客戶端簽章。服務由可信 accessContext 計算 authority，不接受 payload 自填。

接受順序：

1. 在 adapter 拒絕格式／bytes／重複 keys／不支援版本；取得可信身分與授權。一般格式或權限失敗不能暴露他人 operation。
2. 計算 digest，先查原 operation outcome。已記錄且 digest 相同，回傳原 accepted／rejected receipt，**不重新跑 CAS 或 domain**；digest 不同回 operation_payload_conflict。
3. 讀完整 command state，驗證 expected_revision、DDD 不變條件、相關文件／task／decision revisions 及權限。新 assignment ID／時間由 ports 提供，不由 client 填入。
4. 成功時原子寫入 state、children、新文件原文、事件、accepted receipt 及 revision+1；零筆 CAS 或任何部分失敗都不能留下已接受效果。
5. 對已通過形狀／身分檢查且能完成持久記錄的確定性 domain／CAS 拒絕，保存 `accepted:false` 的 rejected receipt，綁定原 digest；不寫 domain event／文件或推進 workflow revision。它是完整拒絕結果，不是部分成功。#6 必須驗證此接受協定，不能只沿用舊 profile 的成功回條模型。
6. 回應遺失或 commit 結果未知時，查原 operation。查不到只代表 unknown；保留原 ID 及原請求查詢／重試。只有確認拒絕後，才讀回、協調並以新 operation ID 提交不同請求；已接受則使用原 receipt。

此 ID 綁定從服務持久記錄結果開始；無法對從未到達服務的請求推定歷史。Client 仍不得自行把 unknown 的 ID 改成另一份請求。無法保存確定性拒絕結果時回報 unavailable／unknown，不能謊稱已有 durable rejection。

首版新協作紀錄的 operation outcomes 隨 workflow 保留，不提供清除／重用 ID 命令。後續若加入保留期限，須版本化說明何時不能再保證安全重試，不能直接刪回條後把老 ID 當新命令。舊 profile 的 hash、owner operation keys、已存在 receipts 及 migrations 保持原樣。

## 7. 錯誤與 transport 對照

Domain/application 的 Fault 只包含 error code、category、details，不持有 HTTP status。MCP 的下表是工具執行錯誤（isError=true），不是 JSON-RPC parse／method error；後者由 #5 的 transport 處理。

| Category | HTTP | MCP |
| --- | --- | --- |
| invalid | 422 | isError；相同 code／details |
| unauthenticated | 401 | 依 transport 完成認證挑戰；用例拒絕保持相同語意 |
| forbidden | 403 | isError；不洩漏受保護資料 |
| not_found | 404 | isError；指定 ref／revision 不可讀 |
| conflict | 409 | isError；須依具體 code 協調 |
| limit_exceeded | 413 | isError；不可靜默截斷命令 |
| unsupported | 501 | isError；不得假裝成功或寫入另一種紀錄 |
| unavailable | 503 | isError；先查原 operation，結果可能未知 |

穩定 codes 至少包含 invalid_command、invalid_json、unsupported_profile、unsupported_schema、signin_required、forbidden、not_found、document_not_found、revision_not_found、revision_conflict、definition_conflict、assignment_expired、assignment_actor_mismatch、task_not_ready、decision_required、decision_actor_mismatch、invalid_dependency、dependency_cycle、terminal_workflow、incomplete_requirements、operation_payload_conflict、snapshot_expired、limit_exceeded、storage_unavailable。Schema 拒絕不取代 domain 拒絕；#5／#6 不得只靠 HTTP status 猜測可以重新執行。對外未知技術錯誤不包含 SQL、token 或 stack trace。

目前人工 API 的 error body 仍為 `{error,...details}`，HTTP status 行為保留。新 profile 的錯誤為 `{error,category,details}`；HTTP／MCP adapter 皆由同一 Fault 映射，不建立第二套 domain 判斷。

## 8. BDD 與證據對照

下表保留 WB-03 的原始證據邊界；WB-04 新增的查詢、SQL／HTTP／MCP 與 bundled Worker 測試，另見 [MVP 驗證對照](../../COLLABORATION-MVP.md#執行驗證)。下表中的「尚未實作／後續」描述 WB-03 當時狀態，不覆蓋本文開頭的目前狀態。

| Rule／例子 | 本次驗證 | 證據與限制 |
| --- | --- | --- |
| 相同操作不重複接受（#3 R04／B09） | 已接受後遺失回應、回條先於 CAS／clock／load | platform-ports.mjs＋既有 contracts／board suites；人工 profile，本機替代 storage |
| 平台表示不能滲入內層 | Plain query DTO、decoded records、可替換 clock／catalog／identity、HTTP／MCP 同錯誤 | platform-ports.mjs＋architecture.mjs |
| 版本與來源不可混用（R06／V12） | 未支援 profile 不進 legacy；指定文件 revision=0 拒絕於新 schema | platform-ports.mjs／portable-contract.mjs |
| 跨語言必須得到同一資料識別 | UTF-16 key order、整數、null、Unicode、CRLF、身分／target／revision digest | portable-contract.mjs／portable-vectors.py；JS 與 Python 獨立實作 |
| 新協作 lifecycle（B01–B04、B06–B13） | 23 個本機 domain/application 情境：並行與匯合、競爭 claim、generation fence、plan／decision／scope、pause／cancel、原子拒絕、遺失回應、owner 與不可變資料 | collaboration.mjs；使用合成原子 repository，未接生產 adapter |
| Resume 與指定版本讀取（B05、B14） | query schema 與快照／缺漏／文件 hash 契約已定義；實際查詢未實作 | #5／#6 完成 snapshot、cursor、精確文件版本及新 Agent session 驗證；不列為已通過 |
| Storage／identity／真實 sessions（V07–V08、V11、V14–V15、V18–V21） | 原人工交易回歸已驗證；新協作協定待實際 adapter | #5／#6／#7；沒有 hosted、新 Agent 或備份還原證據 |

可執行驗證：

```powershell
Set-Location src/board
npm ci
npm test
npm run build
npm run validate
```

npm test 包含 Python 3 的獨立編碼向量檢查；CI 明確配置 Python 3.13。沒有新增 Cucumber runtime；目前用可讀情境名稱和 assertions 驗證 domain／application／ports／編碼，#3 的產品例子是 Discovery／Formulation 與 Automation 的共同依據。

命令核心及替代 repository 的 BDD 驗證已完成本次範圍；接續以相同契約接入 D1、可信 Agent 身分、HTTP／MCP 與 Web。Assignment 歷史以 ref＋workflow_revision 追加每次 lifecycle 事實，結束時不覆寫原認領快照。生產 repository 必須補齊併發、原子交易與失敗注入證據；query 的 B05／B14 仍待 automation，不以本機替代 storage 通過代替 hosted D1 證據。

方法來源：[JSON Schema 2020-12](https://json-schema.org/draft/2020-12/json-schema-validation)、上述 RFC 8785；產品規則與取捨以 #2／#3 為準。
