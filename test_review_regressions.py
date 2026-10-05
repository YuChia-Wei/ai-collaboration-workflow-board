"""14 regression/control scenarios derived from immutable independent review R1-R7."""
import base64,copy,json,os,sqlite3,subprocess,sys,threading,time,unittest,uuid
from pathlib import Path
from unittest.mock import patch
from urllib.error import URLError
import client
from service import Store,Fault,server,preflight,restore,digest,canonical,now
from demo import bindings,seed
ROOT=Path(__file__).resolve().parent
RUN=Path(os.environ.get('P1_EVIDENCE',ROOT.parent/'evidence'))/('regressions-'+time.strftime('%Y%m%dT%H%M%SZ',time.gmtime()))
TOKEN='demo-writer-local-only'; PROOFS=[]
class ReviewRegressions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):RUN.mkdir(parents=True,exist_ok=False)
    def setUp(self):
        self.s=Store(RUN/(self._testMethodName+'.sqlite'),bindings());seed(self.s,count=1)
    def c(self,typ,p,**kwargs):
        return dict(namespace='demo',workflow_id='synthetic-416',type=typ,payload=p,operation_id=str(uuid.uuid4()),expected_revision=self.s.context(TOKEN,'demo','synthetic-416')['workflow']['revision'],**kwargs)
    def write(self,typ,p):return self.s.command(TOKEN,self.c(typ,p))
    def reject(self,c,code=None):
        before=self.s.export(TOKEN,'demo')['payload']
        with self.assertRaises(Fault) as e:self.s.command(TOKEN,c)
        self.assertEqual(e.exception.status,422)
        if code:self.assertEqual(e.exception.body['error'],code)
        self.assertEqual(self.s.export(TOKEN,'demo')['payload'],before)
        self.assertTrue(preflight(self.s.export(TOKEN,'demo'))['valid'])
    def proof(self,finding,**data):PROOFS.append({'test':self._testMethodName,'finding':finding,'passed':True,**data})
    def test_01_completed_step_no_status_cannot_lose_result_or_evidence(self):
        for p in [{'id':'T1','result':'','evidence_ids':[]},{'id':'T1','result':'   '},{'id':'T1','evidence_ids':[]}]:self.reject(self.c('update_step',p),'missing_required_evidence')
        self.proof('R1',omitted_status_rejected=True)
    def test_02_any_step_evidence_references_must_exist(self):
        for p in [{'id':'T1','evidence_ids':['nonexistent']},{'id':'T1','evidence_ids':'E1'},{'id':'T1','evidence_ids':None}]:self.reject(self.c('update_step',p),'invalid_step_relationship')
        self.proof('R1',own_export_remains_valid=True)
    def complete(self):self.write('update_workflow',{'status':'active','required_documents':['plan']});self.write('update_workflow',{'status':'completed'})
    def test_03_completion_checks_candidate_required_documents(self):
        self.write('update_workflow',{'status':'active','required_documents':['plan']})
        self.reject(self.c('update_workflow',{'status':'completed','required_documents':['new-missing']}),'missing_required_documents')
        self.write('update_workflow',{'status':'completed','required_documents':['plan']});self.proof('R2',candidate_validated=True)
    def test_04_every_command_preserves_terminal_workflow(self):
        self.complete();self.reject(self.c('document',{'id':'plan','action':'archive'}),'missing_required_documents')
        self.reject(self.c('add_step',{'id':'T-after-complete','title':'unfinished','order':2,'owner_skill':'synthetic'}),'incomplete_steps')
        self.reject(self.c('update_workflow',{'required_documents':['new-missing']}),'missing_required_documents')
        self.write('log',{'text':'terminal annotation allowed'})
        self.write('document',{'id':'plan','action':'revise','content':'# Valid final addendum','final':True,'relation':'addendum'})
        self.assertEqual(self.s.context(TOKEN,'demo','synthetic-416')['workflow']['status'],'completed');self.proof('R2',terminal_annotations_allowed=True)
    def tamper_reject(self,pack,name):
        pack['manifest']['payload_sha256']=digest(pack['payload']);target=RUN/(name+'.restore.sqlite')
        with self.assertRaises(Fault):preflight(pack)
        with self.assertRaises(Fault):restore(pack,target,bindings())
        self.assertFalse(target.exists())
    def test_05_receipt_command_identity_and_roles_must_match(self):
        original=self.s.export(TOKEN,'demo')
        for k,v in [('accepted',False),('operation_id','wrong-receipt'),('principal','forged-admin'),('payload_hash','0'*64),('revision',True)]:
            p=copy.deepcopy(original);o=p['payload']['operations'][0];r=json.loads(o['result']);r[k]=v;o['result']=canonical(r);self.tamper_reject(p,'receipt-'+k)
        for k,v in [('namespace','other'),('workflow_id','wrong'),('operation_id','wrong'),('expected_revision',900)]:
            p=copy.deepcopy(original);e=p['payload']['events'][0];e['command'][k]=v;o=next(x for x in p['payload']['operations'] if x['id']==e['operation_id']);o['payload_hash']=digest(e['command']);r=json.loads(o['result']);r['payload_hash']=o['payload_hash'];o['result']=canonical(r);self.tamper_reject(p,'command-'+k)
        p=copy.deepcopy(original);p['payload']['role_mapping']=[];p['manifest']['counts']['role_mapping']=0;self.tamper_reject(p,'missing-roles')
        p=copy.deepcopy(original);p['payload']['workflows'][0]['approvals']=[{'document_id':'plan','revision':1,'principal':'forged-admin','at':now()}];self.tamper_reject(p,'forged-approval')
        p=copy.deepcopy(original);p['payload']['workflows'][0]['next_step']='forged but structurally valid snapshot';self.tamper_reject(p,'history-divergent-snapshot')
        p=copy.deepcopy(original);p['payload']['events'][0]['client']='forged-event-client';self.tamper_reject(p,'event-client-mismatch')
        self.proof('R3',contradictory_receipts_commands_roles_approvals_snapshot_rejected=True)
    def test_06_restore_rejects_invalid_lifecycle_and_types(self):
        original=self.s.export(TOKEN,'demo')
        for k,v in [('status','not-a-lifecycle-state'),('status',{'invalid':'type'}),('revision',True),('required_documents',None)]:
            p=copy.deepcopy(original);p['payload']['workflows'][0][k]=v;self.tamper_reject(p,'lifecycle-'+k+str(type(v).__name__))
        p=copy.deepcopy(original);p['payload']['workflows'][0]['steps']['T1']['status']='invented';self.tamper_reject(p,'invalid-step-state')
        c=self.c('log',{'text':'typed CAS contract'});c['expected_revision']=True;self.reject(c,'invalid_expected_revision')
        self.proof('R3',invalid_pack_does_not_create_target=True)
    def test_07_null_evidence_and_whitespace_cannot_complete(self):
        self.reject(self.c('evidence',{'id':'empty','command':None,'result':None,'outcome':None,'source_commit':None,'environment':None}),'invalid_evidence_content')
        valid={'id':'E-new','command':'synthetic command','result':'actual synthetic failure','outcome':'failed','source_commit':'synthetic-source','environment':{'mode':'synthetic'}}
        for k,v in [('command',' '),('result',''),('outcome','invented'),('source_commit',None),('environment',{}),('environment',{'mode':None})]:
            p={**valid,k:v};self.reject(self.c('evidence',p))
        self.write('evidence',valid);self.write('add_step',{'id':'T-empty','title':'new','order':2,'owner_skill':'synthetic'});self.write('update_step',{'id':'T-empty','status':'active'})
        self.reject(self.c('update_step',{'id':'T-empty','status':'completed','result':'   ','evidence_ids':['E-new']}),'missing_required_evidence')
        self.write('update_step',{'id':'T-empty','status':'completed','result':'Investigation completed; failure explicitly retained','evidence_ids':['E-new']})
        self.proof('R4',valid_failed_evidence_retained=True,empty_shell_rejected=True)
    def serve(self):
        h=server(self.s,0,True);threading.Thread(target=h.serve_forever,daemon=True).start();return h,f'http://127.0.0.1:{h.server_port}'
    def test_08_exhausted_write_budget_still_reconciles(self):
        h,base=self.serve();c=self.c('log',{'text':'last response lost'});original=client.request;counts={'posts':0,'reads':0}
        def flaky(base,token,path,body=None,extra=None):
            if body is not None:counts['posts']+=1;return original(base,token,path,body,{'X-Test-Drop-Response':'once'})
            counts['reads']+=1
            if counts['reads']==2:raise URLError('synthetic final reconcile temporarily unavailable')
            return original(base,token,path,body,extra)
        try:
            with patch.object(client,'request',flaky):first=client.submit(base,TOKEN,c,RUN/'one-outbox.json',max_attempts=1)
            self.assertEqual(first['status'],'pending');self.assertTrue(first['retry_exhausted'])
            with patch.object(client,'request',flaky):second=client.submit(base,TOKEN,c,RUN/'one-outbox.json',max_attempts=1)
            self.assertEqual(second['status'],'accepted');self.assertEqual(counts['posts'],1);self.assertEqual(second['attempts'],1)
            self.proof('R5',after_exhaustion_read_reconcile=True,posts=counts['posts'])
        finally:h.shutdown();h.server_close()
    def test_09_default_final_third_attempt_response_loss(self):
        h,base=self.serve();original=client.request;counts={'reads':0,'posts':0}
        def flaky(base,token,path,body=None,extra=None):
            if body is None:
                counts['reads']+=1
                if counts['reads']<=2:raise URLError('synthetic disconnected lookup')
            else:counts['posts']+=1;extra={'X-Test-Drop-Response':'once'}
            return original(base,token,path,body,extra)
        try:
            c=self.c('log',{'text':'third attempt commits; response lost'})
            with patch.object(client,'request',flaky):r=client.submit(base,TOKEN,c,RUN/'third-outbox.json')
            self.assertEqual(r['status'],'accepted');self.assertEqual(r['attempts'],3);self.assertEqual(counts['posts'],1)
            self.proof('R5',final_third_attempt_reconciled=True,post_count=1)
        finally:h.shutdown();h.server_close()
    def test_10_context_has_one_snapshot(self):
        other=Store(self.s.path,bindings());load=self.s.load;once=[False]
        def interleaved(db,wid,ns):
            w=load(db,wid,ns)
            if not once[0]:
                once[0]=True;other.command(TOKEN,dict(namespace=ns,workflow_id=wid,type='log',operation_id='concurrent-context-write',expected_revision=w['revision'],payload={'text':'writer commits between two context SELECTs'}))
            return w
        self.s.load=interleaved;c=self.s.context(TOKEN,'demo','synthetic-416')
        self.assertTrue(c['complete']);self.assertEqual(c['workflow']['revision'],c['events'][-1]['after_revision'])
        later=self.s.context(TOKEN,'demo','synthetic-416');self.assertEqual(later['workflow']['revision'],c['workflow']['revision']+1)
        self.proof('R6',snapshot_revision=c['workflow']['revision'],next_revision=later['workflow']['revision'])
    def test_11_late_receipt_failure_rolls_back_everything(self):
        before=self.s.export(TOKEN,'demo')['payload'];c=self.c('evidence',{'id':'rollback-blob','command':'synthetic','result':'synthetic','outcome':'passed','source_commit':'synthetic','environment':{'mode':'synthetic'},'blob_base64':'YXRvbWlj'})
        with self.s.db() as db:db.execute("CREATE TRIGGER fail_receipt BEFORE INSERT ON operations BEGIN SELECT RAISE(ABORT,'synthetic injected late failure'); END")
        with self.assertRaises(sqlite3.IntegrityError):self.s.command(TOKEN,c)
        self.assertEqual(before,self.s.export(TOKEN,'demo')['payload'])
        with self.s.db() as db:self.assertEqual(db.execute('SELECT count(*) FROM blobs WHERE hash=?',(digest(b'atomic'),)).fetchone()[0],0)
        self.proof('control',state_events_receipt_blob_rollback=True)
    def test_12_identity_history_and_retry_guards(self):
        c=self.c('log',{'text':'no principal spoof'},actor='synthetic-reviewer',principal='synthetic-reviewer');r=self.s.command(TOKEN,c);self.assertEqual(r['principal'],'synthetic-writer');self.assertEqual(self.s.command(TOKEN,c),r)
        bad=copy.deepcopy(c);bad['payload']['text']='different'
        with self.assertRaises(Fault) as e:self.s.command(TOKEN,bad)
        self.assertEqual(e.exception.status,409)
        for typ in ('acl','sql','publish','rewrite_event','update_operation'):
            with self.assertRaises(Fault) as e:self.s.command(TOKEN,self.c(typ,{}))
            self.assertEqual(e.exception.status,403)
        with self.assertRaises(Fault) as e:self.s.context(TOKEN,'other','synthetic-416')
        self.assertEqual(e.exception.status,403);self.proof('control',authenticated_principal=r['principal'],immutable_history=True)
    def test_13_restore_no_empty_final_visibility_or_overwrite_race(self):
        pack=self.s.export(TOKEN,'demo');target=RUN/'visibility.restore.sqlite';original=Store.db;observed=[]
        from contextlib import contextmanager
        @contextmanager
        def observe(store):
            if store.path.name.startswith('.restore-'):observed.append(target.exists())
            with original(store) as db:yield db
        with patch.object(Store,'db',observe):restore(pack,target,bindings())
        self.assertTrue(observed);self.assertFalse(any(observed));self.assertTrue(target.exists())
        rival=RUN/'race.restore.sqlite';link=os.link
        def race(src,dst):rival.write_bytes(b'other owner target');return link(src,dst)
        with patch('service.os.link',race):
            with self.assertRaises(Fault) as e:restore(pack,rival,bindings())
        self.assertEqual(e.exception.status,409);self.assertEqual(rival.read_bytes(),b'other owner target');self.proof('R7',never_publishes_empty_target=True,no_rival_overwrite_or_delete=True)
    def test_14_restore_process_crash_before_publication(self):
        pack=self.s.export(TOKEN,'demo');inp=RUN/'crash-input.json';inp.write_text(canonical(pack),encoding='utf-8');target=RUN/'crash.restore.sqlite';marker=RUN/'crash-marker.json'
        script=RUN/'crash_child.py';script.write_text('''import sys,json,time,sqlite3\nfrom pathlib import Path\nfrom contextlib import contextmanager\nsys.path.insert(0,sys.argv[1])\nfrom service import Store,restore\nfrom demo import bindings\noriginal=Store.db\n@contextmanager\ndef pause(self):\n    if self.path.name.startswith('.restore-') and self.path.exists():\n        with sqlite3.connect(self.path) as check:\n            tables=check.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()\n        if ('workflows',) in tables:\n            Path(sys.argv[4]).write_text(json.dumps({'temporary':str(self.path),'target_exists':Path(sys.argv[3]).exists()}))\n            time.sleep(30)\n    with original(self) as db:yield db\nStore.db=pause\nrestore(json.loads(Path(sys.argv[2]).read_text(encoding='utf-8')),sys.argv[3],bindings())\n''',encoding='utf-8')
        p=subprocess.Popen([sys.executable,'-B',str(script),str(ROOT),str(inp),str(target),str(marker)])
        try:
            end=time.monotonic()+10
            while not marker.exists() and p.poll() is None and time.monotonic()<end:time.sleep(.02)
            self.assertTrue(marker.exists(),'restore never reached controlled crash window');m=json.loads(marker.read_text());self.assertFalse(m['target_exists'])
            p.terminate();p.wait(timeout=5);self.assertFalse(target.exists())
            self.assertTrue(restore(pack,target,bindings())['valid']);self.assertTrue(preflight(Store(target,bindings()).export(TOKEN,'demo'))['valid'])
            self.proof('R7',crash_did_not_publish_target=True,fresh_retry_succeeded=True,temporary_orphan_retained_for_evidence=True)
        finally:
            if p.poll() is None:p.terminate();p.wait(timeout=5)
if __name__=='__main__':
    result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(ReviewRegressions))
    (RUN/'regression-results.json').write_text(canonical({'at':now(),'tests_run':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'successful':result.wasSuccessful(),'checks':PROOFS}),encoding='utf-8');print('EVIDENCE='+str(RUN));sys.exit(0 if result.wasSuccessful() else 1)
