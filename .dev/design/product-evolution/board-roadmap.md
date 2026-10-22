# Workflow Board Roadmap

狀態快照：2026-10-22；全部既有 Issue 均已逐筆讀回。階段／Epic／Feature 是本文件的規劃分組，Story 是可供後續拆解的 PBI 摘要，**不是本次新建的 GitHub 工作或已承諾日期**。既有 Issue 的完整 Tasks／AC、授權與最新狀態仍以連結為準。Framework 的工作另見 [記憶提案](framework-memory-proposal.md)。

## 已完成基線

| 階段／Epic | Feature | User Story／PBI 摘要 | 既有 Issue 與完成範圍 |
| --- | --- | --- | --- |
| B0：產品與可攜核心 | 產品範圍 | 作為 owner，我希望先確定單一使用者、可接續工作與可並行任務的首版邊界 | [#2](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/2) Closed／completed；研究與範圍決策完成 |
| B0 | 領域與行為契約 | 作為開發者，我希望以 Workflow、Task DAG、Assignment、Decision 與 handoff 的共通語言設計流程 | [#3](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/3) Closed／completed；DDD／BDD 模型與案例完成 |
| B0 | 核心與 ports | 作為不同入口的使用者，我希望同一行為由相同 domain／application 契約處理 | [#4](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/4) Closed／completed；核心、ports、可攜契約、本機驗證及當時精確 main CI |
| B0 | 線上 MCP／API | 作為選定 Agent client，我希望讀取精確版本並用可對帳命令更新工作 | [#5](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/5) Closed／completed；選定 Site plugin、單 owner 共用 Agent binding 與 receipt／重試 |
| B0 | 審閱 UI 基礎 | 作為 owner，我希望查看精確版本、準備意見與建議結果、保存或捨棄草稿 | [#7](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/7) Closed／completed；UI 子範圍、未送出確認及 JSON 下載；正式送出停用 |
| B0 | 開發工具採用 | 作為維護者，我希望採用選定 Framework 能力而不增加 Board runtime 相依 | [#9](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/9)、[#18](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/18) 均 Closed／completed；由 v0.19.1 首次安裝演進至 v0.20.1、15 skills 與 engineering-common 0.3.0 |
| B0 | Windows CLI | 作為外部工具或使用者，我希望安全連線線上 Board，處理精確版本、回執及 unknown 恢復 | [#16](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/16) Closed／completed；雙層認證、Windows 認證管理員、真實線上合成情境及 main CI |
| B0 | 跨介面接手 | 作為新對話的 Agent，我希望由 MCP 讀回前一個 CLI 工作，再把工作交回 CLI | [#17](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/17) Closed／completed；選定真實 plugin、新對話唯讀接手、CLI→MCP→CLI 與精確 main CI |

[#1 工作總覽](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/1) 為 Closed／not_planned，已退役；它不是完成的 Epic，也不再作重複進度總帳。#9 主文保留的 PR OPEN 是歷史文字，後續留言已確認合併；現行工具版本接續 #18。先前要求的 **#18 → #16 → #17 已完成**，不再排成下一輪待辦。

已完成範圍不包含全域 npm 發布、通用 external auth、跨帳號 OAuth、多 Agent 隔離、人類正式審核、token 節省或完整備份還原。#17 最終 capabilities 是 **18 commands／8 queries，不暴露 `decision.resolve`**；核心規格中的 19 個 domain commands 是不同證據層。

## 現有開啟工作與產品旅程

以下六張 Issue 在 10/22 已重整主文，仍為 Open、AC 尚未驗收；其內容是後續待審核工作範圍，不能由開啟狀態推定實作已獲授權。

| 階段／Epic | Feature | User Story／PBI 摘要 | 對應與關鍵未決 |
| --- | --- | --- | --- |
| B1：可靠工作與人類決定 | 可靠性及完整退出 | 作為 owner，我希望在衝突、重試或中斷後確認操作結果，並完整匯出、預檢及還原資料 | [#6](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/6)；沿用既有 CAS／receipt，補足 provider 故障、原子性、namespace 與完整退出證據；保留策略、替代 store、測試環境待選 |
| B1 | 可信人類授權 | 作為 owner，我希望只有具可信人類 principal 與所需能力的入口能作專屬決定 | [#14](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/14)；人類入口、可信來源、最小能力、有效期與撤銷方案待選 |
| B1 | 提交、修正與接受 | 作為審閱者，我希望針對明確版本提交結果、核准或要求修改，並追蹤重新提交與最終接受 | [#13](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/13)；審核對象、修正任務方式、證據門檻、終態順序與變更重審範圍待定 |
| B1 | 真實 UI 整合 | 作為 owner，我希望由已完成的審閱畫面實際送出決定並讀回正式歷史 | 接續 #7／#13／#14；跨層切片需沿現行 Issues 收斂，尚未另建工作，不重新宣稱 #7 未完成 |
| B2：協作可辨識與可觀察 | 多 Agent 身分隔離 | 作為 owner，我希望分別授權、撤銷及辨識兩個 Agent，避免彼此冒用 assignment | [#11](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/11)；首個 client、credential、最小權限與舊共用 binding 遷移待定 |
| B2 | Session 觀察 | 作為協作者，我希望看到 session 狀態的來源、時間與可信度，辨別未知或過期資訊 | [#12](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/12)；provider、自述政策、狀態、更新／過期／保留待定；不自動改任務或接受成果 |
| B2 | 交付／部署追溯 | 作為維護者，我希望從不可變產物連到環境部署、失敗、回復與實際 read-back 證據 | [#8](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/8)；首個情境與 provider 待選；建紀錄不會自動部署 |

建議下一個完整產品成果是「Agent 提交明確版本 → 可信人類核准或要求修改 → Agent 依決定接手 → owner 接受成果」。這是排序建議，不是新增實作授權。

依賴不應變成人為的全串行 gate：#6 與 #14 的盤點可獨立展開；#13 可先用明示的測試 principal 驗證業務規則，真實人類整合依 #14，可靠性依 #6 所屬機制。#11 不阻擋人類／Agent 區分，#12 不阻擋審核；沒有 session provider 時保持未知即可。#8 是獨立後續增量，不倒掛為 CLI／MCP 結案條件。

## 後續候選 Roadmap

| 階段／Epic | Feature | User Story／PBI 摘要 | 前提與狀態 |
| --- | --- | --- | --- |
| B3：可攜服務與多種入口 | 自管服務 | 作為團隊，我希望以自己維護的後端與資料庫提供相同工作契約 | 候選；C#／.NET 優先，保留 Sites 至選定遷移切片；PostgreSQL、認證與部署另評估 |
| B3 | 服務契約與相容遷移 | 作為既有 client，我希望後端技術改變後仍可精確讀取版本並對帳操作 | 候選；需行為、序列化、交易、錯誤與 migration 證據，不以編譯成功驗收 |
| B3 | 桌面線上 client | 作為團隊成員，我希望從桌面入口使用同一線上服務 | 候選；UI 與平台順序未選，保留後端權威；不等於離線產品 |
| B4：受限環境本地使用 | 單機離線核心 | 作為敏感環境使用者，我希望本機保存並接續工作，不依賴外網服務 | 方向有價值但開發延後；SQLite、本機身分、生命週期、更新、備份與還原需完整設計 |
| B4 | 企業內網部署 | 作為內網團隊，我希望在無外網時共用中央服務 | 候選；與單機離線分開驗收，不預設分散式同步 |
| B5：記憶來源整合 | 可追溯來源 API／UI | 作為接手者，我希望查看 Framework 召回內容的 Board 原文、版本、效力與證據 | 候選；依 Framework 記憶契約及可選 Board adapter，Board 不主導通用記憶演算法 |
| B5 | 人類檢視與修訂 | 作為 owner，我希望看出候選、已接受、取代與退役內容，按既有語意作處理 | 候選；沿用 Framework lifecycle，與 Board 工作審核語意分清 |
| B6：Agent 執行整合 | 啟動及停止 | 作為使用者，我希望在明確授權範圍啟動工作，並得知停止是否真的完成 | 遠期；先定義 runner、process handle、取消／停止對帳及權限；不能由 workflow.cancel 推論 |
| B6 | 執行隔離與恢復 | 作為維護者，我希望限制工作區、工具、網路、秘密及資源，並處理啟動後崩潰 | 遠期；worktree 不是安全沙箱，任意副作用不承諾 exactly-once |
| B7：可選開發環境 | 編輯器／終端整合 | 作為開發者，我希望在工作上下文中編輯、檢查與執行必要操作 | 可選；完整 IDE 的需求與投入價值尚未決定 |

階段名稱表示產品演進關係，沒有暗示所有 B2 必須完工才能研究 B3，也沒有把 B5 記憶綁到 B6 runner。每次選擇一個能端到端驗收的切片，保留已完成工作的證據邊界即可。

## 驗收證據的使用

既有原始短期驗收檔已在 10/21 授權清理；目前保留的是 [.dev 驗收指南](../../README.md) 與 [Lesson 最小證據摘要](../../lessons/README.md)。摘要可識別原檔與比對結果，不能取代原始回應封存或重播驗收。

#7 中「UI 尚未部署」是 10/17 特定版本的歷史觀察；#16／#17 後續記錄私有 Site v13。本次沒有重新核對每個 UI 功能的線上行為，因此不把舊句複製為現在未部署，也不把 v13 編號當成完整審核已部署的證據。
