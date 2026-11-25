# 產品與工作關聯 HTTP v1

產品沿用同一 owner／store 下的 collaboration project。先用 collaboration/2 的 `project.list` 找可見產品，再按穩定 project ID 查詢。每次請求都由現有協作 HTTP 身分驗證解析 owner 與能力，請求內容使用 JSON；跨來源瀏覽器寫入沿用既有 origin 檢查。

## 讀取

`POST /api/portfolio/v1/query` 接受 `{store_id,project_id}`，需要 read。完整回應包含 `product`（project_id、name）、`backlog`（Board 原生項目）、`lifecycle`（各類型流程）、`delivery`（交付、環境與觀察）、`catalog`（外部觀察）與 `workflows`。每個 workflow 恰有一筆，並以 `workflow_ref` 識別。服務可讀取專案內的 collaboration/2 工作，以及 legacy-personal 對應的 collaboration/1 工作。產品首頁只列明確建立的專案，從產品看板開啟該產品的 PBI 和 workflow。

首頁在同一請求加入 `view: "overview"` 可取得 `workflow_count`（所有生命週期狀態）及 `workflows`（只含 active 的工作卡）。卡片提供 workflow_ref、workflow_id、title、status、revision、source、updated_at、pbi_count、blocked_tasks 與 pending_decisions。catalog 在這個檢視只提供 coverage、observed_at 與 revision。讀取既有 active 工作時，服務可從該工作目前修訂的快照還原卡片。兩種讀取均回傳 `can_plan`，供介面按實際權限呈現規劃操作；寫入時服務再次驗證。

- `catalog` 保存 revision、coverage、observed_at、pbis。首次未載入的 revision 為 0，coverage 為 unknown，時間為 null。complete 且空陣列表示已觀察到零筆。partial 表示僅取得部分項目，stale 表示展示先前取得的觀察。
- 外部 PBI 在指定產品用 `repository_id`、`issue_id` 定位，另保存顯示用的 number、title、source_version、observed_at、issue_state（open／closed）與可空的 project_status。ID 與版本是來源提供的不透明字串。
- `backlog` 包含 `revision`、`items`、`sprint_settings` 和 `sprints`。新產品的 revision 為 0，items 與 sprints 為空陣列，sprint_settings 為 `{"duration_weeks":2,"start_weekday":1}`。即使項目清單仍空，成功設定流程或 Sprint 節奏、建立 Sprint 也會推進待辦修訂。無論外部 catalog 的 coverage 為何，均可讀取本產品原生項目的內容與同層順序。項目的 `parent_id` 決定層級，根層為 null。
- 每一原生項目含 `source: "native"`、穩定的 `item_id`、不透明字串 `source_version`、`updated_at`、`kind`、`title`、`description`、`parent_id`、`related_story_id`、`expected_behavior`、`actual_behavior` 與 `status`（open／closed）。在該產品內，以來源和 item_id 查找原生卡。
- workflow 的 status、updated_at、pending_decisions、blocked_tasks 取自原生工作狀態。evidence、checkpoints、latest_handoff 保留原生欄位；最後一筆交接的下一步為 `latest_handoff.handoff.next_step`。workflow 狀態只表示已記錄的生命週期。
- `workflows[].pbis` 保存目前關聯所選取的版本。由外部卡的 repository_id 和 issue_id、或原生卡的 native 來源和 item_id 均可查回支援它的 workflow。`history[]` 依 revision 排序，每一筆帶 action（created／linked／unlinked）、at、pbis。既有 workflow 的原始外部引用可從建立歷史的 external_work_refs 查回，任意文字引用不會自動比對成產品卡。

## 寫入

`POST /api/portfolio/v1/command` 需要 read 與 plan，並要求可寫的 collaboration/2 project。共用欄位為 store_id、project_id、operation_id、expected_revision、command。

