# GWT Scenario-To-Test Handoff

Use this contract when selected Given/When/Then scenarios are handed to test
implementation or executable-test review. It adds traceability to the existing
artifact; it does not require another design stage, document format, skill,
runner, or authorization checkpoint. Target-owned schemas keep their authority.

## Design Input

For each selected scenario, preserve:

- its stable scenario ID and name, source path/revision/status, and existing
  requirement or acceptance IDs; when no source ID exists, use an explicitly
  local scenario ID instead of inventing a requirement;
- the test level, real subject under test, and the dependency boundaries to
  control; a mocked dependency does not establish real integration behavior;
- concrete Given data and state, including relevant time, dependency responses,
  permissions and isolation needs;
- one primary When behavior and its inputs; identify an intentional action
  sequence when the behavior requires more than one operation;
- each Then/And outcome with an observable value, relation, state, event or
  exception contract, plus the source of the expected result;
- assumptions, contradictory sources, missing facts and deferred cases, without
  converting observed behavior into an approved requirement.

Examples tables may share one scenario and implementation when each data row
has a stable identity and remains traceable. Split rows whose preconditions,
primary behavior or assertion responsibilities differ materially. An expected
value must come from the stated contract or explicit example, not be learned
from the implementation being tested.

## Implementation Output

The implementation owner consumes the design, existing authorization and the
fresh applicable target rules. Return a compact mapping in the target's existing
test spec or implementation report; a separate artifact is not mandatory.

| Scenario / data row | Source / AC | Test file and test identifier | Given / When / Then steps and outcome assertions | Execution evidence / status |
| --- | --- | --- | --- | --- |
| Stable scenario and row IDs | Existing binding | Concrete implemented location | Every designed outcome maps to the assertion that checks it | Actual command/result reference, or explicitly not run |

One assertion may prove several equivalent Then statements if the mapping
explains that equivalence. Separate assertions are needed for distinct
observable outcomes. A helper name or an assertion count alone proves neither.
If a target schema cannot store this mapping, keep it in an adjacent permitted
report rather than extending the schema silently.

Preserve the designed behavior during implementation. Report missing or changed
cases explicitly; never silently drop a Then, narrow the data, weaken an
expected exception, or substitute a mock of the subject under test. Conflicting
requirements go back to their owner. A valid alternative implementation shape
may retain the same scenario and assertion mapping.

## Review And Execution Evidence

The reviewer follows the selected test's step calls into their implementations
and checks the mapping against the source. Verify that the primary action
actually executes, expectations inspect its observable result, and every
important Then is covered. GWT comments, step names, a generated report, code
compilation, and a green test run are separate evidence; none alone establishes
scenario fidelity or meaningful assertions.

The implementation report distinguishes implemented, reviewed, executed,
failed, blocked and deferred cases. Bind execution evidence to the actual code,
command, selected profile and test results; reject zero discovered tests or
missing scenario results as evidence of execution. Preserve earlier failures.
Actual fixture execution demonstrates that fixture only. A small model exercise
does not establish general generation reliability or downstream adoption.

The BDD designer supplies design/review output. The bounded implementation owner
supplies executable tests and their mapping; the code reviewer assesses those
tests; target-owned execution supplies results. Existing authorization travels
with the handoff and is not requested again merely because the owner changes.
