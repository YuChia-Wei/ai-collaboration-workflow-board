# Selected installed requirement knowledge

For requested knowledge coverage, take the caller's explicit canonical
`project_root`, externally observed raw `expected_lock_sha256` for
`.ai/framework.lock`, installed selection/lock, capability `requirements`,
the current operation (`explore`, `draft` or `normalize`), execution mode, affected paths/file types, technology,
requested coverage and permitted target authority inputs. Supply `authorities`
as the exact deduplicated closed `{path, sha256, selector}` allowlist from
selected bindings; duplicate (path, selector) or a raw-hash mismatch is invalid.
Do not infer technology from a file suffix or select a package implicitly.

Use the read-only
`distribution.catalog.read_installed_resources(project_root, expected_lock_sha256, authorities)`
through the verified engine-2 source closure in an isolated `-I -B` host, or
follow that same installed-file reader protocol without introducing a second
lock/metadata parser or ambient source-checkout import. The reader verifies the
complete installed lock-2 identity and member closure, managed state and raw
authority hashes. An absent/legacy lock, stale identity, drift, unsafe path or
undeclared authority raises `InstallationError` or `DistributionError`;
there is no partial index. Without a verified index, continue only unaffected
common work and report requested specialist coverage unavailable or blocked.
Never fall back to source-tree package links or save configuration implicitly.

The successful reader returns exactly `lock_sha256`, `candidate_identity`,
`desired_sha256`, `resources`, `bindings`, `authorities` and
`semantic_applicability: target-owned`. Each resource row gives package,
version, resource_id, installed member path, raw SHA-256 and the closed Resource
(kind, rule_ids, capabilities, operations, technology_profile). Bindings are
the exact saved selection rows. Returned authorities have
`status: raw-hash-matched`; semantic applicability remains target-owned.

Treat metadata-4 `knowledge_consumption` resources as an allowed set, not an
instruction to load all of them. Intersect it with the verified selected
packages/resources, saved bindings, matching capability/operation/execution-mode,
path-prefix, technology-profile and file-type selectors, and this task. Read
only needed installed `.ai/core/knowledge/<id>/<member>` bytes with bounded
direct reads matching the returned raw SHA-256. Re-observe the exact lock,
markers and authority hashes around those reads; discard the result on drift.

Knowledge explains and examples illustrate. Normative rules require adopted
binding and the existing target-owned resolver/gate; an index or source catalog
grants neither applicability nor approval. A selected resource without a
matching binding supplies no adopted normative coverage. Preserve conditional
rules as conditional, and let the named target owner interpret authority
selectors and predicates. Stale, ambiguous or conflicting target authority
blocks the affected normative judgment. Do not re-request adoption for an
unchanged saved binding.

Return a transient result with `status` (available, unavailable or blocked),
`loaded_resources` (package, version, resource_id, member, sha256, use_as),
`applicable_rule_ids`, `conditional_rule_ids`, `authorities` (path, sha256,
selector), `coverage` (capability, operation, technology_profile, status,
missing) and `diagnostics` (code, relative_path_or_null, reason,
next_action). Name each missing package, resource, authority, rule or target
predicate required for requested coverage. Optional absence is unavailable;
required specialist gaps cannot be reported as covered. Continue unaffected
common work with that limit disclosed. Persist only when the actual task
authorizes a destination; no new record family or implicit config write.
