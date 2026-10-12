# Default entity specification template

Optional prose outline for an entity, aggregate or value object. The target
chooses its modeling conventions and file format. Do not create an aggregate or
persistence decision merely to populate this outline.

```markdown
# <Entity / value object>

## Context and sources

- Type: entity
- Model kind: <accepted entity/aggregate/value object or unresolved>
- Status/version:
- Accepted owner/context and scope:
- Source requirements/decisions: <IDs, references, revisions/sections and status>

## Identity and structure

- Identity/equality semantics: <accepted semantics or open>
- Relationships and ownership: <distinguish references from ownership>

| Attribute | Meaning and accepted type | Constraints/defaults | Source/status |
| --- | --- | --- | --- |
| <name> | <meaning> | <supported constraint or unresolved> | <reference> |

## Invariants

| Rule ID | Invariant | Applies during | Invalid-state outcome | Source/status |
| --- | --- | --- | --- | --- |
| <ID> | <rule> | <lifecycle scope> | <observable rejection/effect> | <reference> |

## Lifecycle and operations

| Operation/transition | Inputs and preconditions | Postconditions/state/effects | Rejection conditions | Source |
| --- | --- | --- | --- | --- |
| <accepted operation> | <contract> | <contract> | <contract> | <reference> |

## Relevant boundary constraints

<Only supported immutability, concurrency, persistence or serialization
constraints. Leave unspecified choices open.>

## Verification expectations

<Invariant and transition criteria, edge cases, expected observations and
source links; distinguish plans from execution.>

## Assumptions, conflicts and open decisions

<Claim, basis, impact and decision owner/evidence needed.>

## Source bindings and coverage limits

<Claim/ID to reference/revision/section, evidence kind, authority status and
missing knowledge.>
```
