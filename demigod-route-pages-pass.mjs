#!/usr/bin/env node
/** Create /legal and /partnerships Webflow pages if missing; publish; verify 200 + foot-core. */
import fs from 'fs';
import path from 'path';
import { connectBrowser } from './collab-lib.mjs';
import { ROOT, sleep, prepareWebflowDesigner, WEBFLOW_DESIGNER_URL } from './demigod-turn-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-ROUTE-PAGES-PASS.json');
const PAGES = [
  { name: 'Legal', slug: 'legal' },
  { name: 'Partnerships', slug: 'partnerships' },
  { name: 'Hire', slug: 'hire' },
  { name: 'Talent', slug: 'talent' },
  { name: 'How', slug: 'how' },
  { name: 'Pilot', slug: 'pilot' },
  { name: 'Proof', slug: 'proof' },
];

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
  for (let i = 0; i < 4; i++) {
    await page.click('[data-automation-id="left-sidebar-pages-button"]');
    await sleep(2500);
    const open = await page.$('[data-automation-id="add-page-menu-button"]');
    if (open) return;
  }
  await page.waitForSelector('[data-automation-id="add-page-menu-button"]', { timeout: 30000 });
}

async function pageExists(page, slug) {
  return page.evaluate((s) =>
    [...document.querySelectorAll('[data-automation-id="list-cell"]')].some((e) => new RegExp(`^${s}$`, 'i').test((e.textContent || '').trim())),
    slug,
  );
}

async function createPage(page, { name, slug }) {
  const result = { name, slug, steps: [] };
  await openPagesPanel(page);
  await page.click('[data-automation-id="add-page-menu-button"]');
  await sleep(1200);
  result.steps.push({ action: 'create-page-menu', hit: await clickText(page, '^Create page$') });
  await sleep(2500);

  await page.waitForSelector('input', { timeout: 10000 });
  const filled = await page.evaluate(({ name, slug }) => {
    const inputs = [...document.querySelectorAll('input')].filter((i) => i.offsetParent !== null);
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    const nameIn = inputs.find((i) => /page name|name/i.test((i.placeholder || '') + (i.getAttribute('aria-label') || ''))) || inputs[0];
    const slugIn = inputs.find((i) => /slug/i.test((i.placeholder || '') + (i.getAttribute('aria-label') || ''))) || inputs[1];
    if (!nameIn) return { ok: false };
    if (setter) setter.call(nameIn, name); else nameIn.value = name;
    nameIn.dispatchEvent(new Event('input', { bubbles: true }));
    if (slugIn) {
      if (setter) setter.call(slugIn, slug); else slugIn.value = slug;
      slugIn.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return { ok: true };
  }, { name, slug });
  result.steps.push({ action: 'fill', ...filled });
  await sleep(500);
  let saved = await clickText(page, '^Create page$') || await clickText(page, '^Create$');
  if (!saved) {
    saved = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button,[role="button"]')].find((b) => /create page|^create$/i.test((b.textContent || '').trim()));
      if (!btn) return null;
      btn.click();
      return (btn.textContent || '').trim();
    });
    await sleep(2000);
  }
  result.steps.push({ action: 'save', hit: saved });
  await sleep(5000);
  result.exists = await pageExists(page, slug);
  return result;
}

async function publishSite(page) {
  assertNotFrozen('route-pages-pass');
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

async function checkRoute(slug) {
  const res = await fetch(`https://www.trydemigod.com/${slug}?v=${Date.now()}`);
  const html = await res.text();
  const foot = /catbox\.moe\/[a-z0-9]+\.js/i.test(html) || /dg-foot-v\d+-core/.test(html);
  return { status: res.status, foot, ok: res.status === 200 && foot };
}

async function main() {
  const browser = await connectBrowser();
  const { page, resize } = await prepareWebflowDesigner(browser, { url: WEBFLOW_DESIGNER_URL });
  const result = { at: new Date().toISOString(), resize, pages: {}, before: {} };

  for (const p of PAGES) {
    result.before[p.slug] = await checkRoute(p.slug);
  }

  await openPagesPanel(page);
  result.create = [];
  for (const p of PAGES) {
    const exists = await pageExists(page, p.slug);
    if (exists) {
      result.create.push({ ...p, skipped: true, exists: true });
      continue;
    }
    result.create.push(await createPage(page, p));
  }

  result.publish = await publishSite(page);
  await page.screenshot({ path: path.join(ROOT, 'audit-shots/webflow/route-pages-after.png') });
  await browser.disconnect();

  for (let i = 0; i < 15; i++) {
    await sleep(8000);
    for (const p of PAGES) {
      result.pages[p.slug] = await checkRoute(p.slug);
    }
    if (PAGES.every((p) => result.pages[p.slug]?.ok)) break;
  }

  result.pass = PAGES.every((p) => result.pages[p.slug]?.ok);
  fs.writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ pass: result.pass, pages: result.pages, publish: result.publish }, null, 2));
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
