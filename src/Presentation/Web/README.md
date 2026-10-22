# Board 前端來源

此目錄負責瀏覽器 HTML／CSS、DOM 互動、呈現、Markdown 清理與 HTTP client。`index.html` 是頁面模板，`entry.mjs` 依入口選擇人工／來源紀錄的 `app.mjs` 或協作檢視的 `collaboration-app.mjs`；目前以相對 `/api/` 路徑呼叫同一 Sites 服務。

- 可依賴前端套件及 `../../Contracts/` 的公開訊息定義。
- 不 import Core、Infrastructure 或其他 Presentation 模組，不讀 D1、server 身分來源或 server secrets。
- 顯示與輸入檢查不能替代後端對權限、revision、assignment 及 lifecycle 的驗證。

沿用 repo 根目錄單一 `package.json`，由 `../../Tooling/build.mjs` 建置並包進同一 Worker。測試與建置命令在 repo 根目錄執行。

未來若拆為獨立前端，主要調整 HTTP client 的 API origin／認證和資源發布方式；業務規則仍由後端 application commands 執行。

## Workflow 協作檢視（#7 本機切片）

入口為 `/?view=collaboration&store=<已設定的 store ID>`，也可從人工／來源紀錄側欄進入後指定 store。Store 只是資料空間識別，不提供身分或權限。查詢失敗不改讀另一種 profile，也不顯示合成 fallback。

`collaboration-client.mjs` 呼叫既有 collaboration/1 queries，完成有界分頁並核對 workflow 快照；`collaboration-view.mjs` 呈現工作、決策、指定文件與交接。文件讀取與下載都使用精確 revision／hash；內容以文字顯示，不執行文件指令。

目前只提供檢視，沒有審核／認領／接受成果的寫入入口。逐筆進度、session 結束與人類接受紀錄尚未由現行查詢 DTO 提供，不由顏色或完成數推定。可重現的合成預覽、驗收對照與待決策事項見 [UI 試行指南](../../../.dev/guides/collaboration-ui.md)。
