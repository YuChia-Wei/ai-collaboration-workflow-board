# Query mode

Implement one accepted read behavior. Queries do not modify domain state.
Use the selected read model/projection/storage conventions; no repository name,
controller pattern, archive abstraction or handler framework is imposed.

1. Bind input, permissions, expected output and error/empty-result semantics.
   Keep the transport mapping separate from application/read responsibility
   according to the accepted architecture.
2. Follow the target's external result contract. Avoid exposing live mutable
   domain objects or persistence internals as a shortcut; map explicitly to the
   selected result representation.
3. Normalize filters and any target-defined sentinel values in one clear place.
   Preserve specified null, missing, ordering, pagination and canonical-state
   semantics. Do not invent sentinel values or move client navigation policy
   into the server without a decision.
4. Inspect scope isolation and authorization predicates. Bound the selected
   projection/data access to the actual caller and requested shape; retain
   accepted consistency/freshness behavior.
5. Address query cost within the authorized goal and known workload. Do not
   claim a performance improvement from changed query text alone or broaden the
   slice into an unrequested storage rewrite.
6. Test observable results and relevant boundaries using target commands.
   A mocked query interface cannot establish actual database translation,
   ordering, collation or isolation semantics.

Return input/result mapping, read-model/consistency notes, changed files and
actual checks. Missing output or compatibility semantics need an owner decision;
existing code alone does not approve a new public shape.
