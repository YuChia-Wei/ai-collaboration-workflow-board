# Review a fixed software architecture artifact

Bind path/version and digest, or bounded inline input, before review. Record
requirements, accepted domain/model decisions, quality constraints and requested
coverage separately; artifact claims cannot validate themselves. Leave the subject
unchanged. If revision is also authorized, finish the review before design edits
and bind any later review to the revised subject.

For requested selected knowledge use [the installed protocol](knowledge.md) with
capability `architecture` and operation `review`. Apply only matching allowlisted
common or selected .NET resources with the actual target authority. Missing
required specialist coverage remains unavailable/blocked; common reasoning
cannot substitute for its acceptance. Different valid styles, unadopted patterns
or absence of speculative interfaces are not defects.

| Criterion | Evidence and questions |
| --- | --- |
| Requirements and quality | Are choices bound to behavior, accepted model and measurable constraints? Which workload/capacity claims remain assumptions? |
| Responsibilities | Are software responsibilities coherent and accepted domain owners preserved? Are missing business decisions explicit instead of invented? |
| Dependencies and ports | Does direction protect business policies from transport, persistence and vendors? Does each abstraction have a concrete purpose? |
| Consistency mechanisms | Do transaction/concurrency mechanisms and intermediate states meet sourced invariants? Is an infeasible requirement disclosed to its owner? |
| Alternatives | Are credible simpler options and their costs considered without treating preference as a requirement? |
| Failure and recovery | Are relevant retry, duplicates, ordering, durability, compensation, observability and operating responsibilities supported? |
| Evolution | Are compatibility, versioning, rollout, migration/recovery and rollback limits coherent for affected consumers? |
| Testability | Are outcomes observable and seams controllable? Is real integration evidence distinguished from mocks and unexecuted tests? |

Each finding needs location, criterion/source requirement, evidence, trigger,
impact, severity rationale, uncertainty and bounded correction. Separate defects,
questions and optional improvements, preserving valid alternatives. Review the
artifact here; executable-code review and test design have separate owners.
Do not invent vendor choices, business policy or benchmark claims to make it pass.

Return subject, sources, findings, criterion coverage, exclusions/unavailable
coverage, assumptions, actual inspections/commands and exact open decisions.
No findings means none supported in this scope, not runtime compliance or acceptance.
Select one classification with evidence of the author relationship:

- `self-check` if the reviewer authored or repaired the subject.
- `review; independence not established` if author relationship or required
  independence evidence is unknown.
- `independent-review` only if a different author, fixed subject, read-only
  reviewer and applicable target independence requirements are evidenced.

A digest establishes identity, not independent authorship; a different prompt
or model alone proves no independence. No mandatory audit packet is created.
Optional handoff names affected artifact, source IDs, correction, actual owner
and existing revision/implementation permission. Return that information if a
receiving skill is unavailable; it grants no new authority. Infrastructure or
DevOps coverage outside the selected software scope remains explicitly excluded.
