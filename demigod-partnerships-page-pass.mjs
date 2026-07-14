#!/usr/bin/env node
/** Create /partnerships Webflow page (mirror legal-page-pass); publish; verify 200 + foot-core. */
import fs from 'fs';
import path from 'path';
import { connectBrowser } from './collab-lib.mjs';
import { ROOT, sleep, prepareWebflowDesigner, WEBFLOW_DESIGNER_URL } from './demigod-turn-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-PARTNERSHIPS-PAGE-PASS.json');
const NAME = 'Partnerships';
const SLUG = 'partnerships';

async function clickText(page, pattern) {
  const pos = await page.evaluate((src) => {
    const rx = new RegExp(src, 'i');
    const el = [...document.querySelectorAll('button,a,div,span,[role="menuitem"]')].find((n) => {
      const t = (n.textContent || '').trim();
      return rx.test(t) && t.length < 80;
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
  await page.waitForSelector('[data-automation-id="left-sidebar-pages-button"]', { timeout: 45000 });
  for (let i = 0; i < 5; i++) {
    await page.click('[data-automation-id="left-sidebar-pages-button"]');
    await sleep(2200);
    const open = await page.$('[data-automation-id="add-page-menu-button"]');
    if (open) return;
  }
  await page.waitForSelector('[data-automation-id="add-page-menu-button"]', { timeout: 20000 });
}

async function listPages(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-automation-id="list-cell"]')]
      .map((e) => (e.textContent || '').trim().replace(/\s+/g, ' '))
      .filter(Boolean),
  );
}

async function slugExists(page, slug) {
  const pages = await listPages(page);
  return pages.some((t) => new RegExp(`^${slug}$`, 'i').test(t) || new RegExp(slug, 'i').test(t));
}

async function createPartnershipsPage(page) {
  const result = { steps: [] };
  await openPagesPanel(page);
  result.steps.push({ action: 'pages-before', pages: await listPages(page) });

  await page.click('[data-automation-id="add-page-menu-button"]');
  await sleep(1400);
  result.steps.push({ action: 'create-page-menu', hit: await clickText(page, '^Create page$') });
  await sleep(2800);

  await page.waitForSelector('input', { timeout: 15000 });
  const filled = await page.evaluate(({ name, slug }) => {
    const inputs = [...document.querySelectorAll('input')].filter((i) => i.offsetParent !== null);
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    const nameIn = inputs.find((i) => /page name|name/i.test((i.placeholder || '') + (i.getAttribute('aria-label') || ''))) || inputs[0];
    const slugIn = inputs.find((i) => /slug/i.test((i.placeholder || '') + (i.getAttribute('aria-label') || ''))) || inputs[1];
    if (!nameIn) return { ok: false, inputs: inputs.length };
    if (setter) setter.call(nameIn, name); else nameIn.value = name;
    nameIn.dispatchEvent(new Event('input', { bubbles: true }));
    nameIn.dispatchEvent(new Event('change', { bubbles: true }));
    if (slugIn) {
      if (setter) setter.call(slugIn, slug); else slugIn.value = slug;
      slugIn.dispatchEvent(new Event('input', { bubbles: true }));
      slugIn.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return { ok: true, inputs: inputs.length };
  }, { name: NAME, slug: SLUG });
  result.steps.push({ action: 'fill', ...filled });
  await sleep(800);

  let saved = await clickText(page, '^Create page$');
  if (!saved) saved = await clickText(page, '^Create$');
  if (!saved) {
    await page.keyboard.press('Enter');
    saved = 'Enter';
  }
  result.steps.push({ action: 'save', hit: saved });
  await sleep(8000);

  result.pagesAfter = await listPages(page);
  result.exists = await slugExists(page, SLUG);
  await page.screenshot({ path: path.join(ROOT, 'audit-shots/webflow/partnerships-create.png') });
  return result;
}

async function publishSite(page) {
  assertNotFrozen('partnerships-page-pass');
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(2500);
  await page.click('[data-automation-id="publish-menu-button"]');
  await sleep(3000);
  await clickText(page, '^Select all$');
  await sleep(1200);
  const hit = await clickText(page, 'Publish to selected domains');
  if (!hit) {
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => /publish to selected domains/i.test(b.textContent || ''));
      btn?.click();
    });
  }
  for (let i = 0; i < 25; i++) {
    await sleep(4000);
    const ago = await page.evaluate(() => document.body?.innerText?.match(/Published (a few seconds ago|1 minute ago|\d+ minutes ago)/i)?.[0] || '');
    if (ago) return { ok: true, ago };
  }
  return { ok: false };
}

async function checkRoute() {
  const res = await fetch(`https://www.trydemigod.com/${SLUG}?v=${Date.now()}`);
  const html = await res.text();
  const foot = /catbox\.moe\/[a-z0-9]+\.js/i.test(html) || /dg-foot-v\d+-core/.test(html);
  return { status: res.status, foot, ok: res.status === 200 && foot };
}

async function main() {
  const browser = await connectBrowser();
  const { page, resize } = await prepareWebflowDesigner(browser, { url: WEBFLOW_DESIGNER_URL });
  const result = { at: new Date().toISOString(), resize, before: await checkRoute() };

  await openPagesPanel(page);
  const exists = await slugExists(page, SLUG);
  result.pagesListed = await listPages(page);
  if (!exists) result.create = await createPartnershipsPage(page);
  else result.create = { skipped: true, exists: true };

  result.publish = await publishSite(page);
  await page.screenshot({ path: path.join(ROOT, 'audit-shots/webflow/partnerships-page-after.png') });
  await browser.disconnect();

  for (let i = 0; i < 15; i++) {
    await sleep(8000);
    result.after = await checkRoute();
    if (result.after.ok) break;
  }
  result.pass = result.after?.ok === true;
  fs.writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ pass: result.pass, create: result.create, publish: result.publish, after: result.after }, null, 2));
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
