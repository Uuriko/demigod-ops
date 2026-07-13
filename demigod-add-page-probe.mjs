#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { connectBrowser } from './collab-lib.mjs';
import { ROOT, sleep, prepareWebflowDesigner } from './demigod-turn-lib.mjs';

async function main() {
  const browser = await connectBrowser();
  const { page } = await prepareWebflowDesigner(browser);
  await page.evaluate(() => document.querySelector('[data-automation-id="left-sidebar-pages-button"]')?.click());
  await sleep(2000);
  await page.evaluate(() => document.querySelector('[data-automation-id="add-page-menu-button"]')?.click());
  await sleep(2000);
  const data = await page.evaluate(() => {
    const menu = [...document.querySelectorAll('button,a,div,span,[role="menuitem"]')].map((e) => (e.textContent || '').trim()).filter((t) => t && t.length < 50);
    const aids = [...document.querySelectorAll('[data-automation-id]')].map((e) => ({ id: e.getAttribute('data-automation-id'), t: (e.textContent || '').trim().slice(0, 40) })).filter((x) => x.t || /page|folder|add/i.test(x.id));
    return { menu: [...new Set(menu)].slice(0, 30), aids: aids.slice(0, 40), body: (document.body?.innerText || '').slice(-2000) };
  });
  await page.screenshot({ path: path.join(ROOT, 'audit-shots/webflow/add-page-menu.png') });
  await browser.disconnect();
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);