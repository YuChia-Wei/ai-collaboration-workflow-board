# Illustrative R1/AC1 from library-renewal.md; no runner or step bindings supplied.
Feature: Renew a library loan
  Rule: Another member's reservation prevents renewal
    @R1 @AC1 @S-R1-01
    Scenario: Refuse renewal and preserve the due date
      Given Ada has borrowed loan L7 due on 20 October
      And Ben has reserved the item on loan L7
      When Ada requests renewal of loan L7
      Then renewal of loan L7 is refused
      And the due date of loan L7 remains 20 October
