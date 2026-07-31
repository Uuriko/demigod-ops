#!/usr/bin/env node
/**
 * demigod-wiz-cdp-playtest.mjs
 * WIZ flow audit using CDP. Supports --local (intercepts foot script, injects disk demigod-foot-core.js for testing changes pre-publish).
 * Checks: steps advance, one visible input per real Q (file-or-link pair on talent resume), 90day present (startup only), review at submit.
 * Run: node demigod-wiz-cdp-playtest.mjs [--local] [--engineer] [--reduced-motion]
 *
 * Stops AT the review step — it never submits, so it creates no lead. Keep it that way:
 * a gate that submits would mint real fake leads in the prod SoR if it ever misfired.
 */
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import fs from 'fs';
import path from 'path';

const USE_LOCAL = process.argv.includes('--local');
const MOBILE = process.argv.includes('--mobile');
const REDUCED_MOTION = process.argv.includes('--reduced-motion');
// Engineer/talent is half the marketplace and had no coverage at all.
const FLOW = process.argv.includes('--engineer') ? 'engineer' : 'startup';
const MODAL = FLOW === 'engineer' ? '#jobseeker-modal' : '#startup-modal';
const CTA = FLOW === 'engineer' ? 'looking|join|profile|talent' : 'hire|hiring|start brief';
const OUT_DIR = `/tmp/audit-wiz-playtest${FLOW === 'engineer' ? '-engineer' : ''}`;
fs.mkdirSync(OUT_DIR, { recursive: true });
const CORE = fs.readFileSync('demigod-foot-core.js', 'utf8');
const HEAD_CSS = USE_LOCAL ? fs.readFileSync('demigod-head-styles.css', 'utf8') : '';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const browser = await puppeteer.connect({
    browserURL: CDP_URL,
    defaultViewport: null,
    protocolTimeout: 300000,
  });
  const page = await browser.newPage();
  if (MOBILE) await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  if (REDUCED_MOTION) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (USE_LOCAL) {
    // Live loaders may be catbox or jsDelivr foot-latest.js — match both.
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const u = req.url();
      const isHeadCss =
        /\/head-latest\.css(?:[?#]|$)/i.test(u) ||
        /files\.catbox\.moe\/[a-z0-9]+\.css(?:[?#]|$)/i.test(u);
      const isFoot =
        /foot-latest\.js(?:[?#]|$)/i.test(u) ||
        /demigod-foot/i.test(u) ||
        (/catbox/i.test(u) && /\.js(?:[?#]|$)/i.test(u));
      if (isHeadCss) {
        req.respond({ status: 200, contentType: 'text/css', body: HEAD_CSS }).catch(() => {});
      } else if (isFoot) {
        req.respond({ status: 200, contentType: 'application/javascript', body: CORE }).catch(() => {});
      } else {
        req.continue().catch(() => {});
      }
    });
  }

  await page.goto(`https://www.trydemigod.com/?wiz=${FLOW}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});
  if (USE_LOCAL) await wait(1200);

  // Ensure the WIZ is open (deep-link or CTA).
  await page.evaluate(
    (modal, cta) => {
      const open = document.querySelector(modal);
      if (open && getComputedStyle(open).display !== 'none') return;
      const re = new RegExp(cta, 'i');
      const btn = Array.from(document.querySelectorAll('button,a,[data-dg-cta]')).find((b) =>
        re.test(b.textContent || b.getAttribute('aria-label') || ''),
      );
      if (btn) btn.click();
      else if (typeof window.show === 'function') window.show(modal);
    },
    MODAL,
    CTA,
  );
  await wait(900);
  await page.screenshot({ path: path.join(OUT_DIR, '01-modal-open.png') });

  const steps = [];
  const requiredA11y = {};
  const log = (m) => console.log(m);

  const snapshot = async () =>
    page.evaluate((modalSel) => {
      const modal = document.querySelector(modalSel);
      if (!modal) return { q: 'no-modal', vis: 0, nextText: '', hasReview: false, has90: false, key: '' };
      const visible = (el) =>
        !!el && el.offsetParent !== null && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
      const q = modal.querySelector('.dg-wiz-q');
      const live = modal.querySelector('.dg-wiz-live');
      const next = modal.querySelector('.dg-wiz-next');
      const review = modal.querySelector('.dg-wiz-review');
      const ninety = modal.querySelector('[name="90day-outcome"], [id="90day-outcome"]');
      const vis = Array.from(modal.querySelectorAll('input,select,textarea')).filter(
        (el) => visible(el) && el.type !== 'checkbox' && el.type !== 'hidden',
      ).length;
      const qText = (q?.textContent || '').trim();
      return {
        q: qText.slice(0, 60),
        announcement: (live?.textContent || '').trim().slice(0, 60),
        // foot-core's own step key (form.dataset.dgWizKey) — authoritative.
        // Beats guessing "is this a real question?" from copy, which broke twice.
        key: (modal.querySelector('form')?.dataset?.dgWizKey || '').trim(),
        vis,
        nextText: (next?.textContent || '').trim().slice(0, 30),
        // .dg-wiz-review shell is often present/empty before the review step.
        hasReview:
          (visible(review) && (review.textContent || '').trim().length > 20) ||
          /ready to submit|review your|looks good/i.test(qText) ||
          /submit/i.test((next?.textContent || '').trim()),
        reviewText: (review?.innerText || '').trim(),
        has90: visible(ninety) || /90.?day|outcome this hire|first 90 days/i.test(qText),
      };
    }, MODAL);

  const fillAndNext = async () => {
    await page.evaluate((modalSel) => {
      const modal = document.querySelector(modalSel);
      if (!modal) return;
      const fields = Array.from(modal.querySelectorAll('input,select,textarea')).filter(
        (el) => el.offsetParent !== null && el.type !== 'checkbox' && el.type !== 'hidden' && el.type !== 'file',
      );
      fields.forEach((inp, idx) => {
        if (inp.tagName === 'SELECT') {
          inp.value = inp.options[1]?.value || inp.options[0]?.value || 'test';
        } else if (inp.type === 'email' || /email/i.test(inp.name || inp.id || inp.placeholder || '')) {
          inp.value = `founder${idx}@example.com`;
        } else if (inp.type === 'tel' || /phone/i.test(inp.name || '')) {
          inp.value = '+1 (415) 555-0100';
        } else if (inp.type === 'url' || /linkedin|url/i.test(inp.name || '')) {
          inp.value = 'https://example.com';
        } else {
          inp.value = `Test value ${idx + 1}`;
        }
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const next = modal.querySelector('.dg-wiz-next');
      if (next) next.click();
    }, MODAL);
    await wait(700);
  };

  const checkEmptyA11y = async (key) => {
    await page.evaluate((modalSel) => document.querySelector(`${modalSel} .dg-wiz-next`)?.click(), MODAL);
    await wait(250);
    return page.evaluate((modalSel, stepKey) => {
      const form = document.querySelector(`${modalSel} form`);
      const field = stepKey === 'resume'
        ? [form?.querySelector('[name="resume-url"]'), ...(form?.querySelectorAll('input[type="file"][name="resume"],input[type="file"][name="Resume"]') || [])].find((el) => el?.offsetParent !== null)
        : form?.querySelector(`[name="${stepKey}"],[id="${stepKey}"]`);
      const errorId = (field?.getAttribute('aria-describedby') || '').split(/\s+/).find((id) => id.startsWith('dg-wiz-req-err-'));
      const error = errorId && document.getElementById(errorId);
      return {
        stayed: form?.dataset.dgWizKey === stepKey,
        labelled: field?.getAttribute('aria-labelledby') === 'dg-wiz-question-engineer',
        required: field?.getAttribute('aria-required') === 'true',
        invalid: field?.getAttribute('aria-invalid') === 'true',
        focused: document.activeElement === field,
        announced: error?.getAttribute('role') === 'alert' && !!error.textContent.trim(),
      };
    }, MODAL, key);
  };

  // Welcome → fill through review (startup has ~7 real steps + review).
  for (let i = 0; i < 14; i++) {
    const st = await snapshot();
    steps.push(st);
    log(`Step ${i}: q="${st.q}" live="${st.announcement}" vis=${st.vis} next="${st.nextText}" review=${st.hasReview} 90=${st.has90}`);
    try {
      await Promise.race([
        page.screenshot({ path: path.join(OUT_DIR, `step-${String(i + 1).padStart(2, '0')}.png`) }),
        wait(4000),
      ]);
    } catch {
      /* screenshots are diagnostic only */
    }
    if (st.hasReview || /ready to submit|review|thanks/i.test(st.q) || /submit/i.test(st.nextText)) break;
    if (FLOW === 'engineer' && ['availability', 'salary-expectation', 'work-auth', 'resume'].includes(st.key) && !requiredA11y[st.key]) {
      requiredA11y[st.key] = await checkEmptyA11y(st.key);
    }
    await fillAndNext();
  }

  const final = steps[steps.length - 1] || (await snapshot());
  // Intro/review steps legitimately have no inputs. Prefer foot-core's own step key;
  // deciding this from copy false-failed twice ("Look good?" review, "I'm looking" intro).
  const NON_Q = ['welcome', '__submit__', '__thanks__'];
  const realQs = steps.filter((s) =>
    s.key
      ? !NON_Q.includes(s.key)
      : s.q && !s.hasReview && !/welcome|i'm (hiring|looking)|review|submit|thanks/i.test(s.q),
  );
  // `realQs.length === 0 ||` made this VACUOUSLY TRUE -- and it was redundant anyway, since
  // [].every() already returns true. A run that reached ZERO real questions tested nothing about
  // field visibility, yet reported visGood. Combined with need90 applying only to the startup flow,
  // that was a false green on the money path's ONLY automated gate: a WIZ that walked just
  // welcome -> __submit__ (both in NON_Q, so realQs = 0) PASSED on the engineer flow, and on
  // startup too if has90 landed on the review step. Verified by lifting this predicate verbatim.
  // Require at least one real question -- with none, the gate has not tested its own subject.
  // Checked against REAL runs first so this does not trade a false green for a false red:
  // startup walks 3 real Qs, engineer 3, all vis=1; both still pass.
  const visGood = realQs.length > 0 && realQs.every(
    (s) => s.vis === 1 || (FLOW === 'engineer' && s.key === 'resume' && s.vis === 2),
  );
  const announcementsGood = realQs.every((s) => s.announcement === s.q);
  const uniqueQs = new Set(steps.map((s) => s.q).filter(Boolean)).size;
  const has90 = steps.some((s) => s.has90) || final.has90;
  // Product gate: hit 90-day step and explicit review/submit, with fields filling.
  // uniqueQs can be 2 when CDP reuses a mid-flow modal — still count as advanced
  // when both product milestones land.
  const advanced = uniqueQs >= 2 || (has90 && final.hasReview);
  // 90day-outcome is a startup-brief step; the engineer flow has no equivalent.
  const need90 = FLOW === 'startup';
  const stepKeys = steps.map((step) => step.key).filter(Boolean);
  const engineerSequenceGood = FLOW !== 'engineer' || JSON.stringify(stepKeys) === JSON.stringify([
    'welcome', 'full-name', 'seeker-email', 'skills-stack', 'experience',
    'sf-bay', 'availability', 'salary-expectation', 'work-auth', 'resume', '__submit__',
  ]);
  const requiredA11yGood = FLOW !== 'engineer' || ['availability', 'salary-expectation', 'work-auth', 'resume'].every(
    (key) => requiredA11y[key] && Object.values(requiredA11y[key]).every(Boolean),
  );
  const engineerReviewGood = FLOW !== 'engineer' || (/When could you start/i.test(final.reviewText) && /base salary range/i.test(final.reviewText));
  const referralParked = await page.evaluate(() => {
    const source = document.querySelector('#dg-referral-form-source');
    if (!source) return { present: false };
    const style = getComputedStyle(source);
    return {
      present: true,
      hidden: source.hidden,
      ariaHidden: source.getAttribute('aria-hidden'),
      display: style.display,
      visibility: style.visibility,
      insideStartup: Boolean(source.closest('#startup-modal')),
    };
  });
  const referralParkedGood = !referralParked.present || (
    referralParked.insideStartup &&
    referralParked.display === 'none' &&
    referralParked.visibility === 'hidden'
  );
  const heroVisibleGood = await page.evaluate(() => {
    const hero = document.querySelector('.hero-section h1,.hero-title,.header h1');
    return Boolean(hero && getComputedStyle(hero).visibility === 'visible');
  });
  const heroTrustGood = await page.evaluate(
    () => document.querySelector('#dg-cta-trust')?.textContent.trim() ===
      '10% of first-year base salary on start · both sides approve · no spam lists',
  );
  const pass = Boolean(
    (final.hasReview || /review|submit|thanks/i.test(final.q || '')) &&
      advanced &&
      (need90 ? has90 : true) &&
      visGood &&
      announcementsGood &&
      engineerSequenceGood &&
      requiredA11yGood &&
      engineerReviewGood &&
      referralParkedGood &&
      heroVisibleGood &&
      heroTrustGood,
  );

  const report = {
    pass,
    advanced,
    visGood,
    announcementsGood,
    stepKeys,
    engineerSequenceGood,
    requiredA11y,
    requiredA11yGood,
    engineerReviewGood,
    referralParked,
    referralParkedGood,
    heroVisibleGood,
    heroTrustGood,
    has90,
    hasReview: final.hasReview,
    steps: steps.slice(-4),
    shots: steps.length,
    dir: OUT_DIR,
    flow: FLOW,
    local: USE_LOCAL,
    mobile: MOBILE,
    reducedMotion: REDUCED_MOTION,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  // Never block the process on CDP teardown (disconnect can hang under tab load).
  setTimeout(() => process.exit(pass ? 0 : 1), 50);
  try {
    await page.close();
  } catch {
    /* */
  }
  try {
    await browser.disconnect();
  } catch {
    /* */
  }
  process.exit(pass ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
