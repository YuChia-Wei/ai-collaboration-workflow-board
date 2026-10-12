"""Check the repository's source layout and generated-artifact policy."""

from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[2]
SOURCE_EXTENSIONS = {".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".html", ".css", ".sh"}
GENERATED_DIRECTORIES = {
    "dist", "build", "node_modules", "__pycache__", "coverage", ".runtime",
    ".preview", ".sites-runtime", ".sites-checkout", ".wrangler",
}


def main():
    # Include untracked source during development, but omit ignored runtime output.
    paths = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT,
    ).decode("utf-8").split("\0")
    errors = []
    for name in sorted(set(paths) - {""}):
        path = Path(name)
        if not (ROOT / path).is_file():
            continue  # A moved file can still be in the index before staging.
        if set(path.parts) & GENERATED_DIRECTORIES or path.suffix in {".pyc", ".zip", ".gz"}:
            errors.append(f"Generated artifact must not be tracked: {name}")
        if path.suffix in SOURCE_EXTENSIONS and path.parts[0] != "src":
            errors.append(f"Project code must live under src/: {name}")
    if errors:
        raise SystemExit("\n".join(errors))
    print("Source layout and generated-artifact policy passed")


if __name__ == "__main__":
    main()
