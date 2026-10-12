#!/usr/bin/env python3
"""pr-author.fs 0.1.0. Owned standalone JSON-request tool; no cross-skill imports."""
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
import threading
from datetime import datetime, timezone
import uuid

PACKAGE = 'pr-author'
# Package routing may change while existing project records and writer locks stay stable.
FAMILY = 'pr'
ID_PREFIX = 'pr-'
SUFFIX = '.pr.json'
ROLE = 'pr.record'
OPERATIONS = ('explain', 'prepare', 'inspect', 'query', 'revise', 'render')
ALL_OPERATIONS = ['explain',
 'prepare',
 'inspect',
 'query',
 'revise',
 'render',
 'provider-read',
 'provider-create',
 'provider-update']
AUTHORED = ('title', 'summary', 'validation', 'references')
VIEW_FIELDS = ('id', 'title', 'summary', 'subject', 'validation', 'references')
MEMBERS = ['SKILL.md',
 'skill-package.yaml',
 'references/configuration.md',
 'references/operations.md',
 'references/github.md',
 'references/example.md',
 'schemas/pr-record.schema.json',
 'templates/pr.md',
 'scripts/pr.py',
 'scripts/github.py']
DEFAULTS = {'store': {'kind': 'filesystem', 'root': 'notes/pull-requests', 'tracking': 'tracked'},
 'template': {'origin': 'package', 'path': 'templates/pr.md'}}
TOOLS = {'pr-author.fs': ('scripts/pr.py',
           ['explain', 'prepare', 'inspect', 'query', 'revise', 'render'],
           'references/operations.md'),
 'pr-author.github': ('scripts/github.py',
               ['provider-read', 'provider-create', 'provider-update'],
               'references/github.md')}
ROLES = [{'role': 'pr.record',
  'owner': 'project',
  'schema': 'pr.record@1.0.0',
  'read_schemas': ['pr.record@1.0.0'],
  'store_binding': 'pr-author.store',
  'identity': 'pr-<32 lowercase hex digits>',
  'filename': '<id>.pr.json',
  'read_operations': ['inspect', 'query', 'render'],
  'write_operations': ['prepare', 'revise']},
 {'role': 'pr.view',
  'owner': 'derived',
  'source_role': 'pr.record',
  'output': 'result-only Markdown',
  'persistence': 'Caller-selected export is a separate write',
  'produce_operations': ['render']}]
RUNTIME = [{'id': 'skill-instruction-reader',
  'requirement': 'Read selected package and resources',
  'for_operations': ['explain',
                     'prepare',
                     'inspect',
                     'query',
                     'revise',
                     'render',
                     'provider-read',
                     'provider-create',
                     'provider-update'],
  'on_missing': 'unavailable'},
 {'id': 'python',
  'version': '>=3.11,<4',
  'for_operations': ['explain',
                     'prepare',
                     'inspect',
                     'query',
                     'revise',
                     'render',
                     'provider-read',
                     'provider-create',
                     'provider-update'],
  'on_missing': 'unavailable'},
 {'id': 'pyyaml',
  'version': '>=6,<7',
  'for_operations': ['explain',
                     'prepare',
                     'inspect',
                     'query',
                     'revise',
                     'render',
                     'provider-read',
                     'provider-create',
                     'provider-update'],
  'on_missing': 'unavailable'},
 {'id': 'jsonschema',
  'version': '>=4.18,<5',
  'for_operations': ['prepare', 'inspect', 'query', 'revise', 'render', 'provider-create', 'provider-update'],
  'on_missing': 'unavailable'},
 {'id': 'filesystem',
  'requirement': 'Selected local files; writes need exclusive creation and same-directory atomic replacement',
  'for_operations': ['explain',
                     'prepare',
                     'inspect',
                     'query',
                     'revise',
                     'render',
                     'provider-read',
                     'provider-create',
                     'provider-update'],
  'on_missing': 'unavailable'},
 {'id': 'git',
  'requirement': 'Conditional: selected local-config ignore checks; PR prepare and requested source rebind',
  'for_operations': ['explain',
                     'prepare',
                     'inspect',
                     'query',
                     'revise',
                     'render',
                     'provider-read',
                     'provider-create',
                     'provider-update'],
  'on_missing': 'unavailable'},
 {'id': 'gh',
  'requirement': 'Existing caller-authorized GitHub authentication; no credential provisioning',
  'for_operations': ['provider-read', 'provider-create', 'provider-update'],
  'on_missing': 'unavailable'}]
SCHEMA_PATH = 'schemas/pr-record.schema.json'
TRANSITIONS = {'draft': ['planned', 'cancelled'],
 'planned': ['in_progress', 'blocked', 'cancelled'],
 'in_progress': ['blocked', 'completed', 'cancelled'],
 'blocked': ['planned', 'in_progress', 'cancelled']}
