# Local contract for a later Sites adapter (unverified)

This file prepares platform work without provisioning, deploying or granting
access. The Python implementation and its UI are operational locally. A Sites
Worker implementation, D1 adapter and R2 adapter are **not implemented or tested**;
SQLite success does not establish their correctness.

Required adapter operations: authenticate/revoke principal binding;
authorize namespace/action; get context and exact document revision; find by
external relation; atomically accept command/CAS/receipt/event; query receipt;
export immutable consistent cutoff; preflight; restore into empty target with
explicit identity rebinding and external effects disabled.

## Transaction requirement

An accepted write must commit state, document revision, event and receipt together.
No transaction may leave an event or receipt if the CAS changed zero rows.
For D1, zero-row UPDATE is not a SQL error: a generic batch followed by checking
`changes` is insufficient. The chosen implementation must enforce a shared
atomic success condition and demonstrate two concurrent writers, duplicate
operations, same ID/different payload, missing evidence, rollback, and response
loss. Prefer a conditional guard that aborts the transaction on failed admission,
and verify the actual provider behavior before claiming compatibility. Never
work around a conflict by replaying on a new revision automatically.

For separate object storage, use immutable hash-addressed objects. Validate bytes
and SHA-256; persist object bytes before committing the DB reference, since no
cross D1/R2 transaction has been demonstrated. Pending orphan objects need a
separate, authorized retention/cleanup process. Export must freeze the data cutoff
and enumerate/hash **all** retained attachments and revisions. A temporary URL is
not an export. Restore validates bytes first, rebinding identities; it must not
replay webhooks or provider writes.

## Example non-secret configuration contract

```json
{
  "contract_version":1,
  "mode":"synthetic-poc",
  "namespace":"synthetic-416",
  "database_binding":"PENDING_OWNER_APPROVAL",
  "blob_binding":"PENDING_OWNER_APPROVAL",
  "identity_provider":"PENDING_OWNER_DECISION",
  "external_writes_enabled":false,
  "publish_permission":"separate-owner-only",
  "lease_mode":"none",
  "export_schema":"workflow-portable-v1"
}
```

This is a contract illustration, not a deployment-ready configuration or a
resource identifier. No secrets, account IDs, invite targets, credentials or
remote URLs were generated.

## Small platform comparison

| Candidate | Development/maintenance burden | Evidence still needed |
| --- | --- | --- |
| Sites frontend + Worker/D1/R2 | Fits desired first UI; thin command API and explicit adapter work; account-wide beta limits and separate identity/plugin management | Real transactions, persistent restart, object cutoff, external client authentication, sharing/revocation, account limits and exit |
| PostgreSQL + thin API/MCP | Familiar transaction/CAS semantics and relational export; independent service operations, hosting/backup/auth needed | Approved host/cost, concrete authentication and operational restore |
| Notion / SharePoint + thin layer | Convenient document editing; more work to prevent bypass of commands and obtain complete revision/attachment export | Actual schema/history/CAS guarantees and licensed approved access |

Recommendation: carry the tested platform-neutral command/export contract into
an owner-approved Sites suitability PoC first. If its transaction, authentication
or exit contract fails, bring an explicit alternative decision back to the owner.
No paid service choice or online platform adoption was made here.

## P2 / P3 approval list

P2 needs the chosen platform and synthetic namespace; explicit permission for
resource creation and deployment/publication; actual storage/compute/cost limits;
identity method, scoped access/revocation; selected external agents; separately
approved colleague invite list; Site versus plugin sharing scope; retention and
backup frequency; and a tested platform exit.

P3 needs reviewed source policy/consumer changes, selected real workflow and Git
history retention window, old-source freeze and opt-in cutover, approved rollback,
and separate permission for historical cleanup/deletion. No silent dual-write or
Git-record fallback may be introduced.

Official documents checked 2026-10-05: [Sites availability and beta limits](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites),
[plugin hosting and account sharing limits](https://help.openai.com/en/articles/20001547-hosting-a-plugin-with-chatgpt-sites),
[MCP stdio transport](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports).
Account-specific limits and online connection are P2 unknowns. The parent task's
read-only platform observations report an empty Sites list and no created Site;
this prototype did not query or create Sites resources itself.
