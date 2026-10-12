# Specification presentation guide

The [authoring method](authoring.md) owns artifact selection, source binding and
uncertainty. Use the caller's target contract, schema and format when supplied;
the four packaged prose templates remain the defaults. This reference offers
optional presentation examples, not a JSON schema or an additional required stage.
See [organization guidance](spec-organization-guide.md) for configurable locations.

## Describe the behavior before implementation names

Use the business operation as the subject. A command/query is its input model;
a dispatch handler, when actually selected, maps the inbound delivery and invokes
the behavior. Do not invent an aggregate, event, repository or handler to fill a
format. Technology-specific terminology requires the target-selected supplement;
this independent skill has no dependency on a framework source checkout.

## Optional JSON examples

When a target chooses JSON without supplying a closed schema, discuss the shape
before writing it. The following illustrates a production behavior; include only
fields supported by real sources and leave unknown contracts explicit:

```json
{
  "useCase": "CreateProduct",
  "behavior": "Create a product under the accepted naming rule",
  "input": [{ "name": "name", "type": "string" }],
  "output": { "productId": "target-selected identifier" }
}
```

An adapter example may describe direction, protocol, endpoints and error mapping;
entity/value-object examples may describe identity, attributes, equality and
invariants. Their accepted owners and schema determine required fields. Examples
must not override a closed format or adopt a route, package, ORM or event model.

## Review and test-spec boundary

Check accepted behavior, inputs/outputs, invariants, failures, source IDs and open
choices against the selected contract. Reference related artifacts only when they
exist and matter. A production specification states expected behavior; a formal-test
specification states scenarios, setup, observable assertions and verification level.
One does not replace the other, and no mandatory requirement-to-spec-to-test pipeline
is implied. Authoring does not implement or execute tests.
