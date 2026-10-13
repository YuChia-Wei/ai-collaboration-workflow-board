# 架構依賴、執行路徑與生成產物 正式測試規格

## 脈絡、類型與來源

- 類型：formal-test；操作：normalize；狀態：草案 v2（2026-10-13），全部 `not_run`。
- 範圍：Board／local 向內依賴、frontend/backend 邊界與 runtime artifact 約束。
- 行為規格：[ARCHITECTURE.md](../../../../ARCHITECTURE.md)；測試環境與整體狀態見[共通規則](../README.md)。
- 文件初始化基準：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；產品／測試來源仍固定 `3e7ee13cda8de27c8a069a062ffd0d289584722e`，兩者不混為新執行結果。
- 來源權威：Issue #3（updatedAt `2026-10-12T13:28:04Z`）保留 R01–R06／B01–B14／V01–V21；協作精確 wire 以 collaboration-v1 README／schema／vectors 為準；既有相容性來源為 ARCHITECTURE.md、PLATFORM-CONTRACT.md、各 src README 及現存 test source。code-only 回復項目仍為觀察／計畫，不提升為已核准產品要求。

## 環境、資料與隔離

以指定 commit 的全部來源 modules 與 tracked-file list 為輸入；AST／regex 為靜態檢查，plain repository／clock 為替代 ports。outbox／HTTP asset 使用獨立 ignored runtime fixture。

測試層級與真實／替代邊界：靜態來源／合成 ports／本機路徑測試；未執行 build 或部署。每個情境與負例資料列獨立建立 Given，不以表格列順序共用狀態；清理僅針對執行者自己的 fixture，不自動清除 crash orphan；清理依既有授權。

## GWT 情境與具體斷言

### FT-A01

來源標籤：FT-A01。層級：靜態來源／合成 ports／本機路徑測試；未執行 build 或部署。

**Given**：固定 baseline 全部 Board domain/application.mjs。

**When**：檢查 Board domain/application modules 的 imports 與平台 API 使用。

**Then**：domain 只 domain，application 只 domain/application；不 import runtime／adapter，不 Request/Response/URLSearchParams/D1 results/SQL/row JSON decoding/system clock/HTTP status。

### FT-A02

來源標籤：FT-A02。層級：靜態來源／合成 ports／本機路徑測試；未執行 build 或部署。

**Given**：frontend/backend 所有 modules。

**When**：檢查 frontend/backend modules 的 static imports 與 literal dynamic imports。

**Then**：各自只本側或 contracts；frontend 不能 import backend，backend 不能 import frontend；build composition 可產一 Worker。

### FT-A03

來源標籤：FT-A03。層級：靜態來源／合成 ports／本機路徑測試；未執行 build 或部署。

**Given**：pure Board/legacy reducer 輸入；注入 fixed clock/plain repository/catalog。

**When**：以 fixed clock、plain repository/catalog 執行 Board／legacy reducer 與 replay 的獨立資料例，記錄輸入是否變動及 ports 呼叫。

**Then**：reducer 不改 input；plain DTO/decoded records 可運作；replay 不 load/clock/write；Fault 無 HTTP status。

### FT-A04

來源標籤：FT-A04。層級：靜態來源／合成 ports／本機路徑測試；未執行 build 或部署。

**Given**：local domain/application 全部 Python AST。

**When**：解析 local domain/application 的 Python AST 並檢查 imports。

**Then**：domain 不 application；兩層不 sqlite3/http/urllib/adapters；composition root 組裝。

### FT-A05

來源標籤：FT-A05。層級：靜態來源／合成 ports／本機路徑測試；未執行 build 或部署。

**Given**：獨立 outbox 資料例：`.runtime/layout-check/` 下 ignored、untracked 檔案及 Git 外 path 為允許例，`src/local/outbox.json` 與 tracked `.gitignore` 為負例。獨立 HTTP 資料例：本機服務與搬移後的 `ui.html` 原始 bytes。

**When**：各資料例獨立執行：outbox 資料例呼叫 validate_outbox；HTTP 資料例向本機服務送出 GET `/`，比對回應與搬移後 ui.html 的 bytes。

**Then**：只容許 ignored、untracked runtime／Git 外 path；source／tracked 拒絕；HTTP `/` 提供搬移後 `ui.html` 的精確 bytes。

### FT-A06

來源標籤：FT-A06。層級：靜態來源／合成 ports／本機路徑測試；未執行 build 或部署。

**Given**：package/build artifact 與 tracked file list。

**When**：依 ARCHITECTURE／PLATFORM 的政策檢查 tracked-file list、package 與 build artifact 的路徑及 runtime imports。

**Then**：驗證 product code 在 src、生成 dist/node_modules/runtime 不 tracked、Worker ESM 無 Node-only runtime imports。

## 規則覆蓋與排除

本檔唯一正式定義的情境為：FT-A01, FT-A02, FT-A03, FT-A04, FT-A05, FT-A06。其他 IDs 是追溯引用，不重複定義。每項成功／拒絕／邊界斷言沿用原始 v1；「來源存在」僅為靜態來源映射，不能把整個 V criterion 標示通過。Issue #3 完整 R/B/V 矩陣見[索引](../README.md)，技術來源及未覆蓋變體見下節。

## 執行與證據界線

本次 `not_run`：未執行產品測試、啟動服務、建立真實 browser／Agent session、建置或部署。normalize 只重組文件、改善可讀性並保留來源狀態。來源 fixture、schema 或 assert 名稱不是執行紀錄；future execution 必須綁不可變 commit、scenario/data row、actual identifier、環境、原始輸出及每個 Then 的證據。自我檢查不代表獨立驗收。

## 未知、衝突與開放問題

每個來源欄保留的缺口、部分覆蓋、觀察及未實作界線仍有效；不能因移入新目錄而改為 implemented／passed。需要的未定 oracle／真實邊界由原 Issue owner 收斂；不新增 runner、框架、固定批准、產品權限或部署要求。

## 技術 binding 與既有測試來源

以下保留原始 actual test identifier／部分來源／缺口；完整具名清冊見[來源清冊](../test-source-inventory.md)。語言、repository adapter、runner 與錯誤 mapping 是技術 binding，與上面的行為斷言分開。

| 情境 ID | 既有來源及限制 |
| --- | --- |
| FT-A01 | architecture.mjs；靜態 regex 可漏動態技巧，不等全部 runtime 依賴證明 |
| FT-A02 | architecture.mjs；build bundle 另需 artifact check |
| FT-A03 | architecture.mjs＋platform-ports.mjs six named tests |
| FT-A04 | test_layout SourceLayout.test_domain_and_application_depend_inward；portable application/adapter 交易協作仍未全抽象 |
| FT-A05 | layout outbox…／http_serves_relocated_asset… |
| FT-A06 | ARCHITECTURE／PLATFORM 與初始化後 README。歷史 GAP13：3e7ee13 基準的 README 曾提 src/tools/check_repository.py，但檔案不存在，CI repository job 沒有 policy run；不得列為可執行 gate 或宣稱 active。aa5ba552 初始化已移除 README／ARCHITECTURE 的過時命令與樹項目，文件矛盾已修正；checker 仍不存在，無權威要求本次還原 checker 或新增 CI gate。原文件不修 code／CI 的邊界保留。 |
