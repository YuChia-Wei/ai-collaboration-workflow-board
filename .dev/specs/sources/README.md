# 規格來源與基線

本目錄保存可核對的來源身分，不是本地 backlog，也不替代 GitHub Issues／Projects 的當前工作權威。

| 檔案／版本 | 用途 | 讀取方式及限制 |
| --- | --- | --- |
| [manifest.json](manifest.json) | 第一版規格的 107 個來源檔案及 7 個 Issue 快照 | `source_commit=3e7ee13cda8de27c8a069a062ffd0d289584722e`；檔案 hash 是當時 checkout 的原始 bytes，保留歷史，不因本輪更新而覆寫 |
| `issue-2.json` 至 `issue-8.json` | 原讀取的 body、URL、updatedAt、state | 用於理解所選設計、R／B／V／AC 與後續缺口；未包含全部留言／Projects 欄位，本輪未宣稱重新讀取 |
| [normalization-inputs.json](normalization-inputs.json) | 本輪原規格及選定規範的固定輸入 | `input_commit=aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；hash 由該 commit 的 Git blob bytes 計算，與 checkout 換行無關 |

本次確認上述兩個 commit 間 `src/` 沒有差異，因此可沿用產品行為及測試程式的來源綁定。根 README／ARCHITECTURE、AGENTS、FRAMEWORK-INSTALLATION 及第一個任務指引已有初始化變更；新文件中的整理方式以 `aa5ba552…` 為準，不能要求舊 manifest 的所有 root 文件 hash 都等於目前檔案。

`normalization-inputs.json` 的 `original_specs` 綁定整理前 23 個檔案，`selected_guidance` 綁定本次使用的專案規則及 skill 方法。它是一般來源清單，不是 framework configuration、閉合 schema、installed-bytes 驗證結果或規格符合性證明。

原文件的舊路徑與新位置見[搬移對照](../migration-map.md)。原 Git commit 提供不變的舊內容，不在新目錄保留第二份重複的規格全文。整理後的檔案由正常 Git diff 審閱；來源 ID 與可觀察條件是否保留，需以語意審閱核對，不能只用 ID 數量或 hash 推定。

## 本輪輸出綁定

[normalization-subjects.json](normalization-subjects.json) 記錄提交前 Git index 所表示的檔案 bytes SHA-256；不包含它自己與 [審閱紀錄](../normalization-review.md)，避免循環雜湊。以提交中的 Git blob bytes 核對；working-tree 換行轉換不影響此綁定，Git 內容變動則使綁定失效；它不是格式驗證器或產品測試報告。
