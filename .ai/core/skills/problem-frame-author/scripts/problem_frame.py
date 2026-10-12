#!/usr/bin/env python3
"""Owned CBF snapshot I/O. No source imports, network or target execution."""
from __future__ import annotations

import errno
import hashlib
import json
import math
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import uuid

PACKAGE = "problem-frame-author"
FAMILY = "problem-frame.cbf"
VERSION = "1.0.0"
LIMIT = 4 * 1024 * 1024
TOOLS = ("explain", "create", "inspect", "validate", "render")
DEFAULTS = {"store": {"kind": "filesystem", "root": "specs/problem-frames", "tracking": "tracked"},
            "template": {"origin": "package", "path": "templates/cbf.md"}}
HEX = re.compile(r"[0-9a-f]{64}\Z")
SNAPSHOT = re.compile(r"cbf-[0-9a-f]{32}\.cbf\.json\Z")
NAMESPACE = re.compile(r"[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*\Z")


class Fault(Exception):
    def __init__(self, outcome, code, location, message):
        super().__init__(message)
        self.outcome = outcome
        self.diagnostic = {"code": code, "location": location, "message": message}


def fail(outcome, code, location, message):
    raise Fault(outcome, code, location, message)


def require(condition, location, message, outcome="invalid-input", code="shape"):
    if not condition:
        fail(outcome, code, location, message)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def closed(value, required, optional=(), location="request"):
    require(type(value) is dict, location, "Expected an object.")
    require(set(required) <= value.keys() and value.keys() <= set(required) | set(optional),
            location, "Missing required or unknown member.")


def bounded(value, location="input", depth=0):
    require(depth <= 32, location, "Decoded nesting exceeds 32.")
    if type(value) is str:
        require(len(value) <= 16384, location, "Text exceeds 16384 characters.")
        require(not any(0xD800 <= ord(c) <= 0xDFFF for c in value), location, "Invalid Unicode.")
    elif type(value) is list:
        require(len(value) <= 1024, location, "Array exceeds 1024 items.")
        for item in value:
            bounded(item, location, depth + 1)
    elif type(value) is dict:
        for key, item in value.items():
            require(type(key) is str, location, "Object keys must be strings.")
            bounded(key, location, depth + 1)
            bounded(item, location, depth + 1)
    else:
        require(value is None or type(value) in (bool, int, float), location, "Unsupported scalar.")
        require(type(value) is not float or math.isfinite(value), location, "Nonfinite number.")


def decode(raw, location):
    require(len(raw) <= LIMIT, location, "Input exceeds 4 MiB.")
    require(not raw.startswith(b"\xef\xbb\xbf"), location, "UTF-8 BOM is unsupported.")
    try:
        text = raw.decode("utf-8", "strict")
        # Bound nesting before the standard decoder allocates recursive objects.
        level, quoted, escaped = 0, False, False
        for char in text:
            if quoted:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == '"':
                    quoted = False
            elif char == '"':
                quoted = True
            elif char in "[{":
                level += 1
                require(level <= 32, location, "JSON nesting exceeds 32.")
            elif char in "]}":
                level -= 1
        def pairs(items):
            result = {}
            for key, value in items:
                require(key not in result, location, "Duplicate JSON key.", code="duplicate-key")
                result[key] = value
            return result
        def constant(_):
            fail("invalid-input", "nonfinite", location, "Nonfinite JSON number.")
        result = json.loads(text, object_pairs_hook=pairs, parse_constant=constant)
        bounded(result, location)
        return result
    except (UnicodeError, ValueError, RecursionError):
        fail("invalid-input", "json", location, "Invalid UTF-8 JSON.")


def text_value(value, location):
    require(type(value) is str and bool(value.strip()) and len(value) <= 16384,
            location, "Expected nonblank bounded text.")
    return value


def path_value(value, base=None, location="path"):
    text_value(value, location)
    require(not any(ord(c) < 32 for c in value), location, "Control characters in path.")
    value = value.replace("\\", "/")
    require(not value.startswith("//") and "//" not in value, location, "UNC/device or aliased path.")
    # Accept only native local absolute paths or plain project-relative paths.
    if os.name != "nt":
        require(not re.match(r"^[A-Za-z]:", value), location, "Foreign drive path.")
    else:
        require(not value.startswith("/") and not re.match(r"^[A-Za-z]:(?!/)", value),
                location, "Root-relative or drive-relative path.")
    parts = value.split("/")
    for index, part in enumerate(parts):
        if index == 0 and (part == "" or re.fullmatch(r"[A-Za-z]:", part)):
            continue
        require(part not in ("", ".", "..") and not part.endswith((" ", ".")), location, "Aliased path segment.")
        require(not re.search(r'[<>:"|?*]', part), location, "Unsupported path segment.")
        require(not re.fullmatch(r"(?i:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?", part),
                location, "Reserved path segment.")
    candidate = Path(value)
    if not candidate.is_absolute():
        require(base is not None, location, "An absolute path is required.")
        candidate = base / candidate
    return candidate


def contained(path, root):
    return path == root or root in path.parents


