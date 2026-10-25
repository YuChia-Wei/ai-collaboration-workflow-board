# Source replica / 1

`workflow-board/source-replica/1`, schema `1.0`, is an additive project-scoped
source copy contract. SQLite or another selected external source remains the
write authority. Original status, title, metadata, mapping, file modes and raw
bytes are data. No command claims or completes a native collaboration task.
Existing global source tables and `/api/source-import` are unchanged; that old
route remains forbidden. Git history outside the selected snapshot is not copied.

## Identity and transport

POST `/api/source-replica/v1/commands` or `/queries` with JSON. Every envelope has
`service_contract_version`, `schema_version`, `project_ref`, `command` or `query`,
and `payload`. Commands also require `operation_id` and `expected_revision`.
`project_ref` is `{store_id, namespace:"personal", project_id}` and must identify
an existing non-legacy V2 registry project under the trusted authenticated owner.
The existing browser/Sites binding, service credential and MCP ingress resolve
identity; request payloads cannot establish owner/actor/capabilities. Read requires
`read`; commands additionally require existing `plan`. No new sharing, ACL, admin,
SQL or human-review authority is introduced.

MCP names are `source_v1_` plus the operation with dots replaced by underscores.
The CLI's existing `query --file` / `submit --file` accepts this contract with
explicit `--project`, `--store` and `--namespace personal`. Persist each exact
command file before first dispatch. On unknown outcome retain that same file,
operation ID and expected revision, query `replica.operation.get`, and replay the
same complete command; never adjust a pending command to a new head.

## Commands

Each command payload includes `source_id`, `workflow_id`, `source_revision`, all
stable opaque identifiers (1–160 ASCII ID characters). A source revision may be
a Git commit or SQLite logical snapshot ID; Git is not mandatory.

- `replica.begin`: also `manifest_hash`, `manifest`.
- `replica.chunk.put`: also `chunks`, an array of `{path,index,content_base64,
  chunk_hash}`. The batch is atomic, including its single receipt.
- `replica.activate`: also `manifest_hash`.

A manifest contains `source` object, `workflow` object with `id`, `title`, `status`,
and `files` array. Each file requires `path`, six-octal-digit `mode`, `size` (raw
byte count), `sha256`. Additional fields inside the manifest, source, workflow,
and file records are preserved. Workflow ID must equal the payload workflow ID.
Paths use relative `/` segments; absolute paths, backslashes, colon, control
characters, empty/dot/parent segments and exact duplicate paths are rejected.
Uploaded paths are never written to a filesystem. Modes are preserved as data;
symlinks are not followed. Raw binary uses canonical padded base64.

Hashes have prefix `sha256:` and 64 lowercase hex digits. Chunk hashes cover raw
bytes, not base64 text. File hashes cover concatenated raw chunks in index order.
Manifest hash covers UTF-8 canonical JSON: keys sorted by UTF-16 order, JSON
escaping, no Unicode normalization, safe integer numbers only, no negative zero.
This is the repository's `canonicalJson` / `valueDigest` convention. Unknown
fields remain included in the hash. Original blob bytes must be read without
checkout newline conversion.

Expected revision is the Board head revision for `(owner,store,project,source,
workflow)`; initial value is 0. Begin and chunk commands preserve it; activation
increments it. Operation keys are `(owner,store,project,operation_id)` across
all source-replica command types. Principal-bound digest replay happens before
CAS. Same ID with changed scope/payload conflicts. Rejected CAS receipts are
persistent. Invalid manifests, missing chunks and corrupt content cannot publish.
A version's manifest and chunks are immutable; a conflicting content write fails.
Activation validates every complete file before a transactional CAS updates the
head and stores the receipt. Failed or interrupted staging leaves the previous
published version visible. Earlier published revisions remain readable.

## Queries

All queries include the envelope `project_ref`:

