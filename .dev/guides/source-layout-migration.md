# 來源目錄搬移對照（2026-10-22）

本次依接受的方向移除 `src/board` 包裝層，以 Core／Presentation／Infrastructure 分隔核心、展現及技術實作。保留既有單一 Node package 與 Worker 部署，Python 原型維持獨立。GitHub Issues／Projects 仍是工作狀態權威。

| 舊定位 | 新定位 |
| --- | --- |
| `src/board/backend/domain/` | `src/Core/Workflows/Domain/` |
| `src/board/backend/application/` | `src/Core/Workflows/Application/` |
| `src/board/frontend/` | `src/Presentation/Web/` |
| `src/board/backend/adapters/inbound/http/` | `src/Presentation/WebApi/`；三個 identity adapters 改放 `src/Infrastructure/Identity/` |
| `src/board/backend/adapters/inbound/{cli,mcp,shared}/` | `src/Presentation/{Cli,Mcp,Shared}/` |
| `src/board/backend/adapters/outbound/http/collaboration-client.mjs` | `src/Presentation/Cli/collaboration-client.mjs` |
| `src/board/backend/{index,collaboration}.mjs` | `src/Presentation/WebApi/{entry,collaboration-services}.mjs` |
| `src/board/backend/cli.mjs` | `src/Presentation/Cli/main.mjs` 組裝與 `run.mjs` 執行協調 |
| `src/board/scripts/windows-cli.ps1` | `src/Presentation/Cli/windows-cli.ps1` |
| `src/board/backend/adapters/outbound/d1/`、`backend/schema/` | `src/Infrastructure/Persistence/D1/`，migrations 放 `Migrations/` |
| `src/board/backend/adapters/outbound/{static,runtime}/`、`backend/data/` | `src/Infrastructure/{SourceCatalog,Runtime}/` |
| `src/board/contracts/collaboration-v1/` | `src/Contracts/CollaborationV1/` |
| `src/board/scripts/`、`tests/` | `src/Tooling/`、`src/Tests/`；子目錄 `Lib/`、`Fixtures/` |
| `src/board/package*.json`、`drizzle.config.ts`、`.openai/hosting.json` | repo 根目錄對應檔案 |
| `src/board/README.md`、`CLI.md`、`MCP.md`、`COLLABORATION-MVP.md` | `Docs/board.md`、`cli.md`、`mcp.md`、`collaboration-mvp.md` |
| `src/local/` | `src/Prototypes/WorkflowRecords/`；內部來源目錄統一 PascalCase |

來源目錄使用 PascalCase，檔名沿用現有慣例。`src`、`.dev`、`.github`、`.openai`、Drizzle `Migrations/meta`、套件與工具規定的 `node_modules`、`dist/server`、`dist/.openai/drizzle` 不改名。這些是既有工具／資源契約，不新增相容目錄或轉址入口。

組裝由 WebApi 與 Cli 的入口持有；沒有 Hosts 或 CompositionRoots 專案。詳見 [架構](../../ARCHITECTURE.md) 與 [Presentation](../../src/Presentation/README.md)。

所有操作從 repo 根目錄執行：

```powershell
npm ci
npm test
npm run build
npm run test:tooling
npm run validate
npm run test:windows-cli
npm run cli -- help
python -B -m src.Prototypes.WorkflowRecords.Tests.test_layout
python -B -m src.Prototypes.WorkflowRecords.Tests.test_review_regressions
python -B -m src.Prototypes.WorkflowRecords.Tests.test_acceptance
```

原 `npm --prefix src/board <command>` 改為 `npm <command>`；原 `python -m src.local...` 改用 `src.Prototypes.WorkflowRecords...`，內部測試模組為 `Tests`。使用者既有 Windows 快捷命令若保存舊腳本路徑，須改指向 `src/Presentation/Cli/windows-cli.ps1`；credential profile 與秘密儲存方式不變。

可攜 schema／examples／vectors、既有 SQL migrations／Drizzle metadata、來源 catalog 與 hosting manifest 保留原始內容。沒有資料遷移、公開 API／wire DTO 版本變更，也沒有移動既有 runtime records 或 credentials。

既有 trial 的 `status`／`resume` 依其保存的 manifest 讀取新舊來源布局，保留舊快照與證據；不需要將舊 trial 目錄搬成新的來源結構。UI 預覽的預設證據位置仍為 repository 內的 `.runtime/wb07-ui/`。

`.dev` 中帶日期的設計、驗收與規格來源定位屬歷史證據；保留原始快照與語意，必要相對連結更新至目前來源。讀取舊路徑時用本表定位，不能把本次路徑更新解讀成重新執行歷史 hosted 驗收。
