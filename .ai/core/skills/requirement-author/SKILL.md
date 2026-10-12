---
name: requirement-author
description: Draft or normalize a requirement document from stakeholder intent, business rules, source material and observable acceptance criteria. Preserve assumptions and source authority using caller-selected templates and destinations.
---

# Requirement Author

Use this package for a requirement document describing stakeholder needs, goals,
business rules and acceptance criteria. Select the requested artifact from the
request, not from the input format. Explicit skill selection and a conflicting
artifact request need resolution before drafting the wrong document.

The public operations are `draft` and `normalize`. Read
[the authoring method](references/authoring.md) for either operation. Use
[the default requirement template](references/requirement-template.md) when the
caller has not selected a target template. The template is ordinary prose
guidance, not a machine schema or a required record format. Optional
[presentation guidance](references/requirement-guide.md) covers naming and diagrams.

The caller supplies the scope, sources, applicable target rules and any chosen
template or output destination. With no destination, return the draft in the
conversation. This package has no configuration, store, tool, required skill
dependency or mandatory programming runtime.

Document facts, proposals and uncertainty faithfully. Authoring does not confer
stakeholder approval, implementation authority, executed acceptance evidence or
a compliance verdict. Do not add a specification, scenario-design or
problem-frame stage unless a distinct requested output requires it.
