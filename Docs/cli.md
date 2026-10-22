# Workflow Board CLI

CLI 0.1.0 的首版目標是連接既有線上 Workflow Board，使用
`workflow-board/collaboration/1`。2026-10-20 已部署至既有私有 Site 第 13 版，
並完成正式入口的 CLI 合成讀寫。憑證、GitHub／Sites 版本與分層驗收結果見
[線上驗收紀錄](../.dev/guides/cli-hosted-acceptance-20261020.md)。

此 CLI 不使用 `src/Prototypes/WorkflowRecords` Python 原型的 API／資料庫，不執行 Agent、自動派工、
人類審核或直接 SQL。#16 為 CLI 工作項目；#17 的
[MCP 使用指南](mcp.md) 說明既有 Sites plugin 與 CLI 的雙向交接。

## 這台 Windows 電腦的日常用法

Owner 已選擇把兩項服務憑證保存在**目前 Windows 使用者的認證管理員**。
已配置的 profile 名稱是 `workflow-records-private`；不需要每次重新輸入 token。
在 repository 根目錄開啟 PowerShell 7：

```powershell
# 查看站點、store、憑證 ID 與到期日；不會顯示 token。
pwsh -NoProfile -File .\src\Presentation\Cli\windows-cli.ps1 status workflow-records-private

# 連線與能力查詢。
pwsh -NoProfile -File .\src\Presentation\Cli\windows-cli.ps1 run workflow-records-private capabilities --json

# 搜尋 workflow；請依名稱調整 --query。
pwsh -NoProfile -File .\src\Presentation\Cli\windows-cli.ps1 run workflow-records-private find --query '合成 CLI 驗收' --json

# 把 WORKFLOW_ID 換成搜尋結果的 workflow_id。--all 會讀完同一快照的所有頁。
pwsh -NoProfile -File .\src\Presentation\Cli\windows-cli.ps1 run workflow-records-private context --workflow WORKFLOW_ID --all --json
```

上述 `run PROFILE` 後面就是本文原有 CLI 命令。送出 command 仍使用完整 JSON
檔及明確的 operation ID／expected revision，例如
`run workflow-records-private submit --file .runtime/my-command.json --json`。
讀取 context 不會自動 claim；送出前先確認 workflow、版本及授權範圍。

安全入口只把秘密注入該次 Node 子程序，不設定永久環境變數、不建立 `.env`、
不把 token 放入參數或輸出。連線綁定 profile；禁止搭配 `--endpoint`、`--store`、
`--namespace` 或 `--allow-loopback` 改用其他連線，請另建 profile。
一般 CLI 的業務結果與 exit code 原樣傳回；profile 缺失、到期或設定錯誤為 exit 2。

### 憑證放在哪裡、何時到期

- Windows「控制台 → 認證管理員 → Windows 認證 → 一般認證」的
  `WorkflowBoard:workflow-records-private`，包含兩項 token 與連線設定。
- 保存範圍是目前 Windows 使用者、目前電腦。重開 PowerShell 或重新登入仍可讀取；
  換帳號、換電腦或 clone repository 不會複製秘密。
- 本次 Board credential ID：`cli-owner-20261020`，到期時間
  **2026-11-19 22:38:52（台灣時間）**，即 `2026-11-19T14:38:52.737Z`。
  以 `status` 的實際讀回為準。Sites token 如由平台撤換，可能需要提前更新。
