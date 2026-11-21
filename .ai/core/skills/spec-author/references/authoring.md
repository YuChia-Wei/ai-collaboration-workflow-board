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


Formal-test specifications, test-case matrices, fixture/oracle and assertion
design belong to `test-designer`. Observable contract examples, including GWT,
may be authored here; their format does not make them a test-design artifact.
Preserve existing test-design identities and references
when they explain system acceptance; do not author or redesign those artifacts
as an incidental part of a system specification. Requirements, problem frames
and compliance verdicts remain distinct outputs. Explicit skill selection with
a conflicting artifact request needs bounded clarification, not silent routing.
Do not impose a multi-skill pipeline or create a second artifact without a need.

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


## Use accepted design without inventing it

Bind accepted designer outputs by identity, available revision and decision
status alongside the requirements. Carry their responsibilities, dependency
direction, invariants and selected contracts into the appropriate specification.
A complete accepted design does not need another designer invocation merely
because specification authoring starts. Ask only about a material gap or conflict.

If no new design has been selected, an explicitly requested provisional draft
may cover supported behavior and mark design-dependent sections unresolved.
Separate observations, proposed mechanisms and accepted decisions. Do not choose
aggregate ownership, transport, persistence, concurrency or failure policy to
fill a template. Identify which missing decision blocks which contract.
A proposed alternative remains proposed until the relevant target owner accepts it.

Preserve system verifiability: state observable acceptance, including relevant
refusal/failure outcomes, and link existing test-design IDs where available.
Do not remove expected results when transferring formal-test ownership.
Missing test design is an explicit gap if needed, not a reason to invent a test
plan, implementation fixture or execution result within this operation.

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

## Selected methods and feedback

For requested optional knowledge follow [the installed protocol](knowledge.md)
with capability `specification` and operation `draft` or `normalize`. BDD
formulation supports precise observable examples; DDD discovery/tactical guidance
helps interpret and express accepted language, responsibility and invariants.
Read only needed allowlisted resources. These methods do not authorize choosing
new aggregates, transaction owners, business rules, persistence or failure policy.

If an example contradicts a requirement, preserve the conflict for its requirement
owner. If accepted state or invariant ownership is unclear, identify the domain
model question; if the mechanism cannot honor the contract, identify the software
architecture question. Complete unaffected sections with explicit status instead
of silently changing accepted behavior. Test levels/data/isolation/oracle machinery
remain test-design work, using the same source/example IDs and original authority.
