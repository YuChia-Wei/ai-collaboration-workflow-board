---
name: software-architect
description: Design or review software structure, dependencies, ports/adapters and failure mechanisms against sourced behavior, accepted domain responsibilities, quality and compatibility constraints. Expose feasibility conflicts without changing business policy.
---

# Software Architect

Select [design](references/design.md) to create or explicitly revise a software
architecture proposal, or [review](references/review.md) to assess a fixed artifact
without editing it. Supply a bounded goal, behavior/contracts and acceptance
status, existing model/dependencies, quality constraints and target decisions.

Own software component boundaries, dependency direction, application responsibilities,
ports/adapters and technical consistency, failure/recovery and evolution mechanisms.
Use Clean Architecture and Hexagonal approaches when they address the actual
problem; no pattern, physical project split or technology is implicitly selected.
Domain language, invariant ownership and business consistency requirements stay
with the accepted domain model and its owner. Reuse them; a preceding domain
modeling skill invocation is not mandatory.

Expose a mechanism/model conflict with evidence and options for the relevant
owner. Do not silently weaken a business invariant. Behavioral examples can
explain a contract; test levels, fixtures, data and oracle machinery retain
their test-design owner. Other skills are optional, not prerequisites.

Read [the verified knowledge protocol](references/knowledge.md) for requested
optional coverage and use only this operation's metadata-4 allowlist. Selection
does not adopt target rules. Continue unaffected common work from caller sources
when knowledge is absent, with the specialist gap disclosed.

Return prose by default; persist only to an authorized caller-selected destination.
This instruction package has no executable, configuration, managed store or
mandatory technology. It neither implements code nor deploys infrastructure.
Network/platform topology, IaC and delivery-pipeline construction require their
own selected scope/capability; relevant operational assumptions may be inputs.
Source availability, invocation, verification and acceptance remain distinct.
