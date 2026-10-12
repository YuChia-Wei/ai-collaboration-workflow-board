# Authoring Boundaries And Handoffs

Requirement, specification and problem-frame authoring share source intake and
traceability mechanics. Their document types, schemas and authoring owners stay
distinct. Select the requested output before using the format of the input.

## Select The Artifact

| Requested result | Owner | Boundary |
| --- | --- | --- |
| Stakeholder goals, business rules and acceptance criteria in a requirement document | `requirement-author` | Code is observed current behavior, not confirmation of business intent. |
| A production, entity, adapter or formal test specification under the target spec contract | `spec-author` | Preserve the selected spec type and its schema; GWT wording inside a formal test spec does not change the owner. |
| A CBF/SWF model and its required file set for a selected use case/workpiece | `problem-frame-author` | Preserve source bindings and distinguish observed/inferred behavior from approved requirements. Drafting is not compliance validation. |
| Scenario notes, a GWT matrix or assertion design without a formal spec artifact | `bdd-gwt-test-designer` | Scenario design is separate from test implementation and execution. |
| An unresolved responsibility, aggregate, port or dependency-direction decision | `ddd-ca-hex-architect` | Resolve the specific architecture decision; do not rewrite already accepted requirements. |

A generic word such as "spec", shared input files, file count or the presence of
code does not identify the requested artifact. If the artifact or necessary
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
