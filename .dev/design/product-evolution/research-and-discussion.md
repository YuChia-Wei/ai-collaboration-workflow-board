# 研究、取捨與討論依據

整理日期：2026-10-22。本文件保留本次產品討論所用的重要資訊、選項及推論界線。外部產品資訊以官方來源為主；來源可能持續變動，採用時仍須固定版本。沒有下載、安裝或執行本表候選工具，也沒有宣稱已完成商用合規、效能或記憶品質驗證。

## 討論如何收斂

| 議題 | 最初問題 | 保留的分析與目前方向 |
| --- | --- | --- |
| 網站轉本地 APP／ADE | 是否能把既有 Board 包裝成可管理 Agents 的本機產品？ | 目前分層與契約有重用價值；桌面視窗、正式本地服務、Agent runner 與 IDE 是不同投入。先完成協作旅程，執行管理較後，IDE 可選 |
| C#、Rust、Go | 未來後端如何兼顧熟悉度與學習興趣？ | C#／.NET 優先，Rust 次選，Go 第三；Sites 暫留原技術；重寫需行為相容證據 |
| Windows 原生與 WebView | Microsoft 改用 WinUI 是否表示 WebView2 不值得採用？ | 部分原生體驗擴大不等於 WebView2 全面退場；WinUI 與 WebView2 可組合；Tauri 多平台使用不同系統引擎 |
| 團隊部署與敏感環境 | 桌面連線上服務是否足夠？ | 團隊可先由線上權威服務支援；銀行／敏感環境也可能需要本機離線或企業內網版本。完整本地開發延後，不取消其價值 |
| SQLite／PostgreSQL | 儲存如何配合部署模式？ | 本機 SQLite 接受；離開 Sites 後優先評估 PostgreSQL；現行 D1 保留。可靠性與遷移不可只靠替換 driver |
| AI 長期記憶 | 是否能保存同專案決策與工作經驗，減少重複探索？ | 先定義短／中／長期用途、來源與效力，再比較查詢與索引。記憶不等於模型訓練 |
| Framework 或 Board 主導 | 記憶會不會讓 Board 脫離工作紀錄定位？ | Framework 主責通用方法／契約，Board 提供工作來源與人類介面，client 負責真正載入；不需要先成立另一個大平台 |
| Roadmap 與資料保存 | 如何保留討論，又避免另一套工作總帳？ | 初期設計在 `.dev` 帶日期保存；既有 Issue 對應與範圍保留，當前工作狀態仍讀 live Issues／Projects |

## 公開記憶方案

評選條件來自 owner：可公開取得、開源或有可免費商用的適用範圍，便於公司內評估；同專案記憶優先，需能理解自架／離線邊界。下列確認的是**所列核心程式碼授權**，不把雲端平台、企業服務、模型權重、品牌資產或全部相依套件一併宣告免費。授權允許事項仍須依固定版本與實際分發方式查核。

