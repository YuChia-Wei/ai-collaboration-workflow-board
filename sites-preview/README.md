# 工作紀錄室：Sites 預覽

本人私有的繁體中文工作流程紀錄網站，使用合成示範資料。提供搜尋與流程詳情、步驟更新、Markdown 文件修訂與封存、日誌、交接和文字證據。

資料由 Sites D1 保存；瀏覽器儲存不是紀錄來源。文件內容與修訂目前保存在 D1，此預覽不支援檔案附件或 R2。Sites 存取政策限制為本人，API 使用平台轉送的登入使用者身分分隔紀錄。

首次開啟空白空間會建立合成範例；範例不代表真實 repo 或工作進度。不包含本機 coding agent、MCP plugin 接入或真實資料遷移。

## 本地驗證

```powershell
npm ci
node --experimental-sqlite tests/contracts.mjs
npm run build
npm run validate
```

契約測試以 Node SQLite 模擬 D1 batch，覆蓋防重放、版本衝突、零列更新、交易回滾、文件保留與身分邊界；不等於 hosted D1 端到端驗證。

worker/service.mjs 為服務程式，web/index.html 為介面，db/schema.ts 與 drizzle/ 管理資料庫結構。建置產生 Cloudflare Worker ESM 於 dist/server/index.js。部署沿用 .openai/hosting.json 的既有 Sites project，依 Sites 正常流程推送其專用來源、封裝並私有發布。GitHub repo 的 push/merge 是分開的操作。

WebMCP 僅提供目前選定流程的唯讀工具；支援環境中的實際工具呼叫尚未驗證。這不代表本機 agent 已連接。
