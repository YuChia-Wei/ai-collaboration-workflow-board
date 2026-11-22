import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {startPortfolioPreview} from '../Tooling/collaboration-ui-preview.mjs';

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
const preview = await startPortfolioPreview();
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
    page.on('request', request=>{
      if (new URL(request.url()).pathname==='/api/portfolio/v1/query' && request.postDataJSON()?.project_id==='legacy-personal') {
        faults.push('The product UI requested a virtual personal workspace.');
      }
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
  const boardNav = page => page.getByRole('navigation',{name:'產品看板'});
  const retiredNames = /Workflow 協作|專案來源副本|人工與歷史來源|既有 personal 紀錄/;
  const writer = await openSession();
  const page = writer.page;
  for (const view of ['collaboration','source-replica','records']) {
    await page.goto(preview.origin+'/?view='+view+'&store=board-ui-preview&project=legacy-personal');
    await heading(page,'產品總覽');
    await link(section(page,'產品'),'澄河').waitFor();
    assert.doesNotMatch(await page.locator('body').innerText(),retiredNames);
  }
  const products = section(page,'產品').getByRole('article');
  assert.equal(await products.count(),2);
  for (const name of ['澄河','石庭']) {
    const product = products.filter({has:link(page,name)});
    await link(product,'Scrum Board').waitFor();
    await link(product,'Workflow Board').waitFor();
  }
  const desktopSize = page.viewportSize();
  await page.setViewportSize({width:390,height:844});
  await link(products.filter({has:link(page,'澄河')}),'Workflow Board').click();
  await heading(page,'澄河');
  assert.equal(await boardNav(page).locator('[aria-current="page"]').innerText(),'Workflow Board');
  await link(section(page,'工作流程'),solo).click();
  await heading(page,solo);
  await page.reload();
  await heading(page,solo);
  await link(boardNav(page),'Scrum Board').click();
  await link(section(page,'產品待辦項目'),first).waitFor();
  assert.equal(await boardNav(page).locator('[aria-current="page"]').innerText(),'Scrum Board');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
    'Mobile boards must fit the viewport; columns may scroll inside their board.');
  await page.setViewportSize(desktopSize);
  await page.goto(preview.url);
  const active = section(page,'進行中的工作');
  const cards = active.locator('article');
  await expectLinks(active,[shared,solo]);
  assert.doesNotMatch(await cards.filter({has:link(page,shared)}).innerText(),/預約頁顯示時區/);
  assert.match(await cards.filter({has:link(page,solo)}).innerText(),/待決：預約頁顯示時區/);
  await link(section(page,'產品'),'澄河').click();
  await heading(page,'澄河');
  await expectLinks(section(page,'產品待辦項目'),[first,second,third]);
  await link(page,third).click();
  await expectLinks(section(page,'關聯工作流程'),[]);
  await link(boardNav(page),'Workflow Board').click();
  await expectLinks(section(page,'工作流程'),[shared,solo,'準備夜間開放計畫']);
  await link(boardNav(page),'Scrum Board').click();
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
  console.log('PASS: product overview and active work, retired entry points, mobile board navigation, scoped Scrum and Workflow Boards, shared PBI links, cross-session evidence and handoff, unlink and create from a PBI.');
} finally {
  try {await browser?.close();} finally {await preview.close();}
}
