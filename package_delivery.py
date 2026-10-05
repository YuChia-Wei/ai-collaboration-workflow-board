"""Create a portable source + synthetic evidence ZIP without private host paths."""
import hashlib,json,os,re,subprocess,zipfile
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parent; BASE=ROOT.parent; EVIDENCE=BASE/'evidence'; OUTPUT=BASE/'workflow-416-p0-p1.zip'
def git(*args):return subprocess.check_output(['git','-C',str(ROOT),*args],text=True).strip()
def redact(data):
    text=data.decode('utf-8-sig')
    # Logs may have Windows traceback paths, including escaped JSON versions.
    for path in [str(BASE),str(BASE).replace('\\','\\\\'),str(BASE).replace('\\','/')]:text=text.replace(path,'<LOCAL_WORKSPACE>')
    text=re.sub(r'C:\\\\Users\\\\[^\\"]+', '<LOCAL_USER>',text)
    text=re.sub(r'C:\\Users\\[^\\\n\'"]+', '<LOCAL_USER>',text)
    return text.encode()
def main():
    if git('status','--porcelain'):raise SystemExit('Commit source before packaging')
    bundle=EVIDENCE/'prototype.bundle';subprocess.check_call(['git','-C',str(ROOT),'bundle','create',str(bundle),'--all'])
    files={}
    for name in git('ls-files').splitlines():files['prototype/'+name]=(ROOT/name).read_bytes()
    # Include the isolated source repository's own Git history, no remote/config secrets.
    for f in (ROOT/'.git').rglob('*'):
        if f.is_file() and not any(x in {'logs','hooks'} for x in f.relative_to(ROOT/'.git').parts) and f.name not in {'COMMIT_EDITMSG'}:files['prototype/'+f.relative_to(ROOT).as_posix()]=f.read_bytes()
    files['prototype.bundle']=bundle.read_bytes()
    for name in ['REPORT.md','issue.json','comments.json','ui-context.json','ui-proof.json','source/manifest.json','test-attempt-1.log','test-attempt-2.log','test-attempt-3.log','final-provenance.json']:
        f=EVIDENCE/name
        if f.exists():files['evidence/'+name]=redact(f.read_bytes())
    for run in sorted(EVIDENCE.glob('run-*')):
        for name in ['proofs.json','test-summary.json','cross-client-transcript.json','final-export.json','replacement-after-continuation.json','loss-outbox.json','offline-outbox.json','rejected-outbox.json']:
            f=run/name
            if f.exists():files['evidence/'+run.name+'/'+name]=redact(f.read_bytes())
    manifest={'format':'workflow-416-p0-p1-delivery','version':1,'created_at':datetime.now(timezone.utc).isoformat(),'source_sha':'a66957e00aa447be887258fa9b55fd89e39e96dd','prototype_sha':git('rev-parse','HEAD'),'files':[{'path':p,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()} for p,b in sorted(files.items())],'excludes':['runtime bindings/credentials','company data','reference repository','private absolute host paths'],'scope':'P0/P1 synthetic local only'}
    files['DELIVERY-MANIFEST.json']=json.dumps(manifest,ensure_ascii=False,indent=2).encode()
    with zipfile.ZipFile(OUTPUT,'w',zipfile.ZIP_DEFLATED) as z:
        for p,b in sorted(files.items()):z.writestr(p,b)
    with zipfile.ZipFile(OUTPUT) as z:
        assert z.testzip() is None
        for f in manifest['files']:assert hashlib.sha256(z.read(f['path'])).hexdigest()==f['sha256']
        for p in z.namelist():
            if p.endswith(('.json','.log','.md','.py','.html')):assert Path.home().name.encode() not in z.read(p),p
    proof={'zip':OUTPUT.name,'bytes':OUTPUT.stat().st_size,'sha256':hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),'manifest_files_verified':len(manifest['files']),'source_commit':manifest['source_sha'],'prototype_commit':manifest['prototype_sha']}
    (EVIDENCE/'delivery-proof.json').write_text(json.dumps(proof,indent=2),encoding='utf-8');print(json.dumps(proof))
if __name__=='__main__':main()
