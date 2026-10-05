# Local checkout setup

This checkout retains the complete original local development Git history through
`50b608d5b1fdb7a1e558982c4c51b321653fb981`. The source checkout and its running
demo remain intact. `origin` is the requested GitHub repository; nothing was pushed.
It remains a synthetic-only workflow record service, not a task board.

From this repository, use the dedicated sibling state directory. All database,
blobs, bindings, outbox, logs, exports and verification output stay outside Git.
The existing delivery report/ZIP/manifest/review evidence is in
`../ai-collaboration-workflow-board-state/delivery/`.

```powershell
python demo.py --runtime ../ai-collaboration-workflow-board-state/runtime
python service.py --db ../ai-collaboration-workflow-board-state/runtime/records.sqlite --bindings ../ai-collaboration-workflow-board-state/runtime/bindings.json --port 8767
```

Seed only once; it refuses an existing database. Use only the service command on
later starts. Port 8767 avoids the earlier retained demo on 8765. Open
http://127.0.0.1:8767/ with fixture token `demo-writer-local-only`, namespace `demo`,
workflow `synthetic-416`. A phone cannot directly open this computer's localhost.

```powershell
$env:WORKFLOW_TOKEN = 'demo-writer-local-only'
python client.py --base http://127.0.0.1:8767 context synthetic-416
python client.py --base http://127.0.0.1:8767 export --output ../ai-collaboration-workflow-board-state/runtime/export.json
python mcp_bridge.py --base http://127.0.0.1:8767
```

For submit, put command JSON outside Git and supply
`--outbox ../ai-collaboration-workflow-board-state/runtime/outbox.json`.
MCP requires a real JSON-RPC stdio client, initialize and initialized notification;
see README. True coding-agent connections are still unverified.

```powershell
$env:P1_EVIDENCE = '../ai-collaboration-workflow-board-state/evidence'
python -B test_review_regressions.py
python -B test_acceptance.py
```

Run tests from this repository. The suites use their own random loopback ports;
they do not change the retained demo, Docker or the original framework.
For preflight/restore, use service.py with the sibling export path, a **new**
destination SQLite path outside Git, and explicitly supplied new bindings.
Original bindings are not part of exports. README describes the restore contract.

No package installation or Docker is needed. Python 3.13 and Git suffice.
The inherited README's bundle-init commands apply only to ZIP extraction, not
this already initialized clone. package_delivery.py describes the archived P1
delivery fixture layout; it is not needed to start or test this checkout.
Sites/deployment/sharing and real migration remain outside authorized scope.
