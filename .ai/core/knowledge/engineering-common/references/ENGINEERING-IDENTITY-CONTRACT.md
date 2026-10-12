# Engineering Identity Contract

Contract ID: `ENG-IDENTITY-001`.

This is the canonical portable universal baseline contract for engineering
identity. [Context resource ownership](CONTEXT-RESOURCE-OWNERSHIP.md) classifies each
artifact's single semantic owner. The target owns adoption and effective state;
this source repository's private registry is not a consumer prerequisite.

## Load The Relevant Identity, Not A Whole Directory

An action consumes the freshness-validated, task-scoped effective rule packet
selected by the target-owned resolver or explicit consumption binding. It does not scan every `.dev/` or `.ai/`
document and it does not replace missing target-effective state with remembered
framework defaults.

The packet identifies the applicable `concept_id`, `rule_id`, and
`constraint_id`, retains their full normative statements, and records the
baseline version and target-state digest. Load abstract enforcement capability
or technology-binding details only when implementation, validation, upgrade,
or diagnostic handling needs them.

For registered universal rules, the portable baseline is
`../engineering-rule-catalog.yaml` in this directory. It preserves the full
anchored source statement and source-governance provenance. For profile rules,
the resolver uses the profile catalog as an exact projection of the profile
Markdown owner. Neither catalog allocates a missing path-derived identity;
unregistered documents remain unpacketized and fail closed.

## Identity Boundary

- Concepts, rules, and constraints express engineering meaning.
- Abstract capabilities express enforcement classes, such as static analysis,
  executable tests, or human review.
- Technology bindings connect a selected profile's capability to a constraint.
- Providers, analyzers, runtime validators, Diagnostics, package versions,
  commands, and target configuration are implementation details of a binding;
  they are never substitutes for semantic identities.

References are explicit `(kind, id)` pairs. Missing, duplicate, ambiguous, or
type-invalid references are unresolved and fail closed. File moves, provider
changes, diagnostic renumbering, and package upgrades retain the identity when
meaning is unchanged; a changed meaning requires explicit owner-approved
supersession.

## Portable Baseline Boundary

Cross-technology semantics belong in engineering-common; profile-specific
semantics belong in an explicitly selected knowledge package. Installed content
is optional. The target-owned authority retains applicability, customization,
rule resolution and governance; installation does not adopt a rule or create a
second semantic owner. Source-governance history is inert provenance. Retained
target owners stay effective until explicit binding reconciliation.
