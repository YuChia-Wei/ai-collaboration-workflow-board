# 沒有外部工作管理系統時，如何使用 Scrum Board

2026-11-25。使用者即使沒有串接 Azure DevOps、GitHub Issues 或 GitHub Projects，也能從空的 Scrum Board 開始管理工作。本次範圍包含手動建立 Epic、Feature、User Story、Task 與 Bug。使用者建立的待辦由 Board 保存，這個儲存庫自身的開發排程則由 GitHub Issues／Projects 管理。以下說明本次採用的層級、排序、權限與 Bug 關聯。[產品範圍](product-scope.md) · [實體與使用案例規格](../../specs/portfolio/backlog/native-backlog.spec.md)

## Scrum 如何影響設計

Product Backlog 是為改善產品而持續調整的有序工作清單，其承諾是 Product Goal。Product Owner 對項目的清晰度、順序和透明度負責，可以委派整理工作。細化（refinement）可逐步補上說明、拆分與估量，實際執行的 Developers 負責估量。在 Sprint Planning 中，Developers 與 Product Owner 討論後挑選工作，再決定如何達成 Sprint Goal。因而團隊可以先收錄想推動的工作，再決定何時執行。首片建立項目時只收該類型所需的資料，估算、Sprint、承接人和 workflow 均可留待規劃。[Scrum Guide 2020，Product Backlog](https://scrumguides.org/scrum-guide.html#product-backlog) · [Product Owner](https://scrumguides.org/scrum-guide.html#product-owner) · [Sprint Planning](https://scrumguides.org/scrum-guide.html#sprint-planning)

Epic、Feature、User Story、Task 和 Bug 是本產品選用的規劃語言。在 Azure Boards 中，Agile 程序用 User Story 表達需求，Scrum 程序使用 Product Backlog Item，Bug 可依團隊工作方式安排。Scrum Guide 對 Product Backlog 的定義容許各領域使用不同屬性。Board 選擇固定四層拆分，另給缺陷獨立入口，目的是讓團隊換一個 session 後仍能理解同一項工作及其上下文。[Microsoft Learn，Azure Boards 的程序差異](https://learn.microsoft.com/en-us/azure/devops/boards/work-items/guidance/choose-process?view=azure-devops) · [Azure Boards 的待辦結構與 Bug 行為](https://learn.microsoft.com/en-us/azure/devops/boards/backlogs/backlogs-overview?view=azure-devops)

## 一個產品如何組織工作

| 類型 | 用來回答的問題 | 建立位置與關係 |
| --- | --- | --- |
| Epic | 產品想達成哪一項較大的成果？ | 根層。可含多個 Feature。 |
| Feature | 為達成這個成果，需要哪一項可辨認的能力？ | 隸屬一個 Epic。可含多個 User Story。 |
| User Story | 哪一類使用者能得到什麼結果？ | 隸屬一個 Feature。可含多個 Task。描述可逐步細化。 |
| Task | 要做哪一件具體的工作以支援這個故事？ | 隸屬一個 User Story。這張卡可供規劃，實際執行及承接另由 workflow 記錄。 |
| Bug | 原本預期的行為和實際觀察到的行為有什麼差異？ | 根層且無子項。回報時填「預期」和「實際」，知道影響哪個 User Story 時可另行連結。 |

採用固定層級後，一張新 User Story 需要先有 Epic 和 Feature，換來一條能從產品成果查到具體工作的路徑。Bug 則可能先由使用者回報，當時連受影響的故事都不知道。將 Bug 放根層能讓團隊立即登錄及排序。後來發現影響哪張 Story，可以更新關聯，Bug 原有的識別與順序仍可追查。第一片只表達一個受影響的 Story。

每個產品的根層有一個順序，每一個父項也各自擁有其直屬子項的順序。新項目放在同層末端，可移到指定同層項目之前或末端。例如根層可把急需修復的 Bug 排到 Epic 前面。兩個不同 Feature 下的 Story 可能都排第一，這只表示各自在其 Feature 內的先後。跨父項的全產品平面排序、跨產品優先順序及 Sprint 排程屬後續規劃選擇。

## 誰保存什麼

| 責任 | 權威與可觀察結果 |
| --- | --- |
| 產品待辦內容 | Board 私有產品範圍保存原生項目的身分、型別、父子與受影響 Story、內容、開關狀態及同層順序。修改先驗證與原始讀取相同的待辦版本。 |
| 外部工作資料 | 外部 catalog 保留其來源、觀察時間、涵蓋狀態與版本。原生項目在另一組資料下讀回，維護者替換一次外部觀察時仍能找到此前手建的工作。外部來源無法讀取時，介面仍可表達未知或過期。 |
| 執行與接手 | workflow 可引用任意類型的原生項目、外部項目或兩者。一個項目也能支援多個 workflow。關聯保存所選版本。規劃內容後來修正時，接手者仍可辨認當時選了哪一版。 |
| 角色與授權 | Scrum 的 Product Owner 是工作責任。產品沿用服務解析的 owner、store、project 與既有 read／plan 能力。read 能看見授權產品的資料，可規劃身分可操作該產品。授權範圍不由畫面角色名稱決定。 |

關閉或重開是針對一張卡的明確決定，例如關閉 Epic 後，團隊仍可看見其下開啟的 User Story。執行 Task 完成、workflow 結案、產品項目關閉、成果符合 Definition of Done 及部署各有自己的證據。這次操作只改變所選項目的開關狀態。[Scrum Guide 2020，Definition of Done](https://scrumguides.org/scrum-guide.html#commitment-definition-of-done) · [Workflow 實體規格](../../specs/collaboration/workflow/entity/workflow.spec.md)

## 與既有架構的接點

項目維持 open／closed 粗分類，另保存類型所用的詳細工作狀態。團隊可配置流程、記錄交付給指定對象的成果，以及 QA、使用者驗收與正式環境的部署嘗試與讀回。[PBI 狀態、交付與部署設計](pbi-lifecycle-and-delivery.md) · [生命週期與交付規格](../../specs/portfolio/backlog/lifecycle-and-delivery.spec.md)

Scrum Board 的正常入口使用 Portfolio HTTP 契約。服務先依請求身分及產品範圍授權，再由核心判定類型、層級、排序與關聯。儲存邊界以產品為單位保護待辦修訂。成功寫入的內容、順序、修訂和操作回條需能一致讀回。既有 workflow 寫入沿用自己的 revision 和權限。兩者接合於帶來源與版本的工作項目引用，前端不需代替服務建立一致性或判定誰能寫入。[Portfolio HTTP 契約](../../../src/Contracts/PortfolioV1/README.md) · [專案架構](../../../ARCHITECTURE.md)

既有外部卡保留 repository／Issue／來源版本的識別。原生卡由 Board 產品內的穩定識別定位。這使同名工作可以並列、舊工作可以接手，也避免用虛構的 repository 或 Issue 編號換取相容。此次支援原生資料與受控外部觀察同時可讀。將原生卡發佈成外部 Issue、匯入時判斷重複、決定同步方向或衝突時由誰採納內容，要待未來實際整合時各自決定。[GitHub 整合路線圖](board-roadmap.md)

目前的 D1 adapter 以 owner、store、project、item_id 保存項目。同層位置、項目修訂與內容寫在原生待辦表中，工作關聯則保留所選版本的快照。這讓舊資料庫可以新增待辦表，舊 workflow 的外部參照繼續用原格式解讀。有關實際部署及資料庫遷移的驗證，應查該環境採用的版本。[原生項目規則](../../../src/Core/Workflows/Domain/native-backlog.mjs) · [D1 儲存介面](../../../src/Infrastructure/Persistence/D1/portfolio-repository.mjs)
