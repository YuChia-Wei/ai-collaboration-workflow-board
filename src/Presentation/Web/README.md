# Workflow Board 網頁

首頁列出使用者可見的產品，以及各產品正在執行的 workflow。選一個產品即可進入兩個看板。Scrum Board 用來找工作項目（PBI），Workflow Board 用來查實作進度、證據與下一步。從任一側都能查看同一份工作關聯。

| 入口 | 可以做什麼 |
| --- | --- |
| `/` | 找產品、有規劃權限時建立私人產品，從進行中清單直接開啟 workflow |
| `/?product=<id>` | 進入 Scrum Board，建立及排序自建 PBI，切換階層清單與狀態看板，查看已載入的外部 PBI |
| `/?product=<id>&layout=stages` | 看指定類型的工作階段、交付與部署。可用 kind、recipient 與 environment 固定篩選條件 |
| `/?product=<id>&tab=workflows` | 進入產品的 Workflow Board，依執行狀態找工作或建立 workflow |
| `/?product=<id>&item=<item_id>` | 開啟自建 PBI，編輯內容或狀態、查看上下層，建立或補連工作流程 |
| `/?product=<id>&repo=<repository_id>&pbi=<issue_id>` | 檢查支援此 PBI 的工作，從 PBI 建立 workflow |
| `/?product=<id>&flow=<workflow_id>` | 查看範圍、關聯 PBI、證據與交接，補連 PBI 或解除關聯 |

工作可先不掛 PBI。一項 workflow 可以支援多個 PBI，一項 PBI 也能連到多個 workflow。補連或解除會保存關聯歷史，方便下一個 session 看懂原始範圍及後續調整。資料空間可用選用的 `store` 參數指定，存取權限由服務判定。

沒有外部來源時，從「產品總覽 → 新增私人產品」建立產品，進入 Scrum Board 的「新增 PBI」。先建 Epic，再依需要建立 Feature、User Story 和 Task，每一層選擇對應的上層項目。「上移／下移」調整同層、同一上層項目下的順序。Bug 可直接建立在根層，填寫預期與實際行為，並可單獨指出受影響的 User Story。開啟任何自建 PBI 可編輯內容、關閉或重開；以同一個網址可從另一個已授權的工作階段讀回。

## 工作狀態、交付與環境

在 Scrum Board 的「狀態看板」選 PBI 類型、受領對象及環境。工作階段顯示該類型的進度。Delivered 和 Deployed 另外查看所選條件下已保存的證據。同一張 Bug 可以同時出現在 Retesting 及已部署到 QA 的結果中。切換環境即可查另一個 UAT 或 Production。拖動卡片會帶入對應操作，確認送出後才會寫入。也可由連結或項目詳情使用相同操作。

打開一張項目時，可查看目前允許的轉換、過往狀態及當時的操作者。舊資料只有 open／closed 時可明確指定同分類階段。在產品的「工作流程設定」依類型調整狀態名稱、初始階段與可走的轉換。例如 Story 可加入 Review，並保留 Testing 未過退回 Active 的路徑。調整顯示名後，較早的使用紀錄仍呈現當時名稱。

從產品的交付與環境操作，建立 QA、各客戶的 UAT 或正式環境，選擇主要環境及交付政策。先把所選工作與具體成果列入交付草案，填上產物、受領方與符合政策的依據後登記實際交付。部署則分別登記嘗試及環境觀察。失敗、重試、回復與前次讀回留在同一環境的歷史。Feature、Epic 詳情可查看子項已交付的成果和未交付範圍，文件或研究工作可標記部署不適用。[領域行為與驗收情境](../../../.dev/specs/portfolio/backlog/lifecycle-and-delivery.spec.md)

## 資料與組建

前端透過同源 HTTP 讀取產品與看板。產品沿用 collaboration/2 的 project。`/api/portfolio/v1/query` 提供該產品的自建待辦、外部來源涵蓋狀態和工作流程。自建項目以產品和穩定 item ID 定位，外部 PBI 以產品、repository 和 Issue 識別定位。使用者送出的待辦與 workflow 規劃操作經 `/api/portfolio/v1/command`，由伺服器核對權限、revision 與操作識別。回覆中斷時，頁面保留同一筆請求供重試。[Portfolio 契約](../../Contracts/PortfolioV1/README.md)

`index.html` 與瀏覽器入口由 `src/Tooling/build.mjs` 打包進 Sites Worker。Web 透過 DTO 與 Web API 互動，直接依賴限於前端套件及公開契約。首版 UI 使用已提供給 Board 的產品資料，GitHub Issues／Projects 串接列在後續里程碑。[執行本機合成預覽與 E2E](../../../README.md#試用產品總覽與兩種看板) · [產品範圍](../../../.dev/design/product-evolution/product-scope.md)
