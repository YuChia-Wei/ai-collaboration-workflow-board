# Formulate precise behavior examples

Read this when agreed behavior needs a form people can inspect or implement.
It also helps review examples for missing sources, setup or expected outcomes.
Do not require a new formulation stage when complete supplied examples already
express the selected behavior. Gherkin is optional unless the task selects it.

Formulation turns shared understanding into precise examples.
It does not turn a proposal into an accepted rule or a written assertion into
evidence that the system behaves as described.

## Bind the behavior source

Identify the bounded behavior, existing requirement or acceptance IDs,
source revision and agreement or observation status.
Use the exact conversational source when no document exists.
Preserve accepted scenario and data-row IDs rather than generating replacements.

A work-tracker Feature is not necessarily a Gherkin Feature.
One acceptance criterion can need several examples.
One example can demonstrate several closely related outcomes.
Choose the mapping that preserves meaning rather than forcing equal counts.

## Select an expression

| Expression | Useful when | Check |
| --- | --- | --- |
| Short example prose | A small case needs discussion | Concrete circumstances, event and expected outcome |
| Decision table | A rule depends on combinations of conditions | Each outcome has a source; unknown cells remain unknown |
| Given/When/Then notes | Setup, trigger and observations need separation | Each part has a clear role |
| Gherkin | Requested or selected by the target | Readable behavior and valid selected syntax |
| Existing target test-design artifact | A target contract selects its structure | Required meaning survives that structure |

Do not produce every form for the same case without a useful reason.
A formal artifact's owner and target contract determine its required structure.
Naming an example “specification” does not itself settle that responsibility.

## Supply concrete state and one meaningful event

Given establishes relevant data, permissions, time, dependency responses and state.
State what must be controlled and what still needs a target decision.
Do not depend on an earlier scenario's execution to create the state.

When identifies the primary behavior and its inputs.
One main event usually makes an example easier to understand.
An essential sequence is valid when its purpose is explicit;
do not combine unrelated triggers merely to reduce the number of examples.

Then describes observable values, relations, state, events or error contracts.
Replace “works correctly” with what an observer can inspect.
Choose the business or public contract appropriate to the selected test boundary.
A private storage detail needs a reason before it becomes an acceptance oracle.

## Establish an independent oracle

For every important expected outcome, identify its requirement, agreed example,
decision or other permitted source.
Do not learn the expected value from the production algorithm being tested.
A snapshot of current behavior can support characterization when explicitly
selected, but it does not establish that the behavior is approved.

Keep distinct outcomes distinct.
For reserved-loan refusal, refusal and preservation of the due date both matter.
A single assertion may demonstrate equivalent observations only when that
equivalence is explained; an assertion count alone proves nothing.

## Handle ambiguity and variation

Separate approved behavior, assumptions, proposals and observed implementation.
Leave an unknown result provisional and identify the decision it needs.
If sources conflict, expose the conflict rather than choosing the easiest oracle.
Absence of one rejection condition does not establish permission.

Include supported success, rejection, boundary and failure examples.
Consider duplicates, ordering, cancellation or concurrency only where relevant.
Use shared example rows when setup, action and assertion responsibilities match.
Split rows when those responsibilities differ materially.
Preserve row identity and the source of each expected result.

## Return a usable result

Return the examples, source/status bindings, setup and oracle notes,
AC-to-example mapping, exclusions and unresolved cases.
Call this planned coverage or design representation, not executed coverage.
For implementation, preserve the same IDs, data, primary action and every outcome.
See [automation](automation.md) for the connection to real checks and evidence.

## Sources and limits

Original synthesis informed by
[Cucumber BDD](https://cucumber.io/docs/bdd/) and
[Writing better Gherkin](https://cucumber.io/docs/bdd/better-gherkin/).
The method applies to several expressions; it requires no particular runner.