ID = re.compile(re.escape(ID_PREFIX)+r"[0-9a-f]{32}\Z")
SHA256 = re.compile(r"[0-9a-f]{64}\Z")
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
    fields(value, ("store", "template") if complete else (), () if complete else ("store", "template"), "Skill settings")
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


def load_package(package):
    metadata = parse_yaml(read_bytes(package / "skill-package.yaml", "unsupported"))
    fields(metadata, ("metadata_version", "id", "version", "delivery_status", "entrypoint", "dependencies", "runtime", "configuration", "artifact_roles", "resources", "operations"), label="metadata")
    if type(metadata["metadata_version"]) is not int or metadata["metadata_version"] != 2:
        fail("metadata-version", "This package requires exact metadata_version 2.", "unsupported")
    if (metadata["id"], metadata["version"], metadata["delivery_status"], metadata["entrypoint"]) != (PACKAGE, "0.1.0", "implemented", "SKILL.md"):
        fail("package-identity", "Unsupported package identity or delivery state.", "unsupported")
    if not exact_equal(metadata["dependencies"], {"required": [], "optional": []}):
        fail("dependencies", "This package has no skill dependencies.", "unsupported")
    fields(metadata["configuration"], ("namespace", "defaults"), label="configuration")
    if metadata["configuration"]["namespace"] != PACKAGE or not exact_equal(metadata["configuration"]["defaults"], DEFAULTS):
        fail("defaults", "Package default contract differs from this implementation.", "unsupported")
    if not exact_equal(metadata["artifact_roles"], ROLES) or not exact_equal(metadata["runtime"], RUNTIME):
        fail("metadata-contract", "Runtime or artifact role contract differs.", "unsupported")
    resources=fields(metadata["resources"], ("references","schemas","templates","tools"), label="resources")
    refs=strings(resources["references"], "references", True)
    if type(resources["schemas"]) is not list or len(resources["schemas"]) != 1:
        fail("schemas", "This package has one exact readable/writable schema.")
    schema=fields(resources["schemas"][0], ("id","version","path","owner","migration"))
    if (schema["id"],schema["version"],schema["path"],schema["owner"]) != (ROLE,"1.0.0",SCHEMA_PATH,PACKAGE):
        fail("schemas", "Unsupported schema identity.", "unsupported")
    string(schema["migration"], "migration")
    if type(resources["templates"]) is not list or len(resources["templates"]) != 1:
        fail("template", "Exactly one owned template is required.")
    template=fields(resources["templates"][0],("id","path","input_role","output_role","owner"))
    if not exact_equal(template, {"id":PACKAGE+".default-view","path":DEFAULTS["template"]["path"],"input_role":ROLE,"output_role":FAMILY+".view","owner":PACKAGE}):
        fail("template", "Unsupported template declaration.")
    if type(resources["tools"]) is not list or len(resources["tools"]) != len(TOOLS):
        fail("tools", "Unexpected tool declarations.")
    paths=["SKILL.md","skill-package.yaml",schema["path"],template["path"],*refs]
    seen=set()
    for tool in resources["tools"]:
        fields(tool,("id","owner","implementation_status","entrypoint","operation_contract","operations"))
        key=string(tool["id"],"tool id")
        if key in seen or key not in TOOLS:
            fail("tools","Unknown or duplicate tool.")
        seen.add(key)
        entrypoint,operations,contract=TOOLS[key]
        if (tool["owner"] != PACKAGE or tool["implementation_status"] != "implemented" or
                tool["entrypoint"] != entrypoint or not exact_equal(tool["operations"],operations) or
                tool["operation_contract"] != contract or contract not in refs):
            fail("tools","Tool operation ownership mismatch.")
        paths.append(entrypoint)
    if len(paths)!=len(set(paths)) or set(paths)!=set(MEMBERS):
        fail("members","Package resources differ from the exact owned member set.")
    for path in paths:
        resource(package,path)
    if resource(package,TOOLS[PACKAGE+".fs"][0]) != Path(__file__).resolve():
        fail("package-binding","Selected package does not own this executable.","blocked")
    if type(metadata["operations"]) is not list:
        fail("operations","Operations must be an array.")
    seen=set()
    for op in metadata["operations"]:
        fields(op,("id","inputs","outputs","tool","implementation_status"))
        key=string(op["id"],"operation id")
        if key in seen or key not in ALL_OPERATIONS:
            fail("operations","Unknown or duplicate operation.")
        seen.add(key)
        strings(op["inputs"],"inputs",True)
        strings(op["outputs"],"outputs",True)
        tool_id=string(op["tool"],"tool")
        if tool_id not in TOOLS or key not in TOOLS[tool_id][1] or op["implementation_status"]!="implemented":
            fail("operations","Operation/tool ownership differs.")
    if seen != set(ALL_OPERATIONS):
        fail("operations","Missing operation.")
    return metadata


