# Lesson filesystem operations 0.2.0

This is a public source interface. `implemented` means source exists; it does
not establish installation, tested platform support or observed execution.
Dependencies: Python >=3.11,<4, PyYAML >=6,<7, jsonschema >=4.18,<5 (except explain),
explicit filesystem roots, and an instruction reader. No skill dependencies,
provider calls, shared runtime or imports from another package.

## Request and result

```text
python /absolute/package/scripts/lesson.py --request /absolute/request.json
python /absolute/package/scripts/lesson.py --request -
```

The second form reads one JSON object from stdin. Required common fields are
`operation`, absolute `project_root`, absolute `package_root`. Optional fields:
`project_config`, `local_config`, `overrides`, `write_roots`; see
[configuration](configuration.md). Unknown owned fields fail. JSON is strict
UTF-8 without BOM, duplicate keys, invalid Unicode or nonfinite values. Metadata
YAML additionally rejects explicit tags, aliases, anchors and merge keys.
Every selected input, request and serialized record is bounded to 4 MiB.
Schema refs are bounded acyclic local `#/$defs/...` only; no resource fetching.

`reference` is exactly `{"role":"lesson.record","id":"lesson-<32 lowercase hex digits>"}`.
It selects `<store>/<id>.lesson.json`. Updates require lowercase 64-hex
`expected_sha256` of the ACTUAL raw record bytes. The tool, not the caller,
generates identities, snapshots, timestamps, histories and observations.
Reasons are nonblank. `content` is a full owned object, never a generic patch.
Optional `extensions` is allowed only at create/propose, is a JSON object keyed
by dotted namespaces, and cannot later be edited or removed through this tool.

Stdout is one UTF-8 JSON result with `operation`, `outcome`, `mutation_state`.
Exit 0 means `succeeded`; unsuccessful operations exit 1. Ordinary `--help` is
argparse usage text and grants no capability. Outcomes: `invalid-input`,
`unsupported`, `unavailable`, `blocked`, `conflict`, `failed`; a dispatcher may
report `not-executed` if it never invoked the tool. Diagnostics contain code and
plain message, without echoing arbitrary inputs or exception text.

| Operation | Required additional fields | Optional additional fields |
| --- | --- | --- |
| explain | None | None |
| query | None | `text` (default empty), `statuses` |
| inspect / validate / render | `reference` | None |
| create | `content`, `text`, `decision` | `statuses`, `extensions` |
| revise | `reference`, `expected_sha256`, `content`, `reason` | None |
| derive | `reference`, `expected_sha256`, `reason`, `text`, `decision` | `statuses` |
| accept | `reference`, `expected_sha256`, `reason`, `decision_source` | None |
| retire | `reference`, `expected_sha256`, `reason` | None |
| supersede | `reference`, `expected_sha256`, `reason`, `successor` | None |

All writes require actual task authority. A JSON field, record, template or local
actor string cannot authorize an action. Read results include exact record digest,
store, reference and compatibility. Inspect adds the record and labels observations
historical; successor freshness is `matches-captured`, `stale` or `unresolved`.
Validate adds `valid: true` only after structural AND owned semantic checks;
invalid records return failure, never approval. Render returns a result-only
`view` with role/source/schema, historical freshness and escaped Markdown.
Persisting/exporting that view is a separate caller-owned write.

Writes return `reference`, persisted-byte `sha256`, `store_root`, `changed` and
`directories_created`; new identities also return the actual `related_query`.
An uncertain/failed publication retains
reference and intended digest when available. Read results do not rewrite data.

## Query before a new identity

Query selects at most 10,000 direct `*.lesson.json` files, never recursively.
An absent store is empty. Results have stable filename order, `matches`, exact
`text`, normalized `statuses`, selected count, partial diagnostics and
`query_sha256`. Matches include reference, title, status, schema version, raw digest
and compatibility. Unsupported/malformed/unreadable records remain present in the
query inventory and make the result partial; partial-empty is no absence proof.
Search is case-insensitive literal substring over title/observation/conclusion.
Omitted statuses means all supported statuses; an explicit array is nonempty,
unique and contains only supported values.

Before create/propose/derive, inspect the actual query and choose a new identity
using the SAME text/status selection and this shape:

```json
{"action":"new","query_sha256":"<actual query digest>","acknowledge_partial":false,"reason":"Distinct evidence and applicability after reviewing the query."}
```

Placeholders are not valid hashes. A partial query needs an actual caller decision
and `acknowledge_partial: true`. Rerun the query under the store lock and compare
its digest before publishing. Changed inventory/query => conflict; return the
rerun as `related_query`. A query is not a content uniqueness proof.

