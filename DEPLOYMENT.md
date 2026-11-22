# 從 GitHub main 發布到私人 Sites

正式站的來源是 `YuChia-Wei/ai-collaboration-workflow-board` 遠端 `main` 上已推送的 commit。Sites 使用自己的來源 repository 和部署版本。每次發布要能從正式版本查回 GitHub commit，並證明兩邊保存同一棵完整 Git tree。[GitHub main](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/tree/main) · [正式站](https://workflow-records-private.yuchia-wei.chatgpt.site/)

## 發布順序

1. 在準備發布的版本執行 `npm ci`、`npm test`、`npm run build`、`npm run test:tooling` 與 `npm run validate`。產品看板與導覽變更另執行 `npm run test:portfolio-browser`，用獨立合成資料走瀏覽器驗收。
2. 將此次發布的變更提交並推送到 GitHub `main`。以 `git ls-remote origin refs/heads/main` 讀回完整 SHA，與本次 commit 比對。記下 `git rev-parse '<GitHub SHA>^{tree}'` 的結果。後續建置與封裝都使用這份已推送的來源。
3. 依 `.openai/hosting.json` 開啟既有 Site，核對網址與私人存取範圍。用 Sites 的來源工具開啟獨立 checkout，取得一般來源寫入授權，略過自動發布選項。若 Sites 與 GitHub 分支可快轉，使用同一個 commit。若兩者有獨立歷史，在 Sites checkout 套用已核對的完整 GitHub tree，包含新增及移除的檔案，保存各自歷史。
4. 從這份來源建置並由 Sites 工具推送及封裝。將工具回傳的 Sites `commit_sha` 的 `^{tree}` 與步驟 2 比對，兩者必須相同。檢查 archive 內的 `dist/server/index.js` SHA-256 對應已驗證的 Worker，`dist/.openai/drizzle/` 的檔案及內容符合該版 migrations，`dist/.openai/hosting.json` 宣告的 Site 與 bindings 相符。Sites 封裝時會重新排版 manifest JSON。
5. 發布前再次讀取 GitHub `main`。如果分支已前進或 tree、產物不一致，重新選定並驗證版本。將已核對的 `project_id`、Sites `commit_sha` 與 archive 一併交給私人部署操作。若先保存版本，接續部署同一個已保存版本。
6. 讀回 deployment，確認狀態為 `succeeded`。從該 deployment 的 version ID 讀回正式版本號與來源 SHA，核對 GitHub 分支仍指向本次 commit。開啟正式頁面，唯讀檢查本次改動的實際操作路徑。在交付紀錄列出正式網址、Sites 版本、GitHub commit、Sites 來源 commit 與共同 tree。

## CI 與資料

GitHub Actions 驗證 push／PR 對應的程式碼，並保存以 commit SHA 命名的短期 Worker 產物。正式發布由已登入的 Sites 工具執行。推送 Sites 來源後，仍要完成上述比對和明確部署。[CI 設定](.github/workflows/ci.yml)

保留同一個 Site project、D1 binding 與存取範圍。資料庫變更隨已核對的 migrations 入版，依該次變更的資料影響驗證。純 Web 畫面調整沿用既有資料。合成展示與 E2E 使用獨立的本機資料庫。[本機試用方式](README.md#試用產品總覽與兩種看板)
