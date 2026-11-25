import assert from 'node:assert/strict';

// Exercise the real HTTP handler and migrated SQLite store. Two owners have
// identically named projects, and the external catalog already contains north.
export async function verifyNativeBacklog({post, request, query, command, scope, readonly, faults, db}) {
  const read = (options = {}) => post(query, scope, options);
  let revision = 0;
  function mutation(name, fields) {
    return {...scope, operation_id:crypto.randomUUID(), expected_revision:revision, command:name, ...fields};
  }
  function create(item_id, kind, parent_id = null, fields = {}) {
    return mutation('backlog.create', {
      item_id, kind, title:item_id, description:'', parent_id,
      related_story_id:null, expected_behavior:'', actual_behavior:'', ...fields
    });
  }
  function edit(item, fields) {
    const {item_id, title, description, related_story_id, expected_behavior, actual_behavior, status} = item;
    return mutation('backlog.edit', {
      item_id, title, description, related_story_id, expected_behavior, actual_behavior, status, ...fields
    });
  }
  const transition=(item_id,to_state,extra={})=>mutation('backlog.transition',{item_id,to_state,reason:'',resolution:null,original_id:null,...extra});
  async function accept(input) {
    const receipt = await post(command, input);
    assert.equal(receipt.accepted, true);
    assert.equal(receipt.revision, ++revision);
    assert.equal(receipt.store_id, scope.store_id);
    assert.equal(receipt.project_id, scope.project_id);
    return receipt;
  }
  async function refused(input) {
    const response = await request(command, input);
    assert.ok([404, 409, 422].includes(response.status), await response.text());
    assert.equal((await read()).backlog.revision, revision);
  }
  const ref = item => ({source:'native', item_id:item.item_id, source_version:item.source_version});
  const itemById = async id => (await read()).backlog.items.find(item => item.item_id === id);

  const emptyBacklog = {revision:0, items:[], sprint_settings:{duration_weeks:2,start_weekday:1}, sprints:[]};
  assert.deepEqual((await read()).backlog, emptyBacklog);
  const epic = create('map', 'epic');
  await post(command, epic, {environment:readonly, status:403});
  await post(command, {...epic, project_id:'legacy-personal'}, {status:403});
  faults.loseResponse = true;
  const firstResponse = await request(command, epic);
  assert.ok([200, 503].includes(firstResponse.status));
  const first = await accept(epic);
  await refused(create('skip-feature', 'user_story', 'map'));
  await accept(create('layers', 'feature', 'map'));
  await accept(create('legend', 'user_story', 'layers'));
  await accept(create('north-label', 'task', 'legend'));
  await refused(create('orphan', 'task'));
  await refused(create('north', 'bug'));
  const bugFields = {title:'Incorrect direction', related_story_id:'legend', expected_behavior:'North is up', actual_behavior:'North is down'};
  await refused(create('north', 'bug', 'legend', bugFields));
  await refused(create('north', 'bug', null, {...bugFields, related_story_id:'layers'}));
  await accept(create('north', 'bug', null, bugFields));
  await refused(create('bug-child', 'task', 'north'));
  await refused(create('duplicate', 'epic', null, {expected_behavior:'Unexpected'}));
  await refused(create('map', 'epic'));
  await refused(mutation('backlog.move', {item_id:'north', before_id:'layers'}));
  const independentBug = create('other-bug', 'bug', null, {...bugFields, related_story_id:null});
  const stale = create('stale', 'epic');
  await accept(independentBug);
  await post(command, stale, {status:409});
  const move = mutation('backlog.move', {item_id:'north', before_id:'map'});
  const race = await Promise.all([move, {...move, operation_id:'other-move'}].map(input => request(command, input)));
  assert.deepEqual(race.map(response => response.status).sort(), [200,409]);
  revision++;
  const afterMove = await read();
  assert.deepEqual(afterMove.backlog.items.filter(item => item.parent_id === null).map(item => item.item_id), ['north','map','other-bug']);
  assert.equal(afterMove.backlog.revision, revision);
  assert.deepEqual(await post(command, epic), first);
  await post(command, {...epic, title:'different'}, {status:409});
  await post(command, epic, {environment:readonly, status:403});
  assert.deepEqual((await read({owner:'neighbor'})).backlog, emptyBacklog);
  const elsewhere = {...scope, project_id:'sea'};
  assert.deepEqual((await post(query, elsewhere)).backlog, emptyBacklog);
  const foreignStory = create('other-task', 'task', 'legend');
  const foreignResponse = await request(command, {...foreignStory, ...elsewhere, expected_revision:0});
  assert.ok([404, 409, 422].includes(foreignResponse.status));
  assert.deepEqual((await post(query, elsewhere)).backlog, emptyBacklog);

  const bug = await itemById('north');
  const story = await itemById('legend');
  const source = afterMove.catalog.pbis.find(item => item.issue_id === 'north');
  const external = {repository_id:source.repository_id, issue_id:source.issue_id, source_version:source.source_version};
  const flow = {...scope, workflow_id:'fix-label', operation_id:'begin-fix', expected_revision:0,
    command:'workflow.create', title:'Correct the legend', goal:'Restore the displayed north direction', pbis:[ref(bug), ref(story), external]};
  await post(command, flow);
  await refused(edit(bug,{status:'closed'}));
  await accept(edit(bug,{title:'Direction reversed'}));
  await refused(transition('north','retesting'));
  await accept(transition('north','triaged'));
  await refused(transition('north','done',{resolution:'duplicate',reason:'Already reported',original_id:'north'}));
  await refused(transition('north','done',{resolution:'wont_fix'}));
  await accept(transition('north','done',{resolution:'duplicate',reason:'Tracked on the original',original_id:'other-bug'}));
  const changed = await itemById('north');
  assert.equal(changed.status, 'closed');
  assert.equal(changed.state_id,'done');
  assert.equal(changed.state_history.at(-1).original_id,'other-bug');
  assert.equal(changed.state_history.at(-1).actor.subject_id,'planner');
  assert.ok(!Number.isNaN(Date.parse(changed.state_history.at(-1).at)));
  assert.notEqual(changed.source_version, bug.source_version);
  await accept(transition('north','active'));
  await accept(transition('north','retesting'));
  await accept(transition('north','active',{reason:'Fails on Sunday'}));
  await accept(transition('map','active'));
  await accept(transition('map','done'));
  assert.equal((await itemById('layers')).status, 'open');
  await post(command, {...flow, workflow_id:'stale-selection', operation_id:'stale-selection', pbis:[ref(bug)]}, {status:409});
  const linked = (await read()).workflows.find(workflow => workflow.workflow_id === flow.workflow_id);
  const {state_history:bugHistory,...bugSnapshot}=bug;
  const {state_history:storyHistory,...storySnapshot}=story;
  assert.deepEqual(linked.pbis, [bugSnapshot, storySnapshot, source]);
  assert.equal(linked.pbis.find(item => item.source === 'native').title, bug.title);
  await post(command, {...scope, command:'workflow.unlink', operation_id:'release-native', workflow_id:flow.workflow_id,
    expected_revision:linked.revision, pbis:[ref(bug)]});
  const unlinked = (await read()).workflows.find(workflow => workflow.workflow_id === flow.workflow_id);
  assert.deepEqual(unlinked.pbis, [storySnapshot, source]);
  assert.deepEqual(unlinked.history.at(-1).pbis[0], linked.pbis.find(item => item.source === 'native'));
  assert.equal((await itemById('north')).status, 'open');
  const beforeRefresh = await read();
  await post(command, {...scope, command:'catalog.replace', operation_id:'empty-external',
    expected_revision:beforeRefresh.catalog.revision, catalog:{coverage:'complete', observed_at:beforeRefresh.catalog.observed_at, pbis:[]}});
  const refreshed = await read();
  assert.deepEqual(refreshed.catalog.pbis, []);
  assert.deepEqual(refreshed.backlog, beforeRefresh.backlog);

  // A planning request has already selected the current Bug when another
  // session changes it. Interleave the edit immediately before the next commit.
  const selected = await itemById('north');
  const racingFlow = {...flow, workflow_id:'concurrent-selection', operation_id:'concurrent-selection', pbis:[ref(selected)]};
  const batch = db.batch;
  db.batch = async statements => {
    db.batch = batch;
    await accept(edit(selected, {title:'New inspection result'}));
    return batch.call(db, statements);
  };
  try {
    const rejected = await post(command, racingFlow, {status:409});
    assert.equal(rejected.failure.error, 'pbi_version_conflict');
    assert.deepEqual(await post(command, racingFlow, {status:409}), rejected);
    const afterRace = await read();
    assert.equal(afterRace.workflows.some(item => item.workflow_id === racingFlow.workflow_id), false);
    assert.equal(afterRace.backlog.items.find(item => item.item_id === selected.item_id).title, 'New inspection result');
  } finally {
    db.batch = batch;
  }
  const beforeConfig=await read(),storyFlow=structuredClone(beforeConfig.lifecycle.flows.user_story);
  await accept(transition('legend','active'));
  storyFlow.states.find(state=>state.id==='active').label='開發中';
  storyFlow.states.push({id:'review',label:'Code Review',category:'open'});
  storyFlow.transitions=storyFlow.transitions.filter(edge=>!(edge.from==='active'&&edge.to==='testing'));
  storyFlow.transitions.push({from:'active',to:'review',mode:'normal'},{from:'review',to:'testing',mode:'normal'});
  const saveSettings=flow=>mutation('lifecycle.configure',{kind:'user_story',flow});
  await post(command,saveSettings(storyFlow),{environment:readonly,status:403});
  const settings=saveSettings(storyFlow);
  const settingsReceipt=await accept(settings);
  assert.deepEqual(await post(command,settings),settingsReceipt);
  assert.equal((await post(query,elsewhere)).lifecycle.flows.user_story.states.some(state=>state.id==='review'),false);
  assert.equal((await itemById('legend')).state_history.at(-1).to.label,'Active');
  await refused(transition('legend','testing'));
  await accept(transition('legend','review'));
  assert.equal((await itemById('legend')).state_history.at(-1).from.label,'開發中');
  const cannotRemove=structuredClone(beforeConfig.lifecycle.flows.user_story);
  await refused(saveSettings(cannotRemove));
  const cannotReclassify=structuredClone(storyFlow);
  cannotReclassify.states.find(state=>state.id==='review').category='closed';
  await refused(saveSettings(cannotReclassify));
  await accept(transition('legend','testing'));
  await accept(transition('legend','active'));

  // A pre-lifecycle record genuinely has neither a typed state nor an event.
  const old={...bugSnapshot,item_id:'old-report',source_version:String(++revision),status:'closed'};
  delete old.state_id;
  delete old.sprint_id;
  await db.batch([db.prepare('INSERT INTO portfolio_backlog_items(owner,store_id,project_id,item_id,parent_id,position,revision,body) VALUES(?,?,?,?,?,?,?,?)')
    .bind('owner',scope.store_id,scope.project_id,old.item_id,null,3,revision,JSON.stringify(old))]);
  const readOld=await itemById(old.item_id);
  assert.equal(readOld.state_id,null);
  assert.equal(readOld.sprint_id,null);
  assert.deepEqual(readOld.state_history,[]);
  await refused(transition(old.item_id,'active'));
  await accept(edit(readOld,{status:'open'}));
  const reopened=await itemById(old.item_id);
  assert.equal(reopened.state_id,null);
  assert.equal(reopened.state_history.length,1);
  await accept(transition(old.item_id,'triaged'));
  assert.deepEqual((await itemById(old.item_id)).state_history.at(-1).from,{id:null,label:'open',category:'open'});
  await accept(transition(old.item_id,'done',{reason:'Feature retired',resolution:'wont_fix'}));
  const sprint = (sprint_id,start_date) => mutation('backlog.create_sprint',{sprint_id,name:sprint_id,start_date});
  const cadence = (duration_weeks,start_weekday) => mutation('backlog.configure_sprints',{duration_weeks,start_weekday});
  const yearEnd = {sprint_id:'year-end',name:'year-end',start_date:'2026-12-28',end_date:'2027-01-10'};
  const firstSprint = sprint(yearEnd.sprint_id,yearEnd.start_date);
  await post(command,firstSprint,{environment:readonly,status:403});
  const sprintReceipt = await accept(firstSprint);
  assert.deepEqual(await post(command,firstSprint),sprintReceipt);
  assert.equal((await itemById('north')).sprint_id,null);
  // Serialize a cadence change against a competing creation at the same revision.
  const competing = sprint('competing','2027-02-01');
  await accept(cadence(1,7));
  await post(command,competing,{status:409});
  for(const date of ['2027-01-10','2027-01-11','2027-02-29']) await refused(sprint('invalid',date));
  await refused(cadence(0,1));
  await refused(cadence(2,8));
  await accept(sprint('january','2027-01-17'));
  const calendar = (await read()).backlog;
  assert.deepEqual(calendar.sprint_settings,{duration_weeks:1,start_weekday:7});
  assert.deepEqual(calendar.sprints,[yearEnd,{sprint_id:'january',name:'january',start_date:'2027-01-17',end_date:'2027-01-23'}]);
  assert.deepEqual((await read({owner:'neighbor'})).backlog,emptyBacklog);
  const planned = create('planned','epic',null,{sprint_id:'year-end'});
  await post(command,{...planned,...elsewhere,expected_revision:0},{status:404});
  await accept(planned);
  await accept(create('unplanned-child','feature','planned'));
  assert.equal((await itemById('unplanned-child')).sprint_id,null);
  await accept(edit(await itemById('planned'),{title:'Renamed by an older client'}));
  assert.equal((await itemById('planned')).sprint_id,'year-end');
  await accept(edit(await itemById('planned'),{sprint_id:'january'}));
  assert.equal((await itemById('planned')).sprint_id,'january');
  await accept(edit(await itemById('planned'),{sprint_id:null}));
  assert.equal((await itemById('planned')).sprint_id,null);
  console.log('PASS sprint planning: dated periods, inclusive overlap, cadence revisions, scoped assignments, unassigned defaults and compatible edits');
  console.log('PASS PBI lifecycle: custom transitions, immutable history, Bug dispositions and explicit legacy adoption');
  console.log('PASS private Scrum backlog: hierarchy, separate Bug, sibling ordering, owner isolation, independent revisions, retries and workflow snapshots');
}
