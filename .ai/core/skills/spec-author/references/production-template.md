# Default production specification template

Optional prose outline for one production behavior. Use the selected target
template/schema when supplied. Preserve accepted terms and IDs, mark proposals
and unknowns, and omit irrelevant optional detail with a reason. No section is
evidence that behavior was implemented or tested.

```markdown
# <Production behavior / use case>

## Context and sources

- Type: production
- Status/version: <actual draft version and supported approval state>
- Subject and owner: <accepted context/subject or unresolved>
- Scope in/out: <bounded behavior and exclusions>
- Source requirements/decisions: <IDs, references, revisions/sections and status>
- Observations versus intent: <observed source facts kept distinct from desired behavior>

## Behavior contract

- Actor/trigger:
- Inputs and validation constraints:
- Preconditions:
- Main behavior and relevant alternatives:
- Observable outputs:
- Postconditions:
- Rejections/failures and expected effects:

## Rules and state effects

| Source rule | Condition | State transition / effect / invariant | Status or unresolved choice |
| --- | --- | --- | --- |
| <ID and source> | <condition> | <observable meaning> | <supported status> |

## Accepted collaborators and boundaries

<Only known ownership, integrations, emitted events, data contracts and dependencies.
Keep uncertain architecture explicit.>

## Relevant operational semantics

<Supported transaction/atomicity, replay/idempotency, concurrency, ordering,
cancellation and quality constraints; include scope and source for each.>

## Acceptance and verification expectations

| Criterion/scenario ID | Source requirement/rule | Input/condition | Expected observable outcome | Evidence needed |
| --- | --- | --- | --- | --- |
| <ID> | <source> | <condition> | <outcome> | <proposed verification, not a pass> |

## Assumptions, conflicts and open decisions

<Claim, basis, impact and known decision owner/evidence needed.>

## Source bindings and coverage limits

<Reference/revision/section, source ID, user-supplied/extracted/assumed status,
approval evidence when available, and uninspected or unsupported coverage.>
```
