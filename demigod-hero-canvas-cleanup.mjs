#!/usr/bin/env node
/** Permanently replace mythic hero copy on Webflow canvas + publish + verify. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  ROOT,
  wlog,
  sleep,
  findWebflowPage,
  submitWebflowAiPrompt,
  waitWebflowTurnComplete,
  captureDemigodScreenshots,
} from './demigod-turn-lib.mjs';
import { connectBrowser } from './collab-lib.mjs';
import { fetchLiveHtml } from './demigod-live-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-HERO-CANVAS-CLEANUP.json');
const DESIGNER = 'https://talentlink-sf.design.webflow.com/?pageId=6a34c484dcedc18a174081b8';

const AI_PROMPT = `HERO CANVAS CLEANUP — Demigod home page ONLY. Permanent text DELETE + replace on canvas.

DELETE / replace mythic hero copy:
- Badge: remove "THE ELITE SYNDICATE", "DEMIGOD //" coords — set to "SF AI TALENT MATCHING"
- H1: remove FORGE / DIVINE / AI AGENTS — set to three spans: "SF AI Talent." + "Human" + "Matched."
- Subhead: remove Hermes, perfect demigod, Precision-matched — set to: "Startups: get 3-5 perfect SF AI engineers in 48 hours. Engineers: get matched to the right roles. Humans read every brief."
- Hero CTAs: red button "HIRE TALENT", blue button "JOIN NETWORK" (not FIND TALENT / GET JOB)
- Remove LAT. 37.7749, SF // CA, Two buttons placeholder

Also DELETE any remaining on page (not modals):
- HERMES, PANTHEON, ATHENA, HEPHAESTUS, FORGE, SUMMON, SYNDICATE, demigod.ai references in visible sections

KEEP: pricing (10% on hire), modals, trust/how section, footer hello@trydemigod.com.

Publish to production + staging. List every hero element changed.`;

const LEAKS = [
  'FORGE DIVINE',
  'ELITE SYNDICATE',
  'perfect demigod',
  'Hermes delivers',
  'Precision-matched SF AI engineers for founders',
  'FIND TALENT',
  'GET JOB',
];

async function ensureDesigner(browser) {
  let page = await findWebflowPage(browser);
  if (!page) {
    page = await browser.newPage();
    await page.goto(DESIGNER, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await sleep(6000);
  } else {
    await page.bringToFront();
    if (!page.url().includes('design.webflow.com')) {
      await page.goto(DESIGNER, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await sleep(6000);
    }
  }
  await page.setViewport({ width: 1440, height: 900 });
  return page;
}

async function patchCanvas(page) {
  return page.evaluate(() => {
    let doc = null;
    for (const iframe of document.querySelectorAll('iframe')) {
      try {
        const d = iframe.contentDocument;
        if (d && iframe.clientWidth >= 500 && /FORGE|DIVINE|HIRE|SF AI/i.test(d.body?.innerText || '')) {
          doc = d;
          break;
        }
      } catch (_) { /* ignore */ }
    }
    if (!doc) return { ok: false, reason: 'no canvas iframe' };

    const changes = [];
    const walk = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      let v = n.nodeValue || '';
      if (!v.trim()) continue;
      if (/ELITE SYNDICATE|THE ELITE SYNDICATE/i.test(v)) {
        n.nodeValue = v.replace(/DEMIGOD\s*\/\/\s*THE ELITE SYNDICATE|THE ELITE SYNDICATE|ELITE SYNDICATE/gi, 'SF AI TALENT MATCHING');
        changes.push('badge');
      }
      if (/^FORGE$/i.test(v.trim())) { n.nodeValue = 'SF AI Talent.'; changes.push('h1-forge'); }
      if (/^DIVINE$/i.test(v.trim())) { n.nodeValue = 'Human'; changes.push('h1-divine'); }
      if (/^AI AGENTS$/i.test(v.trim())) { n.nodeValue = 'Matched.'; changes.push('h1-agents'); }
      if (/Hermes|perfect demigod|Precision-matched/i.test(v)) {
        n.nodeValue = 'Startups: get 3-5 perfect SF AI engineers in 48 hours. Engineers: get matched to the right roles. Humans read every brief.';
        changes.push('subhead');
      }
    }
    for (const a of [...doc.querySelectorAll('a,button')]) {
      const lbl = a.querySelector('.btn-label') || a;
      const t = (lbl.textContent || '').trim();
      if (/^FIND TALENT$/i.test(t)) { lbl.textContent = 'HIRE TALENT'; changes.push('cta-founder'); }
      if (/^GET JOB$/i.test(t)) { lbl.textContent = 'JOIN NETWORK'; changes.push('cta-engineer'); }
    }
    return { ok: changes.length > 0, changes: [...new Set(changes)] };
  });
}

async function savePublish(page) {
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(1200);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /^publish$/i.test((b.textContent || '').trim()))?.click();
  });
  await sleep(2500);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /publish to selected|publish site|publish now/i.test(b.textContent || ''))?.click();
  });
  await sleep(8000);
}

async function leakCheck() {
  const { html } = await fetchLiveHtml();
  const found = LEAKS.filter((k) => new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(html));
  return { found, clean: found.length === 0 };
}

async function main() {
  wlog('=== HERO CANVAS CLEANUP START ===');
  const result = { at: new Date().toISOString(), steps: [] };

  const browser = await connectBrowser();
  const page = await ensureDesigner(browser);
  result.designerUrl = page.url();

  const patch = await patchCanvas(page);
  result.canvasPatch = patch;
  wlog(`canvas patch: ${JSON.stringify(patch)}`);
  if (patch.ok) {
    await savePublish(page);
    result.publishedCanvas = true;
    await sleep(10000);
  }

  const ai = await submitWebflowAiPrompt(AI_PROMPT);
  result.steps.push({ step: 'webflow-ai-submit', ...ai });
  if (ai.ok) {
    const wait = await waitWebflowTurnComplete(360000, ai.beforeTail || '');
    result.steps.push({ step: 'webflow-ai-wait', ...wait });
    if (wait.ok) {
      const b2 = await connectBrowser();
      const p2 = await ensureDesigner(b2);
      await savePublish(p2);
      result.publishedAi = true;
      await b2.disconnect();
      await sleep(12000);
    }
  }

  await browser.disconnect().catch(() => {});
  result.screenshots = await captureDemigodScreenshots('hero-canvas-cleanup');
  result.sourceAfter = await leakCheck();

  const verify = spawnSync('npm', ['run', 'demigod:verify:all'], { cwd: ROOT, encoding: 'utf8' });
  result.verifyExit = verify.status;
  result.pass = (patch.ok || ai.ok) && verify.status === 0;

  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({
    ok: result.pass,
    patch: patch.changes || [],
    ai: ai.ok,
    heroLeaks: result.sourceAfter.found,
    verify: verify.status,
    out: OUT,
  }));
  wlog('=== HERO CANVAS CLEANUP END ===');
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });