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
const QUICK = process.argv.includes('--quick');
const USE_LOCAL = process.argv.includes('--local');
const CORE = USE_LOCAL ? fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8') : '';
const HEAD_CSS = USE_LOCAL ? fs.readFileSync(path.join(ROOT, 'demigod-head-styles.css'), 'utf8') : '';
const ATLAS = USE_LOCAL ? fs.readFileSync(path.join(ROOT, 'demigod-startup-atlas-web.js'), 'utf8') : '';
const MAP_DATA = USE_LOCAL ? fs.readFileSync(path.join(ROOT, 'DEMIGOD-SF-STARTUP-MAP.json'), 'utf8') : '';
const MANIFEST = USE_LOCAL ? JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-FOOT-CDN.json'), 'utf8')) : {};
const VER = process.env.DG_DESIGN_VER || (USE_LOCAL ? `v${CORE.match(/__dgFootVer='(\d+)'/)?.[1] || 'disk'}` : 'live');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bounded = (promise, ms, label) => Promise.race([
  promise,
  sleep(ms).then(() => { throw new Error(`${label}_timeout_${ms}ms`); }),
]);

const VIEWS_FULL = [
  { name: 'home-hero', url: '/', clip: { x: 0, y: 0, width: 1440, height: 820 } },
  { name: 'home-full', url: '/', fullPage: true },
  { name: 'trust', url: '/', target: '.trust-section', scrollOnly: true, waitSteps: true },
  { name: 'pricing', url: '/pricing', target: '#dg-page' },
  { name: 'partners', url: '/refer', target: '#dg-page' },
  { name: 'privacy', url: '/legal', target: '#dg-page' },
  { name: 'startups', url: '/startups', target: '#dg-page' },
  { name: 'mobile-home', url: '/', viewport: { width: 390, height: 844 }, fullPage: true },
  { name: 'wizard-startup', url: '/?wiz=startup', modal: '#startup-modal' },
  { name: 'wizard-engineer', url: '/?wiz=engineer', modal: '#jobseeker-modal' },
];

const VIEWS_QUICK = [
  { name: 'home-hero', url: '/', clip: { x: 0, y: 0, width: 1440, height: 820 } },
  { name: 'trust', url: '/', target: '.trust-section', scrollOnly: true, waitSteps: true },
  { name: 'pricing', url: '/pricing', target: '#dg-page' },
  { name: 'partners', url: '/refer', target: '#dg-page' },
  { name: 'privacy', url: '/legal', target: '#dg-page' },
];

const VIEWS = QUICK ? VIEWS_QUICK : VIEWS_FULL;

async function settleView(page, v) {
  const hash = v.url.includes('#') ? v.url.slice(v.url.indexOf('#')) : '';
  await page.evaluate(({ hash, target, waitClass, modal }) => {
    if (modal) {
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
    await page.waitForSelector('.trust-section .steps-grid', { timeout: 20000 }).catch(() => {});
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
    await page.waitForFunction((selector) => {
      const modal = document.querySelector(selector);
      if (!modal) return false;
      const style = getComputedStyle(modal);
      return style.display !== 'none' && style.visibility !== 'hidden' && modal.offsetWidth > 20 && modal.offsetHeight > 20;
    }, { timeout: 15000 }, v.modal);
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

async function scanLayout(page, view) {
  if (!view.modal) return {};
  return page.evaluate((modal) => {
    const button = document.querySelector(`${modal} .dg-wiz-next[data-enter-hint]`);
    if (!button) return { wizardHint: { ok: false, reason: 'button_missing' } };
    const style = getComputedStyle(button);
    return {
      wizardHint: {
        ok: !style.display.includes('flex') || style.flexDirection === 'column',
        display: style.display,
        flexDirection: style.flexDirection,
      },
    };
  }, view.modal);
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
    const clip = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return null;
      return {
        x: Math.max(0, rect.x + scrollX),
        y: Math.max(0, rect.y + scrollY),
        width: Math.min(rect.width, 1320),
        height: Math.min(rect.height, 2400),
      };
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
  const report = { at: new Date().toISOString(), ver: VER, local: USE_LOCAL, views: {}, summary: { coolGray: 0, blueRed: 0, wizardHintCollisions: 0 } };

  for (const v of VIEWS) {
    const page = await browser.newPage();
    if (USE_LOCAL) {
      await page.setCacheEnabled(false);
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const url = request.url();
        const clean = url.split(/[?#]/)[0];
        if (clean === MANIFEST.cdnUrl || /foot-latest\.js(?:[?#]|$)|demigod-foot/i.test(url)) {
          request.respond({ status: 200, contentType: 'application/javascript', body: CORE }).catch(() => {});
        } else if (clean === MANIFEST.assets?.headCss?.url || /head-latest\.css(?:[?#]|$)|demigod-head/i.test(url)) {
          request.respond({ status: 200, contentType: 'text/css', body: HEAD_CSS }).catch(() => {});
        } else if (clean === MANIFEST.assets?.startupMap?.url || /startup-map-latest\.js(?:[?#]|$)/i.test(url)) {
          request.respond({ status: 200, contentType: 'application/javascript', body: ATLAS }).catch(() => {});
        } else if (clean === MANIFEST.assets?.mapData?.url || /sf-startup-map\.json(?:[?#]|$)/i.test(url)) {
          request.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: MAP_DATA }).catch(() => {});
        } else request.continue().catch(() => {});
      });
    }
    if (v.viewport) await page.setViewport(v.viewport);
    else await page.setViewport({ width: 1440, height: 900 });
  const target = new URL(v.url, LIVE_ORIGIN);
  target.searchParams.set('design', Date.now());
  await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__dgFootVer, { timeout: 15000 }).catch(() => {});
  await sleep(2800);
  await settleView(page, v);
    const shot = path.join(SHOTS, `${VER}-${v.name}.png`);
    await bounded(capture(page, v, shot), 30000, `capture_${v.name}`);
    const colors = await scanColors(page);
    const layout = await scanLayout(page, v);
    const runtimeVer = await page.evaluate(() => `v${window.__dgFootVer || ''}`);
    report.views[v.name] = { shot, url: v.url, runtimeVer, colors, layout };
    report.summary.coolGray += colors.offPalette.filter((x) => x.kind === 'cool-gray').length;
    report.summary.blueRed += colors.offPalette.filter((x) => x.kind === 'blue-red').length;
    if (layout.wizardHint?.ok === false) report.summary.wizardHintCollisions += 1;
    await page.close();
  }

  report.ok = report.summary.blueRed === 0 && report.summary.coolGray < 5 && report.summary.wizardHintCollisions === 0 && (!USE_LOCAL || Object.values(report.views).every((view) => view.runtimeVer === VER));
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, ver: VER, summary: report.summary, out: OUT }));
  await browser.disconnect();
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