def overlap(a, b):
    return contained(a, b) or contained(b, a)


def identity(path, location, allow_missing=False):
    current = Path(path.anchor)
    identities = []
    for part in (None, *path.parts[1:]):
        if part is not None:
            try:
                names = [entry.name for entry in os.scandir(current) if entry.name.casefold() == part.casefold()]
            except OSError:
                fail("unavailable", "path-access", location, "Cannot inspect selected path ancestors.")
            require(not names or names == [part], location, "Case or segment alias.", "blocked", "path-alias")
            current = current / part
        try:
            info = current.lstat()
        except FileNotFoundError:
            if allow_missing and current == path:
                return tuple(identities) + ((str(current), None),)
            fail("unavailable", "missing-path", location, "Selected path or ancestor does not exist.")
        except OSError:
            fail("unavailable", "path-access", location, "Cannot inspect selected path.")
        require(not stat.S_ISLNK(info.st_mode) and not getattr(info, "st_file_attributes", 0) & 0x400,
                location, "Symlink, junction or reparse path.", "blocked", "path-link")
        require(stat.S_ISDIR(info.st_mode) if current != path else
                (stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode)),
                location, "Expected regular file or directory.", "blocked", "path-kind")
        identities.append((str(current), info.st_dev, info.st_ino, stat.S_IFMT(info.st_mode)))
    return tuple(identities)


class Inputs:
    """Recheck named inputs and ancestors; never discovers source content."""
    def __init__(self):
        self.files = {}
        self.paths = {}

    def watch(self, path, location, allow_missing=False):
        observed = identity(path, location, allow_missing)
        if path in self.paths:
            require(self.paths[path][0] == observed, location, "Selected path identity changed.", "conflict", "drift")
        self.paths[path] = (observed, location, allow_missing)
        return observed

    def read(self, path, location):
        before = self.watch(path, location)
        require(path.is_file(), location, "Selected input is not a regular file.", "blocked")
        try:
            descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_BINARY", 0) | getattr(os, "O_NOFOLLOW", 0))
            with os.fdopen(descriptor, "rb") as stream:
                info = os.fstat(stream.fileno())
                require(stat.S_ISREG(info.st_mode) and (info.st_dev, info.st_ino) == before[-1][1:3],
                        location, "Input changed while opening.", "conflict", "drift")
                raw = stream.read(LIMIT + 1)
                end = os.fstat(stream.fileno())
                require((info.st_size, info.st_mtime_ns, info.st_ctime_ns) ==
                        (end.st_size, end.st_mtime_ns, end.st_ctime_ns), location, "Input changed while reading.", "conflict", "drift")
        except OSError:
            fail("io-error", "read", location, "Selected input could not be read.")
        require(len(raw) <= LIMIT, location, "Input exceeds 4 MiB.")
        require(identity(path, location) == before, location, "Input path changed.", "conflict", "drift")
        if path in self.files:
            require(self.files[path][0] == digest(raw), location, "Input bytes changed.", "conflict", "drift")
        self.files[path] = (digest(raw), location)
        return raw

    def recheck(self):
        for path, (observed, location, missing) in list(self.paths.items()):
            require(identity(path, location, missing) == observed, location, "Selected path identity changed.", "conflict", "drift")
        for path, (_, location) in list(self.files.items()):
            self.read(path, location)


def load_metadata(raw):
    try:
        import yaml
    except ImportError:
        fail("unavailable", "dependency", "package", "PyYAML >=6,<7 is required.")
    require(6 <= int(yaml.__version__.split(".")[0]) < 7, "package", "Unsupported PyYAML version.", "unavailable")
    try:
        text = raw.decode("utf-8", "strict")
        require(not text.startswith("\ufeff"), "package", "Metadata BOM is unsupported.")
        nesting = 0
        for token in yaml.scan(text):
            if isinstance(token, (yaml.tokens.BlockMappingStartToken, yaml.tokens.BlockSequenceStartToken,
                                  yaml.tokens.FlowMappingStartToken, yaml.tokens.FlowSequenceStartToken)):
                nesting += 1
                require(nesting <= 32, "package", "Metadata nesting exceeds 32.")
            elif isinstance(token, (yaml.tokens.BlockEndToken, yaml.tokens.FlowMappingEndToken, yaml.tokens.FlowSequenceEndToken)):
                nesting -= 1
            require(not isinstance(token, (yaml.tokens.AliasToken, yaml.tokens.AnchorToken)),
                    "package", "Metadata aliases and anchors are unsupported.")
        class UniqueLoader(yaml.SafeLoader):
            pass
        def mapping(loader, node):
            result = {}
            for key_node, value_node in node.value:
                key = loader.construct_object(key_node)
                require(type(key) is str and key not in result, "package", "Invalid or duplicate metadata key.")
                result[key] = loader.construct_object(value_node)
            return result
        UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, mapping)
        data = yaml.load(text, Loader=UniqueLoader)
        bounded(data, "package")
        return data
    except (UnicodeError, ValueError, RecursionError, yaml.YAMLError):
        fail("invalid-input", "metadata", "package", "Invalid bounded YAML metadata.")


