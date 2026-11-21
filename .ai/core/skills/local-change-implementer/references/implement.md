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
instruction to load all of them. Match verified selected packages/resources,
capability, operation and this task. Selected `skill-guidance` and the
non-normative resources it names supply optional navigation without requiring a
saved binding. Those named resources must have empty `rule_ids` and must not be
`normative-rule` or `rule-catalog`; the consumption allowlist still applies.
Respect any saved binding's execution-mode, path-prefix, technology-profile,
file-type and authority constraints on the selected resource. Other requested
coverage requires the matching saved bindings and their selectors. Read only
needed installed `.ai/core/knowledge/<id>/<member>` bytes with bounded direct
reads matching the returned raw SHA-256. Re-observe the exact lock, markers and
authority hashes around those reads; discard the result on drift.

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

## Selected knowledge references

After the installed-resource reader succeeds, intersect returned `skill-guidance`
resources with this skill's consumption allowlist, matching operations and the
current task. For each needed resource, read the managed copy at
`references/knowledge/<package>/<resource.path>` under this installed skill's
package root, using the returned Resource's package-relative `path`, not the
index row's installed `member` path. Its bytes must match the returned SHA-256;
observe the same
lock, marker and authority checks around the read. Copies supply navigation to
knowledge, not additional rules or authority. Resolve their resource IDs through
the same installed-resource protocol; do not load every selected reference.

No selected applicable guidance means no reference files to read, not a missing
prerequisite for common work. Report missing or changed copies only for requested
coverage. Do not infer tool installation, adopt rules or fall back to a source
checkout. The operation method and skill entry remain technology-neutral.

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
4. Reuse protection; add uncovered sourced behavior/boundaries or defect cases. Keep cases
   required by accepted criteria or target gates, supplied outcomes, real subjects
   and independent oracles. Cover all contract-required fields, not inferred
   guarantees; tolerate behavior-preserving refactors. Inspect affected dependencies for source gaps;
   ask a focused inclusion question before adding unsourced cases/assertions.
   Sourced boundaries need no approval; omit speculation.
5. Select checks from the actual diff, semantics, direct dependencies and target
   gates. An edit, path, extension, report or SHA alone selects no test; prose
   and whitespace need checks for actual parsing, schema, output or behavior
   effects. Investigate unclear impact. Run necessary authorized checks with
   actual target commands, working directory, prerequisites and output scope;
   invent no runner, acquire no credentials and weaken no guard. Retain failures
   and missing evidence. Test design, code and execution are separate results.
6. Inspect the diff, acceptance coverage and touched radius. Stop dependent work
   for unaccepted wider operations or semantic/architecture decisions; return
   them to the coordination or task owner without unrelated cleanup.

Revise conditional validation as edits reveal or remove impacts; confirm
necessity before execution and required evidence afterward. Bug reproduction,
TDD and incremental checks may run before or during edits for a concrete purpose.
Preserve mandatory gates, accepted cases, security and release obligations;
changing accepted requirements needs their owner's decision.

Large integration, E2E, usability, full installation/upgrade and high-cost AI
checks need an affected boundary or explicit user/accepted requirement, not a
default matrix. Weigh added detection against false failures and upkeep. Keep
required real integration evidence; isolated checks cannot replace it, and
unavailable facilities remain blocked/not-run. Explain omitted checks briefly
in the existing result; no new form, ledger, hash inventory or skill is required.

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
