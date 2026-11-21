# Explore a bounded domain question

## Scope and sources

Bind the question or blocked model decision, relevant capability/context, permitted
sources, existing terms, examples, accepted decisions and current authorization.
Separate stakeholder statements, observed implementation and proposed models.
Code reveals current behavior; it does not establish intended business policy.
Reuse sufficient inputs. Ask only for facts needed by the affected judgment and
continue independent supported analysis.

For requested selected knowledge use [the installed protocol](knowledge.md) with
capability `architecture` and operation `explore`. The allowlist contains domain
discovery, its navigation/example, BDD discovery and collaborative discovery.
Choose the needed topic directly; do not load the collection. This operation
does not select .NET rules, a rule catalog or design templates.

## Exploration

1. State the observable business question, actors, trigger and outcomes. Collect
   the language used by its actual owners; preserve competing meanings and scope.
2. Identify sourced rules and examples, including refusal and boundary cases.
   Use GWT or another clear format when useful; do not invent expected outcomes
   or imply stakeholder agreement because an example is plausible.
3. Ask which facts, transitions and decisions belong together, where language
   changes meaning, and which requirements may need consistency across owners.
   These are model hypotheses until supported and accepted, not automatic
   aggregate, service or storage decisions.
4. Challenge hypotheses with a bounded counterexample. For cancellation, compare
   before/after shipment, repeat requests and concurrent payment only when relevant.
   A missing refund rule remains a business question, not an inferred mechanism.
5. Stop when the selected uncertainty is sufficiently explained or the remaining
   decision has a named owner and bounded impact. Do not keep asking questions
   to fill a template or produce every DDD artifact.

## Output and next decision

Return sourced vocabulary/rules/examples, conflicts, model hypotheses, explicit
unknowns, their impact and the smallest next step. Existing IDs/status remain
unchanged. A diagram, model design, requirement document or handoff is optional
unless its distinct output is needed to answer the request.

If model alternatives must be chosen, carry the question and sources to `design`;
if stakeholder policy is missing, return it to its actual requirement owner.
If the model is settled and only implementation feasibility is unknown, name that
software-architecture question. Another skill need not be installed to return
this semantic handoff. It preserves existing authorization and creates none.

Do not select a database, broker, transaction API, test runner or deployment model.
Exploration does not implement code, approve requirements or establish acceptance.
Return in conversation unless a caller-selected destination and write scope exist.
