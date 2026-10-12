# Board 前端來源

此目錄負責瀏覽器 HTML／CSS、DOM 互動、呈現、Markdown 清理與 HTTP client。`index.html` 是頁面模板，`app.mjs` 是瀏覽器入口；目前以相對 `/api/` 路徑呼叫同一 Sites 服務。

- 可依賴前端套件及 `../contracts/` 的公開訊息定義。
- 不 import `../backend/`，不讀 D1、server 身分來源或 server secrets。
- 顯示與輸入檢查不能替代後端對權限、revision、assignment 及 lifecycle 的驗證。

沿用上層單一 `package.json`，由 `../scripts/build.mjs` 建置並包進同一 Worker。測試與建置命令在 `src/board` 執行；不在此目錄建立另一套安裝或部署流程。

未來若拆為獨立前端，主要調整 HTTP client 的 API origin／認證和資源發布方式；業務規則仍由後端 application commands 執行。
