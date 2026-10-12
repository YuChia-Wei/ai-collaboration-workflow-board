# Review a fixed scenario artifact

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

Bind the artifact path/version and digest, or quote bounded inline scenarios.
Record requirements/ACs, source revision/status, coverage and target conventions
separately. Leave the artifact unchanged. For authorized revision, finish this
review before [designing the revision](design.md); later review binds that new
subject.

| Criterion | Inspect for |
| --- | --- |
| Traceability | Each scenario has a source requirement or labeled assumption; each in-scope AC has coverage or a gap. Preserve scenario/data-row IDs and source status. |
| Observable assertions | Every important Then names an assertable value, relation, state, event or error with an independent expected-value source. |
| Controlled setup | Given supplies data, permissions, time, state, dependency outcomes and isolation; nondeterminism/unknowns are visible. |
| Behavior focus | One main When, or a justified sequence, tests a contract rather than copying private algorithm steps. |
| Boundaries/failures | Meaningful edge values and specified failure/recovery are covered; speculative cases are not invented requirements. |
| Evidence level | The selected boundary can prove the behavior; a mock is not real integration evidence. |
| Handoff | Stable IDs, concrete data, expected outcomes and unresolved inputs survive into implementation; future locations/results are not invented. |
| Cost/conventions | Fixtures are proportionate; conventions are explicitly target-selected without imposing a runner/package. |

Missing requirement authority or selected specialist guidance limits the affected
judgment. This package has no technology extension. Keep required specialist
acceptance unresolved instead of presenting common-method coverage as a pass.
Valid alternative wording or test levels may prove the same acceptance.

For each finding give artifact location, criterion/source, evidence, triggering
condition, impact, severity rationale, uncertainty and a bounded correction.
Distinguish defects, questions and optional improvements. Suggested scenarios
cite their source or remain provisional. Return subject, sources, findings,
criterion/AC coverage, exclusions and missing inputs. No findings means none
supported within inspected coverage, not compliance.

Choose and justify the classification:

- `self-check` when the reviewer authored or repaired the artifact.
- `review; independence not established` when authorship or required evidence
  is unknown.
- `independent-review` only with evidenced distinct author, fixed subject,
  read-only reviewer and applicable target independence requirements.

Different prompts/models and a hash alone do not prove independence. This
package mandates no review packet. Preserve separate target acceptance and
state actual inspections and limits.

This operation reviews scenario artifacts. Executable-test review must follow
actual step/helper calls, check that the real action runs and assertions inspect
every designed outcome. GWT comments, names, compilation and a green run alone
cannot establish fidelity. Do not claim such code review or execution from
scenario text.

Return optional handoffs for requirement decisions, architecture, formal-spec
authoring or bounded test implementation with source, exact question/correction
and existing permission. Other skills are not required to finish this review.
A handoff grants no new authority, creates no test results and rewrites no
source requirement.