| command | 其餘必填欄位 | 行為 |
| --- | --- | --- |
| backlog.create | item_id、kind、title、description、parent_id、related_story_id、expected_behavior、actual_behavior | 使用所屬類型的初始階段建立項目，追加到同層順序的末端。 |
| backlog.edit | item_id、title、description、related_story_id、expected_behavior、actual_behavior、status | 更新內容。採用詳細流程的卡須傳其既有開關分類。尚未對應的舊列可依原有 open／closed 契約編輯。 |
| backlog.move | item_id、before_id | 移到同層目標項目之前。before_id 為 null 時移到該層末端。 |
| backlog.transition | item_id、to_state、reason、resolution、original_id | 依該類型流程轉換，或將舊列明確對應至同分類的階段。 |
| backlog.configure_sprints | duration_weeks、start_weekday | 設定本產品之後新建 Sprint 的週數與起始星期。 |
| backlog.create_sprint | sprint_id、name、start_date | 建立具名期間，依當前設定計算結束日期。 |
| lifecycle.configure | kind、flow | 完整取代此產品的一種流程範本。已使用的階段受保護。 |
| catalog.replace | catalog（coverage、observed_at、pbis） | 保存整份提供的觀察，expected_revision 指 catalog revision。維護者或受控來源負責傳入正確的涵蓋範圍與觀察時間。 |
| workflow.create | workflow_id、title、goal、pbis | expected_revision 為 0；一次建立原生協作 workflow、建立事件與所選 PBI 的來源快照。pbis 可空。goal 成為初始工作範圍；skill.id 的 unassigned 表示尚未指定。 |
| workflow.link | workflow_id、pbis | 加入至少一筆同產品的原生或外部 PBI，保留建立時範圍。 |
| workflow.unlink | workflow_id、pbis | 移除已連結的指定版本，來源卡後來移除或改版也能解除舊連結。 |

backlog 命令及 lifecycle.configure 的 `expected_revision` 均為該產品最近讀到的 `backlog.revision`。命令表列出的欄位均須傳入。title 為非空白字串，最多 300 字元。description、expected_behavior 和 actual_behavior 最多各 4000 字元，無內容使用空字串。無父項、受影響 Story 或移動目標時，相應欄位傳 JSON null。成功回條提供 operation_id、store_id、project_id、request_digest、accepted 及本次 revision。原樣重播同一個操作取得該次結果。

`kind` 使用 `epic`、`feature`、`user_story`、`task` 或 `bug`。Epic 和 Bug 皆在根層。Feature、User Story、Task 的 parent_id 依序必須指向同產品的原生 Epic、Feature、User Story。Bug 的 expected_behavior 和 actual_behavior 皆須有文字，可用 related_story_id 另指同產品原生 User Story。其餘類型的這兩個描述欄傳空字串，related_story_id 傳 null。backlog.move 的目標要與自身有同一 parent_id，移動會修訂該項的 source_version。

三個 workflow 命令的 pbis 陣列可包含兩類選取。外部項目沿用 `{repository_id,issue_id,source_version}`，原生項目用 `{source:"native",item_id,source_version}`。建立與補連依選取複製來源快照。既有 catalog 選取的初始引用仍標為 `board-catalog`。解除依工作上已保存的連結版本。補連與解除使用 workflow revision，連結歷史、工作版本、原生事件與回條同時提交。之後的原生協作命令沿同一份 revision 接續。

例如在空產品回報獨立 Bug，可以送出以下 JSON。成功後重新查詢產品，從 `backlog.items` 取回原生卡的 source_version，再傳給 workflow.create 或 workflow.link。工作建立時記錄的原生引用以 `board-native` 和該產品識別來源。

```json
{
  "store_id": "demo", "project_id": "rice-booking",
  "operation_id": "report-sunday-booking", "expected_revision": 0,
  "command": "backlog.create", "item_id": "weekend-booking", "kind": "bug",
  "title": "週日顯示為可預約", "description": "", "parent_id": null,
  "related_story_id": null, "expected_behavior": "週日停診",
  "actual_behavior": "日期選單仍可選取週日"
}
```

