# Workflow Board 網頁

首頁列出使用者可見的產品，以及各產品正在執行的 workflow。選一個產品即可進入兩個看板。Scrum Board 用來找工作項目（PBI），Workflow Board 用來查實作進度、證據與下一步。從任一側都能查看同一份工作關聯。

| 入口 | 可以做什麼 |
| --- | --- |
| `/` | 找產品，從進行中清單直接開啟 workflow |
| `/?product=<id>` | 進入產品的 Scrum Board，開啟 PBI，查看或補連同一產品的 workflow |
| `/?product=<id>&tab=workflows` | 進入產品的 Workflow Board，依執行狀態找工作或建立 workflow |
| `/?product=<id>&repo=<repository_id>&pbi=<issue_id>` | 檢查支援此 PBI 的工作，從 PBI 建立 workflow |
| `/?product=<id>&flow=<workflow_id>` | 查看範圍、關聯 PBI、證據與交接，補連 PBI 或解除關聯 |

工作可先不掛 PBI。一項 workflow 可以支援多個 PBI，一項 PBI 也能連到多個 workflow。補連或解除會保存關聯歷史，方便下一個 session 看懂原始範圍及後續調整。資料空間可用選用的 `store` 參數指定，存取權限由服務判定。

## 資料與組建

前端透過同源 HTTP 讀取產品與看板。產品對應明確的 Board project，`/api/portfolio/v1/query` 提供該產品的工作項目、來源涵蓋狀態和工作流程。PBI 由產品、repository 和 Issue 識別定位。使用者送出的規劃操作經 `/api/portfolio/v1/command`，由伺服器核對權限、revision 與操作識別。回覆中斷時，頁面保留同一筆請求供重試。[Portfolio 契約](../../Contracts/PortfolioV1/README.md)

`index.html` 與瀏覽器入口由 `src/Tooling/build.mjs` 打包進 Sites Worker。Web 透過 DTO 與 Web API 互動，直接依賴限於前端套件及公開契約。首版 UI 使用已提供給 Board 的產品資料，GitHub Issues／Projects 串接列在後續里程碑。[執行本機合成預覽與 E2E](../../../README.md#試用產品總覽與兩種看板) · [產品範圍](../../../.dev/design/product-evolution/product-scope.md)
