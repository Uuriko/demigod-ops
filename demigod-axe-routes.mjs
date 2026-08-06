#!/usr/bin/env node
/**
 * axe-core a11y smoke on live (or local) Demigod routes via Playwright.
 *   node demigod-axe-routes.mjs [--json] [--url=https://www.trydemigod.com]
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const SITE = (process.env.DEMIGOD_SITE || 'https://www.trydemigod.com').replace(/\/$/, '');
const asJson = process.argv.includes('--json');
const baseArg = process.argv.find((a) => a.startsWith('--url='));
const base = (baseArg ? baseArg.slice(6) : SITE).replace(/\/$/, '');
const OUT = process.env.DG_AXE_OUT || '/tmp/dg-busy/axe';
const USE_LOCAL = process.argv.includes('--local');
const CORE = USE_LOCAL ? fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8') : '';
const HEAD_CSS = USE_LOCAL ? fs.readFileSync(new URL('./demigod-head-styles.css', import.meta.url), 'utf8') : '';
const ATLAS = USE_LOCAL ? fs.readFileSync(new URL('./demigod-startup-atlas-web.js', import.meta.url), 'utf8') : '';
const MAP_DATA = USE_LOCAL ? fs.readFileSync(new URL('./DEMIGOD-SF-STARTUP-MAP.json', import.meta.url), 'utf8') : '';
const MANIFEST = USE_LOCAL ? JSON.parse(fs.readFileSync(new URL('./DEMIGOD-FOOT-CDN.json', import.meta.url), 'utf8')) : {};
const EXPECTED_FOOT_VER = USE_LOCAL ? (CORE.match(/__dgFootVer=['"](\d+)['"]/) || [])[1] : '';
const ROUTES = ['/', '/pricing', '/events', '/how', '/contact', '/legal', '/refer', '/hire', '/talent', '/faq', '/about', '/blog', '/sample', '/startups', '/press', '/private'];

fs.mkdirSync(OUT, { recursive: true });

let playwright;
try {
  playwright = await import('playwright');
} catch {
  console.error('missing playwright');
  process.exit(2);
}

// @axe-core/cli ships axe-core; load for in-page inject
let axeSource;
try {
  const axePath = require.resolve('axe-core/axe.min.js');
  axeSource = fs.readFileSync(axePath, 'utf8');
} catch {
  try {
    const axePath = require.resolve('@axe-core/cli/node_modules/axe-core/axe.min.js');
    axeSource = fs.readFileSync(axePath, 'utf8');
  } catch {
    console.error('missing axe-core — npm i -D @axe-core/cli axe-core');
    process.exit(2);
  }
}

const browser = await playwright.chromium.launch({ headless: true });
const results = [];
let serious = 0;

try {
  for (const route of ROUTES) {
    const url = base + route;
    const page = await browser.newPage({ viewport: { width: 390, height: 844, isMobile: true } });
    try {
      if (USE_LOCAL) {
        await page.route('**/*', (request) => {
          const url = request.request().url(), clean = url.replace(/[?#].*$/, '');
          if (clean === MANIFEST.cdnUrl || /foot-latest\.js$|demigod-foot/i.test(clean)) return request.fulfill({ status: 200, contentType: 'application/javascript', body: CORE });
          if (clean === MANIFEST.assets?.headCss?.url || /head-latest\.css$|demigod-head/i.test(clean)) return request.fulfill({ status: 200, contentType: 'text/css', body: HEAD_CSS });
          if (clean === MANIFEST.assets?.startupMap?.url || /startup-map-latest\.js$/i.test(clean)) return request.fulfill({ status: 200, contentType: 'application/javascript', body: ATLAS });
          if (clean === MANIFEST.assets?.mapData?.url || /sf-startup-map\.json$/i.test(clean)) return request.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: MAP_DATA });
          return request.continue();
        });
      }
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(1200);
      const footVer = await page.evaluate(() => String(window.__dgFootVer || ''));
      if (USE_LOCAL && footVer !== EXPECTED_FOOT_VER) throw new Error(`local foot identity ${footVer || 'missing'} != ${EXPECTED_FOOT_VER}`);
      await page.addScriptTag({ content: axeSource });
      const axe = await page.evaluate(async () => {
        // eslint-disable-next-line no-undef
        return await axe.run(document, {
          resultTypes: ['violations'],
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        });
      });
      const violations = (axe.violations || []).map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: (v.nodes || []).length,
        evidence: (v.nodes || []).slice(0, 3).map((node) => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })),
      }));
      const bad = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      serious += bad.length;
      const row = {
        route,
        url,
        footVer,
        ok: bad.length === 0,
        violationCount: violations.length,
        seriousOrCritical: bad.length,
        violations: violations.slice(0, 20),
      };
      results.push(row);
      const slug = route === '/' ? 'home' : route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
      fs.writeFileSync(path.join(OUT, `${slug}.json`), JSON.stringify(row, null, 2) + '\n');
    } catch (e) {
      results.push({ route, url, ok: false, error: String(e?.message || e) });
      serious += 1;
    } finally {
      await page.close().catch(() => {});
    }
  }
} finally {
  await browser.close().catch(() => {});
}

const report = {
  at: new Date().toISOString(),
  base,
  local: USE_LOCAL,
  ok: serious === 0 && results.every((r) => r.ok !== false || r.seriousOrCritical === 0),
  seriousOrCritical: serious,
  results,
};
// ok if no serious/critical
report.ok = results.every((r) => !r.error && (r.seriousOrCritical || 0) === 0);
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(report, null, 2) + '\n');
if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`axe ${report.ok ? 'PASS' : 'FAIL'} · serious/critical=${serious} · ${OUT}`);
  for (const row of results) {
    if (row.error) console.log(`  ✗ ${row.route}  ${row.error}`);
    else console.log(`  ${row.ok ? '✓' : '✗'} ${row.route}  violations=${row.violationCount} serious=${row.seriousOrCritical}`);
  }
}
process.exit(report.ok ? 0 : 1);
