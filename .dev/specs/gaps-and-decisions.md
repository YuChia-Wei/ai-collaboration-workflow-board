# 未決事項、來源差異與實作缺口

狀態：2026-10-13 規格初稿；基線 `3e7ee13cda8de27c8a069a062ffd0d289584722e`。本表的 GAP 編號是本次文件追溯用，不建立新 Issue、不取代 GitHub 工作權威。缺少實作不代表缺少已接受的行為；待審核的詳細需求也不因寫入本表變成已接受契約。

## 已固定語意但仍待實作／證據

| ID | 已有契約及缺口 | 影響／必須補的證據 | 承接來源 |
| --- | --- | --- | --- |
| GAP-01 | 協作 8 種 query DTO 已有 schema；沒有 production query handlers、snapshot／cursor adapter | B05、B14、V11、V21 的一致 context、指定版次與 snapshot_expired 仍需實作；schema 正例不足以證明讀取行為 | #3 六／七、#4 契約；#5／#6 |
| GAP-02 | 可信 owner／ActorRef／binding 與 capabilities 已固定；Agent 的實際 credential／委派／撤銷機制未定 | 防偽造、跨 owner、同 owner 不同承接 actor、撤銷後存取及真實 client 認證；client label 不能補洞 | #3 Q02；#5／#6 |
| GAP-03 | 新協作 accepted／rejected receipts 與 digest 原子接受 port 已定；沒有 production D1 implementation | 實際 storage 下雙 writer、CAS 零筆、失敗 rollback、rejected receipt、回應遺失／unknown、重試及 operation 保留 | #3 Q03；#4 §6；#6 |
| GAP-04 | 協作 HTTP／MCP 共用 application 與錯誤語意；新路由尚未實作 | 初始化、探索、認證、連線、版本、不支援能力不廣告；不能以 MCP error mapping 模組當作 transport | #4 §3／7；#5 |
| GAP-05 | 協作工作線、指定決策、接手及成果有領域模型；現行 UI 仍為舊模型 | 兩個真實 session 與人端查看／決定／接手，保留指定內容版本，不混用 completed 與採用 | #3 V02／V09／V14；#7 |
| GAP-06 | 必須可保護並取得服務資料；新協作完整 export／preflight／restore 格式未定 | snapshot cutoff、所有保留修訂／附件／去重資料、身分映射、無外部副作用及替代 store 驗證 | #6；不能套用 local export-schema 冒充已相容 |
| GAP-07 | Framework consumer 的 ref／checkpoint／resume 映射原則已定 | remote provider 版本協商、錯誤映射、unsupported 宣告與真實 consumer 連線 | #3 八；Framework #445 獨立交付 |
| GAP-08 | 程式可驗證引用、權限、DAG、版本與完成條件對照 | 不足以判斷自然語言 plan 影響清單完整、scope 真正不重疊、成果品質或正式採用 | #3 三／四；人與執行者保留語意判斷責任 |

## 待審核需求與未選決策

| ID | 待決項 | 本規格的處理 | 需要的決策／來源 |
| --- | --- | --- | --- |
| GAP-09 | MCP 支援 client、正式 hosting 認證與版本、觀測 token 方法 | 保存 #5 AC，僅以有界 query／command 契約做規格；不選用未公開 endpoint、不填未量測節省比例 | #5 T01／AC01／AC06；實作時確認官方能力與選定 client |
| GAP-10 | 備份頻率、保留範圍、替代 store、恢復目標 | 不自訂 RPO／RTO 或刪除政策；首版 operation outcomes 隨 workflow 保留的已定義要求仍有效 | #6 待決策、#4 §6 |
| GAP-11 | 人端列表／詳情／待辦組合、跨帳號角色 | 保留已接受的指定決策與單一使用者範圍；#7 詳細 UI AC 仍待審核 | #2／#3 優先於 #7 較早的泛稱 PO 流程 |
| GAP-12 | Delivery／Deployment 模型與 API | #8 仍為待審核後續增量；沒有可反推的已實作 aggregate，不創造欄位、狀態、路由或 provider | #8 T01–T04、AC01–AC06 |

GAP-12 可保存的需求例子為：部分工作分次交付、同一不可變產物多環境多次部署、失敗與回復作新紀錄、記錄建立不觸發真正部署。詳細身份、欄位、轉移及驗證 oracle 需 #8 接受後再形成 production/entity 規格。不能把目前 Worker 的建置與部署工具當成該產品領域已存在。

## 來源差異與優先序

| ID | 觀察 | 重建時處理 |
| --- | --- | --- |
| GAP-13 | 根 README／ARCHITECTURE 仍提到 `src/tools/check_repository.py`，但此基線的 tracked tree 沒有該檔；CI `repository` job 只有 checkout／setup-python | 文件中的命令不可直接視為可執行 gate；依存在的测试與 CI 明列實際能力。此次只記錄差異，不另行修復 CI 或加入工具 |
| GAP-14 | `PLATFORM-CONTRACT.md` 的 Sites／D1 未實作敘述屬早期 Python prototype；現行 Board 已有人工／legacy D1 adapter | 依文件開頭範圍及目前 ARCHITECTURE 分流；不說整個 repo 沒有 D1，也不說 local 已有 D1 |
| GAP-15 | Issue #5–#8 的方向對齊文字含 PO 前期／逐階段用語；較新的 #2／#3 明確不內建固定階段或每步批准 | 採較新已接受語意；只有明列 Decision 才 gate，不把舊草案文字轉成固定 lifecycle |
| GAP-16 | Issue #3 的舊 source paths 使用 `src/board/domain` 等；目前已搬至 `src/board/backend/` | 保留 Issue 快照歷史，但新規格連結至本次 commit 的真實檔案；不為符合舊引用還原資料夾 |
| GAP-17 | 協作契約 README 將容量超限概括為 `limit_exceeded`；目前 application 先跑 schema，單命令 `task_changes=101`、`decision_dispositions=101` 或 `dependencies=33` 得 `invalid_command`；形狀合法但 aggregate 累積到 101 才得 `limit_exceeded` | 測試分開 shape 拒絕與累積／bytes 上限；保留契約與實作錯誤映射差異，後續修正需收斂來源，不以規格編輯假裝已符合 |

發現其他 code／契約矛盾時，記錄具體觸發、兩邊來源、可觀察差異及受影響情境。不可直接挑選最方便實作的一邊，也不可在編輯規格時悄悄更改產品行為。精確 wire 結構以版本化 schema 為準；領域意圖以 #2／#3 與 #4 已收斂契約為準；目前程式提供來源觀察。發生真正矛盾仍需承接 Issue 收斂，而非由優先序抹除。

## 本次檢查與證據邊界

本輪核對來源、語意、情境與文件連結；沒有執行產品測試、建置、部署、真實 Agent client 或 hosted storage 驗證。既有測試檔中的 case 只列為「來源存在／可對應」；歷史 Issue 所記錄的通過狀態保留其歷史身分，不升格為本次結果。新寫的 GWT 也沒有自動取得 step definitions。

以上待實作或未決事項不阻止規格文件交付；它們限制的是「完全照此文件即可建立已驗證的正式線上協作服務」這項宣稱。後續應以相同規則與情境逐步補足證據，而不是刪去困難情境來宣告重建完成。
