# Framework：同專案可追溯的 AI 工作記憶與按需召回

日期：2026-10-22。狀態：提案與設計交接；尚未選型或實作。此文件是 Board 對話形成的初期設計快照，後續 Framework 工作狀態以其 GitHub 提案及正式工作為準。

已建立 [Framework Proposal #486：建立同專案可追溯的 AI 工作記憶與按需召回契約](https://github.com/YuChia-Wei/ai-collaboration-framework/issues/486)。Issue 內含可獨立接手的完整內容與公開研究來源，不以取得本地設計文件為接手的必要前置。

## 問題與期望成果

同一專案的 AI 在跨任務或跨 session 工作時，需要重新掌握過去的決策、失敗經驗、尚未完成的工作與授權邊界。這些資訊已分散於 ADR、Lesson、Workflow／checkpoint、需求與專案規則中；紀錄存在或能查詢，不代表下一個 Agent 能在適當時機取得仍然有效的相關內容。

全部歷史一起載入會增加成本並混入失效或不適用內容；只依聊天摘要又可能失去來源、理由與版本。期望沿用既有紀錄，建立可攜、可追溯、可在本機使用的專案記憶方法與契約。

作為專案維護者與接手工作的 AI，我希望開始、接續或調整工作時，取得與當前任務相關、具有來源及適用範圍的決策與經驗，並能把新觀察整理為適當候選紀錄，以減少重複探索、延續有效決策，同時保留衝突、未知與實際授權。

「保存來源 → 選為召回候選 → 交給實際 client → Agent 引用／使用／拒絕 → 新經驗形成候選 → 接受或採納規則」是不同成果與證據，不能以前一步冒充後一步。這是改善上下文與工作方法，不是訓練模型權重或保證模型遵循。

## 已接受方向及授權

使用者已接受 Framework 主責通用方法與契約、Board 提供工作來源與人類介面、實際 Agent runtime／client 負責上下文載入的分工，並在 2026-10-22 授權將設計留存 Board `.dev` 與建立 Framework 提案。

本次交付為設計與提案。下列研究交付與候選工作不表示已授權產品實作、安裝、store 初始化、資料搬遷、push、PR、merge 或部署。提案尚有選型與接入未決，先作 Proposal；接受後的正式工作沿 Framework 現行政策另建，不提前宣告為核准實作的 Epic。

## 記憶分層

這裡借用短／中／長期的概念描述用途與生命周期，並不宣稱模擬人腦機制，也不預設三個資料庫或固定天數。

| 層次 | 使用目的 | 來源與效力 |
| --- | --- | --- |
| 短期工作上下文 | 當前目標、約束、最近結果、未決問題與下一步 | 當前工作與 session；需要跨 session 保留的部分形成有來源 checkpoint |
| 中期接手記憶 | 延續未完成工作、階段判斷、依賴、失敗與驗證限制 | Workflow、task、checkpoint、handoff 與證據；依工作生命週期判斷 |
| 長期專案記憶 | 後續任務重用仍適用的決策理由、經驗與規則 | ADR、Lesson、已採納規則及其來源；依 applicability、取代與退役判斷 |

這個時間／用途軸與 semantic（事實）、episodic（事件經驗）、procedural（做法）內容軸不同。同一 ADR 可同時是當前短期工作依據與長期決策紀錄。整理記憶不應複製出第二份決策權威。

Workflow 保存工作過程與接手狀態；ADR 保存選擇、理由、替代方案與決策狀態；Lesson 保存證據限定的觀察、信心與適用／不適用範圍。Lesson 候選、owner 接受、規則採納各有不同意義；已被正確接受的 ADR 不因被召回而需要重新接受。召回舊授權也不產生新的執行權限。

## 責任分工及既有相鄰工作

| 主責 | 內容 |
| --- | --- |
| Framework | 選取、形成、引用及失效的方法；provider-neutral 消費契約；沿用 ADR／Lesson／Workflow lifecycle，必要時提供 adapter |
| 專案 owner | 內容、有效決策、適用範圍、採納、來源存取與保留政策 |
| Agent client／runtime adapter | 在實際掌握的事件呼叫契約、交付上下文並回報可觀察的結果 |
| Board | 工作 API、身分、revision、來源查看及人類介面；可選提供來源，不接管通用記憶語意 |
| 各自 GitHub Issues／Projects | 開發工作權威；本提案不改寫 Framework source repo 的治理 |

2026-10-22 讀回的 Framework 相鄰工作：

| 工作 | 狀態與關係 |
| --- | --- |
| [#441](https://github.com/YuChia-Wei/ai-collaboration-framework/issues/441) | Closed／completed；既有 SQLite 本機紀錄能力，沿用原驗收邊界 |
| [#448](https://github.com/YuChia-Wei/ai-collaboration-framework/issues/448) | Closed／completed；可選 workflow-records 套件；安裝不代表自動記憶召回 |
| [#481](https://github.com/YuChia-Wei/ai-collaboration-framework/issues/481)／[#483](https://github.com/YuChia-Wei/ai-collaboration-framework/issues/483) | Open、設計階段；擁有本機 work item／task／workflow 及 Files／SQLite 整合設計。本提案重用其結果，不重做 provider／資料整合，不擅自退役 local-backlog |
| [#445](https://github.com/YuChia-Wei/ai-collaboration-framework/issues/445) | Open、延後；可選線上 Board adapter，未指定後續版本；不是記憶首版的必要前置 |
| [#416](https://github.com/YuChia-Wei/ai-collaboration-framework/issues/416) | 現行入口，引用上述工作；本提案不改其既有狀態或排程 |

Board 目前沒有選配 workflow-records 或 ai-context-governance；其開發用 ADR／Lesson skills 也不等於 Board runtime 已提供完整知識服務。Framework source 的既有查詢能力與規劃可重用，但不據此宣稱自動注入上下文已完成。

## Framework 候選 Roadmap

以下是提案內的 Epic／Feature／Story 分組，尚未建立原生 Feature 或實作 Issue。

| Epic／階段 | Feature | User Story／PBI 摘要 |
| --- | --- | --- |
| F0：專案記憶契約 | 來源與效力 | 作為接手 Agent，我希望辨別紀錄原文、摘要、索引、決策狀態與適用限制，避免把候選當成規則 |
| F1：相關記憶召回 | 有界檢索 | 作為新 Agent，我希望從明確專案與任務取得相關來源、版本、理由、衝突及未知，並按需讀原文 |
| F1 | Client 載入證據 | 作為維護者，我希望知道哪些結果已交給實際 client，以及哪些使用行為可觀察，而不以工具存在當成自動載入 |
| F2：經驗形成與 lifecycle | 候選形成與查重 | 作為 Agent，我希望判斷新觀察應保留為 Workflow 證據、Lesson 候選或交由 ADR 記錄決策，避免反覆複製 |
| F2 | 取代、失效與保留 | 作為 owner，我希望更正或退役內容後，召回能反映目前效力，並按選定政策處理摘要及索引 |
| F3：本機及可選整合 | 本機接手 | 作為無網路的使用者，我希望使用已選本機來源，明確知道缺少哪些遠端資料 |
| F3 | Board 來源 adapter | 作為 Board 使用者，我希望沿同一契約查看並取用版本化工作來源；離開 Board 的專案仍可獨立使用 |

## 最小契約與品質要求

召回輸入應能表達 project identity、目前 task／workflow、使用目的、可讀來源、時間／版本條件及輸出預算。輸出至少能表示來源 ID／版本或 hash、關聯理由、內容摘要、效力／適用範圍、觀察時間與有效時間、取代關係、衝突、索引新鮮度及缺漏。精確 schema 待設計，不直接增加所有欄位到現有 stores。

需要明確隔離同專案與跨專案資料；clone／worktree 的專案識別沿既有契約，不能只用目錄名稱。只納入獲授權來源；Board 內的文件不代表外部程式碼、Issue、私人聊天或附件都可自動取得。檢索階段須保留 ACL／capability 邊界，不能先搜尋跨權限摘要再遮掉引用。

先比較既有文字／結構化查詢，再判斷是否需要全文、向量或圖索引。索引與摘要應可由允許保留的來源重建，來源本身的保留及刪除是另一個契約。更正或刪除要考慮摘要、embedding、索引、快取與備份的生命週期，不直接把當前永久回執改成 TTL。

codebase knowledge graph 能支持程式結構探索，不等於已保存專案工作經驗或決策效力。語意相近也不等於仍然正確；需同時判斷版本、時效、權威、反例與適用條件。

## 行為範例

以下 Given／When／Then 是設計輸入，尚未執行為測試。

| 情境 | Given | When | Then |
| --- | --- | --- | --- |
| 接續工作 | 同專案有未完成 Workflow，含 checkpoint、來源版本、結果與下一步 | 新 Agent 接續工作 | 取得有界上下文，分清完成／未完成／阻擋／授權；來源改變時指出需調和處 |
| 決策已取代 | 舊 ADR 被新 ADR 取代 | 召回相關決策 | 新 ADR 為目前來源，必要時保留舊理由與取代關係，不沿用失效指令 |
| 形成經驗 | 工作失敗有可追溯條件、觀察與證據 | 判斷其可供重用 | 提出含信心、適用／不適用範圍及相近紀錄比較的 Lesson 候選，不宣稱已接受 |
| 遠端不可用 | 專案已選本機來源且資料可讀 | 無網路時接手 | 讀取已支援的本機內容，標示遠端不可用，不默換 provider 或把快取當遠端接受結果 |
| 結果不足 | 來源缺漏、索引過期或預算造成截斷 | 取得召回結果 | 顯示限制並可按需讀原文；空結果不等於沒有相關決策 |
| 存取隔離 | 使用者無權讀另一 namespace 的紀錄 | 搜尋語意相近內容 | 不洩漏其摘要、引用或存在性，不因記憶系統而繞過權限 |

## 研究與設計交付驗收

- [ ] AC01：完成現況／接受方向／候選／未決對照，分清來源、摘要／索引、client 載入與實際使用證據。
- [ ] AC02：定義最小召回輸入／輸出、來源版本、效力、衝突／失效與輸出預算，不預先鎖定 embedding 或資料庫。
- [ ] AC03：完成短／中／長期與 ADR／Lesson／Workflow 映射，保留查重、形成、接受、取代、退役及規則採納的語意；不複製權威。
- [ ] AC04：走查上述情境，列出預期輸出、失敗／不可用與未知。設計走查、合成範例及真實 client 驗證分別標示。
- [ ] AC05：對照 #481／#483 及 #441／#448，列出重用接點、契約缺口與不需修改之處，不重做相鄰 provider 工作。
- [ ] AC06：比較既有查詢、可重建索引與必要候選工具的維護成本、離線能力、授權及來源追溯，提出最小交付切片與驗證計畫。
- [ ] AC07：列出決策 owner、未決事項及實際阻擋範圍，讓接手者不依賴原對話。提案獲採納且正式工作範圍明確後，依 Framework 政策另建對應 Story／Enabler；設計工作完成不等於產品實作授權或驗收。

後續評估品質應包含：相關來源是否正確、決策更新是否生效、時間與多 session 證據能否調和、資料不足時是否保持未知、權限是否隔離。若要主張成本或 token 改善，需對照基線、任務成功、來源品質、實際載入與 provider 使用量；目前沒有這些量測結論。

## 未決與範圍外

未決包括：方法放在現有能力或新增 capability、最小記憶單位及輸出預算、第一個 client／事件、可觀察證據、摘要與索引存放／版本、保留與自動形成政策，以及 #481／#483 的銜接。自動保存哪些候選依既有專案政策與實際授權處理，不預設每筆都重新問人，也不預設全部自動寫入。

首版不做跨專案個人記憶、私人聊天自動匯入、模型訓練、通用 Agent runtime 或完整知識圖譜平台；不自動刪改歷史紀錄或採納規則。不因「本機」推定完全不需 Git、跨 clone／跨機同步已支援，亦不以 Board 為必要前置。

Mem0、LangGraph／LangMem、Microsoft Agent Framework、Letta 只是公開候選，精確定位與授權見 [研究紀錄](research-and-discussion.md)。保留最小自有契約＋現有查詢的比較基準；不為採用工具而先建立另一套平台。

## 接手方式

先讀此提案與上述 live Issues，確認最新有效決策及現行契約，再選一個可驗收切片。研究只收斂影響下一個交付的未決，不重新取得已有的提案建立授權，也不把提案、候選工具或 Issue 狀態當成實作授權。文件沒有秘密或私人憑證。
