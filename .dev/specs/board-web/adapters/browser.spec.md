# Board browser 呈現 adapter

## Context and sources

- Type：`adapter`；operation：`spec-author normalize`。
- Status/version：2026-10-13 正規化草案 v2；整理既有內容，沒有新增產品政策或核准。
- Owner/context：Board frontend。
- Scope：browser → HTTP services；輸入/呈現不能取代後端授權與 invariants。
- 文件搬移基線：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；行為來源基線：`3e7ee13cda8de27c8a069a062ffd0d289584722e`（src 未變）。
- Source authority：GitHub Issues／Projects、ARCHITECTURE.md、PLATFORM-CONTRACT.md 與 relevant src README 保持各自權威。程式推導屬來源觀察，不等於產品意圖已核准。
- IDs：保留舊 EB／BA／LP 規則 ID；本次不改正式測試 ID，不執行產品測試或宣稱 hosted capabilities。

## Interface contract and mapping

`EB-10`：列表顯示模式、原始/映射狀態、ID、workflow_kind、owner_skill、task 完成數與文件數。completed+historical done 計入顯示完成數，done 保留「歷史狀態」標示；unparsed tasks 明示只計已辨識任務。filter/search 改變時 offset 回 0，每頁 30；空結果有提示。新 list/detail/document 請求的結果只在其 serial 仍為最新時顯示，避免舊回應覆蓋新 selection。

概覽、任務、文件、日誌、交接、證據分頁均是呈現。Source/legacy 不顯示人工編輯 actions；來源 entrypoint/locator/task 原文連結保留。Task metadata model/effort 對 human 顯示不適用；來源宣告的 model/effort 不代表可信 Agent。來源完成不代表 Issue/PR/發布/產品驗收完成。

文件選取後才載原文，Board 可選精確 revision、切換 Markdown/raw、追加 revision/rename；僅 optional 文件可 archive。Markdown parse 後 sanitize；禁止 script/style/iframe/object/embed/form/input/img/video/audio 與 style attribute。文字 metadata/raw 需 escape。相對來源連結優先連到保存的 source document；找不到時，以可信 HTTPS repo+commit 建立固定 Git 版本連結；沒有來源則去除 link；外連使用 noopener/noreferrer。不因預覽執行文件中的 command。

`EB-11`：提交前保存完整 pending command 到 sessionStorage。網路斷線、無效 JSON 或 5xx 表示未確認，保留 operation ID/payload，阻止不同新 command 搶用 pending；非未確認錯誤可清 pending，表單輸入仍保留。重試先 GET receipt，404 才 POST 原 command；成功清 pending、刷新列表與 Board detail。這是人工/legacy 已有 receipt 行為，不可移植為新協作 unknown outcome 的重新接受策略。CAS conflict 顯示需重新讀取核對，不能自動改 expected_revision 重播。

## Failure contract

EB-11 保留不確定操作、原 operation ID/payload 與輸入；EB-10 的 serial guard 防止舊回應覆蓋新選取。

## Technical binding

src/board/frontend/app.mjs/index.html；相對 /api/；sessionStorage pending command；marked + DOMPurify；單一 Worker 建置供應頁面。Frontend 不 import backend，也不存 trusted server identity/secrets。

## Verification expectations

EB-10/11：filters、原狀態、lazy exact revision、sanitize/raw、safe links、stale responses、pending retry/CAS conflict。 本次僅文件正規化與來源/內容核對；不是 scenario 執行結果。

## Assumptions, conflicts and open decisions

真 browser network failure/journey 和新協作 UI 仍需各自證據，不把舊 UI 當 new-profile transport。

## Source bindings and coverage limits

src/board/frontend/{app.mjs,index.html,README.md}；src/board/scripts/build.mjs。 Source path 以 repository root 或該段明示的 src/board/backend、src/local 基底解析；全部綁定行為來源 commit。歷史測試與 provider 證據仍只適用各自 immutable subject；本次沒有重新認證。
