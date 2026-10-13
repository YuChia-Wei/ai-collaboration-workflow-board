# Workflow Board 正式測試規格索引

類型：正式測試規格索引與共用說明，不是額外的獨立情境規格。狀態：重建用草案 v2（normalize），2026-10-13。程式／契約基準為 `3e7ee13cda8de27c8a069a062ffd0d289584722e`。本目錄採 spec-author 的正式測試範本與 bdd-gwt-test-designer 的 Given／When／Then 方法；文件是驗證設計，這次沒有執行測試，也沒有新增 runner 或變更產品。

| 文件 | 驗證對象 |
| --- | --- |
| [協作 Workflow 命令接受與狀態轉移](collaboration/workflow/commands.test-spec.md) | 協作 Workflow aggregate 的 19 個命令與 R01–R05 產品例子 |
| [協作 Workflow 不變條件與故障接受](collaboration/workflow/invariants.test-spec.md) | 協作一致性、授權、完整 command state、未知結果與 immutable facts |
| [協作 Wire、編碼與錯誤協定](collaboration/protocol.test-spec.md) | schema、canonicalization、digest、容量、錯誤映射與版本分流 |
| [協作 查詢、指定版本與接手](collaboration/queries.test-spec.md) | 八種查詢與 resume／unknown 協調；B05／B14 的唯一正式定義 |
| [人工 Board Workflow 命令相容性](board-human/workflow/commands.test-spec.md) | framework-board/1 人工 metadata、單一 active task、文件與 operation |
| [Legacy Workflow 紀錄相容性](legacy/workflow/records.test-spec.md) | 舊紀錄的必要文件、結果／證據、追加修訂與 tombstone |
| [固定來源 Catalog 查詢與唯讀相容性](source-catalog/catalog.test-spec.md) | 固定 source snapshot、未知欄位、分頁與唯讀路徑 |
| [Board Web 瀏覽器呈現與寫入協調](board-web/browser.test-spec.md) | 畫面誠實呈現、Markdown、安全連結、pending operation 與非同步 selection |
| [Local Records 用例與客戶端整合](local-records/workflow.test-spec.md) | 獨立本機 workflow-record context 的命令、批准、證據與 HTTP／CLI／MCP |
| [Local Records 匯出與還原](local-records/portability.test-spec.md) | 可攜 package、preflight、角色重綁、原子 publish 與 crash recovery |
| [架構依賴、執行路徑與生成產物](architecture/dependencies.test-spec.md) | Board／local 向內依賴、frontend/backend 邊界與 runtime artifact 約束 |
| [來源測試清冊](test-source-inventory.md) | 87 個實際 named test identifiers 與直接 assertion suites |

## 使用與證據規則

每列情境為獨立試驗；Given 完成所需前置 fixture，When 只執行該列動作。不要把表格列順序當成共用執行序列。所有新 `FT-*` ID 是本地草案標籤，不取代 Issue #3 的 B01–B14、R01–R06、V01–V21。來源 AC 的整體對照由上層規格索引維護；本目錄保留來源 ID 並描述可觀測斷言。

`來源存在` 表示已閱讀測試程式中的 action 與 assertion，並不表示本次執行。`部分來源` 表示只涵蓋部分 Then／資料列。`缺口` 表示目前沒有找到足以證明該邊界的測試。所有情境本次執行狀態均為 `not_run`。

協作 memory repository 是合成的接受協定；Node SQLite 仿 D1 batch 可驗證本機 rollback，但不能證明 hosted D1 的 batch／CAS。Python acceptance 使用真正 loopback HTTP、CLI／MCP 子程序及 SQLite，可證明本機 protocol clients，不代表兩個真實 coding agents、線上登入或正式資料遷移。固定 schema/examples/vectors 證明格式／編碼預期，不證明 workflow lifecycle。

未來執行紀錄至少綁定：不可變 source commit、規格版本、scenario/data-row ID、測試實際 identifier、環境與真實／替代依賴、命令、時間、結果、完整 assertions 及原始證據路徑。範例中的 evidence `outcome=passed` 是測試資料，不能用來宣稱測試已通過。

## 環境、隔離與清理