重送同一個 operation_id、命令及已驗證 principal 可取回原結果。已使用的 ID 綁定不同內容時回報 operation_payload_conflict。遇到競爭修改或來源版本不符應重新讀取；如果要基於最新內容採取另一個動作，使用新 operation_id。若提交後回應遺失，應保留原請求並原樣重送。成功為 HTTP 200 與 accepted=true；衝突為 409、找不到目標為 404、未認證或權限不足為 401／403、結構驗證失敗為 422。缺少儲存服務時為 503。

## Sprint 期間與配卡

完整查詢中，`backlog.sprint_settings.duration_weeks` 為 1 至 4 的整數，`start_weekday` 採 ISO 星期數，1 為週一、7 為週日。`backlog.sprints` 依開始日遞增，每列為 `{sprint_id,name,start_date,end_date}`。日期為無時區的 `YYYY-MM-DD`，開始日及結束日皆包含。結束日由服務依建立時的節奏算出。之後更改節奏時，各既有期間保留原名稱、識別及日期。

每一原生項目另含可為 null 的 `sprint_id`。backlog.create 和 backlog.edit 在表列必填欄位之外可選填 sprint_id，適用五種類型。建立時省略或傳 null 皆為未排期，編輯時省略表示保留，傳 null 才會清空。舊列無此欄位時讀回 null。指定值須為目前產品內存在的 Sprint。父子、Bug 所關聯的 Story 與 workflow 均各自維持原來的規劃及狀態。

下例在採用預設節奏的空產品建立 2026-12-28 到 2027-01-10 的一期。sprint_id 使用產品內穩定識別，name 為最長 160 字元的非空白名稱。兩個 Sprint 命令和配卡均使用 backlog.revision 作為 expected_revision。

```json
{
  "store_id": "demo", "project_id": "rice-booking",
  "operation_id": "plan-year-end", "expected_revision": 0,
  "command": "backlog.create_sprint", "sprint_id": "year-end",
  "name": "年末整理", "start_date": "2026-12-28"
}
```

若要改為每週三開始的一週，backlog.configure_sprints 的額外欄位為 `{"duration_weeks":1,"start_weekday":3}`。超出週數或星期的整數範圍回應 422 invalid_sprint_settings。同產品日期重疊回應 409 sprint_overlap，重複 sprint_id 回應 409 sprint_exists。起訖日均須介於 0001-01-01 和 9999-12-31 且為有效日曆日，超出回應 422 invalid_sprint_date。起始星期不符為 422 sprint_weekday_mismatch。配卡時找不到該產品內的 Sprint 回應 404 sprint_not_found。重新送出相同操作仍採用既有回條規則。

## 詳細工作狀態

完整查詢的 `lifecycle` 包含 `revision` 和 `flows`。flows 的五個 key 對應原生 kind，其值為 `{initial,states,transitions}`。每個 state 為 `{id,label,category}`，category 是 open 或 closed。每個 transition 為 `{from,to,mode}`，前兩欄都是狀態識別。一般 mode 為 normal。bug_resolution 僅適用 Bug 從 open 到 closed 的處置。設定單種類型時傳整份 flow，初始狀態須屬 open，所有階段須可從初始狀態抵達，closed 須有回到 open 的轉換。仍有卡使用的狀態可改顯示名，停用或變更分類前須先處理該狀態的卡。

flow 容許 2 至 32 個狀態、最多 256 個轉換。狀態識別以小寫英文字母開頭，後續可用小寫英數、底線和連字號，最多 64 字元。label 上限為 100 字元。服務拒絕重複狀態、同一對端點的多條邊、自我轉換、無法從初始階段抵達的階段及無法到達任何 closed 的階段。送出時每條邊都要提供 mode。

