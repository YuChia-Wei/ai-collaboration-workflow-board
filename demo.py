"""Create disposable local synthetic bindings and initial vertical workflow."""
import argparse, base64, json, secrets, uuid
from pathlib import Path
from service import Store,canonical
SOURCE='a66957e00aa447be887258fa9b55fd89e39e96dd'
def bindings():
    return {'demo-writer-local-only':{'principal':'synthetic-writer','namespaces':{'demo':['read','write','export']}},'demo-reader-local-only':{'principal':'synthetic-reader','namespaces':{'demo':['read']}},'demo-reviewer-local-only':{'principal':'synthetic-reviewer','namespaces':{'demo':['read','approve']}},'demo-other-local-only':{'principal':'synthetic-other','namespaces':{'other':['read','write','export']}}}
def creation(wid='synthetic-416',ns='demo'):
    return {'namespace':ns,'workflow_id':wid,'type':'create_workflow','operation_id':str(uuid.uuid4()),'expected_revision':0,'client':'demo-seeder','session':'synthetic-init','payload':{'title':'合成 workflow #416','goal':'完整紀錄與跨 client 接續','authorized_scope':'P0/P1 synthetic only; no external writes','source':{'repo':'https://github.com/YuChia-Wei/ai-collaboration-framework','commit':SOURCE,'branch':'main','identity_kind':'read-only reference; synthetic work'} ,'policy_version':'prototype-v1','template_version':'prototype-v1','next_step':'建立並執行合成步驟','next_owner':'synthetic-writer','external_links':[{'provider':'synthetic','url':'https://example.invalid/work-item/416','observed_at':'2026-10-05T00:00:00Z','state':'synthetic-open'}],'legacy_mapping':{'old_id':'SYN-WF-416','source_commit':SOURCE,'original_reference':'synthetic://fixture/workflow.yaml'},'limitations':['No Sites/real-agent/account sharing validation'],'required_documents':['plan','missing-required']}}
def seed(store,token='demo-writer-local-only',count=2):
    c=creation(); store.command(token,c); revision=1
    def cmd(typ,payload):
        nonlocal revision
        c={'namespace':'demo','workflow_id':'synthetic-416','type':typ,'operation_id':str(uuid.uuid4()),'expected_revision':revision,'client':'demo-seeder','session':'synthetic-init','payload':payload}; r=store.command(token,c); revision=r['revision']; return c,r
    for i in range(1,count+1): cmd('add_step',{'id':f'T{i}','title':f'合成內部 step {i}','order':i,'owner_skill':'synthetic-implementer'})
    cmd('document',{'action':'create','id':'plan','name':'合成計畫.md','content':'# 合成計畫\n\n授權 P0/P1；不得部署。\n決策 DEC-1：單一可寫權威來源。','required':True,'final':True,'decision_ids':['DEC-1']})
    cmd('evidence',{'id':'E1','command':'python synthetic_check.py --fixture 1','result':'1 synthetic check passed','outcome':'passed','source_commit':SOURCE,'environment':{'mode':'synthetic','python':'3.13'},'blob_base64':base64.b64encode(b'synthetic attachment only\n').decode()})
    cmd('evidence',{'id':'E-failure','command':'synthetic upstream --timeout 1','result':'synthetic timeout; not a passed check','outcome':'failed','source_commit':SOURCE,'environment':{'mode':'synthetic'},'blob_base64':base64.b64encode(b'synthetic failure\n').decode()})
    cmd('update_step',{'id':'T1','status':'active'})
    cmd('update_step',{'id':'T1','status':'completed','result':'synthetic check passed','evidence_ids':['E1']})
    cmd('log',{'text':'合成日誌：完成 T1；保留失敗測試 E-failure。'})
    cmd('handoff',{'next_step':'讀取 plan 原始修訂並接續 T2','next_owner':'synthetic-reader','blockers':['missing-required 尚未建立'],'failures':['E-failure synthetic timeout'],'limitations':['source head drift must be checked','no real online account or agent E2E']})
    return revision
def main():
    p=argparse.ArgumentParser();p.add_argument('--runtime',default='../runtime');a=p.parse_args();root=Path(a.runtime).resolve();root.mkdir(parents=True,exist_ok=True)
    if (root/'records.sqlite').exists(): raise SystemExit('Refusing to reseed existing store. Choose a new runtime directory.')
    b=bindings();(root/'bindings.json').write_text(canonical(b),encoding='utf-8');s=Store(root/'records.sqlite',b);seed(s)
    print(canonical({'runtime':str(root),'workflow_id':'synthetic-416','bindings':'synthetic local-only values in bindings.json','external_effects_enabled':False}))
if __name__=='__main__':main()
