# 規格正規化審閱紀錄

日期：2026-10-13。操作：`spec-author normalize` 與 `spec-compliance-validator review-semantics`。這份紀錄檢查本次文件重組是否保留來源語意，不認證產品實作或 runtime compliance。

## 範圍與固定輸入

使用者指定：依 `ai-context-init` 初始化後的規格規範重新整理剛完成的 specs，可交辦 GPT-6.1-sol 處理細節，由主代理統籌審核。目的地沿用 `.dev/specs/`。

- 原文件與初始化指引：commit `aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`。
- 原產品行為來源：commit `3e7ee13cda8de27c8a069a062ffd0d289584722e`；兩個 commit 的 `src/` diff 為空。
- 輸入的 23 個原規格／來源檔及 16 個選定規範的 Git blob SHA-256：[normalization-inputs.json](sources/normalization-inputs.json)。已逐一以該 commit 的 Git blob bytes 核對。
- 精確輸出集合（Git blob bytes，排除 working-tree 換行轉換）：[normalization-subjects.json](sources/normalization-subjects.json)，共 73 個檔案，集合摘要 `66cc0acd56da74c34b3310f74b5d80f302976ef110bbef735da8ff601f4a5794`。報告及 manifest 自身排除以避免循環雜湊。
- 格式所有權：本專案選定的一般 Markdown，採已安裝 spec-author 的 production／entity／adapter／formal-test 範本及組織指引。沒有選用 CBF、strict machine schema 或其 reader；臨時文件檢查不冒充 framework 格式驗證器。
- GitHub Issues／Projects 保留工作權威。原 Issue 快照未重抓，本報告不更新其線上狀態或授予需求核准。

## 四個階段分開判定

| 階段 | 實際結果 | 證據與限制 |
| --- | --- | --- |
| Authoring | 草案 v2 已整理 | 44 份 `.spec.md`、11 份 `.test-spec.md`；新協作 19 命令／8 查詢獨立所有權，舊 profile 保留有界命令子契約。未取得新的產品核准。 |
| Structure | 一般 Markdown 人工／靜態核對完成；strict owner result 不適用 | 對照四類範本核對類型、脈絡、來源、契約、驗證及未決事項；相對連結、錨點、JSON 與來源 hash 核對。不是 machine schema compatibility 結論。 |
| Semantics | 下列 NF-01–08 範圍內 satisfied | 三名 GPT-6.1-sol 分工撰寫後交換範圍唯讀審查，主代理處理發現並核對輸出；屬本輪代理交叉審閱，不等於外部驗收。 |
| Runtime | `not_run`／unavailable | 本輪沒有執行產品測試、build、hosted CI、服務、部署或跨語言重建；原測試來源不轉成當次通過證據。 |

## 完整整理條件與證據

以下 8 個條件是本次整理審閱範圍，不是新增產品需求。保留性分母為整理前五份行為／邊界文件、三份正式測試文件、來源清冊及其原始欄位；[搬移對照](migration-map.md)列出全部原 section／規則及正式情境目的地。逐項比較輸入、動作、輸出、不變量、拒絕／邊界、來源與缺口；不以 ID 數量代替內容審查。

