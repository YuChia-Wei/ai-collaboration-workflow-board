# Tool operations and public results

Tool `problem-frame-author.fs` is [scripts/problem_frame.py](../scripts/problem_frame.py).
Protocol: `python <selected-package>/scripts/problem_frame.py --request <absolute-json-file>`.
No request string is evaluated as shell text. Python >=3.11,<4, PyYAML >=6,<7,
jsonschema >=4.18,<5 and its referencing dependency are tool prerequisites only.
Missing capability is unavailable. The executable, metadata, owned schema and
template must belong to the explicit selected package; no source fallback.

Every request is one closed object with required `operation`, `project_root`,
`package_root`. Roots are absolute; optional `project_config`, `local_config`,
`overrides`, `write_roots` follow [configuration](configuration.md). A required
operation discriminator is never inferred from other fields. Unknown fields,
null optional settings, duplicate keys and wrong types fail. No credentials,
provider actions, shell commands or approval flags are accepted.

| operation | Additional fields | Successful result (exact keys) |
| --- | --- | --- |
| explain | None | settings, origins, config_version, locked_fields, write_roots, family, schema_version, runtime_capability, tracking, prerequisites |
| create | Required reference, record | structure, record |
| inspect | Required reference; optional expected_sha256 | structure, record |
| validate | Required reference; optional expected_sha256 | structure |
| render | Required reference; optional expected_sha256 | structure, markdown |

Reference selects one **flat store-relative filename**. Create requires exactly
`<record.id>.cbf.json`; nested collections use an explicitly selected store.
This makes identity collision in a store identical to destination collision
without scanning unrelated snapshots. Read operations enforce the same identity
filename after validation; a selected `.yaml`/`.yml` returns unsupported-format
with its observed digest and no parsed record. expected_sha256 must be an exact
lowercase SHA-256 and mismatches return conflict. No query/revise/delete/status/
migration/execution operation exists. create does not accept expected_sha256.

## Response envelope

Every response has exactly:

- `operation`: selected valid operation, or null before request acceptance.
- `outcome`: ok, invalid-input, unsupported-family, unsupported-version,
  unsupported-format, conflict, blocked, unavailable, io-error.
- `changed`: false, true or null when final mutation is unknown.
- `mutation_state`: none, published or uncertain.
- `reference`: accepted logical filename or null.
- `subject_sha256`: digest of bytes actually read, or null when not observed.
- `result`: the operation object above on ok; null on failure.
- `diagnostics`: objects with exactly code/location/message, using logical input
  locations and bounded fixed messages, without unrelated config/source values.
- `residue`: known operation-owned staging filenames relative to the selected
  store, including retained temporary bytes after a cleanup failure.

Exit: 0 ok; 2 invalid/unsupported; 3 conflict/blocked; 4 unavailable/io-error.
`none`/false describes final-record mutation, not an assertion that no staging
I/O occurred: always inspect residue. `published`/true means this call's final
link was observed; errors may accompany it. `uncertain`/null preserves an
ambiguous final outcome. A digest from an invalid read does not imply a valid
structure. No response contains a semantic/runtime compliance claim.

## Public structural result: exact contract

`result.structure` on successful create/inspect/validate/render has exactly:

```text
contract: "problem-frame.cbf.structural-result@1.0.0"
status: "valid"
family: "problem-frame.cbf"
schema_version: "1.0.0"
id: <snapshot identity>
subject_sha256: <SHA-256 of exact bytes read; equals envelope digest>
criterion_inventory: [{id, kind, pointer, scenario_id}, ...]
counts: {statement: <integer>, scenario: <integer>, assertion: <integer>}
unresolved_ids: [<statement or assertion id>, ...]
source_ids: [<source id>, ...]
question_ids: [<question id>, ...]
```

Inventory order is all statements in array order, then each scenario followed by
its assertions in array order. kind is statement/scenario/assertion. pointer is
`/statements/N`, `/scenarios/N` or `/scenarios/N/then/M`. scenario_id is null for
statements and the parent scenario ID for scenarios/assertions. Counts describe
the complete inventory, not satisfied criteria. unresolved_ids lists statements
then assertions in source order. Source/question IDs retain record array order.
There is no structural success object on failure and no private failed-pass
coercion. Consumers must bind the exact owner operation, package/version and
selected raw digest; pointer text comes from the same exact record (inspect).
The contract name identifies an ephemeral public result, not a persisted family.

## Publication and failure boundary

The writer validates the full supplied record and selected package/config/paths
before store writes. All ancestors exist; it never mkdirs. A supported local
backend stages an exclusive random sibling `.cbf-stage-<32 hex>.tmp`, writes
canonical bytes, flushes and fsyncs the file, rechecks selected request/config/
script/schema/template digests and path identities, then publishes with a
no-clobber hard link. Linux uses a directory descriptor; NTFS pins destination
ancestors against rename. Read-back uses the same owner reader and compares exact
bytes; only its digest becomes the successful subject. Cleanup removes only the
owned stage after its identity check. It never truncates the public destination
or uses a replacing rename. Concurrent existing paths, even equal bytes, conflict.

Backend selection is local NTFS on Windows fixed/RAM volumes; on Linux it is
local ext4/xfs/btrfs/tmpfs with directory-relative hard-link support. Other OSs,
network filesystems, unrecognized mounts, missing primitives or failure to pin
ancestors yield unavailable. No drive discovery, cross-volume relocation,
publication probe or fallback filesystem is used. Backend selection is not an
empirical compatibility or durability guarantee; callers must observe actual
operations on their filesystem. Read operations apply the same local filesystem selection and require regular
selected paths; they do not probe or perform publication.

Read-back or cleanup failure after linking remains published or uncertain with
non-ok outcome. A killed process may leave final and/or stage without a response;
callers inspect exact destination and known residue before choosing a fresh ID.
No automatic recovery, directory-wide cleanup, journal, power-loss durability or
multi-file atomicity is claimed. Requests require caller task authority and a
stable directory ownership boundary; rechecks are not a general hostile-writer
sandbox. Source references stay inert and target code is never executed.
