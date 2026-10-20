# Specification organization guide

Use the target's selected root, naming rules, formats and existing artifact owners.
This optional layout does not require `.dev/specs`, move records or create empty
directories. The [authoring method](authoring.md) owns artifact selection;
[presentation guidance](spec-guide.md) offers optional formats.

## Reflect accepted semantic ownership

For domain-oriented targets, group documents by the accepted context and, where
relevant, the aggregate whose behavior is specified. Reuse accepted designer
outputs. A reference does not transfer ownership; a query, adapter or flow may
have another accepted owner. Preserve uncertainty instead of guessing a directory
that silently establishes an unresolved boundary.

```text
docs/specifications/
  <bounded-context>/
    <aggregate>/
      entity/<aggregate>-spec.md
      behaviors/create-<aggregate>.md
    adapters/<interface>-spec.md
  tests/                              # related artifacts owned by test-designer
    <bounded-context>/
      aggregate/<aggregate>.test-spec.md
      behaviors/create-<aggregate>.test-spec.md
      integration/<target>.test-spec.md
    cross-context/<flow>.test-spec.md
```

Names, extensions and grouping above are examples. The tests subtree illustrates
related `test-designer` outputs, not artifacts spec-author must create.
Keep system specifications and test designs distinguishable while preserving
existing cross-references and observable acceptance in system specifications.
A cross-context subject need not be forced beneath one aggregate.

## Selected relocation

Relocate only when requested. Inspect current identities, accepted ownership,
references and unresolved work; list exact moves and affected references.
Preserve historical IDs, decisions and approval state. Update only authorized
links and retain the selected schema/version and normalization contract.
A layout proposal alone does not authorize a move, migration or new record store.
