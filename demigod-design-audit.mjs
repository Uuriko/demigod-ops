#!/usr/bin/env node
/** Design audit: screenshots + off-palette color scan on key routes. */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { LIVE_ORIGIN } from './demigod-live-lib.mjs';
import { ROOT } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-DESIGN-AUDIT.json');
const SHOTS = path.join(ROOT, 'audit-shots', 'design');
const VER = process.env.DG_DESIGN_VER || 'v60';
const QUICK = process.argv.includes('--quick');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWS_FULL = [
  { name: 'home-hero', url: '/', clip: { x: 0, y: 0, width: 1440, height: 820 } },
  { name: 'home-full', url: '/', fullPage: true },
  { name: 'trust', url: '/', target: '#demigod-trust-block', scrollOnly: true, waitSteps: true },
  { name: 'pricing', url: '/#demigod-pricing', target: '#demigod-pricing' },
  { name: 'partners', url: '/#partnerships', target: '#demigod-partnerships-wrap', waitClass: 'dg-partners-page' },
  { name: 'privacy', url: '/#privacy', target: '#demigod-legal-privacy', waitClass: 'dg-legal-page', viewportShot: true },
  { name: 'mobile-home', url: '/', viewport: { width: 390, height: 844 }, fullPage: true },
  { name: 'wizard-startup', url: '/#startup-modal', modal: '#startup-modal' },
  { name: 'wizard-engineer', url: '/#jobseeker-modal', modal: '#jobseeker-modal' },
];

const VIEWS_QUICK = [
  { name: 'home-hero', url: '/', clip: { x: 0, y: 0, width: 1440, height: 820 } },
  { name: 'trust', url: '/', target: '#demigod-trust-block', scrollOnly: true, waitSteps: true },
  { name: 'pricing', url: '/#demigod-pricing', target: '#demigod-pricing' },
  { name: 'partners', url: '/#partnerships', target: '#demigod-partnerships-wrap', waitClass: 'dg-partners-page' },
  { name: 'privacy', url: '/#privacy', target: '#demigod-legal-privacy', waitClass: 'dg-legal-page', viewportShot: true },
];

const VIEWS = QUICK ? VIEWS_QUICK : VIEWS_FULL;

async function settleView(page, v) {
  const hash = v.url.includes('#') ? v.url.slice(v.url.indexOf('#')) : '';
  await page.evaluate(({ hash, target, waitClass, modal }) => {
    if (modal) {
      location.hash = modal.slice(1);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }
    if (hash) {
      location.hash = hash.slice(1);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      if (hash === '#privacy' || hash === '#terms' || hash === '#legal') {
        document.body.classList.add('dg-legal-page');
        const w = document.querySelector('#demigod-legal-wrap');
        if (w) w.style.display = 'block';
      }
      if (hash === '#partnerships') {
        document.body.classList.add('dg-partners-page');
        const w = document.querySelector('#demigod-partnerships-wrap');
        if (w) w.style.display = 'block';
      }
    }
    if (waitClass) document.body.classList.add(waitClass);
    const sel = target || hash;
    const el = sel ? document.querySelector(sel) : null;
    if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
    else window.scrollTo(0, hash === '#partnerships' || hash === '#privacy' ? 0 : document.body.scrollHeight * 0.45);
  }, { hash, target: v.target, waitClass: v.waitClass, modal: v.modal });
  if (v.waitClass) {
    await page.waitForFunction((cls) => document.body.classList.contains(cls), { timeout: 20000 }, v.waitClass).catch(() => {});
    if (v.target?.includes('legal')) {
      await page.waitForFunction(() => /privacy policy/i.test(document.querySelector('#demigod-legal-privacy')?.textContent || ''), { timeout: 20000 }).catch(() => {});
    }
    await sleep(1400);
  }
  if (v.waitSteps) {
    await page.waitForSelector('#demigod-trust-block .dg-steps', { timeout: 20000 }).catch(() => {});
  }
  if (v.target && !v.modal) {
    await page.waitForSelector(v.target, { timeout: 20000 }).catch(() => {});
    await page.waitForFunction((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && el.offsetHeight > 24;
    }, { timeout: 20000 }, v.target).catch(() => {});
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const y = (el.offsetTop || 0) - 80;
      window.scrollTo({ top: Math.max(0, y), left: 0, behavior: 'instant' });
    }, v.target);
    await sleep(v.scrollOnly ? 1000 : 600);
  }
  if (v.modal) {
    await page.waitForSelector(`${v.modal}.dg-wiz-active`, { timeout: 15000 }).catch(() => {});
  }
  await sleep(v.modal ? 1400 : 2000);
}

