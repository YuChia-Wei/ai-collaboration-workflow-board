# 在本專案試用 collaboration MVP

本輪依使用者「在自己專案測試試用；不要把線上來源當作唯一證據」的指示進行。本機試行不變更 GitHub Issues／Projects 的工作權威，不安裝新 Framework package，也不部署或遷移正式資料。

## Skill 提供什麼

已安裝 `software-development-orchestrator@0.2.0` 的 [方法](../../.ai/core/skills/software-development-orchestrator/references/orchestrate.md) 明列 goal、inputs、output、owner、dependencies、check、pending decision 及 resume／handoff。這些資訊足以作為本次 workflow 的來源；具體任務與接受條件仍由本專案決定。

它是 instruction skill，`configuration: null`，沒有自動 workflow writer。`slice-implementer@0.2.0` 也沒有管理自己的 store。本試行由專案的 [trial 入口](../../src/board/scripts/collaboration-trial.mjs) 明確呼叫既有 collaboration DTO 寫入 Board，不改 managed skill、不假裝全部 skills 已自動串接。

| Skill 概念 | 本次 Board 表達 |
| --- | --- |
| goal、authorization | Workflow goal／scope 與 plan 原文 |
| inputs、accepted artifacts | 固定版次 plan／document refs、本機 source manifest |
| output、check | TaskDefinition completion criteria、Result 及驗證輸出 |
| owner／specialist | plan 內的 skill ID／版本；actor 則由可信本機測試 adapter 決定 |
| dependencies | TaskDefinition dependencies |
| pending decision | 未完成事項／Decision；不把 Agent 當人類決定者 |
| resume／handoff | context、指定版本點讀、handoff、assignment generation |

## 試行內容

1. `MAP`：核對所選已安裝 skills，保存原文、hash 與 skill → workflow 對照。
2. `VALIDATE`：在固定來源下執行現有 `test`、`build`、`validate`，保存完整 stdout／stderr／exit code，確認重新建置的 Worker 與試用產物相同。接著認領 `RESUME` 並保存 handoff、釋出承接。
3. `RESUME`：新 OS process 讀回 context、plan、validation document 與 task definition，重新認領；確認 generation 遞增、舊 assignment 即使用最新 workflow revision 仍拒絕，且 rejected receipt 可回查。

這是真實 loopback HTTP → MCP handler → application → SQLite SQL 的開發試行，使用當次建置後固定保存的 Worker。SQLite 模擬 D1 adapter；測試專用本機身分固定為同一個 Agent binding。新 Node 程序不等於獨立 AI Agent session，也不證明 Sites 認證、真實 plugin 連線或多 Agent 隔離。

## 執行

前置條件沿用專案：Node.js >=22.13、Python 3.13、已安裝 `src/board` dependencies。從 repository root 執行四個獨立命令，將 run ID 換成新的 ASCII 識別：

```powershell
npm --prefix src/board run trial:collaboration -- start board-mvp-trial-01
npm --prefix src/board run trial:collaboration -- validate board-mvp-trial-01
npm --prefix src/board run trial:collaboration -- resume board-mvp-trial-01
npm --prefix src/board run trial:collaboration -- status board-mvp-trial-01
```

`start` 會先執行既有 build，再建立新的試行目錄、資料庫與 workflow；既有目錄一律拒絕覆蓋。`validate` 執行前後都比對來源，發生漂移、測試失敗或中斷時保留紀錄，修正後使用新的 run ID，避免把不同來源的證據混成一次通過。`resume` 必須由新程序執行；它使用已保存的 Worker／DB，不因工作目錄更新而默默換版。`status` 只讀取並追加觀察紀錄，適合再次啟動後查看。

命令僅在 `127.0.0.1` 的臨時 port 啟動 MCP，使用只存在記憶體的每程序 secret。結束時關閉 listener，不寫入 Codex MCP 設定，也不留下常駐服務。試用資料存放在已忽略的 `.runtime/collaboration-trials/<run-id>/`；沒有自動清理、上傳、Git commit 或線上權威切換。

## 可離線回查的證據

| 檔案／資料夾 | 用途 |
| --- | --- |
| `source-manifest.json`、`source/` | Git HEAD／未提交狀態、當時實際來源與所選 skills 原文、各檔案 SHA-256；不以 HEAD 代表未提交內容 |
| `worker.mjs` | 當次實際測試的 Worker bytes，manifest 有 hash |
| `board.sqlite` | 持久化 workflow／快照／回條；只保存這次專案試行資料 |
| `operations/` | 每個命令先保存完整 request，再保存 receipt；不把 unknown 換成新 payload |
| `mcp-transcript.jsonl`、`sessions.jsonl` | 實際 MCP request／response 與程序識別，不包含本機認證 secret |
| `skill-workflow-map.json` | 安裝 skill 的資訊對照，與自動 integration 的限制 |
| `prepare-build.json`、`validation-*.json` | 實際執行時間、命令、exit code、stdout／stderr |
| `snapshots/`、`resume-anchor.json`、`resume-evidence.json` | 固定 revision、交接、舊／新 assignment 與續接觀察 |
| `trial-report.json` | 只有三個試行任務完成後產生；列明已證明與尚未證明的範圍 |
| `failures.jsonl` | 若失敗則追加記錄；不刪除失敗 run 或把它改寫成通過 |

保存試行證據時要保留整個目錄。程序正常關閉 SQLite 後可複製目錄；若程序仍在執行，不要只複製主 DB 而漏掉 WAL。此流程尚未構成備份／還原演練。

本機檔案、skill 契約、執行輸出及實際操作互相對照。將來加入線上試用時，另外記錄部署版本／audience／client／hosted D1 觀察，不能覆蓋這些本機證據或只憑線上紀錄宣稱正式採用。
