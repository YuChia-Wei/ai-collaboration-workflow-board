# Default requirement template

This is optional prose guidance. Use the selected target template when one is
supplied. Replace placeholders only with supported content, label proposed
content, and retain unknowns explicitly. Sections may be adapted to the bounded
request; their presence does not establish approval or execution.

```markdown
# <Requirement title>

## Document context

- Status: <draft/proposed/approved only with evidence>
- Version/date: <provided or actual authored revision/date>
- Stakeholder/owner: <known owner or unresolved>
- Audience and domain terms: <selected audience and glossary>
- Scope in: <bounded goals>
- Scope out: <exclusions>

## Context and goals

<Problem, present context, intended outcomes and success measures with sources.>

## Stakeholders and personas

| Actor | Need or responsibility | Source/status |
| --- | --- | --- |
| <actor> | <need> | <source and authority> |

## Functional requirements

| ID | Actor/condition | Required capability and observable result | Priority/source/status |
| --- | --- | --- | --- |
| <existing ID or new draft label> | <condition> | <behavior> | <known value or open> |

## Non-functional requirements

| ID | Quality attribute and target | Conditions/measurement boundary | Source or open threshold |
| --- | --- | --- | --- |
| <ID> | <supported measurable target or proposed criterion> | <conditions> | <reference/status> |

## Business rules

| Rule ID | Invariant, exception or rejection condition | Applies to | Source/status |
| --- | --- | --- | --- |
| <ID> | <rule> | <requirement/actor> | <reference/status> |

## Constraints, assumptions and open decisions

| Kind | Statement | Basis and impact | Owner/evidence needed |
| --- | --- | --- | --- |
| <constraint/assumption/proposal/unresolved> | <statement> | <basis> | <known owner or unresolved> |

## Acceptance criteria

| Criterion ID | Requirement/rule | Given/input/condition | Observable expected result | Source/status |
| --- | --- | --- | --- | --- |
| <ID> | <bound IDs> | <condition, including relevant boundaries> | <success or failure outcome> | <approved/proposed/unresolved with evidence> |

## Source bindings

| Claim or IDs | Reference and version/revision/section | Source ID | Evidence kind | Approval/observation status |
| --- | --- | --- | --- | --- |
| <claims> | <actual available locator> | <existing ID or unavailable> | <user-supplied/extracted/assumed> | <supported status> |
```

If the selected format has no place for source or uncertainty notes, return
them alongside the document without changing a closed target schema.
Acceptance criteria describe expectations; record actual execution results only
when separately supplied and bound to the relevant target and observation.
