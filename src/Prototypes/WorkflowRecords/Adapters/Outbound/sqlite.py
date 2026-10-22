"""SQLite implementation of the workflow persistence port."""
import base64, json, sqlite3
from contextlib import contextmanager
from pathlib import Path
from ...Domain.serialization import canonical
from ...Domain.validation import require

SCHEMA='''
CREATE TABLE IF NOT EXISTS workflows(id TEXT PRIMARY KEY,namespace TEXT NOT NULL,body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS operations(namespace TEXT, id TEXT, principal TEXT, payload_hash TEXT, result TEXT, PRIMARY KEY(namespace,id));
CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,namespace TEXT, workflow_id TEXT, operation_id TEXT, body TEXT);
CREATE TABLE IF NOT EXISTS blobs(hash TEXT PRIMARY KEY, data BLOB NOT NULL);
CREATE TABLE IF NOT EXISTS role_history(namespace TEXT, principal TEXT, roles TEXT, PRIMARY KEY(namespace,principal));
'''
class SqliteRepository:
    def __init__(self,path,bindings):
        self.path=Path(path); self.path.parent.mkdir(parents=True,exist_ok=True)
        self.connection=None
        with self.db() as db:
            db.execute('PRAGMA journal_mode=WAL')
            db.executescript(SCHEMA)
            # Descriptive historical role mappings never authorize current calls.
            for b in bindings.values():
                for ns,roles in b.get('namespaces',{}).items():
                    row=db.execute('SELECT roles FROM role_history WHERE namespace=? AND principal=?',(ns,b['principal'])).fetchone()
                    merged=sorted(set(roles)|set(json.loads(row[0]) if row else []))
                    db.execute('INSERT OR REPLACE INTO role_history VALUES(?,?,?)',(ns,b['principal'],canonical(merged)))
    @contextmanager
    def db(self):
        db=self.connection or sqlite3.connect(self.path,timeout=10); db.row_factory=sqlite3.Row
        try:
            with db: yield db
        finally:
            if self.connection is None: db.close()
    def load(self,db,wid,ns):
        row=db.execute('SELECT body FROM workflows WHERE id=? AND namespace=?',(wid,ns)).fetchone()
        require(row is not None,'not_found',404); return json.loads(row[0])
    @classmethod
    @contextmanager
    def memory(cls):
        repository=cls.__new__(cls)
        repository.path=Path(':memory:')
        repository.connection=sqlite3.connect(':memory:')
        repository.connection.row_factory=sqlite3.Row
        repository.connection.executescript(SCHEMA)
        try: yield repository
        finally: repository.connection.close()

    def begin_read(self, db): db.execute('BEGIN')
    def begin_write(self, db): db.execute('BEGIN IMMEDIATE')
    def has_workflow(self, db, wid):
        return db.execute('SELECT 1 FROM workflows WHERE id=?',(wid,)).fetchone() is not None
    def operation(self, db, ns, oid):
        row=db.execute('SELECT * FROM operations WHERE namespace=? AND id=?',(ns,oid)).fetchone()
        return dict(row) if row else None
    def events(self, db, ns, wid=None, after=0):
        if wid is not None:
            rows=db.execute('SELECT body FROM events WHERE namespace=? AND workflow_id=? ORDER BY seq',(ns,wid))
        else:
            rows=db.execute('SELECT body FROM events WHERE namespace=? AND seq>? ORDER BY seq',(ns,after))
        return [json.loads(row[0]) for row in rows]
    def workflows(self, db, ns):
        return [json.loads(row[0]) for row in db.execute('SELECT body FROM workflows WHERE namespace=? ORDER BY id',(ns,))]
    def document_authored(self, db, ns, wid, principal):
        return db.execute("SELECT 1 FROM events WHERE namespace=? AND workflow_id=? AND json_extract(body,'$.principal')=? AND json_extract(body,'$.command.type')='document'",(ns,wid,principal)).fetchone() is not None
    def put_blobs(self, db, blobs):
        for blob_hash,data in blobs.items():
            db.execute('INSERT OR IGNORE INTO blobs VALUES(?,?)',(blob_hash,data))
    def append_event(self, db, event):
        cur=db.execute('INSERT INTO events(namespace,workflow_id,operation_id,body) VALUES(?,?,?,?)',(event['namespace'],event['workflow_id'],event['operation_id'],canonical(event)))
        event['seq']=cur.lastrowid
        db.execute('UPDATE events SET body=? WHERE seq=?',(canonical(event),event['seq']))
        return event['seq']
    def save_workflow(self, db, w):
        db.execute('INSERT OR REPLACE INTO workflows VALUES(?,?,?)',(w['id'],w['namespace'],canonical(w)))
    def save_operation(self, db, ns, oid, principal, payload_hash, result):
        db.execute('INSERT INTO operations VALUES(?,?,?,?,?)',(ns,oid,principal,payload_hash,canonical(result)))
    def export_payload(self, db, ns):
        workflows=self.workflows(db,ns)
        events=self.events(db,ns)
        operations=[dict(r) for r in db.execute('SELECT * FROM operations WHERE namespace=? ORDER BY id',(ns,))]
        hashes={e['blob_hash'] for w in workflows for e in w['evidence'].values()}
        blobs={h:base64.b64encode(self.blob(db,h)).decode() for h in sorted(hashes)}
        roles=[{'principal':r['principal'],'roles':json.loads(r['roles'])} for r in db.execute('SELECT principal,roles FROM role_history WHERE namespace=? ORDER BY principal',(ns,))]
        return {'workflows':workflows,'events':events,'operations':operations,'blobs':blobs,'role_mapping':roles}
    def blob(self, db, blob_hash):
        row=db.execute('SELECT data FROM blobs WHERE hash=?',(blob_hash,)).fetchone()
        return row[0] if row else None
    def all_blobs(self, db):
        return {r['hash']:base64.b64encode(r['data']).decode() for r in db.execute('SELECT hash,data FROM blobs')}
