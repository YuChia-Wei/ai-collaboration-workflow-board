# pr-author.github 0.1.0

Entry: `python <absolute-package>/scripts/github.py --request <absolute-request.json|->`. This is a package-owned public tool. It calls `pr-author.fs` inspect/render/explain through JSON subprocess requests using the selected installed package; it imports no private skill module. The selected executable must match package_root.

Only GitHub.com same-repository PRs are supported. Runtime needs existing Git/gh and caller-authorized authentication; no login, token storage, account change, credential refresh or alternate provider/host is attempted. API requests pin version 2026-03-10, use explicit GET/POST/PATCH and JSON stdin. Arguments never pass through a shell. Each child has bounded time/4 MiB output, diagnostics suppress raw stderr/headers/payloads and there is no automatic write retry.

The [GitHub PR API](https://docs.github.com/en/rest/pulls/pulls) defines these endpoints; [conditional-request guidance](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api#use-conditional-requests) excludes unsafe methods unless the endpoint documents support. This adapter makes no conditional PATCH/CAS guarantee.

## Requests

All operations require operation,project_root,package_root. Optional common fields are project_config,local_config,overrides,write_roots under [config v2](configuration.md). Closed request fields are enforced. Local package/config binding is checked through pr-author.fs explain before provider access.

| Operation | Additional required fields |
| --- | --- |
| provider-read | target: {provider: github, host: github.com, repository: owner/name, number: positive integer} |
| provider-create | reference,repository_root,expected_record_sha256,expected_template_sha256,expected_body_sha256,write_mode,grant |
| provider-update | All create fields plus number,expected_state_sha256 |

The local proposal supplies provider_target (provider,host,repository,base_ref,head_ref). Get actual record/template/body hashes from inspect/render; render with repository_root must establish subject_verified=true. Publishing titles are single-line without control characters and at most 256 characters; rendered body is at most 60,000 UTF-8 bytes. Larger content is explicitly unsupported. Authored Issue-closing directives are rejected; this adapter does not own closure.

write_mode must be coordinated-single-writer. Any request for server CAS or another mode is unsupported. A mode string does not prove exclusion; the caller is responsible for actual coordination.

grant is {source,operation,target,body_sha256}. Source is the caller's actual permission reference. Target equals the proposal's full provider_target with repository normalized lowercase; update also includes number. Operation and body digest must match this request. Config is not authority. A grant string cannot authenticate human permission: the runtime enforces authorization before dispatch; this tool checks the supplied binding and reports authorization_attestation=not-performed. Existing authority may be reused when it still covers the exact action/target/candidate; no automatic repeated approval gate is introduced. Do not put credentials in grant references.

## Observation and conflict behavior

Read returns projection,expected_state_sha256,url,observed_at. Projection contains host,repository,number,state,draft,merged,title,body,base_repository,base_ref,base_oid,head_repository,head_ref,head_oid,updated_at. Required fields cannot be omitted; only documented null body becomes empty string. Repositories normalize lowercase. Token is SHA-256 of sorted-key compact UTF-8 JSON for that projection, excluding observed_at. A caller cannot substitute updatedAt as an equivalent token.

Create rechecks local record/template/body and actual Git subject, reads remote base/head refs plus comparison merge base, and checks matching open PR absence through explicit list filters. Any observed match blocks creation; absence is an observation, not a server uniqueness guarantee. Create sends only title/body/base/head/draft=true. Update reads the exact open, unmerged PR, requires the supplied expected token and subject, repeats preflight after candidate verification, then sends only title/body. Closed/merged/forked/moved targets are rejected. No branch push occurs.

After a successful write response, a GET must match requested content and base/head identities. Create additionally requires draft=true; update preserves the observed draft state. Result retains actual URL/number, observed token/time and selected subject/digests. The local proposal is not mutated; persisting provider evidence is a separate caller-owned write.

Preflight/post-read are not atomic. A concurrent editor can be overwritten between reads and the write without detectable post-read evidence. Use actual coordinated single-writer operation; the adapter cannot enforce it across unrelated clients. No If-Match promise or fabricated lock is used.

Result fields include operation,outcome,mutation_state and diagnostics. Mutation state none means no provider write was dispatched; committed means a successful write response was observed; unknown means a write may have occurred. A timeout/lost response after dispatch stays failed/unknown. Failed post-read stays failed with committed/unknown state, never rollback or success. Reconcile the exact PR or matching create target before any new authorized attempt. The adapter does not automatically retry, roll back, delete or join provider and local storage transactions.

## Unsupported actions

No Enterprise/fork targeting, PR close/reopen/ready/merge/auto-merge, review, labels/assignees, Issue/Project mutation, branch push/delete, publication/release, credentials management, external backlog synchronization or authority transfer. A created or updated PR grants none of these. Unrelated repository automations are outside this adapter's control.

A [synthetic walkthrough](example.md) supplies no live IDs, successful checks, grants or execution receipts. Source implementation and declared runtime requirements are not provider acceptance evidence.
