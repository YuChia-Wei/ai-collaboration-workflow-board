# Discover behavior through examples

Read this when a rule, expected outcome, scope boundary or shared term is unclear.
Use it for exploration-only tasks and for questions found during implementation.
It is unnecessary to repeat discovery when supplied sources already settle the
behavior needed for the selected task.

Discovery creates shared understanding with people who know the business,
delivery and testing constraints. It does not approve requirements on their behalf.
A useful result may be one precise question rather than a scenario set.

## Start with a small outcome

State who needs an outcome, why it matters and the boundary being discussed.
Use the target's existing story or requirement instead of inventing another.
Identify the people or sources that can resolve business and technical questions.
Keep a term ambiguous until its meaning is confirmed.

For example, “renew a library loan” needs a meaning for loan, renewal and due date.
It does not automatically include notification, payment or returning the item.

## Keep four kinds of information distinguishable

| Item | Purpose | Useful record |
| --- | --- | --- |
| Rule | State a constraint or expected result | Existing ID, wording, source and agreement status |
| Example | Make a rule concrete | Circumstances, event and observable outcome |
| Question | Preserve missing knowledge | Exact uncertainty, affected examples and decision owner |
| New story | Identify a separate useful outcome | Value and reason to consider a separate slice |

These are discussion aids, not a required document schema.
Keep existing identifiers; use clearly local labels when none exist.
An author's suggestion, an accepted rule and observed software behavior have
different authority even when their wording happens to match.

## Explore examples and counterexamples

Begin with a concrete example that the participants can explain.
Vary one relevant condition at a time to discover what the rule depends on.
Ask which variation changes the outcome and which should make no difference.
A counterexample challenges the current rule; it does not silently replace it.

For a rule that another member's reservation prevents renewal, ask:
- What happens when the reservation belongs to the borrower?
- Does reservation cancellation before the request change the relevant state?
- Which due date should remain visible after refusal?
- Does absence of a reservation establish permission, or merely remove one obstacle?

These questions are candidates for discussion, not additional requirements.
Do not add timing, concurrency or identity rules without a supporting source.
Record whether a counterexample exposes a missing rule, ambiguous language,
contradictory sources, or an implementation defect against an agreed rule.

## Make unresolved outcomes visible

Use a provisional example when circumstances are useful but the result is unknown.
Do not invent an oracle to complete the table.
An overdue loan with no reservation can expose the missing overdue policy;
neither permission nor refusal follows from the reservation rule alone.

Identify the decision needed next and who can supply it.
If two interpretations remain plausible, describe both and their consequences.
Do not treat silence, a convenient implementation or an illustrative example
as approval of either interpretation.

## Finish proportionately

Return the bounded outcome, agreed rules and examples, unresolved questions,
counterexamples needing decisions, and separately useful stories.
For discovery only, stop before claiming a designed scenario set or test coverage.
For a combined task, carry supported rules and their IDs into formulation while
keeping affected examples provisional.
Reopen discovery when later feedback exposes a material misunderstanding.

See the [library example](examples/library-renewal.md) for a complete small slice.

## Sources and limits

Original synthesis informed by
[Cucumber BDD](https://cucumber.io/docs/bdd/) and
[Example Mapping](https://cucumber.io/docs/bdd/example-mapping/).
The questions above illustrate exploration and establish no library policy.
