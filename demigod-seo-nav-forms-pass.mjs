#!/usr/bin/env node
/** SEO page title + nav master FIND TALENT + form label canvas fixes. */
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
import { fetchLiveHtml } from './demigod-live-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-SEO-NAV-FORMS.json');
const SPEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-COPY-SPEC.json'), 'utf8'));
const DESIGNER = 'https://talentlink-sf.design.webflow.com/?pageId=6a34c484dcedc18a174081b8';

const AI_PROMPT = `SEO + NAV MASTER + FORM LABELS — Demigod home page.

VIEWPORT: design mode at 1440px+ wide.

1) PAGE SETTINGS → SEO (home page):
- Title: ${SPEC.ogTitle}
- Meta description: ${SPEC.metaDescription}
- Open Graph title: ${SPEC.ogTitle}
- Open Graph description: ${SPEC.ogDescription}

2) NAVIGATION COMPONENT MASTER (double-click nav on canvas, edit master, Update all instances):
- Remove POST A JOB, HIRE TALENT duplicates, SOLUTIONS/ABOUT/BLOG dropdowns if present
- Add or keep one primary nav button: "${SPEC.navCta}" linking to #startup-modal
- Slim nav: logo + optional How it Works + Pricing + "${SPEC.navCta}" button only
- Save nav master

3) CANDIDATE MODAL (#jobseeker-modal) form labels on canvas:
- "Skills & Stack" → "Skills & experience *"
- "Background & highlights *" (not Years Experience)
- Startup modal: "Skills / requirements *" (not Stack Needs only)

Publish production + staging. List every change.`;

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
        if (d && iframe.clientWidth >= 500) {
          doc = d;
          break;
        }
      } catch (_) { /* ignore */ }
    }
    if (!doc) return { ok: false, reason: 'no canvas iframe' };
    const changes = [];
    for (const a of [...doc.querySelectorAll('nav a,.w-nav a,a.button.on-inverse')]) {
      const lbl = a.querySelector('.button_label,.btn-label') || a;
      const t = (lbl.textContent || '').trim();
      if (/^POST A JOB$|^HIRE TALENT$/i.test(t) && !/FIND TALENT/i.test(t)) {
        lbl.textContent = spec.navCta;
        a.setAttribute('href', '#startup-modal');
        changes.push('nav-cta');
      }
    }
    const walk = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      const v = n.nodeValue || '';
      if (/Skills\s*&\s*Stack/i.test(v)) {
        n.nodeValue = v.replace(/Skills\s*&\s*Stack\s*\*?/gi, 'Skills & experience *');
        changes.push('skills-label');
      }
      if (/Stack Needs/i.test(v)) {
        n.nodeValue = v.replace(/Stack Needs\s*\*?/gi, 'Skills / requirements *');
        changes.push('stack-label');
      }
    }
    return { ok: changes.length > 0, changes: [...new Set(changes)] };
  }, SPEC);
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

async function seoCheck() {
  const { html } = await fetchLiveHtml(true);
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
  const findNav = /FIND TALENT/i.test(html);
  const skills = /Skills & experience/i.test(html);
  const oldTitle = /SF AI Talent for Startups/i.test(title || html);
  return { title: title.trim(), findNav, skills, oldTitle };
}

async function main() {
  wlog('=== SEO NAV FORMS PASS START ===');
  await closeExtraTabs();
  const result = { at: new Date().toISOString(), steps: [] };

  const browser = await connectBrowser();
  const page = await ensureDesigner(browser);
  result.before = await seoCheck();

  const patch = await patchCanvas(page);
  result.canvasPatch = patch;
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
  result.after = await seoCheck();
  result.screenshots = await captureDemigodScreenshots('seo-nav-forms');

  const foot = spawnSync('npm', ['run', 'demigod:foot:cdn'], { cwd: ROOT, encoding: 'utf8' });
  const code = spawnSync('node', ['demigod-fix-custom-code.mjs'], { cwd: ROOT, encoding: 'utf8' });
  result.cdn = foot.status;
  result.customCode = code.status;

  const verify = spawnSync('npm', ['run', 'demigod:verify:all'], { cwd: ROOT, encoding: 'utf8' });
  result.verifyExit = verify.status;
  result.pass = verify.status === 0 && (result.after.findNav || patch.ok) && !result.after.oldTitle;

  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({
    ok: result.pass,
    before: result.before,
    after: result.after,
    patch,
    ai: ai.ok,
    verify: verify.status,
    out: OUT,
  }));
  wlog('=== SEO NAV FORMS PASS END ===');
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });