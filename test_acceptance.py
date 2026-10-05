"""Integration acceptance: real loopback HTTP, CLI subprocess, MCP stdio subprocess."""
import base64, concurrent.futures, copy, json, os, subprocess, sys, threading, time, unittest, uuid
from pathlib import Path
from service import Store,server,restore,preflight,Fault,canonical,digest,now
from client import request,submit
from demo import bindings,creation,seed

ROOT=Path(__file__).resolve().parent
EVIDENCE=Path(os.environ.get('P1_EVIDENCE',ROOT.parent/'evidence')).resolve()
RUN=EVIDENCE/('run-'+time.strftime('%Y%m%dT%H%M%SZ',time.gmtime()))
WRITER='demo-writer-local-only'; READER='demo-reader-local-only'; REVIEWER='demo-reviewer-local-only'
class Acceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        RUN.mkdir(parents=True,exist_ok=False); cls.b=bindings(); cls.store=Store(RUN/'original.sqlite',cls.b); cls.rev=seed(cls.store,count=50)
        cls.h=server(cls.store,0,True);cls.thread=threading.Thread(target=cls.h.serve_forever,daemon=True);cls.thread.start();cls.base=f'http://127.0.0.1:{cls.h.server_port}';cls.proofs=[]
        cls.git_before=cls.git_state();cls.reference_before=cls.reference_state()
    @classmethod
    def git_state(cls):
        def run(*args):return subprocess.check_output(['git','-C',str(ROOT),*args],text=True).strip()
        return {'head':run('rev-parse','HEAD'),'tree':run('rev-parse','HEAD^{tree}'),'status':run('status','--porcelain'),'tracked_diff':run('diff','--stat'),'untracked':run('ls-files','--others','--exclude-standard')}
    @classmethod
    def reference_state(cls):
        ref=ROOT.parent/'reference'
        if not ref.exists():return {'available':False}
        def run(*args):return subprocess.check_output(['git','-C',str(ref),*args])
        return {'head':run('rev-parse','HEAD').decode().strip(),'tree':run('rev-parse','HEAD^{tree}').decode().strip(),'status_sha256':digest(run('status','--porcelain')),'note':'isolated no-checkout reference baseline; original checkout not available'}
    @classmethod
    def tearDownClass(cls):
        if cls.h:cls.h.shutdown();cls.h.server_close()
        after=cls.git_state(); ref=cls.reference_state()
        cls.proofs.append({'check':'git-and-reference-unchanged','passed':cls.git_before==after and cls.reference_before==ref,'prototype_before':cls.git_before,'prototype_after':after,'reference_before':cls.reference_before,'reference_after':ref})
        (RUN/'proofs.json').write_text(canonical({'timestamp':now(),'source_commit':'a66957e00aa447be887258fa9b55fd89e39e96dd','prototype_commit':after['head'],'checks':cls.proofs}),encoding='utf-8')
    def proof(self,name,**data):self.proofs.append({'check':name,'passed':True,**data})
    def c(self,typ,payload,rev=None,oid=None,ns='demo',wid='synthetic-416'):
        if rev is None: rev=request(self.base,WRITER,f'/v1/workflows/{wid}/context?namespace={ns}')[1]['workflow']['revision']
        return {'namespace':ns,'workflow_id':wid,'type':typ,'operation_id':oid or str(uuid.uuid4()),'expected_revision':rev,'client':'acceptance-http','session':'actual-test-session','payload':payload}
    def post(self,c,token=WRITER):return request(self.base,token,'/v1/commands',c)
    def context(self):return request(self.base,WRITER,'/v1/workflows/synthetic-416/context?namespace=demo')[1]
    def test_01_http_cli_to_new_mcp_session(self):
        cmd=self.c('log',{'text':'Written by actual HTTP CLI subprocess A; MCP B must read it.'}); f=RUN/'cli-command.json';f.write_text(canonical(cmd),encoding='utf-8')
        env={**os.environ,'WORKFLOW_TOKEN':WRITER,'PYTHONIOENCODING':'utf-8'}
        a=subprocess.run([sys.executable,str(ROOT/'client.py'),'--base',self.base,'submit',str(f),'--outbox',str(RUN/'cli-outbox.json')],env=env,capture_output=True,text=True,encoding='utf-8',timeout=10)
        self.assertEqual(a.returncode,0,a.stderr);self.assertEqual(json.loads(a.stdout)['status'],'accepted')
        messages=[{'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':'2025-03-26','capabilities':{},'clientInfo':{'name':'p1-mcp-protocol-client-B','version':'1'}}},{'jsonrpc':'2.0','method':'notifications/initialized'},{'jsonrpc':'2.0','id':2,'method':'tools/list'},{'jsonrpc':'2.0','id':3,'method':'tools/call','params':{'name':'workflow_context','arguments':{'namespace':'demo','workflow_id':'synthetic-416'}}}]
        b=subprocess.run([sys.executable,str(ROOT/'mcp_bridge.py'),'--base',self.base],input='\n'.join(map(canonical,messages))+'\n',env={**env,'WORKFLOW_TOKEN':READER},capture_output=True,text=True,encoding='utf-8',timeout=10)
        self.assertEqual(b.returncode,0,b.stderr); responses=[json.loads(x) for x in b.stdout.splitlines()];context=json.loads(responses[-1]['result']['content'][0]['text'])['data']
        self.assertTrue(context['complete']);self.assertEqual(len(context['workflow']['steps']),50);self.assertIn('missing-required',context['missing_required_documents']);self.assertTrue(any('subprocess A' in l['text'] for l in context['workflow']['logs']))
        self.assertTrue(context['workflow']['handoffs']);self.assertTrue(context['workflow']['evidence']['E-failure']);self.assertEqual(context['workflow']['source']['commit'],'a66957e00aa447be887258fa9b55fd89e39e96dd')
        self.assertEqual(context['workflow']['steps']['T1']['status'],'completed');self.assertEqual(context['workflow']['steps']['T2']['status'],'planned')
        (RUN/'cross-client-transcript.json').write_text(canonical({'client_A':'Python HTTP CLI subprocess, exited','client_B':'new Python MCP JSON-RPC stdio client subprocess','cli':json.loads(a.stdout),'mcp_requests':messages,'mcp_responses':responses,'real_agent_E2E':False}),encoding='utf-8')
        self.proof('AC03-actual-two-protocol-clients',clients=['Python HTTP CLI A','fresh Python MCP JSON-RPC stdio B'],real_coding_agents=False)
    def test_02_fifty_steps_no_external_writer(self):
        self.assertEqual(len(self.context()['workflow']['steps']),50)
        self.assertFalse(any('github' in x or 'azure' in x for x in sys.modules if x.startswith('service.')))
        status,data=request(self.base,WRITER,'/v1/workflows?namespace=demo&external_link=https%3A%2F%2Fexample.invalid%2Fwork-item%2F416');self.assertEqual(status,200);self.assertEqual(len(data),1)
        self.proof('AC02-50-steps',count=50,external_writer='No provider adapter exists; synthetic relation only; no external network operation in service')
    def test_03_concurrent_cas(self):
        rev=self.context()['workflow']['revision']; cmds=[self.c('log',{'text':'concurrent '+str(i)},rev=rev) for i in range(2)]
        with concurrent.futures.ThreadPoolExecutor(2) as pool: results=list(pool.map(self.post,cmds))
        self.assertEqual(sorted(r[0] for r in results),[200,409]);self.assertEqual(self.context()['workflow']['revision'],rev+1)
        self.proof('AC04-concurrent-CAS',statuses=[r[0] for r in results],revision_delta=1)
    def test_04_illegal_and_missing_evidence_rollback(self):
        before=self.context(); status,result=self.post(self.c('update_step',{'id':'T2','status':'completed'}));self.assertEqual(status,422);self.assertEqual(result['error'],'illegal_transition')
        self.assertEqual(self.post(self.c('update_step',{'id':'T2','status':'active'}))[0],200)
        before=self.context();c=self.c('update_step',{'id':'T2','status':'completed','result':'cannot complete without evidence'});status,result=self.post(c);self.assertEqual(status,422);self.assertEqual(result['error'],'missing_required_evidence');self.assertEqual(self.context(),before)
        self.assertEqual(request(self.base,WRITER,'/v1/operations/'+c['operation_id']+'?namespace=demo')[0],404)
        self.proof('AC04-invalid-write-atomic-rollback',illegal=422,missing_evidence=422,events_and_revision_unchanged=True)
    def test_05_lost_response_and_bounded_outbox(self):
        before=self.context();c=self.c('log',{'text':'response-loss-once'});entry=submit(self.base,WRITER,c,RUN/'loss-outbox.json',drop=True)
        self.assertEqual(entry['status'],'accepted');self.assertTrue(any(x['kind']=='network_error' for x in entry['observations']));self.assertEqual(entry['attempts'],1)
        result=self.post(c);self.assertEqual(result[0],200);self.assertEqual(result[1],entry['result']);self.assertEqual(self.context()['workflow']['revision'],before['workflow']['revision']+1)
        changed=copy.deepcopy(c);changed['payload']['text']='DIFFERENT';self.assertEqual(self.post(changed)[0],409)
        fresh=submit(self.base,WRITER,changed,RUN/'new-session-mismatch-outbox.json');self.assertEqual(fresh['status'],'conflict')
        disconnected=submit('http://127.0.0.1:1',WRITER,self.c('log',{'text':'offline never accepted'}),RUN/'offline-outbox.json',max_attempts=3);self.assertEqual(disconnected['status'],'pending');self.assertTrue(disconnected['retry_exhausted']);self.assertEqual(disconnected['attempts'],3)
        rejected=submit(self.base,READER,self.c('log',{'text':'reader cannot write'}),RUN/'rejected-outbox.json');self.assertEqual(rejected['status'],'rejected');self.assertEqual(rejected['attempts'],1)
        self.proof('AC05-lost-response',accepted_once=True,post_attempts=entry['attempts'],offline_attempts=disconnected['attempts'],same_id_different_payload=409,new_outbox_mismatch='conflict',no_retry_after_denial=True)
    def test_06_namespaces_roles_and_auth(self):
        for path in ['/v1/workflows/synthetic-416/context?namespace=other','/v1/operations/anything?namespace=other','/v1/export?namespace=other']:
            self.assertEqual(request(self.base,WRITER,path)[0],403)
        self.assertEqual(request(self.base,'not-a-token','/v1/workflows?namespace=demo')[0],401)
        for typ in ['approve','acl','publish','sql','create_issue']:
            self.assertEqual(self.post(self.c(typ,{'document_id':'plan'}))[0],403)
        self.assertEqual(self.post(self.c('log',{'text':'no write'}),READER)[0],403)
        approve=self.c('approve',{'document_id':'plan'});self.assertEqual(self.post(approve,REVIEWER)[0],200)
        self.assertEqual(self.post(self.c('log',{'text':'reviewer no writer'}),REVIEWER)[0],403)
        self.assertEqual(self.post(self.c('log',{'text':'csrf test'}))[0],200)
        c=self.c('log',{'text':'wrong origin'});self.assertEqual(request(self.base,WRITER,'/v1/commands',c,{'Origin':'https://example.invalid'})[0],403)
        self.proof('AC06-local-binding-isolation',cross_namespace=403,invalid_auth=401,writer_approval_acl_publish_sql_external_issue=403,independent_reviewer=True,real_online_login=False)
    def test_07_documents_revisions_tombstones(self):
        before=self.context();bad=self.c('document',{'action':'revise','id':'plan','content':'overwrite final'});self.assertEqual(self.post(bad)[0],422);self.assertEqual(self.context(),before)
        for typ,p in [('document',{'action':'revise','id':'plan','content':'# Addendum\nDEC-1 retained; no deployments.','relation':'addendum','decision_ids':['DEC-1'],'final':True}),('document',{'action':'rename','id':'plan','name':'計畫修正版.md'}),('document',{'action':'create','id':'scratch','content':'synthetic scratch','step_id':'T2'}),('document',{'action':'archive','id':'scratch'})]:self.assertEqual(self.post(self.c(typ,p))[0],200)
        w=self.context()['workflow'];self.assertEqual(len(w['documents']['plan']['revisions']),2);self.assertTrue(w['documents']['scratch']['deleted']);self.assertEqual(w['documents']['plan']['revisions'][0]['decision_ids'],['DEC-1'])
        status,rev=request(self.base,READER,'/v1/documents/plan/1?namespace=demo&workflow_id=synthetic-416');self.assertEqual(status,200);self.assertEqual(rev,w['documents']['plan']['revisions'][0])
        self.proof('AC01-all-document-actions',final_preserved=True,revisions=2,tombstone=True,history_read=True)
    def test_08_export_preflight_corruption(self):
        status,pack=request(self.base,WRITER,'/v1/export?namespace=demo');self.assertEqual(status,200);self.assertTrue(preflight(pack)['valid'])
        raw=canonical(pack);self.assertNotIn(WRITER,raw);self.assertNotIn(READER,raw)
        for kind in ['package','blob','relationship','revision','operations','unsafe']:
            bad=copy.deepcopy(pack)
            if kind=='package':bad['manifest']['payload_sha256']='0'*64
            elif kind=='blob':h=next(iter(bad['payload']['blobs']));bad['payload']['blobs'][h]=base64.b64encode(b'corruption').decode()
            elif kind=='relationship':bad['payload']['workflows'][0]['documents']['plan']['step_id']='UNKNOWN'
            elif kind=='revision':bad['payload']['workflows'][0]['documents']['plan']['revisions'][0]['content']='changed'
            elif kind=='operations':bad['payload']['operations'][0]['payload_hash']='0'*64
            else:bad['manifest']['external_effects_enabled']=True
            if kind not in ['package','unsafe']:bad['manifest']['payload_sha256']=digest(bad['payload'])
            with self.assertRaises(Fault):preflight(bad)
        (RUN/'export.json').write_text(canonical(pack),encoding='utf-8');self.proof('AC07-export-preflight',corrupt_cases=6,secrets_excluded=True,counts=pack['manifest']['counts'])
    def test_09_store_reopen_idempotency(self):
        c=self.c('log',{'text':'durable replay'});status,result=self.post(c);self.assertEqual(status,200)
        reopened=Store(RUN/'original.sqlite',self.b);self.assertEqual(reopened.command(WRITER,c),result)
        self.proof('AC05-persistent-idempotency',reopened_connection=True)
    def test_zz_restore_original_offline_and_continue(self):
        pack=request(self.base,WRITER,'/v1/export?namespace=demo')[1];(RUN/'final-export.json').write_text(canonical(pack),encoding='utf-8')
        newbindings={'new-local-rebound-token':{'principal':'rebound-writer','namespaces':{'demo':['read','write','export']}}}
        target=RUN/'replacement.sqlite';proof=restore(pack,target,newbindings)
        with self.assertRaises(Fault):restore(pack,target,newbindings)
        with self.assertRaises(Fault):restore(pack,RUN/'must-not-exist.sqlite',{})
        self.assertFalse((RUN/'must-not-exist.sqlite').exists())
        # Original server is actually shut down, and the original DB moved out of reach.
        self.h.shutdown();self.h.server_close();self.__class__.h=None
        (RUN/'original.sqlite').rename(RUN/'original.disabled.sqlite')
        with self.assertRaises(OSError):request(self.base,WRITER,'/health')
        alt=server(Store(target,newbindings),0);t=threading.Thread(target=alt.serve_forever,daemon=True);t.start();base=f'http://127.0.0.1:{alt.server_port}';token='new-local-rebound-token'
        try:
            before=request(base,token,'/v1/export?namespace=demo')[1];self.assertEqual(before['payload']['workflows'],pack['payload']['workflows']);self.assertEqual(before['payload']['events'],pack['payload']['events']);self.assertEqual(before['payload']['operations'],pack['payload']['operations']);self.assertEqual(before['payload']['blobs'],pack['payload']['blobs'])
            self.assertEqual(request(base,WRITER,'/v1/workflows?namespace=demo')[0],401)
            context=request(base,token,'/v1/workflows/synthetic-416/context?namespace=demo')[1];c=self.c('log',{'text':'continue on clean replacement with original offline'},rev=context['workflow']['revision']);self.assertEqual(request(base,token,'/v1/commands',c)[0],200)
            after=request(base,token,'/v1/export?namespace=demo')[1];self.assertEqual(len(after['payload']['events']),len(pack['payload']['events'])+1);self.assertTrue(preflight(after)['valid'])
            (RUN/'replacement-after-continuation.json').write_text(canonical(after),encoding='utf-8')
            self.proof('AC07-clean-replacement-original-offline',preflight=proof,original_http_offline=True,original_db_disabled=True,equal_tables=['workflows','events','operations','blobs'],identities_rebound=True,old_token_rejected=401,continuation_events=1,external_side_effects=False)
            self.proof('AC10-synthetic-cutover-and-rollback-drill',classification='synthetic rehearsal only; actual migration P3 unauthorized',old_source_disabled=True,post_switch_event_preserved=True)
        finally:alt.shutdown();alt.server_close()

if __name__=='__main__':
    result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Acceptance))
    (RUN/'test-summary.json').write_text(canonical({'run_directory':str(RUN),'tests_run':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'successful':result.wasSuccessful(),'finished_at':now()}),encoding='utf-8')
    print('EVIDENCE='+str(RUN));sys.exit(0 if result.wasSuccessful() else 1)
