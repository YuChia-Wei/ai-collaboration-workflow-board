# Explore a bounded requirement collaboratively

Use `explore` to clarify stakeholder needs, disputed behavior and consequential
unknowns before or alongside a requirement draft. It returns exploration notes,
not an approved requirement or a mandatory preliminary stage for other operations.

## Frame the exploration

Identify the actor, desired outcome, present problem and the decision currently
blocked. Reuse supplied scope, exclusions, authority and source identities.
If the request already contains a clear bounded question, begin with it.
Otherwise propose a small scope and label the proposal; do not investigate an
entire product merely because one behavior is unclear.

Use an explicit caller timebox or question budget when provided. Otherwise
propose one short question batch and a reassessment after the reply. This is an
interaction limit, not a claim that every unknown must be solved in that batch.
Agree what useful progress would permit drafting or an owner decision.

## Read before asking

Inspect the available, permitted sources relevant to the bounded question.
Read existing requirements, decisions and supplied examples before requesting
information they already contain. A referenced but unread source is unavailable.
Preserve its identity and the resulting uncertainty; do not invent its content.
Distinguish facts/observations, accepted decisions, proposals and unknowns.
Attribute statements and acceptance to the person or record that supports them.
A stakeholder statement is not automatically an accepted policy for every scope.
Do not repeat a resolved question unless new evidence creates a material conflict.

## Select optional knowledge narrowly

Follow [the verified installed-resource protocol](knowledge.md) for optional
collaborative discovery, BDD discovery and DDD domain discovery. Select only
resources needed for the bounded question; do not preload whole topic collections.
Missing knowledge does not block common exploration based on caller sources.

## Ask a small batch with a purpose

Choose questions whose answers could change scope, acceptance, priority or the
next action. Normally use one to three related questions at a time; adjust to
the caller's budget and complexity rather than enforcing a fixed interrogation.
Explain the consequence of the choice briefly and use concrete examples.
When evidence supports a recommendation, offer a recommended option, its reason
and the tradeoff. Keep it proposed until the owner chooses it.
When evidence is insufficient, say what is missing instead of manufacturing a
preferred answer. Allow an answer outside the presented alternatives.

For each question, distinguish the domain decision from a factual uncertainty.
Ask an owner about cancellation eligibility; do not ask them to guess whether
a provider actually supports a required operation. Identify a bounded lookup or
experiment for that external fact and preserve its execution/authority boundary.
Do not claim that a conversation has verified an external capability.

## Consolidate after each batch

Update the working facts, decisions, proposals and unknowns from the reply.
Retain unresolved conflicts and show what they block.
Use a concrete example or counterexample to check shared meaning where useful.
Do not force User Story, Gherkin or another artifact format onto exploration.
A feature/story hierarchy or a dedicated story-authoring route is not required.
Do not choose aggregate boundaries, specifications or technical mechanisms as
if they were stakeholder requirements; name any separately needed design output.

## Stop and hand off

Stop when the bounded question is answered sufficiently for the agreed next
step, the caller's timebox/budget is reached, the caller stops, or progress
requires unavailable evidence or an owner decision. Do not keep inventing
questions after the requested outcome is achievable.
A budget ending does not turn unresolved choices into agreement.
Return the current conclusion, sources/status, decisions, proposals and open
questions with their impact. Identify the smallest next step and its owner or
ownership gap: draft a requirement, obtain a decision, inspect evidence or run
a separately authorized bounded experiment.

Continue independent work where an unknown does not block it. Do not repeatedly
ask for existing authorization or imply that exploration authorizes implementation,
external writes, experiments or acceptance. Persist only to the caller's chosen
authorized destination; otherwise return concise conversation notes.
