# Target Technology Selection Policy

Rule IDs: `TECH-SELECT-001`, `TEST-MOCK-001`.

This method supports the engineering-common catalog's `TECH-SELECT-001` baseline;
its selection section is synchronized with that record. `TEST-MOCK-001` retains
its dotnet-backend profile owner. This method creates no second rule authority.

## Purpose

This policy defines one target-owned mechanism for selecting or overriding
technology choices such as mocking libraries, ORMs, database providers, message
brokers, dispatch frameworks, and runtime observability adapters.

Architecture invariants and technology selections are different:

- an adopted architecture or testing invariant cannot be replaced by a
  technology selection;
- a profile default such as NSubstitute may be replaced through an explicit
  target selection;
- conditional technology guidance applies only when its slot selects that
  technology.

## Selection Record

The target owner selects the configuration destination. `technologySelections`
in a project-owned YAML record is one supported authoring shape; installing
knowledge does not create it. Use the record semantics below and an explicit
target-selected schema when one is supplied. No removed initializer schema or
source-repository policy is required.

```yaml
technologySelections:
  - slot: testing.mocking
    value: Moq
    status: selected
    source: explicit-target-decision
    evidence:
      - requirements/testing-stack.md
    reason: Existing product test stack
```

Required semantics:

- `slot` is a stable dotted capability name, not a package-specific field;
- `value` is the target selection;
- `status` is `selected`, `not-applicable`, or `unresolved`;
- `source` is `repository-evidence` or `explicit-target-decision`;
- `evidence` contains repository-relative paths supporting the selection;
- `reason` explains an explicit override or unresolved decision.

An absent slot does not invent target truth. If the target adopts a
profile default for that slot, it applies until target evidence records
another selection. A target override changes the selected technology, not the
architecture invariants surrounding it.

Recommended stable slots include:

- `testing.mocking`
- `testing.bdd-runner`
- `persistence.orm`
- `persistence.database`
- `messaging.broker`
- `messaging.framework`
- `observability.runtime`

New slots must reuse this record shape.

## Default And Override Resolution

Resolve one slot in this order:

1. explicit target decision recorded in `technologySelections`;
2. repository evidence recorded by the target owner;
3. the applicable framework profile default;
4. unresolved, when no default exists.

Do not infer a selection from an illustrative example or from a package-specific
document that the target has not adopted.

## Profile-Owned Defaults And Invariants

The selected profile owns its technology defaults and engineering invariants.
For example, an adopted dotnet-backend profile uses `TEST-MOCK-001` for the
`testing.mocking` default and its evidenced overrides. The .NET profile also
owns its GWT, test independence and interaction rules. Those conventions do not
become universal requirements merely because this common method is installed.

A target may change a technology selection with evidence while preserving the
invariants it has adopted. Without an adopted profile or explicit target choice,
keep the selection unresolved instead of importing another profile's default.

Agent guidance, code review, test generation, and validation must consume the
selected slot. They must not require edits to every downstream standard when a
target changes the mocking library.

## Ownership And Upgrade

- The authorized authoring owner creates or refreshes target selection records
  from file-backed evidence and explicit user decisions.
- An explicitly selected upgrade procedure treats the selected configuration as
  target-owned truth and reconciles incoming defaults without overwriting it.
- Framework upgrades may change a profile default, but they do not silently
  replace a recorded target selection.
