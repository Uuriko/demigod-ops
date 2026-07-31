#!/usr/bin/env node
/**
 * Mobile Lighthouse smoke for live Demigod routes.
 *   node demigod-lighthouse.mjs [--json] [--url=https://www.trydemigod.com]
 * Needs: lighthouse (devDep), Chrome available to Lighthouse.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SITE = (process.env.DEMIGOD_SITE || 'https://www.trydemigod.com').replace(/\/$/, '');
const asJson = process.argv.includes('--json');
const baseArg = process.argv.find((a) => a.startsWith('--url='));
const base = (baseArg ? baseArg.slice(6) : SITE).replace(/\/$/, '');
const OUT = process.env.DG_LH_OUT || '/tmp/dg-busy/lighthouse';
const ROUTES = ['/', '/?p=hire', '/?p=talent', '/?p=events', '/?p=faq'];

fs.mkdirSync(OUT, { recursive: true });

/** Flatpak Chrome or Playwright Chromium — Lighthouse needs CHROME_PATH on this host. */
function resolveChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [
    path.join(process.env.HOME || '', '.local/share/flatpak/app/com.google.Chrome/current/active/files/extra/chrome'),
    '/app/extra/chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  for (const c of candidates) if (c && fs.existsSync(c)) return c;
  try {
    const pw = path.join(process.env.HOME || '', '.cache/ms-playwright');
    if (fs.existsSync(pw)) {
      const dirs = fs.readdirSync(pw).filter((d) => d.startsWith('chromium-'));
      for (const d of dirs) {
        const p = path.join(pw, d, 'chrome-linux', 'chrome');
        if (fs.existsSync(p)) return p;
        const p2 = path.join(pw, d, 'chrome-linux64', 'chrome');
        if (fs.existsSync(p2)) return p2;
      }
    }
  } catch {
    /* */
  }
  return null;
}

const chromePath = resolveChrome();
if (chromePath) process.env.CHROME_PATH = chromePath;

const lhBin = path.resolve('node_modules/.bin/lighthouse');
if (!fs.existsSync(lhBin)) {
  console.error('missing lighthouse — npm i -D lighthouse');
  process.exit(2);
}
if (!chromePath) {
  console.error('no Chrome for Lighthouse — set CHROME_PATH or install Playwright chromium');
  process.exit(2);
}

const results = [];
let fail = false;
for (const route of ROUTES) {
  const url = base + route;
  const slug = route === '/' ? 'home' : route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
  const outHtml = path.join(OUT, `${slug}.report.html`);
  const outJson = path.join(OUT, `${slug}.report.json`);
  const r = spawnSync(
    lhBin,
    [
      url,
      '--quiet',
      '--chrome-flags=--headless --no-sandbox --disable-gpu',
      '--form-factor=mobile',
      '--screenEmulation.mobile=true',
      '--only-categories=performance,accessibility,best-practices,seo',
      '--output=json',
      '--output=html',
      `--output-path=${path.join(OUT, slug)}`,
    ],
    { encoding: 'utf8', timeout: 180000 },
  );
  let scores = null;
  try {
    const j = JSON.parse(fs.readFileSync(outJson, 'utf8'));
    scores = {
      performance: Math.round((j.categories?.performance?.score || 0) * 100),
      accessibility: Math.round((j.categories?.accessibility?.score || 0) * 100),
      bestPractices: Math.round((j.categories?.['best-practices']?.score || 0) * 100),
      seo: Math.round((j.categories?.seo?.score || 0) * 100),
    };
    // Soft floors — warn-only unless catastrophic a11y
    if (scores.accessibility < 70) fail = true;
  } catch {
    fail = true;
  }
  const rowOk = !!scores && scores.accessibility >= 70;
  if (!scores) fail = true;
  results.push({
    route,
    url,
    ok: rowOk,
    status: r.status,
    scores,
    report: outHtml,
    chromePath,
  });
}

// Suite ok if majority routes scored and no a11y floor breaches on scored routes
const scored = results.filter((x) => x.scores);
const report = {
  at: new Date().toISOString(),
  base,
  chromePath,
  results,
  ok: scored.length >= Math.ceil(ROUTES.length * 0.6) && scored.every((x) => x.scores.accessibility >= 70),
};
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(report, null, 2) + '\n');
if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`lighthouse ${report.ok ? 'PASS' : 'FAIL'} · ${results.length} routes · ${OUT}`);
  for (const row of results) {
    const s = row.scores
      ? `perf=${row.scores.performance} a11y=${row.scores.accessibility} seo=${row.scores.seo}`
      : 'no-scores';
    console.log(`  ${row.ok ? '✓' : '✗'} ${row.route}  ${s}`);
  }
}
process.exit(report.ok ? 0 : 1);