- Domain／application：每情境新建 `owner/local/personal/collaboration/WF`，固定時間 `2026-10-12T00:00:00.000Z`，可預期 ID port，獨立 operation IDs；合成 repository 不與其他情境共用。
- Board adapters：各 fixture 獨立 SQLite database，從基準 migrations 初始化；fault injection 要逐情境恢復。需另建真實 hosted D1 fixture 才能補 storage acceptance。
- Local：每情境使用獨立、忽略且未追蹤的 runtime directory；HTTP 綁 `127.0.0.1` 隨機 port；MCP／CLI 子程序結束後收集 transcript，服務關閉後再操作 DB。不可拿既有使用者 store 當 fixture。
- UI：使用受控 HTTP response、固定 catalog 與可觀測 DOM／network；pending operation 要保留原 body／ID。真正瀏覽器 journey 尚需補測。
- 不在本文執行清理；未來執行者只能清理自己建立的 fixture。export／restore crash orphan 是診斷證據，不自動 purge；清理依既有授權。

## 判定限制

規格作者完成的是來源閱讀及 GWT 自我檢查，沒有獨立驗收或 compliance verdict。現行 `workflow-board/collaboration/1` 尚無 production repository、HTTP／MCP routes、可信 Agent identity 或 snapshot query；這些情境只能列為計畫，不能因 domain 測試存在改標 implemented。人工 `framework-board/1`、legacy 與 Python local 的語意各自保留，不以協作模型覆蓋。

## 初始化與來源基準

本輪以初始化文件 HEAD `aa5ba552d29dfb3525c89a7dc8e4f45234f55f10` 的 AGENTS／first-task 規則重組；產品／test source 仍為 `3e7ee13cda8de27c8a069a062ffd0d289584722e`。normalize 保留111個情境ID與87個具名測試來源，不宣稱重新執行。

## 情境唯一正式定義位置

