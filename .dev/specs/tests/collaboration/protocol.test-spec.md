# 協作 Wire、編碼與錯誤協定 正式測試規格

## 脈絡、類型與來源

- 類型：formal-test；操作：normalize；狀態：草案 v2（2026-10-13），全部 `not_run`。
- 範圍：schema、canonicalization、digest、容量、錯誤映射與版本分流。
- 行為規格：[collaboration/workflow/behaviors/command-acceptance.spec.md](../../collaboration/workflow/behaviors/command-acceptance.spec.md)；測試環境與整體狀態見[共通規則](../README.md)。
- 文件初始化基準：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；產品／測試來源仍固定 `3e7ee13cda8de27c8a069a062ffd0d289584722e`，兩者不混為新執行結果。
- 來源權威：Issue #3（updatedAt `2026-10-12T13:28:04Z`）保留 R01–R06／B01–B14／V01–V21；協作精確 wire 以 collaboration-v1 README／schema／vectors 為準；既有相容性來源為 ARCHITECTURE.md、PLATFORM-CONTRACT.md、各 src README 及現存 test source。code-only 回復項目仍為觀察／計畫，不提升為已核准產品要求。

## 環境、資料與隔離

純編碼測試不需 DB；必須使用固定向量 expected canonical/digest，不從被測編碼器生成預期值。JSON Schema 需 2020-12 及真正 date-time assertion（如 `2026-02-30` 拒絕），不能只用 regex。`portable-vectors.py` 是 Python 獨立向量實作，與 JS 對相同固定 oracle。

Query／transport integration 使用 owner=owner、store=local、namespace=personal、WF；A/H 可信身分同協作規格。context revision=20；P1 含完整 goal/scope/skill/external refs/必要交付；tasks 共 25 個、每頁最多 20；缺文件 F2 明列 missing。新 profile query handlers、production storage、HTTP/MCP routes 與可信身分尚未提供，FT-Q 情境全部為待實作規格，不把 DTO 存在當成執行能力。

測試層級與真實／替代邊界：純 schema／跨語言編碼與 adapter mapping；不證明 lifecycle／transport。每個情境與負例資料列獨立建立 Given，不以表格列順序共用狀態；清理僅針對執行者自己的 fixture，不自動清除 crash orphan；清理依既有授權。

## GWT 情境與具體斷言

### FT-P01

來源標籤：FT-P01／§2。層級：純 schema／跨語言編碼與 adapter mapping；不證明 lifecycle／transport。

**Given**：vectors.valid 指定 json 與固定 canonical/digest。

**When**：strict parse→canonical→SHA-256。

**Then**：unicode-values 字鍵 a 先 z；numeric-looking-keys 順序 1,10,2；utf16-key-order 為 a,😀,U+E000；nested 保留 array 順序；max-safe 整數保持值；逐向量 canonical 及 digest 完全相等。

### FT-P02

來源標籤：FT-P02／§2。層級：純 schema／跨語言編碼與 adapter mapping；不證明 lifecycle／transport。

**Given**：vectors.invalid 每個 json。

**When**：parseContractJson 一次。

**Then**：duplicate-property／escaped-duplicate、unsafe-integer、decimal `1.0`、exponent `1e3`、negative-zero、NaN、unpaired surrogate、leading-zero、trailing-data/comma、bad escape 等均 invalid_json；不得先 parse 後忽略重複 key。

### FT-P03

來源標籤：FT-P03／§2,schema。層級：純 schema／跨語言編碼與 adapter mapping；不證明 lifecycle／transport。

**Given**：正常 task.claim command。

**When**：單獨改 owner、actor、profile、schema、record_kind、missingstore、unsafe/fractional/null/0revision、missingpayload、unknownfield、clientassignment、blank/reserved/nonASCIIID 後驗 schema。

**Then**：每列 reject；required null 與省略不等價；create revision0 與其他>0 分開；任意 schema minor 不因 major 相同接受。

### FT-P04

來源標籤：FT-P04／§2,§6。層級：純 schema／跨語言編碼與 adapter mapping；不證明 lifecycle／transport。

**Given**：原文 LF/CRLF、composed/decomposed 字串、null-present/absent 固定向量。

**When**：contentDigest 或 valueDigest。

**Then**：LF/CRLF 不同 hash；é與 e+combining 不同；null/absent 不同；無 BOM 或正規化；原文 hash 不 hash JSON literal；invalid JS undefined/NaN/Infinity/-0/fraction/bigint/Date/sparsearray/cycle/surrogate 拒絕 invalid_json_value。

### FT-P05

來源標籤：FT-P05／§2 limits,V21。層級：純 schema／跨語言編碼與 adapter mapping；不證明 lifecycle／transport。

**Given**：有效 shape 資料；每列 UTF-8 bytes 邊界：request300000/300001、doc256000/256001、metadata64000/64001、header16000/16001、response64000/64001；tasks100/101、decisions100/101、dependencies32/33。

**When**：parse/command/query 該邊界入口。

**Then**：等於上限且其他條件合法可接受；累積 domain task／decision 101 或 bytes 超限以 limit_exceeded 為預期；單份 command schema maxItems 超限（如 dependencies 33／task_changes 101）現行 application 先回 invalid_command；不截斷／部分 state；多 byte 中文字依 UTF-8 bytes 非 charcount；必要 header 完整或拒絕。

### FT-P06

來源標籤：FT-P06／§6,V07。層級：純 schema／跨語言編碼與 adapter mapping；不證明 lifecycle／transport。

