#!/usr/bin/env node
/** Publish existing partnerships page in Webflow Designer; verify /partnerships 200. */
import fs from 'fs';
import path from 'path';
import { connectBrowser } from './collab-lib.mjs';
import { ROOT, sleep, prepareWebflowDesigner } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-PARTNERSHIPS-PUBLISH-PASS.json');

async function publish(page) {
  await page.bringToFront();
  await sleep(1000);
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(2500);
  await page.click('[data-automation-id="publish-menu-button"]');
  await sleep(3000);
  const clicked = await page.evaluate(() => {
    let sel = false;
    [...document.querySelectorAll('button,div,span')].forEach((el) => {
      if (/^select all$/i.test((el.textContent || '').trim())) { el.click(); sel = true; }
    });
    const btn = [...document.querySelectorAll('button')].find((b) => /publish to selected domains/i.test(b.textContent || ''));
    if (btn) { btn.click(); return { sel, pub: true }; }
    return { sel, pub: false };
  });
  let ago = '';
  for (let i = 0; i < 25; i++) {
    await sleep(4000);
    ago = await page.evaluate(() => document.body?.innerText?.match(/Published (a few seconds ago|1 minute ago|\d+ minutes ago)/i)?.[0] || '');
    if (ago) break;
  }
  return { ...clicked, ago, ok: !!ago };
}

async function openPartnershipsPage(page) {
  await page.click('[data-automation-id="left-sidebar-pages-button"]');
  await sleep(2500);
  const pages = await page.evaluate(() =>
    [...document.querySelectorAll('[data-automation-id="list-cell"]')].map((e) => (e.textContent || '').trim()),
  );
  const hit = await page.evaluate(() => {
    const cell = [...document.querySelectorAll('[data-automation-id="list-cell"]')].find((e) => /partnerships?/i.test((e.textContent || '').trim()));
    if (cell) { cell.click(); return (cell.textContent || '').trim(); }
    const unt = [...document.querySelectorAll('[data-automation-id="list-cell"]')].find((e) => /^untitled$/i.test((e.textContent || '').trim()));
    if (unt) { unt.click(); return 'Untitled'; }
    return null;
  });
  await sleep(3000);
  const top = await page.evaluate(() => document.querySelector('[data-automation-id="top-bar-page-name"]')?.textContent?.trim() || '');
  return { pages, hit, top };
}

async function check() {
  const res = await fetch(`https://www.trydemigod.com/partnerships?v=${Date.now()}`);
  const html = await res.text();
  return { status: res.status, foot: /catbox\.moe\/[a-z0-9]+\.js/i.test(html), ok: res.status === 200 };
}

async function main() {
  const browser = await connectBrowser();
  const { page } = await prepareWebflowDesigner(browser);
  const result = { at: new Date().toISOString(), before: await check() };

  const nav = await openPartnershipsPage(page);
  result.nav = nav;
  await page.screenshot({ path: path.join(ROOT, 'audit-shots/webflow/partnerships-before-publish.png') });

  result.publish = await publish(page);
  await page.screenshot({ path: path.join(ROOT, 'audit-shots/webflow/partnerships-after-publish.png') });
  await browser.disconnect();

  for (let i = 0; i < 15; i++) {
    await sleep(8000);
    result.after = await check();
    if (result.after.ok) break;
  }
  result.pass = result.after?.ok === true;
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ pass: result.pass, nav: result.nav, publish: result.publish, after: result.after }, null, 2));
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });