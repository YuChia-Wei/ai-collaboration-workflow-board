# Specification presentation guide

The [authoring method](authoring.md) owns artifact selection, source binding and
uncertainty. Honor the target contract, schema and format; the three packaged
prose templates are defaults only. This guide creates no schema or required stage.
See [organization guidance](spec-organization-guide.md) for target-owned locations.

## Express accepted behavior and design

Use the business operation as the subject. Bind its requirements and accepted
design output identities. Retain ownership, invariants, dependencies and decisions
from those sources rather than redesigning them during document formatting.
A selected command/query or handler can be named when supported by the design;
do not invent aggregates, repositories, events or class names to fill the format.
Technology details need actual target decisions. Requested optional method
knowledge follows the [verified resource protocol](knowledge.md) and the declared
metadata allowlist. Missing coverage remains unavailable; do not import
source-checkout guidance or treat selected knowledge as adopted target rules.

When a design gap remains, retain its affected contract as unresolved in a
caller-requested provisional draft. Do not make it appear accepted by assigning
an implementation type. Reuse complete design outputs without repeating design.

## Select the smallest useful representation

Use prose, tables or the caller's chosen format to explain inputs, outcomes,
invariants, errors and effects. A source ID/revision/status can be attached to
its claim or retained in permitted companion notes when a closed schema cannot
contain it. Do not introduce arbitrary metadata into that schema.

For JSON without a supplied schema, propose the shape before treating it as a
contract. Include only supported fields. A label such as “target-selected ID”
marks an unresolved type; it is not a validated machine-readable specification.
Do not invent a shared record family to standardize unrelated targets.

## Preserve verifiability and ownership

System specifications retain observable acceptance and supported failure results.
For example, a caller can observe a refusal and an unchanged due date when those
outcomes are accepted requirements. State the expected behavior without choosing
a mocking library, test fixture or runner.

Reference existing test-design artifacts and scenario IDs where useful.
Formal-test specifications, test-case matrices, fixtures, oracles and assertion
design belong to `test-designer`; they are related artifacts rather than a fourth
spec-author type. Observable contract examples, including GWT, may be authored
here; notation alone does not turn them into test-design artifacts.
Do not silently route an explicitly selected skill to a different output: clarify
the bounded mismatch with the caller. No mandatory authoring pipeline is implied.
Authoring is neither test execution nor a passing acceptance result.
