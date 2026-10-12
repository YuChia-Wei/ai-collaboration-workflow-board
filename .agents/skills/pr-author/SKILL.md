---
name: pr-author
description: "Prepare pull request content and records bound to an actual Git comparison, or perform explicitly authorized GitHub PR read/create/update operations. Defect review and merge administration retain their own routes."
---

# pr-author

Codex runtime entry for `pr-author@0.1.0`. This generated projection does not
prove installation, operation execution, validation or runtime discovery.
Regenerate it from the selected package and verified Codex adapter.

Read [the installed skill](../../../.ai/core/skills/pr-author/SKILL.md) for its declared operations.
Resolve [the installed metadata](../../../.ai/core/skills/pr-author/skill-package.yaml) with the installed skill
directory as the explicit `package_root`.

Obtain the caller's explicit `project_root`, configuration selection and operation. The project-owned `.ai/custom/framework.json` is not supplied by this entry. Pass the chosen configuration path explicitly under the installed skill's contract; do not infer it from the current working directory.

Selected installed skill members:

- [references/configuration.md](../../../.ai/core/skills/pr-author/references/configuration.md)
- [references/example.md](../../../.ai/core/skills/pr-author/references/example.md)
- [references/github.md](../../../.ai/core/skills/pr-author/references/github.md)
- [references/operations.md](../../../.ai/core/skills/pr-author/references/operations.md)
- [schemas/pr-record.schema.json](../../../.ai/core/skills/pr-author/schemas/pr-record.schema.json)
- [scripts/github.py](../../../.ai/core/skills/pr-author/scripts/github.py)
- [scripts/pr.py](../../../.ai/core/skills/pr-author/scripts/pr.py)
- [templates/pr.md](../../../.ai/core/skills/pr-author/templates/pr.md)

For metadata version 4, `knowledge_consumption` declares exact knowledge package
versions, operations and resource IDs. Follow the installed skill's selected
binding to access knowledge. An optional missing package or resource makes the
named coverage unavailable; do not assume it was installed or promise that
coverage. Required dependencies must be present before the operation is used.

For metadata versions 1–3, follow the declared operation and runtime contracts.
An instruction operation means read its declared instructions; a tool operation
uses its declared tool. This entry does not supply methods or provider calls.
