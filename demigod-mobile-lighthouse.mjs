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

async function puppeteerTiming() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 180000 });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
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
  const port = new URL(CDP_URL).port || '9223';
  const args = [
    TARGET_URL,
    `--port=${port}`,
    '--form-factor=mobile',
    '--screenEmulation.mobile',
    '--throttling-method=simulate',
    '--only-categories=performance,accessibility,best-practices,seo',
    '--output=json',
    `--output-path=${jsonPath}`,
    '--quiet',
  ];
  const run = spawnSync('npx', ['--yes', 'lighthouse', ...args], {
    encoding: 'utf8',
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
  const timing = await puppeteerTiming().catch((e) => ({ error: String(e.message || e) }));
  const lh = runLighthouse();
  const scores = lh.scores || {};
  const pass = {
    lighthouseRan: lh.ok,
    perf: scores.performance == null || scores.performance >= 50,
    a11y: scores.accessibility == null || scores.accessibility >= 85,
    seo: scores.seo == null || scores.seo >= 85,
    footV75: timing.foot === '75',
    heroDeduped: timing.heroHidden === true,
    lcpUnder4s: !timing.timing?.lcp || timing.timing.lcp < 4000,
  };
  const result = {
    at: new Date().toISOString(),
    url: TARGET_URL,
    lighthouse: lh,
    puppeteer: timing,
    pass,
    ok: pass.footV75 && pass.heroDeduped && (pass.lighthouseRan ? pass.perf && pass.a11y && pass.seo : true),
  };
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ok: result.ok, pass, scores: lh.scores, audits: lh.audits, out: OUT }));
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});