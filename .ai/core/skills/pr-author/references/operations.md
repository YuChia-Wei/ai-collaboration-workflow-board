# Pull Request public filesystem operations

Tool `pr-author.fs`: `scripts/pr.py`, Python >=3.11,<4, PyYAML >=6,<7, jsonschema >=4.18,<5. Request is one strict JSON object, from an absolute file or stdin using --request. CLI usage errors return JSON; --help is usage only. Success exits 0, other outcomes exit 1. No operation imports another skill.

Common required fields: operation,project_root,package_root. Optional common fields: project_config,local_config,overrides,write_roots. Unknown fields fail. Requests/individual records/diffs are bounded at 4 MiB; query reads at most 10,000 direct matching filenames. Oversize is unsupported, never a complete truncated result.

| Operation | Additional input | Result |
| --- | --- | --- |
| explain | None | Effective settings, provenance, roots/locks; capability not-probed; no creation. |
| query | Optional literal text, default empty | Title/summary substring matches sorted by filename/ID, digest per readable record, partial and per-file diagnostics. |
| inspect | reference: {role: pr.record, id} | Strictly parsed record and raw-byte SHA-256. |
| revise | reference,expected_sha256,content | Complete authored replacement under lock; preserves controlled fields/extensions; equal content is byte/time-preserving no-op. |
| render | reference | Markdown view plus raw record/template/body hashes; no persisted view. |

Output includes operation,outcome,mutation_state and diagnostics as needed. Outcomes: succeeded,invalid-input,unsupported,unavailable,blocked,conflict,failed. A caller who did not invoke a tool reports not-executed separately. Mutation state is none/committed/unknown and describes record publication, not transient lock/parent creation. Write results retain directories_created and cleanup failures. Do not infer rollback from failure. Diagnostics do not echo input payloads/exception text; explicit inspect/explain/render results intentionally contain selected data.

## Record and template rules

Record identity is store-scoped, tool-generated UUID4 hex; created_at is fixed; updated_at changes only for a material update and cannot regress. Schema version is exact 1.0.0. Unknown versions are preserved and unsupported. The owned schema is selected from metadata v2's exact readable/writable identity. Same-document definitions are supported only with bounded acyclic references; remote/file/dynamic references and schema rebasing are rejected. Actual execution calls the schema validator; mere document readability does not constitute such execution.

Extensions use dotted namespace keys. Creation can supply them; revise/transition preserves them. References remain opaque data, never instructions or automatic fetching. A GitHub Issue reference must explicitly use reference-only relationship. No import/delete/migration, two-way sync or automatic authority transfer exists.

Templates are inert UTF-8 text. Substitute each token once, escape authored Markdown/HTML and reject unknown/malformed/missing tokens. Rendering a view never accepts view edits as record truth. Export needs separate destination authority.

## Real Git selection

Prepare requires repository_root,base_commit,head_commit,content. repository_root must be the exact Git root inside project_root. OIDs must be full lowercase commits matching the repository object format. Reject shallow/bare/promisor repositories, repository-local or worktree diff/include configuration, nonempty info/attributes or info/grafts, missing objects, nonunique merge bases and empty changes. No fetch/push/checkout occurs. Root worktree/index state is reported but excluded; nested submodule dirtiness is intentionally ignored by the status observation.

Recipe pr.diff/v1 hashes actual merge-base-to-head bytes. It selects committed attributes using --attr-source=<head>, strips ambient GIT variables, disables system/global config/attributes, lazy fetch, replacements, prompts and fsmonitor; core.attributesFile uses the platform null device. Fixed flags select no external diff/textconv/renames/color, binary/full-index output, a/ and b/ prefixes, Myers, no indent heuristic, three context lines, zero inter-hunk context, no relative paths and short submodule output. An unscoped git config --no-includes --null --list inspects the effective configuration: repository settings and worktree settings when extensions.worktreeConfig is enabled, plus the fixed command options. System/global settings remain disabled by the sanitized child environment. This avoids an explicit --worktree read, which can fail in a normal multi-worktree repository when the extension is disabled. Include/includeIf directives themselves cause rejection before comparison. Optional absent worktree configuration follows Git's effective read behavior; invalid or unreadable consumed configuration and all other Git errors remain blocked. See [Git configuration files and scopes](https://git-scm.com/docs/git-config). Unsupported overrides in every consumed scope fail. A Git version lacking the pinned recipe fails without fallback. UTF-8 diff output is required. This is not cross-version canonicalization.

Subject contains object_format,base_commit,head_commit,merge_base,base_tree,head_tree,diff_sha256,git_version,diff_recipe. Result adds actual diff and working_tree_dirty. Summary is authored content reviewed against that real diff; the tool cannot prove semantic accuracy. No checks execute.

Filename <id>.pr.json; ID pr-<32 lowercase hex>; state is always prepared. Content requires title,summary,validation,references; optional provider_target selects {provider:github,host:github.com,repository:owner/name,base_ref,head_ref}. Create-only extensions are allowed. Revise replaces authored content (omitting provider_target removes it) while preserving subject. A changed Git selection requires a new prepare, not subject editing.

Validation entries require id,command,disposition,subject_head,subject_diff_sha256,evidence,reason. IDs are unique; every head/diff matches the proposal. Dispositions are planned,not-executed,succeeded,failed,blocked,deferred,not-applicable. Succeeded/failed require nonempty execution evidence references; deferred reason should identify responsible owner/next action. Evidence truth remains the caller's responsibility. Rendering preserves each result/reason and creates no overall green result.

A prepare caller may initially supply empty validation, inspect the actual subject and then revise with bound evidence. Empty validation renders None supplied, not successful checks. Stale labels cannot be copied to a new subject.

Render additionally accepts optional repository_root. When supplied it recomputes the pinned Git comparison and requires exact subject equality, returning subject_verified=true; otherwise false. The GitHub adapter requires this rebind. Render returns view.markdown,sha256,template_sha256,body_sha256 and subject. Template/record changes invalidate previously selected publication hashes.

Required template tokens: id,title,summary,subject,validation,references. [GitHub operations](github.md) are separately invoked and require actual external-write authority. Prepared is not published/merged; provider results remain separate observations.
