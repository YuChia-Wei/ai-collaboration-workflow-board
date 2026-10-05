# Workflow record service — #416 P0/P1 local prototype

This standalone repository contains runnable code, a browser UI, a real HTTP CLI,
and an MCP stdio bridge. It uses **synthetic data only** and never creates external
issues, publishes a site, runs arbitrary SQL, or executes evidence commands.
Python 3.13 and Git are sufficient; there are no package dependencies. Docker is
not required. Binding is strictly `127.0.0.1`.

For this installed checkout, follow [LOCAL-SETUP.md](LOCAL-SETUP.md) for its
dedicated sibling state directory and port 8767. The paths below are generic
examples; do not initialize Git again in this clone.

## Start on Windows / PowerShell

From this repository directory:

```powershell
python demo.py --runtime ../runtime
python service.py --db ../runtime/records.sqlite --bindings ../runtime/bindings.json --port 8765
```

The seed command refuses to overwrite an existing store. When `../runtime` is
already present, run only the service command. Open <http://127.0.0.1:8765>.
The demonstration writer token is `demo-writer-local-only`, namespace `demo`,
workflow `synthetic-416`. These public fixture values are for loopback synthetic
testing only. Tokens are not stored in the browser or exported; binding files
remain outside source Git. No production authentication is claimed.

Click **載入完整 context**, select an operation, edit the JSON payload, check the
expected revision, and submit. After a successful operation, click **新 operation
ID** before a different write. Reuse the identical command/ID only when reconciling
a lost response. Documents support `create`, `revise`, `rename`, `archive`;
final documents require an explicit `erratum`, `addendum`, or `successor` revision.
The first revision and tombstones remain readable. The UI is a record editor,
not a task board or dispatch engine.

## HTTP CLI examples

```powershell
$env:WORKFLOW_TOKEN = 'demo-writer-local-only'
python client.py context synthetic-416
python client.py list
python client.py export --output ../runtime/export.json
```

Create `../runtime/command.json` with the current workflow revision:

```json
{
  "namespace":"demo", "workflow_id":"synthetic-416",
  "operation_id":"sample-log-001", "expected_revision":10,
  "type":"log", "client":"http-cli", "session":"new-local-session",
  "payload":{"text":"Synthetic continuation from a fresh session."}
}
```

```powershell
python client.py submit ../runtime/command.json --outbox ../runtime/outbox.json
python client.py operation sample-log-001
```

Outbox files are rejected if inside **any Git tree**. Statuses are `pending`,
`accepted`, `conflict`, `rejected`. A lifetime bound of three attempts persists
across sessions; exhausted entries remain visibly pending until a bounded read-only
receipt reconciliation confirms acceptance. Exhaustion never permits another POST.
Before retry, the CLI
queries operation receipt; a mismatched command hash becomes a conflict. Permission
denials stop retries. There is no fallback to Git or a different identity.

## API surface and atomicity

All three interfaces share `Store.command()`:

| Read | Purpose |
| --- | --- |
| `GET /v1/workflows?namespace=demo&external_link=...` | Find records by relation |
| `GET /v1/workflows/{id}/context?namespace=demo` | Complete context, original revisions, full index, explicit missing documents |
| `GET /v1/documents/{id}/{revision}?namespace=demo&workflow_id=...` | Exact original revision |
| `GET /v1/operations/{id}?namespace=demo` | Accepted receipt and payload hash |
| `GET /v1/events?namespace=demo&after=0` | All subsequent events |
| `GET /v1/export?namespace=demo` | Consistent portable export |

Writes use `POST /v1/commands`, bearer binding, `operation_id`, `type`,
`workflow_id`, `namespace`, `expected_revision`, and `payload`. Allowed commands:
`create_workflow`, `update_workflow`, `add_step`, `update_step`, `document`, `log`,
`handoff`, `evidence`, `approve`. Unsupported ACL/publish/SQL/provider commands
are denied. Client/session labels are self-reported metadata, not authenticated
agent identity. Read/write/approve/export roles are separate. Approval requires
a final document and a principal that has not authored document events for the
workflow; this is deliberately conservative.

SQLite `BEGIN IMMEDIATE` encloses workflow mutation, every document revision,
blob reference, event, and operation receipt. Existing accepted operations are
checked **before** revision CAS. A same-ID different payload or principal fails.
Rejected operations leave no accepted event/receipt. The whole workflow revision
is the concurrency unit, including independent documents/steps. This simplifies
correctness at the cost of more conflicts under high concurrency.

Every command validates the merged candidate aggregate, including already
completed records. Terminal workflows may receive valid logs and document
addenda, but cannot gain unfinished steps or lose required documents/results/
evidence. Evidence needs nonblank command/result/source provenance, a recognized
outcome (`passed`, `failed`, `interrupted`, `blocked`) and a nonempty scalar-valued
environment. Valid failure evidence remains eligible for a completed investigation
whose result explicitly records that failure. Empty shells cannot satisfy completion.
CAS revisions are integers (booleans are rejected). Context reads state and events
from one SQLite read transaction; WAL allows a concurrent writer to commit without
mixing the reader's two snapshots.

The new prototype lifecycle is explicitly `planned → active → completed`, with
`active ↔ blocked`; completed is terminal. Completed steps require a nonempty
result plus existing evidence. Completed workflows require all steps complete and
all declared required documents present. Historical source lifecycle is preserved
as provenance, not silently reinterpreted or migrated.

## MCP stdio bridge

