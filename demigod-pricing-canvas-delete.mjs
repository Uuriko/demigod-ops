#!/usr/bin/env node
/** Permanently delete subscription pricing + hiring-model from Webflow canvas, publish, verify. */
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
import { assertNotFrozen } from './demigod-publish-freeze.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-PRICING-CANVAS-DELETE.json');
const DESIGNER = 'https://talentlink-sf.design.webflow.com/?pageId=6a34c484dcedc18a174081b8';

const AI_PROMPT = `PRICING CANVAS DELETE — Demigod home page ONLY. Permanent DELETE (not hide).

DELETE from canvas:
1. Entire subscription pricing card: SYNDICATE SUBSCRIPTION, $5K/MO, /MO, MOST POPULAR, CHOOSE SUBSCRIPTION, Unlimited hires under subscription, monthly delivery, PLUS 10% COMMISSION
2. Dual-model intro: "PRICING MODELS", "Choose the path that aligns", "performance-driven", "two path"
3. Commission-only card duplicate if separate: COMMISSION ONLY, 20%, OF FIRST YEAR SALARY, CHOOSE COMMISSION (if a second card remains)
4. Startup modal: delete Hiring Model field, Commission-only radio, Subscription radio, hiring-model inputs
5. Delete team-size, urgency, availability fields if still on modal forms

KEEP exactly one pricing card:
- Headline: 10% on hire (or On hire)
- Bullets: Access to pre-vetted SF talent, Dedicated talent partner, 90-day replacement guarantee
- Note: 10% placement fee on hire
- CTA: HIRE TALENT → #startup-modal

Update pricing section intro to: "One model: 10% placement fee when you hire. No upfront cost."

Publish to production + staging. List every element deleted.`;

const LEAKS = [
  'SYNDICATE SUBSCRIPTION',
  'CHOOSE SUBSCRIPTION',
  '$5K/MO',
  'hiring-model-subscription',
  'Commission-only',
  'PRICING MODELS',
  '20% OF FIRST YEAR',
];

async function ensureDesignerPage(browser) {
  let page = await findWebflowPage(browser);
  if (!page) {
    page = await browser.newPage();
    await page.goto(DESIGNER, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await sleep(5000);
  } else {
    await page.bringToFront();
    if (!page.url().includes('design.webflow.com')) {
      await page.goto(DESIGNER, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await sleep(5000);
    }
  }
  return page;
}

async function patchCanvas(page) {
  return page.evaluate(() => {
    let doc = null;
    for (const iframe of document.querySelectorAll('iframe')) {
      try {
        const d = iframe.contentDocument;
        if (d && iframe.clientWidth >= 500 && /PRICING|HIRE TALENT|SF AI/i.test(d.body?.innerText || '')) {
          doc = d;
          break;
        }
      } catch (_) { /* ignore */ }
    }
    if (!doc) return { ok: false, reason: 'no canvas iframe' };

    const changes = [];
    const kill = (el, label) => {
      if (!el) return;
      el.remove();
      changes.push(label);
    };

    const removeIf = (re, label) => {
      for (const el of [...doc.querySelectorAll('section,div,article')]) {
        const t = (el.textContent || '').trim();
        if (!re.test(t) || t.length > 6000 || t.length < 20) continue;
        if (el.closest('#startup-modal,#jobseeker-modal')) continue;
        if (el.querySelector('#startup-modal,#jobseeker-modal')) continue;
        kill(el, `${label}:${t.slice(0, 36)}`);
      }
    };

    removeIf(/SYNDICATE SUBSCRIPTION|\$5K\/MO|CHOOSE SUBSCRIPTION|MOST POPULAR/i, 'sub-card');
    removeIf(/COMMISSION ONLY[\s\S]{0,120}20%|20%[\s\S]{0,80}OF FIRST YEAR SALARY/i, 'commission-card');

    for (const h of [...doc.querySelectorAll('h2,h3,p,span')]) {
      const t = (h.textContent || '').trim();
      if (/^SYNDICATE SUBSCRIPTION$/i.test(t)) {
        let n = h;
        for (let i = 0; i < 10 && n; i++) {
          if (n.querySelector?.('a,button') && /SUBSCRIPTION|\$5/i.test(n.textContent || '')) {
            kill(n, 'sub-h3-card');
            break;
          }
          n = n.parentElement;
        }
      }
      if (/PRICING MODELS/i.test(t)) { h.textContent = 'PRICING'; changes.push('pricing-h2'); }
      if (/Choose the path that aligns/i.test(t)) {
        h.textContent = 'One model: 10% placement fee when you hire. No upfront cost.';
        changes.push('pricing-intro');
      }
    }

    const startup = doc.querySelector('#startup-modal');
    if (startup) {
      for (const el of [...startup.querySelectorAll('label,span,p,div,input,select')]) {
        const t = (el.textContent || el.value || el.name || '').trim();
        if (/Hiring Model|Commission-only|Subscription|hiring-model/i.test(t)) {
          kill(el.closest('.w-radio,.w-input,.w-select,fieldset,div') || el, 'modal-hiring-model');
        }
      }
      for (const el of [...startup.querySelectorAll('[name=team-size],[name=urgency],[name=hiring-model],[id*=hiring-model]')]) {
        kill(el.closest('.w-radio,.w-input,.w-select,div') || el, 'modal-field');
      }
    }

    for (let pass = 0; pass < 2; pass++) {
      for (const el of [...doc.querySelectorAll('a,button')]) {
        const t = (el.textContent || '').trim();
        if (/^CHOOSE SUBSCRIPTION$/i.test(t)) {
          kill(el.closest('div,section') || el, 'choose-sub-btn');
        }
      }
    }

    return { ok: true, changes };
  });
}

async function savePublish(page) {
  assertNotFrozen('pricing-canvas-delete');
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
  const found = LEAKS.filter((k) => html.includes(k) || new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(html));
  return { found, clean: found.length === 0 };
}

async function main() {
  wlog('=== PRICING CANVAS DELETE START ===');
  const result = { at: new Date().toISOString(), steps: [] };

  const browser = await connectBrowser();
  const page = await ensureDesignerPage(browser);
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
      const page2 = await ensureDesignerPage(await connectBrowser());
      await savePublish(page2);
      result.publishedAi = true;
      await sleep(12000);
    }
  }

  await browser.disconnect().catch(() => {});
  result.screenshots = await captureDemigodScreenshots('pricing-canvas-delete');

  result.sourceBefore = await leakCheck();
  await sleep(5000);
  result.sourceAfter = await leakCheck();

  const verify = spawnSync('npm', ['run', 'demigod:verify:all'], { cwd: ROOT, encoding: 'utf8' });
  result.verifyExit = verify.status;

  result.pass = (patch.ok || ai.ok) && result.sourceAfter.clean && verify.status === 0;
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({
    ok: result.pass,
    patch: patch.changes?.length || 0,
    ai: ai.ok,
    leaksAfter: result.sourceAfter.found,
    verify: verify.status,
    out: OUT,
  }));
  wlog('=== PRICING CANVAS DELETE END ===');
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
