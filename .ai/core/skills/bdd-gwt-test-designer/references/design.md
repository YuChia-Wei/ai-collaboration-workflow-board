# Design observable Given-When-Then scenarios

## Selected installed knowledge for design

For requested knowledge coverage, take the caller's explicit canonical
`project_root`, externally observed raw `expected_lock_sha256` for
`.ai/framework.lock`, installed selection/lock, capability `test-design`,
operation `design`, execution mode, affected paths/file types, technology,
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

## Establish the behavior source

Bind bounded behavior, requirement/specification/acceptance IDs and source
revision/status, or exact conversational source when no document exists.
Separate approved behavior from observed code, assumptions and proposed rules.
Contradictions require an owner decision; do not silently turn current behavior
into approved requirements. For ambiguity, give one or two interpretations and
label affected scenarios provisional.

Use target-selected test conventions, permissible evidence and requested
format. This package has no language, runner, mocking library or DI extension;
do not infer one from a file suffix. Report unavailable selected guidance and
leave the affected required specialist judgment unresolved.

Default to scenario notes. If the user supplies/requests `.feature`, or an
explicit target decision selects that artifact, render the same scenarios as
Gherkin Feature/Scenario or Scenario Outline/Examples. Preserve tags, row
identity and relevant supplied structure. Designing the file does not select a
runner or authorize code, package installation or execution. A formal test
specification remains a separately selected authoring artifact; GWT wording
alone does not switch this operation into that responsibility.

## Build the scenarios

1. Extract behaviors and ACs. Map every in-scope AC to scenarios or an explicit
   gap. Give each scenario a stable ID and behavior-oriented name; use a clearly
   local ID when no source ID exists.
2. State the real subject and justified test level. Identify controlled
   dependency boundaries and those needing real infrastructure.
3. Write concrete Given data/state, permissions, time and dependency responses.
   Put setup facts here. Identify isolation, nondeterminism and unknown values.
4. Write one primary When with its inputs. If behavior needs an action sequence,
   make it intentional and explicit; do not combine unrelated triggers to reduce
   scenario count.
5. Write each important Then/And as an observable value, relation, state, event,
   error or exception contract, with the source of its expected value. Replace
   vague "works correctly" with what an observer can assert. Do not learn an
   expected value from the algorithm under test.
6. Add relevant positive, boundary, invalid-input and specified failure/recovery
   variants. Include duplicates, ordering, timeout or cancellation only where
   meaningful. Preserve Given -> When -> Then rather than replacing scenario
   output with Arrange-Act-Assert.
7. Self-check coverage, assertions and feasibility. Mark deferred cases and
   missing rules explicitly. Scenario text is not execution evidence.

Examples tables may share a scenario when each row has a stable identity and
consistent precondition/action/assertion responsibilities. Split rows when
these differ materially. Preserve each row's source and expected result. Use
And for clarity, not to conceal unrelated outcomes.

## Select a test level that can prove the outcome

| Boundary | Typical evidence need |
| --- | --- |
| Domain object/aggregate | Invariants, state transitions and domain events. |
| Application use case | Input/result, orchestration and application-owned effects. |
| Reaction | Event handling, projection/update and specified duplicate/failure behavior. |
| API/controller | Request/response, validation and status/error mapping. |
| Integration | Actual database, messaging, gateway, environment/configuration interaction. |
| Journey/cross-context | Coupled behavior across the necessary real boundaries. |

These are method choices, not mandatory folders or framework classes. A mock
can isolate orchestration but cannot establish the real dependency's behavior.
Prefer the smallest credible fixture; explain why it suffices and expose any
required integration evidence that a cheap substitute cannot supply.

## Output and handoff

Return inputs/assumptions, scenario set, assertion/setup notes, AC-to-scenario
coverage and unresolved/deferred cases. For each scenario preserve:

- Scenario/data-row ID, name, source path or inline reference, revision/status
  and existing requirement/AC IDs.
- Test level, real subject and controlled boundaries.
- Concrete Given, primary When and every observable Then/And.
- Expected-value sources, uncertainty and fixture/evidence limits.

Persist only to a caller-selected authorized destination with an available
editor. There is no required spec directory or store. If placement is undecided,
return prose and an optional suggestion suited to the target.

For separately authorized implementation, carry the design and existing
permission to the bounded implementation owner. Do not invent future test
paths, review results or passing outcomes. The receiver returns a compact
mapping: scenario/data row -> source/AC -> actual test file/identifier ->
Given/When/Then steps and outcome assertions -> actual execution status/evidence.
One assertion may cover equivalent outcomes with explanation; distinct outcomes
need appropriate assertions. Helper names or assertion counts do not prove
coverage. The receiver must not drop a Then, weaken expected behavior, narrow
data silently or mock the subject itself.

Optional specialist/implementation collaboration is not an installation
prerequisite; return the semantic handoff when absent. Design, implementation,
review and execution remain separate states. An author applying
[review criteria](review.md) records self-check, not independent acceptance or
specification compliance.
