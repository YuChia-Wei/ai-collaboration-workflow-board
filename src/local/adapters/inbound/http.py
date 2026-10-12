"""Loopback HTTP routes and static UI transport."""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from ...domain.serialization import canonical
from ...domain.validation import Fault, require

class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def token(self): return self.headers.get('Authorization','').removeprefix('Bearer ')
    def output(self,status,obj):
        data=canonical(obj).encode(); self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Cache-Control','no-store'); self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data)
    def do_GET(self):
        from urllib.parse import urlparse,parse_qs
        try:
            u=urlparse(self.path); ns=parse_qs(u.query).get('namespace',['demo'])[0]; parts=u.path.strip('/').split('/')
            if u.path=='/':
                data=(Path(__file__).resolve().parents[2]/'assets'/'ui.html').read_bytes(); self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data); return
            s=self.server.store
            if u.path=='/health': result={'ready':True,'external_effects_enabled':False,'mode':'synthetic-local-only'}
            elif u.path=='/v1/workflows':
                result=s.workflows(self.token(),ns,parse_qs(u.query).get('external_link',[None])[0])
            elif len(parts)==4 and parts[:2]==['v1','workflows'] and parts[3]=='context': result=s.context(self.token(),ns,parts[2])
            elif len(parts)==3 and parts[:2]==['v1','operations']: result=s.operation(self.token(),ns,parts[2])
            elif len(parts)==4 and parts[:2]==['v1','documents']:
                wid=parse_qs(u.query).get('workflow_id',[''])[0]; w=s.context(self.token(),ns,wid)['workflow']; require(parts[2] in w['documents'],'not_found',404)
                d=w['documents'][parts[2]]; rev=int(parts[3]); require(0<rev<=len(d['revisions']),'not_found',404); result=d['revisions'][rev-1]
            elif u.path=='/v1/events':
                result=s.events(self.token(),ns,int(parse_qs(u.query).get('after',['0'])[0]))
            elif len(parts)==3 and parts[:2]==['v1','blobs']:
                result=s.blob(self.token(),ns,parts[2])
            elif u.path=='/v1/export': result=s.export(self.token(),ns)
            else: raise Fault(404,'not_found')
            self.output(200,result)
        except Fault as e: self.output(e.status,e.body)
        except (ValueError,KeyError,TypeError): self.output(422,{'error':'invalid_request'})
    def do_POST(self):
        try:
            require(self.path=='/v1/commands','not_found',404)
            require(self.headers.get('Origin') in (None,f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}'),'origin_forbidden',403)
            size=int(self.headers.get('Content-Length','0')); require(0<size<=2*1024*1024,'invalid_request_size',413)
            c=json.loads(self.rfile.read(size)); result=self.server.store.command(self.token(),c)
            # Explicit local fault injection used to prove accepted operation + lost response.
            if self.server.fault_injection and self.headers.get('X-Test-Drop-Response')=='once': self.close_connection=True; return
            self.output(200,result)
        except Fault as e: self.output(e.status,e.body)
        except (ValueError,KeyError,TypeError): self.output(422,{'error':'invalid_request'})

def server(store,port=8765,fault_injection=False):
    h=ThreadingHTTPServer(('127.0.0.1',port),Handler); h.store=store; h.fault_injection=fault_injection; return h
