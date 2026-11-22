import assert from 'node:assert/strict';
import {handle} from '../Presentation/WebApi/entry.mjs';
import {sqliteCollaboration} from './Fixtures/collaboration-sqlite.mjs';

const {sqlite, db, faults} = sqliteCollaboration();
const store = 'observatory-test';
const scope = {store_id:store, project_id:'sky'};
const query = '/api/portfolio/v1/query';
const command = '/api/portfolio/v1/command';
const planner = {enabled:true, binding_id:'test', subject_id:'planner', capabilities:['read','plan','manage']};
const env = {DB:db, COLLABORATION_STORE_ID:store, COLLABORATION_BINDINGS:JSON.stringify({owner:planner, neighbor:planner})};
const readonly = {...env, COLLABORATION_BINDINGS:JSON.stringify({owner:{...planner, capabilities:['read']}})};
const v2 = {service_contract_version:'workflow-board/collaboration/2', schema_version:'2.0'};
function request(path, input, {owner='owner', environment=env}={}) {
  const headers = {'content-type':'application/json'};
  if (owner) headers['oai-authenticated-user-id'] = owner;
  return handle(new Request('https://portfolio.test'+path, {
    method:'POST', headers, body:JSON.stringify(input)
  }), environment);
}
async function post(path, input, options={}) {
  const response = await request(path,input,options);
  const body = await response.json();
  assert.equal(response.status,options.status ?? 200,JSON.stringify(body));
  return body;
}
function createProject(id, owner='owner') {
  return post('/api/collaboration/v2/commands', {...v2, project_ref:{store_id:store, namespace:'personal', project_id:id},
    operation_id:'initialize', expected_revision:0, command:'project.create', payload:{name:id}
  }, {owner});
}
const observed = '2026-11-22T01:00:00.000Z';
const north = {repository_id:'sky-catalog', issue_id:'north', source_version:'v1', number:11, title:'Find the north field',
  observed_at:observed, issue_state:'open', project_status:null};
const south = {...north, issue_id:'south', number:12, title:'Find the south field'};
const select = ({repository_id, issue_id, source_version}) => ({repository_id, issue_id, source_version});
function catalog(pbis, revision, operation_id) {
  return {...scope, operation_id, expected_revision:revision, command:'catalog.replace', catalog:{coverage:'complete', observed_at:observed, pbis}};
}
function workflow(action, operation_id, revision, pbis, fields={}) {
  return {...scope, workflow_id:'chart', operation_id, expected_revision:revision, command:action, pbis:pbis.map(select), ...fields};
}
async function chart() {
  const product = await post(query, scope);
  assert.equal(product.workflows.length,1);
  return product.workflows[0];
}
try {
  await createProject('sky');
  await createProject('sky','neighbor');
  await createProject('sea');
  const initial = await post(query,scope);
  assert.equal(initial.catalog.coverage,'unknown');
  assert.deepEqual(initial.workflows,[]);
  await post(query,scope,{owner:null,status:401});
  await post(query,{...scope,store_id:'another-store'},{status:403});
  await post(query,{...scope,project_id:'not-created'},{status:404});

  const seed = catalog([north,south],0,'catalog-1');
  await post(command,seed,{environment:readonly,status:403});
  assert.equal((await post(query,scope)).catalog.coverage,'unknown');
  await post(command,seed);
  assert.equal((await post(query,scope,{environment:readonly})).catalog.pbis.length,2);
  assert.deepEqual((await post(query,scope,{owner:'neighbor'})).catalog.pbis,[]);
  const otherProduct = {...scope,project_id:'sea'};
  const tide = {...north,repository_id:'sea-catalog',title:'Tide chart'};
  await post(command,{...catalog([tide],0,'sea-seed'),...otherProduct});
  const partial = {...catalog([tide],1,'interrupted-read'),...otherProduct};
  partial.catalog.coverage = 'partial';
  await post(command,partial);
  const observedCoverage = await post(query,{...otherProduct,view:'overview'});
  assert.equal(observedCoverage.catalog.coverage,'partial');
  assert.equal(observedCoverage.catalog.observed_at,observed);
  assert.equal(observedCoverage.workflow_count,0);
  assert.equal(Object.hasOwn(observedCoverage.catalog,'pbis'),false);

  const create = workflow('workflow.create','start-chart',0,[north],{title:'Draw a star chart',goal:'Compare the fields'});
  const created = await post(command,create);
  assert.equal(created.accepted,true);
  assert.deepEqual(await post(command,create),created);
  const renamed = {...north, title:'Verify the north field',source_version:'v2'};
  await post(command,catalog([renamed,south],1,'catalog-2'));
  let state = await chart();
  assert.deepEqual(state.pbis.map(p=>p.title),[north.title]);
  assert.equal(state.history[0].pbis[0].source_version,'v1');
  const ref = {...scope, namespace:'personal', record_kind:'collaboration', workflow_id:'chart'};
  const context = await post('/api/collaboration/v2/queries',{...v2,query:'workflow.context',payload:{workflow_ref:ref,limit:20}});
  assert.equal(context.workflow.title,create.title);
  assert.equal(context.workflow.external_work_refs[0].provider,'board-catalog');
  assert.deepEqual((await post(query,otherProduct)).workflows,[]);

  const addSouth = workflow('workflow.link','link-south',state.revision,[south]);
  await post(command,addSouth,{environment:readonly,status:403});
  const absent = await post(command,workflow('workflow.link','foreign',state.revision,[tide]),{status:404});
  assert.equal(absent.failure.error,'pbi_not_found');
  assert.equal((await chart()).revision,state.revision);
  // Both planners read the same revision. Only one change may appear in the feed.
  const responseStatuses = await Promise.all([addSouth,{...addSouth,operation_id:'also-link-south'}].map(async input => {
    const response = await request(command,input);
    return response.status;
  }));
  assert.deepEqual(responseStatuses.sort(),[200,409]);
  state = await chart();
  assert.deepEqual(state.pbis.map(p=>p.issue_id).sort(),['north','south']);
  assert.equal(state.history.length,2);

  const remove = workflow('workflow.unlink','remove-north',state.revision,[north]);
  faults.loseResponse = true;
  // A server can confirm the commit immediately or leave it unknown until retry.
  const lost = await request(command,remove);
  assert.ok([200,503].includes(lost.status));
  const recovered = await post(command,remove);
  assert.equal(recovered.accepted,true);
  state = await chart();
  assert.deepEqual(state.pbis.map(p=>p.issue_id),['south']);
  assert.equal(state.history.length,3);
  assert.equal(state.history[0].pbis[0].title,north.title);
  assert.equal(state.history.at(-1).pbis[0].source_version,'v1');
  assert.equal((await post(query,scope,{owner:'neighbor'})).workflows.length,0);
  console.log('PASS portfolio SQL/HTTP: scoped catalogs, authorization, frozen origin, revision race, unlink and durable replay');
} finally {
  sqlite.close();
}
