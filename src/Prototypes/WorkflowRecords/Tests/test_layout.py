"""Relocated asset, runtime path, and inward dependency contracts."""
import ast
import threading
import unittest
import uuid
from pathlib import Path
from urllib.request import urlopen

from ..Adapters.Outbound.http_client import validate_outbox
from ..demo import bindings
from ..service import Store, server

ROOT = Path(__file__).resolve().parents[4]
LOCAL = ROOT / 'src' / 'Prototypes' / 'WorkflowRecords'


class SourceLayout(unittest.TestCase):
    def test_domain_and_application_depend_inward(self):
        for layer in ('Domain', 'Application'):
            for source in (LOCAL / layer).glob('*.py'):
                tree = ast.parse(source.read_text(encoding='utf-8'))
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            self.assertNotIn(alias.name.split('.')[0], {'sqlite3', 'http', 'urllib'}, str(source))
                    elif isinstance(node, ast.ImportFrom):
                        imported = node.module or ''
                        self.assertNotIn(imported.split('.')[0], {'sqlite3', 'http', 'urllib'}, str(source))
                        self.assertFalse('Adapters' in imported.split('.'), str(source))
                        if layer == 'Domain':
                            self.assertFalse('Application' in imported.split('.'), str(source))

    def test_outbox_allows_ignored_runtime_and_refuses_source_or_tracked_paths(self):
        ignored = ROOT / '.runtime' / 'layout-check' / 'outbox.json'
        self.assertEqual(validate_outbox(ignored), ignored.resolve())
        with self.assertRaises(ValueError):
            validate_outbox(LOCAL / 'outbox.json')
        with self.assertRaises(ValueError):
            validate_outbox(ROOT / '.gitignore')

    def test_http_serves_relocated_asset_and_namespace_scoped_blob(self):
        from ..demo import seed
        from ..Domain.validation import Fault
        runtime = ROOT / '.runtime' / 'layout-check'
        directory=runtime/str(uuid.uuid4())
        directory.mkdir(parents=True, exist_ok=False)
        store = Store(directory / 'layout.sqlite', bindings())
        seed(store, count=1)
        http = server(store, 0)
        thread = threading.Thread(target=http.serve_forever, daemon=True)
        thread.start()
        try:
            with urlopen(f'http://127.0.0.1:{http.server_port}/', timeout=3) as response:
                self.assertEqual(response.headers.get_content_type(), 'text/html')
                self.assertEqual(response.read(), (LOCAL / 'Assets' / 'ui.html').read_bytes())
            workflow = store.context('demo-writer-local-only', 'demo', 'synthetic-416')['workflow']
            blob_hash = workflow['evidence']['E1']['blob_hash']
            self.assertEqual(store.blob('demo-writer-local-only', 'demo', blob_hash)['hash'], blob_hash)
            with self.assertRaises(Fault) as rejected:
                store.blob('demo-other-local-only', 'other', blob_hash)
            self.assertEqual(rejected.exception.status, 404)
        finally:
            http.shutdown()
            http.server_close()


if __name__ == '__main__':
    unittest.main(verbosity=2)
