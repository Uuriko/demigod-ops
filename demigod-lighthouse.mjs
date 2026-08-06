#!/usr/bin/env node
/**
 * Mobile Lighthouse smoke for live Demigod routes.
 *   node demigod-lighthouse.mjs [--json] [--path=/] [--url=…] [--all]
 *   node demigod-lighthouse.mjs --selftest
 * Default is a single home-route budget smoke (perf≥80). Use --all for the 5-route matrix.
 * Needs: lighthouse (devDep), Chrome available to Lighthouse.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

export function hostLoadTooHigh(load, cpus, maxRatio = 2) {
  return Number.isFinite(load) && Number.isFinite(cpus) && cpus > 0 && load / cpus > maxRatio;
}

/* import.meta.main, not a bare argv check: an ungated --selftest block ends in exit(0), so any
   module that imports this one and is itself run with --selftest inherits a silent success
   having asserted nothing. demigod-seo-audit shipped that way and hijacked site-health. */
if (import.meta.main && process.argv.includes('--selftest')) {
  assert.equal(hostLoadTooHigh(17, 8), true);
  assert.equal(hostLoadTooHigh(16, 8), false);
  console.log(JSON.stringify({ ok: true, selftest: 'lighthouse-host-load' }));
  process.exit(0);
}

const SITE = (process.env.DEMIGOD_SITE || 'https://www.trydemigod.com').replace(/\/$/, '');
const asJson = process.argv.includes('--json');
const wantAll = process.argv.includes('--all');
const baseArg = process.argv.find((a) => a.startsWith('--url='));
const pathArg = process.argv.find((a) => a.startsWith('--path='));
const explicitUrl = baseArg ? new URL(baseArg.slice(6)) : pathArg ? new URL(pathArg.slice(7), `${SITE}/`) : null;
const base = SITE;
const OUT = process.env.DG_LH_OUT || '/tmp/dg-busy/lighthouse';
const PERF_MIN = Math.max(0, Math.min(100, Number(process.env.DG_LH_PERF_MIN) || 80));
const hostLoad = os.loadavg()[0];
const hostCpus = os.availableParallelism?.() || os.cpus().length;
const maxLoadRatio = Number(process.env.DG_LH_MAX_LOAD_PER_CPU) || 2;
if (process.env.DG_LH_ALLOW_BUSY !== '1' && hostLoadTooHigh(hostLoad, hostCpus, maxLoadRatio)) {
  console.error(`lighthouse: host load ${hostLoad.toFixed(2)} on ${hostCpus} CPUs is too high for a valid performance sample (set DG_LH_ALLOW_BUSY=1 to override)`);
  process.exit(2);
}
const ROUTES = ['/', '/hire', '/talent', '/events', '/faq'];
// Bare invoke = home smoke only. Multi-route is explicit (--all) so hot-path wraps don't thrash.
const targets = explicitUrl
  ? [{ route: `${explicitUrl.pathname}${explicitUrl.search}`, url: explicitUrl.href }]
  : wantAll
    ? ROUTES.map((route) => ({ route, url: base + route }))
    : [{ route: '/', url: `${base}/` }];

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

function resolveModernNode() {
  if (Number(process.versions.node.split('.')[0]) >= 22) return process.execPath;
  const root = path.join(process.env.HOME || '', '.nvm/versions/node');
  try {
    return fs.readdirSync(root)
      .map((version) => ({ version, major: Number(version.match(/^v(\d+)/)?.[1]), bin: path.join(root, version, 'bin/node') }))
      .filter(({ major, bin }) => major >= 22 && fs.existsSync(bin))
      .sort((a, b) => b.major - a.major || b.version.localeCompare(a.version, undefined, { numeric: true }))[0]?.bin || null;
  } catch { return null; }
}

const chromePath = resolveChrome();
const nodePath = resolveModernNode();
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
if (!nodePath) {
  console.error('Lighthouse requires Node 22+ — install it with nvm');
  process.exit(2);
}

const results = [];
for (const { route, url } of targets) {
  const slug = route === '/' ? 'home' : route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
  const outHtml = path.join(OUT, `${slug}.report.html`);
  const outJson = path.join(OUT, `${slug}.report.json`);
  for (const file of [outHtml, outJson]) try { fs.unlinkSync(file); } catch {}
  let r;
  let scores = null;
  for (let attempt = 0; attempt < 2 && !scores; attempt++) {
    r = spawnSync(
      nodePath,
      [
        lhBin,
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
    try {
      const j = JSON.parse(fs.readFileSync(outJson, 'utf8'));
      const categoryScores = [
        j.categories?.performance?.score,
        j.categories?.accessibility?.score,
        j.categories?.['best-practices']?.score,
        j.categories?.seo?.score,
      ];
      if (categoryScores.every(Number.isFinite)) {
        const [performance, accessibility, bestPractices, seo] = categoryScores.map((score) => Math.round(score * 100));
        scores = { performance, accessibility, bestPractices, seo };
      }
    } catch {}
  }
  const rowOk = !!scores && scores.performance >= PERF_MIN && scores.accessibility >= 70;
  results.push({
    route,
    url,
    ok: rowOk,
    status: r.status,
    scores,
    error: scores ? null : (r.error?.message || r.stderr?.trim().slice(0, 500) || `Lighthouse exited ${r.status}`),
    report: outHtml,
    chromePath,
    nodePath,
  });
}

// An unscored route is unknown, not a pass; every canonical target must produce categories.
const scored = results.filter((x) => x.scores);
const report = {
  at: new Date().toISOString(),
  base,
  chromePath,
  nodePath,
  results,
  performanceMinimum: PERF_MIN,
  ok: scored.length === targets.length && results.every((x) => x.ok),
};
const summaryPath = path.join(OUT, 'summary.json');
const latestPath = '/tmp/dg-busy/lighthouse-latest.json';
const body = JSON.stringify(report, null, 2) + '\n';
fs.writeFileSync(summaryPath, body);
try {
  fs.writeFileSync(latestPath, body);
} catch {
  /* busy dir always exists in prod; ignore rare FS errors */
}
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
