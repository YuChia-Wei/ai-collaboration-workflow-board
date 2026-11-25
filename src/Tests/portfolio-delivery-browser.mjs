import assert from 'node:assert/strict';

// Use only the ordinary product UI and the caller's disposable preview.
export async function verifyDeliveryBrowser(page,boardUrl,bug) {
  const itemUrl=new URL(boardUrl);
  itemUrl.searchParams.set('item',bug);
  const itemCard=`[data-stage-item="${bug}"]`;
  const commandForm=(region,command)=>region.locator(`form[data-command="delivery.${command}"]`);
  async function openForm(summary,command) {
    const toggle=page.locator('summary').filter({hasText:new RegExp('^'+summary+'$')});
    const region=toggle.locator('..');
    if(await region.getAttribute('open')===null)await toggle.click();
    return commandForm(region,command);
  }
  async function submit(form) {
    const responses=await Promise.all([
      page.waitForResponse(r=>new URL(r.url()).pathname==='/api/portfolio/v1/command'),
      page.waitForResponse(r=>new URL(r.url()).pathname==='/api/portfolio/v1/query'),
      form.getByRole('button').click()
    ]);
    assert.equal(responses[0].status(),200,await responses[0].text());
    await page.locator('#page:not([aria-busy]) h1').waitFor();
  }
  const fill=(form,name,value)=>form.locator(`[name="${name}"]`).fill(value);
  const choose=(form,name,value)=>form.locator(`[name="${name}"]`).selectOption(value);
  async function scope(form) {
    assert.equal(await form.locator(`[name=item_id][value="${bug}"]`).isChecked(),true);
    await choose(form,'coverage:'+bug,'full');
    await fill(form,'outcome:'+bug,'封閉路線停止預約');
  }
  async function filter(environment,recipient) {
    const filters=page.locator('[data-stage-filters]');
    await choose(filters,'kind','bug');
    await choose(filters,'environment',{label:environment});
    await choose(filters,'recipient',recipient);
    await filters.getByRole('button').click();
    await page.waitForFunction(({env,rec})=>{
      const p=new URL(location.href).searchParams;
      const selected=document.querySelector('[data-stage-filters] [name=environment]');
      return p.get('kind')==='bug' && (p.get('recipient')??'')===rec && selected?.selectedOptions[0]?.textContent===env &&
        !document.getElementById('page')?.hasAttribute('aria-busy');
    },{env:environment,rec:recipient});
  }
  const stageUrl=new URL(boardUrl);
  stageUrl.searchParams.set('layout','stages');
  await page.goto(boardUrl);
  for(const name of ['QA','Production']) {
    const create=await openForm('新增環境','environment');
    await fill(create,'name',name);
    await fill(create,'purpose',name==='QA'?'測試':'正式');
    await submit(create);
  }
  const policy=await openForm('設定交付政策','policy');
  await choose(policy,'primary_environment_id',{label:'Production'});
  await fill(policy,'evidence_kind','UAT 簽收');
  await submit(policy);
  await page.goto(itemUrl.href);
  const attempt=await openForm('登記部署嘗試','attempt');
  await choose(attempt,'environment_id',{label:'QA'});
  await fill(attempt,'artifact','1.4');
  await fill(attempt,'evidence','QA 測試環境作業 21');
  await scope(attempt);
  await submit(attempt);
  await page.goto(boardUrl);
  const read=await openForm('登記環境讀回','observe');
  await choose(read,'environment_id',{label:'QA'});
  await fill(read,'artifact','1.4');
  await fill(read,'evidence','QA 頁尾版本 1.4');
  await submit(read);
  await page.goto(itemUrl.href);
  for(const recipient of ['客戶 B','客戶 A']){
    const draft=await openForm('新增交付草案','draft');
    await fill(draft,'recipient',recipient);
    await fill(draft,'artifact','1.4');
    await scope(draft);
    await submit(draft);
  }
  await page.goto(stageUrl.href);
  await filter('QA','客戶 A');
  await page.locator('[data-stage-intent=deployment] '+itemCard).waitFor();
  assert.equal(await page.locator('[data-stage-intent=delivery] '+itemCard).count(),0);
  await page.goto(itemUrl.href);
  const draftA=page.getByRole('article').filter({has:page.getByText('客戶 A · 1.4',{exact:true})});
  await draftA.locator('summary').filter({hasText:'登記實際交付'}).click();
  const record=commandForm(draftA,'record');
  await fill(record,'evidence','客戶 A 驗收紀錄 45');
  await submit(record);
  await page.goto(stageUrl.href);
  await filter('Production','客戶 A');
  await page.locator('[data-stage-intent=delivery] '+itemCard).waitFor();
  assert.equal(await page.locator('[data-stage-intent=deployment] '+itemCard).count(),0);
  await filter('QA','客戶 B');
  assert.equal(await page.locator('[data-stage-intent=delivery] '+itemCard).count(),0);
  await page.locator('[data-stage-intent=deployment] '+itemCard).waitFor();
  await filter('QA','客戶 A');
  assert.match(await page.locator('[data-stage-intent=delivery] '+itemCard).innerText(),/全項交付.*客戶 A.*1.4/);
  assert.match(await page.locator('[data-stage-intent=deployment] '+itemCard).innerText(),/全項部署.*1.4/);
  await page.goto(boardUrl);
  await page.getByRole('heading',{name:'交付與環境',exact:true}).waitFor();
  console.log('PASS browser: configure QA and Production, observe QA before handoff, distinguish draft and evidence-backed handoff, filter product milestones');
}
