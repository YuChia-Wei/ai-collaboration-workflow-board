# Review a fixed domain model

Bind the model's path/version and digest, or bounded inline subject, with source
requirements/examples, accepted decisions, requested coverage and permitted evidence.
An artifact's claims cannot validate themselves. Leave it unchanged; finish this
review before any separately authorized design revision and bind a later review
to the revised subject.

For requested selected knowledge use [the installed protocol](knowledge.md) with
capability `architecture` and operation `review`. Read only needed model/DDD,
language, BDD or selected .NET aggregate/DbC resources. Missing applicable authority
blocks the affected judgment. Common reasoning cannot replace required specialist
acceptance, and an unadopted pattern or different valid style is not a defect.

| Criterion | Review questions |
| --- | --- |
| Sources and language | Are terms, contexts, rules and examples traceable, with accepted versus proposed status preserved? Is observed code being mistaken for business intent? |
| Boundaries and ownership | Does each important decision/invariant have one coherent model owner? Are competing meanings and cross-context translations explicit? |
| Behavior and consistency | Do states, transitions, refusal outcomes and allowed intermediate states satisfy sourced rules? Which business facts must be consistent together? |
| Model choices | Are tactical patterns justified and simpler valid alternatives considered? Are references mistaken for ownership, or contexts for deployments? |
| Examples and uncertainty | Do relevant examples/counterexamples exercise the proposed model without inventing business outcomes? Are unknowns and their impact explicit? |
| Evolution and feasibility | Are consumer/model consequences and required architectural guarantees clear? Does the proposal hide a conflict by silently relaxing a business invariant? |

Each finding identifies location, source criterion, evidence, triggering condition,
impact, severity rationale, uncertainty and a bounded correction. Separate defects,
questions and optional improvements. Return valid alternatives and criterion
coverage, actual inspections, excluded/unavailable scope and unresolved decisions.
Do not rewrite requirements, select persistence or test machinery, edit code, or
claim specification compliance/runtime acceptance from this artifact review.

Select one review classification and support its author relationship:

- `self-check` when the reviewer authored or repaired the subject.
- `review; independence not established` when the relationship or required
  independence evidence is unknown.
- `independent-review` only with a different author, fixed subject, read-only
  reviewer and the target's applicable independence requirements evidenced.

A hash establishes identity, not independent authorship; a different prompt/model
alone does not establish independence. No findings means none supported in the
inspected scope, not general acceptance. No mandatory audit packet is introduced.
Optional handoff carries the affected artifact/source IDs, proposed correction,
decision owner and existing permission. It cannot turn a proposal into accepted truth.
