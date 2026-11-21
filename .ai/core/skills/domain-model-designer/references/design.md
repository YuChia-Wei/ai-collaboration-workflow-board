# Design a bounded domain model

## Inputs and authority

Bind the modeling goal, source requirements/rules/example IDs and status, existing
language/model, accepted decisions, compatibility constraints and current authority.
Use only quality conditions that affect this model. A complete upstream document
or a prior `explore` operation is not required. Reuse sufficient accepted inputs;
label missing business policy rather than completing it from technical preference.

For requested selected knowledge use [the installed protocol](knowledge.md) with
capability `architecture` and operation `design`. Select only needed DDD discovery,
strategic/tactical/evolution topics, domain-language or Context Map resources, or
BDD discovery/formulation. Selected .NET aggregate/DbC guidance is optional and
target-adopted; it does not make .NET, a concrete library or infrastructure mandatory.

## Model sequence

1. State the capability, actors, trigger and observable result. Name the business
   owner and vocabulary; preserve ambiguity rather than using a folder as a boundary.
2. Propose context relationships where language or responsibility warrants them.
   Explain upstream/downstream meanings and translation needs without equating
   a bounded context with a service, deployment unit or database.
3. Allocate behavior and invariants. Use entities, value objects, aggregates,
   domain services and events only when they clarify responsibility. Explain
   which facts must change consistently together and which intermediate business
   states are permitted. Distinguish invariant ownership from references between objects.
4. Describe relevant states, transitions, refusal conditions and domain events.
   Preserve the difference between a business event and an implementation/message
   delivery mechanism. An aggregate boundary is a model proposal, not an ORM mapping.
5. Compare credible alternatives, including a simpler model. Explain consequences
   for language, consistency, existing consumers and model evolution; retain the
   requirement or evidence behind the recommendation and unresolved owner choices.
6. Walk examples and counterexamples against each important rule. Shared GWT
   examples clarify expected behavior; they do not decide fixtures, runners,
   isolation, execution level or test oracle machinery. Missing outcomes remain
   questions to the source owner, not invented assertions.
7. Identify feasibility obligations for software architecture: required atomicity,
   tolerated intermediate states and cross-owner effects. Do not choose transport,
   persistence, broker, retry or transaction implementation here. If a proposed
   mechanism cannot meet an invariant, expose the conflict and alternatives for
   the relevant owner; never silently substitute eventual consistency.

## Deliver and inspect

Scale the proposal to the question: vocabulary/context relationships, responsibility
and invariant ownership, state/behavior/events, example mappings, alternatives,
evolution consequences, assumptions and unresolved decisions. Not every output
needs a diagram, full Context Map or every tactical pattern. Preserve source IDs
and accepted/proposed/observed/unknown status in a coherent deliverable.

Use [review criteria](review.md) for an author self-check when useful, labelled
`self-check`. It is not independent review or executed model/behavior acceptance.
Default to conversation; write only to the selected authorized destination,
preserving existing unrelated content and the target's format.

When another decision is needed, carry sources/version, accepted model, examples,
invariants, explicit open questions, requested output and original authority to
software architecture, specification, requirements or implementation as appropriate.
No receiving skill is mandatory and no proposal creates execution or approval
authority. A complete model request may finish without a subsequent handoff.
