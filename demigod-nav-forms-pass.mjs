#!/usr/bin/env node
/** Re-add Navigation component + fix both modal forms on Webflow canvas. */
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

const OUT = path.join(ROOT, 'DEMIGOD-NAV-FORMS.json');
const SPEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-COPY-SPEC.json'), 'utf8'));
const DESIGNER = 'https://talentlink-sf.design.webflow.com/?pageId=6a34c484dcedc18a174081b8';

const AI_PROMPT = `NAVIGATION + FORMS FIX — Demigod home page (talentlink-sf).

VIEWPORT: design mode at 1440px wide.

PART 1 — RE-ADD NAVIGATION (critical — page currently has NO nav):
1. If no Navigation component on canvas: Add Components → Navigation → place at top of page (above hero).
2. Double-click Navigation → Edit master component.
3. Slim nav: Logo "Demigod" + optional anchor links (How it Works, Pricing) + ONE primary button "${SPEC.navCta}" linking to #startup-modal.
4. Remove POST A JOB, HIRE TALENT duplicates, SOLUTIONS/ABOUT/BLOG dropdowns, GET STARTED clutter.
5. Save nav master → Update all instances.

PART 2 — STARTUP MODAL FORM (#startup-modal):
1. Select form inside startup modal. Form settings:
   - Form name: startup-hire (NOT email-form)
   - Send to: hello@trydemigod.com
   - Success: inline message, no redirect
2. Keep fields only: company-name, contact-email, role-title, stack-needs, salary-range (optional text).
3. DELETE orphan fields: team-size, urgency, hiring-model, Source, availability.
4. Labels: "Role title *", "Skills / requirements *", "Salary range (optional)"
5. Placeholders: role "e.g. Founding PM, Head of Growth"; skills "e.g. B2B SaaS, GTM, design systems"

PART 3 — CANDIDATE MODAL FORM (#jobseeker-modal):
1. Form settings: name engineer-join (NOT email-form), send to hello@trydemigod.com
2. Labels: "Skills & experience *", "Background & highlights *"
3. Placeholders: skills "e.g. Product strategy, Figma, growth marketing"; experience "e.g. Product lead at Series B startup"
4. Keep: full-name, seeker-email, linkedin-url (required), github-url (separate field), portfolio-url (optional), is-engineer checkbox (GitHub required only when checked), skills-stack (textarea), experience (textarea), sf-bay checkbox
5. DELETE availability field if present. Remove Tally embeds.

PART 4 — ORPHAN FORMS:
Delete any Email Form or Test Form blocks outside the two modals (page body or footer).

Publish production + staging. List every change made.`;

