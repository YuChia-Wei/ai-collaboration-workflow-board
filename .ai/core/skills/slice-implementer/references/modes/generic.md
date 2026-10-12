# Generic mode

Use for one bounded feature/fix, coordinated behavior-preserving refactor,
adapter/port extraction under an accepted design, or concrete test-only slice
that is not primarily command, query or reactor behavior.

No technology role, role registry or command/query/reactor method is required.
Load only the target rules and references needed for the actual scope. Accepted
architecture, explicit authorization and observable acceptance remain required
inputs, without imposing a particular document format.

1. State the technical/behavioral goal, affected contracts and stable behavior.
2. Follow existing accepted patterns for the smallest coherent change. A public
   interface/type extraction can be implemented directly when its architecture
   and compatibility decisions are settled.
3. Keep adjacent cleanup and discovered unrelated defects out of the slice.
   Record them with evidence instead of expanding silently.
4. For test-only work, consume complete supplied scenarios directly and use
   [test handoff](../test-handoff.md); no new BDD stage or mandatory test role is
   needed. Preserve the real subject, expected outcomes and test level.
5. Run authorized target checks and inspect the actual diff. Distinguish code
   written, tests implemented, tests executed and remaining acceptance.

Stop dependent edits for a new domain, responsibility, dependency, compatibility,
lifetime or transaction decision. Return the exact question and current evidence.
A file count or the mere introduction of a type is not that decision.

Return bounded outcome, touched files, compatibility, actual checks and deferred
items. Generic is not permission to combine unrelated goals or skip selected
target constraints.
