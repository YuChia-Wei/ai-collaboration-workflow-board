# Workflow Board collaboration

This is the Workflow Board product repository. Keep product code under `src/`.
Resolve product facts from current Issues, code and project-owned contracts:
`ARCHITECTURE.md`, `PLATFORM-CONTRACT.md`, and the relevant `src/*/README.md`.
Build/test commands are in `README.md`; deployment instructions are in `DEPLOYMENT.md`.
GitHub Issues and Projects remain the work authority. Preserve unrelated changes;
installation, implementation, push, PR, merge, closure and deployment retain the
user's actual authorization.

## Code discovery

Prefer codebase-memory-mcp `search_graph`, `trace_path`, `get_code_snippet`, and
`query_graph`; index missing/stale projects first. Use tracked-file fallback when
the graph is insufficient, and text search for literals, configuration and prose.

## Installed skills

Framework v0.19.1 is selected in `.ai/custom/installation.json` and verified by
`.ai/framework.lock`. Codex entries are `.agents/skills/<id>/SKILL.md`; read the
selected entry and only its applicable references. Installed resources under
`.ai/core/` and runtime entries are managed; change selection and reinstall through
the pinned installer rather than editing those files.

| Need | Skill IDs |
| --- | --- |
| Requirements and specifications | `requirement-author`, `spec-author`, `problem-frame-author` |
| Architecture and behavior scenarios | `ddd-ca-hex-architect`, `bdd-gwt-test-designer` |
| Diagnosis, implementation and review | `diagnostic-analyst`, `local-change-implementer`, `slice-implementer`, `code-reviewer` |
| Compliance and stage selection | `spec-compliance-validator`, `software-development-orchestrator` |
| Decisions, observations and PR content | `adr-author`, `lesson-author`, `pr-author` |

`engineering-common@0.1.0` is installed as optional guidance. No normative
knowledge bindings are adopted. Select relevant resources explicitly and preserve
Board's existing decisions. .NET coverage is unavailable; do not substitute a
source checkout or impose another technology stack. AI-context skills, local
backlog, Claude entries and sub-agent profiles are not selected.

## Portable specifications

Use product vocabulary, observable behavior, invariants, failures and acceptance
criteria when authoring specs. Keep implementation language, persistence adapters
and test bindings explicit and separate from the behavior contract. A future
language change still requires implementing and validating those contracts.
Installing `spec-author` does not establish complete product specifications.
Choose the requested artifact and destination before writing; no spec, ADR,
Lesson, PR store or framework configuration is implicitly initialized.

See `FRAMEWORK-INSTALLATION.md` for exact selection, validation and maintenance.
