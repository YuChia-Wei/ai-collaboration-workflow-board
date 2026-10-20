---
name: spec-author
description: Draft or normalize production, entity or adapter system specifications from requirements and accepted design outputs. Preserve source identities, decisions, invariants and unresolved choices without inventing design decisions.
---

# Spec Author

Use this package to express a selected system specification from requirements
and accepted designer outputs. Public operations remain `draft` and `normalize`;
read [the authoring method](references/authoring.md).
When no target template is supplied, select only the relevant prose default:

- [Production/use-case specification](references/production-template.md)
- [Entity/value-object specification](references/entity-template.md)
- [Adapter/interface specification](references/adapter-template.md)

Optional [presentation guidance](references/spec-guide.md) and
[organization guidance](references/spec-organization-guide.md) adapt to the
selected target format and location; they impose no new record family.

Reuse accepted designs without requiring the designer to repeat completed work.
Missing design decisions may remain explicit in a provisional draft when the
caller requests it; do not present inferred ownership or mechanisms as accepted.

Formal-test specifications and all test-design outputs belong to `test-designer`.
System specifications still retain observable acceptance and references to
existing test designs where relevant; verifiability is part of their contract.
If explicit skill selection conflicts with the requested artifact, resolve the
bounded mismatch with the caller rather than silently switching ownership or output.
There is no mandatory sequence of requirement, design, specification and tests.

Templates are ordinary prose guidance, not machine schemas. Honor a selected
target schema/version, template and destination. Without a destination, return
conversation output. This package has no configuration, store, tool, direct
method-knowledge consumption or mandatory programming runtime.

Authoring does not approve business or architecture decisions, implement code,
execute tests, establish acceptance or prove specification compliance.
