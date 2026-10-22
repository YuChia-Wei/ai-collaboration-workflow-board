# Local checkout setup

Run every command below from the repository root. Python 3.13 and Git suffice;
there are no package dependencies and no Docker requirement. The Python service
uses synthetic workflow records, loopback HTTP, and a SQLite database.

Local executable source lives in `src/Prototypes/WorkflowRecords/`. Database files, bindings, outboxes,
logs, exports and test evidence default to the ignored `.runtime/` directory.
Existing state in `../ai-collaboration-workflow-board-state/` is historical local
state and is not copied, deleted or migrated by the source reorganization.

```powershell
python -B -m src.Prototypes.WorkflowRecords.demo --runtime .runtime/local
python -B -m src.Prototypes.WorkflowRecords.service --db .runtime/local/records.sqlite --bindings .runtime/local/bindings.json --port 8767
```

Seed only once; it refuses an existing database. Use only the service command on
later starts. Open <http://127.0.0.1:8767/> with fixture token
`demo-writer-local-only`, namespace `demo`, workflow `synthetic-416`.
A phone cannot directly open this computer's localhost.

```powershell
$env:WORKFLOW_TOKEN = 'demo-writer-local-only'
python -B -m src.Prototypes.WorkflowRecords.client --base http://127.0.0.1:8767 context synthetic-416
python -B -m src.Prototypes.WorkflowRecords.client --base http://127.0.0.1:8767 export --output .runtime/local/export.json
python -B -m src.Prototypes.WorkflowRecords.mcp_bridge --base http://127.0.0.1:8767
```

For submit, place command JSON in `.runtime/local/command.json` and supply
`--outbox .runtime/local/outbox.json`. Outboxes must be outside Git or explicitly
ignored and untracked. The client refuses tracked and nonignored source paths.
MCP requires a JSON-RPC stdio client, initialization, and the initialized
notification; see the [local service contract](src/Prototypes/WorkflowRecords/README.md).
Actual coding-agent connections remain unverified.

```powershell
python -B -m src.Prototypes.WorkflowRecords.Tests.test_review_regressions
python -B -m src.Prototypes.WorkflowRecords.Tests.test_acceptance
python -B -m src.Prototypes.WorkflowRecords.Tests.test_layout
```

These commands write evidence beneath `.runtime/evidence/`, use their own random
loopback ports, and preserve source Git state. Acceptance supports existing source
edits but requires that no other process edits the source during the test. Git
head, tree, tracked changes, staged changes and untracked source paths are compared
before and after the runtime scenarios. The tests do not modify the retained
historical demo, Docker or the original framework.

For preflight and restore, use an exported package, a new destination SQLite path
and explicitly supplied new bindings. Original bindings are excluded from exports.
The [local README](src/Prototypes/WorkflowRecords/README.md) documents the restore and atomic-publication
contract. `python -B -m src.Prototypes.WorkflowRecords.package_delivery` retains the historical delivery
packager; its output now defaults to ignored `.runtime/delivery/` and requires
committed source before packaging.

Hosted build and deployment are separate from this synthetic loopback service;
see the repository README and deployment documentation for GitHub Actions.
