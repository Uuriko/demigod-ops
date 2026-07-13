#!/usr/bin/env node
/** Full mobile audit @ 390×844 — layout, taps, routes, wizard, copy, design. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { LIVE_ORIGIN } from './demigod-live-lib.mjs';
import { ROOT } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-MOBILE-AUDIT.json');
const SHOTS = path.join(ROOT, 'audit-shots', 'mobile-audit');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const COPY_LEAK = /meet your 3-5|within 24 hours|48\s*h|syndicate subscription|\$5\s*k|curated insights|methodology/i;
const MIN_TAP = 44;
const MIN_INPUT = 16;

const ROUTES = [
  { id: 'home', url: '/', scroll: 0 },
  { id: 'trust', url: '/', target: '#demigod-trust-block' },
  { id: 'pricing', url: '/#demigod-pricing', target: '#demigod-pricing' },
  { id: 'partners-teaser', url: '/', target: '#demigod-partners-teaser' },
  { id: 'partners-page', url: '/#partnerships', waitClass: 'dg-partners-page', target: '#demigod-partnerships-wrap' },
  { id: 'privacy', url: '/#privacy', waitClass: 'dg-legal-page', target: '#demigod-legal-privacy' },
];

async function load(page, suffix = '') {
  await page.goto(`${LIVE_ORIGIN}/?v=mb-audit-${suffix}-${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__dgFootVer && document.querySelector('#dg-bar'), { timeout: 25000 });
  await sleep(1600);
}

async function settle(page, route) {
  await page.evaluate(({ target, waitClass }) => {
    if (waitClass === 'dg-legal-page') {
      location.hash = 'privacy';
      document.body.classList.add('dg-legal-page');
      const w = document.querySelector('#demigod-legal-wrap');
      if (w) w.style.display = 'block';
    }
    if (waitClass === 'dg-partners-page') {
      location.hash = 'partnerships';
      document.body.classList.add('dg-partners-page');
      const w = document.querySelector('#demigod-partnerships-wrap');
      if (w) w.style.display = 'block';
    }
    if (target) {
      const el = document.querySelector(target);
      if (el) {
        const y = Math.max(0, (el.offsetTop || 0) - 72);
        window.scrollTo({ top: y, left: 0, behavior: 'instant' });
      }
    }
  }, route);
  await sleep(route.waitClass ? 1200 : 700);
}

async function layoutScan(page) {
  return page.evaluate(({ minTap, minInput }) => {
    const vw = document.documentElement.clientWidth;
    const issues = [];
    const overflowX = document.documentElement.scrollWidth > vw + 2;
    if (overflowX) issues.push({ severity: 'high', code: 'horizontal_overflow', detail: `${document.documentElement.scrollWidth}px > ${vw}px` });

    const wide = [];
    document.querySelectorAll('section,main>div,img,table,.modal-container,form').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > vw + 8 && r.height > 8) wide.push({ tag: el.tagName, id: el.id || '', w: Math.round(r.width) });
    });
    if (wide.length) issues.push({ severity: 'medium', code: 'wide_blocks', count: wide.length, sample: wide.slice(0, 5) });

    const smallTaps = [];
    document.querySelectorAll('#dg-site-nav a:not(.dg-nav-logo), #dg-bar a, a.premium-btn, a.button, button.w-button, #demigod-partners-teaser a, #dg-footer-legal a').forEach((el) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (r.width < 2 || st.display === 'none') return;
      if (r.height < minTap) smallTaps.push({ text: (el.textContent || '').trim().split('\n')[0].slice(0, 28), h: Math.round(r.height), w: Math.round(r.width) });
    });
    if (smallTaps.length) issues.push({ severity: 'high', code: 'small_tap_targets', items: smallTaps });

    const smallInputs = [];
    document.querySelectorAll('input,textarea,select').forEach((el) => {
      if (el.type === 'hidden' || el.classList.contains('dg-file-hidden') || el.closest('[hidden]')) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const fs = parseFloat(getComputedStyle(el).fontSize) || 0;
      if (fs > 0 && fs < minInput) smallInputs.push({ name: el.name || el.id, fs });
    });
    if (smallInputs.length) issues.push({ severity: 'medium', code: 'ios_zoom_inputs', items: smallInputs.slice(0, 8) });

    const bar = document.querySelector('#dg-bar');
    const nav = document.querySelector('#dg-site-nav');
    const barRect = bar?.getBoundingClientRect();
    const navRect = nav?.getBoundingClientRect();
    const bodyPb = parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
    if (bar && barRect && bodyPb < barRect.height * 0.6) {
      issues.push({ severity: 'medium', code: 'body_bottom_padding', bodyPb, barH: Math.round(barRect.height) });
    }

    const hero = document.querySelector('.hero-section h1,.header h1');
    const heroFs = hero ? parseFloat(getComputedStyle(hero).fontSize) : 0;
    if (heroFs && heroFs < 22) issues.push({ severity: 'low', code: 'hero_small', heroFs });

    const heroBtn = document.querySelector('.hero-section .premium-btn,.header .premium-btn');
    const heroCtasHidden = !heroBtn || getComputedStyle(heroBtn).display === 'none';
    return {
      foot: window.__dgFootVer,
      vw,
      heroCtasHidden,
      overflowX,
      barVisible: bar && getComputedStyle(bar).display !== 'none',
      navH: navRect ? Math.round(navRect.height) : 0,
      barH: barRect ? Math.round(barRect.height) : 0,
      bodyPb: Math.round(bodyPb),
      touchStyle: !!document.querySelector('#dg-touch-style'),
      issues,
    };
  }, { minTap: MIN_TAP, minInput: MIN_INPUT });
}

async function copyScan(page) {
  return page.evaluate((reSrc) => {
    const re = new RegExp(reSrc, 'i');
    const hits = [];
    document.querySelectorAll('h1,h2,h3,p,span,li,button,a,label').forEach((el) => {
      if (el.closest('script,style')) return;
      const t = (el.textContent || '').trim();
      if (!t || t.length > 200) return;
      if (re.test(t) && getComputedStyle(el).display !== 'none' && el.offsetHeight > 0) {
        hits.push({ text: t.slice(0, 80), tag: el.tagName, id: el.id || '' });
      }
    });
    return hits.slice(0, 20);
  }, COPY_LEAK.source);
}

async function wizardAudit(page) {
  await page.tap('#dg-bar .dg-h');
  await sleep(900);
  const welcome = await page.evaluate(() => {
    const f = document.querySelector('#startup-hire');
    const shell = f?.querySelector('.dg-wiz-shell');
    const nav = shell?.querySelector('.dg-wiz-nav');
    const wel = shell?.querySelector('.dg-wiz-welcome');
    const nr = nav?.getBoundingClientRect();
    const wr = wel?.getBoundingClientRect();
    const vh = window.innerHeight;
    return {
      step: parseInt(f?.dataset?.dgStep || '0', 10),
      modal: !!document.querySelector('#startup-modal.dg-wiz-active'),
      welcomeVisible: wel && !wel.hidden,
      navBottom: nr ? Math.round(vh - nr.bottom) : null,
      navH: nr ? Math.round(nr.height) : 0,
      welcomeH: wr ? Math.round(wr.height) : 0,
      nextH: shell?.querySelector('.dg-wiz-next')?.getBoundingClientRect().height || 0,
    };
  });
  await page.tap('#startup-hire .dg-wiz-next');
  await sleep(500);
  const step1 = await page.evaluate(() => {
    const inp = document.querySelector('#startup-hire [name=contact-email]');
    const r = inp?.getBoundingClientRect();
    const fs = inp ? parseFloat(getComputedStyle(inp).fontSize) : 0;
    const nav = document.querySelector('#startup-hire .dg-wiz-nav');
    const nr = nav?.getBoundingClientRect();
    const vh = window.innerHeight;
    const covered = nr && r ? r.bottom > nr.top - 4 : false;
    return { step: parseInt(document.querySelector('#startup-hire')?.dataset?.dgStep || '0', 10), inputFs: fs, inputCoveredByNav: covered, navTop: nr ? Math.round(nr.top) : null, vh };
  });

  await page.keyboard.press('Escape').catch(() => {});
  await sleep(400);

  await page.tap('#dg-bar .dg-j');
  await sleep(900);
  const eng = await page.evaluate(() => {
    const cards = document.querySelector('#engineer-join .dg-wiz-cards');
    const cr = cards?.getBoundingClientRect();
    const cols = cards ? getComputedStyle(cards).gridTemplateColumns.split(' ').length : 0;
    return { modal: !!document.querySelector('#jobseeker-modal.dg-wiz-active'), cardCols: cols, cardW: cr ? Math.round(cr.width) : 0 };
  });
  await page.keyboard.press('Escape').catch(() => {});

  const issues = [];
  if (!welcome.modal) issues.push({ severity: 'high', code: 'startup_modal_no_open' });
  if (welcome.nextH < MIN_TAP) issues.push({ severity: 'high', code: 'wiz_next_small', h: welcome.nextH });
  if (step1.inputCoveredByNav) issues.push({ severity: 'high', code: 'input_hidden_by_wiz_nav' });
  if (step1.inputFs < MIN_INPUT) issues.push({ severity: 'medium', code: 'wiz_input_font_small', fs: step1.inputFs });
  if (eng.cardCols > 1 && eng.cardW < 360) issues.push({ severity: 'low', code: 'engineer_cards_two_col_cramped' });

  return { welcome, step1, eng, issues };
}

async function tapRouteCTAs(page) {
  const tests = [
    { sel: '#dg-bar .dg-h', expect: 'startup' },
    { sel: '#dg-site-nav .dg-nav-cta', expect: 'startup' },
    { sel: '#demigod-pricing a[data-demigod-modal=startup]', expect: 'startup', scroll: '#demigod-pricing' },
    { sel: '#demigod-partners-teaser a[data-dg-partner-apply]', expect: 'partner', scroll: '#demigod-partners-teaser' },
  ];
  const results = [];
  for (const t of tests) {
    await load(page, t.expect);
    if (t.scroll) {
      await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center' }), t.scroll);
      await sleep(600);
    }
    await page.waitForSelector(t.sel, { visible: true, timeout: 15000 }).catch(() => {});
    await sleep(t.scroll ? 800 : 0);
    let err = null;
    try {
      await page.tap(t.sel);
      await sleep(700);
    } catch (e) {
      try {
        await page.evaluate((s) => document.querySelector(s)?.click(), t.sel);
        await sleep(700);
      } catch (e2) {
        err = String(e.message || e2).slice(0, 120);
      }
    }
    const after = await page.evaluate((expect) => ({
      startup: !!document.querySelector('#startup-modal.dg-wiz-active'),
      engineer: !!document.querySelector('#jobseeker-modal.dg-wiz-active'),
      partner: !!document.querySelector('#partner-modal.dg-wiz-active'),
    }), t.expect);
    results.push({ ...t, err, opened: after[t.expect], after });
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(300);
  }
  return results;
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  const report = { at: new Date().toISOString(), viewport: { w: 390, h: 844 }, routes: {}, taps: [], wizard: null, global: null, issues: [], shots: {} };

  await load(page, 'home');
  report.global = await layoutScan(page);
  report.copyLeaks = await copyScan(page);
  if (report.copyLeaks.length) {
    report.issues.push({ severity: 'medium', code: 'copy_leaks', count: report.copyLeaks.length, sample: report.copyLeaks.slice(0, 5) });
  }
  report.shots.home = path.join(SHOTS, `home-${stamp()}.png`);
  await page.screenshot({ path: report.shots.home, fullPage: false });

  for (const route of ROUTES) {
    await load(page, route.id);
    await settle(page, route);
    const layout = await layoutScan(page);
    const leaks = await copyScan(page);
    const shot = path.join(SHOTS, `${route.id}-${stamp()}.png`);
    await page.screenshot({ path: shot, fullPage: route.id === 'home' });
    report.routes[route.id] = { layout, copyLeaks: leaks.length, shot, issues: layout.issues };
    for (const i of layout.issues) report.issues.push({ ...i, route: route.id });
    if (leaks.length) report.issues.push({ severity: 'medium', code: 'copy_leaks', route: route.id, count: leaks.length });
  }

  report.taps = await tapRouteCTAs(page);
  for (const t of report.taps) {
    if (!t.opened || t.err) report.issues.push({ severity: 'high', code: 'cta_tap_fail', sel: t.sel, err: t.err, opened: t.opened });
  }

  await load(page, 'wizard');
  report.wizard = await wizardAudit(page);
  report.issues.push(...report.wizard.issues);

  await page.close();
  await browser.disconnect();

  const high = report.issues.filter((i) => i.severity === 'high');
  const med = report.issues.filter((i) => i.severity === 'medium');
  report.pass = {
    footV75: report.global?.foot === '75',
    heroCtasHidden: report.global?.heroCtasHidden,
    noOverflow: !report.global?.overflowX,
    tapsOk: report.taps.every((t) => t.opened && !t.err),
    wizardOk: report.wizard.issues.filter((i) => i.severity === 'high').length === 0,
    copyLeaks: report.copyLeaks.length === 0,
    highIssues: high.length,
  };
  report.ok = report.pass.noOverflow && report.pass.tapsOk && report.pass.wizardOk && report.pass.heroCtasHidden && high.length === 0;

  report.summary = { high: high.length, medium: med.length, total: report.issues.length };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, pass: report.pass, summary: report.summary, out: OUT }));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});