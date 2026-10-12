---
name: software-development-orchestrator
description: Coordinate software development from high-level intent or an existing checkpoint through the needed specialist stages, authorization, validation, handoffs and closeout. Use for connected work that needs stage sequencing; keep bounded single-stage requests with their selected specialist.
---

# Software development orchestrator

Use `orchestrate` to turn an authorized development outcome into the needed
stages and carry them through their actual results. Use `resume` to reconcile an
existing checkpoint with current project truth before continuing. Read the
[orchestration method](references/orchestrate.md) for both instruction operations
declared in [package metadata](skill-package.yaml).

Select stages from the user's outcome, accepted artifacts and unresolved
decisions. Preserve explicitly selected skills and existing authorization. A
small local change does not need a requirements-to-release pipeline.

The project owns its engineering rules, workflow policy, records, commands and
external operations. This skill coordinates their use; it does not prescribe a
record schema, storage path, provider or installation. It works without framework
configuration, scripts or a workflow store. Resolve specialist capabilities from
those actually available; missing support stays visible.

The restored `0.2.0` package supplies development stage orchestration. It does
not implement the retired `0.1.0` workflow-record tool operations or migrate
their records. `implemented` means these instructions exist, not that a stage,
installation, review or product acceptance has occurred.
