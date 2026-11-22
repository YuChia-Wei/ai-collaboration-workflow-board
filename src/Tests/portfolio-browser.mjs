import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {startCollaborationPreview} from '../Tooling/collaboration-ui-preview.mjs';

// The only server is a loopback preview of the built Worker, backed by a new
// in-memory database. The driver uses an installed Chromium browser.
const scratch = process.env.BOARD_BROWSER_SCRATCH;
if (scratch) {
  assert.ok(isAbsolute(scratch),'BOARD_BROWSER_SCRATCH must be an absolute directory.');
  await mkdir(scratch,{recursive:true});
  // Playwright creates/removes uniquely named child directories for each run.
  // Limit the override to this test process and its browser children.
  for (const key of ['TMPDIR','TEMP','TMP']) process.env[key]=scratch;
}
const {chromium} = await import('playwright-core');
const executablePath = process.env.BOARD_BROWSER_PATH;
const launch = executablePath ? {executablePath} : {channel:process.platform==='win32'?'msedge':'chrome'};
const preview = await startCollaborationPreview({portfolio:true});
let browser;
try {
  browser = await chromium.launch({...launch, headless:true});
  const faults = [];
  async function openSession() {
    const context = await browser.newContext({serviceWorkers:'block'});
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === preview.origin) return route.continue();
      faults.push('Unexpected external request: '+route.request().url());
      return route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error=>faults.push(error.message));
    page.on('response', response=>{
      if (response.status()>=400) faults.push(response.status()+' '+response.url());
    });
    await page.goto(preview.url);
    return {page, context};
  }
  const first = '#11 列出可預約時段', second = '#12 匯出預約明細';
  const third = '#13 顯示場地說明';
  const shared = '整理時段資料', solo = '調查時區差異';
  const link = (page,name) => page.getByRole('link',{name,exact:true});
  const section = (page,name) => page.locator('section').filter({has:page.getByRole('heading',{name,exact:true,level:2})});
  const heading = (page,name) => page.getByRole('heading',{name,exact:true,level:1}).waitFor();
  async function expectLinks(region, expected) {
    await region.waitFor();
    assert.deepEqual((await region.getByRole('link').allTextContents()).sort(), [...expected].sort());
  }
  const workspaceLabels = ['產品總覽','Workflow 協作','專案來源副本','人工與歷史來源'];
  const workspaceNav = page => page.getByRole('banner').getByRole('navigation',{name:'工作空間'});
  async function expectWorkspace(page, name, pageHeading=name) {
    await heading(page,pageHeading);
    assert.deepEqual(await page.getByRole('heading',{level:1}).allTextContents(),[pageHeading]);
    assert.equal(await page.title(),pageHeading+' · 工作紀錄室');
    const nav = workspaceNav(page);
    await nav.waitFor();
    assert.deepEqual(await nav.getByRole('link').allTextContents(),workspaceLabels);
    assert.equal(await nav.locator('[aria-current="page"]').innerText(),name);
    const menu = await nav.boundingBox();
    const title = await page.getByRole('heading',{level:1}).boundingBox();
    assert.ok(menu.y+menu.height<=title.y,'Workspace navigation should appear above the page heading.');
    for (const label of workspaceLabels) {
      const href = await link(nav,label).getAttribute('href');
      assert.equal(new URL(href,preview.url).searchParams.get('store'),'board-ui-preview');
    }
  }
  const writer = await openSession();
  const page = writer.page;
  await heading(page,'產品總覽');
  await link(workspaceNav(page),'人工與歷史來源').click();
  const recordTabs = page.getByRole('navigation',{name:'紀錄內容'});
  await recordTabs.getByRole('button',{name:/^文件/}).click();
  await recordTabs.getByRole('button',{name:'交接',exact:true}).click();
  await expectWorkspace(page,'人工與歷史來源');
  await page.reload();
  await recordTabs.waitFor();
  await expectWorkspace(page,'人工與歷史來源');
  const desktopSize = page.viewportSize();
  await page.setViewportSize({width:390,height:844});
  await page.reload();
  const manualRecord = page.getByRole('button',{name:/確認場地開放時間/});
  await manualRecord.waitFor();
  await expectWorkspace(page,'人工與歷史來源');
  await manualRecord.click();
  await recordTabs.waitFor();
  await expectWorkspace(page,'人工與歷史來源');
  await page.getByRole('button',{name:/回到紀錄列表/}).click();
  await manualRecord.waitFor();
  await expectWorkspace(page,'人工與歷史來源');
  await page.setViewportSize(desktopSize);
  await link(workspaceNav(page),'專案來源副本').click();
  await page.getByRole('combobox',{name:'目前專案'}).selectOption('river');
  await page.getByText(/此專案尚無已公布的來源副本/).waitFor();
  await expectWorkspace(page,'專案來源副本');
  await page.reload();
  await page.getByText(/此專案尚無已公布的來源副本/).waitFor();
  await expectWorkspace(page,'專案來源副本');
  await link(workspaceNav(page),'Workflow 協作').click();
  await page.getByRole('combobox',{name:'專案',exact:true}).selectOption('river');
  await page.getByRole('button',{name:new RegExp(solo)}).click();
  await page.getByRole('navigation',{name:'Workflow 詳情'}).getByRole('button',{name:/^交接/}).click();
  await expectWorkspace(page,'Workflow 協作');
  await page.reload();
  await page.getByRole('navigation',{name:'Workflow 詳情'}).waitFor();
  await expectWorkspace(page,'Workflow 協作');
  await link(workspaceNav(page),'產品總覽').click();
  await expectWorkspace(page,'產品總覽');
  await page.reload();
  await expectWorkspace(page,'產品總覽');
  await expectLinks(section(page,'產品'),['澄河','石庭']);
  const active = section(page,'進行中的工作');
  const cards = active.locator('article');
  assert.equal(await cards.count(),2);
  assert.doesNotMatch(await cards.filter({has:link(page,shared)}).innerText(),/預約頁顯示時區/);
  assert.match(await cards.filter({has:link(page,solo)}).innerText(),/待決：預約頁顯示時區/);
  await link(section(page,'產品'),'澄河').click();
  await expectWorkspace(page,'產品總覽','澄河');
  await expectLinks(section(page,'Scrum 工作項目（PBI）'),[first,second,third]);
  await link(page,third).click();
  await expectLinks(section(page,'關聯工作流程'),[]);
  await link(page,'澄河').click();
  await link(page,'Workflow 執行看板').click();
  await expectLinks(section(page,'Workflow 執行看板'),[shared,solo]);
  await link(page,'Scrum 工作項目（PBI）').click();
  await link(page,first).click();
  await expectLinks(section(page,'關聯工作流程'),[shared]);
  await link(page,shared).click();
  await expectLinks(section(page,'關聯 PBI'),[first,second]);
  await link(section(page,'關聯 PBI'),second).click();
  await expectLinks(section(page,'關聯工作流程'),[shared]);
  await page.goto(preview.url);
  await link(section(page,'進行中的工作'),solo).click();
  await expectLinks(section(page,'關聯 PBI'),[]);
  await page.getByRole('checkbox',{name:/#11 列出可預約時段/}).check();
  await page.getByRole('button',{name:'補連 PBI',exact:true}).click();
  await link(section(page,'關聯 PBI'),first).waitFor();
  await writer.context.close();

  // A new context starts with no writer cookies, storage, or page history.
  const reader = await openSession();
  const other = reader.page;
  await link(section(other,'產品'),'澄河').click();
  await link(other,first).click();
  await expectLinks(section(other,'關聯工作流程'),[shared,solo]);
  await link(other,solo).click();
  await expectLinks(section(other,'關聯 PBI'),[first]);
  assert.match(await section(other,'工作證據').innerText(), /跨日預約在兩個時區顯示不同日期。/);
  assert.match(await section(other,'交接與下一步').innerText(), /確認預約頁採用的時區，再覆核跨日範例。/);
  assert.match(await section(other,'關聯歷史').innerText(), /補連/);
  await other.getByRole('button',{name:'解除關聯',exact:true}).click();
  await section(other,'關聯 PBI').getByText('尚未關聯 PBI',{exact:true}).waitFor();
  assert.match(await section(other,'關聯歷史').innerText(), /解除/);
  await other.goto(preview.url);
  await link(section(other,'產品'),'石庭').click();
  await link(other,'#11 產生範例目錄').click();
  await heading(other,'#11 產生範例目錄');
  await expectLinks(section(other,'關聯工作流程'),[]);
  assert.doesNotMatch(await other.locator('main').innerText(), /Project 狀態/);
  const creation = section(other,'從 PBI 建立工作流程');
  assert.equal(await creation.getByRole('checkbox',{name:/#11 產生範例目錄/}).isChecked(),true);
  await creation.getByLabel('名稱',{exact:true}).fill('覆核目錄範例');
  await creation.getByLabel('工作目標',{exact:true}).fill('確認範例目錄含必要頁面。');
  await creation.getByRole('button',{name:'建立工作流程',exact:true}).click();
  await heading(other,'覆核目錄範例');
  await expectLinks(section(other,'關聯 PBI'),['#11 產生範例目錄']);
  await link(section(other,'關聯 PBI'),'#11 產生範例目錄').click();
  await expectLinks(section(other,'關聯工作流程'),['覆核目錄範例']);
  await reader.context.close();
  assert.deepEqual(faults,[]);
  console.log('PASS: workspace navigation and reload across all four views, stable page names with selected records, shared workflow, link and unlink, fresh-context read-back of evidence and handoff, same-number issue isolation, and workflow creation from a PBI.');
} finally {
  try {await browser?.close();} finally {await preview.close();}
}
