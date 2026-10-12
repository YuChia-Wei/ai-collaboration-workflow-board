#!/usr/bin/env python3
"""pr-author.github 0.1.0: explicit GitHub PR operations via existing gh authentication.
Public local interaction uses pr-author.fs JSON requests; no private module imports.
"""
from __future__ import annotations
import argparse
import hashlib
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
from urllib.parse import quote, urlencode, urlsplit

OPERATIONS = ("provider-read", "provider-create", "provider-update")
LIMIT = 4 * 1024 * 1024
REPARSE = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
SHA256 = re.compile(r"[0-9a-f]{64}\Z")
API_VERSION = "2026-03-10"
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

def beneath(path, root):
    return path == root or root in path.parents

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



def positive_number(value):
    if type(value) is not int or value<=0:
        fail("number","An explicit positive integer PR number is required.")
    return value


def expected_hash(value):
    if type(value) is not str or not SHA256.fullmatch(value):
        fail("digest","An actual lowercase SHA-256 is required.")
    return value


def repository_name(value):
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*/[A-Za-z0-9][A-Za-z0-9_.-]*",string(value,"repository")):
        fail("repository","Expected one owner/repository pair.")
    return value.lower()


def local_operation(request,operation,**extra):
    package=safe_path(request["package_root"])
    project=safe_path(request["project_root"])
    if safe_path(str(package/"scripts/github.py"))!=Path(__file__).resolve():
        fail("package-binding","Selected package does not own this adapter.","blocked")
    script=safe_path(str(package/"scripts/pr.py"))
    if not script.is_file():
        fail("local-tool","Selected pr-author.fs entrypoint is unavailable.","unavailable")
    local={key:request[key] for key in ("project_root","package_root","project_config","local_config","overrides","write_roots") if key in request}
    local.update(operation=operation,**extra)
    env=dict(os.environ)
    env["PYTHONDONTWRITEBYTECODE"]="1"
    status,raw,_=run_bounded([sys.executable,"-B",str(script),"--request","-"],env,project,encode(local),timeout=60)
    response=parse_json(raw)
    if type(response) is not dict or response.get("operation")!=operation or response.get("mutation_state")!="none":
        fail("local-result","Invalid read-only pr-author.fs response.","failed")
    if status or response.get("outcome")!="succeeded":
        outcome=response.get("outcome")
        if outcome not in ("invalid-input","unsupported","unavailable","blocked","conflict","failed"):
            outcome="failed"
        fail("local-operation","Selected pr-author.fs read failed; inspect that operation separately.",outcome)
    return response


def api(request,method,endpoint,payload=None):
    env=dict(os.environ)
    env.pop("GH_DEBUG",None)
    env.update(GH_HOST="github.com",GH_PROMPT_DISABLED="1",GH_PAGER="cat",NO_COLOR="1")
    argv=["gh","api","--hostname","github.com","--method",method,
          "-H","Accept: application/vnd.github+json","-H","X-GitHub-Api-Version: "+API_VERSION,endpoint]
    if payload is not None:
        argv.extend(["--input","-"])
    status,raw,_=run_bounded(argv,env,safe_path(request["project_root"]),encode(payload) if payload is not None else None)
    if status:
        fail("github-request","GitHub request failed; no credentials changed and no automatic retry.","blocked")
    return parse_json(raw)


