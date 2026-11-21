# Requirement authoring method

## Mandatory public requirement boundary

For public Epic, Feature, User Story and Issue/ticket content, including comments,
MUST describe the product need independently: problem, beneficiary or outcome,
scope, relevant scenarios, observable acceptance and real dependencies. Readers
must not need a private conversation to reconstruct the requirement.

MUST NOT publish execution authorization or its approval/revision history, agent handoff,
resume instructions or execution checkpoints in that requirement channel. Record
and retrieve authorization and handoff through the target's workflow mechanism.
An Issue system is not a substitute workflow store. If that mechanism is unavailable,
report the missing record or blocked handoff; do not silently fall back to an Issue,
comment, or another store, and do not claim a transfer occurred.

Feature inventories, requirement/design discussion, product decisions and supported
requirement revisions/status, linked
Issues, and concise completed/pending/deferred feature summaries MAY remain.
Explain dependencies such as "requires #123's API" and link relevant result evidence
without copying execution logs. Product approval/permission behavior is valid
requirement content; permission for an agent to push or merge is execution authority.
Classify by purpose and meaning, not forbidden words or headings.

Before creating or updating content, check this boundary and correct violations
within the authorized scope. In a read-only review, report the selected violation
and a bounded correction; do not edit it. Keep valid requirements, IDs, decisions,
uncertainty and acceptance meaning. Do not mandate one wording, heading order,
provider, Workflow Board deployment or new storage product. Unselected historical
records remain unchanged. Drafting or reviewing requirements never grants execution
permission or proves implementation, adoption or acceptance.

These are instructions for the selected operation, not an executable command.
The package metadata's implemented status means that these instructions exist;
it does not mean they have been invoked, verified or accepted for a target.

## Select the result and intake

1. Establish the requirement topic, audience, in/out scope and requested
   operation. `draft` creates a new requirement draft from supplied evidence.
   `normalize` restructures or clarifies an existing requirement within the
   accepted edit scope, preserving its meaning and identities.
2. Identify the source material and its authority: stakeholder statements,
   existing requirement versions, accepted decisions or constraints, and any
   explicitly scoped code/test observations. Obtain only evidence needed for
   this artifact. A source mentioned but unread is unavailable, not verified.
3. Use the caller-selected template, language, terminology, naming conventions
   and destination. Otherwise use the packaged
   [requirement template](requirement-template.md) as a prose starting point.
   Adapt irrelevant sections explicitly; never fill them with fabricated facts.
   Target rules govern their target; this default does not override them.
4. If the requested artifact or a necessary decision cannot be resolved from
   the available context, ask the smallest focused clarification. Missing
   approval need not prevent an explicitly proposed draft: leave that claim
   unresolved and continue independent sections. A necessary scope or authority
   conflict blocks only the dependent claim or write.

A requirement captures intent and acceptance. A production/entity/adapter/formal
test specification is a distinct artifact. GWT wording may appear inside
acceptance criteria without changing the requested document type. There is no
mandatory chain of authoring skills.

## Preserve evidence and uncertainty

For each material claim, carry its source reference, available version/revision
or section, source requirement/rule ID and status. Preserve provided IDs and
their meaning. Distinguish:

- **User-supplied fact or intent:** attribute the statement to its source;
  supplied does not automatically mean stakeholder-approved.
- **Extracted observation:** identify the inspected document/code/test and
  scope. Current implementation behavior is evidence of current behavior,
  not proof of desired business intent.
- **Assumption or proposal:** explain what was inferred or added, why it helps,
  and which owner or evidence would confirm it.
- **Unresolved choice or conflict:** retain both sources, the affected claim
  and the needed decision. Do not silently choose the most convenient source.

Record product requirement/decision approval only when supplied evidence supports
it, within that scope. Execution authorization belongs exclusively to the workflow
mechanism, not the public requirement. Preserve separate approval and observation statuses where
needed. Do not invent revisions, owners, source files, IDs from another system,
measurements or acceptance results. New local draft labels may aid traceability
if clearly identified as draft labels. Do not promote an architecture decision
into stakeholder intent or an implementation accident into a business rule.

## Build a useful requirement

- Explain the present problem, desired outcome and who needs it. Separate
  success measures from a proposed technical solution.
- State each functional requirement as an actor/condition, capability and
  observable result. Group by user goal or use case where useful.
- Capture business invariants, permissions, exceptions, rejection conditions
  and priority conflicts that are actually supported. Retain domain language.
- State non-functional requirements with a measurable target, measurement
  boundary and conditions when those are known. Mark an unknown threshold as
  open; do not invent a number to make a sentence appear testable.
- Separate external constraints from assumptions. Explain dependencies and
  unresolved business or architecture decisions without choosing an unapproved
  owner, aggregate, platform, persistence mechanism or deployment model.
- Bind acceptance criteria to their requirement or rule. Describe observable
  success and relevant failure/boundary behavior with inputs, conditions and
  expected outcomes. Proposed criteria stay proposed until approved. Include
  GWT only when useful or requested; prose or a table is equally valid.
- Keep exclusions explicit. Do not enlarge the requirement by making optional
  improvements mandatory or by adding unrelated stakeholder goals.

When normalizing, first read the current document and its references. Preserve
accepted behavior, priorities, IDs, exceptions, cross-references, approval
states and unresolved questions. Call out semantic changes separately from
wording/structure changes; do not silently resolve contradictions or delete
unsupported claims without explaining their disposition. Preserve sections
outside the authorized edit scope and caller-selected template constraints.

## Deliver and check the draft

Read the completed draft against the selected sources and template. Check
requirement-to-acceptance traceability, consistent terminology, supported
business rules, visible assumptions and unresolved conflicts. Report missing
evidence and any requested technology-specific knowledge not supplied by this
common package. Textual review is not code/test compliance or executed
acceptance; name only checks actually performed.

Return the complete draft, source bindings, assumptions and decisions still
open. For normalization, summarize material changes and retained uncertainty.
Report whether delivery is conversation-only, written or merely a suggested
path. If a file write is requested, resolve it within the caller-authorized
location, inspect existing content, preserve unrelated edits and follow target
write controls. Do not choose a hidden framework directory, overwrite an
unrelated file or move existing records to fit the default. If a required
destination/tool is unavailable, return the draft and state the missing write.

If another distinct output or decision is needed, hand off the existing
artifact/location, source bindings, accepted decisions, open questions,
authorization state and exact next output. Otherwise finish here. Do not
mandate another skill, install a dependency, create workflow/store records,
implement code, execute tests or assert approval as a consequence of authoring.

## Optional method knowledge

When selected knowledge is relevant to this draft or normalization, follow
[the installed-resource protocol](knowledge.md) and the current operation allowlist.
Reuse accepted inputs and decisions; do not require exploration or re-ask resolved
questions unless new conflicting evidence affects the requested output.

## Behavioral examples and design questions

Requirements may contain sourced Given/When/Then or other observable examples.
Their format alone does not select test-designer. Test level, data partitions,
fixtures, dependency control, independent oracle machinery and coverage design
are distinct requested outputs. Preserve shared example IDs when handing them off.

Domain-model-designer is a candidate for unresolved language/model responsibility
or invariant ownership; software-architect for software dependencies, ports and
mechanisms. Do not select these choices while authoring requirements. Reuse accepted
model/architecture decisions and keep only the concrete remaining question open.
