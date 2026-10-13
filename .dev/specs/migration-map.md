# 原規格與正規化位置對照

本次 normalize 的輸入為 `aa5ba552d29dfb3525c89a7dc8e4f45234f55f10` 中的 `.dev/specs/`。原檔案 bytes 綁定於 [normalization-inputs.json](sources/normalization-inputs.json)；舊內容可由該 commit 讀取，不保留另一套重複的全文作第二權威。

移動的依據是領域／聚合及規格種類。原有規則、案例、證據層級、未決事項保持原編號；只有來源可確認的欄位拼字及初始化已解決的文件差異作明列訂正，見[整理審閱紀錄](normalization-review.md)。

## 領域、行為與介面

| 原檔／章節／ID | 新位置 | 類型與保留責任 |
| --- | --- | --- |
| collaboration-domain.md，CD-01–CD-09 | [協作 Workflow](collaboration/workflow/entity/workflow.spec.md) | entity；識別、資料、狀態、不變條件、歷史與容量 |
| collaboration-use-cases.md，共通入口／OP-01／錯誤／共通查詢限制 | [命令接受](collaboration/workflow/behaviors/command-acceptance.spec.md) | production；共通協定；保留原子性、digest、權限、receipt 及 unknown |
| collaboration-use-cases.md，UC-01–UC-19 | [命令目錄](README.md#新協作行為目錄)的 19 個 behaviors 文件 | 每個命令一份 production；原 payload／pre/post／reject 分別保留 |
| collaboration-use-cases.md，CQ-01–CQ-08 | [查詢目錄](README.md#新協作行為目錄)的 8 個 queries 文件 | 每個 query 一份 production；已定契約與未實作狀態分開 |
| existing-board-profiles.md，人工模型／EB-01–EB-06 | [人工實體](board-human/workflow/entity/workflow.spec.md)、[人工命令](board-human/workflow/behaviors/commands.spec.md) | entity 與 production；維持 human 的單一 active task 與文件規則 |
| existing-board-profiles.md，EB-07 | [Legacy 實體](legacy/workflow/entity/workflow.spec.md)、[Legacy 命令](legacy/workflow/behaviors/commands.spec.md) | 獨立相容模型；不套用新協作 lifecycle |
| existing-board-profiles.md，EB-08／EB-09 | [Catalog 與既有查詢](source-catalog/queries/catalog.spec.md) | production query；唯讀來源、原文、模式優先序及分頁 |
| existing-board-profiles.md，EB-10／EB-11 | [瀏覽器](board-web/adapters/browser.spec.md) | adapter；顯示、Markdown、非同步回應與 pending 操作 |
| boundaries-and-adapters.md，BA-01／BA-02 | [HTTP](board-web/adapters/http.spec.md) | adapter；路由、可信身分、Origin、pagination coercion 及錯誤映射 |
| boundaries-and-adapters.md，BA-03／BA-04 與既有 ports | [既有 persistence](board-web/adapters/persistence.spec.md) | adapter；舊 profile hash／operation scope／原子接受、source／clock ports |
| boundaries-and-adapters.md，BA-05 | [新協作 command repository](collaboration/adapters/command-repository.spec.md) | adapter；accept/reject/unknown；尚未接入 production |
| boundaries-and-adapters.md，BA-06 | [新協作 query repository](collaboration/adapters/query-repository.spec.md) | adapter；pinned snapshot 與精確版本；尚未接入 production |
| local-prototype.md，LP-01–LP-06 的實體及不變條件 | [Local Workflow](local-records/workflow/entity/workflow.spec.md) | entity；與人工／legacy／新協作分流 |
| local-prototype.md，九個命令及 LP-02–LP-06 的接受行為 | [Local 命令](local-records/workflow/behaviors/commands.spec.md) | production；CAS、角色、批准、文件與證據 |
| local-prototype.md，LP-07 | [Local 讀取](local-records/workflow/behaviors/queries.spec.md) | production；complete context 與指定文件版本 |
| local-prototype.md，LP-08／LP-09；boundaries-and-adapters.md，BA-07／BA-08 | [Local clients/storage](local-records/adapters/clients-and-storage.spec.md) | adapter；HTTP／CLI／MCP、outbox 及 SQLite 邊界 |
| local-prototype.md，LP-10–LP-12；BA-08 portability 部分 | [匯出／預檢／還原](local-records/portability/export-restore.spec.md) | production；portability 行為與 filesystem／replay binding 分列 |

章節同時描述 invariant 與操作時，分別進入 entity 與 production，並互相連結。共用 ID 代表同一來源規則的兩個描述面，不能因此另建第二套規則或另一個已執行情境。

## 正式測試規格

| 原檔／情境 | 唯一情境定義的新位置 |
| --- | --- |
| tests/collaboration-formal-tests.md，B01–B04／B06–B13、FT-C01–FT-C19 | [協作命令](tests/collaboration/workflow/commands.test-spec.md) |
| 同檔，FT-I01–FT-I08 | [協作不變條件](tests/collaboration/workflow/invariants.test-spec.md) |
| 同檔，B05／B14；protocol-query-formal-tests.md，FT-Q01–FT-Q11 | [查詢與接手](tests/collaboration/queries.test-spec.md) |
| protocol-query-formal-tests.md，FT-P01–FT-P10 | [Wire／編碼協定](tests/collaboration/protocol.test-spec.md) |
| existing-system-formal-tests.md，FT-H01–FT-H10 | [人工命令](tests/board-human/workflow/commands.test-spec.md) |
| 同檔，FT-H11–FT-H12 | [Legacy](tests/legacy/workflow/records.test-spec.md) |
| 同檔，FT-S01–FT-S04 | [Source catalog](tests/source-catalog/catalog.test-spec.md) |
| 同檔，FT-U01–FT-U04 | [瀏覽器](tests/board-web/browser.test-spec.md) |
| 同檔，FT-L01–FT-L16 | [Local workflow](tests/local-records/workflow.test-spec.md) |
| 同檔，FT-X01–FT-X07 | [Local portability](tests/local-records/portability.test-spec.md) |
| 同檔，FT-A01–FT-A06 | [架構邊界](tests/architecture/dependencies.test-spec.md) |
| 原 R01–R06／V01–V21 對照與共用隔離／證據狀態 | [測試索引](tests/README.md) |
| tests/test-source-inventory.md | [原位置保留](tests/test-source-inventory.md)，更新導航；87 個 named test identifiers 及直接 assertion suites 不刪除 |

111 個情境各有一處正式定義；其他規格可以引用同一 ID，不另複製成不同 oracle。沒有新增 step definitions、runner 或測試執行結果。

## 保留於根層及來源目錄

README、domain-map、coverage、reconstruction、gaps-and-decisions 保持原檔名，更新其實際導航、整理基線與已解決差異。`sources/manifest.json` 及 7 個 Issue 快照原 bytes 保留；新增來源說明及本輪輸入清單。以上都是規格的導覽／來源材料，不偽裝為 entity、production、adapter 或 formal-test。