```powershell
$env:WORKFLOW_TOKEN = 'demo-reader-local-only'
python mcp_bridge.py --base http://127.0.0.1:8765
```

The bridge implements MCP JSON-RPC stdio framing, initialization and `tools/list`
and `tools/call` for `workflow_context`, `workflow_command`, `operation_result`,
targeting protocol `2025-03-26`. Configure a chosen client's stdio server to launch
this file and provide the local fixture token through its environment. No actual
Codex/Claude/Gemini configuration was modified or connected. The acceptance run
uses a real HTTP CLI subprocess A that exits, then a fresh MCP JSON-RPC client B
subprocess; it is **protocol integration**, not full coding-agent E2E.

## Export, preflight, clean restore

`export.json` includes manifest/schema version, consistent cutoff sequence,
workflows and IDs, all document revisions, tombstones, operations, events, source
and old references, role mapping, and actual attachment bytes encoded as base64
with SHA-256 hashes. It excludes bearer tokens/binding secrets. Imported identity
roles are descriptive only: new local bindings must be supplied. Do not place
real secrets in workflow documents; this prototype accepts synthetic content only.

```powershell
python service.py --bindings ../runtime/bindings.json --preflight ../runtime/export.json
python service.py --bindings ../runtime/rebound-bindings.json --db ../replacement/records.sqlite --restore ../runtime/export.json
python service.py --bindings ../runtime/rebound-bindings.json --db ../replacement/records.sqlite --port 8766
```

Restore rejects an existing target, invalid package/blob/revision hashes, broken
relationships, event revision gaps, unsafe flags, and missing explicit new writer
bindings. It never replays commands or external effects. No leases are used.
The test shuts down the original HTTP server, renames its DB as disabled, restores
into a new SQLite file, compares all durable data, rejects old tokens, and appends
a new event on the replacement. Role rebinding intentionally changes credentials.
This demonstrates a clean portable local store, not D1 or PostgreSQL portability.

Preflight also verifies complete receipt identity/hash/accepted state against its
operation and event, command relationships, historical role mappings, lifecycle,
completion invariants, and approvals. It applies the local-only reducers in an
isolated in-memory SQLite store to compare authored semantic state and blobs with
the supplied snapshot; this validation does not replay external side effects or
write the target. Service-generated timestamps are retained in the package but
excluded from the semantic replay comparison. Historical role descriptions are
preserved across restore/export and never authorize current tokens.

Restore builds a unique same-directory `.restore-*.sqlite` file, imports and checks
all durable tables, closes/checkpoints/flushes it, and atomically publishes with
`os.link` without overwriting an existing target. Interrupted preparation can leave
an identifiable temporary orphan, but cannot publish an empty final target; retries
create a new temporary file. A target publication race preserves the other owner's
file. Unsupported hard-link filesystems fail closed; no unsafe overwrite fallback
is provided. Only this restore's temporary files are cleaned up.

## Reproduce acceptance

The delivery ZIP includes tracked source and `../prototype.bundle`, without a
host `.git` directory. Before running tests, restore the isolated local history
from inside `prototype` (no network or remote is configured):

```powershell
git init
git config core.autocrlf false
git fetch ../prototype.bundle main
git reset --mixed FETCH_HEAD
```

Delivery history uses a synthetic author/committer for privacy; commit IDs differ
from the original reviewed repository, but every source tree is unchanged. The
manifest distinguishes `prototype_sha` from `portable_history_sha` and records
their identical trees. Original local history is retained without rewriting.

```powershell
python test_acceptance.py
python test_review_regressions.py
```

Use a clean source commit. Output/logs/SQLite/outbox/export artifacts go into
`../evidence/run-<UTC>/`, outside source Git. The suite performs 10 integration
scenarios plus Git/reference before-after evidence; source files have no runtime
record diff. Fixture evidence commands are descriptive synthetic strings and
are never executed. The first failed Windows restore attempt is retained in the
delivery evidence along with the corrected passing run.

There are no external executor claims, deployments, sharing, real account login,
company data, real workflow migration or deletion. AC08 requires P2 authorization;
AC09 is N/A; AC10 is a synthetic rehearsal, with real migration deferred to P3.
See `PLATFORM-CONTRACT.md` for Sites preparation and remaining approval boundaries.

Required document retirement: archive is rejected with HTTP 422
`required_document_archive_forbidden` while the document ID is in the workflow's
current `required_documents` index, in every lifecycle state. The rejection keeps
the document, revisions, workflow, events and receipts unchanged; the required
document remains usable and the workflow can complete normally. This prototype
does not support retiring a document created with `required: true`; no new
restore/replacement API is implied. Optional documents can still be revised and
archived, retaining their tombstone and every revision through export/restore.

The original 10 passing scenarios did not discover all defects. Independent review
of `3fd0902` found R1-R7; the 14 review-derived regression/control scenarios now
cover their specific counterexamples (including process interruption and receipt
insert failure). Author test success is not independent review acceptance. The
updated report identifies the fixed immutable subject and second-review status.
Second review closed R1-R7 and found R8 (required archive trapped an active
workflow). Regression 15 tests the explicit archive rejection over actual
HTTP, continued completion, optional tombstones and exact export/restore.
Focused independent verification of `f031223` closed R8, with six separate
scenarios plus an independent rerun of regression 15. These are distinct from
the author's 15 regression and 10 integration scenarios. Final packaging changes
only this README and the packager; runtime behavior remains the reviewed version.