**Given**：vectors.request 可信 authority/command 與固定 digest；O1scope=[owner,local,O1]。

**When**：requestDigest；各列改 owner/binding/revision/target/payload/arrayorder。

**Then**：原 digest 等於固定值；每種改動 digest 不同；operationKey 不含 workflowID，改 target 仍查同 O1；不同 owner/store 獨立；hash 不授權。

### FT-P07

來源標籤：FT-P07／§3,V15。層級：純 schema／跨語言編碼與 adapter mapping；不證明 lifecycle／transport。

**Given**：payload 試圖自填 owner/actor/human；sessionlabel=H；可信 identity 為 A。

**When**：transport 接受該 request。

**Then**：shape 或授權拒絕；session 不得建立 H；同 owner 非同 assignment；失敗不透露他人 revision/docs/receipt；credential rotation 保留既有 binding 語意。

### FT-P08

來源標籤：FT-P08／§1,§7,V12。層級：純 schema／跨語言編碼與 adapter mapping；不證明 lifecycle／transport。

**Given**：現行/api/commands 僅人工及 legacy 可用。

**When**：service_contract_version=workflow-board/collaboration/1 或 future/99。

**Then**：501 unsupported_profile；不進 legacy、不寫另一 record、不廣告 implemented；null/array/number command→422invalid_command。

### FT-P09

來源標籤：FT-P09／§7。層級：純 schema／跨語言編碼與 adapter mapping；不證明 lifecycle／transport。

**Given**：Fault(code=example,category,details={current_revision:4})。

**When**：HTTP/MCP mapping 各一次。

**Then**：invalid 422、unauthenticated 401、forbidden 403、not_found 404、conflict 409、limit 413、unsupported501、unavailable503；MCPisError=true；code/details 相等；domain 無 status；unknown technicalerror 不洩 SQL/token/stack。

### FT-P10

來源標籤：FT-P10／§6。層級：純 schema／跨語言編碼與 adapter mapping；不證明 lifecycle／transport。

**Given**：operation 結果資料列 accepted receipt、rejectedreceipt、unknown 無 receipt。

**When**：schema 驗 operation_result。

**Then**：outcome 與 receipt.accepted 必須一致；unknown 不能帶 rejectedreceipt；durable rejection 不等 partial 成功；資料列不得混用。

## 規則覆蓋與排除

本檔唯一正式定義的情境為：FT-P01, FT-P02, FT-P03, FT-P04, FT-P05, FT-P06, FT-P07, FT-P08, FT-P09, FT-P10。其他 IDs 是追溯引用，不重複定義。每項成功／拒絕／邊界斷言沿用原始 v1；「來源存在」僅為靜態來源映射，不能把整個 V criterion 標示通過。Issue #3 完整 R/B/V 矩陣見[索引](../README.md)，技術來源及未覆蓋變體見下節。

## 執行與證據界線

本次 `not_run`：未執行產品測試、啟動服務、建立真實 browser／Agent session、建置或部署。normalize 只重組文件、改善可讀性並保留來源狀態。來源 fixture、schema 或 assert 名稱不是執行紀錄；future execution 必須綁不可變 commit、scenario/data row、actual identifier、環境、原始輸出及每個 Then 的證據。自我檢查不代表獨立驗收。

## 未知、衝突與開放問題

每個來源欄保留的缺口、部分覆蓋、觀察及未實作界線仍有效；不能因移入新目錄而改為 implemented／passed。需要的未定 oracle／真實邊界由原 Issue owner 收斂；不新增 runner、框架、固定批准、產品權限或部署要求。

新 collaboration profile 的可信 identity、production persistence、query snapshots、HTTP／MCP transport 尚未接入；domain／application 或 DTO 存在不證明 hosted capability。

來源衝突（GAP17）：契約 README 對超限統稱 limit_exceeded，但 schema maxItems 拒絕透過現行 command validation 先回 invalid_command；shape 容量拒絕與 domain 累積容量拒絕必須分開紀錄，待契約 owner 統一錯誤 oracle。本文不把統一 error code 當已通過，也不以 schema 失敗替代 domain 限制試驗。

## 技術 binding 與既有測試來源

以下保留原始 actual test identifier／部分來源／缺口；完整具名清冊見[來源清冊](../test-source-inventory.md)。語言、repository adapter、runner 與錯誤 mapping 是技術 binding，與上面的行為斷言分開。

| 情境 ID | 既有來源及限制 |
| --- | --- |
| FT-P01 | portable-contract.mjs valid loop＋portable-vectors.py；純編碼 |
| FT-P02 | portable-contract.mjs invalid loop；Python vectors 對照 |
| FT-P03 | portable-contract.mjs `negative`實際命名 rows；additional 全 command schema variants 仍需補 |
| FT-P04 | portable-contract.mjs documents/valid/rejectedvalues；純編碼 |
| FT-P05 | portable-contract.mjs 300001；collaboration.mjs UTF-8…超限部分；全部 exact boundary 及 query response 缺口 |
| FT-P06 | portable-contract.mjs request alter loop/operationKey；store/payload/arrayorder 完整矩陣需補 |
| FT-P07 | schema negative＋platform-ports trusted identity；新 credential integration 缺口 |
| FT-P08 | platform-ports.mjs `Given an unknown profile…`；不是新 route 存在證据 |
| FT-P09 | platform-ports.mjs `Given one domain failure…`；mapping pure，非 MCPtransport |
| FT-P10 | portable-contract.mjs rejected operation result assertions |
