# Specification organization guide

Use the target project's selected root, naming rules and existing artifact owners.
This optional layout does not require `.dev/specs`, move existing records or create
empty directories. The [authoring method](authoring.md) owns artifact selection;
[presentation guidance](spec-guide.md) offers optional formats.

## Reflect semantic ownership

For domain-oriented targets, group documents by bounded context and, when relevant,
by the aggregate whose behavior is specified. A reference to another aggregate does
not transfer ownership. A query, adapter or cross-context flow may have its own
accepted owner. Resolve unclear boundaries before guessing their directory.

```text
docs/specifications/
  <bounded-context>/
    <aggregate>/
      entity/<aggregate>-spec.md
      behaviors/create-<aggregate>.md
  tests/
    <bounded-context>/
      aggregate/<aggregate>.test-spec.md
      behaviors/create-<aggregate>.test-spec.md
      integration/<target>.test-spec.md
    cross-context/<flow>.test-spec.md
    end-to-end/<journey>.test-spec.md
```

Names and extensions above are examples. Preserve a target's Markdown, JSON or
other accepted format, and keep production/test documents distinguishable. A
cross-context or end-to-end subject need not live under one aggregate.

## Selected relocation

Only relocate documents when that operation is requested. Read their current
identities, accepted ownership, references and unresolved work; list exact moves
and affected references. Preserve historical IDs and approval status, update only
in-scope links, and check the selected target format. A layout proposal alone does
not authorize a move or bulk migration.
