# Design bounded software architecture

## Inputs and authority

Bind the requested design/revision, behavior and source IDs/status, existing domain
responsibilities and invariants, dependencies, target decisions, known workload,
quality constraints, compatibility obligations and current authorization. A model
artifact or another skill invocation is not mandatory when the bounded technical
problem is already sufficiently defined. Reuse accepted choices; existing code
does not override accepted behavior merely by existing.

Separate facts, observed behavior, assumptions and proposed choices. Missing or
conflicting authority blocks only its dependent decision; present bounded options
and identify the owner. Do not choose business policy to fill a technical design.

For requested selected knowledge follow [the installed protocol](knowledge.md)
with capability `architecture` and operation `design`. Select only applicable
technology-selection/authoring/review guidance, rule catalog or optional .NET
resources in the allowlist. No language, ORM, broker, DI API, CQRS, event sourcing
or project layout is selected by the skill name or a source-file suffix.

## Design sequence

1. State the capability, actors, trigger, observable result and quality constraints.
   Preserve accepted vocabulary and invariant ownership; identify any concrete
   unresolved domain question instead of redesigning the model incidentally.
2. Allocate software components and application responsibilities. Explain their
   dependency direction and integration boundaries. Clean Architecture and
   Hexagonal lenses protect policies from mechanisms when useful; compare a
   simpler valid arrangement and avoid speculative abstraction.
3. Place inbound application and outbound dependency ports where needed. Give
   every abstraction a purpose such as vendor isolation, compatibility or a
   controllable failure/time/data seam. Keep domain decisions independent of
   transport and persistence; do not equate contexts with microservices.
4. Describe relevant commands, queries or reactions: input/output, errors,
   dependency lifetime, external effects, transaction/concurrency owner and actual
   mechanism. Meet accepted consistency requirements; do not reinterpret them
   as weaker guarantees for convenience.
5. Walk relevant failure windows: commit versus publish, retry, duplicates,
   ordering, partial failure, cancellation, recovery and observability. Describe
   supported guarantees, never assumed exactly-once delivery. Compare coordination
   or compensation with the sourced invariants for cross-owner effects.
6. If technical limits conflict with the model or requirement, return the conflict,
   affected outcomes and feasible options to that owner. Keep the dependent
   choice proposed/unresolved; do not silently switch atomicity to eventual consistency.
7. Compare alternatives with benefits, costs, operational burden and evidence or
   assumptions. Address relevant security/performance/availability requirements
   without inventing workload, capacity or benchmark measurements.
8. For existing consumers, describe compatibility/versioning, rollout order,
   migration/recovery and rollback limits when relevant. Define observable
   acceptance and evidence needs, distinguishing controlled tests from real
   storage/messaging/integration evidence. A proposal authorizes no execution.

## Deliver at the requested scale

| Subject | Include when relevant |
| --- | --- |
| Module/component | Purpose, accepted domain owner, application responsibility, dependencies, ports/adapters and integration contracts. |
| Persistence/coordination | Accepted invariants, atomicity needs, mechanism, concurrency/error semantics, alternatives and recovery limits. |
| Command/query/reaction | Trigger/input, application/domain responsibility, outbound effects, result/error and observability. |
| Messaging integration | Producer/consumer contract, actual guarantees, transaction/publish boundary, duplicate/order policy, retry and recovery. |

Return a coherent proposal with source bindings, alternatives, assumptions,
recommendation, unresolved owner decisions and validation needs. Label choices
proposed until accepted. Diagram dependencies/effects only when it helps; no
fixed document family or required artifact count. Persist only to a selected
authorized destination and preserve unrelated content.

Relevant deployment constraints and network failure assumptions may inform this
software design. Do not expand into network routing/DNS/firewall topology,
cross-datacenter infrastructure, hardware capacity, platform operations, IaC or
pipeline construction. Missing coverage remains explicit; no future system-architect
or DevOps skill is presumed installed.

Use [review criteria](review.md) as a labelled author self-check when useful.
It is not independent review, implementation or specification compliance. A
needed handoff carries sources, accepted decisions/invariants, open questions,
requested output and original authority to domain/requirements, specification,
test design, ADR or implementation. No handoff adds permission or requires another
skill when the requested architecture output is complete.