| 情境 ID | 正式定義 |
| --- | --- |
| B01 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#b01) |
| B02 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#b02) |
| B03 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#b03) |
| B04 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#b04) |
| B06 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#b06) |
| B07 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#b07) |
| B08 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#b08) |
| B09 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#b09) |
| B10 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#b10) |
| B11 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#b11) |
| B12 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#b12) |
| B13 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#b13) |
| FT-C01 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c01) |
| FT-C02 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c02) |
| FT-C03 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c03) |
| FT-C04 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c04) |
| FT-C05 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c05) |
| FT-C06 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c06) |
| FT-C07 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c07) |
| FT-C08 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c08) |
| FT-C09 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c09) |
| FT-C10 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c10) |
| FT-C11 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c11) |
| FT-C12 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c12) |
| FT-C13 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c13) |
| FT-C14 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c14) |
| FT-C15 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c15) |
| FT-C16 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c16) |
| FT-C17 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c17) |
| FT-C18 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c18) |
| FT-C19 | [collaboration/workflow/commands.test-spec.md](collaboration/workflow/commands.test-spec.md#ft-c19) |
| FT-I01 | [collaboration/workflow/invariants.test-spec.md](collaboration/workflow/invariants.test-spec.md#ft-i01) |
| FT-I02 | [collaboration/workflow/invariants.test-spec.md](collaboration/workflow/invariants.test-spec.md#ft-i02) |
| FT-I03 | [collaboration/workflow/invariants.test-spec.md](collaboration/workflow/invariants.test-spec.md#ft-i03) |
| FT-I04 | [collaboration/workflow/invariants.test-spec.md](collaboration/workflow/invariants.test-spec.md#ft-i04) |
| FT-I05 | [collaboration/workflow/invariants.test-spec.md](collaboration/workflow/invariants.test-spec.md#ft-i05) |
| FT-I06 | [collaboration/workflow/invariants.test-spec.md](collaboration/workflow/invariants.test-spec.md#ft-i06) |
| FT-I07 | [collaboration/workflow/invariants.test-spec.md](collaboration/workflow/invariants.test-spec.md#ft-i07) |
| FT-I08 | [collaboration/workflow/invariants.test-spec.md](collaboration/workflow/invariants.test-spec.md#ft-i08) |
| FT-P01 | [collaboration/protocol.test-spec.md](collaboration/protocol.test-spec.md#ft-p01) |
| FT-P02 | [collaboration/protocol.test-spec.md](collaboration/protocol.test-spec.md#ft-p02) |
| FT-P03 | [collaboration/protocol.test-spec.md](collaboration/protocol.test-spec.md#ft-p03) |
| FT-P04 | [collaboration/protocol.test-spec.md](collaboration/protocol.test-spec.md#ft-p04) |
| FT-P05 | [collaboration/protocol.test-spec.md](collaboration/protocol.test-spec.md#ft-p05) |
| FT-P06 | [collaboration/protocol.test-spec.md](collaboration/protocol.test-spec.md#ft-p06) |
| FT-P07 | [collaboration/protocol.test-spec.md](collaboration/protocol.test-spec.md#ft-p07) |
| FT-P08 | [collaboration/protocol.test-spec.md](collaboration/protocol.test-spec.md#ft-p08) |
| FT-P09 | [collaboration/protocol.test-spec.md](collaboration/protocol.test-spec.md#ft-p09) |
| FT-P10 | [collaboration/protocol.test-spec.md](collaboration/protocol.test-spec.md#ft-p10) |
| B05 | [collaboration/queries.test-spec.md](collaboration/queries.test-spec.md#b05) |
| B14 | [collaboration/queries.test-spec.md](collaboration/queries.test-spec.md#b14) |
| FT-Q01 | [collaboration/queries.test-spec.md](collaboration/queries.test-spec.md#ft-q01) |
| FT-Q02 | [collaboration/queries.test-spec.md](collaboration/queries.test-spec.md#ft-q02) |
| FT-Q03 | [collaboration/queries.test-spec.md](collaboration/queries.test-spec.md#ft-q03) |
| FT-Q04 | [collaboration/queries.test-spec.md](collaboration/queries.test-spec.md#ft-q04) |
| FT-Q05 | [collaboration/queries.test-spec.md](collaboration/queries.test-spec.md#ft-q05) |
| FT-Q06 | [collaboration/queries.test-spec.md](collaboration/queries.test-spec.md#ft-q06) |
| FT-Q07 | [collaboration/queries.test-spec.md](collaboration/queries.test-spec.md#ft-q07) |
| FT-Q08 | [collaboration/queries.test-spec.md](collaboration/queries.test-spec.md#ft-q08) |
| FT-Q09 | [collaboration/queries.test-spec.md](collaboration/queries.test-spec.md#ft-q09) |
| FT-Q10 | [collaboration/queries.test-spec.md](collaboration/queries.test-spec.md#ft-q10) |
| FT-Q11 | [collaboration/queries.test-spec.md](collaboration/queries.test-spec.md#ft-q11) |
| FT-H01 | [board-human/workflow/commands.test-spec.md](board-human/workflow/commands.test-spec.md#ft-h01) |
| FT-H02 | [board-human/workflow/commands.test-spec.md](board-human/workflow/commands.test-spec.md#ft-h02) |
| FT-H03 | [board-human/workflow/commands.test-spec.md](board-human/workflow/commands.test-spec.md#ft-h03) |
| FT-H04 | [board-human/workflow/commands.test-spec.md](board-human/workflow/commands.test-spec.md#ft-h04) |
| FT-H05 | [board-human/workflow/commands.test-spec.md](board-human/workflow/commands.test-spec.md#ft-h05) |
| FT-H06 | [board-human/workflow/commands.test-spec.md](board-human/workflow/commands.test-spec.md#ft-h06) |
| FT-H07 | [board-human/workflow/commands.test-spec.md](board-human/workflow/commands.test-spec.md#ft-h07) |
| FT-H08 | [board-human/workflow/commands.test-spec.md](board-human/workflow/commands.test-spec.md#ft-h08) |
| FT-H09 | [board-human/workflow/commands.test-spec.md](board-human/workflow/commands.test-spec.md#ft-h09) |
| FT-H10 | [board-human/workflow/commands.test-spec.md](board-human/workflow/commands.test-spec.md#ft-h10) |
| FT-H11 | [legacy/workflow/records.test-spec.md](legacy/workflow/records.test-spec.md#ft-h11) |
| FT-H12 | [legacy/workflow/records.test-spec.md](legacy/workflow/records.test-spec.md#ft-h12) |
| FT-S01 | [source-catalog/catalog.test-spec.md](source-catalog/catalog.test-spec.md#ft-s01) |
| FT-S02 | [source-catalog/catalog.test-spec.md](source-catalog/catalog.test-spec.md#ft-s02) |
| FT-S03 | [source-catalog/catalog.test-spec.md](source-catalog/catalog.test-spec.md#ft-s03) |
| FT-S04 | [source-catalog/catalog.test-spec.md](source-catalog/catalog.test-spec.md#ft-s04) |
| FT-U01 | [board-web/browser.test-spec.md](board-web/browser.test-spec.md#ft-u01) |
| FT-U02 | [board-web/browser.test-spec.md](board-web/browser.test-spec.md#ft-u02) |
| FT-U03 | [board-web/browser.test-spec.md](board-web/browser.test-spec.md#ft-u03) |
| FT-U04 | [board-web/browser.test-spec.md](board-web/browser.test-spec.md#ft-u04) |
| FT-L01 | [local-records/workflow.test-spec.md](local-records/workflow.test-spec.md#ft-l01) |
| FT-L02 | [local-records/workflow.test-spec.md](local-records/workflow.test-spec.md#ft-l02) |
| FT-L03 | [local-records/workflow.test-spec.md](local-records/workflow.test-spec.md#ft-l03) |
| FT-L04 | [local-records/workflow.test-spec.md](local-records/workflow.test-spec.md#ft-l04) |
| FT-L05 | [local-records/workflow.test-spec.md](local-records/workflow.test-spec.md#ft-l05) |
| FT-L06 | [local-records/workflow.test-spec.md](local-records/workflow.test-spec.md#ft-l06) |
| FT-L07 | [local-records/workflow.test-spec.md](local-records/workflow.test-spec.md#ft-l07) |
| FT-L08 | [local-records/workflow.test-spec.md](local-records/workflow.test-spec.md#ft-l08) |
| FT-L09 | [local-records/workflow.test-spec.md](local-records/workflow.test-spec.md#ft-l09) |
| FT-L10 | [local-records/workflow.test-spec.md](local-records/workflow.test-spec.md#ft-l10) |
| FT-L11 | [local-records/workflow.test-spec.md](local-records/workflow.test-spec.md#ft-l11) |
| FT-L12 | [local-records/workflow.test-spec.md](local-records/workflow.test-spec.md#ft-l12) |
| FT-L13 | [local-records/workflow.test-spec.md](local-records/workflow.test-spec.md#ft-l13) |
| FT-L14 | [local-records/workflow.test-spec.md](local-records/workflow.test-spec.md#ft-l14) |
| FT-L15 | [local-records/workflow.test-spec.md](local-records/workflow.test-spec.md#ft-l15) |
| FT-L16 | [local-records/workflow.test-spec.md](local-records/workflow.test-spec.md#ft-l16) |
| FT-X01 | [local-records/portability.test-spec.md](local-records/portability.test-spec.md#ft-x01) |
| FT-X02 | [local-records/portability.test-spec.md](local-records/portability.test-spec.md#ft-x02) |
| FT-X03 | [local-records/portability.test-spec.md](local-records/portability.test-spec.md#ft-x03) |
| FT-X04 | [local-records/portability.test-spec.md](local-records/portability.test-spec.md#ft-x04) |
| FT-X05 | [local-records/portability.test-spec.md](local-records/portability.test-spec.md#ft-x05) |
| FT-X06 | [local-records/portability.test-spec.md](local-records/portability.test-spec.md#ft-x06) |
| FT-X07 | [local-records/portability.test-spec.md](local-records/portability.test-spec.md#ft-x07) |
| FT-A01 | [architecture/dependencies.test-spec.md](architecture/dependencies.test-spec.md#ft-a01) |
| FT-A02 | [architecture/dependencies.test-spec.md](architecture/dependencies.test-spec.md#ft-a02) |
| FT-A03 | [architecture/dependencies.test-spec.md](architecture/dependencies.test-spec.md#ft-a03) |
| FT-A04 | [architecture/dependencies.test-spec.md](architecture/dependencies.test-spec.md#ft-a04) |
| FT-A05 | [architecture/dependencies.test-spec.md](architecture/dependencies.test-spec.md#ft-a05) |
| FT-A06 | [architecture/dependencies.test-spec.md](architecture/dependencies.test-spec.md#ft-a06) |

## Issue #3 的規則與完整追溯

R01→B01–B03；R02→B04–B05；R03→B06–B08；R04→B09–B10；R05→B11–B13；R06→B14及V01／V11–V15／V21。上述ID以canonical表的唯一正式定義為準。

| 原 ID | 本規格／其他規格情境 | 明確缺口 |
| --- | --- | --- |
| V01 | protocol FT-Q11 | 外部兩 PBI partial/unresolved 的 create/context 真實 client |
| V02 | B05、FT-C02、protocol FT-Q03/Q06 | 新 session 原文+task query 未實作 |
| V03 | B02、FT-C09、FT-I01 | label 相同/不同均不改變 readiness；UI journey |
| V04 | B03/B10 | hosted storage 競爭 |
| V05 | B04、FT-C11 | production fencing integration |
| V06 | B06、FT-C02/C11/C09 | release→new definition→claim 整合 |
| V07 | B09/B10、FT-I03、protocol FT-P06/Q08 | 真實回應遺失與 durable operation |
| V08 | FT-I02/I03、existing FT-H08 | 新 profile 實際 storage atomic 接受/拒絕 |
| V09 | B08、FT-C07/C14/C17 | 真實 human identity；UI decision |
| V10 | B12、FT-I01 | 跨 workflow 依賴完整拒絕列 |
| V11 | B05/B14、protocol FT-Q03–Q07 | snapshot queries 及指定 revision 實作 |
| V12 | existing FT-H01/H02/S04、protocol FT-P08 | 新舊 profile 相容 actual runtime |
| V13 | FT-I03、protocol FT-Q08 | 新 profile 遠端 unavailable 恢復 client |
| V14 | B05、existing FT-L01 | Python protocol clients 僅替代；真實 Agents+人端仍缺 |
| V15 | FT-I04、B04/B08、protocol FT-P07 | credential binding 反偽造實際 integration |
| V16 | B01/B11、FT-I08 | 全命令 assignment 一致性完整掃描 |
| V17 | B07、FT-I07 | production CAS integration |
| V18 | B08、FT-I05 | rename/remove/nonblocking 繞過及有效 H 沿用/豁免完整表 |
| V19 | B11、FT-C08/C11/C12 | paused progress/handoff 及真實 delayed request |
| V20 | B13、FT-C07、FT-I06 | all cancelled/unrelated completed 反例、UI 範圍摘要 |
| V21 | FT-I01/I02、protocol FT-Q03/Q04/P05 | 真實 snapshot 保存/過期、單項超限及不前進 cursor |

## 保留的開放事項與自我檢查

目前測試只覆蓋上述「來源存在」的具體斷言；文件沒有替某個缺口造假通過。需由 #5/#6/#7 決定及實作可信 identity、production 接受/拒絕交易、query snapshots 與 UI。規格未要求額外固定 PO gate、微服務、lease、scheduler 或本機工作目錄鎖。自然語言結果品質、發布及採用不由結構化完成判斷證明。自我檢查範圍：保留 B/R/V ID、每列主要 When、明列 Given 與 Then、每個 command 有驗證義務、mock/real 邊界及執行狀態分開；不宣稱獨立審查。

Snapshot 保留／備份政策、cursor 具體編碼與可信 credential 機制由#5/#6 收斂，本文只固定 binding／failure 語意；不得用隨意 TTL 創造新要求。若未來平台不能保存 snapshot20，正確結果是 snapshot_expired，不混版。外部 PBI 內容由 Agent 取得；測試不新增 PMconnector 或要求 Board 讀外部 provider。沒有跨 workflow 原子 snapshot 或跨服務事件 delivery 保證。本次自我檢查未執行任何 wire/schema/hash/query 測試。

本次只閱讀 source、撰寫與自我檢查。沒有啟動 HTTP、MCP、browser、DB 測試、export／restore 或 build。真實 Sitesidentity、hostedD1/R2、Webbrowserjourney、真實 Agents、正式 migration、backuprecovery 與 歷史 repository gate 記錄（初始化已修正過時命令；不要求新增 checker） 需各自提供實際 evidence；本機 source 測試可作重建 oracle，但不可替代要求的真實邊界。
