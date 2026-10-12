# Diagnose an observed symptom

## Bind the investigation

State the symptom, expected behavior and its source, actual observation,
subject/revision, environment and time. Distinguish an incident report from a
new observation. Preserve the exact command and relevant inputs when known;
mark unknowns rather than reconstructing execution that did not occur.

Use the caller's permitted read/write scope, target rules, tools, experiment
cost and stopping conditions. Name selected evidence destinations and retention
limits. Use only authorized disposable fixtures or outputs. Do not alter
production data, deploy a patch, weaken a guard or expand credential access just
to reproduce a symptom. Existing authorization remains usable within its scope.

Common reasoning needs no technology profile. Apply specialist guidance only
when the target selects and supplies it. Missing instruments, environment,
permission or required specialist coverage block the affected experiment or
judgment; report precisely what is missing and continue only supported analysis.
No experiment is required merely to format an unconfirmed or blocked report.

## Falsifiers before experiments

List competing explanations, including a plausible alternative to the leading
one. Before each experiment, record the observation that would disprove its
hypothesis, predicted outcomes under alternatives, observation scope and what
the instrument can miss.

| Strength | Observation needed | Permitted inference |
| --- | --- | --- |
| deterministic-complete | Every relevant opportunity in the declared finite scope is instrumented; expected and observed counts agree. | Support or falsify within that scope. |
| deterministic-bounded | Every opportunity in a declared reproduction is intercepted or enumerated. | Support or falsify for that reproduction only. |
| sampling-limited | A subset of opportunities or times is observed. | Discovery or provisional support; absence remains inconclusive. |
| not-executed | No execution evidence exists. | Untested hypothesis only. |

Count observation opportunities, not just matching events. Zero matches can be
meaningful only when the instrument demonstrably covered all relevant
opportunities. Unknown coverage, dropped observations, missing instrumentation
or an interrupted run is inconclusive. Never rename sampling as complete.

Prefer deterministic interception, counting or finite enumeration to occasional
snapshots. An exact invocation counter can distinguish whether a short-lived
call occurred in a reproduction; a process snapshot may miss it. Static
inspection can guide an experiment and support a code observation, but cannot
stand in for a reproduced runtime symptom.

## Reproduce and isolate

1. Choose the smallest permitted reproduction preserving the symptom and
   relevant conditions. Record actual command, subject, environment, expected
   and observed outcomes, and evidence location or bounded excerpt.
2. Record reproduction as reproduced, not-reproduced, not-run or blocked.
   Preserve failures and interruptions beside later results.
3. Change one causal condition, or justify a controlled set. Keep relevant
   other conditions fixed; record baseline, intervention, prediction and actual
   outcome. Explain how plausible alternatives were distinguished.
4. For performance comparisons use matched workloads and environments. Record
   samples, variability, warm/cold conditions and unavailable metrics. Elapsed
   time alone or an unmatched before/after run does not establish causation.
5. Mark each hypothesis supported, falsified, inconclusive or not-tested, with
   evidence and scope. Limit extrapolation beyond the reproduction.

A confirmed cause requires the same symptom reproduced, deterministic bounded
or complete supporting evidence, and a controlled intervention changing the
predicted outcome while distinguishing alternatives. Correlation, static
inspection, a passing test or a declared receipt alone is insufficient.
Unresolved competing explanations keep the conclusion unconfirmed. Missing
necessary authority or environment makes the affected work blocked. A fixture
can isolate a cause within its scope without proving the historical incident
had identical conditions.

## Return evidence and a bounded handoff

Return ordinary prose or a compact table, with no required machine record:

1. Symptom, expected/actual behavior, subject, environment and investigation
   authority/limits.
2. Hypotheses with falsifier, method, strength, scope, expected/observed
   opportunities (or unknown), result and evidence.
3. Reproduction and intervention, actual outcomes and failed/blocked attempts.
4. Root cause status: confirmed, unconfirmed or blocked; explanation,
   alternatives, uncertainty and limits.
5. Repair proposal: technical unit/radius, recommended receiving responsibility
   if known, existing permission reference or absent authority, and behavior to
   preserve. Do not preselect a local or slice owner before the radius is known.
6. Regression scenario or exact target command, marked proposed or verified.
   Verified requires actual recorded execution against the repaired subject;
   specify what the observation demonstrates.

Exclude secrets and unnecessary personal data from retained evidence. Hashes
bind bytes, not execution truth. Historical examples and synthetic records are
not fresh incident evidence. This package neither requires diagnostic JSON nor
supplies a record validator.

Optional collaboration can send the scoped proposal to an implementer or
decision owner; their installation is not a diagnosis prerequisite. Return the
proposal when they are absent. Repair and review remain separately authorized
work. If an authorized repair fails to change the predicted symptom, reopen
the causal hypothesis rather than claiming verification.
