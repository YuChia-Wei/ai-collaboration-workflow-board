# Selected legacy and external intake

Machine support is exactly new `problem-frame.cbf@1.0.0` through its owner.
Unversioned CBF YAML, SWF YAML, unknown CBF versions/families and external prose
are not retroactively that format. Preserve original filenames, IDs, family,
versions/uncertainty and raw bytes. No automatic discovery, parser substitute,
rewrite, migration or conversion pass is part of this package.

Explicitly select each supplied CBF file:

- frame.yaml
- machine/machine.yaml
- machine/use-case.yaml
- controlled-domain/aggregate.yaml
- acceptance.yaml

For SWF explicitly select its frame.yaml, machine/machine.yaml,
machine/use-case.yaml, workpiece/aggregate.yaml and each concrete requirements
YAML path. `requirements/*.yaml` names a legacy category, not a glob to execute.
Missing members stay missing; do not invent evidence from a historical example.

For each selected file record exact digest, original identifiers, version if
present, locator and original source authority or uncertainty. Return structural
stage **unsupported/unavailable** when the machine owner cannot read the input.
If the caller requests semantic reading, still extract useful bounded findings
and a full criterion inventory with source locators. Keep it visibly separate
from owned v1 structural success and runtime conclusions.

Preserve actor/command/outcome/domain, machine steps/errors/constraints, use-case
input types/PRE/POST/output, aggregate signatures/invariants/event attributes,
acceptance given/when/every then/traces/anchors, and SWF acceptance criteria and
entity/workpiece contracts. FC concerns and problem-world facts remain explicit.
Repeated PRE1/POST1 in different files are distinct source identities, not a
permission to merge them. Preserve local/shared invariants and supplied semantic
tags as meaning to assess under actual target rules, not imported C# rules.

Produce one loss/uncertainty row for each retained, changed, omitted, unresolved
or unrepresentable field, showing source file/locator, destination criterion or
prose location and reason/owner decision. Unknown fields cannot disappear merely
because a new format has no slot. External templates retain requested sections
and comparison dimensions; annotate gaps outside closed formats. If a separate
authoring task creates new CBF, it needs a new snapshot ID, predecessor binding,
explicit intent decisions for meaning changes and the actual owner tools. That
manual draft does not migrate, supersede or retire the originals.
