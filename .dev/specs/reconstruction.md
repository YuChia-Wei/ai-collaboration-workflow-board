# 重建與交付檢核

類型：規格集重建導引。狀態：2026-10-13 初稿；基線與權威見 [README](README.md)。目的為在替換實作語言或 persistence 時保留產品可觀察契約；不是部署操作授權，也不把現有實作推定為已滿足所有未來需求。

## 必須保留的輸入

重建者至少取得本規格目錄、[協作 JSON schema／examples／vectors](../../src/board/contracts/collaboration-v1/)、[local export schema](../../src/local/assets/export-schema.json)、對應來源基線，以及要保留相容性的 SQL migrations。新語言可換內部 classes、函式或表設計，但不能自行改 wire profile、required/null、文字 bytes、digest、狀態機或 operation 意義。

| 基線輸入 | 用途 | 保存規則 |
| --- | --- | --- |
| `sources/manifest.json` | Commit、原始檔案 bytes 與 Issue 來源身分 | 用 SHA-256 核對來源；Windows checkout 換行造成 bytes 差異時先確認 Git blob／換行，不默默重新 hash 成新基線 |
| 協作 schema 1.0 | 精確 DTO，包含 19 command／8 query 類型及結果 | 按指定 `$defs` 驗證；query DTO 存在不等於 handler 已完成 |
| examples | 各訊息的形狀範例 | 每筆獨立，不把整份當作可依序執行的 fixture |
| vectors | Canonical JSON、raw text hash、request digest 與拒絕輸入 | 固定預期值作 oracle，不由待測算法自行生成預期結果 |
| 舊 profile／local 規格 | 重建既有公開行為 | 各自保留 hash、receipt scope、role、文件與 lifecycle 規則，不套用新協作規則 |
| SQL migrations／source catalog | 現有 Board 儲存相容性與唯讀來源輸入 | 若需保留現有資料，保留歷史 bytes；新 storage migration 另行設計與驗證 |

本輪來源快照包括 Issue #2–#8 的 body、URL、updatedAt、state；未包含留言或 Projects 全部欄位。當規格需要新的工作狀態或決策，回到當時線上權威讀取，而非依快照猜測。

## 重建順序與可驗收產物

| 順序 | 實作範圍 | 最小可驗收結果 | 不能以此宣稱 |
| --- | --- | --- | --- |
| 1 | 值物件、嚴格 wire parser、canonicalization、hash、Fault | 所有固定正／負 vectors 在目標語言得到同一結果；未知版本／key／重複 key 明確拒絕 | HTTP／MCP 可用、身分已可信 |
| 2 | Workflow aggregate 與命令 reducer | 19 commands、DAG／assignment fence／plan／decision／交付不變條件；成功／拒絕後完整狀態斷言 | CAS／持久化原子性已由 provider 保證 |
| 3 | Application 接受協定與可控制 ports | 授權在回條前、相同 digest 回放、不同 payload 衝突、durable reject、unknown 保留、時鐘／ID 由 port 供給 | 合成 repository 等於 production DB |
| 4 | 可信身分與真實 command repository | 雙 writer、零筆 CAS、故障點 rollback、rejected receipt、owner／actor 隔離、重啟後 operation 結果 | 未測其他 provider 相容 |
| 5 | Query／snapshot repository | 完整 header、同 revision 頁面、精確 document/task/decision 版本、missing、limit、snapshot_expired | 任意全站歷史時間旅行、永久 URL 可用 |
| 6 | HTTP／MCP transport | 相同 application behavior；真實 client 的初始化、探索、認證、錯誤及安全重試 | 所有 client／CI 認證都相容 |
| 7 | 人端 UI／跨 session journey | 人可查看指定版本與問題，Agent 可回報及接手；讀取不自動 claim；所有缺漏可見 | 使用者已接受自然語言成果或正式採用 |
| 8 | 選定 portability／backup | 已接受匯出格式、cutoff、所有必要 bytes、身分 rebinding、乾淨 store 還原與無外部副作用 | Local portable 已自動適用新 Board |

這是依目前依賴關係整理的實作順序，不增加固定的產品執行階段。每階段都以 [測試規格](tests/README.md)的 scenario／data-row ID 對照實際 test identifier，保存 Given／When／Then 及結果斷言，不能用測試數量代替覆蓋。

## 跨語言與部署中立條件

- 行為文件以值、狀態、前後條件與錯誤描述；JavaScript object 或 Python dictionary 不是公開 aggregate schema。
- Domain／application 不依賴 HTTP status、URLSearchParams、D1 result、SQLite connection 或 UI。序列化 row decoding、路由、status、clock、catalog 與身分來源留在 adapters／composition root。
- 新協作 digest 依完整 canonical command 及可信 authority 計算；不能採用語言預設 dictionary order、數字輸出、Unicode normalization 或行尾處理。
- 字元限制與 UTF-8 bytes 限制分別驗證；不得讓未經 normalize 的命令與 hash 前補預設的命令取得相同身分。
- 單一 Worker 是目前部署選擇；改成前後分離時另驗 API origin、credential、跨來源及資源供應，不能只通過 domain tests 就宣稱替代 hosting 完成。
- 如需維持人工／legacy 相容，不修改其已保存 operation key、digest、schema migration 或 source snapshot。新 profile 的更強 receipt 協定不回寫舊資料。

## 測試執行接手

本次僅 authoring，以下為來源中的後續執行入口，**未在本輪執行**。使用相應 baseline 的 Node／Python 與安裝條件，將結果保存為可追溯證據：

```powershell
npm --prefix src/board ci
npm --prefix src/board test
npm --prefix src/board run build
npm --prefix src/board run validate
python -B -m src.local.tests.test_layout
python -B -m src.local.tests.test_review_regressions
python -B -m src.local.tests.test_acceptance
```

Node 與 Python 環境版本依目前 README／CI；npm test 同時執行 Python portable vectors。`src/tools/check_repository.py` 在此基線不存在，不能把根 README 的舊指令列為成功 gate；見 GAP-13。命令跑完仍須讀結果與失敗，不能因 process 啟動就填 passed。

每個 scenario 應記錄 source commit、spec ID、實際 test path／identifier、環境、替代或真實依賴、命令、時間及狀態（passed／failed／not-run／blocked／skipped）。Hosted storage、真實 sessions、身份撤銷及恢復測試需要其自身證據；本地 synthetic 測試不能替代。

## 重建完成的判定

宣告範圍須精確到 profile／介面／環境：例如「協作 domain/application 與合成 repository 相容」可以早於「D1／MCP 線上服務相容」。保留[缺口](gaps-and-decisions.md)與測試規格未通過項。新 capabilities 僅列實際可用且已驗證的功能。

整套系統若要用於真實工作，尚須選定並驗證目前未定的身分、snapshot、備份及真實接手路徑。安裝 Framework、完成文件、測試通過、Git 合併、發布及資料權威切換都保留各自狀態；任何一項不自動等於其他項完成。
