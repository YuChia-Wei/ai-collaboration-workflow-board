# Project and product context

Authoring instructions (remove from the authored document): first look for an
equivalent README, product brief or requirements document. Reuse it rather than
creating another source of truth. Use this seed only for a selected missing
context document. Keep the target's language and terms. Fill sections from
identified documents or explicit owner statements; mark consequential unknowns
instead of inferring intent from code. Remove unused sections and all seed prompts.

## Purpose and current stage

State the problem this project exists to solve and its current stage, such as
an experiment, product development or service maintenance, only when established.
Separate the intended outcome from what the current implementation can do.
If it is an experiment, state which conclusions must not be generalized to
production without a separate decision.

## Users and situations

Describe the actual intended users and the situations in which they use the
product. Link the authoritative source. Do not invent personas, customers or
requirements to complete this section.

## Scope and non-goals

Record accepted responsibilities and explicit non-goals. Link detailed
requirements and their acceptance criteria instead of copying them here.
An undocumented boundary is unknown; existing code alone does not adopt it.

## System boundary

Identify known external systems, interactions and responsibility boundaries.
Link architecture or interface documents for details. Distinguish observed
connections from planned integrations and avoid copying credentials or private
connection values.

## Constraints and decisions

Summarize accepted constraints and important decisions with links to their
owners, rationale or ADRs. An implementation choice is an observation until
there is evidence of adoption. Do not create new business, architecture or
operational policy while filling this document.

## Evidence and open questions

For each material claim, identify its source and whether it is owner-confirmed,
documented intent or observed implementation. List unresolved facts and any
decision needed from the appropriate owner. State conflicts without choosing
a winner or inventing approval.

## Related documents and maintenance

Link the existing requirements, technical inventory, architecture and agent
entry when present. This project owns this document. Factual refresh preserves
accepted scope and decisions; product changes belong to the authorized product
work. Updating or removing the framework does not update or remove this file.
