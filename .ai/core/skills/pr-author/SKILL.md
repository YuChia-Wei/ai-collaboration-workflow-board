---
name: pr-author
description: Prepare pull request content and records bound to an actual Git comparison, or perform explicitly authorized GitHub PR read/create/update operations. Defect review and merge administration retain their own routes.
---

# Pull Request

Use this independent skill for a selected real Git comparison, reviewable PR content, or read/create/update of one GitHub PR.
Defect review belongs to the selected review capability. Merge, closure, branch
push and Issue/Project mutations are outside this package's operations and retain
their actual provider/project owners and existing authorization.
No workflow, ADR, Lesson, source-repository policy or other skill installation is required. Project records/settings/templates remain project-owned. Metadata says implemented because source exists; it is not runtime acceptance, availability or authorization evidence.

1. Read [configuration](references/configuration.md); select explicit project/package roots and optional config files. Explain is read-only and never discovers a fallback store.
2. Read [operations](references/operations.md); choose the smallest authorized operation. Inspect before updating; use actual returned raw-byte digests.
3. Review the selected record/content and actual result. A failed or uncertain write does not prove rollback; never blindly retry.
4. Preserve unsupported versions, extensions and unrelated files. Installation, record migration, external authority, completion and publication are separate decisions.

Entry: `python <absolute-package>/scripts/pr.py --request <absolute-request.json|->`. [Schema](schemas/pr-record.schema.json), [default template](templates/pr.md), [synthetic example](references/example.md).

GitHub operations use the separately declared package-owned [adapter contract](references/github.md) and [entrypoint](scripts/github.py). Local preparation is not permission to publish; mode/grant fields do not prove permission or exclusive access.
