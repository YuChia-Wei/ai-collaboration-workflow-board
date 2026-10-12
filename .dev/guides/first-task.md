# 從一個有界任務開始

本指引由 `ai-context-init@0.2.0 initialize` 於 2026-10-13 建立。
背景重用 [README](../../README.md)、[Board 說明](../../src/board/README.md)
與 [本機原型說明](../../src/local/README.md)；協作邊界沿用
[AGENTS.md](../../AGENTS.md)。這兩個實作的模型與儲存不能視為相同服務。

## 開始前

確認指定 Issue 或問題、這次要的產物、允許修改的範圍及實際授權。
GitHub Issues／Projects 是工作項目權威；契約與目前實作分開讀取。
只載入任務所需的文件和 skill references，保留未確認的需求與證據缺口。

已安裝 skills 從 `.agents/skills/<id>/SKILL.md` 進入。
初始化不替後續任務選定實作、spec 路徑、紀錄 store 或發布方式。

## 範例一：理解命令重播（唯讀）

```text
說明 collaboration/1 的命令接受與 lost-response replay 流程。
先讀 ARCHITECTURE.md 與 src/board/contracts/collaboration-v1/README.md，
再用 codebase-memory-mcp 查找相關 application／domain 實作。
說明 operation ID、request digest、receipt 與 revision 的關係，
列出實際來源，區分已實作的 domain/application 與尚未接上的 adapters。
這次只做說明，不修改檔案或執行外部寫入。
```

預期產物是可查證的流程說明與未知事項。來源：協作契約的「接受協定」，
以及 application／domain 檔案；不要以合成例子宣稱 hosted D1 已驗證。

## 範例二：建立同一行為的 spec 草稿

```text
使用 spec-author draft 一份「命令接受後遺失回應，再以相同請求重播」
的 production specification。以 collaboration/1 接受協定為來源，
保留原有識別與版本語意；說明輸入、receipt 重播、拒絕條件及驗證方式。
將語言、repository adapter 與執行環境分開列為技術 binding。
先在對話中交付草稿與來源對照，不修改契約、不實作程式、
不把尚未接上的持久化／HTTP／MCP 能力寫成已完成。
```

預期產物是一份供使用者審核的有界規格。後續需要持久化時，再選定檔案
目的地；此指引不建立完整產品 spec，也不自動執行上述任務。

## 現有驗證入口

下列命令從 repo 根目錄執行；本次初始化只核對定義與檔案，狀態皆為
`discovered`，未重跑應用程式測試或建置。

| 命令 | 用途與前置條件 | 定義來源 |
| --- | --- | --- |
| `npm --prefix src/board ci` | Node.js >=22.13；依 lock 安裝 dependencies，需網路／既有套件來源 | [package lock](../../src/board/package-lock.json)、README |
| `npm --prefix src/board test` | 已裝 dependencies；既有 domain、契約及 adapter 測試 | [package.json](../../src/board/package.json) |
| `npm --prefix src/board run build` | 已裝 dependencies；生成單一 Worker artifact | package.json |
| `npm --prefix src/board run validate` | 已完成 build；核對生成 artifact | package.json |
| `python -B -m src.local.tests.test_layout` | Python 3.13；local 來源／runtime 路徑契約 | [CI](../../.github/workflows/ci.yml) |
| `python -B -m src.local.tests.test_review_regressions` | Python 3.13；local review regression | CI |
| `python -B -m src.local.tests.test_acceptance` | Python 3.13；local 合成資料整合驗證 | CI |

依實際變更選擇必要檢查，不為安裝或文件修改另建檢查器與測試框架。
回報來源、變更、實際執行結果與限制；文件、local fixture 或本機 build
都不能單獨證明服務上線、正式資料遷移或部署成功。
