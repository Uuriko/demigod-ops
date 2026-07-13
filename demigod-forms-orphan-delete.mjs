#!/usr/bin/env node
/** Delete orphan Email Form + Test Form from Designer canvas and Forms dashboard. */
import fs from 'fs';
import path from 'path';
import { connectBrowser } from './collab-lib.mjs';
import {
  ROOT,
  sleep,
  wlog,
  prepareWebflowDesigner,
  WEBFLOW_DESIGNER_URL,
} from './demigod-turn-lib.mjs';
import { fetchLiveHtml } from './demigod-live-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-FORMS-ORPHAN-DELETE.json');
const SITE = 'talentlink-sf';
const ORPHANS = [/^Email Form$/i, /^Test Form$/i];

function metrics(html) {
  return {
    emailForm: (html.match(/data-name=["']email-form["']/gi) || []).length,
    testForm: (html.match(/data-name=["']test-form["']/gi) || []).length,
    startupHire: (html.match(/data-name=["']startup-hire["']/gi) || []).length,
    engineerJoin: (html.match(/data-name=["']engineer-join["']/gi) || []).length,
  };
}

async function openNavigator(page) {
  await page.keyboard.press('Escape');
  await sleep(200);
  await page.keyboard.press('z');
  await sleep(900);
}

async function clickNavigatorNode(page, pattern) {
  return page.evaluate((reSrc) => {
    const re = new RegExp(reSrc, 'i');
    const nodes = [...document.querySelectorAll(
      '[class*="Navigator"] *, [data-automation-id*="navigator"] *, aside *, [role="tree"] *, [role="treeitem"] *',
    )];
    for (const el of nodes) {
      const t = (el.textContent || '').trim();
      if (!t || t.length > 80 || !re.test(t)) continue;
      const hit = el.closest('[role="treeitem"], [class*="Node"], li, button, div');
      if (hit) { hit.click(); return { ok: true, text: t }; }
      el.click();
      return { ok: true, text: t };
    }
    const leaf = [...document.querySelectorAll('div,span,button')].find((el) => {
      const t = (el.textContent || '').trim();
      return t && t.length < 60 && re.test(t) && el.children.length === 0;
    });
    if (leaf) { leaf.click(); return { ok: true, text: (leaf.textContent || '').trim() }; }
    return { ok: false };
  }, pattern.source);
}

async function deleteCanvasOrphans(page) {
  const canvas = await page.evaluate(() => {
    const changes = [];
    for (const iframe of document.querySelectorAll('iframe')) {
      try {
        const doc = iframe.contentDocument;
        if (!doc || iframe.clientWidth < 500) continue;
        for (const f of [...doc.querySelectorAll('form.w-form, form')]) {
          const n = (f.getAttribute('data-name') || f.name || f.id || '').toLowerCase();
          if (!/^(email-form|test-form)$/.test(n)) continue;
          if (f.closest('#startup-modal,#jobseeker-modal')) continue;
          (f.closest('.w-form-wrap,section,.w-form') || f).remove();
          changes.push(`canvas-rm:${n}`);
        }
      } catch (_) { /* ignore */ }
    }
    return { ok: changes.length > 0, changes };
  });

  const navSteps = [];
  await openNavigator(page);
  for (const pat of ORPHANS) {
    const hit = await clickNavigatorNode(page, pat);
    if (hit.ok) {
      await page.keyboard.press('Delete');
      await sleep(500);
      navSteps.push({ label: pat.source, deleted: true, text: hit.text });
    } else {
      navSteps.push({ label: pat.source, deleted: false });
    }
  }

  return { canvas, navSteps };
}

async function deleteDashboardOrphans(page) {
  const url = `https://webflow.com/dashboard/sites/${SITE}/forms`;
  if (!page.url().includes('/forms')) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
    await sleep(3500);
  }

  const steps = [];
  for (const label of ['Email Form', 'Test Form']) {
    const hit = await page.evaluate((name) => {
      const tr = [...document.querySelectorAll('tr')].find((r) => (r.textContent || '').trim().startsWith(name));
      if (!tr) return { ok: false, reason: 'row missing' };
      const btn = tr.querySelector('button[aria-label="Delete form"], button[aria-label*="Delete"]');
      if (!btn) return { ok: false, reason: 'delete btn missing' };
      btn.click();
      return { ok: true };
    }, label);
    if (!hit.ok) {
      steps.push({ form: label, deleted: false, reason: hit.reason });
      continue;
    }
    await sleep(1000);
    const cleared = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        /^clear submissions$/i.test((b.textContent || '').trim()),
      );
      if (btn) { btn.click(); return { cleared: true }; }
      return { cleared: false };
    });
    await sleep(2500);
    steps.push({ form: label, submissionsCleared: cleared.cleared, note: 'Webflow keeps dashboard name until canvas element removed (already gone on live)' });
  }

  const listed = await page.evaluate(() =>
    [...document.querySelectorAll('tr')].map((tr) => (tr.textContent || '').trim().split('View')[0].trim()).filter((t) =>
      /^(Email Form|Test Form|startup-hire|engineer-join)$/i.test(t),
    ),
  );

  return { steps, listed: [...new Set(listed)] };
}

async function publish(page) {
  await page.goto(WEBFLOW_DESIGNER_URL, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});
  await sleep(2000);
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(1200);
  await page.evaluate(() =>
    [...document.querySelectorAll('button')].find((b) => /^publish$/i.test((b.textContent || '').trim()))?.click(),
  );
  await sleep(2500);
  await page.evaluate(() =>
    [...document.querySelectorAll('button')].find((b) => /publish to selected|publish site/i.test(b.textContent || ''))?.click(),
  );
  await sleep(18000);
}

async function main() {
  wlog('=== FORMS ORPHAN DELETE START ===');
  const beforeHtml = (await fetchLiveHtml()).html;
  const before = metrics(beforeHtml);

  const browser = await connectBrowser();
  const { page } = await prepareWebflowDesigner(browser, { url: WEBFLOW_DESIGNER_URL });
  await sleep(1500);

  const designer = await deleteCanvasOrphans(page);
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(1000);

  const dashboard = await deleteDashboardOrphans(page);
  await publish(page);
  await browser.disconnect();

  await sleep(8000);
  const afterHtml = (await fetchLiveHtml(`?v=orphan-${Date.now()}`)).html;
  const after = metrics(afterHtml);
  const pass = after.emailForm === 0 && after.testForm === 0 && after.startupHire >= 1 && after.engineerJoin >= 1;

  const out = {
    at: new Date().toISOString(),
    before,
    designer,
    dashboard,
    after,
    pass,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== FORMS ORPHAN DELETE END ===');
  process.exit(pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });