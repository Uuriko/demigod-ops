#!/usr/bin/env node
/** Resize Designer + canvas/Webflow AI pass for all-candidate SF startup copy. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  ROOT,
  wlog,
  sleep,
  prepareWebflowDesigner,
  submitWebflowAiPrompt,
  waitWebflowTurnComplete,
  captureDemigodScreenshots,
} from './demigod-turn-lib.mjs';
import { connectBrowser } from './collab-lib.mjs';
import { closeExtraTabs } from './cdp-close-tabs.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-CANDIDATE-COPY-PASS.json');
const SPEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-COPY-SPEC.json'), 'utf8'));
const DESIGNER = 'https://talentlink-sf.design.webflow.com/?pageId=6a34c484dcedc18a174081b8';

const AI_PROMPT = `CANDIDATE COPY PASS — Demigod home page. Widen-safe canvas edits + publish.

BROWSER: ensure design mode (viewport at least 1440px wide).

REPLACE all engineer-only copy with all-candidate SF startup messaging:

HERO:
- Badge: "${SPEC.badge}"
- H1: "${SPEC.heroH1}" (three parts: SF Startup Talent. / Human / Matched.)
- Subhead: "${SPEC.heroSub}"
- CTAs: "${SPEC.ctaFounder}" + "${SPEC.ctaEngineer}"

MODALS:
- Startup h2: "${SPEC.startupH2}"
- Startup body: "${SPEC.startupBody}"
- Candidate h2: "${SPEC.engineerH2}"
- Candidate body: "${SPEC.engineerBody}"
- Candidate form label: "Background & highlights *" (not Years Experience / What you have shipped)
- Startup form label: "Skills / requirements *" (not Stack Needs only)
- Keep SF Bay Area checkbox on candidate form

TRUST / ROLES section:
- "${SPEC.trustKicker}"
- Steps: ${SPEC.trustSteps.join(' → ')}
- "${SPEC.ledgerKicker}"
- Example roles: Product Manager, Founding Designer, Head of Growth (not only engineers)

PRICING: keep single 10% on hire card only.

FOOTER tagline: "${SPEC.footerTag}"

DELETE any remaining: engineer-only, SF AI only, AI engineer, perfect demigod, Hermes.

Publish production + staging. List every text element changed.`;

async function ensureDesigner(browser) {
  const { page } = await prepareWebflowDesigner(browser, { url: DESIGNER });
  return page;
}

async function patchCanvas(page) {
  return page.evaluate((spec) => {
    let doc = null;
    for (const iframe of document.querySelectorAll('iframe')) {
      try {
        const d = iframe.contentDocument;
        if (d && iframe.clientWidth >= 500 && /HIRE|SF|Talent|PRICING/i.test(d.body?.innerText || '')) {
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
      if (/SF AI TALENT MATCHING|ELITE SYNDICATE/i.test(v)) {
        n.nodeValue = v.replace(/SF AI TALENT MATCHING/gi, spec.badge).replace(/ELITE SYNDICATE/gi, '');
        changes.push('badge');
      }
      if (/^SF AI TALENT\.?$/i.test(v.trim())) { n.nodeValue = 'SF Startup Talent.'; changes.push('h1'); }
      if (/SF AI engineers|Engineers: get matched|perfect SF AI engineers/i.test(v)) {
        n.nodeValue = spec.heroSub;
        changes.push('subhead');
      }
      if (/Engineers join/i.test(v)) { n.nodeValue = spec.footerTag; changes.push('footer'); }
      if (/SF AI only/i.test(v)) { n.nodeValue = spec.trustKicker; changes.push('trust'); }
      if (/Active SF AI pipelines/i.test(v)) { n.nodeValue = spec.ledgerKicker; changes.push('ledger'); }
      if (/What you have shipped|Years Experience/i.test(v)) { n.nodeValue = 'Background & highlights *'; changes.push('form-label'); }
      if (/Stack Needs/i.test(v)) { n.nodeValue = 'Skills / requirements *'; changes.push('stack-label'); }
    }
    for (const a of [...doc.querySelectorAll('a,button')]) {
      const lbl = a.querySelector('.btn-label') || a;
      const t = (lbl.textContent || '').trim();
      if (/^HIRE SF AI TALENT$/i.test(t) || /^JOIN THE SF AI NETWORK$/i.test(t)) {
        lbl.textContent = t.includes('HIRE') ? spec.startupH2 : spec.engineerH2;
        changes.push('modal-h2');
      }
    }
    return { ok: changes.length > 0, changes: [...new Set(changes)] };
  }, SPEC);
}

async function savePublish(page) {
  assertNotFrozen('candidate-copy-pass');
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

async function main() {
  wlog('=== CANDIDATE COPY PASS START ===');
  const tabs = await closeExtraTabs();
  const result = { at: new Date().toISOString(), tabsClosed: tabs.closed, steps: [] };

  const browser = await connectBrowser();
  const page = await ensureDesigner(browser);
  result.designerViewport = { width: 1440, height: 900 };

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
  result.screenshots = await captureDemigodScreenshots('candidate-copy');

  const pub = spawnSync('node', ['demigod-fix-custom-code.mjs'], { cwd: ROOT, encoding: 'utf8' });
  result.customCode = pub.status;

  const verify = spawnSync('npm', ['run', 'demigod:verify:all'], { cwd: ROOT, encoding: 'utf8' });
  result.verifyExit = verify.status;
  result.pass = verify.status === 0 && (patch.ok || ai.ok);

  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ok: result.pass, patch, ai: ai.ok, verify: verify.status, out: OUT }));
  wlog('=== CANDIDATE COPY PASS END ===');
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
