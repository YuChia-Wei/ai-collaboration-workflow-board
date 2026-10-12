---
name: code-reviewer
description: "Review selected code, a diff or concrete implementation guidance for actionable defects against intended behavior and target-owned rules. Use for artifact-based findings; causal investigation of an observed symptom belongs to diagnosis. Keep review read-only."
---

# code-reviewer

Codex runtime entry for `code-reviewer@0.2.0`. This generated projection does not
prove installation, operation execution, validation or runtime discovery.
Regenerate it from the selected package and verified Codex adapter.

Read [the installed skill](../../../.ai/core/skills/code-reviewer/SKILL.md) for its declared operations.
Resolve [the installed metadata](../../../.ai/core/skills/code-reviewer/skill-package.yaml) with the installed skill
directory as the explicit `package_root`.

This package declares `configuration: null`. It needs no framework configuration file or managed record store. Obtain only the target inputs required by the selected operation.

Selected installed skill members:

- [references/review.md](../../../.ai/core/skills/code-reviewer/references/review.md)

For metadata version 4, `knowledge_consumption` declares exact knowledge package
versions, operations and resource IDs. Follow the installed skill's selected
binding to access knowledge. An optional missing package or resource makes the
named coverage unavailable; do not assume it was installed or promise that
coverage. Required dependencies must be present before the operation is used.

For metadata versions 1–3, follow the declared operation and runtime contracts.
An instruction operation means read its declared instructions; a tool operation
uses its declared tool. This entry does not supply methods or provider calls.
