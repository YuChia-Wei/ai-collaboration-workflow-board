"""Canonical record serialization shared by domain and transports."""
import hashlib, json
from datetime import datetime, timezone

def canonical(x): return json.dumps(x, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
def digest(x): return hashlib.sha256(x if isinstance(x, bytes) else canonical(x).encode()).hexdigest()
def now(): return datetime.now(timezone.utc).isoformat()
