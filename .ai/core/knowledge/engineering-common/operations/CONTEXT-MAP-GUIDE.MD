# Context Map Guide

This is optional, technology-neutral authoring guidance. Use the target project's
selected document location, template and evidence. This guide neither provisions
a document store nor adopts an integration policy for the target.

## Purpose and scope

A context map helps collaborators understand bounded contexts, their language,
responsibilities and relationships. A bounded context is a model boundary;
it does not by itself prescribe a service, process, database or message broker.

Start with the bounded question and the contexts it affects. Distinguish the
observed system from proposed relationships, assumptions and unresolved choices.
Do not invent a relationship merely to connect every context in a diagram.

## Suggested document outline

- Scope and evidence sources
- Bounded contexts and responsible owners
- Relationships and integration choices
- Contract ownership and change coordination
- Failure, consistency and recovery expectations
- Open questions and deferred decisions

Adapt the outline to the target; a short change may need only the affected rows.

## Describe each bounded context

Useful details include its name, purpose, business responsibilities, language,
owned model and invariants, important use cases and relevant aggregates.
Identify the team or role responsible for its model and contracts. Separate
model ownership from infrastructure operation when different owners are involved.
Record upstream or downstream relationships only where the evidence supports them.

## Describe each relationship

For each relevant pair, consider recording:

- Source and target context, direction and interaction purpose
- Relationship pattern and the collaboration it requires
- Interaction mechanism and why it fits the target's needs
- Model translation, contract owner and consumer responsibilities
- Failure sensitivity, consistency expectations and unresolved assumptions

Patterns such as customer-supplier, conformist, anti-corruption layer, open host
service, published language or Shared Kernel describe different collaboration
choices. Select and explain applicable patterns rather than requiring them all.

## Select integration and sharing deliberately

The target may choose synchronous calls, asynchronous messages, in-process
interaction or no integration. Record the actual choice and its consequences;
an MQ-only rule belongs to a target that explicitly adopts it.

Keep each context's model ownership clear. Sharing a model is a deliberate
coupling decision, not a universal prohibition or a default shortcut. If the
target selects a Shared Kernel, identify its exact shared scope, joint owners,
change coordination and how affected teams validate compatibility together.
Do not label an arbitrary common DTO or utility library a Shared Kernel.

Contract location, distribution, versioning and compatibility policy are
target-selected. A shared repository is one possible arrangement; separately
owned published contracts and other arrangements need their own clear owners.
Distinguish a published integration contract from a context's internal model.

## Explore failure and consistency

Ask which outcomes require immediate consistency, which may converge later,
and who owns each invariant. State transaction boundaries and what a caller can
observe when another context is unavailable, delayed or rejects a request.
Where applicable, explore duplicate delivery, ordering, retries, timeouts,
compensation, reconciliation and recovery responsibility. Do not assume these
mechanisms exist merely because the map mentions messages or eventual consistency.

## Present the result and preserve unknowns

A diagram or table can make relationships easier to inspect; accompany it with
enough text to explain ownership, constraints and the reasons for key choices.
Use the format the target selected rather than requiring both forms universally.
Keep unresolved ownership, compatibility and consistency questions visible with
their decision owner and next evidence needed. A proposed map does not prove
runtime integration, successful recovery or project adoption.
