# Artifact Design And Review Contract

This contract is shared by `ddd-ca-hex-architect` and `bdd-gwt-test-designer`.
Each skill owns its artifact criteria. This contract adds no mandatory stage,
new skill, implementation authority, or specification-compliance claim.

## Mode And Subject

- Select `design` for a request to create or revise a design; keep the existing
  authoring output and the user's write scope. Revision needs authorization,
  which may already be present in the request.
- Select `review` for a request to assess an existing architecture or scenario
  artifact. Fix its path/version and digest (or quote a bounded inline input)
  before reviewing. Record the requirements, constraints and rule authority
  separately from the artifact: an artifact's claims do not validate themselves.
- In `review`, leave the submitted artifact unchanged. Return findings and
  suggested corrections. A combined review-and-revise request permits a later
  design action; finish the review record first and bind any later assessment
  to the revised subject. Do not describe the earlier review as covering it.
- Missing artifact or decision authority blocks the affected judgment. Report
  precise missing inputs and bounded observations; do not invent requirements.

## Applicable Rules

Distinguish method criteria, target requirements/decisions, and selected
technology rules. Naming a method does not select a language, framework,
broker, ORM, DI API, or test runner. Use each skill's source selection route;
load a technology supplement only when the target explicitly selects it and
its installation and applicability are proven. A file suffix is insufficient.

Read the target's applicable requirements, decisions and adopted rules through its
selected authority. A project-required evidence or freshness contract still applies;
this optional reference creates no packet, resolver or approval prerequisite.
Missing applicable authority stops the affected judgment. Common-method observations
cannot substitute for missing specialist acceptance. When no adopted catalog rule
applies, ground observations in supplied requirements and the selected skill's method
criteria, and report unavailable specialist coverage.

## Review Output

Record:

1. Mode, fixed subject, reviewer identity and relationship to its author.
2. Source requirements/AC IDs, quality constraints, adopted methods, selected
   technology, applied rules, unavailable coverage and assumptions.
3. Each finding's location, evidence/source criterion, triggering condition,
   impact, severity rationale, uncertainty and a bounded suggested correction.
4. Valid alternatives and their tradeoffs. Different naming or implementation
   style is not a defect without an applicable requirement or demonstrated harm.
5. Coverage by criterion and unresolved inputs. Distinguish observed defects,
   open questions and optional improvements; do not inflate them into failures.
6. Handoff owner, affected artifact, source IDs, proposed correction and any
   existing revision/implementation authorization. Preserve unresolved decisions.
7. Read-only evidence (before/after digest or fixed inline subject), execution
   actually performed, and limits. Never claim test execution from scenario text.

An author's self-check is `self-check`, even in a separate pass. A reviewer who
did not author or repair the subject may use the same skill, but record identity,
fixed-subject evidence and the applicable independence contract before claiming
`independent-review`. A different prompt or model alone proves no independence.
When independence is unproven, label it `review; independence not established`.
Required independent acceptance still follows the owning workflow's evidence
contract. Findings and design completion do not establish spec compliance.

Before returning a review, select exactly one `review_classification` from this
table. Record the author relationship and evidence that supports the selection.

| Established evidence | Required review_classification |
| --- | --- |
| The reviewer authored or repaired the submitted artifact | `self-check` |
| Author relationship is unknown, or any required independence evidence is missing | `review; independence not established` |
| A different author is verified, the fixed subject and read-only reviewer are evidenced, and the applicable independence contract is satisfied | `independent-review` |

A subject hash proves identity, not authorship or independence. The label
`independent-review` with an "author unknown" caveat is invalid; select the
unproven classification instead. Review classification is distinct from whether
the artifact has defects and from whether a required acceptance gate passes.
