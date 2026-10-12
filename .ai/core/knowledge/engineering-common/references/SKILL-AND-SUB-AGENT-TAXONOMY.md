# Skill And Sub-Agent Taxonomy

A skill is a top-level capability selected by the user or main agent. A sub-agent
is a bounded execution role with explicit scope, authority, input, output and
stop conditions. Shared references, templates, schemas and tools support these
assets; supporting material is not another runtime entry.

A skill may execute directly or coordinate an available delegated role. Some
roles are reusable across skills; private roles remain with their owning skill.
An installed role does not compel delegation. Record the actual executor and
execution evidence before claiming delegation or independent review.

## Classification

| Asset | Owning concern | Typical contents |
| --- | --- | --- |
| Skill | User-visible capability and operation | Entry instructions, bounded operations, references and optional deterministic tools |
| Sub-agent | Bounded execution responsibility | Role instructions, read/write boundary, result contract and provider projection |
| Knowledge | Reusable engineering meaning | Rules, methods, standards, examples and technology bindings |
| Project record | Actual target decisions and evidence | Requirements, adopted policies, assessments, workflows and lessons |
| Runtime projection | Tool-specific discovery | Generated skill entry or configured role projection |

Names containing "agent", YAML metadata, a private-role folder or a static model
setting do not establish runtime invocation. A historical .NET guidance role is
knowledge until a supported runtime projection and authorized dispatch exist.
Preserve the distinction between a role's capability and a skill's operation;
select neither solely because their names resemble the task.

Use [context ownership](CONTEXT-RESOURCE-OWNERSHIP.md) for semantic authority and
placement. The framework source owns reusable assets; consuming projects own
adoption, provider configuration, actual records and execution authorization.
