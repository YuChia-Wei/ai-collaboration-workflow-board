# <Domain Event Group> Language

> Template only. Replace all placeholder content with target repository facts before using this as project truth.

## Metadata

- Bounded context:
- Event group:
- Source requirements:
- Source specs:
- Last reviewed:

## Event Terms

| Event name | Business meaning | Producer | Consumers | Source |
| :--- | :--- | :--- | :--- | :--- |
| `<event>` | `<meaning>` | `<producer>` | `<consumers>` | `<requirement/spec/source>` |

## Event Naming Rules

- Use past-tense business language for completed facts.
- Avoid implementation details in event names.
- A domain event records a business fact within its context model; an integration contract has separately defined external meaning, ownership and versioning, without requiring a technical event name.

## Payload Language

| Field | Business meaning | Required? | Notes |
| :--- | :--- | :--- | :--- |
| `<field>` | `<meaning>` | `<yes/no>` | `<notes>` |

## Consumer Interpretation

| Consumer | Interprets event as | Follow-up action | Notes |
| :--- | :--- | :--- | :--- |
| `<consumer>` | `<meaning>` | `<action>` | `<notes>` |

## Open Questions

| Question | Owner | Status |
| :--- | :--- | :--- |
| `<question>` | `<owner>` | `<open/resolved>` |
