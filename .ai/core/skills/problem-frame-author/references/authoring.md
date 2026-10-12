# Draft and review a bounded frame

## Intake and extraction

`draft` takes one use case/family, selected source references and actual authority,
observations, requested output format, optional explicit authoring template and
an authorized destination if persistence is requested. `review-draft` takes the
selected draft and evidence and returns read-only findings. Neither operation
requires Python, configuration, an installed companion skill or a source workflow.

1. Identify the actor, command, controlled domain, desired outcome and boundary.
   Choose CBF when a machine responds to a command affecting the controlled
   domain. Explain a mismatch; workpiece transformation may require SWF or the
   caller's prose format instead. This package has no SWF machine contract.
2. Build an extraction sheet with claim ID, exact meaning, source file/URI,
   revision, locator/digest when available, basis and actual authority. Distinguish
   stakeholder intent, accepted specification, proposed decision, observed code,
   observed tests and inference. Code/test recovery never invents normative intent.
3. Split input fields, signatures, preconditions, postconditions, invariants,
   errors, event attributes and independent constraints into individually
   assessable statements. Preserve original units, types, requiredness and IDs
   through locators; do not derive technology choices from this skill.
4. Model system boundaries explicitly. An external service owns its result;
   local code cannot declare external success from dispatch alone. Identify
   idempotency keys, repeat delivery, timeout/unknown outcomes, retry ownership,
   reconciliation, concurrency and side effects where the actual scope needs
   them. Unknown behavior becomes a question, not a default retry or transaction.
5. Draft nonempty given/when context and independently identified then assertions.
   Check feasibility and observability. Link assertions to relevant statements
   and sources. Test anchors identify selected code, not a successful execution.
6. Link every unresolved statement AND assertion from an open question. Preserve
   inferred claims in the full inventory; they are not automatically requirements.
   Record missing intent/authority, counterexamples and unanswered boundary choices.
7. Return family rationale, extraction sheet, full draft or payload, sources,
   questions, omissions/representation limits and actual delivery location.
   Describe proposed payloads as drafts until a real operation result exists.

For the owned format, follow [format](format.md) and the exact public
[operations](operations.md). The caller supplies `cbf-<32 lowercase hex digits>`;
never infer a fresh ID, source revision, timestamp, approval or runtime result in
the machine writer. Semantic revision means a new ID/file and a predecessor
source plus `derived_from`, preserving prior bytes and their authority.

## Review-draft

Read the exact selected artifact and actual source bindings. Report findings
with claim/scenario/assertion IDs, locator, conflicting or missing meaning,
impact and a concrete question or revision. Review intended behavior, bounded
responsibility, completeness, source authenticity, GWT alignment and observable
outcomes. An accepted JSON shape does not authenticate a normative label.
No write, approval, implementation or target execution is implicit.

## External and historical formats

An external authoring template is inert prose. Preserve its sections and meaning;
list fields the owned snapshot cannot represent and return prose/external format
without a v1 label when necessary. A missing explicitly selected template is
unavailable, never a reason to substitute a package template silently.

For selected legacy CBF, read exactly the caller-selected `frame.yaml`,
`machine/machine.yaml`, `machine/use-case.yaml`,
`controlled-domain/aggregate.yaml`, `acceptance.yaml`. For SWF, select its frame,
machine, use case, `workpiece/aggregate.yaml` and explicit `requirements/*.yaml`
files individually; the notation is not permission to glob or discover files.
Record each supplied file and raw digest, original family/version uncertainty,
and every retained, changed, omitted or unresolved field. Preserve SWF acceptance
criteria and entity/workpiece contracts even though machine support is absent.

Map actor/command/outcome/domain to typed statements; FC concerns and world facts
to concern/fact; machine steps/errors/constraints to behavior/error/constraint;
use-case inputs/PRE/POST/output to input/precondition/postcondition/outcome;
aggregate signatures/invariants/event attributes to independently identified
claims; acceptance GWT/then/traces/anchors to scenarios and assertions. Disambiguate
repeated PRE1/POST1 through IDs such as USECASE_PRE1 and AGGREGATE_PRE1 with exact
original locators. Enumerate all remaining fields as loss/uncertainty, never
silently discard them. This is manually selected semantic re-authoring with new
intent decisions where meaning changes, not a supported conversion or round trip.