def config(path, local=False):
    value=parse_json(read_bytes(path))
    fields(value,("config_version",),("skills",) if local else ("skills","constraints"),"config")
    if type(value["config_version"]) is not int or value["config_version"] != 2:
        fail("config-version","Selected config must use exact integer version 2.","unsupported")
    for field in ("skills","constraints"):
        namespaces=value.get(field,{})
        if type(namespaces) is not dict:
            fail("namespace","Namespace container must be an object.")
        for key, child in namespaces.items():
            if not re.fullmatch(r"[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*",key) or type(child) is not dict:
                fail("namespace","Each namespace must be a valid ID and object.")
    chosen=settings(value.get("skills",{}).get(PACKAGE,{}))
    rules=fields(value.get("constraints",{}).get(PACKAGE,{}),(),("write_roots","locked_fields"),"selected constraints")
    if "write_roots" in rules:
        strings(rules["write_roots"],"write_roots",True)
    if not set(strings(rules.get("locked_fields",[]),"locked_fields")) <= {"store.root","store.tracking","template"}:
        fail("locked-fields","Unknown selected locked field.")
    return chosen,rules


def schema_refs(schema):
    # Only bounded, acyclic same-document definitions; never remote resolution.
    remaining = [100000]
    def visit(value, active=(), depth=0):
        remaining[0] -= 1
        if remaining[0] < 0:
            fail("schema-ref", "Schema reference traversal exceeds the bound.", "unsupported")
        if depth > 64:
            fail("schema-ref","Schema nesting/reference depth exceeds the bound.","unsupported")
        if type(value) is dict:
            if any(key in value for key in ("$id","$dynamicRef","$recursiveRef")):
                fail("schema-ref","Schema rebasing/dynamic references are unsupported.","unsupported")
            if "$ref" in value:
                ref=value["$ref"]
                if type(ref) is not str or not ref.startswith("#/$defs/") or ref in active:
                    fail("schema-ref","Only acyclic same-document definition references are supported.","unsupported")
                target=schema
                try:
                    for part in ref[2:].split("/"):
                        target=target[part.replace("~1","/").replace("~0","~")]
                except (KeyError,TypeError):
                    fail("schema-ref","Missing local definition.")
                visit(target,(*active,ref),depth+1)
            for key, child in value.items():
                if key!="$ref":
                    visit(child,active,depth+1)
        elif type(value) is list:
            for child in value:
                visit(child,active,depth+1)
    visit(schema)


def validate_template(template):
    found=set(TOKEN.findall(template))
    if found != set(VIEW_FIELDS) or "{{" in TOKEN.sub("",template) or "}}" in TOKEN.sub("",template):
        fail("template-token","Template must contain each required token and no unknown/malformed tokens.")


def validate_record(binding,record,expected_id=None):
    if type(record) is not dict or type(record.get("schema_version")) is not str:
        fail("record-version","Record requires explicit string schema_version.")
    if record["schema_version"]!="1.0.0":
        fail("record-version","Unsupported record version; original bytes preserved.","unsupported")
    if next(binding.validator.iter_errors(record),None) is not None:
        fail("record-schema","Record does not satisfy the selected owned schema.")
    if not ID.fullmatch(record["id"]) or (expected_id is not None and record["id"]!=expected_id):
        fail("record-identity","Record ID and selected filename must agree.")
    try:
        created=datetime.fromisoformat(record["created_at"].replace("Z","+00:00"))
        updated=datetime.fromisoformat(record["updated_at"].replace("Z","+00:00"))
        if created.tzinfo is None or updated.tzinfo is None or updated < created:
            fail("record-time","Zoned ordered timestamps are required.")
    except ValueError:
        fail("record-time","Invalid timestamp.")
    if FAMILY=="pr":
        ids=[item["id"] for item in record["validation"]]
        if len(ids)!=len(set(ids)):
            fail("validation-id","Check IDs must be distinct.")
        for item in record["validation"]:
            if item["subject_head"]!=record["subject"]["head_commit"] or item["subject_diff_sha256"]!=record["subject"]["diff_sha256"]:
                fail("validation-subject","Validation entry belongs to a different head/diff.","conflict")
        if "provider_target" in record:
            provider_target(record["provider_target"])
    return record


def reference(record):
    return {"role":ROLE,"id":record["id"]}


def authored(value,extensions=False):
    return fields(value,AUTHORED,((*(("provider_target",) if FAMILY=="pr" else ()),*(("extensions",) if extensions else ()))),"authored content")


