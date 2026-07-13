#!/usr/bin/env node
/** Smoke test live Webflow forms via CDP (single browser session). */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { LIVE_ORIGIN } from './demigod-live-lib.mjs';

const ROOT = '/home/potter';
const OUT = path.join(ROOT, 'DEMIGOD-FORM-SUBMIT-TEST.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 600000 });
  const page = await browser.newPage();
  const url = `${LIVE_ORIGIN}/?v=formtest-${Date.now()}`;
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(1500);

  /* open startup modal */
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('a,button')].find((el) => /^HIRE TALENT$/i.test((el.textContent || '').trim()))
      || [...document.querySelectorAll('a,button')].find((el) => /^FIND TALENT$/i.test((el.textContent || '').trim()));
    btn?.click();
  });
  await sleep(1200);

  /* patch duplicate email-form data-name until Designer saves unique IDs */
  await page.evaluate(() => {
    const patch = (sel, name) => {
      const f = document.querySelector(sel);
      if (f && f.getAttribute('data-name') === 'email-form') {
        f.setAttribute('name', name);
        f.setAttribute('data-name', name);
        f.id = name;
      }
    };
    patch('#startup-form', 'startup-hire');
    patch('#jobseeker-form', 'engineer-join');
  });

  const startup = await page.evaluate(() => {
    const form = document.querySelector('#startup-hire, #startup-form, #startup-modal form');
    const tally = document.querySelector('#tally-startup-embed iframe[src*="tally"]');
    if (tally) return { mode: 'tally', src: tally.src.slice(0, 80) };
    if (!form) return { mode: 'none' };
    const turnstile = form.querySelector('[name="cf-turnstile-response"]');
    const fields = {};
    for (const inp of form.querySelectorAll('input,textarea,select')) {
      const key = inp.name || inp.id || inp.type;
      if (inp.type === 'radio') {
        if (!fields[key]) fields[key] = 'radio';
        continue;
      }
      if (inp.type === 'hidden') continue;
      fields[key] = inp.type;
    }
    return {
      mode: 'webflow',
      formName: form.getAttribute('name'),
      dataName: form.getAttribute('data-name'),
      turnstile: !!turnstile,
      turnstileReady: !!(turnstile && turnstile.value),
      fields: Object.keys(fields),
    };
  });

  let submitResult = { skipped: true };
  if (startup.mode === 'webflow' && startup.turnstile && !startup.turnstileReady) {
    submitResult = {
      skipped: true,
      reason: 'turnstile-required',
      note: 'Cloudflare Turnstile blocks headless submit — manual incognito test required',
    };
  } else if (startup.mode === 'webflow') {
    submitResult = await page.evaluate(() => {
      const form = document.querySelector('#startup-hire, #startup-form, #startup-modal form');
      if (!form) return { ok: false, reason: 'no form' };
      const set = (sel, val) => {
        const el = form.querySelector(sel);
        if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); return true; }
        return false;
      };
      set('input[type="email"]', 'formtest+startup@trydemigod.com');
      set('input[placeholder*="Nexus"], input[placeholder*="company"]', 'Form Test Co');
      set('input[placeholder*="Engineer"], input[placeholder*="Role"]', 'Test ML Engineer');
      set('textarea', 'Python, PyTorch');
      set('#team-size', '5-15');
      set('#urgency', 'This month');
      const radio = form.querySelector('input[type="radio"]');
      if (radio) radio.click();
      const btn = form.querySelector('input[type="submit"], button[type="submit"]');
      if (!btn) return { ok: false, reason: 'no submit' };
      btn.click();
      return { ok: true, clicked: true };
    });
    await sleep(4000);
    const after = await page.evaluate(() => {
      const done = document.querySelector('#startup-modal .w-form-done');
      const fail = document.querySelector('#startup-modal .w-form-fail');
      const custom = document.querySelector('#form-success-startup:not([hidden])');
      return {
        doneVisible: done && getComputedStyle(done).display !== 'none',
        failVisible: fail && getComputedStyle(fail).display !== 'none',
        customSuccess: !!custom,
        failText: fail?.textContent?.trim().slice(0, 120),
      };
    });
    submitResult.after = after;
    submitResult.pass = after.customSuccess || after.doneVisible;
  }

  await page.close();
  await browser.disconnect();

  const out = {
    at: new Date().toISOString(),
    url,
    startup,
    submitResult,
    pass: startup.mode === 'tally' ? null : submitResult.skipped ? null : !!submitResult.pass,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.pass === false ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });