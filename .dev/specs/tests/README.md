# Workflow Board 正式測試規格索引

類型：formal-test。狀態：重建用草案 v1，2026-10-13。程式／契約基準為 `3e7ee13cda8de27c8a069a062ffd0d289584722e`。本目錄採 spec-author 的正式測試範本與 bdd-gwt-test-designer 的 Given／When／Then 方法；文件是驗證設計，這次沒有執行測試，也沒有新增 runner 或變更產品。

| 文件 | 驗證對象 |
| --- | --- |
| [協作模型](collaboration-formal-tests.md) | 19 個命令、assignment fencing、版本、DAG、授權、CAS、回放、拒絕與 unknown |
| [協定與查詢](protocol-query-formal-tests.md) | wire／schema、hash、跨語言向量、8 種 query、一致快照、錯誤與未實作 transport |
| [既有系統與架構](existing-system-formal-tests.md) | 人工 Board、legacy、source、UI、本機 HTTP／CLI／MCP、文件、attachment、export／restore、依賴邊界 |
| [來源測試清冊](test-source-inventory.md) | 實際測試名稱、路徑與證據層次；名稱存在與實際通過分開 |

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
- 不在本文執行清理；未來執行者只能清理自己建立的 fixture。export／restore crash orphan 是診斷證據，保留到證據驗收後才處理。

## 判定限制

規格作者完成的是來源閱讀及 GWT 自我檢查，沒有獨立驗收或 compliance verdict。現行 `workflow-board/collaboration/1` 尚無 production repository、HTTP／MCP routes、可信 Agent identity 或 snapshot query；這些情境只能列為計畫，不能因 domain 測試存在改標 implemented。人工 `framework-board/1`、legacy 與 Python local 的語意各自保留，不以協作模型覆蓋。
