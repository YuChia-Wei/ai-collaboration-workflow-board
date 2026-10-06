# 工作紀錄室：Sites 預覽

本人私有的繁體中文工作流程紀錄網站。呈現 ai-collaboration-framework 的 Git 工作紀錄快照，保留來源 ID、狀態、task 原始 metadata 與文件原文；匯入資料為唯讀，原 repo 保持原狀。另可建立本人的網站紀錄。

資料由 Sites D1 保存；瀏覽器儲存不是紀錄來源。文件內容與修訂目前保存在 D1，此預覽不支援檔案附件或 R2。Sites 存取政策限制為本人，API 使用平台轉送的登入使用者身分分隔紀錄。

不再自動建立合成範例。此次匯入保留指定 Git tree 的目前文件；更早的 Git 修訂未匯入。二進位附件保留固定版本來源連結與 hash，附件實體仍在 Git。此匯入不是原 repo 工作流程的權威切換，也不包含本機 coding agent 或 MCP plugin 接入。

來源紀錄與文件分表保存，避免大型 workflow 超過 D1 單列限制。匯入經持久 staging、完整 row hash 核對後，以同一交易切換可見資料並只移除三個已知合成流程。網站原有其他紀錄保留；清理前另有 repo 外備份。完成後移除暫時 runtime secret，且服務程式固定拒絕一次性匯入端點；即使舊 runtime 仍提供該 secret，也不能使用。

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
