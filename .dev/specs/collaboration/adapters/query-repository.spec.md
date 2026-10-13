# 協作 query snapshot adapter

## Context and sources

- Type：`adapter`；operation：`spec-author normalize`。
- Status/version：2026-10-13 正規化草案 v2；整理既有內容，沒有新增產品政策或核准。
- Owner/context：Collaboration query consumer → future query storage。
- Scope：find/context/pages/task/decision/document point reads；完整 DTO 已定、production handlers 尚待實作。
- 文件搬移基線：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；行為來源基線：`3e7ee13cda8de27c8a069a062ffd0d289584722e`（src 未變）。
- Source authority：GitHub Issues／Projects、ARCHITECTURE.md、PLATFORM-CONTRACT.md 與 relevant src README 保持各自權威。程式推導屬來源觀察，不等於產品意圖已核准。
- IDs：保留舊 EB／BA／LP 規則 ID；本次不改正式測試 ID，不執行產品測試或宣稱 hosted capabilities。

## Interface contract and mapping

`BA-06`：query port 為 find(access,query),context(access,ref,limit),contextPage(access,ref,section,cursor),task(access,ref,taskId,definitionRevision,atRevision),decision(access,ref,decisionId,decisionRevision,atRevision),document(access,ref,documentRef)。所有 page/point read 固定同一 workflow revision；不能維持 snapshot→snapshot_expired，不偷換新版頁面／文件。可信 Agent binding/撤銷、cursor signing、query snapshots、production persistence、HTTP/MCP routes 仍是後續 #5/#6/#7 的設計/實作工作；現行服務不能廣告已支援此 profile。

## Failure contract

不能維持 pinned revision 時回 snapshot_expired，不以新 revision/版次代替。Owner/store/target 與 point-read refs 需驗證。

## Technical binding

Wire definitions 在 src/board/contracts/collaboration-v1/schema.json；query port 在 application/collaboration-ports.mjs。Cursor signing、snapshot storage、HTTP/MCP handler 沒有現成 production binding。

## Verification expectations

BA-06：同 revision pagination/point reads、expired/缺失、精確版次、owner/store隔離、不得廣告未實作capability。 本次僅文件正規化與來源/內容核對；不是 scenario 執行結果。

## Assumptions, conflicts and open decisions

snapshot 保留方式、可信 cursor、撤銷後讀取與 actual provider consistency 需後續決策與證據。

## Source bindings and coverage limits

src/board/backend/application/collaboration-ports.mjs；src/board/contracts/collaboration-v1/{README.md,schema.json}。 Source path 以 repository root 或該段明示的 src/board/backend、src/local 基底解析；全部綁定行為來源 commit。歷史測試與 provider 證據仍只適用各自 immutable subject；本次沒有重新認證。