def new_record(content,subject=None):
    now=datetime.now(timezone.utc).isoformat(timespec="microseconds")
    record={"schema_version":"1.0.0","kind":FAMILY,"owner":"project","id":ID_PREFIX+uuid.uuid4().hex,
            "created_at":now,"updated_at":now,**copy.deepcopy(content)}
    if FAMILY=="pr":
        record.update(state="prepared",subject=subject)
    else:
        record.update(state="draft",writable_authority="local",state_reason="Created as candidate work.",completion_evidence=[])
    return record


def write_operation(binding,request):
    operation=request["operation"]
    creating=operation in ("create","prepare")
    observation=None
    if creating:
        content=authored(request["content"],True)
        if FAMILY=="pr":
            observation=git_subject(binding,request["repository_root"],request["base_commit"],request["head_commit"])
        candidate=new_record(content,observation["subject"] if observation else None)
        validate_record(binding,candidate)
    else:
        binding.record_path(request["reference"])
        expected=string(request["expected_sha256"],"expected_sha256")
        if not SHA256.fullmatch(expected):
            fail("expected-digest","Expected actual raw-byte SHA-256.")
        if operation=="revise":
            content=authored(request["content"])
    writer=Writer(binding)
    result={"outcome":"failed"}
    try:
        writer.acquire(creating)
        if creating:
            record=candidate
            raw=encode(record)
            writer.publish(binding.record_path(reference(record)),raw,False)
            changed=True
        else:
            current,original=inspect_record(binding,request["reference"])
            if digest(original)!=expected:
                fail("digest-conflict","Record bytes changed; inspect before retry.","conflict")
            if FAMILY=="local-backlog" and current["state"] in ("completed","cancelled"):
                fail("terminal-record","Terminal records are read-only in this version.","unsupported")
            record=copy.deepcopy(current)
            if operation=="transition":
                if request["expected_state"]!=current["state"]:
                    fail("state-conflict","Record state changed.","conflict")
                target=string(request["target_state"],"target_state")
                if target not in TRANSITIONS[current["state"]]:
                    fail("transition","Unsupported state transition.","unsupported")
                record.update(state=target,state_reason=string(request["reason"],"reason"),completion_evidence=copy.deepcopy(request["completion_evidence"]))
            else:
                for key in (*AUTHORED,*(("provider_target",) if FAMILY=="pr" else ())):
                    record.pop(key,None)
                record.update(copy.deepcopy(content))
            changed=not exact_equal(record,current)
            if changed:
                now=datetime.now(timezone.utc)
                if now<datetime.fromisoformat(current["updated_at"].replace("Z","+00:00")):
                    fail("clock-regression","Clock precedes the previous update.","blocked")
                record["updated_at"]=now.isoformat(timespec="microseconds")
                validate_record(binding,record,current["id"])
                path=binding.record_path(request["reference"])
                if digest(read_bytes(path))!=expected:
                    fail("digest-conflict","Record changed during update.","conflict")
                raw=encode(record)
                writer.publish(path,raw,True)
            else:
                raw=original
        result={"outcome":"succeeded","reference":reference(record),"sha256":digest(raw),"store_root":str(binding.store),"changed":changed}
        if observation is not None:
            result.update(observation)
    except Fault as exc:
        result={"outcome":exc.outcome,"diagnostics":[exc.diagnostic()]}
    except OSError:
        result={"outcome":"blocked" if writer.mutation_state=="none" else "failed","diagnostics":[{"code":"write-io","message":"Write failed; no fallback location selected."}]}
    except (Exception,KeyboardInterrupt):
        result={"outcome":"failed","diagnostics":[{"code":"write-failure","message":"Unexpected write failure; inspect before retry."}]}
    finally:
        cleanup=writer.cleanup()
        if cleanup:
            result["outcome"]="failed"
            result.setdefault("diagnostics",[]).extend(cleanup)
        result["mutation_state"]=writer.mutation_state
        result["directories_created"]=writer.directories_created
    return result


def render(binding,record):
    def display(value):
        if type(value) is list:
            if not value:
                return "None supplied"
            return "\n".join("- "+display(item).replace("\n","\n  ") for item in value)
        if type(value) is dict:
            return "; ".join(escape_markdown(key)+": "+display(child) for key,child in value.items())
        return escape_markdown(str(value))
    return TOKEN.sub(lambda m:display(record[m[1]]),binding.template)


