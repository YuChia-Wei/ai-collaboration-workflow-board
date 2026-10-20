---
name: test-designer
description: Design or review tests and formal test specifications from source behavior, target constraints and independent expected-value sources. Select proportionate test levels and expressions without implementing or executing tests.
---

# Test Designer

Use `design` to produce or explicitly revise a bounded test design through
[the design method](references/design.md). Use `review` to assess a fixed test
design through [the review method](references/review.md).

`test-designer@0.4.0` is the selected canonical capability; it supplies no alias
or implicit fallback for the retired ID.

The requested result may be test notes, examples, a decision table, a state or
property-based design, GWT scenarios, requested Gherkin, or a formal test
specification. These are expressions of test-design responsibility, not separate
owners chosen by a filename. Use [the formal-test outline](references/formal-test-template.md)
only when a formal test specification is requested and no target template is supplied.
Production, entity and adapter specifications retain their selected authoring owner.

Use design also to normalize an existing test design or formal test specification
within the requested scope. Preserve accepted meaning, source/design IDs and
explicit Given/When/Then structure; normalization is not a new public operation.

Supply the behavior sources and their status, bounded test target, acceptance or
verification goal, actual target infrastructure constraints, testing conventions,
and any requested format or destination. Default to concise test-design notes
in the conversation. Preserve complete supplied designs rather than rewriting
accepted intent merely to change its format.

This package does not require BDD, GWT, Gherkin, a runner, mocking library, language,
DI framework, managed record store or mandatory skill sequence. Follow adopted
target conventions when they apply. A requested `.feature` or property design
does not select or install an execution tool.

For optional knowledge, follow the metadata allowlist and the selected operation's
installed-resource protocol. Select only needed BDD topics or handoff guidance.
Missing optional knowledge leaves named specialist coverage unavailable; common
work grounded in caller sources can continue with that limitation disclosed.
Knowledge selection does not adopt project rules or approve expected behavior.

Design and review produce no implementation, parsing or executed-test evidence.
Do not change production code, implement tests, install packages or run tests here.
Existing authority for a later implementation can travel with a complete design;
this package creates neither new authority nor a duplicate approval checkpoint.
A discovery-only request can end with bounded questions and provisional examples.
Do not force a test set or resolve business policy on its owner's behalf.
