---
name: domain-model-designer
description: Explore, design or review a bounded domain model using business language, behavioral examples, invariant ownership and consistency requirements. Preserve accepted rules and expose unresolved business decisions without selecting software mechanisms.
---

# Domain Model Designer

Select only the requested operation:

- [explore](references/explore.md): resolve bounded uncertainty in language,
  rules, behavior or model responsibility; a model diagram is not required.
- [design](references/design.md): propose or explicitly revise a domain model.
- [review](references/review.md): assess a fixed model artifact without editing it.

Supply the bounded question, permitted sources, behavior/examples and their
acceptance status, existing model/decisions, constraints and current authority.
No PRD, complete Context Map or upstream skill is mandatory. Reuse supplied
artifacts and IDs; distinguish accepted rules, observations, proposals and unknowns.

Own domain language, context relationships, state, behavior, invariants and which
business facts must remain consistent together. Software structure, persistence,
transaction mechanisms, transport and recovery mechanisms belong to software
architecture. A technical feasibility conflict returns to the relevant model or
requirement owner; it cannot silently relax an invariant. A bounded context is
not automatically a microservice or a physical project.

BDD examples can clarify and challenge a model. Test levels, data partitions,
fixtures, isolation, oracle machinery and coverage design remain test-design
work. Requirements and specifications can reuse the same examples without
creating another copy or invoking another skill solely because they use GWT.

For requested optional knowledge, follow [the verified resource protocol](references/knowledge.md)
and this operation's metadata-4 allowlist. Missing selected coverage is visible;
continue unaffected common work from caller sources without source-checkout fallback.
Knowledge selection does not adopt target rules or choose a technology.

Return prose by default; persist only at an authorized caller-selected destination.
This instruction package has no executable, configuration, managed record store,
mandatory technology or other skill dependency. Design proposes; review reports
findings. Neither grants business approval, implementation permission, independent
acceptance or evidence of runtime behavior.
