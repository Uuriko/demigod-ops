#!/usr/bin/env node
/** Open Navigation component master → FIND TALENT + publish. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { connectBrowser } from './collab-lib.mjs';
import { ROOT, prepareWebflowDesigner, sleep, wlog, captureDemigodScreenshots } from './demigod-turn-lib.mjs';
import { fetchLiveHtml } from './demigod-live-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-NAV-MASTER.json');
const NAV_CTA = 'FIND TALENT';

function patchNav(doc) {
  const changes = [];
  for (const a of [...doc.querySelectorAll('nav a,.w-nav a,a.button.on-inverse')]) {
    const lbl = a.querySelector('.button_label,.btn-label') || a;
    const t = (lbl.textContent || '').trim();
    if (/^(POST A JOB|HIRE TALENT)$/i.test(t) || (a.classList.contains('on-inverse') && a.closest('nav,.w-nav,.nav_container'))) {
      lbl.textContent = NAV_CTA;
      a.setAttribute('href', '#startup-modal');
      changes.push('nav-find-talent');
    }
  }
  for (const a of doc.querySelectorAll('nav a, .nav_container a, .w-nav a')) {
    const t = (a.textContent || '').trim();
    if (/^(SOLUTIONS|ABOUT|BLOG|SUPPORT)$/i.test(t)) {
      const li = a.closest('li, div');
      (li || a).remove();
      changes.push(`hide-nav:${t}`);
    }
  }
  return changes;
}

async function patchIframe(page) {
  return page.evaluate((cta) => {
    const patch = (doc) => {
      const changes = [];
      for (const a of [...doc.querySelectorAll('nav a,.w-nav a,a.button.on-inverse')]) {
        const lbl = a.querySelector('.button_label,.btn-label') || a;
        const t = (lbl.textContent || '').trim();
        if (/^(POST A JOB|HIRE TALENT)$/i.test(t) || (a.classList.contains('on-inverse') && a.closest('nav,.w-nav,.nav_container'))) {
          lbl.textContent = cta;
          a.setAttribute('href', '#startup-modal');
          changes.push('nav-find-talent');
        }
      }
      return changes;
    };
    for (const iframe of document.querySelectorAll('iframe')) {
      try {
        const doc = iframe.contentDocument;
        if (!doc || iframe.clientWidth < 500) continue;
        const c = patch(doc);
        if (c.length) return { ok: true, changes: c };
      } catch (_) { /* ignore */ }
    }
    return { ok: false, reason: 'no iframe' };
  }, NAV_CTA);
}

async function clickMaster(page, name) {
  await page.keyboard.press('Escape');
  await sleep(300);
  await page.keyboard.press('z');
  await sleep(1000);
  return page.evaluate((masterName) => {
    const item = [...document.querySelectorAll('*')].find(
      (b) => (b.textContent || '').trim() === masterName && b.children.length <= 3,
    );
    item?.click();
    const open = [...document.querySelectorAll('button,a,div,span')].find((b) =>
      /^open component$/i.test((b.textContent || '').trim()),
    );
    open?.click();
    return { clicked: !!item, opened: !!open };
  }, name);
}

async function exitMaster(page) {
  await page.evaluate(() => {
    [...document.querySelectorAll('button,a,div,span')].find((b) =>
      /update all/i.test((b.textContent || '').trim()),
    )?.click();
  });
  await sleep(1200);
  await page.evaluate(() => {
    [...document.querySelectorAll('button,a,div')].find((b) =>
      /done editing|exit master|back to page/i.test(b.textContent || ''),
    )?.click();
  });
  await sleep(800);
}

async function publish(page) {
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(800);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /^publish$/i.test((b.textContent || '').trim()))?.click();
  });
  await sleep(2500);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) =>
      /publish to selected|publish site|publish now/i.test(b.textContent || ''),
    )?.click();
  });
  await sleep(8000);
}

async function navInSource() {
  const { html } = await fetchLiveHtml(true);
  return {
    findNav: /FIND TALENT/i.test(html),
    title: ((html.match(/<title[^>]*>([^<]+)/i) || [])[1] || '').trim(),
  };
}

async function main() {
  wlog('=== NAV MASTER PASS START ===');
  const browser = await connectBrowser();
  const { page, resize } = await prepareWebflowDesigner(browser);
  if (!page) throw new Error('open Webflow Designer');
  wlog(`designer resize: ${JSON.stringify(resize)}`);

  const before = await navInSource();
  const openNav = await clickMaster(page, 'Navigation');
  await sleep(1500);
  const navPatch = await patchIframe(page);
  wlog(`nav master patch: ${JSON.stringify(navPatch)}`);
  await exitMaster(page);
  await captureDemigodScreenshots('nav-master');

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Demigod')?.click();
  });
  await sleep(800);
  const pagePatch = await patchIframe(page);
  wlog(`page nav patch: ${JSON.stringify(pagePatch)}`);

  await publish(page);
  await browser.disconnect();

  const after = await navInSource();
  const out = {
    at: new Date().toISOString(),
    before,
    openNav,
    navPatch,
    pagePatch,
    after,
    pass: after.findNav,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  wlog('=== NAV MASTER PASS END ===');
  process.exit(out.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });