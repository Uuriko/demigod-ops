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

async function run() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null, protocolTimeout: 300000 });
  const page = await browser.newPage();
  if (USE_LOCAL) {
    // Intercept and serve local core for true disk test (no publish needed)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const u = req.url();
      if (u.includes('demigod-foot') || u.includes('catbox') && u.endsWith('.js')) {
        req.respond({ status: 200, contentType: 'application/javascript', body: CORE });
      } else {
        req.continue();
      }
    });
  }
  await page.goto('https://www.trydemigod.com', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('body', {timeout: 10000}).catch(() => {});
  if (USE_LOCAL) await page.waitForTimeout(1200); // allow intercept + inject for --local

  const shots = [];
  const log = (m) => { console.log(m); };
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // Open startup modal
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button,a,.premium-btn')).find(b => /HIRE TALENT/i.test(b.textContent || ''));
    if (btn) btn.click();
  });
  await wait(800);
  await page.screenshot({ path: path.join(OUT_DIR, '01-modal-open.png') });
  shots.push('01-modal-open');

  // Step through a few (simulate next + fill)
  const steps = [];
  for (let i = 0; i < 5; i++) {
    const state = await page.evaluate(() => {
      const q = document.querySelector('.dg-wiz-q, h3, .question, label');
      const vis = Array.from(document.querySelectorAll('input,select,textarea')).filter(el => el.offsetParent !== null).length;
      const next = document.querySelector('.dg-wiz-next, button');
      return { q: q ? q.textContent.trim().slice(0,60) : 'noq', visibleInputs: vis, hasNext: !!next };
    });
    steps.push(state);
    log(`Step ${i}: q="${state.q}" vis=${state.visibleInputs}`);

    // Fill if input
    await page.evaluate(() => {
      const inp = document.querySelector('input:not([type=hidden]), textarea, select');
      if (inp) {
        if (inp.tagName === 'SELECT') inp.value = inp.options[1]?.value || 'test';
        else inp.value = 'Test Value ' + Date.now();
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Click next or Enter
    await page.evaluate(() => {
      const n = document.querySelector('.dg-wiz-next');
      if (n) n.click();
      else document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await wait(600);
    await page.screenshot({ path: path.join(OUT_DIR, `step-${i+2}.png`) });
    shots.push(`step-${i+2}`);
  }

  // Advance more steps (fill current field first to pass required), until review/submit/90day, validate per Fable
  let advances = 0;
  while (advances < 12) {
    const currentQ = await page.evaluate(() => {
      const q = document.querySelector('.dg-wiz-q');
      return (q ? q.textContent.trim().slice(0,60) : '').toLowerCase();
    });
    if (/submit|review|ready to submit|__submit__/.test(currentQ)) break;
    // Fill ALL currently visible inputs (ensures current step's required field like role-title/stack/90day is populated for validation)
    await page.evaluate(() => {
      const inps = document.querySelectorAll('input:not([type=hidden]), textarea, select');
      inps.forEach((inp, idx) => {
        if (inp.offsetParent === null) return;
        if (inp.tagName === 'SELECT') inp.value = inp.options[1]?.value || 'test-value';
        else inp.value = 'Test Value ' + (Date.now() + idx);
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    await page.evaluate(() => {
      const n = document.querySelector('.dg-wiz-next');
      if (n) n.click();
      else document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await wait(550);
    advances++;
    const st = await page.evaluate(() => {
      const q = document.querySelector('.dg-wiz-q, h3, label');
      const vis = Array.from(document.querySelectorAll('input,select,textarea')).filter(el => el.offsetParent !== null).length;
      const hasReview = !!document.querySelector('.dg-wiz-review');
      const subBtn = document.querySelector('.dg-wiz-next');
      const has90 = !!document.querySelector('[name="90day-outcome"]') || !!document.getElementById('90day-outcome');
      const is90Step = /90day|outcome this hire/i.test((q && q.textContent) || '');
      return { q: q ? q.textContent.trim().slice(0,50) : '', vis, hasReview, subText: (subBtn && subBtn.textContent || '').slice(0,20), has90, is90Step };
    });
    steps.push(st);
    log(`Advance ${advances}: q="${st.q}" vis=${st.vis} review=${st.hasReview} 90day=${st.has90}`);
    if (st.has90 || st.is90Step) {
      log('  -> 90day field/step detected');
    }
    if (st.hasReview) break;
  }
  const final = await page.evaluate(() => {
    const thanks = document.querySelector('.dg-thanks, .w-form-done, [class*="success"]');
    const review = document.querySelector('.dg-wiz-review');
    const sub = document.querySelector('.dg-wiz-next');
    return { hasThanks: !!thanks, hasReview: !!review, subText: (sub && sub.textContent || '').trim().slice(0,30) };
  });
  log('Final:', final);
  const visGood = steps.filter(s => !/welcome|submit|thanks/i.test(s.q||'')).every(s => (s.vis||0) >= 1);
  const has90 = steps.some(s => /90day|outcome/i.test(s.q||'')) || await page.evaluate(()=>!!document.querySelector('[name="90day-outcome"]'));
  console.log(JSON.stringify({ pass: (final.hasReview || final.hasThanks) && visGood && has90 , steps: steps.slice(-3), visGood, has90, shots: shots.length, dir: OUT_DIR }, null, 2));

  try { await page.close(); } catch(e){}
  await browser.disconnect();
}

run().catch(console.error);
/* Fable a11y addition */
function checkA11y(f) {
  return [...f.querySelectorAll('.dg-wiz-show input, .dg-wiz-show textarea, .dg-wiz-show select')].map(i => ({
    name: i.name,
    required: i.required,
    hasLabel: !!(i.id && f.querySelector(`label[for="${i.id}"]`)) || !!i.closest('label'),
    rendered: getComputedStyle(i).display !== 'none' && getComputedStyle(i).visibility !== 'hidden' && i.offsetHeight > 0,
  }));
}
