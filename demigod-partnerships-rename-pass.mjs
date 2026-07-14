#!/usr/bin/env node
/** Rename Webflow "Untitled" page → Partnerships (slug partnerships); publish; verify. */
import fs from 'fs';
import path from 'path';
import { connectBrowser } from './collab-lib.mjs';
import { ROOT, sleep, prepareWebflowDesigner, WEBFLOW_DESIGNER_URL } from './demigod-turn-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-PARTNERSHIPS-RENAME-PASS.json');
const SLUG = 'partnerships';

async function openPages(page) {
  await page.click('[data-automation-id="left-sidebar-pages-button"]');
  await sleep(2500);
}

async function clickPage(page, label) {
  return page.evaluate((lab) => {
    const cell = [...document.querySelectorAll('[data-automation-id="list-cell"]')].find((e) => {
      const t = (e.textContent || '').trim();
      return new RegExp(`^${lab}$`, 'i').test(t);
    });
    if (!cell) return null;
    cell.click();
    return (cell.textContent || '').trim();
  }, label);
}

async function setPageMeta(page, { name, slug }) {
  return page.evaluate(({ name, slug }) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    const inputs = [...document.querySelectorAll('input,textarea')].filter((i) => i.offsetParent !== null);
    const hits = [];
    for (const inp of inputs) {
      const hint = ((inp.placeholder || '') + (inp.getAttribute('aria-label') || '') + (inp.name || '') + (inp.id || '')).toLowerCase();
      if (/page name|^name/.test(hint) || (inp.type === 'text' && /name/i.test(hint))) {
        if (setter) setter.call(inp, name); else inp.value = name;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        hits.push('name');
      }
      if (/slug|url/i.test(hint)) {
        if (setter) setter.call(inp, slug); else inp.value = slug;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        hits.push('slug');
      }
    }
    return { hits, inputs: inputs.length };
  }, { name: 'Partnerships', slug });
}

async function publish(page) {
  assertNotFrozen('partnerships-rename-pass');
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(2000);
  await page.click('[data-automation-id="publish-menu-button"]');
  await sleep(2500);
  await page.evaluate(() => {
    [...document.querySelectorAll('button,div,span')].forEach((el) => {
      if (/^select all$/i.test((el.textContent || '').trim())) el.click();
    });
    const btn = [...document.querySelectorAll('button')].find((b) => /publish to selected domains/i.test(b.textContent || ''));
    btn?.click();
  });
  for (let i = 0; i < 20; i++) {
    await sleep(4000);
    const ago = await page.evaluate(() => document.body?.innerText?.match(/Published (a few seconds ago|1 minute ago|\d+ minutes ago)/i)?.[0] || '');
    if (ago) return { ok: true, ago };
  }
  return { ok: false };
}

async function check() {
  const res = await fetch(`https://www.trydemigod.com/${SLUG}?v=${Date.now()}`);
  const html = await res.text();
  return { status: res.status, foot: /catbox\.moe\/[a-z0-9]+\.js/i.test(html), ok: res.status === 200 };
}

async function main() {
  const browser = await connectBrowser();
  const { page } = await prepareWebflowDesigner(browser, { url: WEBFLOW_DESIGNER_URL });
  const result = { at: new Date().toISOString(), before: await check(), steps: [] };

  await openPages(page);
  result.steps.push({ action: 'open-pages' });

  const hit = await clickPage(page, 'Untitled') || await clickPage(page, 'legal');
  result.steps.push({ action: 'click-page', hit });
  await sleep(3500);

  await page.click('[data-automation-id="top-bar-page-name"]').catch(() => {});
  await sleep(1200);
  result.steps.push({ action: 'page-settings', meta: await setPageMeta(page, { name: 'Partnerships', slug: SLUG }) });
  await sleep(1500);
  await page.keyboard.press('Enter');
  await sleep(2000);

  await openPages(page);
  result.pages = await page.evaluate(() =>
    [...document.querySelectorAll('[data-automation-id="list-cell"]')].map((e) => (e.textContent || '').trim()),
  );

  result.publish = await publish(page);
  await page.screenshot({ path: path.join(ROOT, 'audit-shots/webflow/partnerships-rename.png') });
  await browser.disconnect();

  for (let i = 0; i < 12; i++) {
    await sleep(8000);
    result.after = await check();
    if (result.after.ok) break;
  }
  result.pass = result.after?.ok === true;
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ pass: result.pass, pages: result.pages, publish: result.publish, after: result.after }, null, 2));
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
