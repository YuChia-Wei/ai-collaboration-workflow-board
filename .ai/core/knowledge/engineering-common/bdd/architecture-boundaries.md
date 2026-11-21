# Scenarios across domain and architecture boundaries

Read when examples involve domain rules, application coordination or selected
delivery mechanisms. BDD does not require DDD, Clean Architecture, a `.feature`
file or Inbox/Outbox. Keep each target's accepted behavior and architecture.

## Choose what an example proves

| Concern | Scenario focus | Evidence boundary |
| --- | --- | --- |
| DDD invariant | Accepted transition or refusal, including state that must stay unchanged | Real domain behavior; use the context's language and [invariant owner](../ddd/tactical-design.md). |
| Application Use Case | Coordination, returned result and required port interactions | Real Use Case with controlled outbound ports; this does not prove database or broker behavior. |
| Clean Architecture | Policies remain independent of concrete adapters | Source/dependency checks establish dependency direction; Gherkin syntax and a passing behavior test do not. |
| Persistence or messaging | Commit, rollback, concurrency, duplicate delivery and recovery | Integration checks using the selected store/runtime and observable committed results. |

One behavior may need several checks without copying the same scenario into
every layer. Preserve its source/AC and outcome mapping. Separate domain facts,
durable outgoing intent, broker acceptance and consumer completion; recording
one does not establish the others. Domain events do not imply Event Sourcing.

In the [library renewal example](examples/library-renewal.md), a domain check
exercises the selected rule owner and observes refusal with the original due
date. A Use Case check supplies the loan and reservation through controlled
ports, invokes renewal and observes the refusal returned to the caller. Check
adapter behavior separately when the requirement depends on committed state.

## Conditional Inbox/Outbox example

[Stock reservation scenarios](examples/transactional-message.feature) assume
one local transaction can commit stock changes, outgoing intent and a record
that the incoming message was processed. Apply these examples only to a target
that has selected those boundaries and outcomes.

| Scenario | Required fixture and observation |
| --- | --- |
| MSG-TX-01 | Process the real consumer/Use Case; read committed stock, outgoing intent and incoming completion. |
| MSG-TX-02 | Fail outgoing persistence before commit; verify all local business/message changes roll back. An initially stored incoming envelope may remain pending. |
| MSG-TX-03 | Establish completed M1 independently; redeliver within its consumer/key/retention scope and verify no repeated local effect. |
| MSG-TX-04 | Inject the gap after broker acceptance and before dispatch confirmation; observe the retry's stable ID. The broker may receive a duplicate. |

The sample reserves 3 of 10 units; it defines no insufficient-stock, pricing or
authorization policy. Bind those outcomes to target requirements before adding
cases. Keep relay activity controlled when measuring local transaction results.

Initial durable receipt is not successful processing. Choose one local commit
owner and verify participant enrollment. Broker calls and another database are
outside that local transaction. Deduplication of M1 does not settle distinct
messages requesting the same business operation; define that idempotency policy
separately. A conflict retry must reload state, and an unknown commit outcome
needs reconciliation. These patterns do not promise end-to-end exactly-once.

Targets that claim concurrency, ordering, recovery after expiry or external
effects need corresponding cases. Use [automation guidance](automation.md) to
bind each claim to actual evidence. These supplied features have no bindings or
executed acceptance result.

## Sources

The [Clean Architecture dependency rule](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
explains policy/adapter separation. The
[transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
addresses dual writes and duplicate delivery. Scenario IDs, fixture choices and
the conditional three-part local transaction above are framework illustrations.
