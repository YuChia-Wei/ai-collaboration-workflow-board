# Review a fixed architecture artifact

## Selected installed knowledge for review

For requested knowledge coverage, take the caller's explicit canonical
`project_root`, externally observed raw `expected_lock_sha256` for
`.ai/framework.lock`, installed selection/lock, capability `architecture`,
operation `review`, execution mode, affected paths/file types, technology,
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

Bind the path/version and digest, or quote bounded inline input, before review.
Record requirements, decisions, quality constraints and coverage separately:
artifact claims cannot validate themselves. Leave the subject unchanged. If
revision is also requested, finish this result before [design](design.md)
revises it; a later review must bind the revised subject.

Apply relevant common criteria and selected target rules. Missing authority
blocks the affected judgment. This package has no technology extension; report
missing selected specialist coverage and do not substitute common reasoning for
a required specialist gate. A different valid style, unadopted CQRS or absence
of a speculative abstraction is not a defect.

| Criterion | Evidence and questions |
| --- | --- |
| Requirements and quality | Bind decisions to requirements/ACs and measurable constraints. Which workload/availability claims remain assumptions? |
| Responsibility and language | Does each context/module have an owner, coherent vocabulary and purpose? Are disputed terms or shared responsibilities explicit? |
| Dependencies and ports | Does dependency direction protect business decisions? Are external adapters isolated where needed? Does each abstraction have a purpose? |
| Data and consistency | Who owns state/invariants? Do aggregate/transaction boundaries and intermediate states meet the consistency requirement? |
| Alternatives | Are credible options and simpler valid designs considered with costs/consequences? Is preference masquerading as a requirement? |
| Failure and recovery | Are relevant retry, duplicates, ordering, durability, compensation, observability and operational ownership explicit? Are guarantees supported? |
| Evolution | Where needed, are compatibility, rollout, migration, recovery and rollback limits coherent for existing consumers? |
| Testability | Are outcomes observable and dependency/time/data seams controllable? Is real integration evidence distinguished from mocks? |

Each supported finding needs location, criterion/source requirement, evidence,
triggering condition, impact, severity rationale, uncertainty and bounded
correction. Distinguish defects, questions and optional improvements; retain
valid alternatives and their tradeoffs. Review artifacts here; executable-code
review is a separate responsibility. Do not invent a requirement/vendor choice
to make a proposal pass.

Return subject, sources, findings, criterion coverage, unavailable/excluded
coverage, assumptions and exact unresolved decisions. State actual inspections,
commands and limits. No findings means none supported in the inspected scope,
not compliance or acceptance. A digest proves identity, not execution or
independent authorship.

Select one classification with supporting author relationship:

- `self-check` if the reviewer authored or repaired the subject.
- `review; independence not established` when author relationship or required
  independence evidence is unknown.
- `independent-review` only when a different author, fixed subject, read-only
  reviewer and applicable target independence requirements are evidenced.

A different prompt/model alone establishes no independence. This method creates
no mandatory audit packet; required target acceptance remains separate.
Optional handoff names affected artifact, source IDs, proposed correction,
decision owner and existing revision/implementation permission. Return that
semantic handoff when another skill is unavailable. It cannot enlarge scope
or turn proposed architecture into accepted truth.
