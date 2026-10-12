# Default formal-test specification template

Optional prose outline for a formal verification specification. Preserve the
selected target contract and supplied scenario IDs. GWT is allowed inside this
artifact; its wording does not turn the requested document into scenario notes.
This template is not a test runner or evidence of execution.

```markdown
# <Test target> formal-test specification

## Context and sources

- Type: formal-test
- Status/version:
- Subject and scope in/out:
- Behavior/specification/requirement sources: <IDs, versions/sections, status>
- Existing scenario sources: <retained IDs and accepted design>
- Requested test levels and rationale: <unit/integration/system/etc. as selected>

## Environment and data

- Required dependencies and actual-versus-simulated boundary:
- Setup/preconditions and data:
- Isolation/concurrency assumptions:
- Cleanup/recovery expectations:
- Unavailable environment or knowledge:
- Applicable target test conventions:

## Scenarios and assertions

| Scenario ID | Source criterion/rule | Level | Setup / Given | Action / When | Observable assertions / Then | Oracle/evidence needed |
| --- | --- | --- | --- | --- | --- | --- |
| <existing ID or new draft label> | <source link> | <selected level> | <data/state> | <single behavior> | <specific observable result and side effects> | <source of expected value and required observation> |

<Include relevant success, rejection, boundary, replay/concurrency and failure
cases supported by the selected behavior. Do not invent requirements for coverage.>

## Coverage and exclusions

| Source criterion | Scenarios | Covered expectation | Gap / reason / owner |
| --- | --- | --- | --- |
| <ID> | <scenario IDs> | <planned coverage> | <unresolved or excluded scope> |

## Execution and evidence boundary

<Default: not executed by authoring. If actual results are supplied, bind them
to the exact target/revision, environment, command or observation, scenario and
evidence location. Distinguish planned, passed, failed, skipped and blocked.
A textual assertion or synthetic example is not an integration run.>

## Assumptions, conflicts and open decisions

<Unconfirmed oracle, threshold, environment, behavior or owner choice with
source/basis and the effect on proposed assertions.>

## Source bindings and coverage limits

<Claim/ID to reference/revision/section, evidence kind, authority status and
uninspected behavior. No code/test compliance verdict is implied.>
```