def projection(raw,repository,number):
    try:
        if type(raw) is not dict or type(raw["number"]) is not int or raw["number"]!=number:
            fail("provider-identity","Provider returned a different PR identity.","conflict")
        base,head=raw["base"],raw["head"]
        base_repo=repository_name(base["repo"]["full_name"])
        head_repo=repository_name(head["repo"]["full_name"])
        if base_repo!=repository or head_repo!=repository:
            fail("fork","Only selected same-repository PRs are supported.","unsupported")
        target=provider_target({"provider":"github","host":"github.com","repository":repository,"base_ref":base["ref"],"head_ref":head["ref"]})
        for value in (base["sha"],head["sha"]):
            if type(value) is not str or not re.fullmatch(r"(?:[0-9a-f]{40}|[0-9a-f]{64})",value):
                fail("provider-oid","Missing complete provider commit identity.")
        if raw["state"] not in ("open","closed") or type(raw["draft"]) is not bool or type(raw["merged"]) is not bool:
            fail("provider-state","Provider lifecycle fields are incomplete.")
        if type(raw["title"]) is not str or (raw["body"] is not None and type(raw["body"]) is not str):
            fail("provider-content","Provider content fields are incomplete.")
        updated=string(raw["updated_at"],"updated_at")
        if datetime.fromisoformat(updated.replace("Z","+00:00")).tzinfo is None:
            fail("provider-time","Provider timestamp requires a timezone.")
        url=urlsplit(raw["html_url"])
        if url.scheme!="https" or url.netloc!="github.com" or url.path.lower()!=f"/{repository}/pull/{number}" or url.query or url.fragment:
            fail("provider-url","Provider URL does not match selected identity.")
        value={"host":"github.com","repository":repository,"number":number,"state":raw["state"],"draft":raw["draft"],"merged":raw["merged"],
               "title":raw["title"],"body":raw["body"] or "","base_repository":base_repo,"base_ref":target["base_ref"],"base_oid":base["sha"],
               "head_repository":head_repo,"head_ref":target["head_ref"],"head_oid":head["sha"],"updated_at":updated}
        token=digest(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"),allow_nan=False).encode("utf-8"))
        return {"projection":value,"expected_state_sha256":token,"url":raw["html_url"],"observed_at":datetime.now(timezone.utc).isoformat()}
    except (KeyError,TypeError,ValueError,AttributeError):
        fail("provider-shape","Provider response lacks required observation fields.","failed")


def read_pr(request,repository,number):
    return projection(api(request,"GET",f"repos/{repository}/pulls/{number}"),repository,number)


def candidate(request):
    inspected=local_operation(request,"inspect",reference=request["reference"])
    rendered=local_operation(request,"render",reference=request["reference"],repository_root=request["repository_root"])
    if inspected["sha256"]!=rendered["sha256"]:
        fail("candidate-drift","Local proposal changed during preparation.","conflict")
    for supplied,actual in (("expected_record_sha256",inspected["sha256"]),("expected_template_sha256",rendered["template_sha256"]),("expected_body_sha256",rendered["body_sha256"])):
        if expected_hash(request[supplied])!=actual:
            fail("candidate-digest","Proposal/template/body differs from selected candidate.","conflict")
    if rendered.get("subject_verified") is not True:
        fail("subject","Actual Git source rebind is required.","blocked")
    record=inspected["record"]
    if "provider_target" not in record:
        fail("provider-target","Proposal does not select a provider target.")
    target=provider_target(record["provider_target"])
    body=rendered["view"]["markdown"]
    title=record["title"]
    if len(title)>256 or any(ord(c)<32 or ord(c)==127 for c in title) or len(body.encode("utf-8"))>60000:
        fail("provider-size","Title/body exceeds this adapter's bounded publishing contract.","unsupported")
    closing=re.compile(r"\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+(?:#\d+|[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+#\d+|https://github\.com/[^\s]+/issues/\d+)",re.I)
    def has_closing(value):
        if type(value) is str:
            return closing.search(value) is not None
        if type(value) is dict:
            return any(has_closing(child) for child in value.values())
        if type(value) is list:
            return any(has_closing(child) for child in value)
        return False
    if has_closing(record) or closing.search(body):
        fail("issue-closure","Issue-closing directives require a separate closure capability.","unsupported")
    return record,target,title,body


def bound_projection(observed,target,subject,title=None,body=None,draft=None):
    value=observed["projection"]
    if (value["state"]!="open" or value["merged"] or value["base_ref"]!=target["base_ref"] or value["head_ref"]!=target["head_ref"] or
            value["base_oid"]!=subject["base_commit"] or value["head_oid"]!=subject["head_commit"] or
            (title is not None and value["title"]!=title) or (body is not None and value["body"]!=body) or
            (draft is not None and value["draft"]!=draft)):
        fail("provider-conflict","Provider state/content/head differs from selected candidate.","conflict")


def remote_subject(request,repository,target,subject):
    for key,oid_key in (("base_ref","base_commit"),("head_ref","head_commit")):
        raw=api(request,"GET",f"repos/{repository}/git/ref/heads/{quote(target[key],safe='')}")
        if (type(raw) is not dict or raw.get("ref")!="refs/heads/"+target[key] or type(raw.get("object")) is not dict or
                raw["object"].get("type")!="commit" or raw["object"].get("sha")!=subject[oid_key]):
            fail("remote-ref","Selected remote branch moved or is unavailable.","conflict")
    compare=api(request,"GET",f"repos/{repository}/compare/{subject['base_commit']}...{subject['head_commit']}?per_page=1")
    if type(compare) is not dict or compare.get("merge_base_commit",{}).get("sha")!=subject["merge_base"]:
        fail("remote-comparison","Provider merge base differs from the selected Git comparison.","conflict")


def ensure_absent(request,repository,target):
    owner=repository.split("/",1)[0]
    for page in range(1,11):
        query=urlencode({"state":"open","head":owner+":"+target["head_ref"],"base":target["base_ref"],"per_page":100,"page":page})
        items=api(request,"GET",f"repos/{repository}/pulls?{query}")
        if type(items) is not list or len(items)>100:
            fail("provider-list","Unexpected pagination response.","failed")
        # Any returned match prevents creation. Do not claim that listing
        # observations are a server-enforced uniqueness guarantee.
        if items:
            fail("existing-pr","Matching open PR observation prevents create; select read/update explicitly.","conflict")
        if len(items)<100:
            return
    fail("provider-pagination","Complete bounded absence observation unavailable.","unsupported")


def execute(request):
    operation=request.get("operation") if type(request) is dict else None
    if operation not in OPERATIONS:
        fail("operation","Unsupported provider operation.","unsupported")
    required=("target",) if operation=="provider-read" else ("reference","repository_root","expected_record_sha256","expected_template_sha256","expected_body_sha256","write_mode","grant")
    if operation=="provider-update":
        required+=("number","expected_state_sha256")
    fields(request,("operation","project_root","package_root",*required),("project_config","local_config","overrides","write_roots"),"request")
    if not (3,11)<=sys.version_info[:2]<(4,0):
        fail("python-version","Python >=3.11,<4 is required.","unavailable")
    local_operation(request,"explain")
    state="none"
    number=None
    before=None
    repository=None
    try:
        if operation=="provider-read":
            target=fields(request["target"],("provider","host","repository","number"),label="read target")
            if target["provider"]!="github" or target["host"]!="github.com":
                fail("provider","Only explicit GitHub.com targets are supported.","unsupported")
            repository=repository_name(target["repository"])
            number=positive_number(target["number"])
            return {"outcome":"succeeded",**read_pr(request,repository,number),"mutation_state":"none"}
        if request["write_mode"]!="coordinated-single-writer":
            fail("write-mode","Server CAS is unsupported; coordinated-single-writer mode is required.","unsupported")
        record,target,title,body=candidate(request)
        repository=repository_name(target["repository"])
        grant=fields(request["grant"],("source","operation","target","body_sha256"),label="runtime grant reference")
        string(grant["source"],"grant source")
        expected_target={**target,"repository":repository}
        if operation=="provider-update":
            number=positive_number(request["number"])
            expected_target["number"]=number
        if grant["operation"]!=operation or not exact_equal(grant["target"],expected_target) or expected_hash(grant["body_sha256"])!=request["expected_body_sha256"]:
            fail("grant-binding","Runtime grant reference does not bind this operation/target/body.","blocked")
        remote_subject(request,repository,target,record["subject"])
        if operation=="provider-create":
            ensure_absent(request,repository,target)
        else:
            before=read_pr(request,repository,number)
            if before["expected_state_sha256"]!=expected_hash(request["expected_state_sha256"]):
                fail("expected-state","Provider changed since selected observation.","conflict")
            bound_projection(before,target,record["subject"])
        # Repeat only the required candidate preflight, never the write itself.
        candidate(request)
        remote_subject(request,repository,target,record["subject"])
        if operation=="provider-create":
            ensure_absent(request,repository,target)
            state="unknown"
            raw=api(request,"POST",f"repos/{repository}/pulls",{"title":title,"body":body,"base":target["base_ref"],"head":target["head_ref"],"draft":True})
            if type(raw) is not dict:
                fail("write-response","Provider write returned an incomplete result.","failed")
            number=positive_number(raw.get("number"))
            state="committed"
        else:
            final=read_pr(request,repository,number)
            if final["expected_state_sha256"]!=request["expected_state_sha256"]:
                fail("expected-state","Provider changed during preflight.","conflict")
            bound_projection(final,target,record["subject"])
            state="unknown"
            raw=api(request,"PATCH",f"repos/{repository}/pulls/{number}",{"title":title,"body":body})
            if type(raw) is not dict or type(raw.get("number")) is not int or raw["number"]!=number:
                fail("write-response","Provider write response identity is incomplete.","failed")
            state="committed"
        observed=read_pr(request,repository,number)
        bound_projection(observed,target,record["subject"],title,body,True if operation=="provider-create" else before["projection"]["draft"])
        return {"outcome":"succeeded","mutation_state":state,**observed,"subject":record["subject"],
                "record_sha256":request["expected_record_sha256"],"body_sha256":request["expected_body_sha256"],
                "authorization_reference":grant["source"],"authorization_attestation":"not-performed",
                "concurrency_guarantee":"coordinated-single-writer; no server CAS; declaration is not proof of exclusion"}
    except Fault as exc:
        if state=="unknown" and exc.code=="executable":
            state="none"  # Popen never started; no provider request was dispatched.
        return {"outcome":exc.outcome if state=="none" else "failed","mutation_state":state,"number":number,"repository":repository,
                "diagnostics":[exc.diagnostic()],"next_action":"Read the exact PR or matching target before any separately authorized retry; no rollback was performed."}
    except (Exception,KeyboardInterrupt):
        return {"outcome":"failed","mutation_state":state,"number":number,"repository":repository,
                "diagnostics":[{"code":"provider-failure","message":"Provider operation interrupted or failed; inspect before retry."}],
                "next_action":"Reconcile actual provider state; never assume no mutation from a failed command."}
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
