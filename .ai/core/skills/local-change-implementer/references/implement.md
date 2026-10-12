# Implement one local change

## Selected installed knowledge for implement

For requested knowledge coverage, take the caller's explicit canonical
`project_root`, externally observed raw `expected_lock_sha256` for
`.ai/framework.lock`, installed selection/lock, capability `local-change`,
operation `implement`, execution mode, affected paths/file types, technology,
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

## Confirm the semantic radius

Identify one primary class/object/method/local symbol/query, one operation,
expected behavior and its source, permitted files/module, direct dependencies,
direct call sites and immediate tests. Authorization and target requirements
serve different purposes: permission to edit does not define correct behavior.
Preserve unrelated work and the target's accepted architecture.

Suitable operations include extracting a method, renaming a local symbol,
fixing bounded logic, simplifying an object interaction or adjusting a local
SQL/ORM implementation. A behavioral fix needs its intended behavior stated;
otherwise preserve behavior. Do not combine independent goals.

Several direct call-site files do not force a slice. A private implementation
helper type can remain local only if it preserves accepted target, radius,
behavior, responsibility, dependency direction, lifetime and transaction
boundary. A new type's existence or line count alone decides nothing.

Adding a public/domain type or interface, or changing an existing public contract,
responsibility, dependency, lifetime or transaction boundary, belongs to a bounded
slice under an accepted design. A method-level fix inside an existing public type
may remain local when it preserves those contracts and boundaries. Missing or changed
architecture, compatibility, module/aggregate or business-language decisions
need their owner's decision before dependent edits. Public DTO/API/event or
ubiquitous-language renames are not local symbol renames. Broad namespace
restructuring, cross-module behavior and multi-aggregate cleanup exceed this
local method. Return a concrete handoff rather than executing beyond scope.

When the target, operation or radius is unknown, resolve that bounded question
first. An unexplained runtime failure may need diagnosis before choosing a
repair; a diagnostic finding does not grant implementation authority.

## Execute the smallest coherent edit

1. Inspect the target, direct uses and relevant tests. Use applicable
   target-owned rules and only explicitly selected technology guidance. This
   package provides no ambient language, ORM, DI or test framework baseline.
2. State what changes and what behavior/contracts must remain stable. Identify
   hidden side effects, lifetime, transaction or data-semantics risks before
   treating a seemingly small edit as local.
3. Apply the single operation and required direct call-site changes. Prefer an
   applicable IDE refactoring if available and permitted; review its actual
   edits. Do not treat a tool's success as proof the radius stayed bounded.
4. Update immediate tests when needed to protect the changed contract and
   within authority. Avoid unrelated cleanup or implementation-mirroring tests.
5. Run the narrowest meaningful authorized target checks. Obtain the actual
   command, working directory, prerequisites and allowed output scope from
   target evidence. No default product command or package is supplied here.
6. Inspect the diff and actual touched radius. Stop dependent edits if an
   unaccepted semantic/architecture decision or wider operation emerges.

An unavailable editor blocks implementation. Missing selected specialist rules
block the corresponding decision. Missing test tools, environment or command
authority means those checks are blocked or not run; it is not permission to
invent a command, broaden credentials or call the implementation verified.
Continue other authorized work only if the missing item is not its prerequisite.
Existing permission remains valid; do not ask again just because an optional
handoff is used.

## Return the result

Report target/operation, expected behavior source, actual files/direct call
sites/tests touched and why they fit the radius. State compatibility and any
prevented expansion or unresolved decision. For each relevant check include
actual command/context and result, or precise not-run/blocked/deferred reason.
Preserve failures beside later results. A proposed regression, compilation or
zero discovered tests is not proof of changed-behavior coverage.

Keep output in the conversation or a caller-selected authorized destination.
No workflow, rule packet, record store or other installed skill is required
by this method. Optional review or slice/architecture collaboration receives
scope, sources, current evidence and existing permission. A local implementation
result is not independent review or specification compliance, and it grants no
push, PR, merge, publication or target decision authority.
