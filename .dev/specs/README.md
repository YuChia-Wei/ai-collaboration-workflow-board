# Workflow Board 重建規格索引

本規格集依使用者要求保存於 `.dev/specs/`，供後續開發者在不依賴私人對話的情況下重建領域行為。文件版本為 **2026-10-13 初稿**；原始碼基線為 `3e7ee13cda8de27c8a069a062ffd0d289584722e`。這次交付是領域／使用案例／介面與正式測試規格的補全，不是新功能實作、測試執行或部署。

## 閱讀順序與產物

| 文件 | 規格種類與用途 |
| --- | --- |
| [領域地圖與共同語言](domain-map.md) | 系統邊界、aggregate 所有權、不同紀錄類型的權威與語意隔離 |
| [協作領域模型](collaboration-domain.md) | Entity／value object；識別、狀態、版本、依賴與不變條件 |
| [協作使用案例](collaboration-use-cases.md) | Production；命令、讀取、拒絕與可靠接受協定 |
| [邊界與 adapters](boundaries-and-adapters.md) | Adapter；輸入／輸出協定、身分與儲存映射、平台實作限制 |
| [既有 Board profiles](existing-board-profiles.md) | 人工 profile、legacy、唯讀 source 的既有行為及前端呈現 |
| [本機原型](local-prototype.md) | Python local 的獨立模型、存取、文件與可攜匯出／還原 |
| [正式測試規格](tests/README.md) | GWT、可觀察斷言、測試層級、既有 test bindings 與缺口 |
| [需求與驗證追溯](coverage.md) | Issue #2–#8 的 AC、領域文件、B／V 情境及已知未覆蓋邊界 |
| [重建與交付檢核](reconstruction.md) | 分階段重建、跨語言契約、接受證據與不可混用的完成狀態 |
| [未決事項與來源差異](gaps-and-decisions.md) | 尚未實作、尚未決定、待審核需求及來源差異 |
| [來源清單](sources/manifest.json) | 107 個來源檔案的原始 bytes SHA-256、commit，以及 Issue #2–#8 快照身分 |

詳細 wire 欄位、列舉、required／null、額外欄位與合成訊息範例，直接採用版本化的 [collaboration/1 schema](../../src/board/contracts/collaboration-v1/schema.json)、[examples](../../src/board/contracts/collaboration-v1/examples.json)、[vectors](../../src/board/contracts/collaboration-v1/vectors.json) 與[契約說明](../../src/board/contracts/collaboration-v1/README.md)。這些機器可讀契約是規格集的必要組成，不能只帶走本目錄的 Markdown 而丟棄它們。Local 匯出格式另外採用 [export-schema](../../src/local/assets/export-schema.json)。

## 來源權威與閱讀標記

| 狀態 | 意義 | 不能推定的事 |
| --- | --- | --- |
| 已接受設計 | Issue #2／#3 的產品方向及已完成設計；#4 固定的協作契約 | 不等於所有 adapter、UI 與 hosted 驗收已完成 |
| 來源觀察 | 基線程式／既有測試／README 呈現的行為；用於忠實重建現況 | 不把偶然實作提升為新增產品政策；矛盾留在缺口清單 |
| 待實作契約 | 已固定語意，但沒有對應執行路徑，例如協作 query snapshots | 不得廣告為服務 capabilities |
| 待審核需求 | Issue #5–#8 中仍標示待審核的詳細 AC、平台及後續模型 | 不藉補文件決定 credential、備份政策、部署模型或新 aggregate |
| 本次局部 ID | 文件新編的規則／情境識別，便於追溯 | 不替換 Issue 的 R01–R06、B01–B14、V01–V21 |

GitHub Issues／Projects 仍為工作管理權威。[Issue 快照](sources/) 是本次讀取的來源副本，不建立本地 backlog，也不能用來更新或覆蓋較新的線上決策。來源清單的 hash 證明這次引用哪份 bytes，不證明每個來源檔案逐行已審查，更不是測試成功證據。日後來源改動時，先判斷影響哪個契約／情境，再更新相應規格與來源基線。

原始碼發現已先嘗試重新建立 code graph；索引程序失敗，現有 graph 未提供新協作定義，因此依專案允許的 fallback 核對 tracked source、契約與實際呼叫入口。不能把 graph 查無結果當成功能不存在的證明。

## 完整性的範圍

本輪覆蓋現有 Board 新協作核心、人工／legacy／source、local 原型及其測試責任；保持它們各自的狀態與資料契約。外部 PM 系統、Agent 執行引擎、Framework remote provider、自動部署服務都不是本次重建的內部領域。Issue #8 的交付／部署領域尚未形成接受的精確模型，保留其需求與待決策事項，不捏造 Delivery aggregate 或 API。

可依文件與機器契約重建已定義的行為；對尚未決定的身分、snapshot 儲存、備份及後續介面，必須完成[缺口](gaps-and-decisions.md)所列決策及證據，才能宣稱整體可上線。這次沒有以重新執行產品測試或重建第二套實作來證明重建充分性。

## 本輪文件檢查

15 份 Markdown 覆蓋領域、使用案例、介面、重建及測試設計；正式測試文件共有 111 個不同情境 ID，保留原 B01–B14、R01–R06、V01–V21。三位指定 GPT-6.1-sol 子代理分工撰寫，領域作者與介面／local 作者另以唯讀方式交叉檢視測試規格，統籌者核對並整合修正。這是文件交叉審閱，不是獨立產品驗收。

已檢查本目錄相對連結、Markdown 表格欄位、尾端空白、JSON 可解析性、107 個來源檔案及 7 個 Issue 快照的 SHA-256，並核對 19 個命令與 8 個查詢的規格 ID 齊備。檢查僅涵蓋文件與來源一致性；產品測試、重建實作、hosted CI 與部署均未在本輪執行。
