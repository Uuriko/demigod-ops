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
const ROUTES = ['/', '/?p=hire', '/?p=talent', '/?p=events', '/?p=faq', '/?p=legal'];

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
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(1200);
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
      }));
      const bad = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      serious += bad.length;
      const row = {
        route,
        url,
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
