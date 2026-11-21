# Design tests from sources and verification goals

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

## Select only relevant optional knowledge

Within the verified task-selected allowlist, use `member:bdd/README.md` when
help selecting BDD guidance is needed. Select `member:bdd/discovery.md` for
rules, examples, counterexamples and unknowns; `member:bdd/formulation.md` for
precise examples and their oracles; `member:bdd/automation.md` for connecting
design to implementation and actual execution evidence. Use
`member:bdd/gherkin.md` only for requested Gherkin expression or syntax judgment.
`member:bdd/examples/library-renewal.md` is optional illustration, never target policy.
Do not load every BDD topic because a task mentions tests, or require BDD first.
A technical test request with complete sources can proceed directly without
reading the BDD index or any BDD resource.

For an implementation handoff, select the declared
`member:references/TEST-DESIGN-HANDOFF-CONTRACT.md` when general design guidance
is needed, and `member:references/GWT-TEST-HANDOFF-CONTRACT.md` when retaining
GWT-specific step and Then mapping is relevant. Do not require both merely
because both are allowed. No resource choice permits source fallback.
Missing optional knowledge does not prevent common work supported by these
instructions and the caller's sources; disclose the exact unavailable coverage.

## Establish sources and the verification goal

Bind the behavior, requirement/specification/acceptance IDs and source revision
or status, or the exact conversational source when no document exists.
State the selected subject, scope in/out and what the tests need to establish.
A test design verifies source behavior; it does not author a replacement product
requirement merely to obtain a convenient expected result.

Distinguish agreed behavior, proposals, assumptions and observed implementation.
For characterization work, explicitly label observed behavior and its capture
basis; observation does not prove stakeholder approval. Report conflicts and
leave dependent expectations provisional. Unknown expected values are gaps,
not permission to infer the oracle from the implementation being tested.
Discovery-only work can return rules, examples and questions without a test set.
For a combined task, reuse the same source IDs and carry unresolved decisions.

## Normalize an existing design when requested

Normalization is a meaning-preserving mode of design, not a new public operation.
Bind the existing artifact/version and authorized scope; preserve accepted IDs,
oracles, source status, explicit Given/When/Then and every important outcome.
Map moved or reformatted content so omissions and material changes are visible.
Do not replace GWT with Arrange/Act/Assert or another notation merely to
generalize the package. Label a proposed semantic change separately and return
unsupported behavior or oracle decisions to the owner. Record what changed,
what meaning was retained, and unresolved gaps; do not claim new execution.

## Reason about the test before selecting its expression

1. Map selected criteria, risks and invariants to existing protection, planned
   cases or gaps. Retain source/case IDs; local IDs must not impersonate ACs.
2. Identify the subject, observable outcomes and concrete failure each case
   detects. Distinct failures, including boundary errors on shared paths, justify cases.
3. Bind each assertion to an independent source. Missing or conflicting oracles
   stay unresolved. Cover all contract-required fields, not inferred guarantees.
4. Select sourced partitions, boundaries and failures; reuse adequate checks.
   Inspect affected dependencies for risks missing from the sources; ask whether
   to include them before adding cases/assertions. Sourced boundaries need no
   new approval; omit speculative lists.
5. Choose a credible boundary and repeatable fixture: data, identity, permissions,
   time, responses, isolation and cleanup. Expose nondeterminism and missing facilities.
6. Assert contracts; incidental structure, wording, order or call counts need a
   source requirement. Behavior-preserving refactors should leave assertions valid.
7. Weigh added detection against false failures, execution and maintenance cost.
   Keep accepted outcomes and cases required by accepted criteria or target gates;
   changing them needs their owner. Omit redundancy; self-check coverage without claiming a run.

## Choose a credible and feasible test level

