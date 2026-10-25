# Issue 24 implementation evidence

Scope: one source-replica slice, authority supplied by the parent for
[Issue 24](https://github.com/YuChia-Wei/ai-collaboration-workflow-board/issues/24).
Base `b100c9f9bd09b2a1c125c8b511f06defeb29c556`, branch
`codex/project-source-replica`. No native lifecycle import or writer cutover.
Contract and exact limits: `src/Contracts/SourceReplicaV1/README.md` and schema.

The implementation adds immutable staged versions/chunks, scoped operations,
current heads and opaque list cursors through five additive D1 tables. All SQL
remains in the outbound repository; existing WebApi composition selects it.
Principal-bound digest replay precedes CAS. D1 batch preserves activation/receipt
atomicity; chunk batches validate before write and cannot mutate published bytes.
Source data never becomes an actor capability or native task transition.

Local evidence (2026-10-25): source scenarios include full 219-workflow,
1931-file, 19427791-byte synthetic batch upload and complete byte readback.
These are generated workload bytes, not a claim about historical import contents.
Real HTTP and MCP entry-point tests cover begin/chunk/activate, immutable read,
authentication, replay and unchanged forbidden old import route. Local SQLite
transactions exercise interrupted activation, committed-response loss, CAS loser,
bad chunk/file hash, missing chunks, duplicate paths, project/owner/store scopes
and preserved older versions. Browser verifies fixed source refs, full manifest
hash and downloaded bytes. New MCP tools retain read/plan capability filtering.

Validation commands and final outcomes are returned to the parent integration
owner. Production D1 migration, Sites deployment, real credential/client plugin
acceptance, public delivery and actual historical data import remain unexecuted
by this worker. No Git commit, push, PR or Issue mutation is authorized here.

## Independent review repair of 89f6dd35

Two P2 findings were accepted for repair: the source-only HTTP route could dispatch
foreign native envelopes, and the source CLI accepted incomplete/misrouted result
identities. The repair adds pre-dispatch source profile/schema/kind validation,
operation-specific response schemas and exact CLI identity/hash/page checks.
Focused adversarial cases include foreign native writes, same-project stale source
versions, wrong chunks, partial shapes and mismatched accepted/rejected receipts.

An approved private repository port replaces per-chunk activation SELECTs with
bound JSON reference batches (64 refs / 2 MiB raw bytes). The deterministic worst
case is 32 chunk SQL reads under existing public limits. This is additional to
registry/operation/head reads and mutation statements, and does not establish a
hosted D1 request budget. Existing transactional and raw-byte integrity tests remain
applicable. No public request shape or capacity limit changed.