| 候選 | 核心授權及定位 | 與本案的關係 | 尚未驗證 |
| --- | --- | --- | --- |
| Mem0 OSS | [Apache-2.0](https://github.com/mem0ai/mem0/blob/main/LICENSE)；記憶擷取／保存／搜尋 library 與 self-hosted server | 可替換的 memory adapter；保留本案自己定義的 provenance、接受狀態與失效規則 | C# 契約、繁中品質、企業無外網組態、備份與隔離 |
| LangGraph OSS＋LangMem | [LangGraph MIT](https://github.com/langchain-ai/langgraph/blob/main/LICENSE)、[LangMem MIT](https://github.com/langchain-ai/langmem/blob/main/LICENSE)；執行／狀態元件與記憶工具 | 比較記憶 schema、背景整理與候選形成；可評估 Python sidecar，或只參考方法 | 本地模型結構化輸出、衝突處理、專案隔離及額外 runtime 維護成本 |
| Microsoft Agent Framework | [MIT](https://github.com/microsoft/agent-framework/blob/main/LICENSE)；C#／Python Agent 與上下文元件 | C# 優先的建構候選；可自訂本案來源、候選、接受、取代與效力規則 | 固定套件組合、本地 embedding／資料庫 adapter 及真實記憶品質 |
| Letta 現行 runtime | [現行 code 主庫 Apache-2.0，品牌資產除外](https://github.com/letta-ai/letta-code/blob/main/LICENSE) | 更接近常駐 Agent／App Server，採用範圍大於單獨記憶 adapter；保留作研究比較 | 新舊 API 遷移、版本相容、工具權限及本案接受／授權流程契合 |

**Mem0 的 OSS 與 managed platform 要分開。** 官方 [主庫](https://github.com/mem0ai/mem0) 區分 library、server 與 Cloud，且部分展示 benchmark 含 managed platform 的專有最佳化，不能直接歸給 OSS。官方 [Ollama 本機範例](https://docs.mem0.ai/cookbooks/companions/local-companion-ollama) 同時配置本地 LLM、embedding 與 localhost Qdrant，支持可評估本地組合；不代表預設配置或任何安裝都完全無外網。

**LangMem 的內容類型與本案的時間軸不同。** [概念文件](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/) 討論 semantic／episodic／procedural memory，提供擷取、更新與整理工具；核心 API 不綁固定 store，stateful integration 使用 LangGraph store。這能參考，不能把三個名稱直接替代短／中／長期設計。

**LangGraph library 的 MIT 不涵蓋官方部署平台全部權利。** [Standalone Agent Server 文件](https://docs.langchain.com/langsmith/deploy-standalone-server) 列有 `LANGSMITH_API_KEY`、`LANGGRAPH_CLOUD_LICENSE_KEY`，一般模式有 license verification／usage reporting；air-gapped 模式另有安排。因此「嵌入 OSS library 自己寫服務」與「採用官方 Agent Server／LangSmith」是不同方案，後者的企業方案、費用與無外網條件需另查。

**Microsoft Agent Framework 的版本狀態必須按套件描述。** 10/22 查核 [Microsoft.Agents.AI 1.25.0](https://www.nuget.org/packages/Microsoft.Agents.AI/1.25.0) 與 [Workflows 1.25.0](https://www.nuget.org/packages/Microsoft.Agents.AI.Workflows/1.25.0) 均為正式版；[Hosting 1.25.0-preview.261014.1](https://www.nuget.org/packages/Microsoft.Agents.AI.Hosting/1.25.0-preview.261014.1) 是預覽套件。不能用 [Ollama 教學](https://learn.microsoft.com/en-us/agent-framework/integrations/by-component/model-providers/ollama) 的 `--prerelease` 參數推定整體框架仍為預覽。[ChatHistoryMemoryProvider](https://learn.microsoft.com/en-us/agent-framework/concepts/agents/conversations/chat-history-memory-provider) 可將訊息存於 vector store，依 application／agent／user／session scope 檢索並提供對話上下文；它不替本案定義 ADR／Lesson 的決策效力。

**Letta 不應沿用舊 V1 Python server 介紹。** 官方 [letta 主庫](https://github.com/letta-ai/letta) 明示 active source 在 `letta-ai/letta-code`，`archive` 分支保存 retired V1 API server。[自架文件](https://docs.letta.com/self-hosting) 說明 local runtime 與 self-hosted App Server；本機 runtime 可無 Letta 帳號運作，狀態由本機保存，但模型端另選。使用遠端 provider 仍會送出 prompt；自架 Agent 不由 chat.letta.com 存取，也不自動備份。其 LICENSE 另排除名稱、logo、wordmark、images、ASCII art 等品牌資產，不能只寫「整個產品均 Apache-2.0」。

### 比較順序與最小方案

首先以「現有紀錄＋結構化／文字查詢＋明確來源及輸出預算」作基準；若不足，再引入可重建的全文、向量或圖索引。這個順序能辨識問題在來源效力、檢索相關性、client 接入或資料保存，避免全部歸因於缺少記憶產品。

C# 方向可先評估 Microsoft Agent Framework 的可替換元件；需要獨立記憶服務時比較 Mem0；需要研究形成／整理流程時比較 LangMem；需要完整常駐 Agent 產品模型時再深入 Letta。這是本案的評估順序建議，不是已採用清單或實測排名。

## WebView、原生 UI 與跨平台

Microsoft 官方 [2026-10-15 Photos 公告](https://blogs.windows.com/windowsexperience/2026/10/15/meet-the-new-photos-app-on-windows-11/) 說明新 Editor 以 WinUI 3 重建並向 Insiders 推出；[2026-07-31 Windows 品質公告](https://blogs.windows.com/windows-insider/2026/07/31/windows-quality-an-update-on-the-commitment-we-made-in-march/) 同時談擴大 WinUI 3 與改善 Chromium／WebView2。這支持「部分體驗轉原生、兩條路線並存」，不支持「Microsoft 全面淘汰 WebView2」。

官方 [WinUI 3 WebView2 教學](https://learn.microsoft.com/en-us/microsoft-edge/webview2/get-started/winui) 與 [sample](https://learn.microsoft.com/en-us/microsoft-edge/webview2/samples/webview2-winui3-sample) 在原生視窗中混用 TextBox、Button 與 WebView2。因此 WinUI／WebView2 並非非此即彼；重用網頁也不代表網頁被轉成原生控制項。

[WebView2 分發文件](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution) 要求正式部署使用 WebView2 Runtime，不能依賴一般 Edge Stable 作 backing platform。Evergreen 共用且自動更新；Fixed Version 隨應用分發，由應用負責更新。企業離線與受管環境需另選 runtime 取得及更新方式。

[Tauri process model](https://v2.tauri.app/concept/process-model/) 與 [起始文件](https://v2.tauri.app/start/) 說明 Rust core 與系統 WebView 的分工：Windows 用 WebView2、macOS 用 WKWebView、Linux 用 WebKitGTK。共享前端仍需按 OS／引擎測試輸入法、縮放、可及性與網頁功能。[Sidecar 文件](https://v2.tauri.app/develop/sidecar/) 要求按 target 提供相應 binary；若搭 C# sidecar，還需負責協定、認證、生命週期及封裝。[Capabilities](https://v2.tauri.app/security/capabilities/) 限制前端可呼叫能力，不是對任意子程序的 OS 安全隔離。

Electron 隨應用提供 Chromium／Node，重用 Web UI 有利於一致環境；但仍需遵循 [安全指引](https://www.electronjs.org/docs/latest/tutorial/security) 與 [sandbox 說明](https://www.electronjs.org/docs/latest/tutorial/sandbox)，控制 renderer、preload、IPC、navigation 與 runtime 更新。本案未量測任何外殼的效能或安裝大小，不以一般印象作定案。

## 部署與可靠性參考

- [SQLite online backup](https://www.sqlite.org/backup.html) 與 [WAL](https://www.sqlite.org/wal.html)：供正式本地備份與生命週期設計參考，不能以任意檔案複製替代一致性保證。
- [ASP.NET Core Windows Service](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/windows-service?view=aspnetcore-10.0)：支持 .NET 本機服務 host 的候選做法；是否使用 Windows Service 還要看使用者層級、更新與多平台需求。
- [Windows Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)：可作未來程序群組／資源管理研究；不能單憑採用即宣稱任意工具已安全隔離。
- [Docker bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)：掛載會讓程序存取 host 路徑，需納入執行權限設計；容器或 worktree 名稱不自動證明隔離。

## 記憶研究的使用方式

[LongMemEval](https://arxiv.org/abs/2410.10813) 提供資訊擷取、多 session、時間推理、知識更新與資訊不足時棄答等評估面向，適合作為本案測試設計的參考，不是產品已達成這些能力的證據。[Mem0 論文](https://arxiv.org/abs/2504.19413) 可了解其記憶擷取與檢索研究；論文或供應商 benchmark 不直接成為 Board 的 token 節省、品質或部署效能結論。

本案還需要自己的來源權威、有效決策、適用範圍與權限隔離案例。評估應看「找對來源、識別更新與失效、保留未知、正確使用」，而不只看搜尋有結果或摘要較短。

## 本輪修正與未測事項

| 先前容易誤讀的敘述 | 本次保留的正確界線 |
| --- | --- |
| CLI／MCP 仍在待辦或 Draft PR | 10/22 已確認 #16／#17／#18 均完成；舊段落只作歷史 |
| 19 commands 都可由 client 使用 | 核心有 19 個 domain commands 的基線；#17 最終公開 capabilities 為 18／8，沒有 `decision.resolve` |
| UI Issue 完成代表人類已可正式審核 | #7 僅 UI 子範圍；#13／#14 的後端與可信人類尚待完成 |
| 新對話接手代表多 Agent 隔離 | 既有驗收沿相同 owner 的等價共用 binding；獨立 Agent 身分是 #11 |
| #6 未完成代表 CAS／receipt 不存在 | 既有機制及有限情境已有證據；完整 provider 故障、退出與替代 store 驗證尚未完成 |
| 安裝 Framework 就有自動記憶 | 安裝、紀錄查詢、召回、載入及實際使用是不同證據層 |
| 本地儲存代表所有 AI 資料不外流 | 需另看模型、embedding、工具、遙測、授權及更新流向 |
| 核心 library 開源代表全平台可免費自架 | 平台、企業服務、模型及相依套件需各自查核 |

以上外部查核多為現行文件或 main 分支，尚未固定所有 commit、映像或相依套件。後續採用需對所選版本做有界試驗；本輪只保存設計與提案，不把研究擴成新 benchmark、資安掃描或產品驗收。
