---
name: lesson-author
description: "Capture evidence-qualified observations, record mapped owner acceptance, and preserve lifecycle history."
---

# lesson-author

Codex runtime entry for `lesson-author@0.2.0`. This generated projection does not
prove installation, operation execution, validation or runtime discovery.
Regenerate it from the selected package and verified Codex adapter.

Read [the installed skill](../../../.ai/core/skills/lesson-author/SKILL.md) for its declared operations.
Resolve [the installed metadata](../../../.ai/core/skills/lesson-author/skill-package.yaml) with the installed skill
directory as the explicit `package_root`.

Obtain the caller's explicit `project_root`, configuration selection and operation. The project-owned `.ai/custom/framework.json` is not supplied by this entry. Pass the chosen configuration path explicitly under the installed skill's contract; do not infer it from the current working directory.

Selected installed skill members:

- [references/configuration.md](../../../.ai/core/skills/lesson-author/references/configuration.md)
- [references/example.md](../../../.ai/core/skills/lesson-author/references/example.md)
- [references/operations.md](../../../.ai/core/skills/lesson-author/references/operations.md)
- [schemas/lesson-record-v2.schema.json](../../../.ai/core/skills/lesson-author/schemas/lesson-record-v2.schema.json)
- [schemas/lesson-record.schema.json](../../../.ai/core/skills/lesson-author/schemas/lesson-record.schema.json)
- [scripts/lesson.py](../../../.ai/core/skills/lesson-author/scripts/lesson.py)
- [templates/lesson.md](../../../.ai/core/skills/lesson-author/templates/lesson.md)

For metadata version 4, `knowledge_consumption` declares exact knowledge package
versions, operations and resource IDs. Follow the installed skill's selected
binding to access knowledge. An optional missing package or resource makes the
named coverage unavailable; do not assume it was installed or promise that
coverage. Required dependencies must be present before the operation is used.

For metadata versions 1–3, follow the declared operation and runtime contracts.
An instruction operation means read its declared instructions; a tool operation
uses its declared tool. This entry does not supply methods or provider calls.
