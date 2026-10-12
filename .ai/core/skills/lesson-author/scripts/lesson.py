#!/usr/bin/env python3
"""Standalone project-owned knowledge filesystem operations. JSON request in, one JSON result out.

Public contract: ../references/operations.md. No source-repository imports.
"""

from __future__ import annotations

import argparse
import copy
import ctypes
import hashlib
import html
import importlib.metadata
import json
import math
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
from datetime import datetime, timezone
import uuid


OWNER = 'lesson-author'
# Package routing may change while existing project records and writer locks stay stable.
FAMILY = 'lesson'
VERSION = '0.2.0'
SCHEMA_VERSION = '2.0.0'
PREFIX = 'lesson'
INITIAL = 'candidate'
STATUSES = ('candidate', 'accepted', 'retired', 'superseded')
OPERATIONS = ('explain', 'create', 'inspect', 'query', 'validate', 'revise', 'render', 'derive', 'accept', 'retire', 'supersede')
AUTHORED = ('title', 'observation', 'evidence', 'conclusion', 'applies_when', 'does_not_apply_when', 'confidence', 'follow_up')
SCHEMAS = {'1.0.0': 'schemas/lesson-record.schema.json', '2.0.0': 'schemas/lesson-record-v2.schema.json'}
SEARCH_FIELDS = ('title', 'observation', 'conclusion')
LEGACY_VERSION = '1.0.0'
MUTABLE = ('content', 'successor', 'decision')
EXTRA_CONSTRAINTS = ('decision_sources',)
SCRIPT = 'scripts/lesson.py'
ROLE = FAMILY + ".record"
ID = re.compile(PREFIX + r"-[0-9a-f]{32}\Z")
SHA256 = re.compile(r"[0-9a-f]{64}\Z")
NAMESPACE = re.compile(r"[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*\Z")
TOKEN = re.compile(r"\{\{([a-z_]+)\}\}")
LIMIT = 4 * 1024 * 1024
MAX_FILES = 10000
REPARSE = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)


class Fault(Exception):
    def __init__(self, outcome, code, message):
        super().__init__(message)
        self.outcome, self.code, self.message = outcome, code, message

    def diagnostic(self):
        return {"code": self.code, "message": self.message}


def fail(code, message, outcome="invalid-input"):
    raise Fault(outcome, code, message)


def fields(value, required, optional=(), label="object"):
    if type(value) is not dict or not set(required) <= value.keys() or value.keys() - set(required) - set(optional):
        fail("fields", f"Invalid or unknown fields in {label}.")
    return value


def string(value, label):
    if type(value) is not str or not value or not value.strip():
        fail("type", f"{label} must be a nonempty string.")
    return value


def strings(value, label, nonempty=False):
    if type(value) is not list or (nonempty and not value):
        fail("type", f"{label} must be an array of strings.")
    for item in value:
        string(item, label)
    if len(set(value)) != len(value):
        fail("duplicate", f"{label} contains duplicates.")
    return value


def exact_equal(left, right):
    if type(left) is not type(right):
        return False
    if type(left) is dict:
        return left.keys() == right.keys() and all(exact_equal(left[k], right[k]) for k in left)
    if type(left) is list:
        return len(left) == len(right) and all(exact_equal(a, b) for a, b in zip(left, right))
    return left == right


def json_values(value):
    if type(value) is dict:
        for key, child in value.items():
            if type(key) is not str:
                fail("json-key", "JSON keys must be strings.")
            json_values(key)
            json_values(child)
    elif type(value) is list:
        for child in value:
            json_values(child)
    elif type(value) is str:
        try:
            value.encode("utf-8", errors="strict")
        except UnicodeError:
            fail("unicode", "Unpaired Unicode surrogates are unsupported.")
    elif type(value) is float:
        if not math.isfinite(value):
            fail("number", "Non-finite JSON numbers are invalid.")
    elif value is not None and type(value) not in (int, bool):
        fail("json-type", "Only JSON-compatible values are accepted.")


def unique_pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            fail("duplicate-key", "Duplicate object keys are invalid.")
        result[key] = value
    return result


def parse_json(raw):
    try:
        value = json.loads(raw.decode("utf-8", errors="strict"), object_pairs_hook=unique_pairs,
                           parse_constant=lambda _: fail("number", "Non-finite JSON numbers are invalid."))
        json_values(value)
        return value
    except (UnicodeError, ValueError, RecursionError):
        fail("json", "Expected bounded strict UTF-8 JSON without a BOM.")


def encode(value):
    return (json.dumps(value, ensure_ascii=False, allow_nan=False, sort_keys=True, indent=2) + "\n").encode("utf-8")


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def dependency(name, minimum, maximum):
    try:
        version = importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        fail("dependency", f"Required runtime {name} is missing.", "unavailable")
    if not re.fullmatch(r"\d+(?:\.\d+){1,3}", version):
        fail("dependency-version", f"Stable {name} runtime version required.", "unavailable")
    parts = tuple(int(p) for p in version.split("."))
    if not minimum <= parts < maximum:
        fail("dependency-version", f"Required {name} runtime range is unavailable.", "unavailable")


def parse_yaml(raw):
    dependency("PyYAML", (6, 0), (7, 0))
    try:
        import yaml
        text = raw.decode("utf-8", errors="strict")
        if text.startswith("\ufeff"):
            fail("yaml", "Metadata must be UTF-8 without a BOM.")
        for token in yaml.scan(text):
            if isinstance(token, (yaml.tokens.TagToken, yaml.tokens.AliasToken, yaml.tokens.AnchorToken)):
                fail("yaml-token", "YAML tags, aliases and anchors are forbidden.")
        node = yaml.compose(text, Loader=yaml.SafeLoader)

        def convert(item):
            if isinstance(item, yaml.MappingNode):
                pairs = []
                for key, child in item.value:
                    if key.tag != "tag:yaml.org,2002:str" or key.value == "<<":
                        fail("yaml-key", "YAML keys must be unique strings without merge keys.")
                    pairs.append((key.value, convert(child)))
                return unique_pairs(pairs)
            if isinstance(item, yaml.SequenceNode):
                return [convert(child) for child in item.value]
            if not isinstance(item, yaml.ScalarNode):
                fail("yaml", "Metadata must contain one JSON-compatible document.")
            kind = item.tag.removeprefix("tag:yaml.org,2002:")
            if kind == "str":
                return item.value
            if kind == "null" and item.value == "null":
                return None
            if kind == "bool" and item.value in ("true", "false"):
                return item.value == "true"
            if kind in ("int", "float") and re.fullmatch(r"-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?", item.value):
                return parse_json(item.value.encode("utf-8"))
            fail("yaml-type", "Metadata YAML must use JSON scalar types and spellings.")

        value = convert(node)
        json_values(value)
        return value
    except ImportError:
        fail("dependency", "PyYAML could not be imported.", "unavailable")
    except (UnicodeError, ValueError, RecursionError, yaml.YAMLError):
        fail("yaml", "Invalid bounded UTF-8 package metadata.")


def beneath(path, root):
    return path == root or root in path.parents


def overlap(left, right):
    return beneath(left, right) or beneath(right, left)


def safe_path(value, base=None, *, relative_only=False):
    string(value, "path")
    if any(ord(char) < 32 for char in value):
        fail("path", "Control characters in paths are forbidden.")
    path = Path(value)
    if relative_only and path.is_absolute():
        fail("path", "A package resource must be relative.")
    if ".." in path.parts or (path.drive and not path.is_absolute()):
        fail("path", "Parent traversal and drive-relative paths are forbidden.")
    if os.name == "nt":
        if value.startswith(("\\\\", "//")) or (path.root and not path.drive):
            fail("path", "UNC, device and root-relative paths are unsupported.", "unsupported")
        for part in path.parts[1:] if path.is_absolute() else path.parts:
            if part.endswith((" ", ".")) or re.search(r'[<>:"|?*\x00-\x1f]', part):
                fail("path", "Ambiguous Windows path segment.")
            if re.fullmatch(r"(?i:con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(?:\..*)?", part):
                fail("path", "Reserved Windows path segment.")
    if not path.is_absolute():
        if base is None:
            fail("path", "An explicit absolute root is required.")
        path = base / path
    # Refuse all links/reparse points, including contained ones; this avoids
    # mutable indirection in frozen bindings. Nonexistent tails remain lexical.
    for part in (*reversed(path.parents), path):
        try:
            info = part.lstat()
        except FileNotFoundError:
            continue
        if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & REPARSE:
            fail("path-link", "Symlinks and reparse points are unsupported in selected paths.", "blocked")
    resolved = path.resolve(strict=False)
    if base is not None and not Path(value).is_absolute() and not beneath(resolved, base):
        fail("path-escape", "A relative path escapes its explicit root.", "blocked")
    return resolved


