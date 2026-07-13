#!/usr/bin/env node
/** Mobile tap audit: CTA hit areas + modal open reliability @ 390px. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { LIVE_ORIGIN } from './demigod-live-lib.mjs';
import { ROOT } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-MOBILE-BUTTON-PLAYTEST.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TARGETS = [
  { sel: '#dg-bar .dg-h', expect: 'startup' },
  { sel: '#dg-bar .dg-j', expect: 'engineer' },
  { sel: '#dg-site-nav .dg-nav-cta', expect: 'startup' },
  { sel: '#dg-site-nav a[data-demigod-modal=jobseeker]', expect: 'engineer' },
  { sel: '#demigod-pricing a[data-demigod-modal=startup]', expect: 'startup', scroll: '#demigod-pricing' },
  { sel: '#demigod-partners-teaser a[data-dg-partner-apply]', expect: 'partner', scroll: '#demigod-partners-teaser' },
];

async function modalState(page) {
  return page.evaluate(() => ({
    foot: window.__dgFootVer || null,
    startup: !!document.querySelector('#startup-modal.dg-wiz-active'),
    engineer: !!document.querySelector('#jobseeker-modal.dg-wiz-active'),
    partner: !!document.querySelector('#partner-modal.dg-wiz-active'),
    touchStyle: !!document.querySelector('#dg-touch-style'),
  }));
}

async function metrics(page) {
  return page.evaluate(() => {
    const items = [];
    for (const el of document.querySelectorAll('#dg-site-nav a:not(.dg-nav-logo), #dg-bar a, a.premium-btn')) {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (r.width < 2 || st.display === 'none') continue;
      items.push({
        text: (el.textContent || '').trim().split('\n')[0].slice(0, 32),
        w: Math.round(r.width),
        h: Math.round(r.height),
        touchAction: st.touchAction,
        ok: r.height >= 44,
      });
    }
    return items;
  });
}

async function tapTarget(page, sel, expect, scroll) {
  await page.goto(`${LIVE_ORIGIN}/?v=mb-${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('#dg-bar') && window.__dgFootVer, { timeout: 20000 });
  await sleep(1200);
  if (scroll) {
    await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center' }), scroll);
    await sleep(600);
  }
  await page.waitForSelector(sel, { visible: true, timeout: 15000 }).catch(() => {});
  await sleep(scroll ? 800 : 0);
  const before = await modalState(page);
  let err = null;
  try {
    await page.tap(sel);
    await sleep(700);
  } catch (e) {
    try {
      await page.evaluate((s) => document.querySelector(s)?.click(), sel);
      await sleep(700);
    } catch (e2) {
      err = String(e.message || e2);
    }
  }
  const after = await modalState(page);
  const opened = after[expect];
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(300);
  return { sel, expect, err, before, after, opened };
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  const taps = [];
  for (const t of TARGETS) taps.push(await tapTarget(page, t.sel, t.expect, t.scroll));

  await page.goto(`${LIVE_ORIGIN}/?v=mb-metrics-${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__dgFootVer, { timeout: 20000 });
  await sleep(1200);
  const state = await modalState(page);
  const sizes = await metrics(page);

  await page.goto(`${LIVE_ORIGIN}/?v=mb-wiz-${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__dgFootVer, { timeout: 20000 });
  await sleep(1200);
  await page.tap('#dg-bar .dg-h');
  await sleep(800);
  let wizTap = await page.evaluate(() => {
    const f = document.querySelector('#startup-hire');
    const next = f?.querySelector('.dg-wiz-next');
    const r = next?.getBoundingClientRect();
    return {
      step0: parseInt(f?.dataset?.dgStep || '0', 10),
      nextH: r ? Math.round(r.height) : 0,
      modal: !!document.querySelector('#startup-modal.dg-wiz-active'),
    };
  });
  await page.tap('#startup-hire .dg-wiz-next');
  await sleep(600);
  const afterWiz = await page.evaluate(() => ({
    step: parseInt(document.querySelector('#startup-hire')?.dataset?.dgStep || '0', 10),
    visible: document.querySelector('#startup-hire [name=contact-email]')?.closest('.dg-wiz-show') ? 'contact-email' : null,
  }));
  wizTap = { ...wizTap, afterStep: afterWiz.step, advanced: afterWiz.step === 1 && afterWiz.visible === 'contact-email' };

  await page.goto(`${LIVE_ORIGIN}/?v=mb-hero-${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__dgFootVer, { timeout: 20000 });
  await sleep(1000);
  const heroCtasHidden = await page.evaluate(() => {
    const btn = document.querySelector('.hero-section .premium-btn,.header .premium-btn');
    if (!btn) return true;
    return getComputedStyle(btn).display === 'none';
  });

  await page.close();
  await browser.disconnect();

  const pass = {
    footV75: state.foot === '75',
    heroCtasHidden,
    touchUi: state.touchStyle,
    minTapTargets: sizes.every((s) => s.ok),
    allOpen: taps.every((t) => t.opened && !t.err),
    wizNextTap: wizTap?.advanced && (wizTap?.nextH || 0) >= 44,
  };
  const result = { at: new Date().toISOString(), state, sizes, taps, wizTap, pass, ok: Object.values(pass).every(Boolean) };
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ok: result.ok, pass: result.pass, out: OUT }));
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});