每張原生卡另有 `state_id` 及 `state_history`。歷史逐筆包含 `revision,at,actor,from,to,reason,resolution,original_id`。from、to 記錄當時的 id、label、category，新卡建立時 from 為 null。舊列只有粗分類時，state_id 為 null，首次明確對應時 from.id 為 null。重開已對應的卡，須送允許的 backlog.transition。以 backlog.edit 強改開關分類會得到 409 lifecycle_transition_required。

普通轉換使用空字串或文字 reason、null resolution、null original_id。使用 bug_resolution 邊時，reason 需有文字。重複單傳 resolution=duplicate 及另一張同產品 Bug 的 original_id。不修傳 resolution=wont_fix、original_id=null。完整預設轉換表及採用舊資料的情境見[生命週期與交付規格](../../../.dev/specs/portfolio/backlog/lifecycle-and-delivery.spec.md)。

## 交付與部署

完整查詢回傳 `delivery:{revision,policy,environments,handoffs,attempts,observations,applicability}`。新產品的交付修訂為 0，各集合為空。預設政策的 recipient 為空字串、evidence_kind 為「交付紀錄」、primary_environment_id 為 null。以下命令沿用同一 HTTP command、驗證及回條機制，expected_revision 使用 delivery.revision。所有時間欄位 occurred_at 傳含三位毫秒的 UTC 時戳，例如 `2026-11-25T09:30:00.000Z`。

| command | 共用欄位以外的輸入 | 成功後讀回的結果 |
| --- | --- | --- |
| delivery.environment | environment_id、name、purpose、retired | 新增、改名或停用具名環境。先變更目前的主要環境才能停用它。 |
| delivery.policy | primary_environment_id、recipient、evidence_kind | 修改預設環境與交付政策。空字串 recipient 表示逐次指定，primary_environment_id 可為 null。 |
| delivery.applicability | item_id、deployable | 對特定原生項目明示部署是否適用。 |
| delivery.draft | handoff_id、artifact、recipient、scope | 建立 status=draft 的交付範圍。產物與對象可先傳空字串。 |
| delivery.record | handoff_id、artifact、recipient、evidence_kind、evidence、occurred_at | 完成既有草案並保存其範圍、交付時的政策、產物、受領人及依據。 |
| delivery.attempt | attempt_id、environment_id、artifact、mode、previous_id、result、evidence、occurred_at、scope | 記下某次 deploy、retry 或 rollback 及 succeeded／failed 結果。 |
| delivery.observe | observation_id、environment_id、artifact、evidence、occurred_at | 獨立保存環境讀回的版本、證據及觀察時間。 |

scope 的每列包含 `item_id,outcome,included` 和可選的 `coverage`（partial／full，預設 partial）。同一產品的每張原生卡最多列一次，範圍共 1 至 30 列，至少一列 included=true。outcome 說明包含的成果或延期原因，保存時另擷取所選卡的 title 與 source_version。交付凍結時須符合當時的 recipient、evidence_kind 政策，並填上確切產物及依據。宣告的版本／digest 供查證來源，Board 不會自行下載或驗證其內容。

首筆 deploy 的 previous_id 為 null。retry 引用同一環境、同一產物的較早失敗嘗試。rollback 引用同一環境的較早成功嘗試，指定不同的回復目標產物。嘗試的發生時間不可早於所引用的前筆。artifact 需以固定版本、產物識別或 digest 表達，服務拒絕常見的浮動名稱，例如 latest。成功嘗試與環境讀回是分別送出的命令。相同環境在同一觀察時間回報兩種不同產物會得到衝突。紀錄是使用者提交的證據，來源系統的證實與信任邊界另行查核。

每筆 attempt 另記 `effect`。一般部署為 install，回復為 restore，重試沿用前一筆的 effect。若需要判讀卡片的 Deployed，取指定環境最新觀察的產物，查找該環境在觀察當下或更早、effect 為 install 的成功嘗試，且其確切產物與所需卡片範圍相符。較新嘗試尚未讀回時顯示目前待確認。回復與回復後重試的範圍表示這次操作影響的項目。原生卡標記 deployable=false 時仍能追查既有嘗試。
