# 需求、領域與驗證追溯

狀態：2026-10-13 文件覆蓋對照。下表的「覆蓋」是規格表達與情境設計，不是本次執行結果。原 Issue ID 全部保留；AC 必須連同 Issue 編號識別。原始文字及版本見 [來源快照](sources/manifest.json)。

## 已接受研究／設計及核心契約

| 來源 AC | 本次規格承接 | 驗證／證據邊界 |
| --- | --- | --- |
| #2 AC01：兩條旅程與 planning 語意 | domain-map；collaboration-domain 的 Plan／Handoff；use-cases UC02／UC18／CQ03–07 | B05／B06–08；查詢與跨 session journey 待實作 |
| #2 AC02：多 PBI、指定決定與接手、單一使用者 | domain-map contexts；CD01／CD06／CD07 | V01／V02／V09／V14；真實身份與 UI 待補 |
| #2 AC03：skill／Board／PM 責任 | domain-map 邊界及共同語言 | task 完成與人的決定分離；外部程序／PBI 不由 Board 自動操作 |
| #2 AC04：候選比較與未知 | 保留 issue-2.json 研究來源；gaps-and-decisions | 研究決策不需重造為 runtime 行為測試；本次未重作平台比較 |
| #2 AC05：增量、並行、權威及可靠性 | domain-map、CD04、OP01、reconstruction | B02／B03／B09／B10；V13；無隱含 Git 副本前提 |
| #2 AC06：Framework consumer 映射 | boundaries-and-adapters、GAP-07、issue-3.json 八 | Framework remote adapter 獨立交付，不能用 checkpoint 模擬 lifecycle |
| #2 AC07：研究／產品／採用分離 | README 狀態標記、reconstruction、所有 test execution boundary | 本次無產品執行、部署或採用聲明 |
| #3 AC01：外部工作與 task/session 分開 | domain-map、CD01／CD02 | V01；protocol FT-Q11 |
| #3 AC02：指定決策與兩種交接 | CD06／CD07、UC11／12／17／18 | B04／B05／B08；V02／V09 |
| #3 AC03：DAG 及工作線 | CD03／CD04、UC02／09 | R01、B02／B03、V03／V10 |
| #3 AC04：Actor 與 assignment fencing | CD01／CD04、UC09–15 | R02、B04、V05／V15；可信 adapter 待實作 |
| #3 AC05：Plan／task／decision 版本 | CD03／05／06、UC02／17 | R03、B06–08、V17／V18 |
| #3 AC06：原子性、CAS、重試、unknown 及反例 | OP01、boundaries-and-adapters | B09／B10、V07–11／V15–21；synthetic 與 hosted 分開 |
| #3 AC07：新舊 profile 及 consumer 相容 | domain-map、existing-board-profiles、local-prototype | V12；existing-system FT-H01／H02／S04 |
| #3 AC08：ports／介面接手與無 Git 前提 | boundaries-and-adapters、CQ01–08、reconstruction | V13／V14；未完成能力留在 GAP-01–07 |
| #4 AC01：依賴方向 | boundaries-and-adapters、domain-map | existing-system 架構情境；architecture.mjs 來源存在 |
| #4 AC02：替代 ports 驗證核心 | OP01、tests 層級／環境 | platform-ports／collaboration fixtures；替代 storage 不代表 hosted |
| #4 AC03：跨 transport 同錯誤、版本分離 | use-cases 錯誤目錄、boundaries-and-adapters | protocol-formal 的 error mapping；未連線 MCP |
| #4 AC04：原子接受、CAS／retry | OP01、GAP-03 | FT-I02／I03、B09／B10；新 production repository 待補 |
| #4 AC05：可攜 schema／hash | schema/examples/vectors；protocol-query-formal-tests | 固定 JS／Python oracle；本次未執行 |
| #4 AC06：範圍／限制明確 | README、gaps-and-decisions、reconstruction | 文件自查，不宣稱任意語言／hosting 已驗證 |

精確 R01–R06、B01–B14 與全部 V01–V21 對照，見 [協作正式測試規格](tests/collaboration-formal-tests.md)。命令層另以 FT-C01–FT-C19 表達每個使用案例的獨立驗證義務。

## 待審核後續需求

| 來源 | 規格中的處理 | 不在本次完成的部分 |
| --- | --- | --- |
| #5 AC01／05 | Adapter 認證、MCP 邊界及反偽造情境；GAP-02／04／09 | 選定 client、實際連線及 credential mechanism |
| #5 AC02／03／04 | CQ02–08、B05／B14、FT-Q 情境 | context／snapshot／cursor／指定版次 handlers；增量若選用需另定契約 |
| #5 AC06 | GAP-09；保留 tokens／bytes／往返／成功率不同觀測 | 未建立 benchmark、未量測 token 或實際 debit |
| #6 AC01／02／03 | OP01、B03／B09／B10、FT-I；GAP-02／03 | 真實 provider 並行／fault 與身份證據 |
| #6 AC04／05／06 | local 現有 portability 規格；GAP-06／10 | 新協作匯出格式／替代 store／hosted portability 未定，local 成功不代替 |
| #7 AC01／02／05 | domain-map、CQ03–07、既有 UI 與待實作 UI 邊界 | 新協作人端 UI 與可用性 journey |
| #7 AC03／04／06 | Decision basis／revision、B08／B14、FT-C17 | 真實人端決定、過期版本提示、兩個 Agent sessions E2E |
| #8 AC01–06 | GAP-12；保留 source snapshot 的需求原文與例子 | Delivery／Deployment 精確模型、命令、查詢、UI 全部未選，不捏造已完成規格 |

## 既有實作範圍盤點

| 來源群組 | 行為規格 | 測試規格 |
| --- | --- | --- |
| `src/board/backend/domain`、`application` 新協作 | collaboration-domain／collaboration-use-cases | collaboration-formal-tests／protocol-query-formal-tests |
| 同層人工／legacy／queries／summary | existing-board-profiles | existing-system-formal-tests |
| HTTP／Sites identity／MCP error／strict JSON | boundaries-and-adapters | protocol-query／existing-system |
| D1／clock／static source／schema／catalog | boundaries-and-adapters、existing-board-profiles | storage、source、ports 情境；新協作 GAP-03 |
| frontend／build／Worker composition | existing-board-profiles、boundaries-and-adapters | UI 與 architecture 情境；無本次 browser execution |
| local domain／application／SQLite／HTTP／CLI／MCP | local-prototype、boundaries-and-adapters | existing-system-formal-tests、test-source-inventory |
| local portable／export schema／delivery tools | local-prototype | export／preflight／restore 與 delivery 情境 |

Sources inventory 不列為逐行審查證明。某既有 test 只覆蓋一部分 Then 時，測試規格須維持「部分來源」，不得因檔名存在而把整個 AC 標為通過。規格沒有既有 automation 的正反例仍保留為待實作驗證義務。