def load_schema(inputs, package):
    metadata = load_metadata(inputs.read(package / "skill-package.yaml", "package.metadata"))
    require(type(metadata) is dict and type(metadata.get("metadata_version")) is int and
            metadata["metadata_version"] == 3 and metadata.get("id") == PACKAGE and
            metadata.get("version") == "0.1.0", "package", "Package identity mismatch.", "blocked")
    require(metadata.get("configuration") == {"namespace": PACKAGE, "defaults": DEFAULTS},
            "package", "Configuration defaults do not match the selected tool.", "blocked")
    resources = metadata.get("resources")
    require(type(resources) is dict, "package", "Missing resource declarations.")
    require(resources.get("schemas") == [{"id": FAMILY, "version": VERSION, "path": "schemas/cbf-record-v1.schema.json",
            "owner": PACKAGE, "migration": "unsupported; preserve original"}], "package", "Schema binding mismatch.", "blocked")
    tools = resources.get("tools")
    require(type(tools) is list and len(tools) == 1 and type(tools[0]) is dict and
            tools[0].get("id") == PACKAGE + ".fs" and tools[0].get("owner") == PACKAGE and
            tools[0].get("entrypoint") == "scripts/problem_frame.py" and tools[0].get("operations") == list(TOOLS),
            "package", "Tool binding mismatch.", "blocked")
    require(resources.get("templates") == [{"id": "problem-frame.cbf.default-view", "path": "templates/cbf.md",
            "input_role": FAMILY, "output_role": FAMILY + "-view", "owner": PACKAGE}],
            "package", "Template role binding mismatch.", "blocked")
    script = package / "scripts/problem_frame.py"
    require(Path(os.path.abspath(__file__)) == script, "package_root", "Executable does not belong to selected package.", "blocked")
    inputs.read(script, "package.executable")
    schema = decode(inputs.read(package / "schemas/cbf-record-v1.schema.json", "package.schema"), "package.schema")
    def refs(value):
        if type(value) is dict:
            for key, child in value.items():
                if key == "$ref":
                    require(type(child) is str and child.startswith("#/$defs/"), "package.schema", "Only contained definition references are allowed.")
                require(key not in ("$id", "$dynamicRef", "$recursiveRef"), "package.schema", "External schema resolution is forbidden.")
                refs(child)
        elif type(value) is list:
            for child in value:
                refs(child)
    require(type(schema) is dict and schema.get("$schema") == "https://json-schema.org/draft/2020-12/schema",
            "package.schema", "Require the owned Draft 2020-12 schema.", "blocked")
    refs(schema)
    try:
        from importlib.metadata import version
        from jsonschema import Draft202012Validator
        from referencing import Registry
        from referencing.exceptions import NoSuchResource
        require((4, 18) <= tuple(int(n) for n in version("jsonschema").split(".")[:2]) < (5, 0),
                "package", "Unsupported jsonschema version.", "unavailable")
        def refuse(uri):
            raise NoSuchResource(ref=uri)
        Draft202012Validator.check_schema(schema)
        return Draft202012Validator(schema, registry=Registry(retrieve=refuse))
    except ImportError:
        fail("unavailable", "dependency", "package", "jsonschema >=4.18,<5 with referencing is required.")
    except Fault:
        raise
    except Exception:
        fail("blocked", "schema", "package.schema", "Owned schema could not be initialized.")


def settings(value, location):
    closed(value, (), ("store", "template"), location)
    if "store" in value:
        closed(value["store"], (), ("kind", "root", "tracking"), location + ".store")
        for key, item in value["store"].items():
            text_value(item, location + ".store." + key)
            require(key != "kind" or item == "filesystem", location, "Unsupported store kind.")
            require(key != "tracking" or item in ("tracked", "ignored"), location, "Unsupported tracking intent.")
    if "template" in value:
        closed(value["template"], ("origin", "path"), location=location + ".template")
        require(value["template"]["origin"] in ("package", "project"), location, "Unsupported template origin.")
        text_value(value["template"]["path"], location + ".template.path")
    return value


def merge_settings(base, patch, origin, origins):
    merged = {"store": dict(base["store"]), "template": dict(base["template"])}
    for key, value in patch.get("store", {}).items():
        merged["store"][key] = value
        origins["store." + key] = origin
    if "template" in patch:
        merged["template"] = dict(patch["template"])
        origins["template"] = origin
    return merged


