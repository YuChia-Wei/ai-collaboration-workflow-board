# Review a fixed test design

## Selected installed knowledge for review

For requested knowledge coverage, take the caller's explicit canonical
`project_root`, externally observed raw `expected_lock_sha256` for
`.ai/framework.lock`, installed selection/lock, capability `test-design`,
operation `review`, execution mode, affected paths/file types, technology,
requested coverage and permitted target authority inputs. Supply `authorities`
as the exact deduplicated closed `{path, sha256, selector}` allowlist from
selected bindings; duplicate (path, selector) or a raw-hash mismatch is invalid.
Do not infer technology from a file suffix or select a package implicitly.

Use the read-only
`distribution.catalog.read_installed_resources(project_root, expected_lock_sha256, authorities)`
through the verified engine-2 source closure in an isolated `-I -B` host, or
follow that same installed-file reader protocol without introducing a second
lock/metadata parser or ambient source-checkout import. The reader verifies the
complete installed lock-2 identity and member closure, managed state and raw
authority hashes. An absent/legacy lock, stale identity, drift, unsafe path or
undeclared authority raises `InstallationError` or `DistributionError`;
there is no partial index. Without a verified index, continue only unaffected
common work and report requested specialist coverage unavailable or blocked.
Never fall back to source-tree package links or save configuration implicitly.

The successful reader returns exactly `lock_sha256`, `candidate_identity`,
`desired_sha256`, `resources`, `bindings`, `authorities` and
`semantic_applicability: target-owned`. Each resource row gives package,
version, resource_id, installed member path, raw SHA-256 and the closed Resource
(kind, rule_ids, capabilities, operations, technology_profile). Bindings are
the exact saved selection rows. Returned authorities have
`status: raw-hash-matched`; semantic applicability remains target-owned.

Treat metadata-4 `knowledge_consumption` resources as an allowed set, not an
instruction to load all of them. Intersect it with the verified selected
packages/resources, saved bindings, matching capability/operation/execution-mode,
path-prefix, technology-profile and file-type selectors, and this task. Read
only needed installed `.ai/core/knowledge/<id>/<member>` bytes with bounded
direct reads matching the returned raw SHA-256. Re-observe the exact lock,
markers and authority hashes around those reads; discard the result on drift.

Knowledge explains and examples illustrate. Normative rules require adopted
binding and the existing target-owned resolver/gate; an index or source catalog
grants neither applicability nor approval. A selected resource without a
matching binding supplies no adopted normative coverage. Preserve conditional
rules as conditional, and let the named target owner interpret authority
selectors and predicates. Stale, ambiguous or conflicting target authority
blocks the affected normative judgment. Do not re-request adoption for an
unchanged saved binding.

Return a transient result with `status` (available, unavailable or blocked),
`loaded_resources` (package, version, resource_id, member, sha256, use_as),
`applicable_rule_ids`, `conditional_rule_ids`, `authorities` (path, sha256,
selector), `coverage` (capability, operation, technology_profile, status,
missing) and `diagnostics` (code, relative_path_or_null, reason,
next_action). Name each missing package, resource, authority, rule or target
predicate required for requested coverage. Optional absence is unavailable;
required specialist gaps cannot be reported as covered. Continue unaffected
common work with that limit disclosed. Persist only when the actual task
authorizes a destination; no new record family or implicit config write.

## Select relevant guidance and bind the subject

Within the verified task-selected allowlist, choose only the BDD topic needed:
`member:bdd/discovery.md` for unresolved rules or example status,
`member:bdd/formulation.md` for example precision and oracle reasoning,
`member:bdd/automation.md` for design-to-execution boundaries, and
`member:bdd/gherkin.md` for requested Gherkin syntax or expression review.
`member:bdd/README.md` helps topic selection; the library example is illustration.
Neither BDD knowledge nor GWT syntax is a prerequisite for general test review.
General and GWT handoff contracts are optional task-selected guidance, not a
requirement to load both. Missing optional knowledge leaves its named coverage
unavailable; continue common review supported by caller sources and these criteria.

