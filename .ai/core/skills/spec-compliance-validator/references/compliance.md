# Plan, review and assess selected compliance

## Operations and authority

| Instruction operation | Inputs | Required output |
| --- | --- | --- |
| plan-validation | Explicit artifact/family/version, intent/rules, target subject/scope, required evidence levels | Complete criterion inventory, authority/uncertainty, applicability, prerequisites, proposed target-owned commands and gaps; no execution claim |
| review-semantics | Exact selected bytes and source bindings, actual owner structure result when required, bounded code/tests if supplied | Meaning/completeness/contract/GWT findings with criterion IDs and source/code/assertion locations, plus structural and runtime limits |
| assess-runtime | Fixed frame/rules/code/tests/config/dependencies, explicitly selected target profile and authentic supplied runs or authorized target execution | Every criterion mapped to real evidence, command/environment/outcomes, missing coverage, exclusions and scoped conclusion |

These may compose without a mandatory author -> implement -> validate workflow.
Select the requested deliverable and use the [report outline](report-template.md).
No automatic repair, test creation, restore/install/build, provider mutation,
release or global gate is authorized by this method. With separately authorized
execution, use the target's own tools, commands, safety and long-running rules;
otherwise evaluate supplied evidence without rerunning. Do not invent unavailable
intent, approvals, projects, SDKs, versions or execution records.

## Four independent stages

1. Authoring: supplied claims, source bindings and questions. Report proposed,
   observed, inferred and unresolved meaning without approving it.
2. Structure: actual strict format-owner result about exact bytes and version.
   This says nothing about source authenticity or implementation truth.
3. Semantics: intent authority, completeness, consistency, feasibility, boundaries,
   GWT alignment and concrete contradictions/missing rules.
4. Runtime: authentic target observations at the required evidence level for the
   selected code/tests/config/dependency/environment subject.

Keep a stage unavailable or deferred when prerequisites are missing. A success
in one never populates another. A useful report may have semantic findings and
unavailable runtime coverage together. Report all real failures/skips unchanged.

## Consume the actual CBF owner result

For `problem-frame.cbf@1.0.0`, select `problem-frame-author@0.1.0` and its public
`problem-frame-author.fs` inspect/validate result, with exact operation provenance.
Use the selected owner's `references/operations.md` as the interface authority;
never copy its parser/schema or privately broaden version support. Missing owner
reader means structural stage unavailable; ordinary text reading is not a substitute.
For another format, the caller names its actual owner/reader/version and limits.

The response must have outcome ok, mutation_state none for read operations,
changed false, and a structure whose exact contract is
`problem-frame.cbf.structural-result@1.0.0`, status valid, family
problem-frame.cbf, schema_version 1.0.0, selected id and subject_sha256 matching
both response digest and the independently identified selected raw bytes.
Do not accept a quoted hypothetical response or a digest from a failed read.
A genuine create result can supply structure, but retain its publication outcome;
never describe it as a read-only invocation. Errors after publication are not an
accepted successful structural-result envelope.

The complete owner structure fields are contract, status, family, schema_version,
id, subject_sha256, criterion_inventory, counts, unresolved_ids, source_ids,
question_ids. Each inventory row is exactly id/kind/pointer/scenario_id; kind is
statement, scenario or assertion. Statement pointers are /statements/N and have
null scenario_id; scenarios /scenarios/N and assertions /scenarios/N/then/M carry
the scenario ID. Order: all statements, then each scenario and its assertions.
Counts has statement/scenario/assertion totals. unresolved_ids includes unresolved
statements AND assertions; source_ids/question_ids preserve their respective
arrays. These are inventory counts, not evidence of satisfaction.

Obtain the record from actual inspect (or the exact identified bytes through the
owner). Resolve every supplied pointer on that same record; retain IDs and exact
texts without filtering inferred/unresolved entries. If a public result/record,
version, count or pointer binding is absent/inconsistent, mark structural evidence
unavailable and return to the actual owner operation. Do not manufacture a new
private validation result. Retain owner failure diagnostics as failure evidence.

## Complete criterion inventory

For every statement and scenario, retain origin and authority. Include every then
assertion, given/when condition, independent conjunct, input field/type/requiredness,
event attribute, pre/postcondition, invariant, outcome/error, constraint and
external-boundary obligation within the selected scope. Expand independent pieces
using stable `statement-id/component-label`, `assertion-id/component-label`, or
`scenario-id/given-N` / `scenario-id/when-N` references. State the extraction rule
and account for the owner's complete inventory so no then or unresolved row vanishes.

Explicitly selected legacy/external artifacts get an equivalent complete inventory
with file/locator/original IDs and loss notes; see [legacy intake](legacy-intake.md).
No keyword count or favorable subset can define the denominator. An exclusion
requires a real target decision, rationale and visible row. Keep unresolved scope
visible rather than treating it as exclusion or as an implicitly satisfied rule.

Review actual source authority: reference, revision, locator and digest; verify
normative approval from its named source rather than a field label. Code/tests
can document observations without proving stakeholder intent. Distinguish desired
result from current behavior. Check selected GWT assertions are observable and
feasible; signatures, invariants, events and errors match intent, not a framework
ORM, exception, architecture or testing convention. Missing intent stays unavailable.

For external systems distinguish request sent, acknowledged, confirmed and unknown
outcomes. Identify authority, idempotency, retries/timeouts, duplicate delivery,
concurrency, transaction/persistence and message side effects only when applicable.
A unit/mock observation cannot satisfy a criterion requiring real transaction,
database, broker or external-system execution. Preserve required evidence levels.

## Subject and evidence bindings

Bind artifact family/version/logical ID/raw SHA-256; each normative source's
revision/digest/authority; exact target commit or explicit file/content identities
for relevant code/tests/config/dependencies; selected profile/version; actual
environment, SDK/runtime/runner/provider; exact command and arguments, working
directory, observation time, exit/result and accessible evidence reference.
Git is optional when complete content identities exist. An unbound log, test
method name or anchor cannot prove execution on this subject. Distinguish actual,
synthetic, fixture, mock and unit evidence; none inherits a higher evidence level.

Each criterion row contains ID, exact text, origin/authority, applicable or
excluded decision/rationale, required evidence level, implementation and assertion
location, actual run/evidence reference, result and limitation. Non-runtime intent
criteria can require document/source evidence; runtime criteria need selected
actual execution. Do not infer actual runs from accessible assertions alone.

Row results: satisfied, contradicted, unavailable, deferred, excluded. A required
assertion absent from an accessible and completely inspected selected scope may
be contradicted with the inspection evidence. Inaccessible scope is unavailable.
A skipped test is not satisfied; a deferred or excluded item is never satisfied.
A failing run must be interpreted and retained, not erased by another passing row.

## Overall runtime conclusion, in this order

1. Any observed contradiction in selected required criteria -> **not-compliant**.
   Retain all unavailable/deferred rows beside the contradiction.
2. Otherwise missing authority, required profile/runtime, structural result,
   valid subject binding, evidence or unresolved required scope -> **unavailable**.
   Preserve an intentional row deferral with its owner and next action.
3. Empty applicable required scope -> **unavailable**, with an empty-scope reason.
4. Only complete satisfaction of every applicable required criterion using its
   required evidence -> **compliant-within-scope**. Name exact scope, exclusions,
   versions, subjects and observed environment. No universal 100% claim.

Changed frame, intent/rules, code/tests/config/dependencies invalidate affected
evidence. Reuse requires matching subjects, authority, command and applicable
environment demonstrated explicitly; old success is not a new invocation.
