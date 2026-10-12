"""Check the repository's source layout and generated-artifact policy."""

from pathlib import Path
import hashlib
import json
import subprocess


ROOT = Path(__file__).resolve().parents[2]
SOURCE_EXTENSIONS = {".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".html", ".css", ".sh"}
GENERATED_DIRECTORIES = {
    "dist", "build", "node_modules", "__pycache__", "coverage", ".runtime",
    ".preview", ".sites-runtime", ".sites-checkout", ".wrangler",
}


def framework_inventory():
    """Permit only unchanged, src-originated members of the installed package."""
    lock_path = ROOT / ".ai/framework.lock"
    if not lock_path.exists():
        return set(), []
    errors = []
    managed = set()
    try:
        lock = json.loads(lock_path.read_text(encoding="utf-8"))
        selection_path = ROOT / ".ai/custom/installation.json"
        if json.loads(selection_path.read_text(encoding="utf-8")) != lock["selection"]["desired"]:
            errors.append("Framework selection differs from installed lock")
        entries = {item["destination"]: item for item in lock["inventory"]["files"]}
        templates = {item["source"]["sha256"] for item in lock.get("catalog_inventory", {}).get("files", [])
                     if item["kind"] == "adapter" and item["source"]["path"].startswith("src/adapters/")}
        for item in lock["inventory"]["files"]:
            name = item["destination"]
            path = Path(name)
            if (path.is_absolute() or ".." in path.parts or "\\" in name
                    or not name.startswith((".ai/core/", ".agents/skills/"))):
                errors.append(f"Invalid Framework destination: {name}")
                continue
            source = item["source"]
            if item["kind"] == "runtime":
                binding = item["binding"]
                core = entries.get(binding["core_entrypoint"], {})
                source = core.get("source")
                if binding["template_sha256"] not in templates:
                    errors.append(f"Framework runtime template is unverified: {name}")
                    continue
            if not source or not source["path"].startswith("src/"):
                errors.append(f"Framework member must originate in src/: {name}")
                continue
            target = ROOT / path
            if any(parent.is_symlink() or parent.is_junction()
                   for parent in [target, *target.parents] if parent != ROOT.parent):
                errors.append(f"Linked Framework member: {name}")
                continue
            if not target.is_file() or hashlib.sha256(target.read_bytes()).hexdigest() != item["sha256"]:
                errors.append(f"Framework managed bytes differ: {name}")
                continue
            if name in managed:
                errors.append(f"Duplicate Framework destination: {name}")
            managed.add(name)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        errors.append(f"Cannot verify Framework inventory: {type(exc).__name__}")
    return managed, errors


def main():
    # Include untracked source during development, but omit ignored runtime output.
    paths = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT,
    ).decode("utf-8").split("\0")
    managed, errors = framework_inventory()
    for name in sorted(set(paths) - {""}):
        path = Path(name)
        if not (ROOT / path).is_file():
            continue  # A moved file can still be in the index before staging.
        if set(path.parts) & GENERATED_DIRECTORIES or path.suffix in {".pyc", ".zip", ".gz"}:
            errors.append(f"Generated artifact must not be tracked: {name}")
        if name.startswith((".ai/core/", ".agents/skills/")) and name not in managed:
            errors.append(f"Unmanaged Framework file: {name}")
        if path.suffix in SOURCE_EXTENSIONS and path.parts[0] != "src" and name not in managed:
            errors.append(f"Project code must live under src/: {name}")
    if errors:
        raise SystemExit("\n".join(errors))
    print("Source layout and generated-artifact policy passed")


if __name__ == "__main__":
    main()