def execute(request):
    if type(request) is not dict or type(request.get("operation")) is not str:
        fail("request","Request must name an operation.")
    operation=request["operation"]
    if operation not in OPERATIONS:
        fail("operation","Unsupported operation.","unsupported")
    required={"explain":(),"query":(),"create":("content",),"prepare":("content","repository_root","base_commit","head_commit"),
              "inspect":("reference",),"render":("reference",),"revise":("reference","expected_sha256","content"),
              "transition":("reference","expected_sha256","expected_state","target_state","reason","completion_evidence")}[operation]
    extra=("text",) if operation=="query" else (("repository_root",) if FAMILY=="pr" and operation=="render" else ())
    fields(request,("operation","project_root","package_root",*required),("project_config","local_config","overrides","write_roots",*extra),"request")
    if not (3,11)<=sys.version_info[:2]<(4,0):
        fail("python-version","Python >=3.11,<4 is required.","unavailable")
    binding=Binding(request)
    if operation=="explain":
        return {"outcome":"succeeded",**binding.explain(),"config_version":2,"namespace":PACKAGE}
    if operation=="query":
        return {"outcome":"succeeded",**query(binding,request.get("text",""))}
    if operation in ("create","prepare","revise","transition"):
        return write_operation(binding,request)
    record,raw=inspect_record(binding,request["reference"])
    result={"outcome":"succeeded","reference":reference(record),"sha256":digest(raw),"store_root":str(binding.store)}
    if operation=="inspect":
        result["record"]=record
    else:
        markdown=render(binding,record)
        body=markdown.encode("utf-8")
        if len(body)>LIMIT:
            fail("render-limit","Rendered output exceeds the limit.","unsupported")
        result.update(template_sha256=binding.template_sha256,body_sha256=digest(body),view={"role":FAMILY+".view","source":reference(record),"schema_version":"1.0.0","markdown":markdown})
        if FAMILY=="pr":
            result.update(subject=record["subject"],subject_verified=False)
            if "repository_root" in request:
                observed=git_subject(binding,request["repository_root"],record["subject"]["base_commit"],record["subject"]["head_commit"])
                if not exact_equal(observed["subject"],record["subject"]):
                    fail("subject-conflict","Git subject or execution recipe changed; prepare a new proposal.","conflict")
                result.update(subject_verified=True,working_tree_dirty=observed["working_tree_dirty"])
    return result