| Boundary | Typical claim | Required distinction |
| --- | --- | --- |
| Domain object or aggregate | Invariants and transitions | Does not establish application wiring |
| Application operation or reaction | Result, orchestration and selected effects | Controlled ports do not prove real adapter behavior |
| API or adapter | Public mapping and boundary contract | Does not automatically prove the whole journey |
| Integration | Actual dependency interaction | Needs the selected real dependency and configuration |
| Journey or cross-context | Coupled behavior across necessary boundaries | Needs the relevant real path and observable outcomes |

These boundaries are options, not required folders or a fixed pyramid. Verify
actual target facilities; declarations and examples do not prove availability.
Keep planned levels separate from executable facilities. Missing infrastructure
leaves required claims blocked/not executable; isolated checks can establish
only their own claims, not replace required integration. Use the smallest credible
fixture, and never mock the subject being verified.

## Express the design in the selected form

Use an explicit target template or adopted format when provided. Otherwise,
choose concise notes or the form that best exposes the rule and uncertainty.
Do not translate a complete supplied design solely to impose BDD or GWT.

| Form | Preserve |
| --- | --- |
| Concrete examples or GWT | Initial state, primary event or justified sequence, every observable outcome and source |
| Decision table | Condition partitions, row identity, action and sourced result; unknown cells stay unknown |
| State-transition design | State meaning, event/guard, allowed or rejected transition, observable result and invariant source |
| Property-based design | Sourced property, domain and preconditions, generated/input constraints, observation and counterexample interpretation |
| Requested Gherkin | Feature/Rule/Scenario meaning, selected dialect, tags/row IDs and supported expected results |
| Formal test specification | The same design reasoning in the target contract or optional outline, with coverage and execution limits |

A property must express a supported relation or invariant; round trips,
idempotency, monotonicity or commutativity are not universally valid defaults.
State excluded inputs and how a counterexample would be judged. Generator,
shrinking and runner choices remain target-owned implementation concerns.
State diagrams and decision tables must not silently add transition or precedence
rules. Split cases whose setup, event or assertion responsibilities materially differ.
Shared rows remain traceable; a label or case count alone proves no coverage.

When GWT is supplied or selected, preserve concrete Given, primary When and every
Then/And with its oracle. Do not drop a Then while converting to another form.
When `.feature` is requested, expressing the design does not authorize runner
installation, step implementation, parsing or execution.

## Output and implementation handoff

Return source/status bindings, goal and exclusions, design reasoning, selected
level and infrastructure limits, cases/properties/rows, setup/oracle notes,
criterion-to-design mapping and unresolved or deferred work.
Formal test specifications belong here as test-design output; production,
entity and adapter semantics remain with their selected authoring responsibility.
Do not require spec-author to re-author this design before implementation.

Persist only to the caller-selected authorized destination with an available
editor. There is no mandatory test-spec folder, format or record store.
For a requested formal artifact, use the supplied target contract; use
[the optional formal-test outline](formal-test-template.md) only when useful.
Do not reproduce all product specifications inside a test specification.

For separately authorized implementation, carry the design and existing authority
to the implementation owner. Preserve IDs and each expected outcome or property;
request a compact mapping from design/source to actual test identifier,
action/observation/assertions and actual execution evidence/status.
Do not invent future files, commands, discovered tests or passing results.
Implementation, executable-test review, actual execution and target acceptance
remain distinct. An author using [review criteria](review.md) records self-check,
not independent review or specification compliance.

## Feedback from examples

Reuse source/example IDs across requirement, model and system-specification work.
Their GWT wording alone does not require another test-design operation. When the
request is test design, add the necessary boundary, level, data, isolation, oracle
and coverage decisions without replacing accepted behavioral outcomes.

A counterexample may reveal an ambiguous business rule, disputed invariant owner,
or infeasible technical mechanism. Return respectively to the requirement owner,
domain-model designer or software architect with the trigger, evidence and impact.
Keep affected expectations unresolved; do not revise tests or production behavior
merely to hide the contradiction. A handoff carries existing permission unchanged.
