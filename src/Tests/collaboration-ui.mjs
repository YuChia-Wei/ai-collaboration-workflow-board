import assert from 'node:assert/strict';
import {handle,setPage} from '../Presentation/WebApi/entry.mjs';
import {sqliteCollaboration} from './Fixtures/collaboration-sqlite.mjs';
import {collaborationUiFixture} from '../Tooling/collaboration-ui-fixture.mjs';
import {createCollaborationClient} from '../Presentation/Web/collaboration-client.mjs';
import {detailMarkup,taskMarkup,decisionMarkup,listMarkup,documentButton} from '../Presentation/Web/collaboration-view.mjs';
import {recordBoardMarkup} from '../Presentation/Web/record-board.mjs';
import {reviewAvailability,reviewTargets,reviewQueueMarkup,reviewEditorMarkup,createReviewDraft,reviewConfirmationMarkup} from '../Presentation/Web/collaboration-review.mjs';

const {sqlite,db}=sqliteCollaboration(),store='ui-test';
const binding={enabled:true,subject_id:'agent-test',binding_id:'ui-test-grant',capabilities:['read','plan','execute','manage']};
const env={DB:db,COLLABORATION_STORE_ID:store,COLLABORATION_BINDINGS:JSON.stringify({'ui-owner':binding})};
const requests=[];
const fetcher=async(path,init)=>{
  requests.push(JSON.parse(init.body));
  return handle(new Request('https://board.test'+path,{...init,headers:{...init.headers,'oai-authenticated-user-id':'ui-owner'}}),env);
};
const client=createCollaborationClient(store,fetcher);
const plan=await collaborationUiFixture(store,'ui-test','2026-10-14T00:00:00.000Z');
let passed=0;
async function scenario(name,fn){await fn();passed++;console.log('PASS '+name);}
const fakeClient=handler=>createCollaborationClient(store,async(path,init)=>Response.json(await handler(JSON.parse(init.body))));
try {
  for(const step of plan.steps){
    const request=structuredClone(step.request);
    if(step.assignment_task){const c=await client.context(request.workflow_ref);request.payload.assignment=c.tasks.items.find(t=>t.id===step.assignment_task).assignment.ref;}
    const response=await fetcher('/api/collaboration/v1/commands',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request)});
    assert.equal(response.status,200);assert.equal((await response.json()).accepted,true);
  }
  requests.length=0;
  env.COLLABORATION_BINDINGS=JSON.stringify({'ui-owner':{...binding,capabilities:['read']}});
  const active=await client.context(plan.workflow_refs[0]),completed=await client.context(plan.workflow_refs[1]);
  await scenario('UI-01 / AC01: real queries preserve scope, source observation, owner and task states',async()=>{
    const list=await client.find();assert.equal(list.items.length,2);
    assert.match(listMarkup(list.items,null),/Workflow 協作與交接/);
    assert.deepEqual(active.tasks.items.map(t=>t.status),['completed','in_progress','blocked','pending']);
    const html=detailMarkup(active,'overview');
    for(const expected of [active.workflow.scope.included,active.workflow.scope.excluded,'agent-test','2026-10-14T00:00:00.000Z','Workflow Board #7'])assert.ok(html.includes(expected));
  });
  await scenario('UI-02 / AC02: completed work and workflow never imply human acceptance or session end',async()=>{
    const html=detailMarkup(completed,'overview');assert.match(html,/未提供接受紀錄/);assert.match(html,/契約未提供結束狀態/);assert.doesNotMatch(html,/100%/);
    const record=await client.task(completed,completed.tasks.items[0]);assert.match(taskMarkup(record),/未附證據/);
  });
  await scenario('UI-03 / AC03, AC05: exact document revision and hash are read without latest fallback',async()=>{
    const ref=active.workflow.plan;
    // Exercise the rendered button's wire value, not only a hand-built DTO.
    const attribute=documentButton(ref).match(/data-document="([^"]+)"/)[1].replaceAll('&quot;','"').replaceAll('&amp;','&');
    const doc=await client.document(active.workflow_ref,JSON.parse(attribute));
    assert.equal(doc.content,plan.documents[0].content);
    const request=requests.at(-1);assert.equal(request.query,'document.read');assert.deepEqual(request.payload.document_ref,ref);
    await assert.rejects(client.document(active.workflow_ref,{...ref,revision:9}),e=>e.code==='revision_not_found');
  });
  await scenario('UI-04 / AC04: read-only binding shows pending human decision without approval command',async()=>{
    const record=await client.decision(active,active.decisions.items[0]);assert.equal(record.resolution,null);
    assert.match(decisionMarkup(record),/尚未決定/);assert.match(detailMarkup(active,'decisions'),/人類審核尚未啟用/);
    assert.deepEqual((await client.capabilities()).commands,[]);
    assert.ok(requests.every(r=>r.query&&!r.command));
  });
  await scenario('UI-05 / AC05: handoff preserves blockers, next step and exact artifacts',async()=>{
    const html=detailMarkup(active,'handoff');assert.match(html,/缺少畫面驗收證據/);assert.match(html,/等待 DOING 完成/);assert.match(html,/revision 1/);
    const changed=structuredClone(active);changed.missing=[{kind:'document',ref:'plan@1',reason:'revision_not_found'}];
    assert.match(detailMarkup(changed,'overview'),/接手資料有缺漏/);
  });
  await scenario('UI-06 / snapshot: all pages are assembled only at the same workflow revision',async()=>{
    const initial=structuredClone(active);initial.tasks={items:active.tasks.items.slice(0,1),total:4,has_more:true,cursor:'cursor-1'};
    const calls=[];
    const paged=fakeClient(q=>{calls.push(q);return q.query==='workflow.context'?initial:{workflow_ref:active.workflow_ref,revision:active.revision,section:'tasks',page:{items:active.tasks.items.slice(1),total:4,has_more:false,cursor:null}};});
    assert.equal((await paged.context(active.workflow_ref)).tasks.items.length,4);assert.equal(calls.length,2);
    const stale=fakeClient(q=>q.query==='workflow.context'?initial:{workflow_ref:active.workflow_ref,revision:999,section:'tasks',page:{items:[],total:4,has_more:false,cursor:null}});
    await assert.rejects(stale.context(active.workflow_ref),e=>e.code==='snapshot_expired');
  });
  await scenario('UI-07 / integrity: altered document bytes are rejected before rendering',async()=>{
    const corrupt=fakeClient(()=>({ref:active.workflow.plan,content:'altered'}));
    await assert.rejects(corrupt.document(active.workflow_ref,active.workflow.plan),e=>e.code==='document_integrity_error');
  });
  await scenario('UI-08 / presentation: untrusted markup and unsafe source URLs cannot become executable HTML',async()=>{
    const c=structuredClone(active);c.workflow.title='<script>alert(1)</script>';c.workflow.external_work_refs[0].url='javascript:alert(1)';
    const html=detailMarkup(c,'overview');assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|href="javascript:/);
  });
  await scenario('UI-09 / AC04: forbidden and empty results stay explicit without another profile fallback',async()=>{
    const denied=createCollaborationClient(store,async()=>Response.json({error:'forbidden'},{status:403}));
    await assert.rejects(denied.find(),e=>e.code==='forbidden'&&e.message.includes('權限'));
    assert.match(listMarkup([],null),/沒有符合/);assert.match(listMarkup([],null),/不會改讀人工/);
  });
  await scenario('UI-10 / board: every task belongs to its actual status column, including cancelled and empty lanes',async()=>{
    const html=detailMarkup(active,'tasks');
    for(const [status,id] of [['pending','NEXT'],['in_progress','DOING'],['blocked','BLOCKED'],['completed','DONE']]){
      const column=html.match(new RegExp(`<section class="c-column c-column-${status}"[\\s\\S]*?</section>`))?.[0];
      assert.ok(column,`missing ${status} column`);assert.match(column,new RegExp(`data-task="${id}"`));
      assert.equal((column.match(/class="c-task-card"/g)||[]).length,1);
    }
    assert.match(html,/等待前置 · DOING/);assert.match(html,/待決策 · D-UI/);assert.match(html,/agent-test/);assert.doesNotMatch(html,/100%|draggable="true"/);
    const extra=structuredClone(active);extra.tasks.items.push({...extra.tasks.items[3],id:'CANCELLED',title:'取消的工作',status:'cancelled'});
    assert.match(detailMarkup(extra,'tasks'),/c-column-cancelled/);
    extra.tasks.items=[];const empty=detailMarkup(extra,'tasks');
    assert.equal((empty.match(/c-column-empty/g)||[]).length,4);assert.match(empty,/尚無工作/);
    const hostile=structuredClone(active);hostile.tasks.items[0].title='<img src=x onerror=alert(1)>';
    assert.match(detailMarkup(hostile,'tasks'),/&lt;img/);assert.doesNotMatch(detailMarkup(hostile,'tasks'),/<img/);
  });
  await scenario('UI-11 / existing records: empty manual workflow offers task creation; source statuses remain distinct',async()=>{
    const empty=recordBoardMarkup({record_mode:'board',status:'pending',steps:{}});
    assert.match(empty,/目前沒有 task/);assert.match(empty,/data-action="addTask"/);assert.equal((empty.match(/c-column-empty/g)||[]).length,3);
    const source=recordBoardMarkup({record_mode:'source_snapshot',steps:{a:{id:'a',title:'未記錄',status:null},b:{id:'b',title:'延期',status:'deferred'},c:{id:'c',title:'歷史完成',status:'done'}}});
    for(const status of ['unrecorded','deferred','done'])assert.ok(source.includes(`c-column-${status}`));
    assert.doesNotMatch(source,/data-action="addTask"|data-task=/);
    assert.match(source,/data-open-task="a"/);
    assert.doesNotMatch(recordBoardMarkup({record_mode:'board',status:'completed',steps:{}}),/data-action="addTask"/);
  });
  await scenario('UI-12 / entry: server supplies only its public store ID, without exposing bindings or accepting markup',async()=>{
    setPage('<html><head></head><body></body></html>');
    const page=await (await handle(new Request('https://board.test/'),{...env,COLLABORATION_STORE_ID:'configured-store',OTHER_SECRET:'never-publish-me'})).text();
    assert.match(page,/<meta name="collaboration-store" content="configured-store">/);
    assert.doesNotMatch(page,/never-publish-me|ui-owner|ui-test-grant/);
    const unsafe=await (await handle(new Request('https://board.test/'),{...env,COLLABORATION_STORE_ID:'"><script>alert(1)</script>'})).text();
    assert.doesNotMatch(unsafe,/<script|collaboration-store/);
  });
  await scenario('UI-13 / review queue: pending decisions and submitted results remain distinct, not accepted',async()=>{
    assert.deepEqual(reviewTargets(active).map(t=>t.key),['decision:D-UI','task:DONE']);
    assert.match(reviewQueueMarkup(active),/審核狀態未提供/);
    const empty=structuredClone(active);empty.decisions.items=[];empty.tasks.items=[];
    assert.match(reviewQueueMarkup(empty),/目前沒有待決策/);
    assert.equal(reviewAvailability.enabled,false);
  });
  await scenario('UI-14 / draft flow: real snapshot reading to confirmation preserves refs without writing approval',async()=>{
    const before=requests.length;
    for(const target of reviewTargets(active)){
      const record=await client[target.kind](active,active[target.kind==='task'?'tasks':'decisions'].items.find(t=>t.id===target.id));
      const markup=reviewEditorMarkup(active,target,record);assert.match(markup,/預覽審閱草稿/);
      const draft=createReviewDraft(active,target,record,{outcome:'request_changes',reason:'請補充 <script> 證據'});
      assert.equal(draft.status,'unsent');assert.deepEqual(draft.workflow_ref,active.workflow_ref);assert.deepEqual(draft.basis,[active.workflow.plan]);
      assert.equal(draft.snapshot_revision,active.revision);assert.equal(draft.command,undefined);assert.equal(draft.actor,undefined);
      const html=reviewConfirmationMarkup(draft);assert.match(html,/disabled aria-describedby/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
      assert.match(html,/不是|不會/);assert.match(html,/尚未送出/);
    }
    assert.ok(requests.slice(before).every(r=>r.query&&!r.command));
  });
  await scenario('UI-15 / draft validation: stale snapshots, mismatched identities and empty reasons never produce confirmation',async()=>{
    const target=reviewTargets(active)[0],record=await client.decision(active,active.decisions.items[0]);
    const values={outcome:'approve',reason:'依據已讀取'};
    assert.throws(()=>createReviewDraft(active,target,record,{...values,reason:'  '}),/填寫/);
    assert.throws(()=>createReviewDraft(active,target,record,{...values,outcome:'accept'}),/選擇/);
    assert.throws(()=>createReviewDraft({...active,revision:active.revision+1},target,record,values),/快照不符/);
    assert.throws(()=>createReviewDraft(active,target,{...record,workflow_ref:{...record.workflow_ref,store_id:'other'}},values),/快照不符/);
    assert.throws(()=>createReviewDraft(active,target,{...record,decision:{...record.decision,revision:999}},values),/快照不符/);
  });
  console.log(JSON.stringify({scenarios:passed,passed:true,scope:'UI query client, review drafts and presentation against local SQLite/production HTTP root; no hosted or human approval proof'}));
} finally {sqlite.close();}
