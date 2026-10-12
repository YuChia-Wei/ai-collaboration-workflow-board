---
name: code-reviewer
description: Review selected code, a diff or concrete implementation guidance for actionable defects against intended behavior and target-owned rules. Use for artifact-based findings; causal investigation of an observed symptom belongs to diagnosis. Keep review read-only.
---

# Code reviewer

Use the `review` instruction operation in [package metadata](skill-package.yaml).
Read [the common review method](references/review.md), establish the subject and
applicable target authority, then trace behavior and return evidence-backed prose
findings. Review is read-only; a request to review does not authorize repair or
external writes.

Select this route for defects in the identified artifact. Investigating why an
observed failure occurs belongs to diagnosis; architecture and scenario-artifact
reviews retain their specialist owners. Static causal evidence can support a code
finding without claiming reproduction or requiring a separate diagnostic stage.

This package supplies common review reasoning. It ships no technology extension,
including no .NET specialist checks. Name unavailable requested coverage and retain
any target-required specialist gate. Do not imply that common review satisfies it.

No framework configuration, managed record store, schema, script, dependency or
Python runtime is required for this instruction. The caller supplies the intended
behavior, permitted target evidence and any target-specific rules. Use only the
permissions and environment actually available for those inputs. Return findings
in the conversation; export prose only when a destination and write are authorized.

The declared `implemented` status means these instructions exist in the package.
It is not evidence of invocation, independent review, correctness or acceptance.

Optional selected knowledge follows the metadata-4 allowlist and each operation's
installed-resource protocol. Selection does not adopt target rules or prove
specialist coverage; common work remains available when knowledge is absent.
