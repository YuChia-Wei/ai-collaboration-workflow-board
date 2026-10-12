"""Durable, atomic no-overwrite publication of a validated SQLite export."""
import base64, json, os, tempfile
from pathlib import Path
from ...domain.serialization import canonical
from ...domain.validation import Fault, require

def restore(pack,path,bindings,preflight,store_factory):
    proof=preflight(pack); target=Path(path)
    require(not target.exists(),'restore_requires_new_store',409)
    ns=pack['manifest']['namespace']
    require(any('write' in b.get('namespaces',{}).get(ns,[]) for b in bindings.values()),'explicit_rebinding_required')
    target.parent.mkdir(parents=True,exist_ok=True)
    fd,temp_name=tempfile.mkstemp(prefix='.restore-',suffix='.sqlite',dir=target.parent);os.close(fd)
    temporary=Path(temp_name);p=pack['payload']
    try:
        store=store_factory(temporary,bindings)
        with store.db() as db:
            for w in p['workflows']: db.execute('INSERT INTO workflows VALUES(?,?,?)',(w['id'],ns,canonical(w)))
            for e in p['events']: db.execute('INSERT INTO events VALUES(?,?,?,?,?)',(e['seq'],ns,e['workflow_id'],e['operation_id'],canonical(e)))
            for o in p['operations']: db.execute('INSERT INTO operations VALUES(?,?,?,?,?)',tuple(o[k] for k in ('namespace','id','principal','payload_hash','result')))
            for h,b in p['blobs'].items(): db.execute('INSERT INTO blobs VALUES(?,?)',(h,base64.b64decode(b)))
            for r in p['role_mapping']:
                old=db.execute('SELECT roles FROM role_history WHERE namespace=? AND principal=?',(ns,r['principal'])).fetchone()
                roles=sorted(set(r['roles'])|set(json.loads(old[0]) if old else []))
                db.execute('INSERT OR REPLACE INTO role_history VALUES(?,?,?)',(ns,r['principal'],canonical(roles)))
        # Validate durable bytes before publication, without requiring export permission.
        with store.db() as db:
            imported=[json.loads(r[0]) for r in db.execute('SELECT body FROM workflows ORDER BY id')]
            require(sorted(imported,key=lambda w:w['id'])==sorted(p['workflows'],key=lambda w:w['id']),'restore_verification_failed')
            require([json.loads(r[0]) for r in db.execute('SELECT body FROM events ORDER BY seq')]==p['events'],'restore_event_verification_failed')
            require([dict(r) for r in db.execute('SELECT * FROM operations ORDER BY id')]==sorted(p['operations'],key=lambda o:o['id']),'restore_operation_verification_failed')
            require({r['hash']:base64.b64encode(r['data']).decode() for r in db.execute('SELECT hash,data FROM blobs')}==p['blobs'],'restore_blob_verification_failed')
            db.execute('PRAGMA wal_checkpoint(TRUNCATE)')
        with temporary.open('r+b') as f:f.flush();os.fsync(f.fileno())
        try:os.link(temporary,target) # Atomic no-overwrite publication; same-directory volume.
        except FileExistsError:raise Fault(409,'restore_requires_new_store')
    finally:
        # Never remove target, including when another process wins the publication race.
        temporary.unlink(missing_ok=True)
        for suffix in ('-wal','-shm'):Path(str(temporary)+suffix).unlink(missing_ok=True)
    return proof
