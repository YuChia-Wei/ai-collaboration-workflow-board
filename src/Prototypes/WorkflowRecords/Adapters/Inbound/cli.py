"""HTTP CLI argument parsing and presentation."""
import argparse, json, os
from pathlib import Path
from urllib.parse import quote
from ..Outbound.http_client import request, submit
from ...Domain.serialization import canonical

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
