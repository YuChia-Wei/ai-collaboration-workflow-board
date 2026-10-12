# Default adapter specification template

Optional prose outline for an inbound or outbound boundary. HTTP, messaging,
storage and other adapters need different details; follow the selected target
contract. Example field labels do not prescribe a protocol or policy.

```markdown
# <Adapter / interface>

## Context and sources

- Type: adapter
- Status/version:
- Accepted owner and boundary/direction:
- Consumers/providers and scope in/out:
- Related behavior and source requirements/decisions: <IDs and source status>

## Interface contract

| Entry point / operation | Input or message | Output / response / acknowledgment | Source/status |
| --- | --- | --- | --- |
| <known name/address or unresolved> | <shape and constraints> | <shape and meaning> | <reference> |

## Mapping

| External field/event | Internal meaning or behavior | Conversion/validation | Source |
| --- | --- | --- | --- |
| <field> | <accepted mapping> | <supported rule> | <reference> |

## Failure contract

| Condition | Business rejection or transport failure | Observable mapping | Side effects/retry meaning | Source |
| --- | --- | --- | --- | --- |
| <condition> | <classification> | <supported result> | <accepted semantics or open> | <reference> |

## Applicable boundary policies

<Source-bound authentication/authorization, validation, idempotency, timeouts,
cancellation, retries, version compatibility and observability. Mark each
unresolved relevant policy; do not supply credentials or invented defaults.>

## Verification expectations

<Mapping, contract and failure cases; required target dependencies and
observable assertions, without claiming execution.>

## Assumptions, conflicts and open decisions

<Claim, basis, impact and decision owner/evidence needed.>

## Source bindings and coverage limits

<Claim/ID to reference/revision/section, evidence kind, authority status and
missing technology-specific coverage.>
```
