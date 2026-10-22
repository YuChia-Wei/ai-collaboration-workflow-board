# ChatGPT Sites 建置與部署自動化

核對日期：2026-10-07。本文件區分官方公開文件、此 session 提供的原生 Sites 工具契約，以及此 repo 的現況；沒有把未公開的 endpoint 當成部署 API。

## 官方支援的發布流程

目前公開文件的標準方式是在 ChatGPT web／desktop 中，由 agent 準備專案、測試與建置。Sites 儲存一個與 source Git commit 關聯的可部署版本，再部署該版本並回傳 production URL。可先儲存版本供 review。Sites 沒有獨立的 Codex CLI 管理介面。[官方 Sites 文件](https://learn.chatgpt.com/docs/sites#understand-projects-versions-and-deployments)

此 repo 的具體流程：

1. 對要發布的同一份 source 執行 `npm ci`、契約測試、`npm run build`、`npm run validate`。
2. Worker bundle 產生於 `dist/server/index.js`，archive 包含 hosting manifest 與 `drizzle/` schema migrations；產物不提交到 Git。
3. Sites agent 取得短期來源寫入 credential，把對應 source 推到既有 Site 的專用來源 repository。GitHub 的 `origin` 與 Sites 來源是不同的發布通道。
4. 原生 `save_site_version` 以已推送的 commit SHA 與該 source 的 archive 儲存版本；一般情況優先提交本機可生成的 archive，本機封裝無法完成時工具才允許 remote build fallback。
5. 原生 deploy 工具部署 saved version。已確認 owner-private 時可使用 combined private save/deploy。確認 deployment status 為 `succeeded` 後才報告發布成功。

步驟 3–5 的細節依本 session 提供的 Sites native tool schemas 與 `sites:sites-hosting` skill。這些工具透過已登入的 ChatGPT／Codex 工作階段運作；不是 repo 可直接使用的公開 REST API。

## 可自動化的方式

| 方式 | 能做到什麼 | 限制 |
| --- | --- | --- |
| ChatGPT／Codex 原生 Sites 流程 | 一次請求串接測試、建置、儲存與發布；保留同一 Site、資料與 audience | 需要原生 Sites 工具、登入身分與平台權限 |
| Sites cloud schedule | 定期讀取已授權來源、更新 Site／儲存待 review 版本；可依明確任務指令執行後續動作 | 功能依帳號提供；背景 task 需要自己的來源存取，不能沿用訪客的 connected-app 權限 |
| 原生短期 publish-on-push | 對已 enrolled 的 owner-only Site，在平台接受的有效視窗內推送後自動私有發布 | 必須收到 `publish_on_push_accepted: true`；時間與 token 都會到期，不是永久的 GitHub push hook |
| GitHub Actions | 每次 push／PR／手動觸發測試、建置、驗證與保存 artifact | 目前沒有確認一般 Actions runner 可使用的持久 Sites 發布憑證、公開 CLI／API 或官方 deployment Action |

官方提供 Sites 的 cloud schedules，也示範定期 task 更新內部 app 並儲存版本供審閱。[官方內部 app 流程](https://learn.chatgpt.com/use-cases/build-and-deploy-internal-apps)、[Sites schedules](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites)

例行資料刷新通常直接更新持久資料，不必每次重新建置／發布。程式碼、schema 或 runtime configuration 的變更才需相應的版本與部署。

### publish-on-push 的證據邊界

此 session 的 `create_source_repository_write_credential` 支援 `publish_on_push: "private"`。只有 response 的 `publish_on_push_accepted` 為 true，才可以省略另外呼叫 save/deploy；必須在 `publish_on_push_expires_at` 前推送，然後查對應版本的 deployment ID 與 status。若未接受，回到明確 save/deploy 流程；未接受不代表先前視窗已取消。

本次只讀取工具 schema，沒有建立 credential、開啟發布視窗或確認這個帳號已 enrolled。不能把工具欄位存在當成此 Site 已啟用自動發布。

## 此專案的確認結果

GitHub repository 的 Actions 已啟用。盤點時沒有 workflows、Actions secrets 或 variables。本次新增 `.github/workflows/ci.yml`，涵蓋 source policy、Python Linux／Windows 契約測試、Node 契約測試、Worker build 與 artifact 驗證／保存；尚未 push 或取得 hosted run 結果。

既有 Site 為 active，當前使用者為 owner，已有第五版；原生 linked automations 為空。沒有變更 audience、建立排程、儲存新版本、重新發布或遷移資料。

保留 Sites 的可用方案是 **GitHub Actions 負責 CI／產物，原生 Sites 流程負責儲存與發布**。若要求「main merge 後完全由 GitHub Actions 自動部署到同一 Sites」，還需要確認官方提供的 unattended authentication、source push、archive 上傳與 deployment status 契約。現有證據不足以實作並宣稱該路線受支援；也不能僅憑未找到文件就宣稱永遠不可能。

本次沒有建立假部署 job、存入短期 token，或把 `npm run build` 成功標成線上部署成功。
