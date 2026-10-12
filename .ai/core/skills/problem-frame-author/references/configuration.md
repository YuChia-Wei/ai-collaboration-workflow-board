# Configuration and caller-selected storage

No configuration is needed for instruction drafting. Tools require absolute
project_root and package_root and accept optional explicitly selected JSON
project_config/local_config paths. Relative paths resolve against project_root;
config files are project-contained. No cwd/upward config search, environment
expansion, mandatory layout, automatic file creation or fallback exists.
Explicitly missing selected configuration is unavailable, not an empty default.

Project config is a closed object with exact integer `config_version: 2` and
optional skills/constraints objects. Local config permits only config_version
and skills. Their selected versions must both be 2; bool/float/string are not 2.
Namespace names match `[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*` and contain objects.
Foreign namespace values remain inert; only this package's settings/constraints
are deeply interpreted. Full input syntax/size limits still apply. No conversion.

`skills.problem-frame-author` and invocation `overrides` accept only store and
template. Precedence is invocation > local > project > package defaults. Merge
store leaves; replace the entire template object. Missing fields inherit, explicit
null does not. Defaults:

```json
{"store":{"kind":"filesystem","root":"specs/problem-frames","tracking":"tracked"},"template":{"origin":"package","path":"templates/cbf.md"}}
```

Store fields: kind is filesystem; root is a nonblank project-relative or explicit
absolute local path; tracking is tracked or ignored (intent only, no Git changes).
Template requires exactly origin and path; origin package selects the declared
`templates/cbf.md`, origin project selects a contained caller file.

Project-only `constraints.problem-frame-author` accepts:

- write_roots: nonempty unique path array. If omitted, authority is the
  project/default store selected BEFORE local/invocation overrides.
- locked_fields: unique values from store.root, store.tracking, template.
  Changing a locked project/default value blocks the operation.

Caller write_roots may narrow, never broaden or union project/default authority.
External absolute stores require explicit project write_roots plus actual task
write authority. A path setting is not authorization. Store/root changes select
another collection, never move or migrate prior files. Retain the effective store
binding alongside a logical record reference when handing it off.

All selected store and write-root directories and destination ancestors must
already exist; there is no mkdir, global TEMP change or drive scan. Flat references
are explicit `<id>.cbf.json` filenames. Store cannot overlap package, selected
config or template. Reject volume-root stores, parent/dot/empty segments,
drive-relative/root-relative/device/UNC paths, reserved Windows segment names,
trailing spaces/dots, symlinks/junctions/reparse points and case/segment aliases.
Use the existing exact path spelling; slash and native backslash spellings are
accepted. Inputs must be regular files, roots directories. No recursive source
search or follow-through of stored source/anchor references occurs.

A selected local config in a Git project must already be ignored and untracked.
The tool uses bounded read-only Git, clears ambient GIT variables and excludes
system/global Git config. Missing Git is unavailable; unproven ignored/untracked
status is blocked. It does not create ignore rules. Package and selected config,
request, schema and template bytes and ancestor identities are rechecked before
publication. Material input/path drift conflicts; select a fresh request only
after inspecting the actual destination.

Custom rendering uses only literal {{id}}, {{title}}, {{body}} placeholders,
requires body once and rejects unknown/malformed placeholders. It never evaluates
expressions. The generated body includes every source, statement, given/when,
assertion, anchor and question with Markdown/HTML escaping. Rendering returns
text, never exports. External authoring templates may have other structures;
read them as selected prose and report format omissions outside their content.

explain returns only own effective settings and origins, config_version 2, locks,
effective roots, exact family/version, prerequisites and deliberate
`runtime_capability: not-probed`, `tracking: intent-only`. It may list absent
store/template prerequisites without creating them. It cannot prove task write
authority, successful publication, source approval or target runtime behavior.
