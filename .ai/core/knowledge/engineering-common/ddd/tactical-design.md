# Assign behavior and consistency responsibilities

Use this topic inside a selected context when an accepted behavior needs
a model that can preserve its rules.
Start with the behavior and invalid outcomes, rather than a list of pattern classes.

## Identify the state transition

Name the operation in the context's language.
List the information required to decide it and the outcomes it may produce.
For each outcome, identify its requirement, example or unresolved source.
State what must remain unchanged when the operation is refused.
Separate a request to act from the fact that an action succeeded.

For cancellation, identify which order facts the local operation may change.
Delivery and refund outcomes require their own authority.
Do not add an accepted eligibility rule merely to make a transition implementable.

## Find the atomic invariant

Write the forbidden combination of facts in plain language.
Ask whether the rule must hold immediately after every accepted local operation.
Identify all competing operations that could violate it.
Determine which model owner must control the relevant mutation.
A candidate aggregate should protect that immediate consistency responsibility.

Do not choose the boundary by copying a database foreign-key graph.
An aggregate is not a table, a screen or every object reachable from a root.
Ask whether a proposed boundary needs unrelated objects just for display.
Ask whether a smaller boundary can enforce the same accepted invariant.
If a rule spans owners, reconsider the rule, boundary or coordination requirement;
do not silently weaken immediate consistency into eventual repair.

## Choose modeling roles only where useful

Use entity identity when continuity matters despite changing attributes.
Use value semantics when the modeled meaning depends on a value rather than identity.
Keep rules near the state and behavior that own them.
Consider a domain service when a domain operation has no suitable object owner.
An application use case can arrange external interactions without owning their rules.
These choices do not require inheritance hierarchies or universal base classes.
Repository and factory abstractions should serve an actual model need.
DDD alone does not require one repository per table or an ORM.

## Distinguish local completion from later external work

Ask which facts can be committed under the chosen local consistency boundary.
Then list work requiring another owner or infrastructure outcome.
State the allowed interim condition and how observers can recognize it.
If that condition is not accepted, obtain a decision before implementing it.
Do not claim an external refund succeeded because local cancellation was recorded.

Positive example:
A proposal records an accepted local cancellation and separately tracks a
refund obligation whose completion depends on the payment boundary.
The proposal still needs acceptance of the interim state and failure policy.

Counterexample:
Commit an order flag and report that delivery and refund are complete.
A local write cannot establish those external outcomes.

## Give events precise meaning

Name a domain event after a fact that has occurred in its owning context.
Describe what the producer knows when that fact becomes true.
Do not publish a completion fact while the operation is merely requested.
Choose an integration representation separately when another context needs it.
A domain event does not imply asynchronous delivery or event sourcing.
Duplicate, ordering and retry responsibilities require selected integration contracts.

## Stop conditions and limits

Stop implementation guidance when the atomic invariant is still disputed.
Do not choose compensation, retry or financial policy without target authority.
Expose unknown concurrency requirements rather than assuming single-writer behavior.
Persistence, transaction facilities and transport remain target technology decisions.
A diagram or unit example alone does not prove real concurrent enforcement.

## Review the result

Can each invariant be assigned to an owner that controls its mutation?
Can a refusal preserve the required state?
Can observers distinguish local acceptance, pending external work and completion?
Are proposed mechanisms separated from accepted business guarantees?

Return to [the topic index](README.md) when boundaries or meanings need revision.
