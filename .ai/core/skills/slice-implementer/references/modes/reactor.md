# Reactor mode

Implement one accepted reaction to event data: consistency coordination,
projection update or integration effect. Use the target's selected delivery and
handler conventions. No broker or message framework is bundled or assumed.

1. Bind event source/schema/version, receiving owner, required reaction and
   observable acceptance. Handle event data rather than sharing a live domain
   entity across ownership boundaries.
2. Identify permitted reads and writes. Preserve data ownership; obtain another
   owner's information through the accepted read/application contract rather
   than reaching into its write storage by convenience.
3. Record actual delivery guarantees and the relevant duplicate, ordering,
   retry, poison-message and cancellation semantics. Distinguish transport
   deduplication from business idempotency and output/event replay policy.
4. Make transaction, checkpoint/acknowledgment and external-effect order
   explicit. Inspect crash windows between them; implement the accepted
   outbox/recovery strategy only when selected. Do not promise exactly-once
   processing without supporting semantics.
5. Preserve projection freshness and event compatibility decisions. Missing
   ordering, retry or recovery policy that affects correctness needs its owner;
   do not silently drop or replay effects to make a test pass.
6. Cover specified successful, repeated and failing reactions with observable
   state/effect assertions. Use real integration evidence where the delivery or
   persistence contract requires it; a fabricated message receipt is no proof.

Return event-to-effect flow, ownership, consistency/failure windows, changed
files, actual checks and explicit remaining gaps. Do not enlarge one reaction
into unrelated producer/consumer flows unless the authorized slice couples them.
