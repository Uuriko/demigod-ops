#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { connectBrowser } from './collab-lib.mjs';
import { ROOT, sleep, prepareWebflowDesigner } from './demigod-turn-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-LEGAL-PUBLISH.json');

async function main() {
  assertNotFrozen('legal-publish');
  const browser = await connectBrowser();
  const { page } = await prepareWebflowDesigner(browser);
  await page.click('[data-automation-id="left-sidebar-pages-button"]');
  await sleep(2000);

  const pages = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-automation-id="list-cell"],[data-automation-id*="page"]')];
    return rows.map((e) => ({
      id: e.getAttribute('data-automation-id') || '',
      t: (e.textContent || '').trim().slice(0, 60),
    })).filter((x) => x.t);
  });

  const clicked = await page.evaluate(() => {
    const cell = [...document.querySelectorAll('[data-automation-id="list-cell"]')].find((e) => /^legal$/i.test((e.textContent || '').trim()));
    if (cell) { cell.click(); return cell.textContent.trim(); }
    return null;
  });
  await sleep(3000);

  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(2000);
  await page.click('[data-automation-id="publish-menu-button"]');
  await sleep(3000);

  const pub = await page.evaluate(() => {
    for (const btn of [...document.querySelectorAll('button,div,span')]) {
      if (/^select all$/i.test((btn.textContent || '').trim())) btn.click();
    }
    const confirm = [...document.querySelectorAll('button')].find((b) => /publish to selected domains/i.test(b.textContent || ''));
    if (confirm) { confirm.click(); return true; }
    return false;
  });

  let ago = '';
  for (let i = 0; i < 30; i++) {
    await sleep(4000);
    ago = await page.evaluate(() => document.body?.innerText?.match(/Published (a few seconds ago|1 minute ago|\d+ minutes ago)/i)?.[0] || '');
    if (ago) break;
  }

  await page.screenshot({ path: path.join(ROOT, 'audit-shots/webflow/legal-publish.png') });
  await browser.disconnect();

  await sleep(30000);
  const res = await fetch(`https://www.trydemigod.com/legal?v=${Date.now()}`);
  const result = { pages, clicked, pub, ago, status: res.status, ok: res.status === 200 };
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
