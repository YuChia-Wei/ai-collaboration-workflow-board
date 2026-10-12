"""Regression coverage for the narrowly scoped Framework source-policy exception."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from src.tools import check_repository


class FrameworkPolicyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.name = ".ai/core/skills/example/scripts/tool.py"
        self.target = self.root / self.name
        self.target.parent.mkdir(parents=True)
        self.target.write_bytes(b"print('installed')\n")
        (self.root / ".ai/custom").mkdir()
        (self.root / ".ai/custom/installation.json").write_text("{}")
        self.item = {"destination": self.name, "kind": "payload", "source": {"path": "src/skills/example/scripts/tool.py"},
                     "sha256": hashlib.sha256(self.target.read_bytes()).hexdigest()}
        self.write_lock()
        self.root_patch = patch.object(check_repository, "ROOT", self.root)
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)

    def write_lock(self):
        (self.root / ".ai/framework.lock").write_text(json.dumps({
            "selection": {"desired": {}}, "inventory": {"files": [self.item]}}))

    def run_policy(self, *names):
        with patch.object(check_repository.subprocess, "check_output", return_value="\0".join(names).encode()):
            check_repository.main()

    def test_unchanged_member_is_allowed(self):
        self.run_policy(self.name)

    def test_modified_member_fails(self):
        self.target.write_bytes(b"print('changed')\n")
        with self.assertRaisesRegex(SystemExit, "managed bytes differ"):
            self.run_policy(self.name)

    def test_unlisted_code_is_rejected_inside_and_outside_managed_roots(self):
        for name in (".ai/core/extra.py", "other/tool.py"):
            with self.subTest(name=name):
                target = self.root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text("pass\n")
                with self.assertRaisesRegex(SystemExit, "Project code must live under src"):
                    self.run_policy(self.name, name)

    def test_non_src_provenance_fails(self):
        self.item["source"]["path"] = "tools/tool.py"
        self.write_lock()
        with self.assertRaisesRegex(SystemExit, "must originate in src"):
            self.run_policy(self.name)

    def test_escaped_inventory_destination_fails(self):
        self.item["destination"] = ".ai/core/../../other.py"
        self.write_lock()
        with self.assertRaisesRegex(SystemExit, "Invalid Framework destination"):
            self.run_policy(self.name)

    def test_selection_drift_fails(self):
        (self.root / ".ai/custom/installation.json").write_text('{"skills": ["extra"]}')
        with self.assertRaisesRegex(SystemExit, "selection differs"):
            self.run_policy(self.name)

    def test_runtime_entry_requires_src_template_and_core_binding(self):
        runtime_name = ".agents/skills/example/SKILL.md"
        runtime = self.root / runtime_name
        runtime.parent.mkdir(parents=True)
        runtime.write_bytes(b"Runtime entry\n")
        template = {"kind": "adapter", "source": {"path": "src/adapters/codex/entry.md", "sha256": "a" * 64}}
        entry = {"destination": runtime_name, "kind": "runtime", "source": None,
                 "binding": {"core_entrypoint": self.name, "template_sha256": "a" * 64},
                 "sha256": hashlib.sha256(runtime.read_bytes()).hexdigest()}
        lock = {"selection": {"desired": {}}, "catalog_inventory": {"files": [template]},
                "inventory": {"files": [self.item, entry]}}
        lock_path = self.root / ".ai/framework.lock"
        lock_path.write_text(json.dumps(lock))
        self.run_policy(self.name, runtime_name)
        template["source"]["path"] = "tools/entry.md"
        lock_path.write_text(json.dumps(lock))
        with self.assertRaisesRegex(SystemExit, "runtime template is unverified"):
            self.run_policy(self.name, runtime_name)
        template["source"]["path"] = "src/adapters/codex/entry.md"
        entry["binding"]["core_entrypoint"] = ".ai/core/missing.md"
        lock_path.write_text(json.dumps(lock))
        with self.assertRaisesRegex(SystemExit, "must originate in src"):
            self.run_policy(self.name, runtime_name)


if __name__ == "__main__":
    unittest.main()