Bind the fixed artifact path/version and digest, or quote the bounded inline
design. Record behavior sources, IDs, revisions/status, verification goal,
selected coverage, target conventions and actual infrastructure constraints.
A discovery-only question is not a fixed design subject: return the missing
subject or bounded clarification rather than inventing a review result.
Leave the subject unchanged. Finish review before a separately authorized
[design revision](design.md); a later review binds the revised subject.

## Assess the reasoning and selected expression

| Criterion | Inspect for |
| --- | --- |
| Source authority | Agreed, proposed, observed and unknown behavior remain distinct; no invented approval or oracle |
| Traceability | Criteria, risks and invariants map to design/case/row IDs or explicit gaps; source revisions survive |
| Oracle | Every important expected value, relation, property or exception has an independent permitted source |
| Subject and observations | The real subject and each meaningful outcome are explicit; private implementation details need a selected-contract reason |
| Test level and facilities | The boundary can prove the claim and fits actual target infrastructure; required real facilities are identified as available, missing or unknown |
| Setup and isolation | Relevant data, identity, time, state, responses, nondeterminism and cleanup are controlled or disclosed |
| Input and failure coverage | Relevant partitions, boundaries and specified failure/recovery are represented without inventing business rules |
| Format fidelity | GWT, tables, transitions, properties or formal prose preserve the same behavior and all accepted outcomes |
| Handoff | IDs, oracle, setup, boundaries and unresolved decisions can survive into implementation; future results are not fabricated |
| Cost and conventions | Fixtures are proportionate; target rules apply from their authority, not from an illustrative method or runner default |

For GWT or Gherkin, check each Then/And, independent scenario setup and meaningful
primary event or justified sequence. Separate syntax defects from optional
writing advice. For tables, inspect partition meaning, row identity, unknown
cells and any claimed precedence. For state designs, check guards, permitted
and rejected transitions against the source. For properties, inspect the sourced
invariant, input domain, preconditions, observation and counterexample meaning.
Do not assume a familiar property is valid for this product.

An unavailable real dependency limits the integration claim. A mocked substitute
can support only its stated isolated claim. A well-formed test specification,
case count, generated report or green test name is not proof that a useful check
exists, runs or covers the intended behavior. Missing specialist guidance or
conflicting target authority limits the affected judgment, not unrelated review.
Valid alternative expressions or levels may establish the same selected claim.

## Report findings and limits

For each finding return artifact location, criterion/source, evidence, triggering
condition, impact, severity rationale, uncertainty and a bounded correction.
Distinguish defects, owner questions and optional improvements. Suggested cases
must cite a source or remain explicitly provisional. Return the fixed subject,
sources, findings, criterion-to-design coverage, exclusions and missing inputs.
No findings means none supported in inspected coverage, not acceptance or compliance.

Choose and justify the review classification:
- `self-check` when the reviewer authored or repaired the artifact.
- `review; independence not established` when authorship or required evidence is unknown.
- `independent-review` only with evidenced distinct author, fixed subject,
  read-only reviewer and applicable target independence requirements.

Different prompts/models and a hash alone do not prove independence.
This package mandates no review packet. Preserve target acceptance authority.

## Keep artifact review separate from executable evidence

This operation reviews a design or formal test specification, not test code.
Executable-test review must follow actual calls, verify that the real action
runs and check observations/assertions against each designed outcome/property.
GWT comments, helper names, compilation and a green run alone cannot prove fidelity.
Do not claim such code inspection or execution from design text.

Return an optional handoff for a precise requirement decision, architecture
question or bounded implementation with source, question/correction and existing
permission. No further skill is required merely to finish this review.
A handoff grants no new authority, produces no test result and rewrites no
source requirement. Formal-test design responsibility remains with test-designer;
it does not require a second spec-author stage.
