# Connect examples to meaningful executed checks

Read this when supported examples are being implemented, executed or reviewed
against real test evidence. It is unnecessary for discovery-only work or a request
that ends with scenario text.
This guidance is not a runner and supplies no test command or execution result.

Automation connects agreed examples to the system and provides feedback.
The target owns implementation authority, tools, commands, environment and
the evidence required for acceptance.
Selecting knowledge does not authorize package installation or execution.

## Preserve the example during implementation

Carry scenario and data-row IDs, source revisions and status, requirement or AC
bindings, concrete setup, primary action and every important expected outcome.
Use complete supplied examples directly; another design ceremony is unnecessary.
Return unresolved business behavior to its decision owner.

Implement the real primary action and assertions against its observable result.
Follow step and helper calls to establish that the action actually executes.
A helper named “Then” is not evidence that it contains a meaningful assertion.
Do not replace the subject under test with a mock, drop an outcome, weaken an
exception contract or narrow the data silently.

## Choose a boundary that can prove the claim

| Boundary | What it can address | Limit to disclose |
| --- | --- | --- |
| Domain object or aggregate | Invariants and state transitions | Does not establish application wiring |
| Application operation | Input, result and orchestration | Controlled dependencies do not prove their real behavior |
| API or adapter | Mapping and public request/response contract | Does not automatically establish a whole user journey |
| Integration | Real database, message or external adapter interaction | Proves the selected environment and configuration |
| Journey across boundaries | Coupled behavior through necessary real components | Still limited to the executed paths and observations |

Select the smallest credible boundary for the intended claim.
These are reasoning choices, not required folders, frameworks or test classes.
A mock can isolate orchestration but cannot prove a real dependency's semantics.
Do not label unit or fixture evidence as integration or end-to-end acceptance.

## Make the fixture support the behavior

Control relevant data, identity, permissions, time and dependency responses.
Use a fixed clock and explicit calendar context when date rules depend on them.
Make each scenario independently executable with appropriate isolation.
Shared setup can reduce repetition without passing mutable state between scenarios.

Plan cleanup and recovery through the target's fixture mechanism.
Identify concurrency, nondeterminism and unavailable dependencies explicitly.
Do not prescribe a database, browser or message broker from a method example.
A fixture must not simulate away the very boundary the acceptance requires.

## Record what actually happened

Keep design, implementation, parsing, step binding, discovery and execution separate.
A rendered feature is a design artifact.
Successful parsing does not prove step binding.
Compilation does not prove a test ran.
A green run alone does not establish scenario fidelity or sufficient assertions.

Record the selected command, immutable subject or revision, environment,
discovered and executed tests, outcomes and evidence location.
Zero discovered tests does not demonstrate that selected scenarios ran.
Preserve failed, skipped, blocked, interrupted and not-run states.
A later success does not erase an earlier failure or its circumstances.

## Keep traceability compact

Use the target's existing artifact or implementation report to connect:
scenario/data row → source/AC → actual test identifier →
action and outcome assertions → execution evidence/status.
This is useful information, not a mandatory new store or machine schema.

Explain whether one assertion proves several equivalent outcomes.
Use appropriate observations for distinct outcomes.
For library renewal, retain both refusal and the unchanged due date.
Do not infer that every designed case ran from the presence of one test file.

## Use feedback to improve understanding

When execution contradicts an agreed example, separate a test defect,
environment problem, implementation defect and unresolved behavior.
Correct a test only with a supported oracle.
Reopen discovery when the example exposes a genuine requirement question.
A synthetic fixture demonstrates that fixture, not general generation reliability
or downstream acceptance.

## Sources and limits

Original synthesis informed by
[Cucumber BDD](https://cucumber.io/docs/bdd/) and
[Cucumber scenario state](https://cucumber.io/docs/cucumber/state/).
Evidence and authority distinctions are framework applications of the method.
