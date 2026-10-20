# Example: order cancellation across distinct responsibilities

This is an illustrative modeling exercise, not a company's accepted requirement.
Ordering, delivery and payment are candidate responsibility boundaries.
Their exact ownership and policies require target confirmation.

## Start with the supplied uncertainty

The word “cancel” may describe different outcomes to different participants.
Ordering may discuss changing an order commitment.
Delivery may discuss stopping preparation or movement.
Payment may discuss releasing an authorization or returning captured funds.
Do not assume those interpretations or actions are equivalent.

The cancellation deadline is unknown.
The policy for failed refunds is unknown.
No example here decides either policy or establishes a customer's entitlement.

## Ask questions that change the model

Who may request cancellation, and who decides whether it is allowed?
What does order cancellation mean after delivery work has started?
Which payment fact is authoritative when its latest outcome is unknown?
Must any external confirmation precede local acceptance?
Which interim conditions may the customer and operator observe?
Who resolves a refund that cannot be completed?
Which answer is an agreed rule, and which is still an expert question?

Record each answer with its source and owner.
Keep alternatives provisional when the relevant answer is unavailable.

## Compare a local invariant with external work

Consider this candidate local rule for discussion:
“An accepted cancellation must not leave the order locally fulfillable.”
It is a proposed invariant, not a requirement supplied by this exercise.

If accepted, identify the order state and operations that must change atomically
to prevent local fulfillment from proceeding under that commitment.
Check competing cancellation and fulfillment operations.
Do not claim enforcement until the target selects and verifies the mechanism.

Stopping independent delivery activity is a separate question.
A delivery owner may already have accepted work or performed an irreversible step.
The local order transition cannot alone establish that delivery has stopped.
Payment completion likewise depends on facts outside the order model.

## Explore a conditional scenario

Assume, solely for this example, that the target later accepts:
local cancellation can be recorded before the refund outcome is available.
A scenario could then distinguish these observations:

Given an eligible order has a captured payment
And the payment boundary has not confirmed a refund result
When the authorized actor requests cancellation and local acceptance succeeds
Then the order records the accepted cancellation
And the refund outcome remains pending rather than completed

Eligibility, actor authority and the pending-state policy remain assumptions
until confirmed by their owners.
This scenario cannot be used to decide a cancellation deadline.
It also does not decide whether a failed refund reverses cancellation.

## Preserve the three different contracts

An internal fact such as “order cancellation accepted” belongs to its model.
An exchange with payment needs a separately agreed request and outcome contract.
A transport carries that exchange and may require additional delivery guarantees.
Do not copy an internal event and presume every external consumer shares its meaning.
Do not choose a queue, broker or event-sourced store from the example.

## Useful and misleading conclusions

Useful: “We need a decision about whether local cancellation may precede refund.”
This names the unresolved policy and the consistency question.

Misleading: “DDD requires cancellation, delivery and refund to be three services.”
The exercise establishes neither deployment topology nor operational requirements.

Useful: “The local operation and external completion need distinct observations.”
This preserves uncertainty without choosing a financial policy.

Misleading: “Refund failure means cancellation must be rolled back.”
That is a business decision that the supplied facts do not establish.

## Handoff and stopping point

Return candidate meanings, local invariants, external responsibilities and questions.
Map accepted answers to examples before producing implementation commitments.
Stop the affected design when no owner can decide the cancellation or refund policy.
Continue only the parts whose behavior and authority are already established.

See [domain discovery](../domain-discovery.md),
[strategic design](../strategic-design.md) and
[tactical design](../tactical-design.md) for the relevant method questions.
