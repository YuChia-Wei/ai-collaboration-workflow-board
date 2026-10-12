# Specification authoring method

This reference instructs an author. It is not an executable and is never a
claim that the public operation ran. Implemented metadata describes delivered
instruction source, not installation, invocation, verification or acceptance.

## Select one artifact

Use the caller's requested output and existing context to select the type.
Neither the generic word "spec", a source filename, code as input nor GWT
wording selects it automatically.

| Requested subject | Selected type | Packaged default |
| --- | --- | --- |
| One production behavior, use case, command/query or reactor and its contract | production | [Production template](production-template.md) |
| Entity, aggregate or value-object state, identity and invariants | entity | [Entity template](entity-template.md) |
| An inbound/outbound adapter or interface, mapping and failure contract | adapter | [Adapter template](adapter-template.md) |
| A formal specification of verification targets, scenarios and assertions | formal-test | [Formal-test template](formal-test-template.md) |

A formal-test specification remains a formal-test artifact when scenarios use
GWT. Preserve supplied scenario IDs, source links and accepted scenario design.
Scenario notes, a GWT matrix or assertion design alone belong to a separate
scenario-design responsibility; do not create an extra spec solely to process
them. Requirements, structured problem frames and compliance verdicts are also
distinct requested outputs. Do not impose a requirement-to-spec pipeline or
author a second artifact without an actual need.

Honor explicit skill and artifact choices. If they conflict, or the type cannot
be determined, resolve that bounded ambiguity before drafting an assumed type.
An unresolved architecture choice need not prevent the caller's explicitly
proposed draft: retain the choice and continue independent sections. Do not
invent aggregate ownership, responsibilities or dependency direction.

## Inputs, source binding and format

Identify the bounded subject, requested `draft` or `normalize` operation,
existing authorization, requirements/decisions, intended audience, applicable
target rules and available evidence. `draft` creates the selected artifact;
`normalize` reads and reshapes an existing artifact within its accepted edit
scope while retaining semantic meaning.

For material claims, carry reference and available revision/version/section,
source requirement/rule/scenario IDs, and approval or observation status. Keep
user-supplied facts, extracted observations, assumptions/proposals and unresolved
choices distinct. A user statement is not automatically an approved contract.
Code-only recovery is an observed/inferred draft when requested; do not invent
missing normative sources or imply implementation behavior establishes intent.
Record conflicting sources with their affected claims and the owner/evidence
needed. Preserve existing IDs; mark any new local draft labels as such.

Use the caller-selected template and, when supplied, the exact target schema
and version. Preserve permitted fields, required structure, types, enum values,
naming and cross-references. Do not add arbitrary metadata or handoff fields to
a closed format. Keep source/uncertainty notes alongside it when necessary.
If a required schema, rule or source is inaccessible, state that limitation;
do not claim conformance or invent a substitute contract. Complete a provisional
prose draft only when that fits the requested scope.

Without a selected target template, use only the relevant packaged prose
template. It is optional guidance and does not prescribe a JSON record family.
Unknown fields stay explicitly unresolved; avoid filler, invented measurements,
undecided implementation types or silently assumed technology conventions.
Target-specific details require actual target evidence. This common package
bundles no .NET, persistence, messaging, API-versioning or test-framework
specialist contract; disclose missing requested coverage rather than treating
it as reviewed or creating a new architecture choice.

## Develop the selected contract

For **production**, describe the externally meaningful behavior, trigger/actor,
inputs, preconditions, outputs, postconditions and failure outcomes. Bind each
rule to its source. Identify state changes, collaborators, events and effects
only where accepted. Record atomicity, concurrency, replay/idempotency and
ordering semantics when relevant and supported; leave unknowns explicit.
Business behavior is the subject, not a guessed handler/class naming scheme.

For **entity**, distinguish identity, attributes and value constraints from
lifecycle invariants and allowed transitions. Specify operation preconditions,
postconditions and invalid-transition outcomes. Reflect accepted ownership
and relationships without treating a reference as aggregate ownership. Equality,
immutability, persistence and concurrency choices are target-owned; include
only those relevant and supported.

For **adapter**, state the boundary/direction, consumer and provider, protocol
or entry points, request/response or message contracts, mapping to/from domain
behavior and error mapping. Record applicable validation, authentication,
authorization, retries, cancellation, timeouts, idempotency and observability
constraints with their sources. Separate transport failures from business
rejections. Do not smuggle domain rules into an adapter or invent a route,
status code or credential policy.

For **formal-test**, bind each scenario to the behavior, source requirement or
invariant it verifies. Describe test level, setup, test data, action, observable
assertions and relevant failure/boundary cases. State required environment and
dependencies, isolation/cleanup needs, supported oracle and known coverage gaps.
Separate proposed test plans from observed run results. Unit or synthetic
evidence cannot satisfy a criterion that explicitly requires real integration
execution. Do not run tests or claim a passing outcome while authoring.

For all types, preserve accepted scope, domain terms and target content.
Do not add requirements solely to fill the default outline. Record genuine
non-applicability with a reason where useful. During normalization, preserve
IDs, source links, invariants, exceptions, approval states and existing open
questions. Distinguish editorial changes from semantic changes; do not resolve
contradictions, move records or broaden coverage as an incidental rewrite.

## Inspect and deliver

Read the result against the selected sources and target template. Check
internal consistency, input/output and state semantics, traceability, retained
scenario IDs, unresolved choices and the selected artifact type. Describe
only inspection actually performed. A coherent draft or parseable document
is not schema validation, executed test evidence or specification compliance.

Return the complete selected draft, type/rationale, source bindings, assumptions,
open decisions and coverage limits. For normalization, include material changes.
State actual delivery location: conversation-only, successfully written path or
unexecuted path suggestion. File writes require a caller-authorized destination
and the target's write controls; inspect existing content, preserve unrelated
edits and avoid collisions. No hidden framework path or store is required.
If writing is unavailable, return the artifact and disclose that it was not
written. Do not rewrite adjacent artifacts to match a suggested layout.

Only hand off when a distinct needed output or owner decision remains. Reuse
the selected artifact/location, accepted decisions, source bindings, open
questions, authorization state and requested next output. Optional future
implementation or test work is not an authoring prerequisite. Another skill's
document cannot supply missing stakeholder approval, and authoring itself
grants no implementation, test execution, review or compliance authority.
