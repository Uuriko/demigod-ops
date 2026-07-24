#!/usr/bin/env node
/** Live browser defect sweep: console errors, failed requests, near-invisible elements. */
import fs from 'fs';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { LIVE_ORIGIN, appendNovelFindings } from './demigod-live-lib.mjs';

const FINDINGS = '/tmp/dg-busy/dg-findings.jsonl';
const RECEIPT = '/tmp/dg-busy/claude-yolo-last.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = [
  { path: '/', label: 'home' },
  { path: '/?p=events', label: 'events' },
  { path: '/?p=mud', label: 'mud' },
];

async function sweep(page, url, label) {
  const consoleErrors = [];
  const failedRequests = [];

  const onConsole = (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  };
  const onPageError = (err) => consoleErrors.push(`pageerror: ${err.message}`);
  const onReqFailed = (req) => {
    failedRequests.push({ url: req.url(), method: req.method(), errorText: req.failure()?.errorText || 'unknown' });
  };
  const onResponse = (res) => {
    if (res.status() >= 400) {
      failedRequests.push({ url: res.url(), method: res.request().method(), status: res.status() });
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onReqFailed);
  page.on('response', onResponse);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => window.__dgFootVer, { timeout: 20000 }).catch(() => {});
  await sleep(2000);

  const invisible = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('body *').forEach((el) => {
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return;
      const op = parseFloat(st.opacity);
      if (!(op < 0.05)) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const text = (el.textContent || '').trim();
      if (!text && !el.querySelector('img,svg,button,a,input')) return;
      out.push({
        sel: el.id ? '#' + el.id : (el.className ? '.' + String(el.className).split(' ').filter(Boolean).slice(0, 2).join('.') : el.tagName.toLowerCase()),
        opacity: op,
        w: Math.round(r.width),
        h: Math.round(r.height),
        text: text.slice(0, 60),
      });
    });
    return out;
  });

  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  page.off('requestfailed', onReqFailed);
  page.off('response', onResponse);

  return { consoleErrors, failedRequests, invisible };
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.setViewport({ width: 1280, height: 900 });

  const results = {};
  for (const p of PAGES) {
    const url = `${LIVE_ORIGIN}${p.path}${p.path.includes('?') ? '&' : '?'}v=defect-${Date.now()}`;
    results[p.label] = await sweep(page, url, p.label);
  }

  await page.close();
  await browser.disconnect();

  const findings = [];
  const at = new Date().toISOString();
  for (const [label, r] of Object.entries(results)) {
    for (const e of r.consoleErrors) {
      findings.push({ at, task: 'defect-sweep', finding: `console error on ${label}: ${e}`, evidence: { label, error: e }, severity: 'medium' });
    }
    for (const f of r.failedRequests) {
      findings.push({ at, task: 'defect-sweep', finding: `failed request on ${label}: ${f.method} ${f.url} (${f.errorText || f.status})`, evidence: f, severity: 'medium' });
    }
    for (const v of r.invisible) {
      findings.push({ at, task: 'defect-sweep', finding: `near-invisible element on ${label}: ${v.sel} opacity=${v.opacity} "${v.text}"`, evidence: v, severity: 'low' });
    }
  }

  fs.mkdirSync('/tmp/dg-busy', { recursive: true });
  const { written, skipped } = appendNovelFindings(FINDINGS, findings);
  const receipt = {
    at,
    task: 'defect-sweep',
    pagesChecked: PAGES.map((p) => p.label),
    findingsCount: findings.length,
    findingsNew: written,
    findingsKnown: skipped,
    results,
  };
  fs.writeFileSync(RECEIPT, JSON.stringify(receipt, null, 2));

  console.log(JSON.stringify({ findingsCount: findings.length, findingsNew: written, findingsKnown: skipped, results }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
