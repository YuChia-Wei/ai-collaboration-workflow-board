# Domain-driven design methods

Use this guidance to explore business meaning, compare model boundaries,
assign invariant ownership and revise a model using concrete evidence.
Select the topic that addresses the current uncertainty; no fixed sequence
or complete set of DDD artifacts is required.

## Choose the needed topic

- [Domain discovery](domain-discovery.md): establish language, examples,
  sources and questions before treating a model as agreed.
- [Strategic design](strategic-design.md): compare context boundaries,
  responsibilities and relationships.
- [Tactical design](tactical-design.md): assign behavior and consistency
  responsibilities within a selected context.
- [Model evolution](model-evolution.md): challenge and change a model
  without losing decisions, compatibility obligations or evidence.
- [Order cancellation example](examples/order-cancellation.md): distinguish
  local invariants from work involving delivery and payment boundaries.

## Authority and limits

This package supplies methods and illustrative examples.
It does not adopt project rules, approve business policies or select technology.
Keep accepted requirements, observations, proposals and unknowns distinguishable.
Ask the relevant domain expert to resolve business meaning; an AI-generated
interpretation remains a proposal until the target owner confirms it.

A bounded context is not automatically a microservice.
An aggregate is not automatically a table or an entire object relationship graph.
DDD does not require CQRS, event sourcing, messaging, an ORM or .NET.
A domain event, an integration contract and a transport message have different
responsibilities even when one implementation connects them.

Use existing target records and optional domain-language templates where useful.
The target chooses document placement, terminology and adoption.
A completed template or diagram does not prove an implemented invariant.

## Conceptual sources

Eric Evans' [DDD Reference](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf)
provides the conceptual vocabulary used here.
Eric Evans' [Whirlpool Process of Model Exploration](https://www.domainlanguage.com/ddd/whirlpool/)
landing page (undated, checked 2026-10-29), published by Domain Language,
describes model exploration that can fit within iterative development.
These operational notes are selective adaptations, not a reproduction of either
work. The DDD Reference summaries are adapted from Eric Evans, *Domain-Driven
Design Reference: Definitions and Pattern Summaries* (2015-03), Domain Language,
under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Changes include
selective paraphrase, task-oriented questions and original examples. No author
endorsement is implied. Preserve this attribution, source and license on further
adaptation. The separate Pattern Summaries and full book have different rights.
Only the Whirlpool landing-page description is summarized here. It links a
Creative Commons diagram; that diagram's exact license would need checking
before reuse. No diagram, PDF content, article text or code is bundled here.

These common principles do not erase a target's stricter selected policy. A .NET
profile may choose a narrow Repository surface, explicit UseCase/Input shape or
static-only pure Mapper for specific engineering reasons. Such forms are not
universal DDD requirements; changes to adopted forms need their actual owner.
Source silence neither forbids nor accepts every alternative design.

For target vocabulary records, optionally select the [domain-language entry](../domain-language/README.MD).