def prove_local_ignored(project, local):
    if not any((parent / ".git").exists() for parent in (project, *project.parents)):
        return
    require(contained(local, project), "local_config", "Local Git configuration must be project-contained.", "blocked")
    environment = {key: value for key, value in os.environ.items() if not key.upper().startswith("GIT_")}
    environment.update({"GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull, "GIT_OPTIONAL_LOCKS": "0"})
    relative = local.relative_to(project).as_posix()
    def git(arguments):
        try:
            return subprocess.run(["git", "--no-optional-locks", "--literal-pathspecs", "-c", "core.fsmonitor=false", "-C", str(project), *arguments],
                                  env=environment, capture_output=True, timeout=10, check=False).returncode
        except (OSError, subprocess.TimeoutExpired):
            fail("unavailable", "git", "local_config", "Read-only Git proof is unavailable.")
    require(git(["ls-files", "--error-unmatch", "--", relative]) == 1 and
            git(["check-ignore", "-q", "--", relative]) == 0,
            "local_config", "Selected local configuration must be proven ignored and untracked.", "blocked", "local-git")


def load_config(inputs, request, key, project):
    if key not in request:
        return {}, {}, None
    path = path_value(request[key], project, key)
    require(contained(path, project), key, "Configuration must be project-contained.", "blocked")
    config = decode(inputs.read(path, key), key)
    closed(config, ("config_version",), ("skills", "constraints") if key == "project_config" else ("skills",), key)
    require(type(config["config_version"]) is int and config["config_version"] == 2,
            key, "Only exact integer config_version 2 is supported.", "unsupported-version")
    for section in ("skills", "constraints"):
        if section not in config:
            continue
        require(type(config[section]) is dict, key, "Namespace map must be an object.")
        for namespace, value in config[section].items():
            require(NAMESPACE.fullmatch(namespace) is not None and type(value) is dict,
                    key, "Each namespace must be a named object.")
    own = settings(config.get("skills", {}).get(PACKAGE, {}), key + ".skills.own")
    constraints = config.get("constraints", {}).get(PACKAGE, {})
    closed(constraints, (), ("write_roots", "locked_fields"), key + ".constraints.own")
    for field in ("write_roots", "locked_fields"):
        if field in constraints:
            items = constraints[field]
            require(type(items) is list and all(type(item) is str and item.strip() for item in items) and
                    len(items) == len(set(items)), key, "Constraint array must contain unique text.")
    if "write_roots" in constraints:
        require(bool(constraints["write_roots"]), key, "Write roots cannot be empty.")
    require(all(item in ("store.root", "store.tracking", "template") for item in constraints.get("locked_fields", [])),
            key, "Unknown locked field.")
    if key == "local_config":
        prove_local_ignored(project, path)
    return own, constraints, path


def template_text(raw):
    try:
        text = raw.decode("utf-8", "strict")
    except UnicodeError:
        fail("invalid-input", "template", "template", "Template must be UTF-8.")
    bounded(text, "template")
    require(not text.startswith("\ufeff"), "template", "Template BOM is unsupported.")
    tokens = re.findall(r"\{\{.*?\}\}", text, flags=re.DOTALL)
    require(tokens.count("{{body}}") == 1 and all(token in ("{{id}}", "{{title}}", "{{body}}") for token in tokens),
            "template", "Require body exactly once and only id/title/body literal placeholders.")
    remainder = re.sub(r"\{\{(?:id|title|body)\}\}", "", text)
    require("{{" not in remainder and "}}" not in remainder, "template", "Invalid placeholder.")
    return text


def configure(inputs, request):
    project = path_value(request["project_root"], location="project_root")
    package = path_value(request["package_root"], location="package_root")
    inputs.watch(project, "project_root")
    inputs.watch(package, "package_root")
    require(project.is_dir() and package.is_dir(), "roots", "Project and package roots must be directories.")
    validator = load_schema(inputs, package)
    project_settings, constraints, project_config = load_config(inputs, request, "project_config", project)
    local_settings, _, local_config = load_config(inputs, request, "local_config", project)
    origins = {key: "package" for key in ("store.kind", "store.root", "store.tracking", "template")}
    baseline = merge_settings(DEFAULTS, project_settings, "project", origins)
    effective = merge_settings(baseline, local_settings, "local", origins)
    effective = merge_settings(effective, settings(request.get("overrides", {}), "overrides"), "invocation", origins)
    for field in constraints.get("locked_fields", []):
        first, _, second = field.partition(".")
        baseline_value = baseline[first][second] if second else baseline[first]
        effective_value = effective[first][second] if second else effective[first]
        require(baseline_value == effective_value, "configuration", "A locked field changed.", "blocked", "locked-field")
    baseline_store = path_value(baseline["store"]["root"], project, "store.root")
    store = path_value(effective["store"]["root"], project, "store.root")
    require(store != Path(store.anchor), "store.root", "Volume-root stores are forbidden.", "blocked")
    allowed = [path_value(item, project, "constraints.write_roots") for item in constraints.get("write_roots", [str(baseline_store)])]
    if not contained(store, project):
        require("write_roots" in constraints, "store.root", "External stores require explicit project write roots and task authority.", "blocked")
    caller_roots = allowed
    if "write_roots" in request:
        items = request["write_roots"]
        require(type(items) is list and bool(items) and all(type(item) is str for item in items) and len(set(items)) == len(items),
                "write_roots", "Caller roots must be a nonempty unique array.")
        caller_roots = [path_value(item, project, "write_roots") for item in items]
        require(all(any(contained(root, parent) for parent in allowed) for root in caller_roots),
                "write_roots", "Caller roots cannot broaden project/default authority.", "blocked")
    require(any(contained(store, root) for root in allowed) and any(contained(store, root) for root in caller_roots),
            "store.root", "Store exceeds effective write roots.", "blocked")
    template_setting = effective["template"]
    if template_setting["origin"] == "package":
        require(template_setting["path"] == "templates/cbf.md", "template", "Select the declared package template.")
        template = package / "templates/cbf.md"
    else:
        template = path_value(template_setting["path"], project, "template")
        require(contained(template, project), "template", "Project template escapes project root.", "blocked")
    for protected in (package, project_config, local_config, template):
        if protected is not None:
            require(not overlap(store, protected), "store.root", "Store overlaps protected package, config or template.", "blocked")
    prerequisites = []
    for path, location in [(store, "store"), *[(root, "write_roots") for root in allowed + caller_roots]]:
        try:
            inputs.watch(path, location)
            require(path.is_dir(), location, "Store and write roots must be existing directories.", "unavailable")
        except Fault as error:
            if request["operation"] == "explain" and error.diagnostic["code"] == "missing-path":
                prerequisites.append(location + ": existing directory required")
            else:
                raise
    selected_template = None
    try:
        selected_template = template_text(inputs.read(template, "template"))
    except Fault as error:
        if request["operation"] == "explain" and error.diagnostic["code"] == "missing-path":
            prerequisites.append("template: selected file required")
        else:
            raise
    return {"project": project, "package": package, "store": store, "validator": validator,
            "template": selected_template, "local_config": local_config,
            "explanation": {"settings": effective, "origins": origins, "config_version": 2,
                            "locked_fields": constraints.get("locked_fields", []),
                            "write_roots": [str(root) for root in caller_roots],
                            "family": FAMILY, "schema_version": VERSION,
                            "runtime_capability": "not-probed", "tracking": "intent-only",
                            "prerequisites": sorted(set(prerequisites))}}


def validate_structure(record, raw, validator):
    require(type(record) is dict, "record", "Expected a JSON object.")
    for field in ("family", "schema_version"):
        require(type(record.get(field)) is str, "record." + field, "Required exact string discriminator.")
    require(record["family"] == FAMILY, "record.family", "Unsupported family; preserve original.", "unsupported-family")
    require(record["schema_version"] == VERSION, "record.schema_version", "Unsupported exact version; preserve original.", "unsupported-version")
    try:
        error = next(validator.iter_errors(record), None)
    except Exception:
        fail("blocked", "schema", "package.schema", "Owned structural validator is unavailable.")
    if error is not None:
        # No user values or schema error text is echoed into diagnostics.
        fail("invalid-input", "schema", "record", "Record violates the closed owned schema.")
    sources = {source["id"] for source in record["sources"]}
    require(len(sources) == len(record["sources"]), "record.sources", "Duplicate source ID.")
    statements = {statement["id"] for statement in record["statements"]}
    claims, inventory, related = [], [], set()
    for index, statement in enumerate(record["statements"]):
        claims.append(statement)
        inventory.append({"id": statement["id"], "kind": "statement", "pointer": f"/statements/{index}", "scenario_id": None})
    for index, scenario in enumerate(record["scenarios"]):
        require(set(scenario["source_ids"]) <= sources, "record.scenarios", "Unknown source reference.")
        inventory.append({"id": scenario["id"], "kind": "scenario", "pointer": f"/scenarios/{index}", "scenario_id": scenario["id"]})
        for then_index, assertion in enumerate(scenario["then"]):
            require(set(assertion["statement_ids"]) <= statements, "record.scenarios.then", "Unknown statement reference.")
            claims.append(assertion)
            inventory.append({"id": assertion["id"], "kind": "assertion", "pointer": f"/scenarios/{index}/then/{then_index}", "scenario_id": scenario["id"]})
    claim_ids = [item["id"] for item in inventory]
    all_ids = claim_ids + [question["id"] for question in record["open_questions"]]
    require(len(all_ids) == len(set(all_ids)), "record", "Duplicate statement/scenario/assertion/question ID.")
    for question in record["open_questions"]:
        require(set(question["related_ids"]) <= set(claim_ids), "record.open_questions", "Unknown or incorrectly typed related reference.")
        related.update(question["related_ids"])
    for claim in claims:
        require(set(claim["source_ids"]) <= sources, "record", "Unknown source reference.")
        if claim["basis"] == "unresolved":
            require(claim["id"] in related, "record.open_questions", "Every unresolved statement or assertion needs an open question link.")
    require({"actor", "command", "controlled-domain"} <= {item["category"] for item in record["statements"]},
            "record.statements", "Actor, command and controlled-domain statements are required.")
    require(record["derived_from"] is None or record["derived_from"] in sources,
            "record.derived_from", "Predecessor must reference a source ID.")
    return {"contract": "problem-frame.cbf.structural-result@1.0.0", "status": "valid",
            "family": FAMILY, "schema_version": VERSION, "id": record["id"], "subject_sha256": digest(raw),
            "criterion_inventory": inventory,
            "counts": {kind: sum(item["kind"] == kind for item in inventory) for kind in ("statement", "scenario", "assertion")},
            "unresolved_ids": [claim["id"] for claim in claims if claim["basis"] == "unresolved"],
            "source_ids": [source["id"] for source in record["sources"]],
            "question_ids": [question["id"] for question in record["open_questions"]]}


def read_record(inputs, path, validator, expected=None, response=None):
    raw = inputs.read(path, "record")
    if response is not None:
        response["subject_sha256"] = digest(raw)
    require(expected is None or digest(raw) == expected, "expected_sha256", "Selected record digest differs.", "conflict", "digest")
    if path.suffix.lower() in (".yaml", ".yml"):
        fail("unsupported-format", "legacy", "reference", "Legacy YAML/SWF is preserved; no machine reader or migration.")
    record = decode(raw, "record")
    structure = validate_structure(record, raw, validator)
    require(path.name == record["id"] + ".cbf.json", "reference", "Reference does not match snapshot identity.")
    return record, raw, structure


def escaped(text):
    text = str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return re.sub(r"([\\`*_{}\[\]()#+.!|~>-])", r"\\\1", text).replace("\n", "<br>\n").replace("\r", "&#13;")


def render_record(record, template):
    # Traverse the whole validated record; no omitted fields or fetched links.
    lines = []
    def visit(value, label, level):
        prefix = "  " * level + "- "
        if type(value) is dict:
            lines.append(prefix + escaped(label))
            for key, child in value.items():
                visit(child, key, level + 1)
        elif type(value) is list:
            lines.append(prefix + escaped(label) + (": []" if not value else ""))
            for index, child in enumerate(value):
                visit(child, str(index), level + 1)
        else:
            lines.append(prefix + escaped(label) + ": " + escaped("null" if value is None else value))
    visit(record, "Snapshot", 0)
    substitutions = {"id": escaped(record["id"]), "title": escaped(record["title"]), "body": "\n".join(lines)}
    return re.sub(r"\{\{(id|title|body)\}\}", lambda match: substitutions[match.group(1)], template)


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


def local_backend(directory):
    """Select a bounded local hard-link backend; no publication probe."""
    if os.name == "nt":
        import ctypes
        from ctypes import wintypes
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.GetVolumePathNameW.argtypes = (wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD)
        kernel.GetDriveTypeW.argtypes = (wintypes.LPCWSTR,)
        kernel.GetVolumeInformationW.argtypes = (wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD,
                                               ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p,
                                               wintypes.LPWSTR, wintypes.DWORD)
        volume, filesystem = ctypes.create_unicode_buffer(32768), ctypes.create_unicode_buffer(64)
        require(bool(kernel.GetVolumePathNameW(str(directory), volume, len(volume))),
                "store", "Local volume identity unavailable.", "unavailable")
        require(kernel.GetDriveTypeW(volume.value) in (3, 6), "store", "Only local fixed/RAM volumes are selected.", "unavailable")
        if not kernel.GetVolumeInformationW(volume.value, None, 0, None, None, None, filesystem, len(filesystem)):
            require(ctypes.get_last_error() == 144, "store", "Local filesystem observation failed.", "unavailable")
            try:
                filesystem.value = _windows_handle_filesystem(directory, volume.value, kernel)
            except OSError:
                fail("unavailable", "filesystem", "store", "Direct write volume cannot be verified.")
        require(filesystem.value == "NTFS", "store", "This backend requires local NTFS hard links.", "unavailable")
        return "windows-ntfs-hard-link"
    if sys.platform == "linux":
        try:
            # Bind to the selected directory's actual mount, including stacked mounts.
            descriptor = os.open(directory, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
            try:
                with open(f"/proc/self/fdinfo/{descriptor}", "r", encoding="utf-8") as stream:
                    info = stream.read(4096)
                mount_ids = [line.split(":", 1)[1].strip() for line in info.splitlines() if line.startswith("mnt_id:")]
                require(len(mount_ids) == 1, "store", "Selected mount identity unavailable.", "unavailable")
                with open("/proc/self/mountinfo", "r", encoding="utf-8") as stream:
                    raw = stream.read(LIMIT + 1)
                require(len(raw) <= LIMIT, "store", "Mount identity unavailable.", "unavailable")
                selected = [line.split(" - ", 1)[1].split()[0] for line in raw.splitlines()
                            if line.split(" ", 1)[0] == mount_ids[0]]
                require(len(selected) == 1 and selected[0] in ("ext4", "xfs", "btrfs", "tmpfs"),
                        "store", "No selected local Linux hard-link backend.", "unavailable")
            finally:
                os.close(descriptor)
            require(all(function in os.supports_dir_fd for function in (os.open, os.link, os.unlink)),
                    "store", "Directory-relative publication is unavailable.", "unavailable")
            return "linux-local-hard-link"
        except (OSError, ValueError, IndexError):
            fail("unavailable", "backend", "store", "Local mount identity unavailable.")
    fail("unavailable", "backend", "store", "No supported local no-clobber backend.")


class PublicationDirectory:
    """Pin NTFS ancestors against rename, or use a Linux directory descriptor."""
    def __init__(self, directory):
        self.directory = directory
        self.descriptor = None
        self.handles = []
        self.kernel = None

    def __enter__(self):
        if os.name == "nt":
            import ctypes
            from ctypes import wintypes
            self.kernel = ctypes.WinDLL("kernel32", use_last_error=True)
            self.kernel.CreateFileW.argtypes = (wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
                                               ctypes.c_void_p, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE)
            self.kernel.CreateFileW.restype = wintypes.HANDLE
            self.kernel.CloseHandle.argtypes = (wintypes.HANDLE,)
            try:
                for parent in reversed((self.directory, *self.directory.parents)):
                    handle = self.kernel.CreateFileW(str(parent), 0x80, 3, None, 3, 0x02200000, None)
                    require(handle != ctypes.c_void_p(-1).value, "store", "Cannot pin publication ancestors.", "unavailable")
                    self.handles.append(handle)
            except BaseException:
                self.__exit__(None, None, None)
                raise
        else:
            self.descriptor = os.open(self.directory, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        return self

    def __exit__(self, *_):
        if self.descriptor is not None:
            os.close(self.descriptor)
            self.descriptor = None
        for handle in reversed(self.handles):
            self.kernel.CloseHandle(handle)
        self.handles.clear()

    def create_stage(self, name):
        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_BINARY", 0) | getattr(os, "O_NOFOLLOW", 0)
        if self.descriptor is None:
            return os.open(self.directory / name, flags, 0o600)
        return os.open(name, flags, 0o600, dir_fd=self.descriptor)

    def info(self, name):
        if self.descriptor is None:
            return (self.directory / name).lstat()
        return os.stat(name, dir_fd=self.descriptor, follow_symlinks=False)

    def publish(self, source, destination):
        if self.descriptor is None:
            os.link(self.directory / source, self.directory / destination, follow_symlinks=False)
        else:
            os.link(source, destination, src_dir_fd=self.descriptor, dst_dir_fd=self.descriptor, follow_symlinks=False)

    def remove(self, name):
        if self.descriptor is None:
            os.unlink(self.directory / name)
        else:
            os.unlink(name, dir_fd=self.descriptor)


def create_record(inputs, context, request, response):
    record = request["record"]
    raw = (json.dumps(record, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False) + "\n").encode("utf-8")
    require(len(raw) <= LIMIT, "record", "Canonical record exceeds 4 MiB.")
    # The producer consumes exactly the same decoding and validator as the reader.
    validate_structure(decode(raw, "record"), raw, context["validator"])
    reference = request["reference"]
    require(reference == record["id"] + ".cbf.json", "reference", "Create requires the exact <id>.cbf.json filename.")
    destination = context["store"] / reference
    require(not os.path.lexists(destination), "reference", "Destination already exists, including equal bytes.", "conflict", "collision")
    local_backend(context["store"])
    stage = ".cbf-stage-" + uuid.uuid4().hex + ".tmp"
    stage_identity = None
    started = False
    error = None
    with PublicationDirectory(context["store"]) as directory:
        inputs.recheck()
        if directory.descriptor is not None:
            pinned = os.fstat(directory.descriptor)
            require((pinned.st_dev, pinned.st_ino) == inputs.paths[context["store"]][0][-1][1:3],
                    "store", "Pinned directory differs from selected store.", "conflict", "drift")
        try:
            descriptor = directory.create_stage(stage)
            # Record the name immediately; a later fstat/flush failure must retain it.
            response["residue"] = [stage]
            with os.fdopen(descriptor, "wb") as stream:
                stage_info = os.fstat(stream.fileno())
                stage_identity = (stage_info.st_dev, stage_info.st_ino)
                stream.write(raw)
                stream.flush()
                os.fsync(stream.fileno())
            inputs.recheck()
            if context["local_config"] is not None:
                prove_local_ignored(context["project"], context["local_config"])
            current_stage = directory.info(stage)
            require((current_stage.st_dev, current_stage.st_ino) == stage_identity and stat.S_ISREG(current_stage.st_mode),
                    "publication", "Staging identity changed.", "conflict", "drift")
            staged_raw = inputs.read(context["store"] / stage, "publication.stage")
            require(staged_raw == raw, "publication", "Staging bytes changed.", "conflict", "drift")
            inputs.recheck()
            started = True
            directory.publish(stage, reference)
            response.update(changed=True, mutation_state="published")
            published, persisted, structure = read_record(inputs, destination, context["validator"], digest(raw), response)
            require(persisted == raw, "publication", "Published read-back bytes differ.", "io-error", "read-back")
            response["result"] = {"structure": structure, "record": published}
        except BaseException as caught:
            if isinstance(caught, FileExistsError):
                error = (Fault("conflict", "collision", "reference", "Destination already exists; no overwrite.")
                         if started else Fault("conflict", "stage-collision", "publication.stage", "Exclusive stage already exists; no overwrite."))
                started = False
            elif isinstance(caught, Fault):
                error = caught
            elif isinstance(caught, NotImplementedError) or (isinstance(caught, OSError) and caught.errno in (errno.EXDEV, errno.ENOSYS, errno.EOPNOTSUPP, errno.EPERM)):
                error = Fault("unavailable", "publication", "store", "No-clobber publication unavailable on selected backend.")
            else:
                error = Fault("io-error", "publication", "reference", "Publication interrupted or failed; inspect exact destination before retry.")
            if started and response["mutation_state"] != "published":
                try:
                    observed = directory.info(reference)
                    if stage_identity == (observed.st_dev, observed.st_ino):
                        response.update(changed=True, mutation_state="published")
                    else:
                        response.update(changed=None, mutation_state="uncertain")
                except FileNotFoundError:
                    response.update(changed=False, mutation_state="none")
                except OSError:
                    response.update(changed=None, mutation_state="uncertain")
        finally:
            if stage_identity is not None:
                try:
                    observed = directory.info(stage)
                    require(stage_identity == (observed.st_dev, observed.st_ino), "publication.stage",
                            "Stage changed; residue retained for caller inspection.", "io-error", "cleanup")
                    directory.remove(stage)
                    response["residue"] = []
                except FileNotFoundError:
                    response["residue"] = []
                except (OSError, Fault):
                    response["diagnostics"].append({"code": "cleanup", "location": "publication.stage",
                                                    "message": "Known stage residue retained; no broad cleanup attempted."})
                    if error is None:
                        error = Fault("io-error", "cleanup", "publication.stage", "Publication completed but stage cleanup failed.")
        if error is not None:
            raise error


def request_shape(request):
    require(type(request) is dict and type(request.get("operation")) is str and request["operation"] in TOOLS,
            "request.operation", "Required operation must be explain/create/inspect/validate/render.")
    operation = request["operation"]
    required = {"operation", "project_root", "package_root"}
    optional = {"project_config", "local_config", "overrides", "write_roots"}
    if operation != "explain":
        required.add("reference")
    if operation == "create":
        required.add("record")
    elif operation != "explain":
        optional.add("expected_sha256")
    closed(request, required, optional)
    if "expected_sha256" in request:
        require(type(request["expected_sha256"]) is str and HEX.fullmatch(request["expected_sha256"]) is not None,
                "expected_sha256", "Expected an exact lowercase SHA-256.")
    if "reference" in request:
        text_value(request["reference"], "reference")
        require(type(request["reference"]) is str and "/" not in request["reference"] and "\\" not in request["reference"]
                and not Path(request["reference"]).is_absolute(), "reference", "Select one flat store-relative filename.")
        require(request["reference"] not in (".", "..") and not request["reference"].endswith((" ", "."))
                and not re.search(r'[<>:"|?*\x00-\x1f]', request["reference"])
                and not re.fullmatch(r"(?i:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?", request["reference"]),
                "reference", "Aliased or reserved filename.")
        if operation == "create":
            require(SNAPSHOT.fullmatch(request["reference"]) is not None, "reference", "Expected <id>.cbf.json.")


def main(argv=None):
    response = {"operation": None, "outcome": "ok", "changed": False, "mutation_state": "none",
                "reference": None, "subject_sha256": None, "result": None, "diagnostics": [], "residue": []}
    try:
        require((3, 11) <= sys.version_info[:2] < (4, 0), "runtime", "Python >=3.11,<4 is required.", "unavailable")
        # Parse only this tiny argv protocol so failures still have one JSON response.
        arguments = list(sys.argv[1:] if argv is None else argv)
        require(len(arguments) == 2 and arguments[0] == "--request", "argv", "Use --request <absolute JSON file>.")
        inputs = Inputs()
        request_path = path_value(arguments[1], location="request_file")
        request = decode(inputs.read(request_path, "request_file"), "request")
        request_shape(request)
        response["operation"] = request["operation"]
        response["reference"] = request.get("reference")
        context = configure(inputs, request)
        if request["operation"] == "explain":
            response["result"] = context["explanation"]
        elif request["operation"] == "create":
            create_record(inputs, context, request, response)
        else:
            local_backend(context["store"])
            path = context["store"] / request["reference"]
            record, _, structure = read_record(inputs, path, context["validator"], request.get("expected_sha256"), response)
            response["result"] = {"structure": structure}
            if request["operation"] == "inspect":
                response["result"]["record"] = record
            elif request["operation"] == "render":
                response["result"]["markdown"] = render_record(record, context["template"])
            inputs.recheck()
    except Fault as error:
        response["outcome"] = error.outcome
        response["diagnostics"].append(error.diagnostic)
        response["result"] = None
    except (Exception, KeyboardInterrupt):
        response["outcome"] = "io-error"
        response["result"] = None
        response["diagnostics"].append({"code": "operation", "location": "operation", "message": "Operation failed; no runtime compliance claim."})
    sys.stdout.write(json.dumps(response, ensure_ascii=True, allow_nan=False, separators=(",", ":")) + "\n")
    return 0 if response["outcome"] == "ok" else (2 if response["outcome"] in
           ("invalid-input", "unsupported-family", "unsupported-version", "unsupported-format") else
           3 if response["outcome"] in ("conflict", "blocked") else 4)


if __name__ == "__main__":
    raise SystemExit(main())
