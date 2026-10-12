# Pull Request configuration v2

The selected package is pr-author@0.1.0, metadata_version 2. Its sole writable/readable schema is pr.record@1.0.0. Package/config/record versions are separate; there is no conversion or schema fallback.

The caller supplies absolute existing project_root/package_root and optional explicit project_config/local_config. Config filenames may be absolute or project-relative. Omitted config means defaults; an explicitly missing file fails. No upward/cwd search, environment interpolation, source policy or credential store is consulted. The running executable must belong to the selected package; all exact declared resources must exist.

Project JSON has exact integer config_version=2, optional skills and constraints, and no other root keys. Local JSON has config_version=2 and optional skills only; constraints are forbidden. Every namespace key matches `[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*` and every value is an object. Strict parsing rejects duplicate keys, invalid Unicode, non-finite numbers and boolean/float versions. Only `pr` settings/constraints are validated deeply; other valid object namespaces are inert and are never loaded, executed, merged into permission or reported as valid capabilities. Selected v1 config is unsupported. No config file is written by this tool.

| Setting | Default / behavior |
| --- | --- |
| store.kind | filesystem only |
| store.root | notes/pull-requests; relative to project root |
| store.tracking | tracked or ignored; default tracked; intent only |
| template | Atomic origin/path object; default package / templates/pr.md |

Precedence is invocation overrides > selected local > project > package defaults. Store leaves merge; template replaces atomically. Missing inherits; null, unknown selected fields, wrong types and partial template objects fail. Invocation overrides contain the selected settings object only.

Project constraints.pr-author permits write_roots (nonempty array) and locked_fields (array chosen from store.root,store.tracking,template). Default permission is the project/default store before overrides. Locks preserve that project-effective value; same-value override is harmless, differing override is blocked. Caller write_roots only narrows project bounds. No namespace grants permission to another. Config is not actual user/runtime authorization.

In a Git project the selected local config must already be ignored and untracked; Git is a conditional read-only dependency for proving this. No config means no ignore check. No ignore, stage or commit operation occurs. A project can select an ignored store but must establish its own tracking/durability policy.

## Paths and filesystem

Paths/config/template/schema bytes are frozen at operation start. Package resources stay in package; project templates stay inside project. Reject links/reparse points (even contained ones), traversal, drive-relative/device/UNC paths, ambiguous Windows names, volume-root stores and overlap with package/config/template files. Absolute external stores require explicit project write_roots plus caller permission; there is no storage discovery or fallback.

Only missing store parents inside all accepted bounds may be created. With defaults, provision the notes parent separately or explicitly grant its creation. Empty created directories are retained and reported on failure. Switching store bindings does not move records or change Git tracking. A retained logical reference needs its store binding separately.

Initial writes require Windows local fixed/RAM NTFS or Linux local ext2/ext3/ext4/xfs/btrfs/tmpfs/ramfs observed through mount information. Other backends/platforms are unsupported, not proven unsafe or automatically redirected. This is a source implementation limit, not tested platform certification. Network/shared filesystem semantics and power-loss durability are not promised.

Local writes use one cooperating store writer with a token lock, same-directory temporary file and exclusive create/atomic replace. Uncoordinated editors can race; expected digests are not filesystem CAS. Cleanup removes only the invocation's verified files; no automatic stale-lock recovery. No repository/provider transaction is implied.
