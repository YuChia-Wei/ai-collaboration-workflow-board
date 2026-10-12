# Fictional draft: payment authorization

This is authoring material, not a successful create/validate operation or target
execution fixture. The IDs and intent are fictional; use caller-supplied fresh
IDs for real authoring. No normative approval, implementation, test anchors or
runtime evidence exists. Required TIMEOUT1 and THEN5 remain unresolved and linked
from Q1. A semantic review can identify those gaps; runtime compliance is
**unavailable**. If a real selected contradiction were observed, it would instead
be not-compliant even alongside the missing evidence.

The complete proposed record is below. The machine reader, when actually invoked
with its prerequisites, owns the structural result; this prose does not predict
a successful invocation. Source trust and independent criteria remain separate.

```json
{
  "family": "problem-frame.cbf",
  "schema_version": "1.0.0",
  "id": "cbf-11112222333344445555666677778888",
  "frame_key": "illustrative-authorize-payment",
  "title": "Illustrative proposed payment authorization; no real target",
  "derived_from": null,
  "sources": [
    {
      "id": "SRC1",
      "kind": "requirement",
      "reference": "illustrative:payment-intent",
      "revision": null,
      "locator": "Example only; hypothetical stakeholder intent",
      "sha256": null,
      "authority": "proposed",
      "authority_reference": null
    }
  ],
  "statements": [
    {
      "id": "ACTOR1",
      "category": "actor",
      "text": "A customer requests payment authorization.",
      "basis": "stated",
      "source_ids": [
        "SRC1"
      ]
    },
    {
      "id": "CMD1",
      "category": "command",
      "text": "Authorize one payment with a supplied request key.",
      "basis": "stated",
      "source_ids": [
        "SRC1"
      ]
    },
    {
      "id": "DOMAIN1",
      "category": "controlled-domain",
      "text": "The local payment authorization state belongs to this use case.",
      "basis": "stated",
      "source_ids": [
        "SRC1"
      ]
    },
    {
      "id": "INPUT1",
      "category": "input",
      "text": "The request has a payment identifier, amount and request key.",
      "basis": "stated",
      "source_ids": [
        "SRC1"
      ]
    },
    {
      "id": "EXT1",
      "category": "external-boundary",
      "text": "Only the external payment service decides authorization.",
      "basis": "stated",
      "source_ids": [
        "SRC1"
      ]
    },
    {
      "id": "POST1",
      "category": "postcondition",
      "text": "A confirmed successful response records its external reference.",
      "basis": "stated",
      "source_ids": [
        "SRC1"
      ]
    },
    {
      "id": "INV1",
      "category": "invariant",
      "text": "The same request key must not produce duplicate terminal side effects.",
      "basis": "stated",
      "source_ids": [
        "SRC1"
      ]
    },
    {
      "id": "ERR1",
      "category": "error",
      "text": "An external rejection is recorded without a success transition.",
      "basis": "stated",
      "source_ids": [
        "SRC1"
      ]
    },
    {
      "id": "TIMEOUT1",
      "category": "outcome",
      "text": "A timeout is pending or unknown until the target owner selects reconciliation behavior.",
      "basis": "unresolved",
      "source_ids": []
    }
  ],
  "scenarios": [
    {
      "id": "SC1",
      "title": "External success",
      "source_ids": [
        "SRC1"
      ],
      "given": [
        "An eligible payment and a new request key"
      ],
      "when": [
        "The external authority confirms success"
      ],
      "then": [
        {
          "id": "THEN1",
          "text": "The result retains the supplied external reference.",
          "basis": "stated",
          "source_ids": [
            "SRC1"
          ],
          "statement_ids": [
            "EXT1",
            "POST1"
          ]
        }
      ],
      "tests_anchor": []
    },
    {
      "id": "SC2",
      "title": "Repeated completion",
      "source_ids": [
        "SRC1"
      ],
      "given": [
        "The request key has already produced its terminal result"
      ],
      "when": [
        "The same completion is delivered again"
      ],
      "then": [
        {
          "id": "THEN2",
          "text": "No second terminal side effect occurs.",
          "basis": "stated",
          "source_ids": [
            "SRC1"
          ],
          "statement_ids": [
            "INV1"
          ]
        }
      ],
      "tests_anchor": []
    },
    {
      "id": "SC3",
      "title": "External rejection",
      "source_ids": [
        "SRC1"
      ],
      "given": [
        "An eligible payment request"
      ],
      "when": [
        "The external service rejects authorization"
      ],
      "then": [
        {
          "id": "THEN3",
          "text": "The state is not successful.",
          "basis": "stated",
          "source_ids": [
            "SRC1"
          ],
          "statement_ids": [
            "ERR1"
          ]
        },
        {
          "id": "THEN4",
          "text": "The rejection is recorded.",
          "basis": "stated",
          "source_ids": [
            "SRC1"
          ],
          "statement_ids": [
            "ERR1"
          ]
        }
      ],
      "tests_anchor": []
    },
    {
      "id": "SC4",
      "title": "Timeout behavior needs an owner decision",
      "source_ids": [
        "SRC1"
      ],
      "given": [
        "The external request is outstanding"
      ],
      "when": [
        "The request times out"
      ],
      "then": [
        {
          "id": "THEN5",
          "text": "The final timeout outcome is intentionally unresolved.",
          "basis": "unresolved",
          "source_ids": [],
          "statement_ids": [
            "TIMEOUT1"
          ]
        }
      ],
      "tests_anchor": []
    }
  ],
  "open_questions": [
    {
      "id": "Q1",
      "text": "Which target-approved timeout, reconciliation and retry behavior is required?",
      "related_ids": [
        "TIMEOUT1",
        "THEN5"
      ]
    },
    {
      "id": "Q2",
      "text": "No normative approval, target implementation or runtime evidence exists for this fictional example.",
      "related_ids": []
    }
  ]
}
```
