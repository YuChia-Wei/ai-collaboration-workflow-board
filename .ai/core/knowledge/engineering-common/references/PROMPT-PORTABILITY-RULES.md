# Prompt Portability Rules

Use these rules when creating or updating canonical shared materials and delegated guidance files so they remain reusable across repositories.

## Mandatory Rules
- Do not reference repository-specific legacy decision numbers or decision-record IDs.
- Do not reference repository-specific domain terms, route names, aggregate names, or folder names.
- Do not hardcode project names, solution names, or bounded-context names.
- Use neutral placeholders (`Entity`, `WorkItem`, `Container`, `DomainObject`) in examples.
- Keep project-specific decisions as "Project Decision Slot" notes, not fixed policy text.

## Allowed References
- Shared standards and repo-init templates that are intentionally copied with `.ai` and `.dev`.
- Generated target-repository truth such as `.dev/project-config.yaml` must be rebuilt after copying.
- Generic architecture patterns (DDD, CQRS, Outbox, Event Sourcing).
- Technology constraints explicitly declared by the target framework profile.

## ADR Usage Rule
- If a prompt needs a decision reference, use neutral labels:
- `Project Decision Slot: Serialization baseline`
- `Project Decision Slot: Environment profile matrix`
- Never hardcode a numeric ADR id in prompt text.

## Example Conversion
- Before: `RTK Query Cache Rules (Legacy Decision XXX)`
- After: `RTK Query Cache Rules (Project Decision Slot: Cache Invalidation Policy)`

## Pre-Commit Checklist
- Searches for repository-specific decision IDs inside portable prompt assets should return no results.
- `rg -n "ProjectNameA|ProjectNameB|DomainTermA|DomainTermB" <selected-common-resource-root>` returns no results.
- Example code uses neutral names and can be copied without domain rewrite.
