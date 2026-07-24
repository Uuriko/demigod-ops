#!/usr/bin/env node
/** Full ship pass: resize, nav/forms/footer/bloat canvas, AI, publish, audit, verify. Requires --apply. */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { connectBrowser } from './collab-lib.mjs';
import { closeExtraTabs } from './cdp-close-tabs.mjs';
import {
  ROOT,
  wlog,
  sleep,
  prepareWebflowDesigner,
  submitWebflowAiPrompt,
  waitWebflowTurnComplete,
  captureDemigodScreenshots,
  WEBFLOW_DESIGNER_URL,
} from './demigod-turn-lib.mjs';
import { fetchLiveHtml, scanLiveHtml, evaluatePageScan, LIVE_ORIGIN } from './demigod-live-lib.mjs';
import { assertNotFrozen } from './demigod-publish-freeze.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-FULL-SHIP.json');
const APPLY = process.argv.includes('--apply');

if (process.argv.includes('--policy') || !APPLY) {
  fs.writeFileSync(1, JSON.stringify({ apply: APPLY, externalWrites: APPLY, requiredFlag: '--apply' }) + '\n');
  process.exit(APPLY ? 0 : 2);
}

const SPEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-COPY-SPEC.json'), 'utf8'));

const AI_PROMPT = `FULL SHIP PASS — Demigod home (talentlink-sf). Viewport 1440px+. Publish when done.

PART 1 — NAVIGATION (page has NO nav — critical):
- Add Components → Navigation above hero if missing
- Edit Navigation master: Logo "Demigod" + optional How it Works + Pricing + button "${SPEC.navCta}" → #startup-modal
- Remove POST A JOB, SOLUTIONS, ABOUT, BLOG, SUPPORT dropdowns, GET STARTED clutter
- Update all instances, save master

PART 2 — FOOTER MASTER:
- Double-click Footer → edit master
- Delete Company/Services/Resources/Legal link columns, social icons, fake phone (415-555), fake address
- Keep: potter@trydemigod.com + "© 2026 Demigod. All rights reserved." + tagline: "${SPEC.footerTag}"
- Update all instances

PART 3 — DELETE PAGE BLOAT (permanent delete, not hide):
- METHODOLOGY 01/02/03 blocks
- CURATED INSIGHTS / edtech stock sections
- HIRING MADE SIMPLE / long FAQ / GET IN TOUCH / Business Email newsletter
- Duplicate Pantheon cards (keep at most one Hermes if any)
- ATHENA / HEPHAESTUS agent cards
- Orphan Email Form + Test Form outside modals

PART 4 — HERO + COPY (all SF startup candidates, not engineers-only):
- Badge: "${SPEC.badge}"
- H1: "${SPEC.heroH1}"
- Subhead: "${SPEC.heroSub}"
- CTAs: "${SPEC.ctaFounder}" + "${SPEC.ctaEngineer}"

PART 5 — STARTUP MODAL FORM (#startup-modal):
- Form name: startup-hire (NOT email-form), send to potter@trydemigod.com
- Fields: company-name, contact-email, role-title, stack-needs, salary-range (optional)
- DELETE: team-size, urgency, hiring-model, Source
- Label stack-needs: "Skills / requirements *"

PART 6 — CANDIDATE MODAL (#jobseeker-modal):
- Form name: engineer-join, send to potter@trydemigod.com
- Fields: full-name, seeker-email, linkedin-url (required), github-url (optional), is-engineer checkbox, skills-stack, experience, portfolio-url (optional), sf-bay checkbox
- GitHub required ONLY when is-engineer checked
- Labels: Skills & experience *, Background & highlights *
- Remove Tally embeds if any

PART 7 — PRICING: single 10% on hire card only. Delete subscription/SYNDICATE card.

Publish production + staging. List every change.`;

async function savePublish(page) {
  assertNotFrozen('full-ship-pass');
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await sleep(1200);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /^publish$/i.test((b.textContent || '').trim()))?.click();
  });
  await sleep(2500);
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) =>
      /publish to selected|publish site|publish now/i.test(b.textContent || ''),
    )?.click();
  });
  await sleep(10000);
}

