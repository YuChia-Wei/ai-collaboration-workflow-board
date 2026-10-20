# Optional formal test specification outline

Read this only when the requested output is a formal test specification and the
target has not supplied a preferred template. It is ordinary prose guidance,
not a schema, runner or prerequisite for implementing complete supplied designs.
Test-designer owns the test reasoning and artifact; production, entity and
adapter specifications retain their own sources and authoring responsibility.

Preserve the target's format, accepted design IDs and every important expected
outcome. GWT, decision tables, state transitions and property descriptions are
possible expressions, not required parallel sections. Omit an irrelevant form.
Do not invent an oracle, infrastructure availability or results to fill the outline.

```markdown
# <Subject> test specification

## Goal, scope and sources

- Design status/version and selected test target:
- Verification goal and scope in/out:
- Requirements, acceptance, invariants or observed behavior: <IDs, revisions, status>
- Existing accepted designs/cases/rows: <preserved IDs and links>
- Target conventions, format contract and authority:

## Design reasoning

- Risks, partitions, boundary values and specified failures selected:
- Real subject and observable contracts:
- Independent oracle for each outcome/property:
- Expected-value conflicts or missing decisions:
- Selected test level and why it can establish the claim:
- Existing target infrastructure evidence; unavailable or unknown facilities:
- Real versus controlled dependency boundaries and what substitutes cannot prove:

## Setup and observations

- Concrete data/state, identity, permissions, time and dependency responses:
- Isolation, concurrency, nondeterminism and cleanup/recovery:
- Action or intentional event sequence:
- Observable outcomes/properties and how they would be inspected:

## Designed cases

<Use one suitable expression or a purposeful combination. Preserve case/row IDs,
source bindings, relevant input domains, setup, action and every expected outcome.
For GWT retain every Then/And. For a decision table keep unknown cells unresolved.
For transitions record sourced states/guards/results. For properties define the
sourced relation, domain/preconditions and counterexample interpretation.>

| Design/case/row ID | Source criterion/invariant and status | Selected level | Expected outcomes or property and oracle | Gap/owner |
| --- | --- | --- | --- | --- |
| <stable ID> | <source/revision/status> | <bounded claim> | <independent source> | <actual unresolved input> |

## Coverage, feasibility and exclusions

| Criterion or verification goal | Design IDs | Planned coverage | Facility/authority gap and next owner |
| --- | --- | --- | --- |
| <source ID> | <case/property/row> | <what the design addresses> | <what remains unresolved> |

<Distinguish logically designed coverage from currently executable facilities.
A cheaper isolated check does not satisfy a required real-integration criterion.>

## Implementation handoff and evidence boundary

<Carry source/design IDs, setup, each oracle and observation to implementation.
The receiver maps them to actual test identifiers, actions/assertions and actual
execution evidence/status in the target's existing report or artifact.>

<Default: not implemented or executed by this authoring operation. Supplied real
results, if any, retain their exact subject/revision, environment, command,
discovered/executed tests and evidence source. Preserve failed, blocked, skipped
and not-run states. Do not convert textual assertions into runtime evidence.>

## Open decisions and limits

<Questions, assumptions and exclusions with source/basis, affected claims,
needed decision/evidence and responsible owner. No compliance or acceptance
verdict follows merely from this document's completion.>
```
