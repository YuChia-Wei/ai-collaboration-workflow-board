# Prompt Portability Rules

Use these rules when creating or updating canonical shared materials and delegated guidance files so they remain reusable across repositories.

## Mandatory Rules
- Do not reference repository-specific legacy decision numbers or decision-record IDs.
- Do not reference repository-specific domain terms, route names, aggregate names, or folder names.
- Do not hardcode project names, solution names, or bounded-context names.
- Use neutral placeholders (`Entity`, `WorkItem`, `Container`, `DomainObject`) in examples.
- Keep project-specific decisions as "Project Decision Slot" notes, not fixed policy text.

## Allowed References
- Shared standards and initialization templates supplied by the selected package or adopted by the target project.
- When a target uses a repository inventory, such as `.dev/project-config.yaml`,
  reference only the target's own inventory and preserve its location and format.
  The target may create or update it when the task calls for it, using verified
  target facts and accepted decisions.
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
- Collect the actual project, solution, bounded-context, domain, route, aggregate
  and folder names and decision IDs from the repository contexts used to
  author or adapt the assets. Include relevant spelling and casing variants.
- Search the selected portable assets for those literal identifiers. For
  tracked files, an existing pattern list outside the search root can be used
  with `git grep -n -F -f <pattern-file> -- <selected-common-resource-root>`.
  Inspect each match for a dependency on the original project.
  A search with no matches covers only the literals and paths searched.
- Example code uses neutral names and can be copied without domain rewrite.
