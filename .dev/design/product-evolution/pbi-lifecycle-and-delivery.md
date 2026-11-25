# 私有 Scrum Board 的 PBI 狀態、交付與部署

2026-11-25。Owner 選定本設計作為私有 Scrum Board 的開發方向。原先只有 open／closed 的卡保留原值。新增的原生 PBI 使用各自類型的預設流程，受領方交付與環境部署各有獨立紀錄。精確的狀態轉換、舊資料對應和驗收依據見[生命週期與交付規格](../../specs/portfolio/backlog/lifecycle-and-delivery.spec.md)與 [Portfolio HTTP 契約](../../../src/Contracts/PortfolioV1/README.md)。

## 開箱即可使用的流程

產品提供一套按類型區分的流程。建立產品即可用預設值，團隊之後可再依實際作業調整。表中的箭頭是正常路徑，測試退件與重開各有合法去向。

| 類型 | 預設工作狀態 | 如何判定完成 |
| --- | --- | --- |
| Epic | New → Active → Done | 負責人依 Epic 的產品目標及已確認的範圍收尾。可顯示子項完成與交付情形，部分 Feature 上線時 Epic 仍可繼續。 |
| Feature | New → Active → Validating → Done | 驗證整項能力及它包含的成果。某個 Story 已交付時，保留部分交付範圍。 |
| User Story | New → Active（Developing）→ Testing → Done | 以 Story 的驗收條件和團隊的完成定義判定。測試未過回到 Active。 |
| Task | New → Active → Done | 以該項工作的完成條件收尾，例如完成文件修訂。需要覆核的團隊可在 Active 與 Done 間加入 Review。 |
| Bug | New → Triaged → Active（Fixing）→ Retesting → Done | 分流後修正，依通報的預期與實際行為重驗。重驗未過回到 Active。重複單可從分流直接結案，另記 Duplicate 及原單；不修則記原因。這兩種結案都不產生已修正或已交付的紀錄。 |

工作完成、交付給某個對象、某環境已套用某版本，可以發生在不同時間。Scrum 的 Definition of Done 用來判定 Increment 是否達到產品所需品質，Scrum Guide 也允許在 Sprint 結束前交付。五種型別和上表的流程是本產品的選擇。[Scrum Guide，Increment 與 Definition of Done](https://scrumguides.org/scrum-guide.html#increment)

## 在卡片上呈現 Delivered 和 Deployed

| 要回答的問題 | 需要保存的事實 | 卡片上的例子 |
| --- | --- | --- |
| 這項工作進展到哪裡？ | PBI、工作狀態、變更時間、操作者，以及適用的結案原因。 | Bug 正在重驗 |
| 這次把什麼交給了誰？ | 交付的 PBI 或部分成果、可追溯版本或產物識別、交付對象、實際交付時間與依據。交付草案可先建，確認交付後才顯示 Delivered。 | 1.4 已交付客戶 A，包含查詢功能；匯出功能延期 |
| 哪個版本實際到了哪裡？ | 產物識別、穩定的目標環境識別、每次部署的時間、結果與可核對的依據。環境目前版本優先採用最後一次可確認的讀回。 | QA 已部署 1.4，客戶 A 的 UAT 已部署 1.4，Production 仍是 1.3 |

團隊若習慣依 `New → Developing → Testing → Delivered → Deployed` 追蹤工作，可以選擇狀態看板及特定客戶和環境。工作狀態欄依類型顯示，Delivered 與 Deployed 依所選條件的證據呈現，並標明全項或部分成果。拖動卡片會開啟相應操作，完成表單後才會產生紀錄。同一張 Bug 可同時留在「重驗中」且在 QA 已部署。未登記交付時，使用者仍可查看其目前工作階段。文件或研究 Task 可標示「部署不適用」。[既有交付與部署範圍 #8](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/8) · [部分交付與部署重試案例](github-v1-examples.md)

## 各團隊可調整什麼

| 範圍 | 產品級設定 | 跨團隊仍可解讀的依據 |
| --- | --- | --- |
| 工作流程 | 先以產品為設定範圍，按 PBI 類型選範本，可改顯示名、新增階段、指定初始與結案狀態，以及允許的轉換。例如 Story 加 Code Review，Bug 允許 Retesting 回到 Fixing。 | 狀態有穩定識別與開啟／結案分類；改名保留歷史。已有工作使用的狀態要停用時，先指定既有卡片的處理方式。 |
| 環境 | 依產品建立、命名及停用環境，可只有 QA，也可同時有 QA、客戶 A 的 UAT、客戶 B 的 UAT、Production。每個環境可標示用途，兩個相同用途的環境仍可各自查詢。 | 部署記錄引用確切環境與產物。保存每次成功、失敗、重試和回復；沒有可靠讀回時，生效版本顯示未知或最後確認時間。 |
| 交付政策 | 可指定受領對象與須登記的證據類別。例如甲團隊交付測試包給客戶 QA，乙團隊要求提供客戶 UAT 簽收紀錄。只有候選產物時可先保存草案。 | 確認交付保存當時的對象、政策、產物與所填依據。QA 通過或 UAT 簽收需有相應的外部證據，Board 的部署結果只表示該次嘗試的結果。 |

Redmine 的 tracker 可有各自的初始狀態與流程，並依角色及 tracker 配置允許的轉換。Board 採用按類型提供範本與轉換的做法，伺服器沿用私人產品既有 read／plan 能力。角色別轉換、欄位必填矩陣及可信人類簽核有待未來需求選定。Azure Pipelines 的環境是具名的部署目標，可按環境追查歷次部署。Board 借用這個語意保存使用者登記的記錄與依據。[Redmine 工作類型與狀態轉換](https://www.redmine.org/projects/redmine/wiki/RedmineIssueTrackingSetup) · [Microsoft Learn，部署環境與歷史](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/environments?view=azure-devops)

## 用同一張 Bug 驗收這個設計

1. 產品先登記「週日已停診仍可預約」。修正版本 1.4 部署到 QA 時，Bug 可以仍在 Retesting。QA 只完成部署而尚未測試，畫面應能看出尚缺重驗結果。
2. 同一產物進入客戶 A 的 UAT。客戶 B 的 UAT 仍是 1.3。若團隊規定以簽收為交付條件，客戶 A 簽收前保持待交付，簽收後只記 A 收到 1.4。
3. Production 部署失敗後，另一次讀回確認仍是 1.3。QA 與 A 的 UAT 維持 1.4，A 的既有交付仍成立。重試成功並讀回 1.4，Production 才顯示生效版本 1.4。若再回復至 1.3，保留兩次嘗試、回復及各次讀回。
4. 一個 Feature 有兩項可分別交付的 Story。先交付其中一項時，Feature 顯示已交付範圍和剩餘項目，仍可處於 Active。文件 Task 可直接 Done。
5. 團隊將 Developing 改名為「開發中」，舊紀錄仍指向同一個階段。舊版卡片只有 open／closed，讀取時保留原值；若要套新流程，須有明確對應，不能從 closed 推定以前已測試、交付或部署。

團隊決定「交付給誰、用何種證據登記」及主要追蹤環境。產品提供初始流程和可調整的產品級設定，並讓團隊在同一產品保存交付、部署嘗試和環境觀察。以上操作的證據以實際來源與紀錄為準。若要由 pipeline 自動收集、由收件人可信簽核或加入角色別轉換，需另行設計。Issue #8 的完整驗收和本次可透過 Web 操作的範圍分別追蹤。[交付與部署 Issue](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/8)
