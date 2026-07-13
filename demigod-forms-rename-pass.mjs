#!/usr/bin/env node
/** CDP: Webflow Forms dashboard — rename email-form → startup-hire. */
import fs from 'fs';
import path from 'path';
import { connectBrowser, sleep } from './collab-lib.mjs';
import { ROOT, wlog } from './demigod-turn-lib.mjs';
import { fetchLiveHtml } from './demigod-live-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-FORMS-RENAME.json');
const SITE = 'talentlink-sf';
const RENAMES = [
  { from: /email-form|startup-form/i, to: 'startup-hire', label: 'Startup hire brief' },
  { from: /jobseeker-form/i, to: 'engineer-join', label: 'Engineer join' },
];

async function clickText(page, pattern) {
  const pos = await page.evaluate((src) => {
    const rx = new RegExp(src, 'i');
    const el = [...document.querySelectorAll('button,a,[role="button"],div,span,li,td')].find((n) => {
      const t = (n.textContent || '').trim();
      return rx.test(t) && t.length < 80;
    });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 2) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: (el.textContent || '').trim().slice(0, 50) };
  }, pattern);
  if (!pos) return null;
  await page.mouse.click(pos.x, pos.y);
  await sleep(1500);
  return pos;
}

async function renameForm(page, spec) {
  const steps = [];
  if (!/forms/i.test(page.url())) {
    await page.goto(`https://webflow.com/dashboard/sites/${SITE}/forms`, { waitUntil: 'networkidle2', timeout: 90000 });
  }
  await sleep(3000);
  steps.push('forms-page');

  const row = await clickText(page, spec.from.source === /email-form|startup-form/i.source ? 'email-form|startup-form|Startup' : 'jobseeker|engineer');
  if (row) steps.push(`open:${row.text}`);

  await clickText(page, 'Settings|Edit|Rename');
  await sleep(1000);

  const filled = await page.evaluate(({ name, label }) => {
    let ok = false;
    for (const input of document.querySelectorAll('input,textarea')) {
      const ph = (input.placeholder || input.name || input.getAttribute('aria-label') || '').toLowerCase();
      const r = input.getBoundingClientRect();
      if (r.width < 20) continue;
      if (/form name|data-name|name/i.test(ph) || input.value === 'email-form' || input.value === 'startup-form') {
        input.focus();
        input.value = name;
        input.dispatchEvent(new InputEvent('input', { bubbles: true }));
        ok = true;
      }
      if (/label|display/i.test(ph)) {
        input.value = label;
        input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      }
    }
    return ok;
  }, { name: spec.to, label: spec.label });

  if (filled) {
    await clickText(page, '^Save$|^Update$|^Done$');
    await sleep(2000);
    steps.push('saved');
  }

  return { ...spec, steps, filled };
}

async function main() {
  wlog('=== FORMS RENAME PASS START ===');
  const before = await fetchLiveHtml().then(({ html }) => ({
    emailForm: (html.match(/data-name=["']email-form["']/gi) || []).length,
    startupHire: (html.match(/data-name=["']startup-hire["']/gi) || []).length,
  }));

  const browser = await connectBrowser();
  const pages = await browser.pages();
  let page = pages.find((p) => /dashboard\/sites\/[^/]+\/forms/i.test(p.url()));
  if (!page) page = pages.find((p) => /webflow\.com/i.test(p.url())) || await browser.newPage();
  await page.bringToFront();
  if (!/forms/i.test(page.url())) {
    await page.goto(`https://webflow.com/dashboard/sites/${SITE}/forms`, { waitUntil: 'networkidle2', timeout: 90000 });
  }

  const results = [];
  for (const spec of RENAMES) results.push(await renameForm(page, spec));

  await browser.disconnect();

  await sleep(8000);
  const after = await fetchLiveHtml().then(({ html }) => ({
    emailForm: (html.match(/data-name=["']email-form["']/gi) || []).length,
    startupHire: (html.match(/data-name=["']startup-hire["']/gi) || []).length,
  }));

  const report = { at: new Date().toISOString(), before, results, after };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  wlog('=== FORMS RENAME PASS END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });