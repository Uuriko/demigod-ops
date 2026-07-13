#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { connectBrowser } from './collab-lib.mjs';
import { ROOT, sleep, prepareWebflowDesigner } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-PAGES-PROBE.json');

async function main() {
  const browser = await connectBrowser();
  const { page } = await prepareWebflowDesigner(browser);
  await page.evaluate(() => document.querySelector('[data-automation-id="left-sidebar-pages-button"]')?.click());
  await sleep(2500);
  const data = await page.evaluate(() => {
    const aids = [...document.querySelectorAll('[data-automation-id]')]
      .map((e) => ({ id: e.getAttribute('data-automation-id'), t: (e.textContent || '').trim().slice(0, 50) }))
      .filter((x) => /page/i.test(x.id + x.t));
    const inputs = [...document.querySelectorAll('input')].map((i) => ({
      ph: i.placeholder, val: i.value, a: i.getAttribute('aria-label') || '',
    }));
    const panel = document.querySelector('[class*="pages"],[class*="Pages"]');
    return { aids, inputs, body: (document.body?.innerText || '').match(/Pages[\s\S]{0,2000}/)?.[0] || '' };
  });
  await page.screenshot({ path: path.join(ROOT, 'audit-shots/webflow/pages-probe.png'), fullPage: false });
  await browser.disconnect();
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });