# Design a bounded architecture

## Selected installed knowledge for design

For requested knowledge coverage, take the caller's explicit canonical
`project_root`, externally observed raw `expected_lock_sha256` for
`.ai/framework.lock`, installed selection/lock, capability `architecture`,
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

## Inputs and authority

Confirm business capability/module, requested new design or revision, source
requirements/AC IDs, known workload, quality constraints, adopted architecture,
existing decisions and compatibility obligations. Separate source facts,
observed behavior, assumptions and proposed decisions. Existing code does not
override an accepted requirement by existing.

Use explicit target sources for this scope; no directory or registry is
mandatory. Conflicting or missing authority stops the dependent decision:
present bounded options and identify the decision owner. Reuse accepted choices
rather than reopening them merely because a class is added.

Use DDD for language, responsibility and invariant ownership; Clean Architecture
for dependency direction; Hexagonal Architecture for ports and external
adapters. These lenses do not make every pattern mandatory. CQRS, event
sourcing, a broker, physical project splits, ORM and DI API need target
selection. This package has no technology supplement. Apply selected supplied
guidance only within scope; report missing specialist coverage and leave the
affected required acceptance unresolved.

## Design sequence

1. Describe capability, actors, trigger, result and measurable acceptance.
   Preserve business vocabulary and label unconfirmed terms. Name ownership of
   data and decisions rather than treating a folder as the boundary.
2. Identify invariants and constrained state. Propose aggregate/module
   boundaries where responsibility or consistency warrants them. Explain what
   must be atomic and which intermediate states are acceptable.
3. Place inbound application ports and outbound dependency ports. Keep business
   decisions independent of transport, persistence and vendor APIs. Give each
   abstraction a purpose such as a stable dependency boundary or controllable
   failure/time/data seam; avoid speculative interfaces.
4. Describe commands, queries or reactions only when needed by the chosen
   model. Specify input/output, errors, transitions, transaction owner, external
   effects and dependency lifetimes relevant to correctness.
5. Compare credible alternatives, including the simpler valid option. State
   benefits, costs, operational burden, rejected choices and the evidence or
   assumption driving the recommendation.
6. Walk relevant failure windows: commit versus publish, retry, duplicates,
   ordering, partial failure, cancellation, recovery and observability. Record
   actual guarantees; do not assume exactly-once delivery. Compare coordination
   or compensation against invariants for cross-owner effects.
7. For existing consumers, explain compatibility, versioning, rollout order,
   migration/recovery and rollback limits when relevant. A proposal authorizes
   none of these actions.
8. Define observable acceptance and evidence needs. Distinguish controlled
   tests from required real storage/messaging/integration evidence and record
   feasibility limits.

## Scale the deliverable

| Requested subject | Include when relevant |
| --- | --- |
| Bounded context/module | Purpose, owner, vocabulary, aggregates/invariants, ports, adapters, integrations and target-selected placement. |
| Aggregate or major refactor | Responsibility, entities/value objects, behavior/events, consistency, persistence decision and regression risks. |
| Command/query/reaction | Trigger/input, application responsibility, domain/projection logic, outbound effects, result/error and acceptance. |
| Messaging integration | Producer/consumer ownership, payload, guarantees, duplicate/order policy, transaction/publish boundary, retry and recovery. |

Return a coherent proposal with source bindings, alternatives, assumptions,
recommendation, unresolved owner decisions and validation needs. Label choices
proposed until accepted by the target owner. Use a diagram when it clarifies
dependencies or effects. Default to conversation; persist only at a selected
authorized destination with an available editor.

Use [review criteria](review.md) as an author self-check when useful and label
it self-check. It is not independent review, implementation or specification
compliance. Optional ADR/knowledge persistence is a separate selected handoff:
return decision context, options, consequences, status and sources when no
persistence capability is available. Accepted designs can pass to an
implementation owner with existing permission and open questions; proposals
never silently become accepted target truth.
