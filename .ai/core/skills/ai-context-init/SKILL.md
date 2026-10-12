---
name: ai-context-init
description: Establish a usable project collaboration starting point with existing facts, a minimum collaboration baseline, entry references and first-task guidance, or refresh factual context. Preserve project ownership and custom rules. Does not design product strategy, run development tasks or install framework packages.
---

# AI context initialization

Use `initialize` to establish missing collaboration entries and the minimum
usable starting point, including in an existing codebase. Reuse equivalent
product background and team rules; add selected missing authoring resources.
Use `refresh` for a selected update to repository
facts, verified commands and navigation in that initialized context. Refresh does
not redesign existing collaboration rules, document responsibilities or precedence.

For ongoing project-owned context maintenance, default to the target's governance
route when available (`ai-context-governance` is one candidate). A read-only context
assessment or comparison belongs to an audit route (`ai-context-auditor` when
available). Honor an explicit in-scope operation selection: a factual refresh
remains usable independently, and neither candidate is a package prerequisite.

Read [the initialization method](references/initialize.md) for either operation.
Read [project structure guidance](references/project-structure.md) when selecting
document destinations or initializing an empty repository. The
[AGENTS seed](templates/public-root/AGENTS.md) evolves the former init baseline:
retain its collaboration intent, resolve navigation from the actual target and
derive repository facts from evidence. These are authoring resources, not files
to copy indiscriminately or schema-bound records.

The [product context seed](templates/project-context.md),
[collaboration baseline](templates/ai-collaboration.md) and
[first-task guide](templates/first-task.md) support this starting point without
another skill or knowledge package. Supplying these resources does not make init
the owner of product direction, full policy design or the first development task.
End when entry points, relevant facts/references, working boundaries and the next
bounded task are understandable, with unknowns and unverified commands explicit.

The caller supplies the target, intended operation and authorized write scope.
Infer established layout and facts from permitted sources; ask only for material
choices that evidence cannot resolve. Return a proposal when writes are not
requested. An initialization request authorizes ordinary project document edits
within its scope; an already authorized edit needs no second approval gate.

No mandatory runtime, configuration, record store, framework installation or
other skill is required. Ordinary file tools author target-owned documents.
`implemented` describes these instructions, not observed agent behavior, client
discovery, target readiness, installation or release acceptance.