def read_bytes(path, missing="invalid-input"):
    safe_path(str(path))
    try:
        if not stat.S_ISREG(path.lstat().st_mode):
            fail("file-type", "A selected input is not a regular file.")
        flags = os.O_RDONLY | getattr(os, "O_BINARY", 0) | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0)
        with os.fdopen(os.open(path, flags), "rb") as stream:
            info = os.fstat(stream.fileno())
            if not stat.S_ISREG(info.st_mode):
                fail("file-type", "A selected input is not a regular file.")
            raw = stream.read(LIMIT + 1)
            if len(raw) > LIMIT:
                fail("size-limit", "Selected file exceeds the 4 MiB limit.", "unsupported")
            if identity(path.lstat()) != identity(info):
                fail("input-drift", "Input identity changed during read.", "conflict")
            return raw
    except FileNotFoundError:
        fail("missing-file", "An explicitly selected file is missing.", missing)


def identity(info):
    return info.st_dev, info.st_ino


def resource(package, value):
    path = safe_path(value, package, relative_only=True)
    if not beneath(path, package) or not path.is_file():
        fail("resource", "Declared package resource is missing or outside the package.", "unsupported")
    return path


def settings(value, complete=False):
    fields(value, ("store", "template") if complete else (), () if complete else ("store", "template"), "selected skill settings")
    if "store" in value:
        store = fields(value["store"], ("kind", "root", "tracking") if complete else (),
                       () if complete else ("kind", "root", "tracking"), "store settings")
        if "kind" in store and store["kind"] != "filesystem":
            fail("store-kind", "Only a filesystem store is supported.", "unsupported")
        if "root" in store:
            string(store["root"], "store.root")
        if "tracking" in store and store["tracking"] not in ("tracked", "ignored"):
            fail("tracking", "store.tracking must be tracked or ignored.")
    if "template" in value:
        template = fields(value["template"], ("origin", "path"), label="template")
        if template["origin"] not in ("package", "project"):
            fail("template-origin", "Unsupported template origin.")
        string(template["path"], "template.path")
    return value


def git_local_ignored(project, local):
    # A project without a .git marker in its ancestry needs no Git executable.
    if not any((parent / ".git").exists() for parent in (project, *project.parents)):
        return
    env = {key: val for key, val in os.environ.items() if not key.startswith("GIT_")}
    env["GIT_TERMINAL_PROMPT"] = "0"
    env["GIT_OPTIONAL_LOCKS"] = "0"
    try:
        top = subprocess.run(["git", "-C", str(project), "rev-parse", "--show-toplevel"],
                             capture_output=True, timeout=10, env=env, check=False)
        if top.returncode:
            fail("local-ignore", "Cannot establish Git ownership of local config.", "blocked")
        git_root = safe_path(top.stdout.decode("utf-8").strip())
        if not beneath(local, git_root):
            fail("local-ignore", "Local config must be an ignored file in this Git project.", "blocked")
        ignored = subprocess.run(["git", "-C", str(git_root), "check-ignore", "-q", "--", str(local)],
                                 capture_output=True, timeout=10, env=env, check=False)
        if ignored.returncode != 0:
            fail("local-ignore", "Selected local config is not ignored or is tracked.", "blocked")
    except FileNotFoundError:
        fail("git", "Git is required to prove selected local config is ignored.", "unavailable")
    except (subprocess.TimeoutExpired, UnicodeError):
        fail("local-ignore", "Could not establish the selected local config's ignored state.", "blocked")


def merge_settings(target, layer, sources, source):
    if "store" in layer:
        for key, value in layer["store"].items():
            target["store"][key] = value
            sources["store." + key] = source
    if "template" in layer:
        target["template"] = copy.deepcopy(layer["template"])
        sources["template"] = source


def field_value(settings_value, field):
    return settings_value["template"] if field == "template" else settings_value["store"][field.split(".")[1]]


def _windows_handle_filesystem(directory, volume, kernel):
    """Error-144 fallback: observe this direct directory, never substitute a drive.

    The mount-path answer must be an ancestor on the same device. All ancestors
    and the opened directory retain their identities; no link/reparse traversal
    or short-name substitution is admitted. This is not a filesystem lease.
    """
    import ctypes
    import msvcrt
    from ctypes import wintypes as w

    def snapshot():
        rows = []
        for current in (directory, *directory.parents):
            info = current.lstat()
            if (not stat.S_ISDIR(info.st_mode) or stat.S_ISLNK(info.st_mode)
                    or getattr(info, "st_file_attributes", 0) & 0x400
                    or not info.st_dev or not info.st_ino):
                raise OSError("direct directory identity unavailable")
            rows.append((info.st_dev, info.st_ino))
        return rows

    if (not directory.is_absolute() or str(directory).startswith(("\\\\", "//"))
            or ".." in directory.parts or Path(volume) not in (directory, *directory.parents)):
        raise OSError("direct volume path unavailable")
    before = snapshot()
    if len({device for device, _ in before}) != 1:
        raise OSError("volume identity differs across ancestors")
    # A long-name query alone does not expand SUBST/DOS-device aliases.
    kernel.QueryDosDeviceW.argtypes = [w.LPCWSTR, w.LPWSTR, w.DWORD]
    kernel.QueryDosDeviceW.restype = w.DWORD
    device = ctypes.create_unicode_buffer(32768)
    length = kernel.QueryDosDeviceW(directory.drive, device, len(device))
    if not 0 < length < len(device) or re.fullmatch(r"\\Device\\[^\\]+", device.value) is None:
        raise OSError("direct drive mapping unavailable")
    kernel.GetLongPathNameW.argtypes = [w.LPCWSTR, w.LPWSTR, w.DWORD]
    kernel.GetLongPathNameW.restype = w.DWORD
    canonical = ctypes.create_unicode_buffer(32768)
    length = kernel.GetLongPathNameW(str(directory), canonical, len(canonical))
    if not 0 < length < len(canonical) or Path(canonical.value) != directory:
        raise OSError("canonical directory identity unavailable")
    kernel.CreateFileW.argtypes = [w.LPCWSTR, w.DWORD, w.DWORD, ctypes.c_void_p, w.DWORD, w.DWORD, w.HANDLE]
    kernel.CreateFileW.restype = w.HANDLE
    kernel.CloseHandle.argtypes = [w.HANDLE]
    kernel.CloseHandle.restype = w.BOOL
    kernel.GetVolumeInformationByHandleW.argtypes = [w.HANDLE, w.LPWSTR, w.DWORD, ctypes.POINTER(w.DWORD),
                                                    ctypes.c_void_p, ctypes.c_void_p, w.LPWSTR, w.DWORD]
    kernel.GetVolumeInformationByHandleW.restype = w.BOOL
    # Metadata-only OPEN_EXISTING, BACKUP_SEMANTICS | OPEN_REPARSE_POINT.
    handle = kernel.CreateFileW(str(directory), 0, 7, None, 3, 0x02200000, None)
    if handle in (None, ctypes.c_void_p(-1).value):
        raise OSError("directory handle unavailable")
    try:
        descriptor = msvcrt.open_osfhandle(handle, os.O_RDONLY)
    except BaseException:
        kernel.CloseHandle(handle)
        raise
    try:
        info = os.fstat(descriptor)
        if ((info.st_dev, info.st_ino) != before[0] or not stat.S_ISDIR(info.st_mode)
                or getattr(info, "st_file_attributes", 0) & 0x400):
            raise OSError("opened directory identity differs")
        filesystem, serial = ctypes.create_unicode_buffer(64), w.DWORD()
        if not kernel.GetVolumeInformationByHandleW(handle, None, 0, ctypes.byref(serial), None, None,
                                                   filesystem, len(filesystem)):
            raise OSError("handle filesystem observation failed")
        if serial.value != (info.st_dev & 0xffffffff) or snapshot() != before:
            raise OSError("directory volume identity changed")
        return filesystem.value
    finally:
        os.close(descriptor)


