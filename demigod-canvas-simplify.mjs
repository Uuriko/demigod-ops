#!/usr/bin/env node
/** Canvas bloat delete only — no Tally, no mythic inject. */
import fs from 'fs';
import path from 'path';
import { connectBrowser } from './collab-lib.mjs';
import {
  ROOT,
  wlog,
  sleep,
  prepareWebflowDesigner,
  captureDemigodScreenshots,
  WEBFLOW_DESIGNER_URL,
} from './demigod-turn-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-CANVAS-SIMPLIFY.json');

async function patchCanvas(page) {
  return page.evaluate(() => {
    let doc = null;
    for (const iframe of document.querySelectorAll('iframe')) {
      try {
        const d = iframe.contentDocument;
        if (d && iframe.clientWidth >= 500) { doc = d; break; }
      } catch (_) { /* ignore */ }
    }
    if (!doc) return { ok: false, reason: 'no canvas iframe' };

    const changes = [];
    const removeIf = (re, label) => {
      for (const el of [...doc.querySelectorAll('section,div,article')]) {
        const t = (el.textContent || '').trim();
        if (!re.test(t) || t.length < 40 || t.length > 12000) continue;
        if (el.closest('#startup-modal,#jobseeker-modal')) continue;
        el.remove();
        changes.push(`del:${label}`);
      }
    };

    removeIf(/THE METHODOLOGY|METHODOLOGY\s*0?1/i, 'methodology');
    removeIf(/CURATED INSIGHTS/i, 'curated');
    removeIf(/HIRING MADE SIMPLE|FREQUENTLY ASKED/i, 'faq');
    removeIf(/GET IN TOUCH|415-555|101 Web Lane/i, 'fake-contact');
    removeIf(/ATHENA[\s\S]{0,300}HEPHAESTUS|THE PANTHEON OF AGENTS/i, 'pantheon');
    removeIf(/SYNDICATE SUBSCRIPTION|\$5,?000|\$5K\/MO/i, 'old-pricing');

    for (const a of [...doc.querySelectorAll('nav a,.w-nav a')]) {
      const t = (a.textContent || '').trim();
      if (/^(SOLUTIONS|ABOUT|BLOG|SUPPORT)$/i.test(t)) {
        (a.closest('li,.w-dropdown,div') || a).remove();
        changes.push(`nav-rm:${t}`);
      }
    }

    return { ok: changes.length > 0, changes: [...new Set(changes)] };
  });
}

async function savePublish(page) {
  assertNotFrozen('canvas-simplify');
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(800);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /^publish$/i.test((b.textContent || '').trim()))?.click();
  });
  await sleep(2500);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /publish to selected|publish site/i.test(b.textContent || ''))?.click();
  });
  await sleep(12000);
}

async function main() {
  wlog('=== CANVAS SIMPLIFY START ===');
  const browser = await connectBrowser();
  const { page } = await prepareWebflowDesigner(browser, { url: WEBFLOW_DESIGNER_URL });
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Demigod')?.click();
  });
  await sleep(800);
  const patch = await patchCanvas(page);
  wlog(`canvas: ${JSON.stringify(patch)}`);
  await captureDemigodScreenshots('canvas-simplify');
  if (patch.ok) await savePublish(page);
  await browser.disconnect();
  fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), patch, published: patch.ok }, null, 2));
  console.log(JSON.stringify({ ok: patch.ok, changes: patch.changes, out: OUT }));
  wlog('=== CANVAS SIMPLIFY END ===');
}

main().catch((e) => { console.error(e); process.exit(1); });
