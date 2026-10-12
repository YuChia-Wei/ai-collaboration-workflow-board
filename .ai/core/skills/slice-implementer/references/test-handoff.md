# Preserve scenario meaning during implementation

Use when a selected slice implements Given-When-Then scenarios. This reference
is contained in the package so a complete caller-supplied design works without
installing a scenario designer or requiring another document.

Preserve scenario/data-row IDs and names, source path or inline reference,
revision/status, existing requirement/AC IDs, test level, real subject and
controlled dependency boundaries. Keep concrete Given data/state/time/
permissions/responses, primary When inputs and every observable Then/And with
its expected-value source. Unknowns and conflicting sources stay explicit.
A local scenario ID may be created when no source ID exists; do not invent an AC.

Use a shared implementation for equivalent example rows only when stable row
identities and assertion responsibilities remain traceable. Split materially
different setup/actions/outcomes. An expectation comes from the source contract
or explicit example, not the production algorithm being tested.

Implement the real primary action and assertions against its observable result.
Follow step/helper calls to confirm they execute it. Do not substitute a mock
for the subject, silently drop outcomes, weaken exceptions, narrow data or
change the selected evidence level. A mock of a dependency does not establish
its real integration semantics.

Return a compact mapping in the normal implementation result or authorized
target artifact; no separate record/store is mandatory:

| Scenario / data row | Source / AC | Test file and identifier | Given / When / Then and outcome assertions | Execution evidence / status |
| --- | --- | --- | --- | --- |
| Actual stable identities | Actual source binding | Actual implemented location | Steps and assertions covering each outcome | Actual command/result or explicitly not run |

One assertion may prove equivalent Then statements with an explanation;
distinct outcomes require appropriate assertions. Helper names, assertion
counts, GWT comments, compilation and a green run are individually insufficient
to establish fidelity.

Keep implementation, review and execution separate. Record exact selected
command, subject and environment, discovered/executed tests and scenario
results where available. Zero discovered tests or missing selected scenario
results is not evidence those scenarios ran. Preserve failed, blocked and
deferred cases. Fixture execution demonstrates that fixture, not general
generation reliability or downstream acceptance.

Design does not authorize code or execution. Reuse existing authority when it
already covers both; do not demand duplicate approval or a new design stage.
Unresolved behavior returns to its owner. If independent review is required,
the implementation owner supplies evidence and cannot label its self-check as
that review.
