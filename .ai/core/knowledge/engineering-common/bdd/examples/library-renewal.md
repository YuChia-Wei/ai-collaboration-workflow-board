# One example across discovery, formulation and automation

Read this to follow one bounded example through the BDD activities.
It is unnecessary when the target already supplies complete examples.
This fictional case illustrates the method and approves no actual library policy.

## Source and status

Assume that the people responsible for this fictional product have agreed:
R1/AC1 — another member's reservation prevents renewal, and refusal preserves
the loan's due date.
These are local illustrative IDs, not externally verified requirements.

The overdue policy has not been supplied.
Absence of another member's reservation does not establish permission to renew.
Other applicable rules may still prevent renewal.

## Discovery

| Item | Content | Status |
| --- | --- | --- |
| Small outcome | A borrower requests renewal of a loan | Selected discussion scope |
| R1/AC1 | Another member's reservation prevents renewal; due date remains unchanged | Assumed agreed for this illustration |
| E1 | Ada requests renewal of L7, due 20 October, whose item Ben has reserved | Supported example circumstances |
| E2 | A loan has no reservation | Outcome not established by R1 alone |
| Q-overdue | Can an overdue loan be renewed? | Open policy question |
| Possible later story | Inform a waiting member when an item is returned | Separate candidate outcome |

For Q-overdue, ask the policy owner what rule applies and to which dates or members.
Do not answer the question by copying a plausible current implementation.
An overdue loan without a reservation is a useful provisional example;
its expected result remains unknown.

A reservation belonging to the borrower is a useful counterexample question.
R1 says “another member”; the policy owner must confirm behavior outside that case.
Do not silently broaden the agreed rule to every reservation.

## Formulation

S-R1-01 is a local scenario ID bound to R1/AC1.

- Given Ada borrowed L7 with a due date of 20 October.
- And Ben has reserved the item on L7.
- When Ada requests renewal of L7.
- Then renewal is refused.
- And L7's due date remains 20 October.

The two outcomes come from R1/AC1.
Neither comes from observing the algorithm under test.
The scenario does not claim that L7 is overdue or define overdue behavior.

A decision table can express the same limits:

| Another member has a reservation | Other renewal rules known? | Supported conclusion |
| --- | --- | --- |
| Yes | Not needed to establish this refusal rule | Refuse; preserve due date |
| No | No | Permission remains unresolved |

This table does not establish precedence among conflicting approved policies.
If a real target supplies such a conflict, return it to the decision owner.

## Optional Gherkin expression

```gherkin
Feature: Renew a library loan
  Rule: Another member's reservation prevents renewal
    @R1 @AC1
    Scenario: Refuse renewal and preserve the due date
      Given Ada has borrowed loan L7 due on 20 October
      And Ben has reserved the item on loan L7
      When Ada requests renewal of loan L7
      Then renewal of loan L7 is refused
      And the due date of loan L7 remains 20 October
```

Use this expression when requested; scenario notes are sufficient otherwise.
Tags retain useful identifiers but do not prove traceability by themselves.
No runner, file path or step-definition framework is selected.

## Automation planning

Choose a real renewal application operation as a possible initial test boundary.
Create Ada, Ben, L7 and the reservation independently for the test.
Set a clock, year and calendar context if the selected behavior depends on them.
Control only dependencies whose real behavior is outside the claim.

Execute the real renewal request.
Observe its public refusal result and the due date through the selected contract.
Keep both observations in the scenario-to-assertion mapping.
A refusal assertion alone would leave preservation of the due date unchecked.

An application test with controlled persistence can establish the selected
operation's behavior; it does not prove real database persistence or a UI journey.
Select additional real boundaries only when the target's acceptance requires them.

## Evidence status

This document contains discovery notes, a formulated example and an automation plan.
No feature was parsed, steps bound, test implemented or system executed here.
There are no passing runtime results.
A later implementation report should bind actual test identifiers, commands,
environment, revision and outcomes to S-R1-01 and R1/AC1.

The overdue policy remains open after all the supported work above.
Progress on R1 does not approve an answer to Q-overdue.

## Sources and limits

Original illustrative synthesis informed by
[Cucumber BDD](https://cucumber.io/docs/bdd/),
[Example Mapping](https://cucumber.io/docs/bdd/example-mapping/) and the
[Gherkin Reference](https://cucumber.io/docs/gherkin/reference/).
The example's business rule and IDs belong solely to this fictional explanation.
