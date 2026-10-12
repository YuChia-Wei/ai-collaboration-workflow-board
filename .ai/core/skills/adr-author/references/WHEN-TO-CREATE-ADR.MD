# When To Create ADR

Use an ADR when the caller requests a decision record or the target's adopted
process requires one. Otherwise the following considerations help identify a
useful structural decision; file count alone creates no record mandate.

## Create An ADR When

- You are defining a new architecture boundary.
- You are changing dependency direction or layer responsibility.
- You are introducing a new cross-cutting pattern.
  - Examples include outbox, event sourcing, profile isolation, and multi-agent governance.
- You are deciding repo-wide canonical source ownership.
  - For example, the division of responsibilities among `.ai/`, `.dev/standards/`, and `.dev/guides/`.
- You need to preserve an explicit tradeoff record.
  - Someone may later ask why a different approach was not chosen.

## Do Not Create An ADR When

- You are only expanding a usage guide.
- You are only adding a checklist, template, or example.
- You are only moving an existing rule to a better canonical document.
- You are only making a local implementation adjustment.
- You are only changing code style, naming, or one small file.

## Decision Test

A decision usually merits an ADR when both of the following are true:

1. It affects multiple files, modules, or future workflow runs.
2. Without a recorded tradeoff, the team is likely to revisit the same discussion.

## Default Preference

When only adding or correcting a rule, use the target's actual canonical rule
owner and authorized process. Do not assume `.dev/standards`, `.dev/guides` or
`.ai` is writable or authoritative merely because a directory exists. An ADR
records a decision; it does not itself update a rule or prove implementation.