class Binding:
    def __init__(self, request):
        self.project = safe_path(request["project_root"])
        self.package = safe_path(request["package_root"])
        if not self.project.is_dir() or not self.package.is_dir():
            fail("root", "Explicit project and package roots must exist as directories.")
        self.metadata = load_package(self.package)
        self.settings = copy.deepcopy(self.metadata["configuration"]["defaults"])
        self.sources = {key: "default" for key in ("store.kind", "store.root", "store.tracking", "template")}
        self.config_paths = []
        project_layer, rules = {}, {}
        if "project_config" in request:
            project_path = safe_path(request["project_config"], self.project)
            self.config_paths.append(project_path)
            project_layer, rules = config(project_path)
        merge_settings(self.settings, project_layer, self.sources, "project")
        self.project_settings = copy.deepcopy(self.settings)
        self.locks = rules.get("locked_fields", [])
        self.allowed = [safe_path(value, self.project) for value in rules.get("write_roots", [self.settings["store"]["root"]])]
        self.caller_allowed = None
        if "write_roots" in request:
            self.caller_allowed = [safe_path(value, self.project) for value in strings(request["write_roots"], "caller write_roots", True)]
        # Absolute external stores require explicit project roots, even when
        # the root originated in project settings rather than an override.
        self.explicit_roots = "write_roots" in rules
        layers = []
        if "local_config" in request:
            local_path = safe_path(request["local_config"], self.project)
            self.config_paths.append(local_path)
            git_local_ignored(self.project, local_path)
            layers.append(("local", config(local_path, local=True)[0]))
        if "overrides" in request:
            layers.append(("invocation", settings(request["overrides"])))
        for source, layer in layers:
            merge_settings(self.settings, layer, self.sources, source)
            for locked in self.locks:
                if not exact_equal(field_value(self.settings, locked), field_value(self.project_settings, locked)):
                    fail("locked-field", f"Override changes project-locked field {locked}.", "blocked")
        self.store = safe_path(self.settings["store"]["root"], self.project)
        self.store_identity = identity(self.store.stat()) if self.store.exists() else None
        template = self.settings["template"]
        template_root = self.package if template["origin"] == "package" else self.project
        self.template_path = safe_path(template["path"], template_root)
        if not beneath(self.template_path, template_root):
            fail("template-boundary", "Template must stay within its declared root.", "blocked")
        if template["origin"] == "package" and self.template_path != resource(self.package, self.metadata["resources"]["templates"][0]["path"]):
            fail("template-resource", "A package template must be a declared template resource.")
        self.check_paths()
        try:
            template_raw = read_bytes(self.template_path)
            self.template_sha256 = digest(template_raw)
            self.template = template_raw.decode("utf-8", errors="strict")
        except UnicodeError:
            fail("template-encoding", "Template must be UTF-8.")
        validate_template(self.template)
        self.validator = None
        if request["operation"] != "explain":
            dependency("jsonschema", (4, 18), (5, 0))
            try:
                from jsonschema import Draft202012Validator, FormatChecker
                schema = parse_json(read_bytes(resource(self.package, self.metadata["resources"]["schemas"][0]["path"])))
                schema_refs(schema)
                Draft202012Validator.check_schema(schema)
                self.validator = Draft202012Validator(schema, format_checker=FormatChecker())
            except ImportError:
                fail("dependency", "jsonschema could not be imported.", "unavailable")
            except Exception as exc:
                if isinstance(exc, Fault):
                    raise
                fail("schema", "Invalid owned record schema.")

    def check_paths(self):
        for path in (self.project, self.package, self.store, self.template_path, *self.config_paths, *self.allowed, *(self.caller_allowed or [])):
            if safe_path(str(path)) != path:
                fail("binding-drift", "Frozen path binding changed.", "conflict")
        if self.store == Path(self.store.anchor):
            fail("store-root", "Volume-root stores are forbidden.", "blocked")
        if self.store.exists() and not self.store.is_dir():
            fail("store-type", "Store must be a directory.")
        if self.store_identity is not None and (not self.store.exists() or identity(self.store.stat()) != self.store_identity):
            fail("store-drift", "Frozen store directory identity changed.", "conflict")
        if not any(beneath(self.store, root) for root in self.allowed):
            fail("write-boundary", "Selected store exceeds project write roots.", "blocked")
        if self.caller_allowed is not None and not any(beneath(self.store, root) for root in self.caller_allowed):
            fail("caller-boundary", "Selected store exceeds caller write roots.", "blocked")
        if not beneath(self.store, self.project) and not self.explicit_roots:
            fail("external-store", "An external store requires explicit project write_roots.", "blocked")
        if any(overlap(self.store, protected) for protected in (self.package, self.template_path, *self.config_paths)):
            fail("overlap", "Store overlaps installed package, config or template content.", "blocked")

    def explain(self):
        return {"settings": self.settings, "sources": self.sources, "project_root": str(self.project),
                "package_root": str(self.package), "store_root": str(self.store), "template_path": str(self.template_path),
                "locked_fields": self.locks, "write_roots": [str(p) for p in self.allowed],
                "caller_write_roots": None if self.caller_allowed is None else [str(p) for p in self.caller_allowed],
                "runtime_capability": "not-probed", "tracking": "intent-only", "unsupported_reasons": []}

    def record_path(self, ref):
        fields(ref, ("role", "id"), label="record reference")
        if ref["role"] != "pr.record" or type(ref["id"]) is not str or not ID.fullmatch(ref["id"]):
            fail("reference", "Invalid store-scoped record reference.")
        return safe_path(ref["id"] + ".pr.json", self.store, relative_only=True)

def inspect_record(binding, ref):
    path = binding.record_path(ref)
    raw = read_bytes(path)
    record = validate_record(binding, parse_json(raw), ref["id"])
    return record, raw

def query(binding, text):
    if type(text) is not str:
        fail("query-text", "Query text must be a string.")
    binding.check_paths()
    matches, diagnostics, inventory = [], [], []
    output_budget = 0
    selected = []
    try:
        for path in binding.store.iterdir() if binding.store.exists() else ():
            if path.name.endswith(SUFFIX):
                selected.append(path)
                if len(selected) > MAX_FILES:
                    fail("query-limit", "Store exceeds the 10000 direct-record query limit.", "unsupported")
    except OSError:
        fail("query-store", "Cannot enumerate the selected store.", "blocked")
    selected.sort(key=lambda p: p.name)
    for path in selected:
        item = {"filename": path.name}
        try:
            raw = read_bytes(path)
            item["sha256"] = digest(raw)
            record_id = path.name.removesuffix(".pr.json")
            if not ID.fullmatch(record_id):
                fail("filename", "Unsafe record filename.")
            record = validate_record(binding, parse_json(raw), record_id)
            if any(text.casefold() in record[key].casefold() for key in ("title", "summary")):
                match = {"reference": reference(record), "title": record["title"], "sha256": item["sha256"]}
                output_budget += len(encode(match))
                if output_budget > LIMIT // 2:
                    fail("query-output", "Matching result content exceeds the bounded response.", "unsupported")
                matches.append(match)
        except (Fault, OSError) as exc:
            if isinstance(exc, Fault) and exc.code == "query-output":
                raise
            diagnostic = exc.diagnostic() if isinstance(exc, Fault) else {"code": "read-error", "message": "Selected record is unreadable."}
            item["error"] = diagnostic["code"]
            diagnostics.append({"filename": path.name, **diagnostic})
        inventory.append(item)
    # Includes even nonmatching/malformed raw bytes; unreadable files bind
    # filename/error only, hence partial acknowledgment is never completeness.
    subject = {"query_version": 1, "store_root": str(binding.store), "text": text,
               "record_schema": "1.0.0", "inventory": inventory}
    return {"store_root": str(binding.store), "text": text, "matches": matches,
            "partial": bool(diagnostics), "diagnostics": diagnostics,
            "query_sha256": digest(encode(subject)), "selected_count": len(selected)}

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
        self.lock = binding.store / ".pr-write.lock"
        self.temp = binding.store / (".pr-" + self.token + ".tmp")
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
            fail("missing-store", "Revise requires an existing store and candidate.")
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
        self.mutation_state = "committed"
        if read_bytes(path) != raw:
            self.mutation_state = "unknown"
            fail("publication-readback", "Published bytes could not be confirmed; reread before retry.", "failed")

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

