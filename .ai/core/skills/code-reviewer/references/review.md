# Common review method

## Selected installed knowledge for review

For requested knowledge coverage, take the caller's explicit canonical
`project_root`, externally observed raw `expected_lock_sha256` for
`.ai/framework.lock`, installed selection/lock, capability `review`,
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

## Establish the subject and authority

Identify the requested files or diff, its base and reviewed revision when available,
and any uncommitted content. Record included and excluded scope, intended behavior,
acceptance criteria and relevant target decisions. When there is no Git revision,
identify the supplied artifact and its observed version or content. Do not invent a
fixed subject from a moving working tree. If content changes while reviewing,
separate the observations and recheck affected conclusions before reporting them.

Read enough surrounding code, callers and dependencies to understand the changed
behavior and its impact. Separate existing defects from regressions introduced by
the change. For implementation guidance, check whether the proposed steps would
preserve the supplied behavior and constraints; do not claim code was executed.
Ask only for missing information necessary to judge an affected behavior, and keep
unaffected review work bounded to the evidence available.

Use the caller's requirements and applicable target-owned rules within their stated
scope. Identify their source and currency before claiming compliance. Conflicting,
stale or missing authority stops the affected rule checks; state the gap without
silently substituting a framework preference. A defect supported directly by visible
behavior or a supplied contract may still be reported with that evidence, without
claiming unresolved rule coverage. Apply DDD, CQRS, Event Sourcing, an ORM, a broker
or any other architecture choice only where the target has adopted it.

## Select and disclose coverage

Apply this common method to every reviewed partition. Distinguish the technologies
and architecture methods present from the specialist checks actually available.
A file extension, installed framework or successful build does not supply specialist
review. This package includes no technology extensions, including no .NET extension.
When requested specialist coverage is unavailable, name it explicitly and preserve
any target-required acceptance blocker. Do not interpret missing coverage as a clean
specialist result. Separately supplied target guidance may inform visible-contract
review; do not present it as an extension shipped by this package.

## Trace behavior and credible failure paths

For each material changed path, trace input, validation, state transitions, side
effects and observable outputs against the intended contract. Examine empty,
invalid and boundary inputs and whether failure leaves a recoverable state. Follow
error propagation, cleanup and resource lifetimes through the actual control flow.
A feasible trigger and consequence matter more than a suspicious isolated line.

Follow affected API/data consumers and ownership boundaries far enough to assess
compatibility. Check defaults, serialization, version or format dispatch, optional
fields and changed invariants where relevant. Distinguish a documented breaking
change from an accidental incompatibility. For stateful or asynchronous behavior,
reason about ordering, concurrency, retry, cancellation, duplicate delivery and
idempotency where those paths exist; avoid inventing an environment the code does
not use. Check which participant owns transaction completion and whether partial
failure can duplicate effects or lose acknowledged work.

Examine authorization and trust boundaries, sensitive-data exposure, input handling,
resource exhaustion and performance costs when the reviewed scope supports them.
Show a plausible input, actor or workload and affected path for the claimed impact.
A bounded review does not establish exhaustive security or performance coverage.
Evaluate material maintainability risks through concrete consequences such as a
broken ownership boundary or inconsistent duplicated behavior. A different valid
design, unfamiliar library or style preference is not itself a defect.

## Evaluate tests and other evidence

Compare tests with observable behavior and contracts: relevant assertions, failure
cases, isolation, boundary inputs and gaps. Follow helpers and step definitions into
actual setup, action and assertions; test names and comments are insufficient.
When the target supplies Given-When-Then scenarios, map each precondition, action,
expected outcome and data row to the implementation and assertions. Check that the
test can fail when the claimed outcome is broken, and that skipped or mocked paths
are not presented as evidence of required real execution.

Treat tests, analyzers, indexes and searches as evidence that supports reasoning.
Record the subject, environment and actual outcome of any supplied or authorized
execution. Static inspection is not a test pass. Reused output needs evidence that
its subject and relevant conditions still match; otherwise label it historical or
unverified. An empty search result is not proof of absence: confirm material claims
against the relevant source, manifest or contract and disclose inaccessible scope.

Run code, install dependencies, access credentials or perform external actions only
when separately permitted by the task and target rules. Review alone grants none
of those actions. If execution is unavailable or unapproved, give the supported
static conclusion and the precise evidence needed to resolve remaining uncertainty.
Preserve failed, skipped, interrupted and unavailable outcomes honestly.

## Return findings and limitations

Return actionable findings ordered by impact, with a stable local label for each
finding when useful. Every finding should identify:

- A precise file/location or supplied artifact section, and whether it is new or
  pre-existing relative to the reviewed change.
- A feasible trigger, observed or reasoned failure, and user or system impact.
- The supporting code path, contract or execution evidence; clearly distinguish
  an observed fact from a static inference or unresolved hypothesis.
- Severity and confidence, with the assumption or missing evidence that could
  change the conclusion. Use a target-selected severity rubric when supplied;
  otherwise explain priority through impact and urgency without inventing policy.
- A bounded correction direction or verification need that the authorized owner
  can act on, without implementing it or prescribing a staged refactoring program.

Keep findings short enough to assess and specific enough to reproduce. Consolidate
symptoms of the same cause when that clarifies the correction; retain distinct
impacts where one fix would not cover them. Separate actionable defects from open
questions, speculative concerns and optional style suggestions. Do not manufacture
findings or scores. If scoring is explicitly requested, state the rubric and its
coverage limits; a score does not replace evidence.

Include the reviewed subject/scope, applicable authority, common method used,
specialist coverage absent, checks actually performed and unresolved limitations.
When there are no supported findings, say so for the inspected scope. That does not
mean universal correctness, a passed specialist gate or acceptance of the change.

Keep review read-only. Return prose in the conversation by default. If explicitly
asked to export it, use the caller-selected destination, format and overwrite rules;
that write does not authorize code repairs, tracker mutation or publication. This
operation does not provision a framework report store or a machine report schema.
If independent acceptance is required, preserve the target's subject and reviewer
requirements and identify self-review honestly. Recommend the next authorized owner
for repairs or missing verification; do not grant that authorization yourself.
