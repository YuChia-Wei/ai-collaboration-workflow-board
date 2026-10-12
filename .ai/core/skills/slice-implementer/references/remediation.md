# Remediation overlay

Use with exactly one selected command/query/reactor/generic mode when repairing
authorized review findings or validation failures. It is not a replacement
execution mode and does not change that mode's accepted architecture.

Keep three inputs separate: authorization, normative requirements/decisions,
and finding/failure evidence. Bind a finding's reviewed subject/revision when
relevant. Preserve actual durable IDs; quote bounded conversational findings
instead of inventing IDs. Ordinary bug fixes need no formal finding.

1. Reconcile the finding against the current subject and source requirement.
   A stale finding is not proof the defect still exists.
2. Map each selected finding to an acceptance criterion, intended repair and
   evidence needed before editing. Conflicting normative truth needs its owner;
   a reviewer suggestion is not architecture approval.
3. Implement only selected work and applicable regression protection within
   authority. Record adjacent issues separately.
4. Preserve before/after evidence, actual commands/results and limitations.
   Return results without rewriting or closing the originating assessment.

Use truthful dispositions:

- resolved: the stated acceptance and required validation are satisfied with
  evidence, subject to any separately required independent closure.
- partially-resolved: an explicit portion is complete; remainder/owner/action
  are identified.
- not-reproduced: current evidence does not reproduce the finding; report its
  limits rather than applying a speculative fix.
- deferred: scope, authority, dependency or required evidence remains missing.
- rejected: supported evidence of invalidity is recorded by the authorized
  review/decision owner, not silently declared by the implementer.

Implementation with validation deferred is not a resolved finding. Return
mode/overlay, finding-to-disposition mapping, changed files, before/after and
check evidence, remaining/new findings and any required verification handoff.
A target may require independent review; self-check cannot satisfy it.