| Operation | Payload | Result |
| --- | --- | --- |
| `replica.capabilities` | `{}` | Project, available operations, exact limits |
| `replica.list` | `{limit,cursor:null}` | Current published workflow summaries, opaque owner/project-bound cursor |
| `replica.read` | Source/workflow/revision IDs | Complete metadata excluding files, manifest hash/count/bytes and Board revision |
| `replica.manifest` | Same IDs, `offset`, `limit` | Fixed-version file records, total, offset, has_more |
| `replica.file.chunk` | Same IDs, `path`, `index` | Raw-base64 chunk and raw-byte hash |
| `replica.chunks.read` | Same IDs, `refs:[{path,index}]`, `max_response_bytes` | Bounded chunks, `has_more`, remaining refs |
| `replica.operation.get` | `{operation_id}` | accepted / rejected / unknown and original receipt when known |

Read responses include the exact project/source/workflow/source revision. Reads
of staging versions are unavailable. A manifest page plus the metadata from
`replica.read` reconstructs the original manifest and hash. Empty files have zero
chunks; their SHA-256 still verifies. Batch read callers must follow `remaining`
until empty, verify each chunk hash and reconstructed file size/hash, then verify
manifest hash/count. A cursor from a different owner, project, store or page size
is refused; there is no global project/source fallback.

## Bounds and operational limits

| Bound | Value |
| --- | ---: |
| Request UTF-8 canonical JSON | 300000 bytes |
| Manifest canonical UTF-8 JSON | 240000 bytes |
| Raw chunk | 49152 bytes; final chunk is exact remainder |
| Chunk write batch / read references | 32 maximum |
| File | 16777216 raw bytes |
| Workflow version | 33554432 raw bytes |
| Files per version | 1000 |
| List / manifest page | 50 maximum |
| Batch read response budget | caller specifies 70000–300000 bytes |

The request bound still applies to batches: four full chunks fit, while up to 32
small chunks can share a request. Listing also caps response content and may
return fewer than requested. Pagination does not omit remaining rows. Manifest
bytes bound header/manifest reads. D1 storage, request quotas and ingress account
limits remain host-owned; these local bounds do not promise unlimited capacity.
Staging and immutable history are retained; no implicit pruning/cleanup exists.
The copy does not provide whole-Board restore (#6), a writer cutover or a complete
Git commit history. Production migration/deploy/import and real client acceptance
are separate from local test evidence.

Browser entry `?view=source-replica` uses the existing project registry and requires
an explicit project selection. It shows original status/title/source revision,
completeness, raw metadata and verified text/binary downloads. The fixed-revision
field can open an older saved source revision without choosing the latest head.

## Reviewed transport and activation bounds

The source-only HTTP route validates this exact profile, schema and route kind
before the generic application dispatcher runs. Foreign collaboration/1 or /2
envelopes cannot create native workflows/projects through a replica endpoint.
Portable response `$defs` describe each query result and receipt. The CLI checks
these shapes plus exact source/workflow/revision, page offsets, chunk references
and hashes, operation/outcome and command receipt identity. Misrouted or partial
command receipts preserve an unknown outcome and the unchanged original request.

Activation privately reads exact manifest references through bound `json_each`
parameters, preserving manifest order. Each SQL read is capped at 64 references
and 2097152 raw chunk bytes; the implementation retains one file reconstruction
buffer plus one bounded chunk batch. Missing, extra, duplicate or wrong returned
references fail validation before activation. Hash, size and transactional CAS
checks remain in effect.

At the allowed version/file-count limits there are at most 1682 chunks. A batch
closed by its byte bound contains at least 42 references and more than 2048000
raw bytes, so there can be at most 16 such batches. With `C` count-closed and `B`
byte-closed batches, `64*C + 42*B <= 1682`; therefore at most 31 closed batches plus
one final batch require **32 chunk SQL reads**. A deterministic 1000-file/32-MiB
planner test attains this bound. Registry, receipt, version/head reads and the
transaction statements are additional. Actual hosted request/query limits remain
unverified; this bound is not hosted tier acceptance.
