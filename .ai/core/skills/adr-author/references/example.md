# Synthetic adr example

This illustrates request/config shapes only. It is not an execution transcript,
persisted record, owner decision or validation pass. No listed file has been created.
Replace all angle-bracket placeholders with ACTUAL values; they are deliberately
invalid hashes/IDs/times. Use platform-appropriate absolute roots (for example an
explicit drive path on Windows), an installed package and existing project root.

## Project bindings

An owner may author `collaboration.json` with this v2 configuration. The store is
custom; templates remain the declared package default. The broad `knowledge` write
root intentionally permits creating its own missing store parents. This package
ignores the unrelated namespace's object without interpreting it.

```json
{
  "config_version": 2,
  "skills": {
    "adr-author": {
      "store": {
        "root": "knowledge/decisions"
      }
    },
    "unrelated.skill": {
      "opaque": "Ignored by this package"
    }
  },
  "constraints": {
    "adr-author": {
      "write_roots": [
        "knowledge"
      ],
      "locked_fields": [
        "store.root"
      ],
      "decision_sources": [
        {
          "id": "project-owner",
          "root": "evidence/decisions",
          "allowed_actors": [
            "architecture-owner"
          ],
          "pointers": {
            "subject_sha256": "/subject_sha256",
            "actor": "/actor",
            "decision": "/decision",
            "decided_at": "/decided_at",
            "option_id": "/option_id"
          }
        }
      ]
    }
  }
}
```

## Related-record decision and initial content

Read [operations](operations.md) first. Query and review the REAL output:

```json
{
  "project_root": "/absolute/project",
  "package_root": "/absolute/installed/adr",
  "project_config": "collaboration.json",
  "operation": "query",
  "text": "persistence"
}
```

If caller judgment selects a new identity, use its actual query digest and the
same query selection. This example's content remains authored analysis:

```json
{
  "project_root": "/absolute/project",
  "package_root": "/absolute/installed/adr",
  "project_config": "collaboration.json",
  "operation": "create",
  "text": "persistence",
  "decision": {
    "action": "new",
    "query_sha256": "<actual query_sha256>",
    "acknowledge_partial": false,
    "reason": "Distinct bounded applicability after reviewing the returned records."
  },
  "content": {
    "title": "Choose persistence for one bounded context",
    "context": "This decision covers one domain and its transaction boundary.",
    "decision_drivers": [
      "Preserve domain ownership and transaction semantics"
    ],
    "options": [
      {
        "id": "current",
        "summary": "Retain the existing persistence adapter",
        "benefits": [
          "Small change"
        ],
        "costs": [
          "Existing limitations remain"
        ]
      },
      {
        "id": "scoped-change",
        "summary": "Change only the selected domain adapter",
        "benefits": [
          "Local capability improvement"
        ],
        "costs": [
          "Requires actual migration and operational evidence"
        ]
      }
    ],
    "consequences": [
      "Other domains retain independent choices."
    ],
    "evidence": [],
    "applies_when": [
      "The selected domain boundary"
    ],
    "does_not_apply_when": [
      "Unrelated domains"
    ]
  }
}
```

Do not infer success. Inspect the actual returned reference/digest; an unavailable
runtime or partial query is a real limitation. A failed create may have retained
empty directories and reports its actual mutation state.

## Independent owner decision

The project's existing ownership process produces evidence such as the following.
The tool does not create this file or authenticate its actor string. The raw record
digest must still match the draft/candidate observed by the owner; timestamps are
real event times, not this example's placeholders.

```json
{
  "subject_sha256": "<actual raw record sha256>",
  "actor": "architecture-owner",
  "decision": "accept",
  "decided_at": "<actual owner decision time with timezone>",
  "option_id": "scoped-change"
}
```

After obtaining the actual file and its raw digest, select it explicitly:

```json
{
  "project_root": "/absolute/project",
  "package_root": "/absolute/installed/adr",
  "project_config": "collaboration.json",
  "operation": "decide",
  "reference": {
    "role": "adr.record",
    "id": "adr-<actual 32 lowercase hex digits>"
  },
  "expected_sha256": "<actual raw record sha256>",
  "reason": "Record the independently made owner decision.",
  "decision_source": {
    "binding_id": "project-owner",
    "path": "evidence/decisions/selected.json",
    "expected_sha256": "<actual decision file raw sha256>"
  }
}
```

A matching read-back records the decision only. It does not prove implementation,
rule adoption, tests or enforcement. Inspect/render remains historical evidence.
To correct accepted content, query and explicitly derive a NEW identity using the
source reference/digest, reason and new-record query decision. Source bytes and
evidence stay intact; the new candidate/draft has no inherited decision.
