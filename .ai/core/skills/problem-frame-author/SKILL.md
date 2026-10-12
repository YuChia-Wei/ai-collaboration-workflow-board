---
name: problem-frame-author
description: Draft or review one bounded commanded-behavior problem frame from selected intent and observations, preserve uncertainty, and create or read exact versioned CBF snapshots when explicitly requested.
---

# Problem frame author

Use `draft` or `review-draft` through [authoring](references/authoring.md).
These instruction operations need only selected evidence and an instruction
reader. Start from the caller's use case and desired artifact, not a mandatory
workflow, programming language or test framework. Missing intent stays unknown.

Use `review-draft` for feedback on the selected frame's meaning, boundaries and
completeness. A complete criterion/evidence assessment or runtime compliance
conclusion is a distinct requested result for the selected compliance capability.
An ordinary requirement does not become a problem frame merely by naming a command.

For explicitly selected `problem-frame.cbf@1.0.0`, this package owns the
[format](references/format.md), [schema](schemas/cbf-record-v1.schema.json),
producer, reader, structural validator and exact version handling together.
[Operations](references/operations.md) define `explain`, `create`, `inspect`,
`validate`, `render` and the public structural result. Tool prerequisites and
[configuration](references/configuration.md) apply only when using tools.
`create` saves a caller-supplied new-identity snapshot; no overwrite, hidden
identity allocation or migration is available. An installed source entry is
not evidence that a tool has run successfully in the caller's environment.

[Example](references/example.md) illustrates provisional intent and unavailable
runtime coverage. Use the declared [view template](templates/cbf.md) only for
result-only rendering. The template is not an authoring constraint for external
formats. Preserve explicitly selected external template sections and report any
representation loss outside that format.

Structure, semantic review, intended-behavior approval and runtime compliance
are different outcomes. A structural result cannot approve its source labels.
For a criterion-based semantic/runtime assessment, select an actual reviewer and target evidence;
no other package is an implicit selectable dependency. Legacy YAML and SWF stay
machine-unsupported and unchanged; selected semantic reading remains useful.
