import assert from 'node:assert/strict';
import {verifyDeliveryBrowser} from './portfolio-delivery-browser.mjs';

async function expand(page, selector) {
  const details = page.locator(selector);
  if (await details.getAttribute('open') === null) {
    await details.locator(':scope > summary').click();
  }
}

export async function verifyPrivateScrumBoard(openSession) {
  const writer = await openSession();
  const page = writer.page;
  await expand(page, '[data-new-product]');
  const productForm = page.locator('form[data-command="project.create"]');
  await productForm.getByLabel('產品名稱').fill('林徑巡查');
  await productForm.getByRole('button').click();
  await page.getByRole('heading', {level:1, name:'林徑巡查'}).waitFor();
  const boardUrl = page.url();
  const boardLink = () => page.getByRole('navigation', {name:'產品看板'}).getByRole('link', {name:'Scrum Board'});
  async function sprintForm(selector){
    await expand(page,'[data-sprint-planning]');
    await expand(page,selector);
    return page.locator(selector+' form');
  }
  async function saveSprintForm(form){
    const submitted=form.getByRole('button');
    const [write]=await Promise.all([
      page.waitForResponse(r=>r.url().endsWith('/api/portfolio/v1/command')),
      page.waitForResponse(r=>r.url().endsWith('/api/portfolio/v1/query')),
      submitted.click()
    ]);
    assert.equal(write.status(),200,await write.text());
    await page.locator('#page:not([aria-busy]) h1').waitFor();
  }
  const first='春季檢查（2027-02-03 ～ 2027-02-16）';
  const second='修正複查（2027-02-19 ～ 2027-02-25）';
  const initialSettings=await sprintForm('[data-sprint-settings]');
  assert.equal(await initialSettings.locator('[name=duration_weeks]').inputValue(),'2');
  assert.equal(await initialSettings.locator('[name=start_weekday]').inputValue(),'1');
  await initialSettings.locator('[name=start_weekday]').selectOption('3');
  await saveSprintForm(initialSettings);
  const firstForm=await sprintForm('[data-new-sprint]');
  await firstForm.getByLabel('Sprint 名稱').fill('春季檢查');
  await firstForm.getByLabel('開始日期').fill('2027-02-03');
  assert.equal(await firstForm.locator('[data-sprint-end]').innerText(),'2027-02-16');
  await saveSprintForm(firstForm);
  assert.equal(await (await sprintForm('[data-new-sprint]')).getByLabel('開始日期').inputValue(),'2027-02-17');
  const laterSettings=await sprintForm('[data-sprint-settings]');
  await laterSettings.locator('[name=start_weekday]').selectOption('5');
  await laterSettings.locator('[name=duration_weeks]').selectOption('1');
  await saveSprintForm(laterSettings);
  const secondForm=await sprintForm('[data-new-sprint]');
  assert.equal(await secondForm.getByLabel('開始日期').inputValue(),'2027-02-19');
  assert.equal(await secondForm.locator('[data-sprint-end]').innerText(),'2027-02-25');
  await secondForm.getByLabel('Sprint 名稱').fill('修正複查');
  await saveSprintForm(secondForm);
  async function add(kind, title, parent = null, sprint=null) {
    await expand(page, '[data-new-item]');
    const form = page.locator('form[data-command="backlog.create"]');
    await form.getByLabel('類型').selectOption(kind);
    await form.getByLabel('標題').fill(title);
    const plan=form.locator('[name=sprint_id]');
    assert.equal(await plan.inputValue(),'','New items must always start unscheduled');
    assert.deepEqual(await plan.locator('option').allTextContents(),['尚未排入 Sprint',first,second]);
    if(sprint)await plan.selectOption({label:sprint});
    if (parent) await form.locator('[name="parent_id"]').selectOption(parent);
    if (kind === 'bug') {
      await form.getByLabel('預期行為').fill('封閉路線應顯示停用');
      await form.getByLabel('實際行為').fill('封閉路線仍可預約');
    }
    await form.getByRole('button', {name:'建立 PBI'}).click();
    await page.getByRole('heading', {level:1, name:title}).waitFor();
    await page.locator('dl.facts').getByText(sprint??'尚未排入 Sprint',{exact:true}).waitFor();
    const id = new URL(page.url()).searchParams.get('item');
    assert.ok(id, 'Native details use a stable item link');
    if(sprint){
      await expand(page,'[data-edit-item]');
      const edit=page.locator('form[data-command="backlog.edit"]');
      assert.equal(await edit.locator('[name=sprint_id] option:checked').innerText(),sprint);
      await edit.locator('[name=sprint_id]').selectOption('');
      await saveSprintForm(edit);
      await page.locator('dl.facts').getByText('尚未排入 Sprint',{exact:true}).waitFor();
    }
    await boardLink().click();
    return id;
  }
  const bug = await add('bug', '封閉路線可預約');
  const epic = await add('epic', '路線資訊');
  const feature = await add('feature', '路線狀態', epic, second);
  const story = await add('user_story', '查看通行狀態', feature);
  const task = await add('task', '標示封閉路段', story);
  const roots = page.locator('section > ol.backlog-tree > li');
  await roots.nth(1).getByRole('button', {name:'上移', exact:true}).click();
  await page.waitForFunction(id => document.querySelector('section > ol.backlog-tree > li')?.dataset.itemId === id, epic);
  await expand(page,'[data-lifecycle-settings]');
  await page.locator('[data-flow-kind]').selectOption('user_story');
  const settings=page.locator('form[data-command="lifecycle.configure"]');
  await settings.locator('[data-flow-state]').filter({has:page.locator('input[name="state_id"][value="active"]')}).getByLabel('顯示名稱').fill('開發中');
  await settings.locator('[data-flow-add-state]').click();
  const newState=settings.locator('[data-flow-state]').last();
  await newState.getByLabel('狀態代碼').fill('review');
  await newState.getByLabel('顯示名稱').fill('Code Review');
  for(const [from,to] of [['active','review'],['review','testing']]){
    await settings.locator('[data-flow-add-edge]').click();
    const edge=settings.locator('[data-flow-edge]').last();
    await edge.locator('[name=edge_from]').selectOption(from);
    await edge.locator('[name=edge_to]').selectOption(to);
  }
  const [saved]=await Promise.all([
    page.waitForResponse(response=>response.url().endsWith('/api/portfolio/v1/command')&&response.request().postDataJSON()?.command==='lifecycle.configure'),
    settings.getByRole('button',{name:'儲存工作流程'}).click()
  ]);
  assert.equal(saved.status(),200);
  await page.getByRole('link',{name:'狀態看板',exact:true}).click();
  await page.locator('[data-stage-target="review"]').getByRole('heading',{name:/Code Review/}).waitFor();
  const storyCard=page.locator('[data-stage-item="'+story+'"]');
  await storyCard.dragTo(page.locator('[data-stage-target="active"]'));
  await page.getByRole('heading',{level:1,name:'查看通行狀態'}).waitFor();
  const change=page.locator('form[data-command="backlog.transition"]');
  assert.equal(await change.locator('[name=to_state]').inputValue(),'active');
  assert.equal(await page.locator('[data-item-lifecycle] > p').innerText(),'New');
  async function goToState(id,label){
    await change.locator('[name=to_state]').selectOption(id);
    await change.getByRole('button',{name:'更新工作狀態'}).click();
    await page.waitForFunction(text=>document.querySelector('[data-item-lifecycle] > p')?.textContent===text,label);
  }
  await goToState('active','開發中');
  await goToState('review','Code Review');
  await boardLink().click();
  const bugRow = page.locator('li[data-item-id="'+bug+'"]');
  await bugRow.getByRole('link').click();
  await expand(page, '[data-edit-item]');
  const edit = page.locator('form[data-command="backlog.edit"]');
  await edit.getByLabel('受影響的 User Story').selectOption(story);
  await edit.locator('[name=sprint_id]').selectOption({label:first});
  await edit.getByRole('button', {name:'儲存變更'}).click();
  await page.locator('dl.facts').getByRole('link', {name:'查看通行狀態'}).waitFor();
  await goToState('triaged','Triaged');
  await goToState('active','Active');
  await goToState('retesting','Retesting');
  const createFlow = page.locator('form[data-command="workflow.create"]');
  await createFlow.getByLabel('名稱', {exact:true}).fill('核對路線資料');
  await createFlow.getByLabel('工作目標', {exact:true}).fill('確認封閉路線資料');
  await createFlow.getByRole('button').click();
  await page.getByRole('heading', {level:1, name:'核對路線資料'}).waitFor();
  await verifyDeliveryBrowser(page,boardUrl,bug);
  await writer.context.close();

  const reader = await openSession();
  const other = reader.page;
  await other.goto(boardUrl);
  const top = other.locator('section > ol.backlog-tree > li');
  await top.nth(1).waitFor();
  assert.deepEqual(await top.evaluateAll(nodes => nodes.map(n => n.dataset.itemId)), [epic, bug]);
  const storyRow = top.first().locator('li[data-item-id="'+feature+'"] > ol > li[data-item-id="'+story+'"]');
  await storyRow.locator('li[data-item-id="'+task+'"]').waitFor();
  assert.match(await top.last().innerText(), /Retesting/);
  assert.match(await top.last().innerText(), /春季檢查/);
  assert.match(await storyRow.innerText(), /Code Review/);
  await top.last().getByRole('link').click();
  await other.locator('dl.facts').getByText(first,{exact:true}).waitFor();
  await other.locator('[data-item-lifecycle]').getByText('Active → Retesting',{exact:true}).waitFor();
  await other.getByRole('link', {name:'核對路線資料'}).click();
  await other.getByRole('heading', {level:1, name:'核對路線資料'}).waitFor();
  await reader.context.close();
  console.log('PASS private Scrum Board across browser sessions: Sprint cadence and fixed dates, optional PBI assignment and removal, manual hierarchy and ordering, custom states, drag intent and explicit transition, Bug retest history and its linked workflow');
}
