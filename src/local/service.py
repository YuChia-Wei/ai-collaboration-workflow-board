"""Composition root and executable local workflow service entry point."""
import argparse, json, sqlite3
from pathlib import Path
from .application.workflows import WorkflowService
from .application import portable
from .adapters.outbound.sqlite import SqliteRepository
from .adapters.outbound import portable_sqlite
from .adapters.inbound.http import Handler, server
from .domain.serialization import canonical, digest, now
from .domain.validation import Fault

class Store(WorkflowService):
    """Wire application use cases to SQLite for the local executable."""
    def __init__(self, path, bindings):
        self.path=Path(path)
        super().__init__(SqliteRepository(path,bindings),bindings)

def validate_history(payload, namespace, principals):
    bindings={principal:{'principal':principal,'namespaces':{namespace:roles}} for principal,roles in principals.items()}
    with SqliteRepository.memory() as repository:
        portable.validate_history(payload,namespace,principals,WorkflowService(repository,bindings))

def preflight(pack):
    try: return portable.preflight(pack,validate_history)
    except sqlite3.Error: raise Fault(422,'invalid_package_structure')

def restore(pack, path, bindings):
    return portable_sqlite.restore(pack,path,bindings,preflight,Store)

def main():
    p=argparse.ArgumentParser(); p.add_argument('--db',default='.runtime/local/records.sqlite'); p.add_argument('--bindings',required=True); p.add_argument('--port',type=int,default=8765); p.add_argument('--restore'); p.add_argument('--preflight'); p.add_argument('--fault-injection',action='store_true'); a=p.parse_args()
    b=json.loads(Path(a.bindings).read_text(encoding='utf-8'))
    if a.preflight: print(canonical(preflight(json.loads(Path(a.preflight).read_text(encoding='utf-8'))))); return
    if a.restore: print(canonical(restore(json.loads(Path(a.restore).read_text(encoding='utf-8')),a.db,b))); return
    h=server(Store(a.db,b),a.port,a.fault_injection); print(f'Local synthetic service http://127.0.0.1:{h.server_port}',flush=True); h.serve_forever()
if __name__=='__main__': main()
