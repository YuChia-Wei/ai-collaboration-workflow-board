# 產品與工作關聯 HTTP v1

產品沿用同一 owner／store 下的 collaboration project。先用 collaboration/2 的 `project.list` 找可見產品，再按穩定 project ID 查詢。每次請求都由現有協作 HTTP 身分驗證解析 owner 與能力，請求內容使用 JSON；跨來源瀏覽器寫入沿用既有 origin 檢查。

## 讀取

`POST /api/portfolio/v1/query` 接受 `{store_id,project_id}`，需要 read。回應有 `product`（project_id、name）、`catalog` 與 `workflows`。每個 workflow 恰有一筆；以其 `workflow_ref` 打開原生協作紀錄。專案內的 collaboration/2 工作及 legacy-personal 對應的 collaboration/1 工作都可讀。來源副本與人工歷史仍由既有入口查閱。

首頁在同一請求加入 `view: "overview"` 可取得 `workflow_count`（所有生命週期狀態）及 `workflows`（只含 active 的工作卡）。卡片提供 workflow_ref、workflow_id、title、status、revision、source、updated_at、pbi_count、blocked_tasks 與 pending_decisions。catalog 在這個檢視只提供 coverage、observed_at 與 revision。讀取既有 active 工作時，服務可從該工作目前修訂的快照還原卡片。兩種讀取均回傳 `can_plan`，供介面按實際權限呈現規劃操作；寫入時服務再次驗證。

- `catalog` 保存 revision、coverage、observed_at、pbis。首次未載入的 revision 為 0，coverage 為 unknown，時間為 null。complete 且空陣列表示已觀察到零筆。partial 表示僅取得部分項目，stale 表示展示先前取得的觀察。
- PBI 在指定產品用 `repository_id`、`issue_id` 定位；另保存顯示用的 number、title、source_version、observed_at、issue_state（open／closed）與可空的 project_status。ID 與版本是來源提供的不透明字串。
- workflow 的 status、updated_at、pending_decisions、blocked_tasks 取自原生工作狀態。evidence、checkpoints、latest_handoff 保留原生欄位；最後一筆交接的下一步為 `latest_handoff.handoff.next_step`。workflow 狀態只表示已記錄的生命週期。
- `workflows[].pbis` 保存目前關聯所選取的版本。從任何一張卡，以 repository_id + issue_id 過濾這份清單，即可找到同一個 workflow。`history[]` 依 revision 排序，每一筆帶 action（created／linked／unlinked）、at、pbis。既有 workflow 的原始外部引用可從建立歷史的 external_work_refs 查回，任意文字引用不會自動比對成產品卡。

## 寫入

`POST /api/portfolio/v1/command` 需要 read 與 plan，並要求可寫的 collaboration/2 project。共用欄位為 store_id、project_id、operation_id、expected_revision、command。

| command | 其餘必填欄位 | 行為 |
| --- | --- | --- |
| catalog.replace | catalog（coverage、observed_at、pbis） | 保存整份提供的觀察，expected_revision 指 catalog revision。維護者或受控來源負責傳入正確的涵蓋範圍與觀察時間。 |
| workflow.create | workflow_id、title、goal、pbis | expected_revision 為 0；一次建立原生協作 workflow、建立事件與所選 PBI 的來源快照。pbis 可空。goal 成為初始工作範圍；skill.id 的 unassigned 表示尚未指定。 |
| workflow.link | workflow_id、pbis | 加入至少一筆同產品已觀察的 PBI，保留建立時範圍。 |
| workflow.unlink | workflow_id、pbis | 移除已連結的指定版本，來源卡後來移除或改版也能解除舊連結。 |

三個 workflow 命令的 pbis 都是 `{repository_id,issue_id,source_version}` 陣列。建立、補連依選定時讀到的 catalog 記錄複製來源快照。原生 workflow 的初始引用標為 `board-catalog`，可辨認其來源為 Board 觀察到的 PBI。解除依工作上已保存的連結版本。補連與解除使用 workflow revision，連結歷史、工作版本、原生事件與回條同時提交。之後的原生協作命令沿同一份 revision 接續。

重送同一個 operation_id、命令及已驗證 principal 可取回原結果。已使用的 ID 綁定不同內容時回報 operation_payload_conflict。遇到競爭修改或來源版本不符應重新讀取；如果要基於最新內容採取另一個動作，使用新 operation_id。若提交後回應遺失，應保留原請求並原樣重送。成功為 HTTP 200 與 accepted=true；衝突為 409、找不到目標為 404、未認證或權限不足為 401／403、結構驗證失敗為 422。缺少儲存服務時為 503。
