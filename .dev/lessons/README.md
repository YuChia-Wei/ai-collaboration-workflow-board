# Workflow Board Lessons

2026-10-21 重新評估並留存。正式資料為本目錄的 `*.lesson.json`，由已安裝的
`lesson-author@0.2.0` 產生並通過其結構與語意驗證。四筆均為 `candidate`、
confidence `supported`；本次留存沒有採納為專案規則，也未建立規則接受紀錄。

## 留存價值

| Lesson | 可避免的具體誤判 |
| --- | --- |
| [平台通行與應用可信身分](lesson-21093fcf39ef4b1cac8418816eac8686.lesson.json) | 把平台通行或手填 header 當成已完成應用授權 |
| [unknown 恢復與跨介面比對](lesson-c902922ebdb547348f247294492f9391.lesson.json) | 把未知當拒絕、換 ID 重複操作，或只憑成功訊息判定接手一致 |
| [應用對話與 MCP 連線層級](lesson-04c7d2afc6cb4840b9042c1e9a89baea.lesson.json) | 把新對話接手誤報為首次安裝、新 transport session 或 OAuth 驗收 |
| [日常憑證交付](lesson-5046ac0ea51a4c70b64696cdde8da62e.lesson.json) | 把單程序驗收成功當成已具備可持續使用與續期撤銷的入口 |

四項各有觀察、來源、結論與適用／不適用邊界，適合後續同類交付查閱。
一般工作順序與 Issue 結案流水帳未另建 Lesson，避免重複既有工作紀錄。

## 證據與限制

原驗收紀錄見 [CLI](../guides/cli-hosted-acceptance-20261020.md) 與
[MCP](../guides/mcp-handoff-acceptance-20261020.md)。
[最小保留摘要](evidence/board-interfaces-20261021.json) 記錄本次刪除前對原始結果
所做的唯讀比對：unknown 回執查詢／重送相等、CLI/MCP context 與回執相等、
文件 UTF-8 SHA-256 相符、舊 token 拒絕，以及獨立對話十次唯讀工具呼叫。
沒有重新執行線上寫入、故障注入或 OAuth。

摘要保存原檔雜湊與歷史路徑供識別，**不是原始回應封存，也不能單靠摘要重播驗收**。
較早的認證與原生 Windows 測試沿用已提交驗收紀錄；不宣稱本次重新執行。

## 本次暫存清理

依 owner 指示限本專案；本次不綁定 Issue，採本機 `--ff-only` 合併與直接推送。
刪除前確認目標路徑、無 reparse point、沒有對應使用中工作程序；兩個暫時 Site
checkout 均乾淨，其 commit 分別已存在平台 saved version 12／13，摘要保留對應。

| 已刪除目標 | 檔案數 | 邏輯大小（bytes） |
| --- | ---: | ---: |
| 專案 `.runtime/`（含暫時 checkout 的 `.git`） | 12,687 | 227,580,545 |
| `C:\wb-fw0201` | 1,135 | 13,445,326 |
| 合計 | 13,822 | 241,025,871 |

刪除後兩個目標均確認不存在。約 229.86 MiB 為檔案邏輯大小，非磁碟實際釋放量。
`C:\tmp` 的既有項目屬其他 Framework 作業；沒有辨識出本專案所有的項目，因此
全部保留。檔案內容提到 Board 不構成 Board 所有權。

此次工作暫存使用 `F:\codex-temp\board-closeout-20261021` 並於完成後清除。
日後可丟棄的工作暫存優先使用當時可用的 RAM disk（目前 `F:`）；不改全域
TEMP/TMP，也不以暫存偏好變更產品持久化語意。正式 Lesson 與必要摘要留在版控。
Windows 正式憑證、線上合成 workflow、Sites 已存版本及其他專案資料均保留。
