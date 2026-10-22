# 外部展現與接入

| 目錄 | 責任與入口 |
| --- | --- |
| `Web/` | 瀏覽器 UI、狀態與 HTTP client；`entry.mjs` 選擇畫面 |
| `WebApi/` | HTTP 路由、DTO 與 Worker 入口；`entry.mjs` 和 `collaboration-services.mjs` 組裝 application、儲存與身分 adapters |
| `Cli/` | `main.mjs` 組裝遠端 client 與程序輸入／輸出，再交給 `run.mjs`；`windows-cli.ps1` 提供 Windows credential 啟動 |
| `Mcp/` | MCP tools、JSON-RPC 與錯誤映射；目前由 WebApi 提供 HTTP transport |
| `Shared/` | 現有 CLI／MCP／HTTP 共用的 JSON 與 transport 驗證 |

每個可執行入口自行選擇元件；不建立統一的 Hosts 或 CompositionRoots 層。入口附近允許必要的組裝重複，Shared 不承擔跨入口全域 DI。CLI 使用遠端 versioned DTO，不直接連線 D1。

目前沒有 Desktop 或 GraphQL 實作，未建立空目錄。未來可在 Presentation 加入對應模組，由各入口組裝核心與 adapters。來源分層不代表已分開部署；現有 Web／WebApi／Mcp 仍由一個 Sites Worker 提供服務。