async function patchCanvas(page) {
  return page.evaluate((spec) => {
    const BLOAT = /THE METHODOLOGY|METHODOLOGY 0|CURATED INSIGHTS|HIRING MADE SIMPLE|GET IN TOUCH|Business Email|Subscribe|newsletter|415-555|101 Web Lane|CONNECT WITH HIRING|ATHENA|HEPHAESTUS/i;
    const patch = (doc) => {
      const changes = [];
      for (const el of [...doc.querySelectorAll('section, main > div, body > div')]) {
        const t = (el.textContent || '').trim();
        if (t.length < 30 || t.length > 20000) continue;
        if (/PRICING/i.test(t) && /10%|on hire/i.test(t)) continue;
        if (BLOAT.test(t)) {
          el.remove();
          changes.push('del-bloat');
        }
      }
      for (const f of [...doc.querySelectorAll('form.w-form')]) {
        if (f.closest('#startup-modal,#jobseeker-modal')) continue;
        const n = (f.getAttribute('data-name') || f.name || '').toLowerCase();
        if (n === 'email-form' || n === 'test-form') {
          (f.closest('section,.w-form-wrap,div') || f).remove();
          changes.push('del-orphan-form');
        }
      }
      const startup = doc.querySelector('#startup-form, #startup-modal form, form[name="startup-form"]');
      if (startup) {
        startup.id = 'startup-hire';
        startup.setAttribute('name', 'startup-hire');
        startup.setAttribute('data-name', 'startup-hire');
        for (const n of ['team-size', 'urgency', 'hiring-model', 'Source', 'availability']) {
          const el = startup.querySelector(`[name="${n}"], #${n}`);
          if (el) {
            (el.closest('.w-input,.w-select,.w-radio,fieldset,div') || el).remove();
            changes.push(`rm:${n}`);
          }
        }
        changes.push('startup-hire');
      }
      const cand = doc.querySelector('#jobseeker-form, #jobseeker-modal form, form[name="jobseeker-form"]');
      if (cand) {
        cand.id = 'engineer-join';
        cand.setAttribute('name', 'engineer-join');
        cand.setAttribute('data-name', 'engineer-join');
        changes.push('engineer-join');
      }
      for (const a of [...doc.querySelectorAll('nav a,.w-nav a,a.button.on-inverse')]) {
        const lbl = a.querySelector('.button_label,.btn-label') || a;
        const t = (lbl.textContent || '').trim();
        if (/^(POST A JOB|HIRE TALENT|GET STARTED)$/i.test(t)) {
          lbl.textContent = spec.navCta;
          a.setAttribute('href', '#startup-modal');
          changes.push('nav-cta');
        }
      }
      const walk = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walk.nextNode())) {
        let v = node.nodeValue || '';
        if (!v.trim()) continue;
        if (/SF AI TALENT MATCHING/i.test(v)) { node.nodeValue = v.replace(/SF AI TALENT MATCHING/gi, spec.badge); changes.push('badge'); }
        if (/^SF AI TALENT\.?$/i.test(v.trim())) { node.nodeValue = 'SF Startup Talent.'; changes.push('h1'); }
        if (/SF AI engineers|perfect SF AI engineers|Engineers: get matched/i.test(v)) { node.nodeValue = spec.heroSub; changes.push('subhead'); }
        if (/Skills\s*&\s*Stack/i.test(v)) { node.nodeValue = v.replace(/Skills\s*&\s*Stack\s*\*?/gi, 'Skills & experience *'); changes.push('skills-label'); }
        if (/Stack Needs/i.test(v)) { node.nodeValue = v.replace(/Stack Needs\s*\*?/gi, 'Skills / requirements *'); changes.push('stack-label'); }
        if (/Years Experience|What you have shipped/i.test(v)) { node.nodeValue = 'Background & highlights *'; changes.push('exp-label'); }
        if (/SYNDICATE SUBSCRIPTION/i.test(v)) { (node.parentElement?.closest('div,section') || node.parentElement)?.remove(); changes.push('del-sub'); }
      }
      return changes;
    };
    const all = [];
    for (const iframe of document.querySelectorAll('iframe')) {
      try {
        const doc = iframe.contentDocument;
        if (!doc || iframe.clientWidth < 400) continue;
        all.push(...patch(doc));
      } catch (_) { /* ignore */ }
    }
    return { ok: all.length > 0, changes: [...new Set(all)] };
  }, SPEC);
}

