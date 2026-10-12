"""HTTP client with persistent, bounded outboxes outside tracked source."""
import json, subprocess
from pathlib import Path
from urllib.request import Request, build_opener, ProxyHandler
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from ...domain.serialization import canonical,digest

def request(base,token,path,body=None,extra=None):
    headers={'Authorization':'Bearer '+token,'Content-Type':'application/json',**(extra or {})}
    r=Request(base.rstrip('/')+path,data=None if body is None else canonical(body).encode(),headers=headers)
    try:
        with build_opener(ProxyHandler({})).open(r,timeout=3) as response: return response.status,json.loads(response.read())
    except HTTPError as e: return e.code,json.loads(e.read())

def validate_outbox(path):
    resolved=Path(path).resolve(); resolved.parent.mkdir(parents=True,exist_ok=True)
    check=subprocess.run(['git','-C',str(resolved.parent),'rev-parse','--show-toplevel'],capture_output=True,text=True)
    if check.returncode==0:
        # An explicitly ignored path is safe inside a source checkout. Refuse any
        # tracked file even when ignore rules would otherwise match it.
        repository=Path(check.stdout.strip()).resolve()
        relative=resolved.relative_to(repository).as_posix()
        tracked=subprocess.run(['git','-C',str(repository),'ls-files','--error-unmatch','--',relative],capture_output=True,text=True)
        runtime_parent=resolved.parent.relative_to(repository).as_posix()
        ignored=subprocess.run(['git','-C',str(repository),'check-ignore','--quiet','--',runtime_parent],capture_output=True,text=True)
        if tracked.returncode==0 or ignored.returncode!=0:
            raise ValueError('Outbox must be outside Git or in an explicitly ignored, untracked runtime directory')
    return resolved

def submit(base,token,command,outbox,max_attempts=3,drop=False):
    path=validate_outbox(outbox)
    entries=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    oid=command['operation_id']; entry=entries.get(oid)
    if entry and entry['command']!=command: raise ValueError('Local operation ID payload mismatch')
    entry=entry or {'command':command,'status':'pending','attempts':0,'observations':[]}
    entries[oid]=entry
    def save():
        tmp=path.with_suffix('.tmp'); tmp.write_text(canonical(entries),encoding='utf-8'); tmp.replace(path)
    save()
    if entry['status'] in {'accepted','conflict','rejected'}: return entry
    def reconcile():
        status,result=request(base,token,'/v1/operations/'+quote(oid,safe='')+'?namespace='+quote(command['namespace'],safe=''))
        entry['observations'].append({'kind':'operation_query','status':status})
        if status==200:
            entry.update(status='accepted' if result.get('payload_hash')==digest(command) else 'conflict',result=result)
            entry.pop('retry_exhausted',None);save();return True
        if status in {401,403}:entry.update(status='rejected',result=result);save();return True
        if status!=404:raise URLError('operation lookup unavailable')
        save();return False
    if entry['attempts']>=max_attempts:
        try:reconcile()
        except (OSError,URLError) as e:entry['observations'].append({'kind':'reconcile_network_error','class':type(e).__name__});save()
        return entry
    while entry['attempts']<max_attempts:
        attempted_write=False
        # Always reconcile before resend. Retry has a lifetime bound, persisted across sessions.
        try:
            if reconcile():return entry
            entry['attempts']+=1; save()
            attempted_write=True
            status,result=request(base,token,'/v1/commands',command,{'X-Test-Drop-Response':'once'} if drop and entry['attempts']==1 else {})
            if status==200: entry.update(status='accepted',result=result)
            elif status==409: entry.update(status='conflict',result=result)
            elif status<500: entry.update(status='rejected',result=result)
            save()
            if entry['status']!='pending': return entry
        except (OSError,URLError) as e:
            entry['observations'].append({'kind':'network_error','class':type(e).__name__})
            # An unsuccessful lookup also spends a retry; avoid an infinite lookup loop.
            if not attempted_write: entry['attempts']+=1
            save()
    # The final POST can commit and lose its response. One bounded read-only lookup
    # remains even when the write budget is exhausted; never spend another POST.
    try:
        if reconcile():return entry
    except (OSError,URLError) as e:entry['observations'].append({'kind':'reconcile_network_error','class':type(e).__name__})
    entry['status']='pending'; entry['retry_exhausted']=True; save(); return entry
