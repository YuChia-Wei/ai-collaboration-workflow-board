# Select project structure from its purpose

Preserve an established repository layout, naming and document authority. The map
below is a starting point for a new project, not a migration mandate. Select only
the destinations needed now; an existing `docs/`, plural `requirements/` or another
source root does not need renaming to match these examples.

| Responsibility | Suggested destination when no convention exists | Content boundary |
| --- | --- | --- |
| Agent collaboration entry | `AGENTS.md` | Concise execution rules, actual commands and navigation |
| Human onboarding | `README.md` | Purpose, verified prerequisites and smallest supported start |
| Project knowledge navigation | `.dev/README.MD`, `.dev/INDEX.md` | Scope and links to existing project truth |
| Product background | `.dev/project-context.md` | Accepted purpose, users, scope and constraints, or a link to equivalent existing content |
| Repository inventory | `.dev/project-config.yaml` | Evidence-backed facts and unresolved observations; optional |
| Product intent | `.dev/requirement/` | Owner requirements and acceptance criteria |
| Architecture | `.dev/ARCHITECTURE.md` | Current boundaries, dependency direction and decisions |
| Production and test specifications | `.dev/specs/` | Selected domain/use-case/test contracts, separated when needed |
| Architectural decisions | `.dev/adr/` | Alternatives and actual owner decisions |
| Problem frames | `.dev/problem-frames/` | Only when this artifact is selected |
| Operations | `.dev/operations/` | Actual runbooks, topology and event contracts |
| Workflow records | `.dev/workflows/` | Target-selected format and lifecycle, not this source's records |
| Collaboration baseline | `.dev/standards/ai-collaboration.md` | Target-owned minimum working rules; reuse an existing CONTRIBUTING, AGENTS or policy location |
| First bounded task | `.dev/guides/first-task.md` | Adapted read-only and small-change examples, not automatic task execution |
| Human guides | `.dev/guides/` | Explanations and use examples |
| Product code and tests | `src/`, `tests/` | Existing or owner-selected module/test boundaries |
| Samples | `samples/` | Real examples explicitly distinguished from production |

Keep product facts and decisions separate from collaboration rules and package
mechanics. Managed `.ai/core/`, `.agents/skills/` and `.claude/skills/` are installer
outputs when this framework is present. The installer owns their bytes and lock;
the project owns its root entries and selected `.dev/` documents. An `.ai/INDEX.MD`
may be linked only if it exists and its ownership is known. No framework directory
is required for a standalone project using this authoring method.

For a new target, a root entry plus selected background, collaboration and
first-task documents may be enough. Add a navigation file only when it helps.
Create requirements, specifications, decisions, lessons or workflow directories
when actual content needs them, not as empty scaffolding. Existing `docs/`,
`CONTRIBUTING.md` or `.dev/ai-context/` layouts take precedence over these example
destinations. The background, baseline and first-task seeds are declared resources
of this skill; no engineering knowledge package is required for this minimum.

For an existing codebase, reflect actual modules, executable hosts, adapters,
frontends, migrations and tests. Separate facts from a proposed reorganization.
For a new codebase, a chosen architecture may justify a module layout, but this
skill does not implement services or force .NET, DDD, Clean Architecture, bounded
contexts, message brokers, frontend frameworks or container topology. Ask for
unresolved consequential choices and keep the independent documentation work moving.

The motivating MQ lab layout illustrates useful separation of requirements,
domain/test specifications, architecture, operations, workflows and target rules.
Its business contexts, libraries, ports, hosts, historical approvals, commands and
CI state are not portable defaults. Likewise, the framework source's own policy
and release gates must not be copied into a consuming product.