- 保存與讀取使用 Windows `CredWriteW`／`CredReadW` 的目前登入使用者 credential set；
  `CRED_PERSIST_LOCAL_MACHINE` 表示同一使用者在此電腦的後續登入可使用，
  不代表所有本機使用者共用。[Microsoft Credential API](https://learn.microsoft.com/en-us/windows/win32/api/wincred/ns-wincred-credentialw)
- 這仍是既有單 owner／共用 Agent；沒有新增獨立 Agent 或人類審核權限。

### 更新、輪替與移除

管理者應先建立新 Board token、設定相應 digest／期限並部署，再透過以下遮蔽輸入更新
本機 profile，確認 capabilities 成功後撤銷舊的 server entry。**只修改本機 profile
不會更新伺服器**。不要把 token 放入 PowerShell history、Git、聊天或普通檔案。

```powershell
# 互動提示 endpoint、store、UTC 到期日，再遮蔽輸入兩項 token。
pwsh -NoProfile -File .\src\Presentation\Cli\windows-cli.ps1 configure workflow-records-private

# 只刪除此 Windows 使用者的本機認證項目。
pwsh -NoProfile -File .\src\Presentation\Cli\windows-cli.ps1 remove workflow-records-private
```

本機 `remove` 不會撤銷 server credential。要全面撤銷，管理者還需在 Sites
`COLLABORATION_SERVICE_CREDENTIALS` 停用／移除相應 ID，並部署已保存版本。
若遺失本機秘密，可建立新憑證並撤銷舊的；伺服器只保存 digest，不能回復原 token。

自動配置僅支援 `configure PROFILE --stdin` 的重新導向記憶體 pipe，且不輸出秘密；
它接受 version=1、endpoint、store、namespace、board_token、sites_token、expires_at
七個欄位。這是管理整合入口，不要把含秘密的 JSON 存成檔案。

## 安裝與啟動

首個支援環境為 Windows／PowerShell 7、Node.js >=22.13；CI 使用 Node.js 24。
從此 repository checkout 啟動，不需要全域安裝。執行 Node CLI 的來源驗證器
使用既有 Ajv development dependency，安裝時不要使用 `--omit=dev`。

```powershell
npm ci
node src/Presentation/Cli/main.mjs help
node src/Presentation/Cli/main.mjs version --json
```

也可使用 `npm --silent run cli -- <command> <options>`。
腳本解析 JSON 時使用上面的直接 Node 入口或 `--silent`，避免 npm banner
混入 stdout。package 的 `workflow-board` bin 指向相同入口；本次沒有執行
全域 npm link、發佈 npm package 或建立平台 installer。

## 線上連線與認證

CLI 使用兩項獨立秘密，皆從程序環境取得，不接受 secret 命令列參數、
自訂 header、瀏覽器 cookie 或 Codex auth 檔：

| 環境變數 | 責任 |
| --- | --- |
| `WORKFLOW_BOARD_SITES_TOKEN` | Sites 官方服務存取憑證，送往該 Site 的 `OAI-Sites-Authorization: Bearer …` |
| `WORKFLOW_BOARD_TOKEN` | Board 專用服務憑證，送往 `Authorization: Bearer …` |
| `WORKFLOW_BOARD_ENDPOINT` | 完整 HTTPS origin，不能含 userinfo、path、query 或 fragment |
| `WORKFLOW_BOARD_STORE` | 已設定的穩定 store ID，不是 URL |
| `WORKFLOW_BOARD_NAMESPACE` | 必須明確為 `personal` |

例如既有站點的非秘密設定：

```powershell
$env:WORKFLOW_BOARD_ENDPOINT = 'https://workflow-records-private.yuchia-wei.chatgpt.site'
$env:WORKFLOW_BOARD_STORE = 'workflow-records-private-collaboration'
$env:WORKFLOW_BOARD_NAMESPACE = 'personal'
# 兩項 token 由授權的秘密管理流程注入目前程序；不要貼進命令歷史或文件。
node src/Presentation/Cli/main.mjs capabilities --json
```

`--endpoint`、`--store`、`--namespace` 優先於相應環境變數。
沒有設定檔探索、隱含站點或 scope；缺少必要設定會在發出請求前結束。
`--timeout-ms` 預設 15000，可設 100–120000。跨站 redirect 不跟隨，
不把憑證送到登入頁或其他 origin。操作者仍須核對自己指定的 HTTPS origin。

Sites 1.0.1 隨附的 `identity-and-secrets.md#service-access` 與 native
`get_site` 契約說明：平台服務憑證可通過私有 Site 的存取限制，但不附帶
visitor identity 或 connected-app consent。2026-10-20 唯讀查核確認既有 Site
會提供該 credential；沒有將秘密寫入 source、Git 或文件。
[公開登入說明](https://learn.chatgpt.com/docs/sites/data-and-connections)、
[Sites MCP 認證說明](https://learn.chatgpt.com/docs/extend/mcp) 與
[Codex access token](https://learn.chatgpt.com/docs/enterprise/access-tokens)
各有自己的適用範圍，不能互換成 Board API credential。

### 後端服務憑證設定

owner 已選定此新增認證方式，並於 2026-10-20 完成線上配置。
後續部署或輪替時，由授權管理者設定以下 server-only runtime value：

```json
{
  "version": 1,
  "credentials": [
    {
      "id": "cli-owner-1",
      "owner_id": "EXISTING_SITE_SCOPED_OWNER_ID",
      "token_sha256": "sha256:REPLACE_WITH_64_LOWERCASE_HEX_DIGITS",
      "expires_at": "2026-11-20T00:00:00.000Z",
      "enabled": true
    }
  ]
}
```

上面的 JSON 放在 `COLLABORATION_SERVICE_CREDENTIALS`。範例占位符不可直接
使用；期限由管理者選定。實際 token 格式為
`wb1.<credential-id>.<43-character-base64url-secret>`，secret 應由密碼學
安全亂數產生 32 bytes，再以不含 padding 的 base64url 編碼。
`token_sha256` 是**完整 token 字串**的 UTF-8 SHA-256，帶 `sha256:` 前綴。
只保存 digest，不把原始 token 放入 runtime config、repository 或瀏覽器。
token 以授權秘密管道交給 CLI。Sites token 的取得與未來 unattended 執行
方式須另行確認，不把目前作者 session 可讀到 token 視為永久發放 API。

服務憑證只映射到既有 `COLLABORATION_BINDINGS[owner_id]`。它不另建 actor，
不自填 capability；每次請求重新查 binding，因此停用既有 binding、
改成唯讀或刪除 binding 都會立即影響後續服務請求。缺少設定、非法設定、
過期／停用 token、digest 不符或無效 binding 一律拒絕；提供錯誤
`Authorization` 時即使另有 Sites 身分，也不回退到該身分。

輪替可先配置新 id／digest，再讓 client 換 token，最後刪除或停用舊 entry；
兩者仍解析為同一個既有 actor。撤銷由管理者停用／移除該 entry；
憑證不因 CLI session 名稱而變成另一個 Agent。此模式沒有新增 #11 的多 Agent
身分隔離，也沒有 `human`、`decide`、`change_scope` 權限。

只有 collaboration HTTP routes 使用此 adapter。既有 Sites 瀏覽器與 Site
plugin MCP 繼續使用可信 ingress 的 user ID；服務 token 不支援直接登入
`/mcp`。Sites 仍須保留私有 access policy；不得公開網站來省略平台 credential。
Worker 仍須位於會驗證／覆寫身分 header 的 Sites ingress 後方。

## 命令與回傳契約

所有命令都可加 `--json`，stdout 為一個完整 JSON object，外層
`cli_contract_version = workflow-board-cli/1`。`data` 保留原業務 DTO；
診斷放 stderr。預設人可讀模式為縮排 JSON，仍完整保留 cursor、missing、
revision、hash 與 receipt。help/version 不要求連線設定或秘密。

| CLI | collaboration/1 query／command | 必要參數 |
| --- | --- | --- |
| `capabilities` | `capabilities` | 共同連線設定 |
| `find` | `workflow.find` | 可選 `--query`、`--limit`、`--cursor` |
| `context` | `workflow.context` | `--workflow`；可選 `--limit`、`--all` |
| `page` | `context.page` | `--workflow --section --cursor --at-revision` |
| `task` | `task.read` | `--workflow --task --at-revision --definition-revision` |
| `decision` | `decision.read` | `--workflow --decision --at-revision --decision-revision` |
| `document` | `document.read` | `--workflow --document --document-revision --hash` |
| `operation` | `operation.get` | `--workflow --operation` |
| `query` | 任一合法 query envelope | `--file`，檔案內 scope 必須符合 CLI 設定 |
| `submit` | 任一合法 command envelope | `--file`，完整且保留的原始命令檔 |

每份 response 依相同版本 schema 驗證；文件另外驗證 workflow、指定版次與
實際內容 hash。context 預設保留單頁 metadata，`--all` 才讀取全部集合頁。
`--all` 若遇到錯誤、snapshot 版次不符、重複 cursor 或無法完整取得資料會
失敗，不回傳假裝完整的部分內容。每個 section 最多追蹤 1000 頁，超過時
明列 `pagination_incomplete`。`find` 不自動抓全部，使用回傳 cursor 查下一頁。
`missing` 是可觀察的業務結果，不會被隱藏或替換成最新文件。

| Exit code | 意義 |
| --- | --- |
| `0` | 查詢成功，或命令 receipt 明確 accepted |
| `2` | 輸入／設定錯誤，未發出命令 |
| `3` | 網路、protocol 或無法驗證的查詢結果；不是成功 |
| `4` | 認證／權限／業務拒絕；可包含持久 rejected receipt |
| `5` | operation outcome unknown；保留原命令與 ID |

`operation` 成功讀到既存 rejected receipt 時 exit 0，因為查回本身成功，
須再讀 `data.outcome`。查無 receipt 為 `unknown`／exit 5；不等同拒絕。

`submit` 在 POST 前以原 operation ID 查一次 receipt；查詢失敗不 POST。
即使已找到 receipt，仍用原命令 POST，讓 server 核對綁定 principal 的
request digest，避免僅憑同 ID 誤認另一份 payload 的結果。server 會先做
receipt replay，再檢查 revision，因此不重複效果。

命令回應遺失或不可驗證時再查一次 receipt，然後回報 `unknown`。查得的
receipt 放在 `reconciliation`，不直接宣稱它就是本次 payload 的接受結果。
操作者可用**同一檔案**重跑 `submit`，由後端驗證完整 digest。沒有自動 POST
重試、換 ID、修改 revision 或覆寫衝突。已明確 rejected 的命令如要修正，
必須先處理業務衝突，為新的意圖另建命令；不要把未知結果當成這種情況。

CLI 遮蔽輸出中與目前兩項 credential 相同的字串，若因此改動結果內容會標示
`redacted: true`；此輸出不再是原始文件 bytes。HTTP 原始錯誤、headers 與例外
細節不會直接輸出。不要在業務文件裡存秘密，此遮蔽不代表任意內容皆已去識別。

## PowerShell 最小協作流程

先完成上面的部署與認證設定，並取得建立**合成 workflow**的操作授權。
下面只示範檔案準備與命令；本文件不表示已在線上執行。請在 repository 根目錄
使用，命令檔留在 Git 忽略的 `.runtime/cli-demo`。每個寫入檔只準備一次；
遇到 exit 5 時不要重跑產生新 ID 的程式碼，直接重送原檔。

```powershell
$dir = New-Item -ItemType Directory -Force .runtime/cli-demo
$ref = @{
  store_id = $env:WORKFLOW_BOARD_STORE
  namespace = 'personal'
  record_kind = 'collaboration'
  workflow_id = 'cli-demo-' + [guid]::NewGuid().ToString('N')
}
$scope = @{ included = '合成 CLI 接手演練'; excluded = '正式資料與部署' }

function Save-BoardCommand($name, $revision, $payload, $file) {
  @{
    service_contract_version = 'workflow-board/collaboration/1'
    schema_version = '1.0'
    workflow_ref = $ref
    operation_id = [guid]::NewGuid().ToString('N')
    expected_revision = $revision
    command = $name
    payload = $payload
  } | ConvertTo-Json -Depth 30 | Set-Content -Encoding utf8NoBOM $file
}
function Invoke-BoardCommand($file) {
  $reply = node src/Presentation/Cli/main.mjs submit --file $file --json | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw "停止；保留 $file 並檢查結構化結果：$($reply | ConvertTo-Json -Depth 30)" }
  return $reply.data
}

node src/Presentation/Cli/main.mjs capabilities --json
$createFile = Join-Path $dir '01-create.json'
Save-BoardCommand 'workflow.create' 0 @{
  title = '[合成] CLI 接手'
  goal = '驗證跨 session 保存與接手'
  scope = $scope
  skill = @{ id = 'cli-demo'; version = $null }
  external_work_refs = @()
} $createFile
$receipt = Invoke-BoardCommand $createFile

$content = "# 合成計畫`n完成 T1 並留下交接。"
$hash = 'sha256:' + [Convert]::ToHexString(
  [Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($content))
).ToLowerInvariant()
$plan = @{ document_id = 'plan'; revision = 1; content_hash = $hash }
$definition = @{
  id = 'T1'; title = '合成任務'; description = '留下進度與交接'
  scope = $scope; completion_criteria = @('可由另一 session 讀回')
  dependencies = @(); plan_basis = $plan; inputs = @()
  expected_artifacts = @(); decision_ids = @(); workstream = $null
}
$planFile = Join-Path $dir '02-plan.json'
Save-BoardCommand 'plan.revise' $receipt.revision @{
  plan = @{ document_id = 'plan'; expected_document_revision = 0; content = $content }
  execution_impact = 'declared'
  task_changes = @(@{ kind = 'add'; definition = $definition })
  unaffected_task_ids = @(); decision_dispositions = @()
  completion_requirements = @(@{ id = 'R1'; description = '完成任務'; task_ids = @('T1'); document_refs = @() })
  requirement_dispositions = @()
} $planFile
$receipt = Invoke-BoardCommand $planFile
$startFile = Join-Path $dir '03-start.json'
Save-BoardCommand 'workflow.start' $receipt.revision @{} $startFile
$receipt = Invoke-BoardCommand $startFile

node src/Presentation/Cli/main.mjs find --query '[合成]' --json
$context = node src/Presentation/Cli/main.mjs context --workflow $ref.workflow_id --all --json | ConvertFrom-Json
node src/Presentation/Cli/main.mjs document --workflow $ref.workflow_id --document plan --document-revision 1 --hash $hash --json

$claimFile = Join-Path $dir '04-claim.json'
Save-BoardCommand 'task.claim' $receipt.revision @{
  task_id = 'T1'; expected_definition_revision = 1
  session = @{ client = 'cli'; label = 'first-session'; skill_id = $null }
} $claimFile
$receipt = Invoke-BoardCommand $claimFile
$context = node src/Presentation/Cli/main.mjs context --workflow $ref.workflow_id --all --json | ConvertFrom-Json
$assignment = ($context.data.tasks.items | Where-Object id -eq 'T1').assignment.ref
$progressFile = Join-Path $dir '05-progress.json'
Save-BoardCommand 'task.progress' $receipt.revision @{
  task_id = 'T1'; assignment = $assignment; summary = '已確認輸入文件'; evidence = @()
} $progressFile
$receipt = Invoke-BoardCommand $progressFile

$releaseFile = Join-Path $dir '06-release.json'
Save-BoardCommand 'task.release' $receipt.revision @{
  task_id = 'T1'; assignment = $assignment
  handoff = @{
    completed = '已確認文件'; remaining = '完成任務'; next_step = '讀取 plan revision 1'
    artifact_refs = @(@{ kind = 'document'; ref = $plan })
    blockers = @(); limitations = @(); next_actor_hint = $null
  }
} $releaseFile
$receipt = Invoke-BoardCommand $releaseFile
```

新 PowerShell session 重新注入連線設定與秘密，從保存的 command JSON 讀取
`workflow_ref.workflow_id`，執行 `context --all` 與指定版本 `document`。讀取不會
claim；若要承接，明確準備新的 `task.claim`，使用最新 workflow revision 與
task definition revision。新 session 仍是同一個 Agent binding；不是第二個 actor。
若有阻礙，使用 `task.block` 的完整 schema payload，將阻礙與 handoff 同步保存。

## 本機驗證與證據界線

```powershell
npm run test:cli
npm test
npm run build
npm run validate
# Windows 原生認證管理員測試；只建立／移除唯一的合成 profile。
npm run test:windows-cli
```

`test:cli` 啟動 loopback server，以記憶體 SQLite 模擬 D1，並啟動全新的 CLI
子程序執行流程。credential 是測試中公開的固定合成值；不讀取或使用真實
Sites token。輸入命令檔保留於 `.runtime/cli-test-*`。測試的
`--allow-loopback` 僅允許明確的 `127.0.0.1`／`[::1]` HTTP origin，且拒絕設定
Sites token；正式使用保持 HTTPS。

涵蓋 help/version、設定缺漏、完整接手、分頁、精確文件／task／decision、
命令 replay、payload 衝突、revision 衝突、lost response、憑證失效／撤銷、
唯讀 binding、human spoofing 拒絕、輸出秘密遮蔽，以及與 #5 既有 MCP adapter
的等價 context。Worker artifact 驗證包含服務認證接點與原 Sites/MCP 邊界。
這是本機 HTTP／程序／SQL 與 artifact 證據；Sites ingress、真實憑證發放、
線上 header 轉送、hosted D1、一般 MCP client、CI 與產品驗收須分開記錄。
