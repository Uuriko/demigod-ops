#!/usr/bin/env node
/** Create /legal via add-page-menu-button → Create page; publish; verify 200. */
import fs from 'fs';
import path from 'path';
import { connectBrowser } from './collab-lib.mjs';
import { ROOT, sleep, wlog, prepareWebflowDesigner, WEBFLOW_DESIGNER_URL } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-LEGAL-PAGE-PASS.json');

async function clickText(page, pattern) {
  const pos = await page.evaluate((src) => {
    const rx = new RegExp(src, 'i');
    const el = [...document.querySelectorAll('button,a,div,span,[role="menuitem"]')].find((n) => {
      const t = (n.textContent || '').trim();
      return rx.test(t) && t.length < 60;
    });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 2) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: (el.textContent || '').trim() };
  }, pattern);
  if (!pos) return null;
  await page.mouse.click(pos.x, pos.y);
  await sleep(1800);
  return pos.text;
}

async function openPagesPanel(page) {
  await page.waitForSelector('[data-automation-id="left-sidebar-pages-button"]', { timeout: 30000 });
  await page.click('[data-automation-id="left-sidebar-pages-button"]');
  await sleep(2000);
  await page.waitForSelector('[data-automation-id="add-page-menu-button"]', { timeout: 15000 });
}

async function legalExists(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-automation-id="list-cell"]')].some((e) => /^legal$/i.test((e.textContent || '').trim())),
  );
}

async function createLegalPage(page) {
  const result = { steps: [] };
  await openPagesPanel(page);
  await page.click('[data-automation-id="add-page-menu-button"]');
  await sleep(1200);
  result.steps.push({ action: 'create-page-menu', hit: await clickText(page, '^Create page$') });
  await sleep(2500);

  await page.waitForSelector('input', { timeout: 10000 });
  const filled = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input')].filter((i) => i.offsetParent !== null);
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    const name = inputs.find((i) => /page name|name/i.test((i.placeholder || '') + (i.getAttribute('aria-label') || ''))) || inputs[0];
    const slug = inputs.find((i) => /slug/i.test((i.placeholder || '') + (i.getAttribute('aria-label') || ''))) || inputs[1];
    if (!name) return { ok: false };
    if (setter) setter.call(name, 'Legal'); else name.value = 'Legal';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    if (slug) {
      if (setter) setter.call(slug, 'legal'); else slug.value = 'legal';
      slug.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return { ok: true };
  });
  result.steps.push({ action: 'fill', ...filled });
  await sleep(500);
  result.steps.push({ action: 'save', hit: await clickText(page, '^Create page$') });
  await sleep(5000);
  result.hasLegal = await legalExists(page);
  return result;
}

async function publishSite(page) {
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(2000);
  await page.click('[data-automation-id="publish-menu-button"]');
  await sleep(2500);
  await clickText(page, '^Select all$');
  await sleep(1000);
  await clickText(page, 'Publish to selected domains');
  for (let i = 0; i < 30; i++) {
    await sleep(4000);
    const ago = await page.evaluate(() => document.body?.innerText?.match(/Published (a few seconds ago|1 minute ago|\d+ minutes ago)/i)?.[0] || '');
    if (ago) return { ok: true, ago };
  }
  return { ok: false };
}

async function checkLegal() {
  const res = await fetch(`https://www.trydemigod.com/legal?v=${Date.now()}`);
  return { status: res.status, ok: res.status === 200 };
}

async function main() {
  const browser = await connectBrowser();
  const { page, resize } = await prepareWebflowDesigner(browser, { url: WEBFLOW_DESIGNER_URL });
  const result = { at: new Date().toISOString(), resize, before: await checkLegal() };

  await openPagesPanel(page);
  const exists = await legalExists(page);
  if (!exists) result.create = await createLegalPage(page);
  else result.create = { skipped: true, exists: true };

  result.publish = await publishSite(page);
  await page.screenshot({ path: path.join(ROOT, 'audit-shots/webflow/legal-page-after.png') });
  await browser.disconnect();

  for (let i = 0; i < 12; i++) {
    await sleep(8000);
    result.after = await checkLegal();
    if (result.after.ok) break;
  }
  result.pass = result.after?.ok;
  fs.writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ pass: result.pass, create: result.create, publish: result.publish, after: result.after }, null, 2));
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });