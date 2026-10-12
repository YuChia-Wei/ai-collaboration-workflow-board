# Board 後端來源

此目錄包含 Worker API 與 workflow 規則、儲存、可信身分介面及 server 專用資料。

| 路徑 | 責任 |
| --- | --- |
| `domain/` | Aggregate 規則、值、語意錯誤；不依賴 HTTP、D1 或 UI |
| `application/` | 命令／查詢協調、授權脈絡與 ports |
| `adapters/` | HTTP／MCP 表示、Sites identity、D1、clock 與靜態投影 |
| `schema/` | DB schema 與不可改寫的既有 migrations |
| `data/` | Server 使用的固定來源 catalog |
| `index.mjs` | 後端 composition root 與 Worker fetch 入口 |

後端不 import `../frontend/`。單一部署所需的頁面由上層 build script 注入；HTTP 路由提供頁面與 API，但不決定前端 UI 狀態。公開 DTO／版本規範放在 `../contracts/`，儲存模型與 domain 實作留在這裡。

沿用上層 package、CI 及 Sites 部署。未來更換 hosting 或獨立部署 API 時，替換相應 adapters／composition root，並另外驗證認證、儲存與遷移。
