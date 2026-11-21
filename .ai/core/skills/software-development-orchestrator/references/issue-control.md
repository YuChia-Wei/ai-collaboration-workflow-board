# Optional issue-operation settings

## Read and validate at each operation

The caller or target rules explicitly select the project configuration file.
Do not infer it from the current directory, search ancestors or write a default
file. No selected file means package defaults. An explicitly selected missing,
unreadable or malformed file is unavailable, not an empty selection. Read it
again for every `orchestrate` or `resume`; installation does not cache the choice.

The project JSON envelope has exact integer `config_version: 2`, optional `skills`
and optional `constraints` objects, with no other top-level keys. Reject duplicate
keys, non-JSON/nonfinite values, invalid Unicode and non-object namespaces. Foreign
namespace objects remain inert. Select only
`skills.software-development-orchestrator`; absent namespace means `{}`. Do not
apply local/invocation overrides or constraints from other packages to this choice.
This instruction package adds no settings writer, discovery process or store.

Before any issue operation, validate the selected namespace using the complete
[settings schema](../schemas/issue-control-settings.schema.json). Its exact rules
are: the namespace is an object with only optional `issue_control`; that value is
an empty string or one of the two exact objects below. Reject null, whitespace-only
strings, unknown modes, unknown fields, incomplete objects and implicit route
coercions. Project routes have 1–4096 characters, no newlines and no leading or
trailing whitespace. Validate before checking route availability; invalid settings
must not become the empty/default mode. If validation cannot be completed, stop
issue operations and report the missing validation rather than invent a choice.

| Setting | Selected behavior |
| --- | --- |
| Missing `issue_control` or `""` | Fully unspecified. Use available AI-native tools under the target's actual permissions; select no framework skill, provider, MCP, local store or fallback. |
| `{"mode":"experimental","route":"issue-control"}` | Resolve the exact experimental issue-control package and read its actual entry. It is currently unavailable: its implementation is a future separate Feature. Stop affected issue operations; do not substitute another route. |
| `{"mode":"project","route":"<exact skill or MCP entry>"}` | Resolve exactly the target-selected skill entry or MCP contract, read its operations and verify availability. A team Azure DevOps skill may be selected this way. Missing/ambiguous routes stop affected issue operations without fallback. |

The planned experimental package is optional, is not installed by default and
has no implementation in this source distribution. Its intended GitHub
Issues/Projects default and local backlog fallback are future work, not available
provider behavior. The retired standalone local-backlog package is excluded from
the current source distribution. Existing installed copies require separately
supported deselection. Retirement does not claim a replacement or migrate data.

## Route changes and authority

Changing project-owned settings after installation affects the next operation;
no reinstall or package-selection edit is needed just to change this routing.
The saved installation selection remains separate from these operation settings.
Installation never creates or rewrites the project configuration implicitly.

A resumed record retains its original provider and item references. A new route
selection does not reinterpret an existing item ID, copy or migrate records,
select a second writable authority, change state, or close an item. Reconcile a
conflicting current route with the item's original owner before dependent writes.
Continue independent authorized work when issue operations alone are blocked.

Every actual provider operation still requires its target permission and task
authorization. This setting does not grant credentials or execution authority.
Keep requirements/functional discussion in Issues and execution authorization,
agent handoffs and resume checkpoints in the selected workflow mechanism.

## Source metadata compatibility

This package declares `configuration.kind: instruction-settings`, its own namespace,
a precise declared schema `{id, version, path}` and JSON-object defaults. This
kind is limited to instruction-only packages without record roles, templates or
tools. Older loaders reject the new fields instead of treating them as record
store configuration. Existing record configuration semantics remain unchanged.

The source loader checks defaults when exact schema bytes enter package closure;
it does not resolve or execute project settings. Its closed assertion subset is
`type` (object/string), `properties`, `required`, `additionalProperties: false`,
`const`, `anyOf`, `minLength`, `maxLength` and `pattern`, plus string annotations
`$schema`, `$id`, `title` and `description`. Unsupported assertions, references,
missing schema identity/path or nonconforming defaults fail closed. This uses no
external schema resolution or new runtime dependency. A full schema validator may
also validate the declared project namespace; the explicit rules above remain
part of both instruction operations.