async function scanColors(page) {
  return page.evaluate(() => {
    const bad = [];
    const cool = /rgb\(\s*107\s*,\s*114\s*,\s*128\)/;
    const blue = /rgb\(\s*59\s*,\s*130\s*,\s*246|rgb\(\s*37\s*,\s*99\s*,\s*235|rgb\(\s*239\s*,\s*68\s*,\s*68\)/;
    document.querySelectorAll('a,button,h1,h2,h3,p,span,label,.dg-step,.dg-wiz-card,.button').forEach((el) => {
      const cs = getComputedStyle(el);
      [cs.color, cs.backgroundColor, cs.borderTopColor].forEach((v) => {
        if (!v || v === 'transparent' || v === 'rgba(0, 0, 0, 0)') return;
        if (blue.test(v)) bad.push({ kind: 'blue-red', v, text: (el.textContent || '').trim().slice(0, 40) });
        else if (cool.test(v)) bad.push({ kind: 'cool-gray', v, text: (el.textContent || '').trim().slice(0, 40) });
      });
    });
    return { offPalette: bad.slice(0, 30), count: bad.length };
  });
}

async function capture(page, v, shot) {
  if (v.modal) {
    const clip = await page.evaluate((modal) => {
      const inner = document.querySelector(`${modal} > div`);
      if (!inner) return null;
      const r = inner.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return null;
      return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(r.width, 1200), height: Math.min(r.height, 900) };
    }, v.modal);
    if (clip) await page.screenshot({ path: shot, clip });
    else await page.screenshot({ path: shot, clip: { x: 200, y: 80, width: 1040, height: 720 } });
    return;
  }
  if (v.target) {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
    }, v.target);
    await sleep(700);
    const clip = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return null;
      return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(r.width, 1320), height: Math.min(r.height, 1200) };
    }, v.target);
    if (clip) {
      await page.screenshot({ path: shot, clip });
      return;
    }
  }
  if (v.viewportShot) {
    await page.screenshot({ path: shot, fullPage: false });
    return;
  }
  if (v.fullPage) await page.screenshot({ path: shot, fullPage: true });
  else if (v.clip) await page.screenshot({ path: shot, clip: v.clip });
  else await page.screenshot({ path: shot, fullPage: false });
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
  const report = { at: new Date().toISOString(), ver: VER, views: {}, summary: { coolGray: 0, blueRed: 0 } };

  for (const v of VIEWS) {
    const page = await browser.newPage();
    if (v.viewport) await page.setViewport(v.viewport);
    else await page.setViewport({ width: 1440, height: 900 });
  const base = v.url.split('#')[0] || '/';
  const hash = v.url.includes('#') ? v.url.slice(v.url.indexOf('#')) : '';
  await page.goto(`${LIVE_ORIGIN}${base}${hash}?design=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => /dg-foot-v\d+-core/.test([...document.scripts].map((s) => s.textContent).join('')), { timeout: 15000 }).catch(() => {});
  await sleep(2800);
  await settleView(page, v);
    const shot = path.join(SHOTS, `${VER}-${v.name}.png`);
    await capture(page, v, shot);
    const colors = await scanColors(page);
    report.views[v.name] = { shot, url: v.url, colors };
    report.summary.coolGray += colors.offPalette.filter((x) => x.kind === 'cool-gray').length;
    report.summary.blueRed += colors.offPalette.filter((x) => x.kind === 'blue-red').length;
    await page.close();
  }

  report.ok = report.summary.blueRed === 0 && report.summary.coolGray < 5;
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, ver: VER, summary: report.summary, out: OUT }));
  await browser.disconnect();
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });