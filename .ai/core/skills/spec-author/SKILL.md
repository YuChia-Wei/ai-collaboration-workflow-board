---
name: spec-author
description: Draft or normalize a selected production, entity, adapter or formal-test specification using caller-supplied sources, target contracts, templates and destinations. Preserve source bindings, accepted scope and unresolved choices.
---

# Spec Author

Use this package for a selected specification artifact. The public operations
are `draft` and `normalize`; read [the authoring method](references/authoring.md)
and only the default template for the selected type when the caller has not
provided one:

- [Production/use-case specification](references/production-template.md)
- [Entity/value-object specification](references/entity-template.md)
- [Adapter/interface specification](references/adapter-template.md)
- [Formal-test specification](references/formal-test-template.md)

For an optional target-selected format or layout, see [presentation guidance](references/spec-guide.md)
and [organization guidance](references/spec-organization-guide.md).

These templates are ordinary prose references, not machine schemas. The caller
may select a different template, format and output path. With no destination,
return the draft in the conversation. No configuration, store, tool, required
skill dependency or mandatory programming runtime is provisioned.

A formal-test specification stays with this package when it contains
Given-When-Then scenarios. Scenario notes, a GWT matrix or assertion design
without a formal specification are a different requested output. Preserve an
explicit skill selection and resolve a conflicting artifact request rather
than silently changing owners.

Authoring records expected behavior and how it may be verified; it does not
approve architecture, implement or run tests, or prove code/test compliance.
Common guidance does not supply an unselected technology-specific contract.
