# Framework 開發工具採用（#9）

2026-10-12 依專案擁有者指示完成選配安裝。來源為正式發布的
[Framework v0.19.1](https://github.com/YuChia-Wei/ai-collaboration-framework/releases/tag/v0.19.1)，
來源 commit：`42b99e954e3d6fbf595075a079357f0ce1df057f`。
此頁記錄 Board 的開發工具採用；不更動 Board 產品版本、部署或資料模型。

2026-10-13 追加 `ai-context-init@0.2.0` 並執行其指令型 `initialize`，
目前為 15 個 skills、engineering-common 與 Codex adapter。首次 #9
安裝的歷史驗收保留於下方；它與本次追加／初始化的結果分開。

## 精確選擇

| 套件 | 版本 | 用途 |
| --- | --- | --- |
| ai-context-init | 0.2.0 | 建立協作起點與 factual refresh |
| requirement-author | 0.1.0 | 需求與驗收條件 |
| spec-author | 0.1.0 | production／entity／adapter／formal-test 規格 |
| problem-frame-author | 0.1.0 | 問題與系統邊界 |
| ddd-ca-hex-architect | 0.2.0 | 領域、架構與依賴方向 |
| bdd-gwt-test-designer | 0.2.0 | 行為情境與測試設計 |
| diagnostic-analyst | 0.1.0 | 問題診斷 |
| local-change-implementer | 0.2.0 | 局部修改 |
| slice-implementer | 0.2.0 | 行為 slice 實作 |
| code-reviewer | 0.2.0 | 缺陷審查 |
| spec-compliance-validator | 0.1.0 | 規格與實際證據對照 |
| software-development-orchestrator | 0.2.0 | 適用階段選擇與交接 |
| pr-author | 0.1.0 | PR 內容與操作 |
| adr-author | 0.1.0 | 架構決策紀錄 |
| lesson-author | 0.2.0 | 有證據的觀察與經驗 |
| engineering-common | 0.1.0 | 共通工程、領域語言、GWT 交接及操作指引 |
| Codex adapter | 0.1.0 | 14 個原始名稱 runtime entries |

不選 ai-context-auditor、ai-context-governance、local-backlog、dotnet-backend、Claude adapter 或
sub-agent profiles。五個工程 skills 的 .NET optional coverage 因未選套件而
`unavailable`，不會自動補安裝。必要 package dependencies 為空；不需要 .NET SDK。
選定 skill 自帶的 optional .NET profile（例如 spec-compliance-validator 的
`profiles/dotnet.md`）保留原套件 bytes，但未啟用；它不是 dotnet-backend 知識包。
Framework 安裝工具需要 Python ≥3.10 與 PyYAML 6.x；已裝 ADR／Lesson／PR
工具另需要 Python ≥3.11 與 jsonschema ≥4.18,<5。它們不是 Board runtime 相依。
本次使用 Windows、Python 3.13、PyYAML 6.0.3、jsonschema 4.26.0。

## 檔案與保留

- `.ai/custom/installation.json`：project-owned 明確選擇；含 catalog raw hash pins。
- `.ai/framework.lock`：installer 生成的實際選擇、來源與逐檔 inventory。
- `.ai/core/`：122 個 payload files；包含 15 skills 和 engineering-common。
- `.agents/skills/`：15 個 Codex entries。
- `AGENTS.md`：Board 自有協作入口；不是來源庫 AGENTS 的副本。
- `.gitattributes`：managed bytes 使用 `-text`，避免 checkout 換行轉換。
- 原 `check_repository.py` 及其測試已由 owner 在 `3e7ee13` 移除；
  安裝完整性使用原 pinned engine 的 `inspect`。

首次安裝前沒有既有 AGENTS／CLAUDE、Framework lock 或 managed payload。
首次 preview 只有 121 個 `add`，沒有 `change`／`remove`；對 107 個既有 tracked
檔案加 selection 共 108 個 protected inputs 核對 raw hashes，安裝後全數相符。
之後由本次工作明確編輯 README、CI 與 source-policy checker，並新增本頁與
AGENTS；它們不是 installer 覆寫的內容。Board 應用程式與原有契約 bytes 未變。
ZIP、engine、candidate、操作 journal 及原始測試輸出不提交；本機證據在已忽略的
`.runtime/framework-install/`，公開可審核摘要為
[adoption-evidence.json](.ai/custom/adoption-evidence.json)。

## 使用與 spec 起點

從 `.agents/skills/<id>/SKILL.md` 讀取本次安裝入口，再載入所選作業需要的
reference。新 entries 在本次 chat 的初始 skill catalog 中未列出；本次已直接
讀取 installed entry 並呼叫三個 installed tools。重新載入專案／新 chat 後仍需
確認 runtime discovery，不能以檔案存在宣稱自動 discovery 已通過。

`engineering-common` 安裝為可明確選讀的 guidance，`bindings: []`；沒有採納
新的 normative engineering rules，也沒有隱含更換 Board 技術棧。
ADR、Lesson 與 PR 本次只驗證 `explain`，未建立 store、決策或紀錄；後續
要持久化時，明確選擇 project/package roots、設定與授權範圍。

未來為一個 Issue 建立 spec，可要求：

```text
使用 spec-author draft 一份 production specification。
依指定 Issue、已接受契約及實際來源，保留規則 ID、領域詞彙與未知事項。
描述輸入輸出、不變量、成功／失敗行為與驗證方式；實作語言和 adapter
放在技術 binding 區。先在對話中回傳草稿，不自動初始化其他文件。
```

建立行為 spec 可以讓未來以另一種語言重新實作相同契約；仍須補足新的
adapter、平台特性與測試證據。本次沒有回溯完成所有 Board 領域／功能 spec。
`spec-author` 的行為 smoke 為 #9 的 formal-test 草稿，留在 ignored evidence，
不成為額外產品要求，也不以作者草稿宣稱規格符合性。

## 首次 #9 安裝驗收讀回（2026-10-12 歷史）

| #9 條件 | 實際證據與界線 |
| --- | --- |
| AC01 精確版本、清單、相依及差異 | 正式 ZIP／sidecar／manifest SHA-256 相符；engine pin 相符；明確 selection；preview 121 add |
| AC02 只有選定內容 | lock 的 14 skills、engineering-common 及 Codex adapter 相符；未安裝 dotnet-backend 知識包、AI-context routes、Claude entries 或 sub-agent profiles；選定 skill 的 optional profile 未啟用 |
| AC03 保留、衝突及選定復原 | 108 protected inputs 安裝後相符；隔離合成專案自有 AGENTS 保留；已完成 operation 的 `recover finish` 回報 `already-matching`，再次 inspect 相符 |
| AC04 分開報告檔案、discovery、行為 | 121 managed files inspect 相符；自動 runtime discovery 未驗證；三個 installed tool 的 explain succeeded／mutation none；spec-author 指令操作產出 bounded draft |
| AC05 不阻擋 Board 或加入 runtime 相依 | 既有 Python 3+15+10 測試通過；Board npm test、build、validate 通過；只在 source-policy job 增加 7 個 inventory regression tests |

CI regression scenarios 包含 modified member、未列入 managed/code path、
非 src provenance、越界 destination、selection drift，以及 runtime template／
core binding；完整 package member bytes 也由本機 engine inspect 實際讀回。
Hosted CI 另以 PR 的真實結果為準，不能從本機成功推定。

## 追加安裝與初始化（2026-10-13）

本次使用同一份已校驗的 v0.19.1 catalog／engine，selection 僅追加
`ai-context-init`。Preview／apply 為 16 add、121 unchanged、0 change、
0 remove；原 121 個 managed files 與 111 個 protected inputs hash
全數相符。Post-apply inspect 為 `managed-bytes-consistent`。
Raw requests/responses 留在 ignored `.runtime/framework-init-20261013/`。

安裝後由 Agent 明確讀取 `.agents/skills/ai-context-init/SKILL.md` 及
installed initialize／structure 方法，再以一般檔案工具執行 `initialize`。
這個 skill 沒有初始化程式；實際操作是依方法整理 project-owned 文件：

| 初始化責任 | 實際處理 |
| --- | --- |
| 產品背景、使用者、邊界 | 重用 README、Board／local 說明、ARCHITECTURE 與協作契約，不複製另一份背景文件 |
| 最小協作基線與導航 | 保留既有 AGENTS，追加 repository-specific reading map、必要上下文、證據及適量驗證指引 |
| 第一個有界任務 | 新增 `.dev/guides/first-task.md`，提供既有接受協定的唯讀理解與 production spec 草稿範例 |
| 目前檔案與命令 | 更新 15-skill inventory，修正 README／ARCHITECTURE 對已刪除 checker 的引用；既有 application commands 記為 discovered |

維持英文 AGENTS 與繁體中文 human guides 的既有語言分工。
只補缺少的起點，不建立空白規格／ADR／Lesson／workflow 目錄，不建立
framework operation config 或紀錄 store，也不執行 first-task examples。
未追加其他 AI-context skill、技術棧、規範 bindings 或 Claude adapter。

驗證範圍為 installed bytes inspect、初始化文件與 local links 的讀回，
以及 diff／JSON 檢查。本次未執行 application tests、build、部署、
fresh-chat behavior check 或 hosted CI；不以文件存在宣稱這些狀態通過。

## 後續維護與復原

依所選發布版本的[安裝手冊](https://github.com/YuChia-Wei/ai-collaboration-framework/blob/v0.19.1/docs/installation.md)
保留原 ZIP、manifest、pin、requests/responses、operation journal。版本升級或
取消選配皆使用新 selection → derive → inspect 現有 lock → plan → 授權 apply
→ inspect，不手改 managed files 或 lock；既有 lock hash 要從 raw bytes 取得。
工作目錄須互不重疊，並符合 engine 的 240 UTF-16 path budget。

本次復原驗證只涵蓋 Windows 合成 fixture 上「已完成操作的 finish 重播」，
沒有驗證 interrupted restore、斷電 durability、Linux／macOS 或跨電腦復原。
若實際操作失敗，停止相應 writer，保留 marker、原 engine/pin 及 journal，
依[復原手冊](https://github.com/YuChia-Wei/ai-collaboration-framework/blob/v0.19.1/docs/recovery.md)
綁定 operation.json、當前 lock/marker raw hashes，再選定 finish／restore。
不要刪除 marker 或使用另一份 engine 猜測復原。
已提交的採用變更可在 owner 明確選定後透過 Git revert 還原；後續如果已有
規格、紀錄或 managed drift，須先盤點，不自動清除新內容。
