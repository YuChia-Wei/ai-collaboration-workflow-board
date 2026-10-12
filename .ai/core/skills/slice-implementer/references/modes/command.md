# Command mode

Implement one accepted state-changing application behavior. Use the target's
selected interface, dispatch and persistence conventions; do not impose a
particular method name, handler framework, ORM or DI API.

1. Bind trigger, actor/input, permissions, expected result/errors and acceptance
   to the authoritative requirement. Locate the application entry and domain
   responsibility. Keep transport/vendor mapping outside business decisions.
2. Preserve the aggregate or other consistency boundary and invariant owner.
   Let the accepted domain model enforce its rules; application orchestration
   coordinates dependencies without moving business policy arbitrarily.
3. Follow the accepted repository/storage and dependency lifetime model. Identify
   the transaction-completion owner and the failure window around persistence
   and external effects. Do not add a second commit owner or widen atomicity
   implicitly.
4. Add a dispatch/message handler only when an actual selected entry needs one.
   Follow target-owned outbound contracts; a convenience library does not decide
   architecture or justify a new dependency boundary.
5. Implement specified validation, concurrency, duplicate/idempotency,
   cancellation and error semantics when applicable. Do not invent guarantees
   from a successful return code or conflate message deduplication with business
   idempotency.
6. Map acceptance to observable result, state and relevant effect assertions.
   Use actual integration evidence where storage/transaction/delivery semantics
   require it; mocks show only their bounded orchestration behavior.

Return the command flow, domain/transaction/effect boundaries, changed files,
actual validation and unresolved risks. An unknown required consistency or
compatibility decision stops that part of implementation and returns a concrete
question; it does not authorize a new architecture.
