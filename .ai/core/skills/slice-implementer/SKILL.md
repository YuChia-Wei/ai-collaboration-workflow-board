---
name: slice-implementer
description: Implement one authorized behavior, coordinated refactor or concrete test slice under accepted architecture. Select command, query, reactor or generic mode; own the slice's internal edits and validation without per-method handoffs.
---

# Slice Implementer

Use `implement` for one accepted behavior or coordinated refactoring goal.
Follow [the implementation method](references/implement.md), selecting exactly
one primary mode: command, query, reactor or generic. Test-only work uses generic.
Remediation is an optional overlay, not a fifth mode.

Choose a slice when the goal coordinates behavior, implementation responsibilities
or public contracts, or implements selected scenarios as tests. A single technical
operation that preserves those boundaries may stay local. Judge semantic scope,
not file count; do not split an active slice into per-method implementation tasks.

Supply authorization, requirements/decisions, acceptance, non-goals, allowed
paths, selected technology and target commands. Keep finding evidence separate
from permission and normative behavior. The slice retains ownership of its
internal local edits and validation; no per-method handoff is required.

This is an instruction package with no executable, configuration or managed
record store. It needs an authorized target editor; requested checks need the
selected target environment. Generic work needs no command/query/reactor role
or technology baseline. No specialist extension is bundled. Report missing
selected coverage rather than silently selecting another technology.

The source being implemented means these instructions exist. Actual target
edits, tests, review, acceptance and external delivery are separate observations.

Optional selected knowledge follows the metadata-4 allowlist and each operation's
installed-resource protocol. Selection does not adopt target rules or prove
specialist coverage; common work remains available when knowledge is absent.
