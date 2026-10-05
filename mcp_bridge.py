"""MCP stdio transport, protocol 2025-03-26, forwarding to controlled HTTP API."""
import argparse, json, os, sys
from urllib.parse import quote
from client import request
from service import canonical

TOOLS=[{'name':'workflow_context','description':'Complete workflow context and every document revision. Check source drift and pending local outbox.','inputSchema':{'type':'object','properties':{'namespace':{'type':'string'},'workflow_id':{'type':'string'}},'required':['namespace','workflow_id'],'additionalProperties':False}},
 {'name':'workflow_command','description':'Controlled command. Supply stable operation ID, expected revision, type, payload, client/session. No SQL, ACL, publishing or external issues.','inputSchema':{'type':'object','properties':{'command':{'type':'object'}},'required':['command'],'additionalProperties':False}},
 {'name':'operation_result','description':'Reconcile an accepted operation before retry.','inputSchema':{'type':'object','properties':{'namespace':{'type':'string'},'operation_id':{'type':'string'}},'required':['namespace','operation_id'],'additionalProperties':False}}]
def main():
    p=argparse.ArgumentParser(); p.add_argument('--base',default='http://127.0.0.1:8765'); a=p.parse_args(); token=os.environ.get('WORKFLOW_TOKEN',''); initialized=False; ready=False
    for line in sys.stdin:
        rid=None
        try:
            msg=json.loads(line); rid=msg.get('id'); method=msg.get('method'); params=msg.get('params',{})
            if method=='notifications/initialized': ready=True; continue
            if rid is None: continue
            if method=='initialize':
                initialized=True; result={'protocolVersion':'2025-03-26','capabilities':{'tools':{'listChanged':False}},'serverInfo':{'name':'local-workflow-records','version':'0.1.0'}}
            elif method=='ping': result={}
            elif not (initialized and ready): raise ValueError('initialize and initialized notification required')
            elif method=='tools/list': result={'tools':TOOLS}
            elif method=='tools/call':
                args=params.get('arguments',{}); name=params['name']
                if name=='workflow_command': status,data=request(a.base,token,'/v1/commands',args['command'])
                elif name=='workflow_context': status,data=request(a.base,token,'/v1/workflows/'+quote(args['workflow_id'],safe='')+'/context?namespace='+quote(args['namespace'],safe=''))
                elif name=='operation_result': status,data=request(a.base,token,'/v1/operations/'+quote(args['operation_id'],safe='')+'?namespace='+quote(args['namespace'],safe=''))
                else: raise ValueError('Unknown tool')
                result={'content':[{'type':'text','text':canonical({'status':status,'data':data})}],'isError':status>=400}
            else:
                print(canonical({'jsonrpc':'2.0','id':rid,'error':{'code':-32601,'message':'Method not found'}}),flush=True); continue
            response={'jsonrpc':'2.0','id':rid,'result':result}
        except Exception as e: response={'jsonrpc':'2.0','id':rid,'error':{'code':-32602,'message':str(e)}}
        print(canonical(response),flush=True)
if __name__=='__main__': main()
