# 協作命令 repository 接受 adapter

## Context and sources

- Type：`adapter`；operation：`spec-author normalize`。
- Status/version：2026-10-13 正規化草案 v2；整理既有內容，沒有新增產品政策或核准。
- Owner/context：Collaboration application → future command storage。
- Scope：完整 invariant state、atomic accepted/rejected/unknown；production implementation 待接入。
- 文件搬移基線：`aa5ba552d29dfb3525c89a7dc8e4f45234f55f10`；行為來源基線：`3e7ee13cda8de27c8a069a062ffd0d289584722e`（src 未變）。
- Source authority：GitHub Issues／Projects、ARCHITECTURE.md、PLATFORM-CONTRACT.md 與 relevant src README 保持各自權威。程式推導屬來源觀察，不等於產品意圖已核准。
- IDs：保留舊 EB／BA／LP 規則 ID；本次不改正式測試 ID，不執行產品測試或宣稱 hosted capabilities。

## Interface contract and mapping

`BA-05`：AccessContext=`{owner_id,actor:{subject_id,kind:human|agent,binding_id},capabilities}` 必須由可信 inbound identity/authorization adapter 提供。WorkflowRef=`{store_id,namespace:personal,record_kind:collaboration,workflow_id}` 為明確目標；owner、binding、capability 不能由使用者 command 自行授權。Clock 和 IdFactory 注入；`next(kind:assignment|handoff|checkpoint)` 產生新且抗碰撞 ID，不重用歷史 identity。

Repository 必備四個 operations：

1. `loadForCommand(owner,ref,command)`：null 或完整 `{state,invariants_complete:true,document_refs,evidence}`；不得傳裁切 query DTO。
2. `operation(owner,storeId,operationId)`：回 `{outcome:accepted|rejected,receipt}` 或 `{outcome:unknown}`。驗證 owner/store/requested target；unknown 不是 definitive rejection。
3. `accept(change)`：change 含 owner/ref/expected_revision/operation_key/digest/actor/next_state、documents/task_definitions/decision_revisions/assignments/handoffs/checkpoints/evidence facts、events、receipt。先檢查 prior digest binding，再 CAS；全 commit 或全無。
4. `reject(owner,ref,operationKey,digest,receipt)`：只持久 definitive rejection receipt，不變更 domain state/event；與 accept 同 key 序列化，不覆蓋或產生互相矛盾結果。

Assignment facts 是 assignment ref + workflow_revision 的 immutable lifecycle snapshot；close append fact，不改原 claim。Command loading 僅按 reference validation 所需讀歷史，但必須完整驗證當下 invariants。Driver exception 可造成 unknown，application 查原 operation；receipt absence 不讓 adapter 自行改 expected_revision/operation ID 再嘗試。具體 wire DTO/acceptance protocol 以 `src/board/contracts/collaboration-v1/` 和本目錄協作規格為準。


## Failure contract

同 owner/store/operation 的 digest binding 與結果不可被競爭接受/拒絕覆蓋。Driver exception 後 unknown 保留，absence 不授權另開命令或改 CAS。

## Technical binding

Normative wire source：src/board/contracts/collaboration-v1/；application/collaboration-ports.mjs 與 application/collaboration.mjs。Clock/IdFactory 為注入 port。沒有 production D1/identity/HTTP/MCP 新路徑可宣告。

## Verification expectations

BA-05：完整 command state、digest binding、CAS/facts/events/receipt atomicity、durable rejection、immutable assignment snapshots、unknown。 本次僅文件正規化與來源/內容核對；不是 scenario 執行結果。

## Assumptions, conflicts and open decisions

具體可信 Agent credential/撤銷、storage provider 與 operation retention 仍依後續 Issues/契約決定；不臆造部署。

## Source bindings and coverage limits

src/board/backend/application/collaboration-ports.mjs；src/board/contracts/collaboration-v1/README.md；ARCHITECTURE.md。 Source path 以 repository root 或該段明示的 src/board/backend、src/local 基底解析；全部綁定行為來源 commit。歷史測試與 provider 證據仍只適用各自 immutable subject；本次沒有重新認證。