| ID／條件 | 來源與適用性 | 證據、位置及審查結果 | 限制 |
| --- | --- | --- | --- |
| NF-01：依領域、聚合及種類整理，所有權可定位 | 使用者要求、AGENTS portable specifications、spec-author organization | satisfied；[索引](README.md)、[領域地圖](domain-map.md)、[搬移對照](migration-map.md)區分 collaboration／board-human／legacy／source-catalog／board-web／local-records。 | 目錄是這次選定約定，不宣稱 framework 強制此樹。 |
| NF-02：每份規格採選定種類的必要語意欄位 | 四種 authoring 範本；55 份實際規格全部適用 | satisfied；44 份 production/entity/adapter 及 11 份 formal-test 均保留類型、狀態、所有權／範圍、來源、契約、驗證與未知；production 輸入／輸出／失敗，entity 識別／不變量／生命週期，adapter 映射／邊界，test GWT／oracle／層級分別呈現。 | 標題可不同；無強制 JSON 或新 runner。 |
| NF-03：行為契約與技術 binding 分開 | AGENTS portable specifications 及 spec-author presentation | satisfied；每範圍獨立 technical binding／測試來源；語言、SQLite/D1、HTTP、runner 不替代產品可觀察語意，公開 wire 欄位及限制保留。 | 重建仍須採用現有版本化 schema/vectors；Markdown 不是完整機器契約替代品。 |
| NF-04：不丟失既有行為及測試斷言 | 原五份行為／邊界文件、三份 formal-test 及 inventory | satisfied；交叉審閱核對 19 UC、8 CQ、9 CD 與 OP 共通協定，31 個 EB/BA/LP 規則；108 個 table 情境逐欄及 FT-Q09/Q10/Q11 三個 prose 情境逐句比較，共 111 唯一定義；87 具名來源列逐行一致；21 個 V 追溯列保留。 | 尚未實作／部分來源／缺口維持原狀；交叉審閱是語意判讀。 |
| NF-05：保留來源權威、版本與證據界線 | AGENTS、原 manifest／Issue 快照、validator source binding | satisfied；[來源說明](sources/README.md)分開歷史來源、初始化輸入與本次輸出；Git blob hash 全數核對，原 8 份來源 JSON 未改。 | Issue 快照為歷史，未宣稱當前線上事實。 |
| NF-06：保留未決事項，明列有證據的文字修正 | 原 gaps、初始化後 README／ARCHITECTURE、schema／reducer | satisfied；[未決事項](gaps-and-decisions.md)保留 GAP-01–17；GAP-13 區分歷史過時命令已移除與 checker 仍不存在；GAP-17 錯誤 oracle 差異仍未解決。 | normalize 不決定未核准產品政策或新增 CI gate。 |
| NF-07：導覽有效且無第二套正式情境 | spec-author ownership、原 ID 與新導航 | satisfied；111 個正式情境 heading 唯一；搬移對照與 coverage 連至新位置，舊八份被取代文件移除；相對連結及錨點無缺漏。 | 程式檢查只查文件引用；外部網址可用性未測。 |
| NF-08：變更限規格文件 | 使用者整理授權及 AGENTS 管理邊界 | satisfied；工作樹變更全在 `.dev/specs/`；產品、現有測試、managed framework／configuration 未變，無 commit/push/部署。 | 本報告沒有賦予後續發布或產品修改權限。 |

## 審閱發現及修正

- 拆檔後「上述／見下段／相同」失去目標：Local 文件生命週期、evidence 的 LP-04、人工初始 aggregate、legacy final／archive 改為具體敘述或有效連結；legacy test 的舊路徑已修正。
- FT-A01–06 的通用 When 改成實際 imports／AST／reducer/replay／outbox／HTTP／artifact 檢查動作；FT-A05 保留原 ID，outbox 與 HTTP 是獨立資料例。Then 與來源限制保留。
- 移除「crash orphan 保留到證據驗收」的新增期限暗示，回到不自動 purge、清理依既有授權。
- 原 UC07 `task_refs` 誤植修為 schema／reducer 實際 `task_ids`；create 的 `latest_handoff` 修為實際 `latest_handoff_id`。這是依固定來源更正文案，沒有修改產品 wire contract。
- 初始化已移除不存在 checker 的 README／ARCHITECTURE 引用；GAP-13 保留歷史與現況，不要求本輪還原 checker。

## 本輪檢查與結論界線

在 Windows／PowerShell 的本 repository，以臨時 `python -` 讀取 Markdown／JSON、`git show <input_commit>:<path>` 核對 SHA-256、比較 87 個原 inventory rows，並以 `git diff <behavior_commit> <input_commit> -- src` 核對無產品變動。全部選定輸入 hash 一致、111 情境無重複、相對檔案／錨點有效、JSON 可讀。另核對 git diff whitespace 及最終 scope；提交前將輸出雜湊綁定到 Git index 的原始 blob bytes，讓 Windows 換行轉換不改變提交內容的識別。沒有新增永久 checker。

整理語意結論僅適用 manifest 所綁定版本及 NF-01–08。Runtime acceptance 保持 unavailable；後續實作者依 [重建導引](reconstruction.md)與各 scope test bindings 執行真正驗證，未決產品意圖仍由對應 Issue owner 收斂。檔案變動後需重新綁定並評估受影響審閱，不能沿用本次雜湊作為新內容的證明。