function patchFormsDoc(doc) {
  const changes = [];
  const startup = doc.querySelector('#startup-form, form[name="startup-form"], #startup-modal form');
  if (startup) {
    startup.id = 'startup-hire';
    startup.setAttribute('name', 'startup-hire');
    startup.setAttribute('data-name', 'startup-hire');
    changes.push('startup-hire');
    for (const n of ['team-size', 'urgency', 'hiring-model', 'Source', 'availability']) {
      const el = startup.querySelector(`[name="${n}"], #${n}`);
      if (el) {
        (el.closest('.w-input,.w-select,.w-radio,fieldset,div') || el).remove();
        changes.push(`rm:${n}`);
      }
    }
    const role = startup.querySelector('[name=role-title]');
    if (role) role.placeholder = 'e.g. Founding PM, Head of Growth, Designer';
    const stack = startup.querySelector('[name=stack-needs]');
    if (stack) stack.placeholder = 'e.g. B2B SaaS, GTM, design systems, React';
  }
  const cand = doc.querySelector('#jobseeker-form, form[name="jobseeker-form"], #jobseeker-modal form');
  if (cand) {
    cand.id = 'engineer-join';
    cand.setAttribute('name', 'engineer-join');
    cand.setAttribute('data-name', 'engineer-join');
    changes.push('engineer-join');
    const skills = cand.querySelector('[name=skills-stack]');
    if (skills) skills.placeholder = 'e.g. Product strategy, Figma, growth marketing';
    const exp = cand.querySelector('[name=experience]');
    if (exp) exp.placeholder = 'e.g. Product lead at Series B startup; 4 years as founding designer';
  }
  for (const a of [...doc.querySelectorAll('nav a,.w-nav a,a.button.on-inverse')]) {
    const lbl = a.querySelector('.button_label,.btn-label') || a;
    const t = (lbl.textContent || '').trim();
    if (/^(POST A JOB|HIRE TALENT|GET STARTED)$/i.test(t)) {
      lbl.textContent = SPEC.navCta;
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
    if (/Years Experience|What you have shipped/i.test(v)) {
      n.nodeValue = v.replace(/Years Experience\s*\*?|What you have shipped\s*\*?/gi, 'Background & highlights *');
      changes.push('exp-label');
    }
  }
  return [...new Set(changes)];
}

async function ensureDesigner(browser) {
  const { page } = await prepareWebflowDesigner(browser, { url: DESIGNER });
  return page;
}

async function patchCanvas(page) {
  return page.evaluate((spec) => {
    const patch = (doc) => {
      const changes = [];
      const startup = doc.querySelector('#startup-form, form[name="startup-form"], #startup-modal form');
      if (startup) {
        startup.id = 'startup-hire';
        startup.setAttribute('name', 'startup-hire');
        startup.setAttribute('data-name', 'startup-hire');
        changes.push('startup-hire');
        for (const name of ['team-size', 'urgency', 'hiring-model', 'Source', 'availability']) {
          const el = startup.querySelector(`[name="${name}"], #${name}`);
          if (el) {
            (el.closest('.w-input,.w-select,.w-radio,fieldset,div') || el).remove();
            changes.push(`rm:${name}`);
          }
        }
        const role = startup.querySelector('[name=role-title]');
        if (role) role.placeholder = 'e.g. Founding PM, Head of Growth, Designer';
        const stack = startup.querySelector('[name=stack-needs]');
        if (stack) stack.placeholder = 'e.g. B2B SaaS, GTM, design systems, React';
      }
      const cand = doc.querySelector('#jobseeker-form, form[name="jobseeker-form"], #jobseeker-modal form');
      if (cand) {
        cand.id = 'engineer-join';
        cand.setAttribute('name', 'engineer-join');
        cand.setAttribute('data-name', 'engineer-join');
        changes.push('engineer-join');
        const skills = cand.querySelector('[name=skills-stack]');
        if (skills) skills.placeholder = 'e.g. Product strategy, Figma, growth marketing';
        const exp = cand.querySelector('[name=experience]');
        if (exp) exp.placeholder = 'e.g. Product lead at Series B startup; 4 years as founding designer';
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
        const v = node.nodeValue || '';
        if (/Skills\s*&\s*Stack/i.test(v)) {
          node.nodeValue = v.replace(/Skills\s*&\s*Stack\s*\*?/gi, 'Skills & experience *');
          changes.push('skills-label');
        }
        if (/Stack Needs/i.test(v)) {
          node.nodeValue = v.replace(/Stack Needs\s*\*?/gi, 'Skills / requirements *');
          changes.push('stack-label');
        }
      }
      return changes;
    };
    for (const iframe of document.querySelectorAll('iframe')) {
      try {
        const doc = iframe.contentDocument;
        if (!doc || iframe.clientWidth < 500) continue;
        const c = patch(doc);
        if (c.length) return { ok: true, changes: [...new Set(c)] };
      } catch (_) { /* ignore */ }
    }
    return { ok: false, reason: 'no canvas iframe' };
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

async function liveAudit() {
  const { html } = await fetchLiveHtml(true);
  const hasNav = /<nav[^>]*class="[^"]*w-nav/i.test(html) || /class="[^"]*w-nav[^"]*"/i.test(html);
  const findTalent = /FIND TALENT/i.test(html);
  const startupHire = /name="startup-hire"|id="startup-hire"|data-name="startup-hire"/i.test(html);
  const engineerJoin = /name="engineer-join"|id="engineer-join"|data-name="engineer-join"/i.test(html);
  const emailForm = /data-name="email-form"/i.test(html);
  const skillsExp = /Skills & experience/i.test(html);
  const rolePh = /Founding PM|Head of Growth/i.test(html);
  return { hasNav, findTalent, startupHire, engineerJoin, emailForm, skillsExp, rolePh };
}

async function main() {
  wlog('=== NAV FORMS PASS START ===');
  await closeExtraTabs();
  const result = { at: new Date().toISOString(), steps: [] };

  const browser = await connectBrowser();
  const page = await ensureDesigner(browser);
  result.before = await liveAudit();

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

  const foot = spawnSync('npm', ['run', 'demigod:foot:cdn'], { cwd: ROOT, encoding: 'utf8' });
  const code = spawnSync('node', ['demigod-fix-custom-code.mjs'], { cwd: ROOT, encoding: 'utf8' });
  result.cdn = foot.status;
  result.customCode = code.status;
  await sleep(8000);

  result.after = await liveAudit();
  result.screenshots = await captureDemigodScreenshots('nav-forms');

  const formTest = spawnSync('node', ['demigod-form-submit-test.mjs'], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  result.formTest = { exit: formTest.status, stdout: formTest.stdout?.slice(-800) };

  const verify = spawnSync('npm', ['run', 'demigod:verify:all'], { cwd: ROOT, encoding: 'utf8' });
  result.verifyExit = verify.status;

  result.pass = verify.status === 0
    && (result.after.findTalent || result.after.hasNav || patch.ok)
    && result.after.skillsExp;

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
  wlog('=== NAV FORMS PASS END ===');
  process.exit(result.pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });