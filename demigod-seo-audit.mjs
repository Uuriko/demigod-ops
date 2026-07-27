#!/usr/bin/env node
// Rendered per-route SEO/structure audit for the LIVE site. Codifies the site-review findings as a
// fail-capable check. The PURE analyzer is poison-testable; CDP just gathers signals (DOM-level counts,
// not visibility-filtered — a /faq accordion hides its h2s, so visible counts lie).
//   node demigod-seo-audit.mjs [--json] [--selftest]     # CDP on :9223 required for a live run
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const SITE = (process.env.DEMIGOD_SITE || 'https://www.trydemigod.com').replace(/\/$/, '');
const CDP = process.env.DEMIGOD_CDP || 'http://127.0.0.1:9223';
// pretty paths that resolve today; expectFaqSchema flags the confirmed missing FAQPage schema.
const ROUTES = [
  { p: '', name: '(home)' }, { p: 'hire' }, { p: 'talent' }, { p: 'startups' }, { p: 'events' },
  { p: 'partnerships' }, { p: 'legal' }, { p: 'pricing' }, { p: 'about' }, { p: 'how' }, { p: 'security' },
  { p: 'faq', expectFaqSchema: true },
];

// PURE: route signals -> issues. error = must-fix (breaks SERP/indexing); warn = should-improve.
export function analyzeRoute(s = {}, opts = {}) {
  const issues = [];
  const add = (sev, code, detail) => issues.push(detail === undefined ? { sev, code } : { sev, code, detail });
  const title = String(s.title || '').trim();
  if (!title) add('error', 'missing-title');
  else if (/^untitled$/i.test(title)) add('error', 'untitled-title');
  const md = String(s.metaDesc || '');
  if (!md) add('error', 'missing-meta-description');
  else if (md.length < 80) add('warn', 'meta-description-too-short', `${md.length}ch (<80)`);
  else if (md.length > 160) add('warn', 'meta-description-too-long', `${md.length}ch (>160)`);
  if (!s.ogTitle) add('warn', 'missing-og-title');
  if (!s.canonical) add('warn', 'missing-canonical');
  if (!(s.h1Count > 0)) add('warn', 'no-h1');
  else if (s.h1Count > 1) add('warn', 'multiple-h1', String(s.h1Count));
  if (opts.expectFaqSchema && !(s.ldTypes || []).includes('FAQPage')) add('warn', 'missing-faqpage-schema');
  if ((s.consoleErrors || 0) > 0) add('warn', 'console-errors', String(s.consoleErrors));
  return issues;
}

export const hasErrors = (issues) => issues.some((i) => i.sev === 'error');

async function gather(page, url) {
  let consoleErrors = 0;
  const onC = (m) => { if (m.type() === 'error') consoleErrors++; };
  const onE = () => { consoleErrors++; };
  page.on('console', onC); page.on('pageerror', onE);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2500));
  const s = await page.evaluate(() => {
    const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((el) => {
      try { const j = JSON.parse(el.textContent); return Array.isArray(j) ? j.map((x) => x['@type']) : [j['@type']]; } catch { return ['unparsed']; }
    });
    return {
      title: document.title,
      metaDesc: document.querySelector('meta[name="description"]')?.content || '',
      ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
      canonical: document.querySelector('link[rel="canonical"]')?.href || '',
      h1Count: document.querySelectorAll('h1').length,  // DOM-level, not visibility-filtered
      h2Count: document.querySelectorAll('h2').length,
      ldTypes: ld.filter(Boolean),
    };
  });
  page.off('console', onC); page.off('pageerror', onE);
  return { ...s, consoleErrors };
}

export async function audit() {
  const puppeteer = (await import('puppeteer-core')).default;
  const browser = await puppeteer.connect({ browserURL: CDP, defaultViewport: { width: 1280, height: 900 } });
  const results = [];
  try {
    for (const r of ROUTES) {
      const url = `${SITE}/${r.p}`;
      const page = await browser.newPage();
      try {
        const s = await gather(page, url);
        const issues = analyzeRoute(s, { expectFaqSchema: r.expectFaqSchema });
        results.push({ route: r.name || r.p, issues, signals: s });
      } catch (e) {
        results.push({ route: r.name || r.p, issues: [{ sev: 'error', code: 'render-failed', detail: String(e.message).slice(0, 80) }] });
      }
      try { await page.close(); } catch { /* */ }
    }
  } finally { try { await browser.disconnect(); } catch { /* */ } }
  const ok = !results.some((r) => hasErrors(r.issues));
  return { ok, results };
}

if (process.argv.includes('--selftest')) {
  const assert = (c, m) => { if (!c) throw new Error('FAIL: ' + m); };
  const codes = (s, o) => analyzeRoute(s, o).map((i) => i.code);
  const clean = { title: 'Pricing · Demigod', metaDesc: 'x'.repeat(130), ogTitle: 'Pricing', canonical: 'https://x/pricing', h1Count: 1, ldTypes: [], consoleErrors: 0 };
  assert(analyzeRoute(clean).length === 0, 'clean page -> no issues');
  assert(codes({ ...clean, title: '' }).includes('missing-title'), 'missing title');
  assert(codes({ ...clean, title: 'Untitled' }).includes('untitled-title'), 'untitled title');
  assert(codes({ ...clean, metaDesc: '' }).includes('missing-meta-description'), 'missing meta');
  assert(codes({ ...clean, metaDesc: 'short' }).includes('meta-description-too-short'), 'meta too short (mud 51/talent 79 class)');
  assert(codes({ ...clean, metaDesc: 'y'.repeat(200) }).includes('meta-description-too-long'), 'meta too long');
  assert(codes({ ...clean, ogTitle: '' }).includes('missing-og-title'), 'missing og');
  assert(codes({ ...clean, canonical: '' }).includes('missing-canonical'), 'missing canonical');
  assert(codes({ ...clean, h1Count: 0 }).includes('no-h1'), 'no h1');
  assert(codes({ ...clean, h1Count: 3 }).includes('multiple-h1'), 'multiple h1');
  assert(codes(clean, { expectFaqSchema: true }).includes('missing-faqpage-schema'), 'faq without FAQPage schema flagged');
  assert(!codes({ ...clean, ldTypes: ['FAQPage'] }, { expectFaqSchema: true }).includes('missing-faqpage-schema'), 'FAQPage present -> not flagged');
  assert(codes({ ...clean, consoleErrors: 4 }).includes('console-errors'), 'console errors counted');
  assert(hasErrors([{ sev: 'error', code: 'x' }]) && !hasErrors([{ sev: 'warn', code: 'y' }]), 'hasErrors gates on error sev only');
  console.log(JSON.stringify({ ok: true, selftest: 'seo-audit' }));
  process.exit(0);
}

if (isMain) {
  const res = await audit();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(res, null, 2)); process.exit(res.ok ? 0 : 1); }
  console.log(`seo-audit ${res.ok ? 'PASS' : 'FAIL'} (error-sev gates; warns are advisory)`);
  for (const r of res.results) {
    if (!r.issues.length) { console.log(`  ✓ ${r.route}`); continue; }
    console.log(`  ${hasErrors(r.issues) ? '✗' : '·'} ${r.route}: ${r.issues.map((i) => `${i.code}${i.detail ? `(${i.detail})` : ''}`).join(', ')}`);
  }
  process.exit(res.ok ? 0 : 1);
}
