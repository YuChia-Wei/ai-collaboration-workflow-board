# Express behavior with Gherkin

Read this when writing or reviewing requested Gherkin.
It is unnecessary for a prose-only example or decision table.
BDD does not require a `.feature` file.
The target owns dialect, placement, runner, step definitions and execution commands.

## Separate syntax from design advice

Gherkin uses headings such as `Feature:`, `Rule:`, `Scenario:` and
`Scenario Outline:`. `Examples:` supplies data rows for an outline.
`Given`, `When`, `Then`, `And` and `But` introduce separate step lines.
Step keywords do not take the heading's colon.

An `AND` embedded inside a sentence is ordinary step text, not another step.
A step data table is an argument to a step; it is not an outline's collection
of example executions.
Keywords can be localized; use the target's selected dialect.

One main event, concise wording and behavior-focused steps are design guidance.
Gherkin does not forbid every action sequence.
Explain a sequence when it is essential to the behavior.
Formatting alone establishes neither useful examples nor sufficient assertions.

## Write state, event and observations

Given supplies the relevant initial state.
When identifies the event.
Then describes what can be observed at the selected boundary.
Use And or But to continue a role without hiding an unrelated behavior.

```gherkin
Feature: Renew a library loan
  Rule: Another member's reservation prevents renewal
    Scenario: Refuse renewal without changing the due date
      Given Ada has borrowed loan L7 due on 20 October
      And Ben has reserved the item on loan L7
      When Ada requests renewal of loan L7
      Then renewal of loan L7 is refused
      And its due date remains 20 October
```

The rule is illustrative unless supplied and agreed by the actual target.
Both refusal and the unchanged date need supported expected outcomes.
Date-sensitive execution also needs the relevant clock and calendar context.

Prefer the actor's or external system's observable contract for business examples.
A lower-level test can inspect a domain result or exception when that is its
selected boundary; it must not be presented as end-to-end evidence.

## Keep scenarios independent

A scenario may be ordered for readability without relying on a preceding run.
Establish its own loan, reservation and date state.
`Background` expresses shared context; it does not transfer state between scenarios.
Use it for meaningful repeated context rather than hiding a long fixture script.
Isolation and cleanup follow the target's fixture mechanism.

## Use outlines for genuinely shared behavior

Use `Scenario Outline` when rows share the same setup, event and assertion roles.
Placeholders are substituted from the associated `Examples` rows.
Keep row identities and the source of expected values in the scenario mapping.
Split materially different preconditions, events or assertion responsibilities.
An unknown policy is not a reason to invent another expected-result row.

Tags and headings help organization and selection.
They are not proof that all acceptance criteria are covered or that a test ran.

## Review weak expressions

| Expression | Useful correction |
| --- | --- |
| `Then renewal works correctly` | Name the supported visible result. |
| `Then the assistant understands` | Identify an inspectable output. |
| `Then Ada can submit AND renewal succeeds` | Separate capability, later event and supported outcome. |
| `Given the previous scenario renewed the loan` | Establish independent state. |
| `Then the private table has three rows` | Justify that boundary or observe the relevant contract. |
| An invented overdue refusal | Retain the missing policy as a question. |

## Keep expression separate from execution

A feature remains a design artifact until connected to the system and executed.
Report parsing, step binding and execution only when they occurred.
Do not install a runner as a side effect of writing examples.
Use [formulation](formulation.md) for source/oracle reasoning and
[automation](automation.md) for implementation and evidence limits.

## Sources and limits

Original synthesis informed by the
[Gherkin Reference](https://cucumber.io/docs/gherkin/reference/),
[Writing better Gherkin](https://cucumber.io/docs/bdd/better-gherkin/) and
[Cucumber scenario state](https://cucumber.io/docs/cucumber/state/).
This is a focused expression guide, not a complete grammar or runner manual.
