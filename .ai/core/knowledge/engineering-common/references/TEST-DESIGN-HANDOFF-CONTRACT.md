# Test Design-To-Implementation Handoff

Read this when a selected test design is handed to implementation or when its
implemented checks are reviewed against the design. It applies to concrete
cases, decision tables, state transitions, properties and formal test specifications.
It is unnecessary to create another artifact merely to follow this guidance.

The target owns behavior, conventions, infrastructure and execution commands.
This contract preserves design meaning; it grants no new implementation or
execution authority and selects no provider, external tool, runner or store.

## Preserve the design input

Carry the stable design, case, property and data-row IDs and names, with source
references, revisions and approved, proposed, observed or unresolved status.
Retain existing requirement, acceptance and invariant IDs. Use clearly local
labels when no source ID exists; do not manufacture an acceptance criterion.

For each selected check, preserve:
- The real subject, verification goal, selected test level and claim limits.
- Real versus controlled dependency boundaries and required actual facilities.
- Input domain, partitions, preconditions and relevant data or initial state.
- Identity, permissions, time, dependency responses, isolation and cleanup needs.
- The primary action or intentional event sequence and its inputs.
- Every expected outcome, relation, transition or property and its observation.
- The independent source of each oracle, including permitted value ranges.
- Unknowns, conflicting sources, exclusions and deferred decisions.

A property generator supplies inputs, not the truth of the expected result.
Preserve the sourced property, domain and preconditions separately from generator
or shrinking choices. Do not invent round-trip, idempotency or other properties
because a testing tool supports them. A counterexample must be interpreted
against the selected source rather than accepted or rejected for convenience.

Decision-table rows retain their condition and outcome responsibilities.
State designs retain the sourced states, guards, events and transition outcomes.
Shared implementations are valid when those meanings and identities remain
traceable; materially different cases must not disappear inside a shared helper.

For selected GWT, preserve concrete Given, primary When and every Then/And
with its expected-value source. The optional [GWT handoff guidance](GWT-TEST-HANDOFF-CONTRACT.md)
adds step-specific detail when useful; loading both contracts is not mandatory.

## Implement without silently changing the claim

The receiver consumes the design, existing authority and fresh target rules.
Execute the real subject's action and inspect its observable result.
A controlled dependency may isolate a claim but cannot prove that dependency's
real integration behavior. Do not replace the subject itself with a mock.

Do not silently drop an expected outcome or property, weaken an exception,
narrow the input domain or replace a required real boundary with a substitute.
If a design cannot be implemented as stated, report the affected IDs, reason,
proposed change and evidence limit. Missing or conflicting oracles return as
precise owner questions; implementation output does not approve a new rule.

## Return a compact mapping

Use the target's existing test artifact or implementation report. A second
specification, new record family or mandatory pipeline is not required.

| Design/case/row/property | Source/revision/status | Actual test identifier | Action, observations and assertions | Actual result/evidence |
| --- | --- | --- | --- | --- |
| Stable IDs | Existing binding | Implemented file and test ID | Each outcome/property mapped to its check | Command/result reference or explicitly not run |

One assertion may demonstrate equivalent expected outcomes when the mapping
explains the equivalence. Distinct outcomes need appropriate observations.
Names, assertion counts and generated reports alone do not establish fidelity.

## Keep evidence states distinct

Design, implementation, review and execution are separate states.
A test plan, compiled file, GWT comment or green test name does not prove a test
executed or that its assertions establish the selected behavior.
Record actual subject/revision, environment, command, discovered/executed tests,
results and evidence location. Zero discovered tests is not a successful run
of the selected cases. Preserve failed, blocked, skipped and not-run outcomes.
Fixture evidence demonstrates that fixture, not general downstream acceptance.

Reuse authority already covering the requested implementation and execution;
do not demand duplicate approval or another design ceremony. A handoff never
expands that authority. If independent review is required by the target, the
implementation owner's self-check cannot stand in for that independent review.