def local_write_backend(store):
    ancestor = store
    while not ancestor.exists():
        ancestor = ancestor.parent
    if os.name == "nt":
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        root = ctypes.create_unicode_buffer(32768)
        kernel.GetVolumePathNameW.argtypes = [ctypes.c_wchar_p, ctypes.c_wchar_p, ctypes.c_uint32]
        kernel.GetVolumePathNameW.restype = ctypes.c_int
        if not kernel.GetVolumePathNameW(str(ancestor), root, len(root)):
            fail("filesystem", "Cannot identify the local write volume.", "unsupported")
        kernel.GetDriveTypeW.argtypes = [ctypes.c_wchar_p]
        kernel.GetDriveTypeW.restype = ctypes.c_uint32
        if kernel.GetDriveTypeW(root.value) not in (3, 6):
            fail("filesystem", "Only local fixed or RAM volumes are supported for writes.", "unsupported")
        filesystem = ctypes.create_unicode_buffer(64)
        kernel.GetVolumeInformationW.argtypes = [ctypes.c_wchar_p, ctypes.c_wchar_p, ctypes.c_uint32,
                                               ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p,
                                               ctypes.c_wchar_p, ctypes.c_uint32]
        kernel.GetVolumeInformationW.restype = ctypes.c_int
        if not kernel.GetVolumeInformationW(root.value, None, 0, None, None, None, filesystem, len(filesystem)):
            if ctypes.get_last_error() != 144:  # ERROR_DIR_NOT_ROOT only
                fail("filesystem", "Cannot observe the local write filesystem.", "unsupported")
            try:
                filesystem.value = _windows_handle_filesystem(ancestor, root.value, kernel)
            except OSError:
                fail("filesystem", "Cannot verify the direct write volume.", "unsupported")
        if filesystem.value != "NTFS":
            fail("filesystem", "Initial Windows writes require local NTFS.", "unsupported")
        return "local-ntfs"
    if sys.platform.startswith("linux"):
        try:
            mounts = Path("/proc/self/mountinfo").read_text(encoding="utf-8").splitlines()
            candidates = []
            for line in mounts:
                left, right = line.split(" - ", 1)
                mount_path = re.sub(r"\\([0-7]{3})", lambda match: chr(int(match[1], 8)), left.split()[4])
                if beneath(ancestor, Path(mount_path)):
                    candidates.append((len(Path(mount_path).parts), right.split()[0]))
            filesystem = max(candidates)[1] if candidates else ""
        except (OSError, ValueError, IndexError):
            fail("filesystem", "Cannot identify the local write mount.", "unsupported")
        if filesystem not in {"ext2", "ext3", "ext4", "xfs", "btrfs", "tmpfs", "ramfs"}:
            fail("filesystem", "Unproven, shared or network write backend is unsupported.", "unsupported")
        return "local-" + filesystem
    fail("filesystem", "Write publication semantics are unsupported on this platform.", "unsupported")


class Writer:
    """Own only an exclusive token lock and temp inode; never recover others."""
    def __init__(self, binding):
        self.binding = binding
        self.token = uuid.uuid4().hex
        self.lock = binding.store / ("." + FAMILY + "-write.lock")
        self.temp = binding.store / ("." + FAMILY + "-" + self.token + ".tmp")
        self.owned = {}
        self.mutation_state = "none"
        self.directories_created = []

    def exclusive(self, path, raw):
        self.binding.check_paths()
        safe_path(str(path))
        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_BINARY", 0) | getattr(os, "O_NOFOLLOW", 0)
        fd = os.open(path, flags, 0o600)
        # Register ownership before I/O so partial-write failures can be cleaned.
        self.owned[path] = (identity(os.fstat(fd)), raw, False)
        with os.fdopen(fd, "wb") as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        self.owned[path] = (self.owned[path][0], raw, True)

    def acquire(self, allow_create):
        self.binding.check_paths()
        local_write_backend(self.binding.store)
        if not self.binding.store.exists() and not allow_create:
            fail("missing-store", "This update requires an existing record store.")
        missing = []
        cursor = self.binding.store
        while not cursor.exists():
            missing.append(cursor)
            cursor = cursor.parent
        for path in reversed(missing):
            self.binding.check_paths()
            if not any(beneath(path, root) for root in self.binding.allowed):
                fail("parent-permission", "Missing store parent is outside project write_roots; provision it separately.", "blocked")
            if self.binding.caller_allowed is not None and not any(beneath(path, root) for root in self.binding.caller_allowed):
                fail("parent-permission", "Missing store parent is outside caller write_roots.", "blocked")
            try:
                path.mkdir()
                self.directories_created.append(str(path))
            except FileExistsError:
                if not path.is_dir():
                    raise
        self.binding.store_identity = identity(self.binding.store.stat())
        try:
            self.exclusive(self.lock, (self.token + "\n").encode("ascii"))
        except FileExistsError:
            fail("writer-lock", "Store has an existing writer lock; no stale-lock recovery attempted.", "conflict")
        self.binding.check_paths()

    def publish(self, path, raw, replacing):
        if len(raw) > LIMIT:
            fail("size-limit", "Serialized record exceeds the 4 MiB limit.", "unsupported")
        self.exclusive(self.temp, raw)
        self.binding.check_paths()
        safe_path(str(path))
        self.mutation_state = "unknown"
        try:
            if replacing:
                os.replace(self.temp, path)
                del self.owned[self.temp]
            else:
                os.link(self.temp, path)  # Atomic complete-file, exclusive publish.
        except FileExistsError:
            self.mutation_state = "none"
            fail("record-collision", "Create identity already exists; no overwrite.", "conflict")
        if read_bytes(path) != raw:
            self.mutation_state = "unknown"
            fail("publication-readback", "Published bytes could not be confirmed; reread before retry.", "failed")
        self.mutation_state = "committed"

    def cleanup(self):
        failures = []
        for path in (self.temp, self.lock):
            if path not in self.owned:
                continue
            expected_identity, raw, complete = self.owned[path]
            try:
                self.binding.check_paths()
                safe_path(str(path))
                info = path.lstat()
                if identity(info) != expected_identity or not stat.S_ISREG(info.st_mode):
                    fail("cleanup-identity", "Owned transient file identity changed.", "failed")
                actual = read_bytes(path)
                # A partial lock is not a matching-token lock: preserve it for
                # explicit recovery. Temp partial bytes remain ours by inode.
                if (path == self.lock or complete) and actual != raw:
                    fail("cleanup-content", "Owned transient content changed; preserved.", "failed")
                path.unlink()
            except Exception:
                failures.append({"code": "cleanup-failed", "resource": "lock" if path == self.lock else "temporary-file",
                                 "message": "Owned transient cleanup failed; inspect before retry."})
        return failures




