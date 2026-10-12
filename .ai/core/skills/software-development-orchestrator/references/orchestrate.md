# Development orchestration method

## Select the work

Start from the requested outcome, observable acceptance, current artifacts and
existing authorization. A high-level feature or connected change can activate
orchestration without the user naming this skill. Keep an explicit specialist
selection and bounded single-stage request with its owner. AI-context audits,
context maintenance, installation and release administration retain their own
owners; their presence does not turn them into product development stages.

Choose direct work or a durable workflow from the project's actual policy and
handoff needs. Use its existing record format, templates, location and supported
writer when selected. Do not create a second store, convert old records or impose
one workflow, branch, Issue or approval per skill invocation. If no project record
format is selected, a concise plan and progress in the conversation suffice
unless durable handoff is required. Resolve that handoff format before depending
on persistence; do not invent a schema or claim a conversation is durable state.

Group work that shares one outcome, authorization, review and integration
boundary. Sequence dependencies; parallelize only independent work with suitable
isolation and available delegation. Keep one integration owner and comply with
the project's writer and review isolation rules.

## Resolve capabilities and sequence stages

Plan only the stages needed to reach the accepted outcome. For each, identify
its goal, inputs, output, owner, dependencies, check and pending decision. Already
accepted requirements, designs and specs are inputs; do not repeat their authoring
merely to fill a pipeline. Route an unexplained failure to diagnosis before
assuming a repair. Implementation may follow an already settled technical design
without another architecture pass.

Resolve each capability through explicit user selection, then the project's
selected route, then available skill descriptions and operation contracts. These
bundled IDs are candidates when installed, not mandatory dependencies:

| Needed capability | Bundled candidate | Boundary |
| --- | --- | --- |
| Requirements | `requirement-author` | Intent, business rules and observable acceptance. |
| Specifications | `spec-author` | The selected production, entity, adapter or formal-test artifact. |
| Problem framing | `problem-frame-author` | Commanded behavior and identified sources. |
| Architecture | `ddd-ca-hex-architect` | Domain/dependency decisions or architecture artifact review. |
| Scenario design | `bdd-gwt-test-designer` | Scenario set/matrix/artifact design or review; formal-test specifications remain with their authoring owner. |
| Slice implementation | `slice-implementer` | One accepted behavior, coordinated refactor or concrete test slice and its immediate checks. |
| Local change | `local-change-implementer` | One technical target and operation preserving public contracts and the bounded dependency radius. |
| Diagnosis | `diagnostic-analyst` | Causal investigation of an observed symptom and a repair proposal; grants no repair authority. |
| Code review | `code-reviewer` | Defect findings in selected executable code, a diff or concrete implementation guidance. |
| Selected compliance | `spec-compliance-validator` | Complete criterion/evidence coverage or assessment in a fixed scope, when requested or required. |

Test execution uses target-owned commands and prerequisites; no dedicated test
skill is required. Architecture and scenario artifact reviews stay with their
respective owners. Do not route every review to the code reviewer or introduce
compliance solely because this skill was selected.

Read the selected owner's entry and applicable operation before applying it.
If no matching skill exists, direct execution of a bounded capability may remain
possible under project policy. Label that fallback, its method and limits. If a
required capability, permission or evidence is unavailable, mark that stage
blocked and continue independent authorized work. A similarly named skill is not
proof of equivalent scope, availability or output.

## Execute and hand off

Carry existing approval and the user's constraints into every stage. Resolve a
pending requirement, design or specification decision before dependent
implementation. Do not ask again when current authorization already covers the
action. A plan, diagnosis, review or installed capability supplies no additional
permission. Push, PR, merge, release, provider writes, credentials and adoption
use their actual owners and separately applicable authorization.

Give each specialist or delegated worker a bounded handoff: goal and non-goals,
source/artifact identities, accepted decisions and current approval, owned
paths/operations, expected output and check, dependencies, stop conditions and
the integration owner. Include workflow/task IDs only when the project selected
them. Load any applicable target delegation or role contract. Do not fabricate
an invocation, model identity, independence or result from a dispatch description.

Apply the selected specialist instructions directly or genuinely delegate when
supported and useful. Review its actual result against the stage criteria before
dependent work. Preserve domain findings and uncertainty; an aggregate summary
must not replace the specialist's evidence with the orchestrator's assertion.
Reconcile conflicting outputs with their owner rather than silently choosing
one or widening the change.

Select meaningful validation from target acceptance, changed behavior and
project commands. Record prerequisites, environment and actual outcomes. Unit,
fixture or static evidence cannot satisfy a criterion requiring integration,
native, hosted or product execution. Keep failed attempts and distinguish
`passed`, `failed`, `blocked-by-environment`, `not-run`, `not-applicable` and
owner-authorized deferrals. Never turn an environment blocker or deferral into a
pass. Use the target's long-running validation and retry contract when applicable;
do not manufacture an unavailable external execution route.

## Resume and close out

For `resume`, read the checkpoint and current artifacts, repository identity,
uncommitted changes, permissions and selected capabilities. Reconcile completed
work, dependencies, evidence freshness, outstanding approvals and next actions.
Do not restart completed stages or reuse stale evidence without the project's
required proof. Preserve stable IDs/history through the selected record owner.
Unknown authority or conflicting state blocks only the affected continuation.

Before closeout, compare the actual results with acceptance and retain every
unresolved or deferred item. Report implementation, required tests, selected
compliance, review, commit, integration, release and adoption separately. A commit
or merge does not complete unfinished work; a local source fix does not establish
runtime acceptance. Complete only the outcome that the evidence supports.

When work remains, leave a usable checkpoint with source identities, accepted
decisions, actual results, remaining tasks/dependencies, approval boundaries,
blockers and a concrete next action. Use the project's supported record writer
and retention policy; do not delete or compact history as a closeout side effect.
Useful lessons, decisions, backlog items or promotion candidates may be handed
to their selected owners. A retrospective candidate is not an adopted rule.
