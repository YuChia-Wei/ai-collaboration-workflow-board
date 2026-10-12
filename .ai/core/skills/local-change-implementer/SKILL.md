---
name: local-change-implementer
description: Implement one authorized operation on one technical target and its direct call sites or immediate tests while preserving accepted public contracts and architecture. Use a slice when the goal requires coordinated behavior or contract changes.
---

# Local Change Implementer

Use `implement` for one class, object, method, local symbol or query and one
bounded technical operation. Follow [the local method](references/implement.md).
Supply authorization, expected behavior, target rules, allowed dependency
radius, selected technology/commands and permitted paths.

Several files can remain one local change; semantic impact determines the
boundary. A private helper can remain local only when responsibility,
dependencies, lifetime, transaction and accepted behavior remain within that
boundary. Public contract or coordinated behavior changes need a bounded slice.

A method inside an existing public class can remain local when those boundaries
stay intact. File count, a public class name or the word query alone does not choose
the route: a bounded SQL adjustment is local; a complete query behavior is a slice.

This instruction package owns no executable, configuration or managed record
store. It needs a permitted target editor for implementation and target-selected
tools only for requested checks. Source presence is not execution. Missing
selected specialist coverage and skipped/blocked checks remain explicit.

Optional selected knowledge follows the metadata-4 allowlist and each operation's
installed-resource protocol. Selection does not adopt target rules or prove
specialist coverage; common work remains available when knowledge is absent.