def escape_markdown(text):
    escaped = html.escape(text, quote=True)
    return re.sub(r"([\\`*_{}\[\]()#+.!|>~-])", r"\\\1", escaped)

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
    response_bytes = encode(result)
    if len(response_bytes) > LIMIT:
        result = {"operation": operation, "outcome": "unsupported", "mutation_state": result.get("mutation_state", "none"),
                  "diagnostics": [{"code": "result-limit", "message": "Result exceeds the 4 MiB limit; inspect the selected identity before retry."}],
                  **{key: result[key] for key in ("reference", "sha256", "store_root", "directories_created") if key in result}}
        response_bytes = encode(result)
    sys.stdout.buffer.write(response_bytes)
    return 0 if result["outcome"] == "succeeded" else 1



def run_bounded(argv, env, cwd, input_data=None, timeout=30):
    """Drain both pipes with byte/time bounds; never invoke a shell."""
    try:
        process=subprocess.Popen(argv,stdin=subprocess.PIPE if input_data is not None else subprocess.DEVNULL,
                                 stdout=subprocess.PIPE,stderr=subprocess.PIPE,cwd=str(cwd),env=env)
    except FileNotFoundError:
        fail("executable","Required executable is unavailable.","unavailable")
    buffers=[bytearray(),bytearray()]
    overflow=threading.Event()
    def drain(stream,index):
        try:
            while True:
                chunk=stream.read(65536)
                if not chunk:
                    break
                if len(buffers[index])+len(chunk)>LIMIT:
                    overflow.set()
                    process.kill()
                    break
                buffers[index].extend(chunk)
        finally:
            stream.close()
    readers=[threading.Thread(target=drain,args=(process.stdout,0),daemon=True),
             threading.Thread(target=drain,args=(process.stderr,1),daemon=True)]
    for thread in readers:
        thread.start()
    def feed():
        try:
            process.stdin.write(input_data)
            process.stdin.close()
        except (BrokenPipeError,OSError):
            pass
    feeder=threading.Thread(target=feed,daemon=True) if input_data is not None else None
    if feeder:
        feeder.start()
    try:
        process.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()
        fail("process-timeout","Child process timed out; no automatic retry.","failed")
    finally:
        for thread in readers+([feeder] if feeder else []):
            thread.join(timeout=2)
    if overflow.is_set() or any(thread.is_alive() for thread in readers):
        fail("process-limit","Child output exceeds the bounded transport.","unsupported")
    return process.returncode,bytes(buffers[0]),bytes(buffers[1])


def provider_target(value):
    fields(value,("provider","host","repository","base_ref","head_ref"),label="provider target")
    if value["provider"]!="github" or value["host"]!="github.com":
        fail("provider","Only GitHub.com same-repository targets are supported.","unsupported")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*/[A-Za-z0-9][A-Za-z0-9_.-]*",string(value["repository"],"repository")):
        fail("repository","Expected one owner/repository pair.")
    for key in ("base_ref","head_ref"):
        branch=string(value[key],key)
        if (branch.startswith(("-","/")) or branch.endswith(("/",".")) or ".." in branch or "@{" in branch or
                re.search(r"[\s~^:?*\[\\\x00-\x1f\x7f]",branch) or any(not part or part.startswith(".") or part.endswith(".lock") for part in branch.split("/"))):
            fail("branch","Invalid selected branch name.")
    if value["base_ref"]==value["head_ref"]:
        fail("branch","Base and head branches must differ.")
    return value