def timestamp(value):
    string(value, "timestamp")
    try:
        parsed = datetime.fromisoformat(value.upper().replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            raise ValueError()
        return parsed
    except ValueError:
        fail("timestamp", "Expected a timezone-aware ISO 8601 timestamp.")


def now_text():
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


def expected_digest(value):
    if type(value) is not str or not SHA256.fullmatch(value):
        fail("expected-digest", "Expected an actual lowercase raw-byte SHA-256.")
    return value


def load_package(binding):
    metadata = parse_yaml(binding.read_input(binding.package / "skill-package.yaml"))
    fields(metadata, ("metadata_version", "id", "version", "delivery_status", "entrypoint",
                      "dependencies", "runtime", "configuration", "artifact_roles", "resources", "operations"))
    if type(metadata["metadata_version"]) is not int or metadata["metadata_version"] != 2:
        fail("metadata-version", "This tool requires metadata version 2.", "unsupported")
    if (metadata["id"], metadata["version"], metadata["delivery_status"], metadata["entrypoint"]) != (OWNER, VERSION, "implemented", "SKILL.md"):
        fail("package-identity", "Unsupported package identity or delivery state.", "unsupported")
    if not exact_equal(metadata["dependencies"], {"required": [], "optional": []}):
        fail("dependency-closure", "This package has no skill dependencies.", "unsupported")
    config_meta = fields(metadata["configuration"], ("namespace", "defaults"))
    if config_meta["namespace"] != OWNER:
        fail("namespace", "Configuration namespace must match the package.")
    settings(config_meta["defaults"], complete=True)
    resources = fields(metadata["resources"], ("references", "schemas", "templates", "tools"))
    paths = ["SKILL.md", "skill-package.yaml"] + strings(resources["references"], "references", True)
    pairs = set()
    if type(resources["schemas"]) is not list:
        fail("schemas", "Schema resources must be an array.")
    for row in resources["schemas"]:
        fields(row, ("id", "version", "path", "owner", "migration"))
        pair = (string(row["id"], "schema id"), string(row["version"], "schema version"))
        if pair in pairs or row["id"] != ROLE or row["version"] not in SCHEMAS or row["path"] != SCHEMAS[row["version"]] or row["owner"] != OWNER:
            fail("schemas", "Unsupported or duplicate schema identity.", "unsupported")
        pairs.add(pair)
        string(row["migration"], "migration disposition")
        paths.append(row["path"])
    if pairs != {(ROLE, version) for version in SCHEMAS}:
        fail("schemas", "Missing exact readable schema resource.", "unsupported")
    for key in ("templates", "tools"):
        if type(resources[key]) is not list or len(resources[key]) != 1:
            fail("resource-count", "Exactly one owned template and tool are required.")
    template = fields(resources["templates"][0], ("id", "path", "input_role", "output_role", "owner"))
    tool = fields(resources["tools"][0], ("id", "owner", "implementation_status", "entrypoint", "operation_contract", "operations"))
    if (template["id"], template["input_role"], template["output_role"], template["owner"]) != (OWNER + ".default-view", ROLE, FAMILY + ".view", OWNER):
        fail("template", "Unsupported template declaration.")
    if (tool["id"], tool["owner"], tool["implementation_status"], tool["entrypoint"]) != (OWNER + ".fs", OWNER, "implemented", SCRIPT) or tool["operations"] != list(OPERATIONS):
        fail("tool", "Unsupported public tool declaration.")
    if tool["operation_contract"] not in resources["references"]:
        fail("tool-contract", "Public operation contract must be declared.")
    paths.extend((template["path"], tool["entrypoint"]))
    if config_meta["defaults"]["template"] != {"origin": "package", "path": template["path"]}:
        fail("template-default", "Default template must name the declared package template.")
    if len(paths) != len({string(path, "resource path").casefold() for path in paths}):
        fail("resource-path", "Duplicate or case-aliased resource paths.")
    for path in paths:
        binding.read_input(resource(binding.package, path))
    if resource(binding.package, SCRIPT) != Path(__file__).resolve():
        fail("package-binding", "This executable does not belong to the selected package.", "blocked")
    roles = metadata["artifact_roles"]
    if type(roles) is not list or len(roles) != 2:
        fail("roles", "Exactly the owned record/view roles are required.")
    by_role = {}
    for row in roles:
        if type(row) is not dict or type(row.get("role")) is not str or row["role"] in by_role:
            fail("roles", "Duplicate or invalid role.")
        by_role[row["role"]] = row
    if set(by_role) != {ROLE, FAMILY + ".view"}:
        fail("roles", "Unsupported role identity.")
    record = fields(by_role[ROLE], ("role", "owner", "schema", "read_schemas", "store_binding", "identity", "filename", "read_operations", "write_operations"))
    reads = strings(record["read_schemas"], "read_schemas", True)
    if set(reads) != {ROLE + "@" + version for version in SCHEMAS} or record["schema"] != ROLE + "@" + SCHEMA_VERSION:
        fail("role-schema", "Exact readable/writable schema identities are required.")
    if (record["owner"], record["store_binding"], record["identity"], record["filename"]) != ("project", OWNER + ".store", PREFIX + "-<32 lowercase hex digits>", "<id>." + PREFIX + ".json"):
        fail("record-role", "Unsupported record ownership or storage identity.")
    if record["read_operations"] != ["inspect", "query", "validate", "render"] or set(strings(record["write_operations"], "write operations", True)) != set(WRITE_FIELDS):
        fail("role-operations", "Record role operation mismatch.")
    view = fields(by_role[FAMILY + ".view"], ("role", "owner", "source_role", "output", "persistence", "produce_operations"))
    if (view["owner"], view["source_role"], view["produce_operations"]) != ("derived", ROLE, ["render"]):
        fail("view", "Unsupported derived role.")
    string(view["output"], "view output")
    string(view["persistence"], "view persistence")
    operation_ids = []
    if type(metadata["operations"]) is not list:
        fail("operations", "Expected operation declarations.")
    for row in metadata["operations"]:
        fields(row, ("id", "inputs", "outputs", "tool", "implementation_status"))
        operation_ids.append(row["id"])
        strings(row["inputs"], "inputs", True)
        strings(row["outputs"], "outputs", True)
        if row["tool"] != OWNER + ".fs" or row["implementation_status"] != "implemented":
            fail("operations", "Unsupported tool mapping.")
    if operation_ids != list(OPERATIONS):
        fail("operations", "Public operation declarations do not match implementation.")
    runtime_ids = []
    if type(metadata["runtime"]) is not list:
        fail("runtime", "Expected runtime declarations.")
    for row in metadata["runtime"]:
        fields(row, ("id", "for_operations", "on_missing"), ("version", "requirement", "purpose"))
        runtime_ids.append(string(row["id"], "runtime id"))
        if ("version" in row) == ("requirement" in row) or row["on_missing"] != "unavailable":
            fail("runtime", "Runtime requires exactly one version/requirement and unavailable behavior.")
        for key in ("version", "requirement", "purpose"):
            if key in row:
                string(row[key], key)
        if not set(strings(row["for_operations"], "runtime operations", True)) <= set(OPERATIONS):
            fail("runtime", "Unknown runtime operation.")
        version = {"python": ">=3.11,<4", "pyyaml": ">=6,<7", "jsonschema": ">=4.18,<5"}.get(row["id"])
        if version is not None and row.get("version") != version:
            fail("runtime-version", "Unsupported runtime requirement.")
    if sorted(runtime_ids) != sorted(("skill-instruction-reader", "python", "pyyaml", "jsonschema", "filesystem")):
        fail("runtime", "Unknown, duplicate or missing runtime.")
    return metadata


def config(binding, path, local=False):
    value = parse_json(binding.read_input(path))
    fields(value, ("config_version",), ("skills",) if local else ("skills", "constraints"), "config")
    version = value["config_version"]
    if type(version) is not int or version not in ((1, 2) if FAMILY == "lesson" else (2,)):
        fail("config-version", "Unsupported exact integer config version.", "unsupported")
    skills, constraints = value.get("skills", {}), value.get("constraints", {})
    ignored = set()
    for namespace_map in (skills, constraints):
        if type(namespace_map) is not dict:
            fail("namespace-envelope", "Namespace maps must be objects.")
        for key, child in namespace_map.items():
            if not NAMESPACE.fullmatch(key) or type(child) is not dict or (version == 1 and key != OWNER):
                fail("namespace-envelope", "Invalid or unsupported namespace envelope.")
            if key != OWNER:
                ignored.add(key)
    selected = settings(skills.get(OWNER, {}))
    rules = constraints.get(OWNER, {})
    fields(rules, (), ("write_roots", "locked_fields", *(EXTRA_CONSTRAINTS if version == 2 else ())), "selected constraints")
    if "write_roots" in rules:
        strings(rules["write_roots"], "write_roots", True)
    locks = strings(rules.get("locked_fields", []), "locked_fields")
    if not set(locks) <= {"store.root", "store.tracking", "template"}:
        fail("locked-fields", "Unknown locked field.")
    return selected, rules, version, ignored


def expand_schema(schema):
    # Remove all reference edges before handing data to jsonschema. No retriever
    # can follow remote/file references. Reject cycles and bound total expansion.
    budget = [100000]
    def expand(value, stack=(), depth=0):
        budget[0] -= 1
        if budget[0] < 0 or depth > 100:
            fail("schema-limit", "Owned schema expansion exceeded its bound.", "unsupported")
        if type(value) is list:
            return [expand(child, stack, depth + 1) for child in value]
        if type(value) is not dict:
            return value
        if any(key in value for key in ("$dynamicRef", "$recursiveRef", "$id")):
            fail("schema-ref", "Dynamic/base schema references are unsupported.", "unsupported")
        if "$ref" in value:
            target = value["$ref"]
            if len(value) != 1 or type(target) is not str or not re.fullmatch(r"#/\$defs/[A-Za-z0-9_-]+", target) or target in stack:
                fail("schema-ref", "Only acyclic single local definition references are supported.", "unsupported")
            name = target.split("/")[-1]
            if name not in schema.get("$defs", {}):
                fail("schema-ref", "Missing owned schema definition.")
            return expand(schema["$defs"][name], (*stack, target), depth + 1)
        return {key: expand(child, stack, depth + 1) for key, child in value.items()}
    return expand(schema)


class Binding:
    def __init__(self, request):
        self.inputs, self.absent = {}, set()
        self.project = safe_path(request["project_root"])
        self.package = safe_path(request["package_root"])
        if not self.project.is_dir() or not self.package.is_dir():
            fail("root", "Explicit project and package roots must exist.")
        self.metadata = load_package(self)
        self.settings = copy.deepcopy(self.metadata["configuration"]["defaults"])
        self.sources = {key: "default" for key in ("store.kind", "store.root", "store.tracking", "template")}
        self.config_paths, self.versions, self.ignored = [], [], set()
        self.project_config = None
        project_layer, self.rules = {}, {}
        if "project_config" in request:
            self.project_config = safe_path(request["project_config"], self.project)
            self.config_paths.append(self.project_config)
            project_layer, self.rules, version, ignored = config(self, self.project_config)
            self.versions.append(version)
            self.ignored |= ignored
        merge_settings(self.settings, project_layer, self.sources, "project")
        self.project_settings = copy.deepcopy(self.settings)
        self.locks = self.rules.get("locked_fields", [])
        self.allowed = [safe_path(value, self.project) for value in self.rules.get("write_roots", [self.settings["store"]["root"]])]
        self.explicit_roots = "write_roots" in self.rules
        self.caller_allowed = None
        if "write_roots" in request:
            self.caller_allowed = [safe_path(value, self.project) for value in strings(request["write_roots"], "caller write_roots", True)]
        layers = []
        if "local_config" in request:
            path = safe_path(request["local_config"], self.project)
            self.config_paths.append(path)
            git_local_ignored(self.project, path)
            values, _, version, ignored = config(self, path, local=True)
            layers.append(("local", values))
            self.versions.append(version)
            self.ignored |= ignored
        if len(set(self.versions)) > 1:
            fail("config-version", "Selected project/local config versions must match.")
        if "overrides" in request:
            layers.append(("invocation", settings(request["overrides"])))
        for source, layer in layers:
            merge_settings(self.settings, layer, self.sources, source)
            if any(not exact_equal(field_value(self.settings, key), field_value(self.project_settings, key)) for key in self.locks):
                fail("locked-field", "Override changes a project-locked setting.", "blocked")
        self.store = safe_path(self.settings["store"]["root"], self.project)
        self.store_identity = identity(self.store.stat()) if self.store.exists() else None
        template = self.settings["template"]
        template_root = self.package if template["origin"] == "package" else self.project
        self.template_path = safe_path(template["path"], template_root)
        if not beneath(self.template_path, template_root):
            fail("template-boundary", "Template escapes its declared root.", "blocked")
        if template["origin"] == "package" and self.template_path != resource(self.package, self.metadata["resources"]["templates"][0]["path"]):
            fail("template-resource", "Package template is undeclared.")
        self.check_paths()
        try:
            self.template = self.read_input(self.template_path).decode("utf-8", errors="strict")
        except UnicodeError:
            fail("template-encoding", "Template must be strict UTF-8.")
        validate_constraints(self)
        self.validators = {}
        if request["operation"] != "explain":
            dependency("jsonschema", (4, 18), (5, 0))
            try:
                from jsonschema import Draft202012Validator, FormatChecker
                for version, path in SCHEMAS.items():
                    schema = parse_json(self.read_input(resource(self.package, path)))
                    if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
                        fail("schema", "Owned schema must declare Draft 2020-12.")
                    expanded = expand_schema(schema)
                    Draft202012Validator.check_schema(expanded)
                    self.validators[version] = Draft202012Validator(expanded, format_checker=FormatChecker())
            except ImportError:
                fail("dependency", "jsonschema could not be imported.", "unavailable")
            except Fault:
                raise
            except Exception:
                fail("schema", "Invalid bounded owned schema.")

    def read_input(self, path):
        raw = read_bytes(path)
        sha = digest(raw)
        if path in self.absent or (path in self.inputs and self.inputs[path] != sha):
            fail("input-drift", "A selected input changed during this invocation.", "conflict")
        self.inputs[path] = sha
        return raw

    def check_inputs(self):
        for path, expected in self.inputs.items():
            if digest(read_bytes(path)) != expected:
                fail("input-drift", "Frozen input bytes changed before publication.", "conflict")
        for path in self.absent:
            safe_path(str(path))
            if path.exists():
                fail("input-drift", "A previously absent selected input appeared.", "conflict")

    def check_paths(self):
        for path in (self.project, self.package, self.store, self.template_path, *self.config_paths, *self.allowed, *(self.caller_allowed or [])):
            if safe_path(str(path)) != path:
                fail("binding-drift", "Frozen path binding changed.", "conflict")
        if self.store == Path(self.store.anchor):
            fail("store-root", "Volume-root stores are forbidden.", "blocked")
        if self.store.exists() and not self.store.is_dir():
            fail("store-type", "Store must be a directory.")
        if self.store_identity is not None and (not self.store.exists() or identity(self.store.stat()) != self.store_identity):
            fail("store-drift", "Frozen store identity changed.", "conflict")
        if not any(beneath(self.store, path) for path in self.allowed):
            fail("write-boundary", "Selected store exceeds project write roots.", "blocked")
        if self.caller_allowed is not None and not any(beneath(self.store, path) for path in self.caller_allowed):
            fail("caller-boundary", "Selected store exceeds caller write roots.", "blocked")
        if not beneath(self.store, self.project) and not self.explicit_roots:
            fail("external-store", "An external store needs explicit project write_roots.", "blocked")
        if any(overlap(self.store, protected) for protected in (self.package, self.template_path, *self.config_paths)):
            fail("overlap", "Store overlaps package/config/template content.", "blocked")

    def record_path(self, reference):
        fields(reference, ("role", "id"), label="reference")
        if reference["role"] != ROLE or type(reference["id"]) is not str or not ID.fullmatch(reference["id"]):
            fail("reference", "Invalid store-scoped record reference.")
        return safe_path(reference["id"] + "." + PREFIX + ".json", self.store, relative_only=True)

    def explain(self):
        return {"namespace": OWNER, "config_version": self.versions[0] if self.versions else None,
                "settings": self.settings, "sources": self.sources, "ignored_namespaces": sorted(self.ignored),
                "store_root": str(self.store), "template_path": str(self.template_path),
                "locked_fields": self.locks, "write_roots": [str(p) for p in self.allowed],
                "caller_write_roots": None if self.caller_allowed is None else [str(p) for p in self.caller_allowed],
                "authority_bindings": authority_summary(self), "runtime_capability": "not-probed",
                "tracking": "intent-only", "unsupported_reasons": []}


def evidence_path(binding, value, root):
    path = safe_path(value, binding.project)
    if not beneath(path, root) or any(overlap(path, protected) for protected in (binding.store, binding.package, binding.template_path, *binding.config_paths)):
        fail("evidence-boundary", "Evidence escapes its configured read scope or overlaps protected content.", "blocked")
    return path


def read_snapshot(binding, path, expected=None):
    raw = binding.read_input(path)
    if expected is not None and digest(raw) != expected_digest(expected):
        fail("evidence-drift", "Selected evidence differs from expected raw bytes.", "conflict")
    try:
        text = raw.decode("utf-8", errors="strict")
        text.encode("utf-8", errors="strict")
    except UnicodeError:
        fail("evidence-encoding", "Evidence must be strict UTF-8.")
    return {"path": str(path), "sha256": digest(raw), "utf8": text, "observed_at": now_text()}


def binding_snapshot(binding, binding_id, value):
    if binding.project_config is None:
        fail("authority", "Project-owned authority configuration is required.", "blocked")
    return {"binding_id": binding_id, "config_path": str(binding.project_config),
            "config_sha256": binding.inputs[binding.project_config], "binding": copy.deepcopy(value)}


def pointers(value, names):
    fields(value, names, label="evidence pointers")
    seen = set()
    for pointer in value.values():
        if type(pointer) is not str or not pointer.startswith("/") or re.search(r"~(?![01])", pointer):
            fail("pointer", "Expected a non-root literal JSON Pointer.")
        parts = tuple(part.replace("~1", "/").replace("~0", "~") for part in pointer[1:].split("/"))
        if parts in seen:
            fail("pointer-alias", "Mapped fields require distinct pointer targets.")
        seen.add(parts)


def mapped_json(snapshot, mapping):
    value = parse_json(snapshot["utf8"].encode("utf-8"))
    result = {}
    for name, pointer in mapping.items():
        item = value
        for part in pointer[1:].split("/"):
            part = part.replace("~1", "/").replace("~0", "~")
            if type(item) is dict and part in item:
                item = item[part]
            elif type(item) is list and re.fullmatch(r"0|[1-9][0-9]*", part) and int(part) < len(item):
                item = item[int(part)]
            else:
                fail("evidence-pointer", "Mapped evidence field cannot be resolved.")
        if type(item) in (dict, list):
            fail("evidence-type", "Mapped evidence fields must be scalar values.")
        result[name] = item
    return result



DECISION_POINTERS = ("subject_sha256", "actor", "decision", "decided_at")
DECISIONS = ("accept",)
DECIDED_STATUSES = ("accepted",)
TRANSITIONS = {"revise": {"candidate": ("candidate",)}, "accept": {"candidate": ("accepted",)},
               "retire": {"candidate": ("retired",), "accepted": ("retired",)},
               "supersede": {"candidate": ("superseded",), "accepted": ("superseded",)}}
WRITE_FIELDS = {"create": ("content", "text", "decision"), "derive": ("reference", "expected_sha256", "reason", "text", "decision"),
                "revise": ("reference", "expected_sha256", "content", "reason"),
                "accept": ("reference", "expected_sha256", "reason", "decision_source"),
                "retire": ("reference", "expected_sha256", "reason"),
                "supersede": ("reference", "expected_sha256", "reason", "successor")}
SUCCESSOR_STATUS = "accepted"


def check_option(content, decision, option):
    if option is not None:
        fail("decision-option", "Lesson acceptance has no ADR option.")


def content_semantics(content):
    for key in ("title", "observation", "conclusion"):
        string(content[key], key)
    for key in ("applies_when", "does_not_apply_when", "follow_up"):
        text_array(content[key], key, key == "applies_when")
    evidence_semantics(content["evidence"])
    if content["confidence"] not in ("tentative", "supported") or (not content["evidence"] and content["confidence"] != "tentative"):
        fail("confidence", "Empty evidence requires tentative confidence; supported remains an authored claim.")


def legacy_semantics(record):
    if record["status"] != "candidate":
        fail("legacy-state", "Legacy Lesson status remains candidate.")
    content_semantics(record)



def validate_constraints(binding):
    binding.decisions = {}
    roots = set()
    rows = binding.rules.get("decision_sources", [])
    if type(rows) is not list:
        fail("decision-sources", "Decision sources must be an array.")
    for row in rows:
        fields(row, ("id", "root", "allowed_actors", "pointers"))
        name = string(row["id"], "decision source id")
        if name in binding.decisions:
            fail("decision-sources", "Duplicate decision source ID.")
        root = safe_path(row["root"], binding.project)
        if root == Path(root.anchor) or any(overlap(root, protected) for protected in (binding.store, binding.package, binding.template_path, *binding.config_paths)):
            fail("decision-root", "Authority read root overlaps protected content.", "blocked")
        if root in roots:
            fail("decision-root-alias", "Decision source roots contain a canonical path alias.")
        roots.add(root)
        strings(row["allowed_actors"], "allowed actors", True)
        pointers(row["pointers"], DECISION_POINTERS)
        binding.decisions[name] = (row, root)


def authority_summary(binding):
    return sorted(binding.decisions)


def read_decision(binding, current, raw, selection):
    fields(selection, ("binding_id", "path", "expected_sha256"))
    name = string(selection["binding_id"], "decision binding")
    if name not in binding.decisions:
        fail("decision-authority", "No selected project decision source is configured.", "blocked")
    row, root = binding.decisions[name]
    snapshot = read_snapshot(binding, evidence_path(binding, selection["path"], root), selection["expected_sha256"])
    values = mapped_json(snapshot, row["pointers"])
    if values["subject_sha256"] != digest(raw) or values["actor"] not in row["allowed_actors"]:
        fail("decision-subject", "Owner decision does not bind this exact subject and allowed actor.", "blocked")
    if values["decision"] not in DECISIONS:
        fail("decision-value", "Unsupported owner decision.", "blocked")
    if not timestamp(current["created_at"]) <= timestamp(values["decided_at"]) <= timestamp(snapshot["observed_at"]):
        fail("decision-time", "Decision time is outside this subject's observation interval.", "blocked")
    option = values.get("option_id")
    check_option(current["content"], values["decision"], option)
    return {"actor": values["actor"], "decision": values["decision"],
            "decided_at": values["decided_at"], "subject_sha256": values["subject_sha256"],
            "option_id": option, "evidence": snapshot,
            "authority_binding": binding_snapshot(binding, name, row)}


def authored_content(binding, value, current=None):
    fields(value, AUTHORED, label="authored content")
    return copy.deepcopy(value)


def state_semantics(state, status):
    content_semantics(state["content"])
    decision = state["decision"]
    if status == INITIAL and decision is not None:
        fail("decision-state", "Initial records cannot claim an owner decision.")
    if status in DECIDED_STATUSES and decision is None:
        fail("decision-state", "Decided records require captured owner evidence.")
    if decision is not None:
        if decision["decision"] not in DECISIONS:
            fail("decision-value", "Unsupported stored decision.")
        check_option(state["content"], decision["decision"], decision["option_id"])
        if status == "accepted" and decision["decision"] != "accept":
            fail("decision-state", "Accepted state requires an accept decision.")
        if status == "rejected" and decision["decision"] != "reject":
            fail("decision-state", "Rejected state requires a reject decision.")
        authority = decision["authority_binding"]["binding"]
        fields(authority, ("id", "root", "allowed_actors", "pointers"))
        if decision["authority_binding"]["binding_id"] != string(authority["id"], "captured binding id"):
            fail("decision-binding", "Decision binding ID differs from its captured configuration.")
        pointers(authority["pointers"], DECISION_POINTERS)
        mapped = mapped_json(decision["evidence"], authority["pointers"])
        if any(not exact_equal(mapped[key], decision[key]) for key in DECISION_POINTERS):
            fail("decision-evidence", "Stored decision differs from its exact source snapshot.")
        if decision["actor"] not in strings(authority["allowed_actors"], "allowed actors", True):
            fail("decision-authority", "Stored decision actor is outside the captured binding.")
        if timestamp(decision["decided_at"]) > timestamp(decision["evidence"]["observed_at"]):
            fail("decision-time", "Decision evidence predates the declared decision.")
    if (status == "superseded") != (state["successor"] is not None):
        fail("successor-state", "Only a superseded record has a successor.")


def transition(binding, record, original, request):
    operation = request["operation"]
    if operation in ("accept", "decide"):
        record["decision"] = read_decision(binding, record, original, request["decision_source"])
        record["status"] = "accepted" if record["decision"]["decision"] == "accept" else "rejected"
    elif operation == "retire":
        record["status"] = "retired"
    elif operation == "supersede":
        record["successor"] = select_successor(binding, record, request["successor"])
        record["status"] = "superseded"



def text_array(value, label, nonempty=False):
    if type(value) is not list or (nonempty and not value):
        fail("array", "Expected an ordered text array for " + label + ".")
    for item in value:
        string(item, label)


def evidence_semantics(value):
    if type(value) is not list:
        fail("evidence", "Evidence must be an array.")
    for item in value:
        fields(item, ("source", "note"))
        string(item["source"], "evidence source")
        string(item["note"], "evidence note")


def is_legacy(record):
    return LEGACY_VERSION is not None and record["schema_version"] == LEGACY_VERSION


def content_of(record):
    return {key: record[key] for key in AUTHORED} if is_legacy(record) else record["content"]


def state_of(record):
    return {key: copy.deepcopy(record[key]) for key in MUTABLE}


def check_snapshots(value, limit_time):
    if type(value) is dict:
        if set(value) == {"path", "sha256", "utf8", "observed_at"}:
            if digest(value["utf8"].encode("utf-8")) != value["sha256"] or timestamp(value["observed_at"]) > limit_time:
                fail("snapshot", "Snapshot raw-byte digest or observation chronology is invalid.")
        for key, child in value.items():
            if key != "extensions":
                check_snapshots(child, limit_time)
    elif type(value) is list:
        for item in value:
            check_snapshots(item, limit_time)


def validate_record(binding, record, expected_id=None):
    if type(record) is not dict or type(record.get("schema_version")) is not str:
        fail("record", "Record must declare a string schema version.")
    version = record["schema_version"]
    if version not in binding.validators:
        fail("record-version", "Unsupported record version; original bytes preserved.", "unsupported")
    if next(binding.validators[version].iter_errors(record), None) is not None:
        fail("record-schema", "Record does not satisfy its selected owned structural schema.")
    if expected_id is not None and record["id"] != expected_id:
        fail("record-identity", "Filename and record identity differ.")
    if any(not re.fullmatch(r"[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+", key) for key in record.get("extensions", {})):
        fail("extension-name", "Extension keys must be dotted namespaces.")
    created, updated = timestamp(record["created_at"]), timestamp(record["updated_at"])
    if updated < created:
        fail("record-time", "Record update time precedes creation.")
    try:
        if is_legacy(record):
            legacy_semantics(record)
            return record
        if type(record["revision"]) is not int or record["revision"] != len(record["history"]) + 1:
            fail("record-revision", "Revision must be an exact integer bound to retained history.")
        state_semantics(state_of(record), record["status"])
        if not record["history"] and any(record[key] is not None for key in MUTABLE if key != "content"):
            fail("initial-evidence", "A new identity cannot inherit a decision, successor or observation.")
        if not record["history"] and (record["status"] != INITIAL or updated != created):
            fail("initial-state", "Revision one must preserve its initial lifecycle and actual creation time.")
        previous_time = created
        adopted_seen = False
        for index, entry in enumerate(record["history"]):
            if type(entry["from_revision"]) is not int or entry["from_revision"] != index + 1:
                fail("history-revision", "History revisions must be contiguous exact integers.")
            event_time = timestamp(entry["recorded_at"])
            if event_time < previous_time or event_time > updated:
                fail("history-time", "History timestamps are not chronological.")
            before = entry["previous_state"]
            after = record["history"][index + 1]["previous_state"] if index + 1 < len(record["history"]) else state_of(record)
            before_status = entry["previous_status"]
            after_status = record["history"][index + 1]["previous_status"] if index + 1 < len(record["history"]) else record["status"]
            operation = entry["operation"]
            if index == 0 and before_status != INITIAL:
                fail("history-initial", "History must start at initial state.")
            if after_status not in TRANSITIONS.get(operation, {}).get(before_status, ()):
                fail("history-transition", "History contains an unsupported lifecycle transition.")
            string(entry["reason"], "history reason")
            state_semantics(before, before_status)
            if index == 0 and any(before[key] is not None for key in MUTABLE if key != "content"):
                fail("history-initial", "Initial history cannot contain inherited lifecycle evidence.")
            check_snapshots(before, event_time)
            if "observation" in before:
                adopted_seen = adopted_seen or (before["observation"] is not None and before["observation"]["adoption"] == "adopted")
                if operation == "revise" and adopted_seen:
                    fail("adopted-history", "An ever-adopted proposal cannot have a revision.")
            if operation not in ("revise",) and not exact_equal(before["content"], after["content"]):
                fail("history-content", "Lifecycle operations cannot rewrite authored content.")
            if operation in ("accept", "decide") and after["decision"]["subject_sha256"] != entry["previous_sha256"]:
                fail("history-decision", "Decision must bind the exact pre-transition record digest.")
            if "decision" in before and operation not in ("accept", "decide") and not exact_equal(before["decision"], after["decision"]):
                fail("history-decision", "This operation cannot rewrite decision evidence.")
            if operation != "supersede" and not exact_equal(before["successor"], after["successor"]):
                fail("history-successor", "Only supersede may change a successor.")
            if "observation" in before:
                if operation == "revise" and after["observation"] is not None:
                    fail("history-observation", "Proposal revision must clear current observation and retain it in history.")
                if operation not in ("reconcile", "revise") and not exact_equal(before["observation"], after["observation"]):
                    fail("history-observation", "This operation cannot change observations.")
            previous_time = event_time
        if record["history"] and previous_time != updated:
            fail("history-time", "Latest history time must equal updated_at.")
        for state in [state_of(record), *[entry["previous_state"] for entry in record["history"]]]:
            if state["decision"] is not None and timestamp(state["decision"]["decided_at"]) < created:
                fail("decision-time", "Decision predates the record identity.")
        check_snapshots(record, updated)
        for link in [*record["provenance"], *([record["successor"]] if record["successor"] is not None else [])]:
            if link["role"] != ROLE or not ID.fullmatch(link["id"]) or link["id"] == record["id"] or link["schema_version"] not in SCHEMAS:
                fail("lineage", "Lineage must name a distinct supported same-family identity.")
            captured = parse_json(link["snapshot"]["utf8"].encode("utf-8"))
            if type(captured) is not dict or any(captured.get(key) != link[key] for key in ("id", "schema_version")) or captured.get("kind") != FAMILY:
                fail("lineage-snapshot", "Lineage identity differs from its retained source bytes.")
        return record
    except Fault:
        raise
    except (KeyError, TypeError, ValueError, OverflowError):
        fail("record-semantics", "Record contains malformed owned semantic data.")


def reference(record):
    return {"role": ROLE, "id": record["id"]}


def inspect_record(binding, ref):
    raw = read_bytes(binding.record_path(ref))
    return validate_record(binding, parse_json(raw), ref["id"]), raw


def new_record(content, extensions=None):
    now = now_text()
    value = {"schema_version": SCHEMA_VERSION, "kind": FAMILY, "owner": "project", "id": PREFIX + "-" + uuid.uuid4().hex,
             "status": INITIAL, "revision": 1, "created_at": now, "updated_at": now,
             "content": copy.deepcopy(content), "successor": None, "provenance": [], "history": []}
    value[MUTABLE[-1]] = None
    if extensions is not None:
        value["extensions"] = copy.deepcopy(extensions)
    return value


def query(binding, text, statuses=None):
    if type(text) is not str:
        fail("query-text", "Query text must be a string.")
    selected_statuses = sorted(STATUSES) if statuses is None else sorted(strings(statuses, "statuses", True))
    if not set(selected_statuses) <= set(STATUSES):
        fail("query-status", "Unsupported query status.")
    binding.check_paths()
    try:
        entries = sorted(binding.store.iterdir(), key=lambda path: path.name) if binding.store.exists() else []
    except OSError:
        fail("query-store", "Cannot enumerate the selected store.", "blocked")
    selected = [path for path in entries if path.name.endswith("." + PREFIX + ".json")]
    if len(selected) > MAX_FILES:
        fail("query-limit", "Store exceeds the 10000 direct-record limit.", "unsupported")
    matches, diagnostics, inventory = [], [], []
    def flatten(value):
        if type(value) is dict:
            return "\n".join(flatten(child) for child in value.values())
        if type(value) is list:
            return "\n".join(flatten(child) for child in value)
        return str(value)
    for path in selected:
        item = {"filename": path.name}
        try:
            raw = read_bytes(path)
            item["sha256"] = digest(raw)
            identity_id = path.name.removesuffix("." + PREFIX + ".json")
            if not ID.fullmatch(identity_id):
                fail("filename", "Invalid selected record filename.")
            record = validate_record(binding, parse_json(raw), identity_id)
            content = content_of(record)
            if record["status"] in selected_statuses and any(text.casefold() in flatten(content[key]).casefold() for key in SEARCH_FIELDS):
                matches.append({"reference": reference(record), "title": content["title"], "status": record["status"],
                                "schema_version": record["schema_version"], "sha256": item["sha256"],
                                "compatibility": "read-only-legacy" if is_legacy(record) else "current"})
        except (Fault, OSError) as exc:
            detail = exc.diagnostic() if isinstance(exc, Fault) else {"code": "read-error", "message": "Selected record is unreadable."}
            item["error"] = detail["code"]
            diagnostics.append({"filename": path.name, **detail})
        inventory.append(item)
    subject = {"query_version": 2, "store_root": str(binding.store), "text": text, "statuses": selected_statuses,
               "read_schemas": [ROLE + "@" + version for version in sorted(SCHEMAS)], "inventory": inventory}
    return {"store_root": str(binding.store), "text": text, "statuses": selected_statuses, "matches": matches,
            "partial": bool(diagnostics), "diagnostics": diagnostics, "query_sha256": digest(encode(subject)), "selected_count": len(selected)}


def select_successor(binding, current, selection):
    fields(selection, ("reference", "expected_sha256"))
    successor, raw = inspect_record(binding, selection["reference"])
    expected_digest(selection["expected_sha256"])
    if digest(raw) != selection["expected_sha256"]:
        fail("successor-drift", "Successor bytes changed.", "conflict")
    if is_legacy(successor) or successor["status"] != SUCCESSOR_STATUS or successor["id"] == current["id"]:
        fail("successor-state", "Successor must be a distinct current record in the required state.")
    if FAMILY == "standards-promotion" and not exact_equal(current["content"]["target_binding"], successor["content"]["target_binding"]):
        fail("successor-target", "Proposal successor must bind the same project target/config.")
    seen = {current["id"]}
    cursor, cursor_raw = successor, raw
    for _ in range(1000):
        if cursor["id"] in seen:
            fail("successor-cycle", "Supersession would form a cycle.", "conflict")
        seen.add(cursor["id"])
        if binding.read_input(binding.record_path(reference(cursor))) != cursor_raw:
            fail("successor-drift", "Successor changed while capturing its snapshot.", "conflict")
        link = cursor["successor"]
        if link is None:
            break
        if link["role"] != ROLE or safe_path(link["store_root"]) != binding.store:
            fail("successor-store", "Cross-family or cross-store supersession is unsupported.", "unsupported")
        cursor, cursor_raw = inspect_record(binding, {"role": link["role"], "id": link["id"]})
        if digest(cursor_raw) != link["snapshot"]["sha256"]:
            fail("successor-drift", "Supersession chain differs from its pinned evidence.", "conflict")
    else:
        fail("successor-limit", "Supersession chain exceeds the supported bound.", "unsupported")
    return {"role": ROLE, "id": successor["id"], "schema_version": successor["schema_version"], "store_root": str(binding.store),
            "snapshot": {"path": str(binding.record_path(reference(successor))), "sha256": digest(raw), "utf8": raw.decode("utf-8"), "observed_at": now_text()}}


def write_operation(binding, request):
    operation = request["operation"]
    creating = operation in ("create", "propose", "derive")
    related = None
    if creating:
        decision = fields(request["decision"], ("action", "query_sha256", "acknowledge_partial", "reason"))
        if decision["action"] != "new" or type(decision["acknowledge_partial"]) is not bool:
            fail("create-decision", "New identity and exact boolean partial acknowledgment are required.")
        expected_digest(decision["query_sha256"])
        string(decision["reason"], "new-record reason")
        if type(request["text"]) is not str:
            fail("query-text", "Query text must be a string.")
    if operation not in ("create", "propose"):
        binding.record_path(request["reference"])
        expected_digest(request["expected_sha256"])
    if "reason" in request:
        string(request["reason"], "transition reason")
    writer = Writer(binding)
    result = {"outcome": "failed"}
    record = raw = None
    try:
        writer.acquire(allow_create=creating)
        if creating:
            related = query(binding, request["text"], request.get("statuses"))
            if related["query_sha256"] != decision["query_sha256"]:
                fail("query-conflict", "Collection/query changed; review the new query and decide again.", "conflict")
            if related["partial"] and not decision["acknowledge_partial"]:
                fail("partial-query", "Explicit acknowledgment of query limits is required.", "blocked")
            if operation == "derive":
                source, original = inspect_record(binding, request["reference"])
                if digest(original) != request["expected_sha256"]:
                    fail("source-drift", "Derived source bytes changed.", "conflict")
                if binding.read_input(binding.record_path(request["reference"])) != original:
                    fail("source-drift", "Derived source changed while capturing its snapshot.", "conflict")
                source_snapshot = {"path": str(binding.record_path(request["reference"])), "sha256": digest(original), "utf8": original.decode("utf-8"), "observed_at": now_text()}
                record = new_record(content_of(source), source.get("extensions"))
                record["provenance"] = [{"relation": "derived-from", "role": ROLE, "id": source["id"],
                                         "schema_version": source["schema_version"], "store_root": str(binding.store), "snapshot": source_snapshot}]
            else:
                record = new_record(authored_content(binding, request["content"]), request.get("extensions"))
            validate_record(binding, record)
            raw = encode(record)
            binding.check_inputs()
            writer.publish(binding.record_path(reference(record)), raw, replacing=False)
            changed = True
        else:
            current, original = inspect_record(binding, request["reference"])
            if digest(original) != request["expected_sha256"]:
                fail("digest-conflict", "Record changed; inspect before updating.", "conflict")
            if is_legacy(current):
                fail("legacy-write", "Legacy records are read-only; derive a new identity explicitly.", "unsupported")
            if current["status"] not in TRANSITIONS.get(operation, {}):
                fail("transition", "Operation is not permitted from this lifecycle state.")
            record = copy.deepcopy(current)
            if operation == "revise":
                record["content"] = authored_content(binding, request["content"], current)
                if "observation" in record and not exact_equal(record["content"], current["content"]):
                    record["observation"] = None
            else:
                transition(binding, record, original, request)
            changed = not exact_equal(state_of(record), state_of(current)) or record["status"] != current["status"]
            if not changed:
                raw = original
            else:
                now = now_text()
                if timestamp(now) < timestamp(current["updated_at"]):
                    fail("clock-regression", "Actual clock precedes the previous update.", "blocked")
                record["history"].append({"from_revision": current["revision"], "operation": operation, "recorded_at": now,
                    "reason": request.get("reason", "Observed selected project evidence."), "previous_sha256": digest(original),
                    "previous_status": current["status"], "previous_state": state_of(current)})
                record["revision"] += 1
                record["updated_at"] = now
                validate_record(binding, record, current["id"])
                raw = encode(record)
                binding.check_inputs()
                if digest(read_bytes(binding.record_path(request["reference"]))) != request["expected_sha256"]:
                    fail("digest-conflict", "Record changed before replacement.", "conflict")
                writer.publish(binding.record_path(reference(record)), raw, replacing=True)
        result = {"outcome": "succeeded", "reference": reference(record), "sha256": digest(raw), "store_root": str(binding.store), "changed": changed}
        if operation == "reconcile":
            result["observation"] = record["observation"]
            result["freshness"] = "observed-this-invocation"
    except Fault as exc:
        result = {"outcome": exc.outcome, "diagnostics": [exc.diagnostic()]}
    except OSError:
        result = {"outcome": "blocked" if writer.mutation_state == "none" else "failed", "diagnostics": [{"code": "write-io", "message": "Write failed; no fallback or rollback inferred."}]}
    except (Exception, KeyboardInterrupt):
        result = {"outcome": "failed", "diagnostics": [{"code": "write-failure", "message": "Unexpected write failure; reread before retry."}]}
    finally:
        cleanup = writer.cleanup()
        if cleanup:
            result["outcome"] = "failed"
            result.setdefault("diagnostics", []).extend(cleanup)
        if writer.mutation_state != "none" and record is not None and raw is not None:
            result.setdefault("reference", reference(record))
            result.setdefault("intended_sha256", digest(raw))
        result["mutation_state"] = writer.mutation_state
        result["directories_created"] = writer.directories_created
        if related is not None:
            result["related_query"] = related
    return result


def escape_markdown(text):
    return re.sub(r"([\\`*_{}\[\]()#+.!|>~-])", r"\\\1", html.escape(text, quote=True))


def render(binding, record):
    content = content_of(record)
    values = {**content, "id": record["id"], "schema_version": record["schema_version"], "status": record["status"],
              "history": record.get("history", "Legacy schema: no lifecycle history; preserved read-only."),
              "provenance": record.get("provenance", "Legacy schema: no derived provenance; preserved read-only."),
              "decision": record.get("decision"), "proposal": content}
    if FAMILY == "standards-promotion":
        required = {"id", "schema_version", "status", "proposal", "observation", "history"}
        allowed = required | {"title"}
    else:
        required = set(AUTHORED) | {"id", "schema_version"}
        if not is_legacy(record):
            required |= {"status", "history", "provenance"} | ({"decision"} if FAMILY == "adr" else set())
        allowed = set(AUTHORED) | {"id", "schema_version", "status", "history", "provenance", "decision"}
    found = set(TOKEN.findall(binding.template))
    remainder = TOKEN.sub("", binding.template)
    if required - found or found - allowed or "{{" in remainder or "}}" in remainder:
        fail("template-token", "Template has unknown/malformed tokens or omits required content/lifecycle tokens.")
    def display(value):
        if type(value) in (dict, list):
            return escape_markdown(encode(value).decode("utf-8").rstrip())
        return escape_markdown("None supplied" if value is None else str(value))
    return TOKEN.sub(lambda match: display(values[match[1]]), binding.template)


def execute(request):
    common = ("operation", "project_root", "package_root")
    optional = ("project_config", "local_config", "overrides", "write_roots")
    if type(request) is not dict or type(request.get("operation")) is not str:
        fail("request", "Request must name an operation.")
    operation = request["operation"]
    if operation not in OPERATIONS:
        fail("operation", "Unsupported public operation.", "unsupported")
    required = WRITE_FIELDS.get(operation, () if operation in ("explain", "query") else ("reference",))
    operation_optional = ()
    if operation in ("create", "propose"):
        operation_optional = ("statuses", "extensions")
    elif operation == "derive":
        operation_optional = ("statuses",)
    elif operation == "query":
        operation_optional = ("text", "statuses")
    elif operation == "reconcile":
        operation_optional = ("adoption_source", "effect_source")
    fields(request, (*common, *required), (*optional, *operation_optional), "request")
    if "extensions" in request and type(request["extensions"]) is not dict:
        fail("extensions", "Creation extensions must be a namespaced JSON object.")
    if not (3, 11) <= sys.version_info[:2] < (4, 0):
        fail("python-version", "Python >=3.11,<4 is required.", "unavailable")
    binding = Binding(request)
    if operation == "explain":
        return {"outcome": "succeeded", **binding.explain()}
    if operation == "query":
        return {"outcome": "succeeded", **query(binding, request.get("text", ""), request.get("statuses"))}
    if operation in WRITE_FIELDS:
        return write_operation(binding, request)
    record, raw = inspect_record(binding, request["reference"])
    result = {"outcome": "succeeded", "reference": reference(record), "sha256": digest(raw), "store_root": str(binding.store),
              "compatibility": "read-only-legacy" if is_legacy(record) else "current", "authority": "recorded-evidence-not-authenticated"}
    if operation == "inspect":
        result["record"] = record
        result["observations_freshness"] = "historical-only"
        if not is_legacy(record) and record["successor"] is not None:
            link = record["successor"]
            try:
                if safe_path(link["store_root"]) != binding.store:
                    fail("successor-store", "Stored successor belongs to another store.", "unsupported")
                _, successor_raw = inspect_record(binding, {"role": link["role"], "id": link["id"]})
                result["successor_freshness"] = "matches-captured" if digest(successor_raw) == link["snapshot"]["sha256"] else "stale"
            except (Fault, OSError):
                result["successor_freshness"] = "unresolved"
    elif operation == "validate":
        result.update(valid=True, diagnostics=[])
    else:
        result["view"] = {"role": FAMILY + ".view", "source": reference(record), "schema_version": record["schema_version"],
                          "observations_freshness": "historical-only", "markdown": render(binding, record)}
    return result


class ArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        fail("arguments", "Use --request <explicit JSON file or ->.")


def main():
    operation = None
    try:
        parser = ArgumentParser(description=__doc__, allow_abbrev=False)
        parser.add_argument("--request", required=True, help="Absolute JSON request filename, or - for stdin")
        args = parser.parse_args()
        if args.request == "-":
            raw = sys.stdin.buffer.read(LIMIT + 1)
            if len(raw) > LIMIT:
                fail("size-limit", "Request exceeds the 4 MiB limit.", "unsupported")
        else:
            raw = read_bytes(safe_path(args.request))
        request = parse_json(raw)
        if type(request) is dict and type(request.get("operation")) is str and request["operation"] in OPERATIONS:
            operation = request["operation"]
        result = execute(request)
    except Fault as exc:
        result = {"outcome": exc.outcome, "diagnostics": [exc.diagnostic()]}
    except OSError:
        result = {"outcome": "blocked", "diagnostics": [{"code": "read-io", "message": "Selected input is inaccessible."}]}
    except Exception:
        result = {"outcome": "failed", "diagnostics": [{"code": "internal", "message": "Unexpected failure; inputs were not echoed."}]}
    result = {"operation": operation, "mutation_state": "none", **result}
    sys.stdout.buffer.write(encode(result))
    return 0 if result["outcome"] == "succeeded" else 1


if __name__ == "__main__":
    raise SystemExit(main())
