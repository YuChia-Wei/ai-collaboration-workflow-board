# Compare contexts and relationships

Use this topic when models disagree across activities, teams or existing systems.
Compare boundaries using business meaning and responsibility before discussing
processes, repositories or deployment units.

## Distinguish problem scope from model boundaries

A subdomain describes a business capability or problem-space concern.
A bounded context defines where a model and its language have a consistent meaning.
These concepts need not map one-to-one; compare the actual business and model evidence.
Core, supporting and generic subdomains express the target's differentiation and
knowledge or capability investment needs, not a ranking of code complexity or quality.
Classification may change as the target's strategy and learning change.

## Identify a candidate context

State the purpose, language and decisions owned inside the candidate boundary.
Describe the actors who maintain that meaning and the sources that establish it.
List the responsibilities that remain outside.
Ask whether two uses of a term need the same meaning and change for the same reasons.
A disagreement may suggest separate contexts; it is not conclusive by itself.

Ordering might use “cancelled” for an accepted change to a commercial commitment.
Delivery might use it for stopping a delivery activity.
These are candidate interpretations until the relevant experts confirm them.
Do not establish a context boundary solely from a noun, table or team chart.

## Compare plausible alternatives

For each alternative, write one example it explains clearly.
Write one example that creates coordination or translation difficulty.
Ask who owns each decision and who must agree when its meaning changes.
Consider existing system boundaries and organizational constraints explicitly.
Keep the cost of change and coordination visible alongside semantic clarity.

Positive example:
Separate order and delivery meanings, with an explicit exchange between owners.
They may initially run in one deployable application if the target selects that design.

Counterexample:
Create one microservice per context before examining operational requirements.
A semantic boundary alone does not justify distributed deployment.

## Describe the actual relationship

Record the participating contexts, the exchanged meaning and the direction of use.
Distinguish control over a contract from control over the other context's model.
Ask whether the consuming side can negotiate changes or must adapt to them.
Describe translation, compatibility and failure responsibilities.
Label the relationship as observed, proposed or accepted.

Consider a translation boundary when an external vocabulary would distort the model.
Consider a shared definition only when joint ownership and change coordination
are real commitments, rather than an assumption made to reuse code.
Consider keeping concerns separate when integration provides no required value.
Choose relationship patterns for the situation; do not complete a pattern checklist.

## Keep exchange semantics separate from transport

Specify what the receiver may conclude from an exchange.
“Cancellation requested” does not establish “cancellation completed”.
An integration contract is an agreed representation crossing a boundary.
A domain event records a fact in a model; it need not be exported unchanged.
A transport carries a representation and has its own delivery behavior.
Selecting a relationship does not select HTTP, a queue or a broker.
Transport decisions belong to the target's architecture and operational constraints.

## Capture useful evidence

A small context map can show ownership, meaning and dependency direction.
Include external payment or refund providers when their outcomes affect the use case.
Do not imply that an external service participates in a local atomic transaction.
Record required response semantics and currently unknown failure responsibilities.
The target can use an existing architecture record instead of a new diagram.
An optional context-language record can preserve differences in terminology.

## Stop conditions and limits

Stop a boundary conclusion if its decision owner cannot be established.
Escalate incompatible business meanings rather than forcing a global definition.
Do not classify a business capability as core solely because its code is complex.
Do not impose one model on a partner whose authority is independent.
Missing contract or operational evidence limits implementation conclusions.
A context map does not prove compatibility, runtime isolation or message delivery.

## Review the result

Can a reader tell which owner decides the meaning of cancellation?
Are local facts distinguishable from confirmations expected from another context?
Are candidate boundaries separated from deployment choices?
Are relationship labels supported by actual ownership and negotiation conditions?

Return to [the topic index](README.md) for discovery or implementation-level questions.
