# Authoring Boundaries And Handoffs

Requirement, specification and problem-frame authoring share source intake and
traceability mechanics. Their document types, schemas and authoring owners stay
distinct. Select the requested output before using the format of the input.

## Select The Artifact

| Requested result | Owner | Boundary |
| --- | --- | --- |
| Bounded requirement exploration, stakeholder goals, business rules and acceptance criteria | `requirement-author` | Code is observed current behavior, not confirmation of business intent. |
| A production, entity or adapter system specification from requirements and accepted design | `spec-author` | Preserve design source identities, decisions and the selected system-spec contract. |
| A CBF/SWF model and its required file set for a selected use case/workpiece | `problem-frame-author` | Preserve source bindings and distinguish observed/inferred behavior from approved requirements. Drafting is not compliance validation. |
| General test designs, GWT test scenarios or formal test specifications | `test-designer` | One owner controls test-design semantics and selected formal-test output; implementation and execution remain separate. |
| A dedicated Story plan, draft, normalization or whole/selected-AC review | `user-story-author` | Preserve value, sources and observable AC; no upstream authoring stage is required. |
| An unresolved domain-language, state, aggregate or invariant-ownership decision | `domain-model-designer` | Explore/design/review the model; do not select software mechanisms or rewrite accepted business policy. |
| An unresolved software-boundary, port, dependency or technical consistency decision | `software-architect` | Design/review mechanisms against accepted behavior/model; return feasibility conflicts to the relevant owner. |

A generic word such as "spec", shared input files, file count, GWT wording or
the presence of code does not identify the requested artifact. Requirements,
Stories, models and system specs may contain observable examples. Test boundary,
level, data, isolation, oracle machinery and coverage design belong to test-designer.
Reuse shared example IDs; do not create a second owner merely from their format. If the artifact or necessary
authority cannot be determined from the request and current context, ask one
focused question before authoring an assumed document type. Honor an explicit
skill selection; if it conflicts with the requested artifact, explain the
conflict and resolve it rather than silently substituting another skill.

## Source Binding

For material claims, carry the source reference and available revision or
section, the source requirement/rule identifier, and whether the claim is
approved, proposed, inferred, observed or unresolved. Preserve existing source
IDs; do not manufacture stakeholder approval or promote implementation behavior
to normative intent. Report conflicting authority and its unresolved decision.

Code-only recovery may produce an explicitly observed/inferred draft when that
is the requested task. It must not invent missing requirement/spec files,
acceptance authority or a passing compliance verdict. Keep unresolved facts
visible and block only the dependent claim or action under the owning contract.

## Handoff

A handoff carries the selected artifact and location, source bindings, accepted
decisions, open questions, requested next output, authorization state and any
needed validation. Reuse those artifacts instead of asking the next skill to
re-extract or regenerate unchanged source documents.

Required handoffs are only those needed to finish the currently requested
artifact. A draft that explicitly retains unresolved facts can finish with open
questions; future policy approval or requirement formalization is not a required
handoff for that draft. If useful, label a future option separately as optional.
Another authoring skill cannot supply missing stakeholder authority merely by
writing a document. Block only the claim or action that depends on that authority.

There is no mandatory problem-frame -> requirement -> spec pipeline. Choose the
next owner only when its distinct output or decision is needed. A complete
requested artifact can end with no next skill. Explicit multi-artifact requests
may sequence the selected owners; do not add unrequested authoring stages.
Authoring approval never silently becomes implementation, independent review,
test execution or specification-compliance evidence. Existing per-skill schemas, role bindings and adopted target rules remain
authoritative; this guidance creates no new packet or validation gate.
