# Workflow Board collaboration

This is the Workflow Board product repository. Keep product code under `src/`.
Resolve product facts from current Issues, code and project-owned contracts:
`ARCHITECTURE.md`, `PLATFORM-CONTRACT.md`, and the relevant `src/*/README.md`.
Build/test commands are in `README.md`; deployment instructions are in `DEPLOYMENT.md`.
GitHub Issues and Projects remain the work authority. Preserve unrelated changes;
installation, implementation, push, PR, merge, closure and deployment retain the
user's actual authorization.

Keep development design, specifications and accumulated development resources
under `.dev/`; use [the development index](.dev/README.md) and
[product evolution design](.dev/design/product-evolution/README.md) as navigation.
`Docs/` and `Notes/`, when used, are for formal project documentation or notes,
not the default location for development accumulation. Dated design snapshots
do not replace live Issues/Projects or authorize implementation.

## Code discovery

Prefer codebase-memory-mcp `search_graph`, `trace_path`, `get_code_snippet`, and
`query_graph`; index missing/stale projects first. Use tracked-file fallback when
the graph is insufficient, and text search for literals, configuration and prose.

## Installed skills

Framework v0.20.1 is selected in `.ai/custom/installation.json` and verified by
`.ai/framework.lock`. Codex entries are `.agents/skills/<id>/SKILL.md`; read the
selected entry and only its applicable references. Installed resources under
`.ai/core/` and runtime entries are managed; change selection and reinstall through
the pinned installer rather than editing those files.

| Need | Skill IDs |
| --- | --- |
| Establish or refresh the collaboration starting point | `ai-context-init` |
| Requirements and specifications | `requirement-author`, `spec-author`, `problem-frame-author` |
| Architecture, test design and formal test specifications | `ddd-ca-hex-architect`, `test-designer` |
| Diagnosis, implementation and review | `diagnostic-analyst`, `local-change-implementer`, `slice-implementer`, `code-reviewer` |
| Compliance and stage selection | `spec-compliance-validator`, `software-development-orchestrator` |
| Decisions, observations and PR content | `adr-author`, `lesson-author`, `pr-author` |

`engineering-common@0.3.0` is installed as optional guidance. No normative
knowledge bindings are adopted. Select relevant resources explicitly and preserve
Board's existing decisions. .NET coverage is unavailable; do not substitute a
source checkout or impose another technology stack. `ai-context-auditor`,
`ai-context-governance`, local backlog, `user-story-author`, `workflow-records`,
Claude entries and sub-agent profiles are not selected.

## Portable specifications

Use product vocabulary, observable behavior, invariants, failures and acceptance
criteria when authoring specs. Keep implementation language, persistence adapters
and test bindings explicit and separate from the behavior contract. A future
language change still requires implementing and validating those contracts.
Use `spec-author` for production, entity and adapter specifications; use
`test-designer` for formal test specifications. Installing either does not
establish complete product specifications or executed test evidence.
Choose the requested artifact and destination before writing; no spec, ADR,
Lesson, PR store or framework configuration is implicitly initialized.

See `FRAMEWORK-INSTALLATION.md` for exact selection, validation and maintenance.

## Repository-specific starting point

Initialization used `ai-context-init@0.2.0` on 2026-10-13. Existing product
background and rules are reused; initialized documents remain project-owned.

| Task | Read first |
| --- | --- |
| Product purpose and current implementations | [README](README.md), [Board](Docs/board.md), [local prototype](src/Prototypes/WorkflowRecords/README.md) |
| Domain, ports/adapters and available collaboration behavior | [Architecture](ARCHITECTURE.md), [collaboration contract](src/Contracts/CollaborationV1/README.md), the selected live GitHub Issue |
| Build and local operation | [README commands](README.md#建置與測試), [local setup](LOCAL-SETUP.md) |
| Deployment | [Deployment contract](DEPLOYMENT.md); use the user's selected authorization |
| A first bounded task | [First-task guide](.dev/guides/first-task.md) |

Choose only the context needed for the task. Distinguish accepted requirements,
observed implementation and assumptions; surface conflicts and unknowns. Use
verification proportionate to the selected change and reuse existing evidence
where valid. An installation or documentation change does not by itself justify
a new checker, test suite or workflow. Report checks as discovered, executed,
failed or blocked; local checks do not prove hosted behavior.
Keep review and work records proportionate to the task and actual project rules.
Retain the user's model, permission and execution boundaries; initialization does
not select delegation, a stronger model or an additional approval process.

Board code uses JavaScript ESM, with a TypeScript database schema; the separate
local prototype uses Python. Current sources specify Node.js >=22.13 and Python
3.13; CI uses Node.js 24. Run Board commands from the repository root with
`npm ...`, and local tests with `python -B -m src.Prototypes.WorkflowRecords.Tests...`.
The original initialization only inspected command definitions and prerequisites.
See the current task evidence for later source-layout validation; initialization
does not prove current runtime or deployment status.
For current collaboration/1 transport, persistence and client acceptance, read
`Docs/collaboration-mvp.md`, `Docs/cli.md`, `Docs/mcp.md` and the
relevant live Issues. Distinguish completed bounded client acceptance from
pending trusted human review, multi-Agent isolation and complete recovery work.

Source directories use PascalCase under `src/Core`, `src/Presentation`, and
`src/Infrastructure`; the independent prototype is `src/Prototypes/WorkflowRecords`.
Composition stays with each entry point, without a shared Hosts/CompositionRoots
project. See `.dev/guides/source-layout-migration.md` for old-path mappings and
tool-defined naming exceptions.
