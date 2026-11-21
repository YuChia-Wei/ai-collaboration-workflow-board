---
name: requirement-author
description: Explore bounded requirements, or draft or normalize a requirement document from stakeholder intent, business rules, source material and observable acceptance criteria. Preserve assumptions and source authority using caller-selected templates and destinations.
---

# Requirement Author

Use this package for bounded requirement exploration or a requirement document describing stakeholder needs, goals,
business rules and acceptance criteria. Select the requested artifact from the
request, not from the input format. Explicit skill selection and a conflicting
artifact request need resolution before drafting the wrong document.

The public operations are `explore`, `draft` and `normalize`. Select
[explore](references/explore.md) for a bounded unresolved need, not as a mandatory
prerequisite to drafting. Accepted input may go directly to draft or normalize.
Read
[the authoring method](references/authoring.md) for draft or normalize. Use
[the default requirement template](references/requirement-template.md) when the
caller has not selected a target template. The template is ordinary prose
guidance, not a machine schema or a required record format. Optional
[presentation guidance](references/requirement-guide.md) covers naming and diagrams.

The caller supplies the scope, sources, applicable target rules and any chosen
template or output destination. With no destination, return the draft in the
conversation. For selected optional knowledge, follow [the verified resource protocol](references/knowledge.md)
and the operation allowlist; absent coverage is unavailable without source fallback.
This package has no configuration, store, tool, required skill
dependency or mandatory programming runtime.

Document facts, proposals and uncertainty faithfully. Authoring does not confer
stakeholder approval, implementation authority, executed acceptance evidence or
a compliance verdict. Do not add a specification, scenario-design or
problem-frame stage unless a distinct requested output requires it.

For broader PRD, Feature and general requirement documents, retain these operations.
When a dedicated Story plan, draft, normalization or whole/selected-AC requirement
review is requested, `user-story-author` is an independent candidate if available.
Its use requires no prior requirement-author operation; existing operations here
remain usable. Test design keeps its own owner; no mandatory handoff is introduced.

Domain discovery can clarify vocabulary and business rules here. A decision about
context/aggregate responsibility, state or invariant ownership belongs to domain
model design; a dependency, port or technical mechanism belongs to software
architecture. Name only the specific missing decision. Observable examples,
including GWT, remain valid requirement content and do not require test design.

All public requirement outputs, including exploration summaries selected for an
Issue, MUST follow the [mandatory public requirement boundary](references/authoring.md#mandatory-public-requirement-boundary).
Execution authorization and handoff use the workflow mechanism, never Issue fields
or comments. This rule does not require a particular workflow product.
