# Exact CBF snapshot format

`problem-frame-author@0.1.0` owns `problem-frame.cbf@1.0.0` only. Package version,
metadata integer 3, config integer 2 and record version string `1.0.0` are distinct.
The [JSON Schema](../schemas/cbf-record-v1.schema.json) uses Draft 2020-12 and only
contained `#/$defs` references. The sole [script](../scripts/problem_frame.py)
provides `read_record` / `validate_structure`, shared by create/read/render.
Consumers use its actual [public structural result](operations.md), not a copied
parser. Unknown family/version is refused before interpreting record contents.
No legacy or nearest-version reader, update or migration is included.

All object shapes are closed and every schema-listed field is required. Each
string is nonblank where the schema selects text. IDs are case-sensitive ASCII
letters followed by letters/digits/underscore/hyphen, at most 96 characters.
Snapshot identity is exactly `cbf-` and 32 lowercase hex digits. Input caps are
4 MiB raw record/request/config/resource bytes, 32 JSON nesting levels, 1024
entries per array and 16384 Unicode code points per text. Duplicate keys, BOM,
invalid UTF-8/surrogates, nonfinite values, wrong types and unknown members fail;
nothing is truncated or coerced. Limit changes need a format/tool version decision.

| Root field | Meaning |
| --- | --- |
| family, schema_version | Exact strings `problem-frame.cbf`, `1.0.0` |
| id, frame_key, title | Caller snapshot identity, logical use-case label, display title |
| derived_from | Null or an exact source ID identifying a predecessor; not global supersession |
| sources | Nonempty source bindings |
| statements | Nonempty individually identified claims; includes actor, command, controlled-domain |
| scenarios | Nonempty GWT scenarios with separately identified then assertions |
| open_questions | Zero or more questions retaining uncertainty |

Source: `{id,kind,reference,revision,locator,sha256,authority,authority_reference}`.
Kinds: requirement, specification, decision, code, test, legacy-frame, other.
Reference and locator are supplied inert text; no fetch/execute follows them.
Revision, SHA-256 and authority_reference may be null when unknown. SHA-256,
when supplied, is 64 lowercase hex characters. Authority is normative, proposed,
observation or unknown; normative requires nonnull authority_reference but remains
a caller claim requiring semantic provenance checks. Never store URI credentials,
tokens or secrets. Observation alone does not establish desired behavior.

Statement: `{id,category,text,basis,source_ids}`. Categories: actor, command,
controlled-domain, input, behavior, precondition, postcondition, invariant,
outcome, error, event, constraint, concern, external-boundary, fact.
Basis: stated, observed, inferred, unresolved. The first three require a source;
unresolved may have none and MUST have an open question link. Prose is not parsed
as executable expressions, type checking or approved architecture.

Scenario: `{id,title,source_ids,given,when,then,tests_anchor}`. Sources, given,
when and then are nonempty. Given/when are provisional context traced by scenario
sources; semantic review checks authority and feasibility. Each then is
`{id,text,basis,source_ids,statement_ids}` and links at least one statement.
The same basis/source/question requirements apply to assertions. Test anchors
are zero or more `{reference,locator}` discovery hints, never run evidence.

Question: `{id,text,related_ids}`. Empty related_ids permits a missing requirement
not yet expressed as a claim. Statement/scenario/assertion/question IDs share one
unique namespace; sources have a separate unique namespace. source_ids resolve
only sources, statement_ids only statements, related_ids only statements,
scenarios or assertions; derived_from resolves only a source. Duplicate links are
rejected. The owning structural validator checks these relations and required
categories in addition to schema shape.

The raw persisted-byte SHA-256 binds the snapshot. The public inventory includes
EVERY statement, scenario and then assertion, including inferred/unresolved rows.
Semantic review expands independent conjuncts, fields and event attributes with
stable `ID/component-label` references; it cannot select a favorable denominator.
An altered byte subject invalidates earlier results even if someone reuses an ID.
There is no persisted approved/compliant state machine.

Creation is absent -> one complete new snapshot. Arrays retain order; object
keys sort, indentation is two spaces, encoding UTF-8 without BOM, LF plus one
trailing newline. A matching existing file is still conflict. A new semantic
snapshot does not retire its predecessor. Templates yield result-only Markdown;
export is a separate authorized caller write, not a second transactional file.
