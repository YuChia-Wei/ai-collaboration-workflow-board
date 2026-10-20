# Behavior-driven development

Read this directory when a task needs shared understanding of behavior,
precise examples, or a traceable connection from examples to executed checks.
BDD is collaborative work across discovery, formulation and automation.
It is not a file format, runner, or mandatory sequence of skills.

Do not load the whole directory for every task.
Existing acceptance criteria may already support useful scenario design.
Complete supplied scenarios may already support implementation.

## Select the needed guidance

| Current task | Read | Usually unnecessary |
| --- | --- | --- |
| Clarify a rule, counterexample or unknown outcome | [Discovery](discovery.md) | Gherkin syntax and automation details |
| Express agreed behavior precisely | [Formulation](formulation.md) | Repeating discovery already supported by sources |
| Connect examples to meaningful executed checks | [Automation](automation.md) | Choosing a new runner when the target has one |
| Write or review requested Gherkin | [Gherkin](gherkin.md) | Gherkin for a prose-only request |
| Follow one example across these activities | [Library renewal](examples/library-renewal.md) | Copying the example's rules into another product |

## Shared boundaries

Knowledge selection makes guidance available; it does not adopt project rules.
The target owns requirements, decisions, formats, file placement, technology,
test commands and evidence needed for acceptance.
Examples illustrate reasoning and do not approve business behavior.

Preserve source IDs, revisions and status across activities.
Distinguish agreed rules, proposals, observations and unknowns.
A work-tracker Feature need not map to one Gherkin Feature.
A rule may need several examples; one example may demonstrate related outcomes.

Do not create a document for each activity merely to follow this directory.
An existing conversation, Issue or target artifact can hold the useful result.
Discovery can finish with a question. Formulation can finish with scenario notes.
Automation requires actual execution before reporting an executed result.
None of these activities grants implementation, installation or publication authority.

## Sources

This is an original synthesis informed by
[Cucumber's BDD guidance](https://cucumber.io/docs/bdd/) and
[Example Mapping](https://cucumber.io/docs/bdd/example-mapping/).
Framework responsibility and evidence boundaries are local applications of the
method, not claims that Cucumber requires this framework's skills or records.
