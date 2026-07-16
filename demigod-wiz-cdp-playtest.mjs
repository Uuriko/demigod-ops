#!/usr/bin/env node
/**
 * demigod-wiz-cdp-playtest.mjs
 * WIZ flow audit using CDP. Supports --local (intercepts foot script, injects disk demigod-foot-core.js for testing changes pre-publish).
 * Checks: steps advance, visibleInputs >=1 per real Q, 90day present, review at submit, reach thanks.
 * Run: node demigod-wiz-cdp-playtest.mjs [--local]
 */
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import fs from 'fs';
import path from 'path';

const OUT_DIR = '/tmp/audit-wiz-playtest';
fs.mkdirSync(OUT_DIR, { recursive: true });
const USE_LOCAL = process.argv.includes('--local');
const CORE = fs.readFileSync('demigod-foot-core.js', 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const browser = await puppeteer.connect({
    browserURL: CDP_URL,
    defaultViewport: null,
    protocolTimeout: 300000,
  });
  const page = await browser.newPage();
  if (USE_LOCAL) {
    // Live loaders may be catbox or jsDelivr foot-latest.js — match both.
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const u = req.url();
      const isFoot =
        /foot-latest\.js(?:[?#]|$)/i.test(u) ||
        /demigod-foot/i.test(u) ||
        (/catbox/i.test(u) && /\.js(?:[?#]|$)/i.test(u));
      if (isFoot) {
        req.respond({ status: 200, contentType: 'application/javascript', body: CORE }).catch(() => {});
      } else {
        req.continue().catch(() => {});
      }
    });
  }

  await page.goto('https://www.trydemigod.com/?wiz=startup', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});
  if (USE_LOCAL) await wait(1200);

  // Ensure startup WIZ is open (deep-link or CTA).
  await page.evaluate(() => {
    const open = document.querySelector('#startup-modal');
    if (open && getComputedStyle(open).display !== 'none') return;
    const btn = Array.from(document.querySelectorAll('button,a,[data-dg-cta]')).find((b) =>
      /hire|hiring|start brief/i.test(b.textContent || b.getAttribute('aria-label') || ''),
    );
    if (btn) btn.click();
    else if (typeof window.show === 'function') window.show('#startup-modal');
  });
  await wait(900);
  await page.screenshot({ path: path.join(OUT_DIR, '01-modal-open.png') });

  const steps = [];
  const log = (m) => console.log(m);

  const snapshot = async () =>
    page.evaluate(() => {
      const modal = document.querySelector('#startup-modal');
      if (!modal) return { q: 'no-modal', vis: 0, nextText: '', hasReview: false, has90: false };
      const visible = (el) =>
        !!el && el.offsetParent !== null && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
      const q = modal.querySelector('.dg-wiz-q');
      const next = modal.querySelector('.dg-wiz-next');
      const review = modal.querySelector('.dg-wiz-review');
      const ninety = modal.querySelector('[name="90day-outcome"], [id="90day-outcome"]');
      const vis = Array.from(modal.querySelectorAll('input,select,textarea')).filter(
        (el) => visible(el) && el.type !== 'checkbox' && el.type !== 'hidden',
      ).length;
      const qText = (q?.textContent || '').trim();
      return {
        q: qText.slice(0, 60),
        vis,
        nextText: (next?.textContent || '').trim().slice(0, 30),
        // .dg-wiz-review shell is often present/empty before the review step.
        hasReview:
          (visible(review) && (review.textContent || '').trim().length > 20) ||
          /ready to submit|review your|looks good/i.test(qText) ||
          /submit/i.test((next?.textContent || '').trim()),
        has90: visible(ninety) || /90.?day|outcome this hire|first 90 days/i.test(qText),
      };
    });

  const fillAndNext = async () => {
    await page.evaluate(() => {
      const modal = document.querySelector('#startup-modal');
      if (!modal) return;
      const fields = Array.from(modal.querySelectorAll('input,select,textarea')).filter(
        (el) => el.offsetParent !== null && el.type !== 'checkbox' && el.type !== 'hidden',
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
    });
    await wait(700);
  };

  // Welcome → fill through review (startup has ~7 real steps + review).
  for (let i = 0; i < 14; i++) {
    const st = await snapshot();
    steps.push(st);
    log(`Step ${i}: q="${st.q}" vis=${st.vis} next="${st.nextText}" review=${st.hasReview} 90=${st.has90}`);
    try {
      await Promise.race([
        page.screenshot({ path: path.join(OUT_DIR, `step-${String(i + 1).padStart(2, '0')}.png`) }),
        wait(4000),
      ]);
    } catch {
      /* screenshots are diagnostic only */
    }
    if (st.hasReview || /ready to submit|review|thanks/i.test(st.q) || /submit/i.test(st.nextText)) break;
    await fillAndNext();
  }

  const final = steps[steps.length - 1] || (await snapshot());
  const realQs = steps.filter((s) => s.q && !/welcome|i'm hiring|review|submit|thanks/i.test(s.q));
  const visGood = realQs.length === 0 || realQs.every((s) => (s.vis || 0) >= 1);
  const uniqueQs = new Set(steps.map((s) => s.q).filter(Boolean)).size;
  const has90 = steps.some((s) => s.has90) || final.has90;
  // Product gate: hit 90-day step and explicit review/submit, with fields filling.
  // uniqueQs can be 2 when CDP reuses a mid-flow modal — still count as advanced
  // when both product milestones land.
  const advanced = uniqueQs >= 2 || (has90 && final.hasReview);
  const pass = Boolean((final.hasReview || /review|submit|thanks/i.test(final.q || '')) && advanced && has90 && visGood);

  const report = {
    pass,
    advanced,
    visGood,
    has90,
    hasReview: final.hasReview,
    steps: steps.slice(-4),
    shots: steps.length,
    dir: OUT_DIR,
    local: USE_LOCAL,
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