def git_subject(binding,repository_root,base_commit,head_commit):
    repository=safe_path(repository_root)
    if not repository.is_dir() or not beneath(repository,binding.project):
        fail("repository-root","Select an existing repository inside the project.","blocked")
    for value in (base_commit,head_commit):
        if type(value) is not str or not re.fullmatch(r"(?:[0-9a-f]{40}|[0-9a-f]{64})",value):
            fail("commit","Full lowercase commit object IDs are required.")
    env={k:v for k,v in os.environ.items() if not k.startswith("GIT_")}
    env.update(GIT_CONFIG_NOSYSTEM="1",GIT_CONFIG_GLOBAL=os.devnull,GIT_ATTR_NOSYSTEM="1",
               GIT_NO_REPLACE_OBJECTS="1",GIT_NO_LAZY_FETCH="1",GIT_TERMINAL_PROMPT="0",GIT_OPTIONAL_LOCKS="0")
    prefix=["git","--no-pager","--no-replace-objects","-C",str(repository),
            "-c","core.fsmonitor=false","-c","core.attributesFile="+os.devnull,
            "-c","core.quotePath=true","-c","color.ui=false"]
    def git(*args):
        code,output,_=run_bounded([*prefix,*args],env,repository)
        if code:
            fail("git-read","Selected Git read failed or the pinned recipe is unsupported.","blocked")
        return output
    if safe_path(git("rev-parse","--show-toplevel").decode("utf-8").strip())!=repository:
        fail("repository-root","repository_root must be the exact Git root.")
    if git("rev-parse","--is-bare-repository").strip()!=b"false" or git("rev-parse","--is-shallow-repository").strip()!=b"false":
        fail("repository-kind","Bare or shallow repositories are unsupported.","unsupported")
    # Read the effective scopes: repository plus worktree when enabled. An
    # explicit --worktree read fails for multiple worktrees with that extension
    # disabled. System/global inputs remain disabled by env; inspect include
    # directives themselves without following them. Any Git error stays fatal.
    config=git("config","--no-includes","--null","--list")
    for entry in config.split(b"\x00"):
        if not entry:
            continue
        key=entry.split(b"\n",1)[0].decode("utf-8").lower()
        if (key.startswith(("diff.","include.","includeif.")) or key=="extensions.partialclone" or key.endswith(".promisor")):
            fail("git-config","Repository or worktree diff/include/promisor configuration requires separate reconciliation.","unsupported")
    for item in ("info/attributes","info/grafts"):
        location=git("rev-parse","--git-path",item).decode("utf-8").strip()
        selected=safe_path(location,repository)
        if selected.exists() and read_bytes(selected).strip():
            fail("git-overlay","Repository attribute/graft overlays are unsupported.","unsupported")
    object_format=git("rev-parse","--show-object-format").decode("ascii").strip()
    if object_format not in ("sha1","sha256"):
        fail("git-format","Unsupported Git object format.","unsupported")
    length=40 if object_format=="sha1" else 64
    for oid in (base_commit,head_commit):
        if len(oid)!=length or git("cat-file","-t",oid).strip()!=b"commit":
            fail("commit-type","Selected OIDs must identify full commits.")
    bases=git("merge-base","--all",base_commit,head_commit).decode("ascii").splitlines()
    if len(bases)!=1 or not re.fullmatch(r"[0-9a-f]{"+str(length)+r"}",bases[0]):
        fail("merge-base","A single real merge base is required.","unsupported")
    raw=git("--attr-source="+head_commit,"diff","--no-ext-diff","--no-textconv","--no-renames","--binary","--full-index","--no-color",
            "--src-prefix=a/","--dst-prefix=b/","--diff-algorithm=myers","--no-indent-heuristic","--unified=3",
            "--inter-hunk-context=0","--no-relative","--submodule=short",bases[0],head_commit,"--")
    if not raw:
        fail("empty-diff","The selected comparison contains no change.")
    try:
        patch=raw.decode("utf-8",errors="strict")
    except UnicodeError:
        fail("diff-encoding","Diff must be representable as UTF-8; raw bytes are not silently replaced.","unsupported")
    subject={"object_format":object_format,"base_commit":base_commit,"head_commit":head_commit,"merge_base":bases[0],
             "base_tree":git("rev-parse",base_commit+"^{tree}").decode("ascii").strip(),
             "head_tree":git("rev-parse",head_commit+"^{tree}").decode("ascii").strip(),
             "diff_sha256":digest(raw),"git_version":git("--version").decode("ascii").strip(),"diff_recipe":"pr.diff/v1"}
    dirty=bool(git("status","--porcelain=v1","--untracked-files=normal","--ignore-submodules=all"))
    return {"subject":subject,"diff":patch,"working_tree_dirty":dirty,"evidence_truth":"caller-supplied; binding checked, checks not executed"}

if __name__ == "__main__":
    raise SystemExit(main())
