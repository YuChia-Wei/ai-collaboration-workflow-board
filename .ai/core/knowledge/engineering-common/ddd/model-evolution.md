# Evolve a model using evidence

Use this topic when new examples, expert feedback or operational observations
challenge an existing model.
Select a concrete discrepancy; do not rename or restructure the model for novelty.

## Establish the current claim

Identify the model, affected behavior and governing requirements.
Record which vocabulary and decisions are accepted.
Distinguish implemented behavior from behavior that has been validated.
Identify consumers and records whose meaning depends on the current model.
Preserve an explicit source for the observation that triggered reconsideration.

For cancellation, the discrepancy might be that one status is being interpreted
as both order acceptance and external refund completion.
First determine whether this is an actual defect, a language ambiguity or
a newly requested capability; do not assume the answer from the status name.

## Explore a focused alternative

Write a concrete example the current model cannot explain clearly.
Propose a small alternative and replay the same example against it.
Ask a domain expert what the alternative changes in business meaning.
Use a sketch, scenario, conversation or permitted small experiment as appropriate.
Return to discovery when the example exposes a missing rule.
Return to boundary analysis when the alternative changes responsibility.
These activities may repeat or occur in a different order.

Positive example:
Compare separate cancellation and refund-progress concepts using an unresolved
refund outcome, while retaining the accepted behavior sources.

Counterexample:
Rename every “Cancelled” state to “Completed” and treat existing records as
if payment and delivery had always shared that meaning.

## Separate semantic change from implementation refactoring

A name change can preserve meaning or introduce a different contract.
Ask whether old callers, stored records and operators would interpret it identically.
List affected APIs, events, schemas, reports, examples and operational procedures.
If a new meaning is intended, record its owner decision explicitly.
Do not hide a business policy change inside a structural refactoring.
Do not overwrite historical statements to make them appear consistent with a new model.

## Plan compatibility where it is required

Identify which consumers can change together and which cannot.
Describe how existing data would be interpreted under the proposed model.
An old status may lack enough information to classify a new refund state.
Record that ambiguity instead of manufacturing a completed or failed outcome.
Choose translation, migration or coexistence only after the target selects a policy.
Retain unresolved records and rollback limitations in the change proposal.
Avoid introducing compatibility machinery when no affected consumer requires it.

## Select evidence for the changed claim

Use examples to check meaning with domain experts.
Use focused behavior checks for the changed invariant or operation.
Use contract evidence for representations crossing a context boundary.
Use real infrastructure evidence when the claim depends on its behavior.
A passing local check does not confirm an external refund policy or provider outcome.
Preserve failed attempts and distinguish unexecuted checks from successful ones.
Revisit earlier assumptions when the new evidence contradicts them.

## Stop conditions and limits

Stop the affected mutation when accepted meaning and proposed meaning conflict.
Obtain an owner decision before changing entitlements or financial outcomes.
Do not infer missing historical facts from a convenient migration default.
Do not announce adoption from an exploratory sketch or successful experiment.
Unknown compatibility obligations limit how far an implementation plan can proceed.
Model exploration does not authorize code changes, migration or deployment.

## Review the result

Does the alternative explain a concrete problem more clearly?
Are remaining contradictions visible?
Can a receiver identify the decision, affected contracts and required evidence?
Is the smallest useful next step clear without mandating a full redesign?

Return to [the topic index](README.md) to select the next unresolved question.