async function liveAudit() {
  const { html, footerCoreJs } = await fetchLiveHtml(true);
  const htmlScan = scanLiveHtml(html, { footerCoreJs });
  const pageScan = evaluatePageScan({ html });
  const extra = {
    hasNav: /<nav[^>]*class="[^"]*w-nav|class="[^"]*w-nav-menu/i.test(html),
    findTalentStatic: /FIND TALENT/i.test(html),
    githubField: /name="github-url"|id="github-url"/i.test(html),
    isEngineer: /name="is-engineer"/i.test(html),
    emailForm: /data-name="email-form"/i.test(html),
    methodology: /METHODOLOGY 01|THE METHODOLOGY/i.test(html),
    bloatFaq: /HIRING MADE SIMPLE/i.test(html),
  };
  return { htmlScan, pageScan, extra, pass: htmlScan.formsOk && !extra.methodology };
}

async function tryCms(browser) {
  const { page } = await prepareWebflowDesigner(browser);
  await page.evaluate(() => {
    [...document.querySelectorAll('button,a,div')].find((b) =>
      /done editing|exit master|back to page/i.test(b.textContent || ''),
    )?.click();
  });
  await sleep(600);
  const clicked = await page.evaluate(() => {
    const cms = [...document.querySelectorAll('button,a,div,span')].find((b) =>
      /^CMS$/i.test((b.textContent || '').trim()),
    );
    cms?.click();
    return !!cms;
  });
  await sleep(2500);
  const has = await page.evaluate(() => /open pipelines/i.test(document.body?.innerText || ''));
  return { clicked, hasPipelines: has };
}

async function main() {
  wlog('=== FULL SHIP PASS START ===');
  await closeExtraTabs();
  const result = { at: new Date().toISOString(), steps: [] };

  result.before = await liveAudit();

  const browser = await connectBrowser();
  const { page, resize } = await prepareWebflowDesigner(browser, { url: WEBFLOW_DESIGNER_URL });
  result.resize = resize;

  const patch = await patchCanvas(page);
  result.canvasPatch = patch;
  if (patch.ok) {
    await savePublish(page);
    result.publishedCanvas = true;
    await sleep(8000);
  }

  const ai = await submitWebflowAiPrompt(AI_PROMPT);
  result.steps.push({ step: 'webflow-ai', ...ai });
  if (ai.ok) {
    const wait = await waitWebflowTurnComplete(420000, ai.beforeTail || '');
    result.steps.push({ step: 'webflow-ai-wait', ...wait });
    if (wait.ok) {
      const b2 = await connectBrowser();
      const { page: p2 } = await prepareWebflowDesigner(b2);
      await patchCanvas(p2);
      await savePublish(p2);
      result.publishedAi = true;
      await b2.disconnect();
      await sleep(12000);
    }
  }

  try {
    const b3 = await connectBrowser();
    result.cms = await tryCms(b3);
    await b3.disconnect();
  } catch (e) {
    result.cms = { error: String(e.message || e) };
  }

  await browser.disconnect().catch(() => {});

  const foot = spawnSync('npm', ['run', 'demigod:foot:cdn'], { cwd: ROOT, encoding: 'utf8' });
  const code = spawnSync('node', ['demigod-fix-custom-code.mjs'], { cwd: ROOT, encoding: 'utf8' });
  result.cdn = foot.status;
  result.customCode = code.status;
  await sleep(8000);

  result.screenshots = {};
  for (const label of ['full-ship-designer', 'full-ship-live']) {
    result.screenshots[label] = await captureDemigodScreenshots(label);
  }

  const cap = spawnSync('npm', ['run', 'demigod:capture:audit'], { cwd: ROOT, encoding: 'utf8', timeout: 180000 });
  result.captureAudit = cap.status;

  const formTest = spawnSync('node', ['demigod-form-submit-test.mjs'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  result.formTest = { exit: formTest.status, stdout: formTest.stdout?.slice(-1200) };

  const verify = spawnSync('npm', ['run', 'demigod:verify:all'], { cwd: ROOT, encoding: 'utf8' });
  result.verifyExit = verify.status;

  spawnSync('npm', ['run', 'demigod:cleanup:tabs'], { cwd: ROOT, encoding: 'utf8' });

  result.after = await liveAudit();
  result.pass = result.verifyExit === 0
    && result.after.htmlScan.formsOk
    && (result.after.extra.findTalentStatic || result.after.extra.hasNav || result.resize?.ok);

  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({
    ok: result.pass,
    before: result.before?.extra,
    after: result.after?.extra,
    resize: result.resize?.ok,
    patch: result.canvasPatch?.changes?.slice(0, 12),
    verify: result.verifyExit,
    out: OUT,
  }));
  wlog('=== FULL SHIP PASS END ===');
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
