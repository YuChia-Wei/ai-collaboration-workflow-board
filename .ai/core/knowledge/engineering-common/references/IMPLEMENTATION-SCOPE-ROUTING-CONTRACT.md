# Implementation Scope Routing

Choose the implementation owner from the change's unit, dependency radius and
semantic authority. File count alone does not decide local versus slice scope.

## Selection

| Situation | Route | Required boundary |
| --- | --- | --- |
| One technical target and operation, including its direct call sites and immediate tests in the allowed module/radius | `local-change-implementer` | A private implementation helper type may remain local only when it keeps the accepted target, radius, behavior, responsibility, dependency direction, lifetime, and transaction boundary unchanged. Public contract or domain-language change routes onward. Several files can remain one local change. |
| One accepted behavior/refactoring goal that needs coordinated implementation steps or a public, responsibility-changing, dependency/lifetime/transaction-affecting type | `slice-implementer` | Select one command/query/reactor/generic mode; do not reopen an already settled architecture decision merely because a type is added. |
| Missing or changed responsibility, module/aggregate boundary, dependency direction or business-language decision | `ddd-ca-hex-architect` | Stop the dependent implementation and resolve that decision; a prior unrelated approval is insufficient. |
| Unexplained failure or performance symptom without a bounded causal finding | `diagnostic-analyst` | Diagnosis does not grant repair authority. |
| Several independent behavior goals or work whose needed tasks cannot yet be bounded | The project-selected orchestration route | Bound and sequence the work before implementing it as if it were one slice. |

When one concrete missing semantic, compatibility or architecture decision is
already identified, route that decision to `ddd-ca-hex-architect` first, even
across services. Module count alone does not require orchestration or a new
requirement document. Add an authoring stage only when its artifact is requested
or is a demonstrated missing input to the current decision.

When the primary target, operation, affected contracts or allowed radius is
unknown, ask a bounded scope question before choosing an implementation owner.
Do not infer a safe local change from "small", "rename" or a line-count estimate.
Public DTO/API/event or ubiquitous-language renames require the appropriate
accepted semantic/compatibility decision; they are not local symbol renames.

Use `slice-implementer` for a public, responsibility-changing, dependency,
lifetime, or transaction-affecting type. A private implementation helper type
can stay local only when its semantic impact remains inside the accepted target
and radius. Ask for architecture work only when an actual decision is missing
or changes. Likewise, an authorized test-only implementation uses the existing
generic slice and applicable test binding; complete scenario input need not be
designed again.

## Ownership And Handoff

A selected slice keeps responsibility for its goal, local edits and validation.
Calling `local-change-implementer` for a separable technical subtask is optional
when it improves isolation or clarity; it is not a mandatory handoff for each
method or file. Do not bounce between the two skills for the same accepted work.
If the whole request is one local operation, select the local owner directly.

Carry the original authorization, normative source and optional finding
evidence separately, plus the primary target, radius, accepted decisions,
remaining work and validation evidence. An authorization already covering the
receiving work remains valid; a handoff itself cannot add scope or approval.
Expand to a different owner only for a concrete missing decision or out-of-scope
operation. Preserve target-selected tests, adopted target verification requirements and
independent review requirements; implementation does not declare compliance.

List a handoff as required only when needed for the current requested output.
For diagnosis-only work, any later repair remains conditional on the causal
finding and authorization; do not preselect a local/slice repair owner before
its technical unit and radius are known. Keep optional future work separate
from required handoffs and distinguish prevented scope risks from actual expansion.
