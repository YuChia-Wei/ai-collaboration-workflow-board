"""Real HTTP client + persistent, bounded, repo-external outbox."""
import argparse, json, os, subprocess, uuid
from pathlib import Path
from urllib.request import Request, build_opener, ProxyHandler
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from service import canonical,digest

def request(base,token,path,body=None,extra=None):
    headers={'Authorization':'Bearer '+token,'Content-Type':'application/json',**(extra or {})}
    r=Request(base.rstrip('/')+path,data=None if body is None else canonical(body).encode(),headers=headers)
    try:
        with build_opener(ProxyHandler({})).open(r,timeout=3) as response: return response.status,json.loads(response.read())
    except HTTPError as e: return e.code,json.loads(e.read())

def validate_outbox(path):
    resolved=Path(path).resolve(); resolved.parent.mkdir(parents=True,exist_ok=True)
    check=subprocess.run(['git','-C',str(resolved.parent),'rev-parse','--show-toplevel'],capture_output=True,text=True)
    if check.returncode==0: raise ValueError('Outbox must be outside every Git tree')
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

def main():
    p=argparse.ArgumentParser(); p.add_argument('--base',default='http://127.0.0.1:8765'); p.add_argument('--token',default=os.environ.get('WORKFLOW_TOKEN','')); p.add_argument('--namespace',default='demo')
    sub=p.add_subparsers(dest='action',required=True)
    c=sub.add_parser('context'); c.add_argument('workflow_id')
    sub.add_parser('list'); o=sub.add_parser('operation'); o.add_argument('operation_id')
    e=sub.add_parser('export'); e.add_argument('--output',required=True)
    s=sub.add_parser('submit'); s.add_argument('file'); s.add_argument('--outbox',required=True); s.add_argument('--drop-response',action='store_true')
    a=p.parse_args()
    if a.action=='submit': result=submit(a.base,a.token,json.loads(Path(a.file).read_text(encoding='utf-8')),a.outbox,drop=a.drop_response); print(canonical(result)); return
    path={'context':f'/v1/workflows/{quote(getattr(a,"workflow_id",""),safe="")}/context','list':'/v1/workflows','operation':f'/v1/operations/{quote(getattr(a,"operation_id",""),safe="")}', 'export':'/v1/export'}[a.action]+'?namespace='+quote(a.namespace,safe='')
    status,result=request(a.base,a.token,path)
    if a.action=='export' and status==200: Path(a.output).write_text(canonical(result),encoding='utf-8')
    print(canonical({'status':status,'data':result})); raise SystemExit(0 if status==200 else 1)
if __name__=='__main__': main()