Digest version 2 hashes sorted-key, indent-2, non-ASCII UTF-8 JSON plus LF over
`query_version`, normalized absolute `store_root`, exact `text`, sorted `statuses`,
`read_schemas` and filename-sorted `inventory`. Readable files bind raw digests;
invalid entries also bind their error code; unreadable entries bind name/error
only. Nonmatches participate. Earlier query versions cannot authorize creation.
No snapshot claim is made against external editors ignoring the lock.

## Retention and one-record publication

New records start at revision 1, initial status, equal actual creation/update times,
empty history/provenance and null lifecycle facts. Every material update increments
revision and appends operation, reason, prior revision/status/state/raw digest and
actual event time. It retains removed content and old evidence. Prior digest is a
historical observation, not reconstructable prior serialization or authentication.
Times cannot regress. Equal authored content is a byte/time-preserving no-op;
no revision/history is appended. Extensions are immutable. Unknown versions are
preserved and unsupported; no deletion, bulk conversion or history compaction.

Resolve explicit bindings first. A writer exclusively creates
`<store>/.lesson-write.lock` with an invocation token; existing locks are conflict,
never auto-recovered. After locking, validate content/state/evidence and all frozen
inputs, serialize within 4 MiB to a unique same-directory temp, fsync/close, then
publish new identities with an exclusive hard link or update via atomic replace.
Expected digests are rechecked under lock and immediately before replacement.
Only the owned token/inode/temp is cleaned. Retained directory creation is reported.
Cleanup failure overrides success to failed and never implies rollback.

`mutation_state` describes record publication: `none` before publication/no-op,
`committed` after complete publication/read-back, `unknown` on uncertain publication.
It excludes transient lock/directory writes. Reread before retrying failed writes.
Windows writes require local fixed/RAM NTFS; Linux requires an observed local
ext2/ext3/ext4/xfs/btrfs/tmpfs/ramfs mount. Other/unproven/network backends fail
unsupported; no trial files or fallback disk. This is code scope, not platform
certification, power-loss durability or cross-file transaction support. Only
cooperating writers are serialized; hostile/external editors remain outside it.

## Template boundary

The [default template](../templates/lesson.md) is inert UTF-8 text. Tokens use
literal `{{token}}`, are replaced once, and cannot execute expressions, includes,
HTML or path interpolation. Text is HTML/Markdown-escaped; arrays/objects are
escaped JSON in authored order, not executable blocks. Missing, unknown or malformed
tokens fail render. Repetition is allowed. Templates are read for every operation;
token completeness is checked by render. Custom templates alter presentation only.
Require id, schema_version, all authored content fields (title, observation, evidence, conclusion, applies_when, does_not_apply_when, confidence, follow_up), plus
status, history and provenance for current records. decision is optional but included
in the default view; legacy v1 permits the original content-only template.
Only those tokens and decision are allowed. Derived/decision/successor state is
retained in the record even if a custom presentation omits an optional token.


## Lesson content, lifecycle and compatibility

Writable schema: [lesson.record@2.0.0](../schemas/lesson-record-v2.schema.json).
Authored content has title, observation, evidence, conclusion, applies_when,
does_not_apply_when, confidence, follow_up. Strings are nonblank; text arrays
preserve order, applies_when is nonempty. Evidence rows are `{source,note}` with
inert references. Empty evidence requires `tentative`; `supported` requires an
item but remains a content claim, never proof of causation/approval.

Create -> candidate; candidate revise -> candidate; accept -> accepted only after
actual mapped decision read-back. Candidate or accepted may retire, or supersede
with an accepted same-store Lesson. Retired/superseded cannot mutate; accepted
content cannot revise. Every decision preserves exact evidence and project binding.
Accepting a Lesson never makes it a project rule.

Legacy [lesson.record@1.0.0](../schemas/lesson-record.schema.json) retains its
unchanged schema and bytes. Inspect/query/validate/render support mixed v1/v2
stores with `compatibility: read-only-legacy`; all v1 updates fail unsupported.
Explicit derive from either supported version copies authored content/extensions
into a NEW v2 candidate, resets decision/state and retains exact source snapshot,
identity, version and store. The source remains untouched. No in-place, automatic,
bulk or Markdown conversion. Legacy tools can reject v2 records/config.

## Successor boundary

`successor` is `{reference,expected_sha256}`. Select a distinct supported record in
the SAME store/family, accepted (Lesson/ADR) or proposed (promotion). Promotion also
requires the same captured target/config binding. Read, validate and pin its actual
bytes; refuse a changed/missing/malformed chain, cross-store reference or cycle.
Traversal is bounded at 1,000 links. Publication updates only the predecessor;
no reverse link, successor mutation or multi-file transaction is inferred.
Historical snapshots remain evidence if a live successor later changes; inspect
reports its freshness separately. Derivation/supersession never imports authority.
