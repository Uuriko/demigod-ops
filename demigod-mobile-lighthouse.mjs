#!/usr/bin/env node
/** Mobile Lighthouse + navigation timing audit for trydemigod.com */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { LIVE_ORIGIN } from './demigod-live-lib.mjs';
import { ROOT } from './demigod-turn-lib.mjs';

const OUT = path.join(ROOT, 'DEMIGOD-MOBILE-LIGHTHOUSE.json');
const REPORT = path.join(ROOT, 'audit-shots', 'mobile-lighthouse');
const TARGET_URL = `${LIVE_ORIGIN}/?v=lh-${Date.now()}`;
const LOCAL = process.argv.includes('--local');
const CORE = LOCAL ? fs.readFileSync(path.join(ROOT, 'demigod-foot-core.js'), 'utf8') : '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function scoreCat(report, id) {
  const cat = report?.categories?.[id];
  return cat ? Math.round((cat.score || 0) * 100) : null;
}

async function navTiming(page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paints = performance.getEntriesByType('paint');
    const lcp = performance.getEntriesByType('largest-contentful-paint').pop();
    return {
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      load: nav ? Math.round(nav.loadEventEnd) : null,
      fcp: Math.round(paints.find((p) => p.name === 'first-contentful-paint')?.startTime || 0),
      lcp: lcp ? Math.round(lcp.startTime) : null,
      transferSize: nav?.transferSize || null,
    };
  });
}

async function puppeteerTiming(local = false) {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 180000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  if (local) {
    await page.setRequestInterception(true);
    page.on('request', (req) => /foot-latest\.js(?:[?#]|$)|demigod-foot|(?:catbox|jsdelivr).*foot.*\.js(?:[?#]|$)/i.test(req.url())
      ? req.respond({ status: 200, contentType: 'application/javascript', body: CORE }).catch(() => {})
      : req.continue().catch(() => {}));
  }
  const t0 = Date.now();
  await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.waitForFunction(() => window.__dgFootVer, { timeout: 30000 });
  await sleep(1500);
  const timing = await navTiming(page);
  timing.wallMs = Date.now() - t0;
  const foot = await page.evaluate(() => window.__dgFootVer);
  const heroHidden = await page.evaluate(() => {
    const btn = document.querySelector('.hero-section .premium-btn,.header .premium-btn');
    return !btn || getComputedStyle(btn).display === 'none';
  });
  await page.close();
  await browser.disconnect();
  return { timing, foot, heroHidden };
}

function runLighthouse() {
  fs.mkdirSync(REPORT, { recursive: true });
  const jsonPath = path.join(REPORT, `lighthouse-mobile-${Date.now()}.json`);
  const args = [
    TARGET_URL,
    '--form-factor=mobile',
    '--screenEmulation.mobile',
    '--chrome-flags=--headless --no-sandbox --disable-gpu',
    '--throttling-method=simulate',
    '--only-categories=performance,accessibility,best-practices,seo',
    '--output=json',
    `--output-path=${jsonPath}`,
    '--quiet',
  ];
  const env = { ...process.env };
  const flatpakChrome = path.join(ROOT, 'bin/dg-flatpak-chrome');
  if (!env.CHROME_PATH && fs.existsSync(flatpakChrome)) env.CHROME_PATH = flatpakChrome;
  const run = spawnSync('npx', ['--yes', 'lighthouse', ...args], {
    encoding: 'utf8',
    env,
    timeout: 300000,
  });
  let report = null;
  if (fs.existsSync(jsonPath)) {
    try {
      report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (_) { /* ignore */ }
  }
  return {
    ok: run.status === 0 && !!report,
    jsonPath,
    stderr: (run.stderr || '').trim().slice(-500),
    scores: report
      ? {
          performance: scoreCat(report, 'performance'),
          accessibility: scoreCat(report, 'accessibility'),
          bestPractices: scoreCat(report, 'best-practices'),
          seo: scoreCat(report, 'seo'),
        }
      : null,
    audits: report
      ? {
          lcp: report.audits?.['largest-contentful-paint']?.displayValue,
          lcpMs: report.audits?.['largest-contentful-paint']?.numericValue ?? null,
          cls: report.audits?.['cumulative-layout-shift']?.displayValue,
          tbt: report.audits?.['total-blocking-time']?.displayValue,
          inp: report.audits?.['interaction-to-next-paint']?.displayValue,
          renderBlocking: report.audits?.['render-blocking-resources']?.displayValue,
          unusedJs: report.audits?.['unused-javascript']?.displayValue,
          imageSize: report.audits?.['uses-optimized-images']?.displayValue,
        }
      : null,
    opportunities: report
      ? Object.values(report.audits || {})
          .filter((a) => a.details?.type === 'opportunity' && (a.score ?? 1) < 1)
          .sort((a, b) => (b.numericValue || 0) - (a.numericValue || 0))
          .slice(0, 8)
          .map((a) => ({ id: a.id, title: a.title, savings: a.displayValue }))
      : [],
  };
}

async function main() {
  const baseline = LOCAL ? await puppeteerTiming().catch((e) => ({ error: String(e.message || e) })) : null;
  const timing = await puppeteerTiming(LOCAL).catch((e) => ({ error: String(e.message || e) }));
  const lh = runLighthouse();
  const scores = lh.scores || {};
  const pass = {
    lighthouseRan: lh.ok,
    perf: scores.performance == null || scores.performance >= 50,
    a11y: scores.accessibility == null || scores.accessibility >= 85,
    seo: scores.seo == null || scores.seo >= 85,
    footLoaded: /^\d+$/.test(String(timing.foot || '')),
    heroVisible: timing.heroHidden === false,
    lcpUnder4s: lh.audits?.lcpMs == null ? null : lh.audits.lcpMs < 4000,
  };
  const result = {
    at: new Date().toISOString(),
    url: TARGET_URL,
    lighthouse: lh,
    puppeteer: timing,
    baseline,
    pass,
    ok: pass.lighthouseRan && pass.footLoaded && pass.heroVisible && pass.perf && pass.a11y && pass.seo && pass.lcpUnder4s,
  };
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ok: result.ok, pass, scores: lh.scores, audits: lh.audits, out: OUT }));
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
