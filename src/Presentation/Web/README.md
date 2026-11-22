# Board 前端來源

此目錄負責瀏覽器 HTML／CSS、DOM 互動、呈現、Markdown 清理與 HTTP client。`index.html` 是頁面模板，`entry.mjs` 載入所選工作空間，共用同源 HTTP 服務。

| 入口 | 用途 |
| --- | --- |
| `/`、`/?view=portfolio` | 產品總覽、進行中的工作、產品 PBI 與執行看板 |
| `/?view=records` | 人工與歷史來源 |
| `/?view=collaboration` | 協作快照、工作證據、審閱草稿與交接 |
| `/?view=source-replica` | 已匯入的專案來源副本 |

產品總覽讀取可見專案，再依產品讀取 `/api/portfolio/v1/query`。PBI 以產品、repository 與 Issue 的識別定位；頁面顯示來源觀察時間及涵蓋狀態。工作流程可在建立時選擇零至多個 PBI，或從任一側補連／解除。命令提交至 `/api/portfolio/v1/command`，使用版本與操作識別，接受後重新讀取；回覆中斷時，可在同一頁重送相同請求。既有 personal 空間提供協作讀取，人工紀錄與來源副本各有獨立入口。

- 可依賴前端套件及 `../../Contracts/` 的公開訊息定義。
- 不 import Core、Infrastructure 或其他 Presentation 模組，不讀 D1、server 身分來源或 server secrets。
- 顯示與輸入檢查不能替代後端對權限、revision、assignment 及 lifecycle 的驗證。

沿用 repo 根目錄單一 `package.json`，由 `../../Tooling/build.mjs` 建置並包進同一 Worker。測試與建置命令在 repo 根目錄執行。

未來若拆為獨立前端，主要調整 HTTP client 的 API origin／認證和資源發布方式；業務規則仍由後端 application commands 執行。

## Workflow 協作檢視（#7 本機切片）

入口為 `/?view=collaboration&store=<已設定的 store ID>`。四個工作空間共用頁首導覽；切換時保留目前的 store，頁首標出作用中的工作空間。Store 只是資料空間識別，不提供身分或權限。查詢失敗不改讀另一種 profile，也不顯示合成 fallback。

`collaboration-client.mjs` 呼叫既有 collaboration/1 queries，完成有界分頁並核對 workflow 快照；`collaboration-view.mjs` 呈現工作、決策、指定文件與交接。文件讀取與下載都使用精確 revision／hash；內容以文字顯示，不執行文件指令。

目前只提供檢視，沒有審核／認領／接受成果的寫入入口。逐筆進度、session 結束與人類接受紀錄尚未由現行查詢 DTO 提供，不由顏色或完成數推定。可重現的合成預覽、驗收對照與待決策事項見 [UI 試行指南](../../../.dev/guides/collaboration-ui.md)。

專案選擇器使用 collaboration/2 registry，顯示 stable ID 與名稱；沒有 URL 中的明確 project 選擇時，先停留在專案清單。選 legacy-personal 使用 V1。切換會丟棄前一個 project 的 context／cursor／文件，未保存審閱草稿仍走原離開確認。專案管理只建立或改名，不刪除。未知 project 命令結果保留原請求重試並提供下載；重新整理前需保存原請求。
