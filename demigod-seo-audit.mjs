#!/usr/bin/env node
// Rendered per-route SEO/structure audit for the LIVE site. Codifies the site-review findings as a
// fail-capable check. The PURE analyzer is poison-testable; CDP just gathers signals (DOM-level counts,
// not visibility-filtered — a /faq accordion hides its h2s, so visible counts lie).
//   node demigod-seo-audit.mjs [--json] [--selftest]
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const SITE = (process.env.DEMIGOD_SITE || 'https://www.trydemigod.com').replace(/\/$/, '');
const USE_LOCAL = process.argv.includes('--local');
const CORE = USE_LOCAL ? fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8') : '';
const HEAD_CSS = USE_LOCAL ? fs.readFileSync(new URL('./demigod-head-styles.css', import.meta.url), 'utf8') : '';
const ATLAS = USE_LOCAL ? fs.readFileSync(new URL('./demigod-startup-atlas-web.js', import.meta.url), 'utf8') : '';
const MAP_DATA = USE_LOCAL ? fs.readFileSync(new URL('./DEMIGOD-SF-STARTUP-MAP.json', import.meta.url), 'utf8') : '';
const MANIFEST = JSON.parse(fs.readFileSync(new URL('./DEMIGOD-FOOT-CDN.json', import.meta.url), 'utf8'));
const EXPECTED_FOOT_VER = USE_LOCAL ? (CORE.match(/__dgFootVer=['"](\d+)['"]/) || [])[1] : String(MANIFEST.footVer || '');
// pretty paths that resolve today; expectFaqSchema flags the confirmed missing FAQPage schema.
const ROUTES = [
  { p: '', name: '(home)' }, { p: 'pricing' }, { p: 'events' }, { p: 'how' }, { p: 'contact' },
  { p: 'legal' }, { p: 'refer' }, { p: 'hire' }, { p: 'talent' }, { p: 'faq', expectFaqSchema: true },
  { p: 'about' }, { p: 'blog' }, { p: 'sample' }, { p: 'startups' }, { p: 'press' }, { p: 'private' },
];

const faqText = (value) => String(value || '').replace(/[\u2010-\u2015]/g, '-').replace(/\s+/g, ' ').trim();
const faqPairKey = (item) => `${faqText(item?.q)}\n${faqText(item?.a)}`;
export const faqPairsMatch = (visible = [], schema = []) =>
  visible.length > 0 && visible.length === schema.length && visible.every((item, index) => faqPairKey(item) === faqPairKey(schema[index]));

export function faqPairsFromHtml(html) {
  for (const match of String(html || '').matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const value = JSON.parse(match[1]);
      const pages = (Array.isArray(value) ? value : [value]).flatMap((item) => item?.['@type'] === 'FAQPage' ? [item] : item?.['@graph'] || []);
      const page = pages.find((item) => item?.['@type'] === 'FAQPage');
      if (page) return (page.mainEntity || []).map((item) => ({ q: item?.name || '', a: item?.acceptedAnswer?.text || '' }));
    } catch { /* malformed JSON-LD is reported by the rendered audit */ }
  }
  return [];
}

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
  if ((s.ldTypes || []).filter((type) => type === 'FAQPage').length > 1) add('warn', 'duplicate-faqpage-schema');
  if (opts.expectFaqSchema && (s.faqVisible || []).length && !faqPairsMatch(s.faqVisible, s.faqSchema)) {
    add('error', 'faq-schema-content-mismatch', `${(s.faqVisible || []).length} visible / ${(s.faqSchema || []).length} schema differ`);
  }
  // Foot injectFaqJsonLd rebuilds FAQPage from visible #dg-page details and drops stale Webflow
  // blocks. Served HTML may still carry an old FAQPage until a Webflow page paste/ship — that is
  // prepare debt, not a live SERP defect, when the rendered pairs already match.
  if (opts.expectFaqSchema && (s.faqVisible || []).length && Array.isArray(s.staticFaqSchema) && !faqPairsMatch(s.faqVisible, s.staticFaqSchema)) {
    const renderedOk = faqPairsMatch(s.faqVisible, s.faqSchema);
    add(
      renderedOk ? 'warn' : 'error',
      'served-faq-schema-content-mismatch',
      `${(s.faqVisible || []).length} visible / ${(s.staticFaqSchema || []).length} served schema differ`,
    );
  }
  if (opts.expectedFootVer && String(s.footVer || '') !== opts.expectedFootVer) add('error', 'foot-version-mismatch', `${s.footVer || 'missing'} != ${opts.expectedFootVer}`);
  if ((s.consoleErrors || 0) > 0) add('warn', 'console-errors', String(s.consoleErrors));
  // Every signal above is read from the RENDERED DOM, so a page whose <body> ships empty and is
  // built entirely by foot-core scores identically to one with real served markup. Anything that
  // does not run JS — link unfurlers, some crawlers, archive tools — gets a blank document. Only
  // flag it when the rendered page does have content, which is what proves the gap is JS-only.
  if (s.staticBodyChars != null && s.staticBodyChars < 200 && (s.renderedBodyChars || 0) >= 200) {
    add('warn', 'js-only-body', `${s.staticBodyChars}ch served → ${s.renderedBodyChars}ch rendered`);
  }
  return issues;
}

/**
 * PURE: visible text length of a served HTML document's body, script/style removed.
 * Single source of truth — demigod-site-health.mjs wraps this rather than keeping a second copy.
 * The two had already drifted in opposite directions before being merged: this one dropped
 * <noscript> while the other required a closing </body> and returned a false 0 without one.
 *
 * <noscript> is deliberately KEPT. This measures what a non-rendering consumer receives, and
 * noscript content is precisely what such a consumer displays — stripping it understates crawlable
 * text and would flag a page as js-only-body when it has a real no-JS fallback.
 */
export function staticBodyTextLength(html) {
  const source = String(html || '');
  const start = source.toLowerCase().indexOf('<body');
  if (start < 0) return 0;
  const headNoScript = (source.slice(0, start).match(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi) || []).join(' ');
  return `${headNoScript} ${source.slice(start)}`
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    // Explicit: a comment containing '>' is not fully removed by the generic tag strip below.
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

export const hasErrors = (issues) => issues.some((i) => i.sev === 'error');

async function gather(page, url) {
  let consoleErrors = 0;
  // Counting errors without keeping them made "console-errors(2)" unactionable — you had to
  // re-drive a browser by hand to learn what broke. Keep the first few messages.
  const errorMessages = [];
  const note = (text) => { if (errorMessages.length < 5) errorMessages.push(String(text).slice(0, 200)); };
  const onC = (m) => { if (m.type() === 'error') { consoleErrors++; note(m.text()); } };
  const onE = (err) => { consoleErrors++; note(err?.message || err); };
  const onF = (request) => note(`${request.failure()?.errorText || 'request failed'} ${request.url()}`);
  page.on('console', onC); page.on('pageerror', onE); page.on('requestfailed', onF);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2500));
  const s = await page.evaluate(() => {
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((el) => {
      try { const j = JSON.parse(el.textContent); return Array.isArray(j) ? j : [j]; } catch { return [{ '@type': 'unparsed' }]; }
    });
    const faqPages = jsonLd.flatMap((item) => item?.['@type'] === 'FAQPage' ? [item] : item?.['@graph'] || []).filter((item) => item?.['@type'] === 'FAQPage');
    return {
      title: document.title,
      metaDesc: document.querySelector('meta[name="description"]')?.content || '',
      ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
      canonical: document.querySelector('link[rel="canonical"]')?.href || '',
      h1Count: document.querySelectorAll('h1').length,  // DOM-level, not visibility-filtered
      h2Count: document.querySelectorAll('h2').length,
      ldTypes: jsonLd.map((item) => item?.['@type']).filter(Boolean),
      faqVisible: [...document.querySelectorAll('#dg-page details')].map((item) => ({
        q: item.querySelector('summary')?.textContent || '',
        a: item.querySelector('p')?.textContent || '',
      })).filter((item) => item.q && item.a),
      faqSchema: faqPages.flatMap((faq) => faq.mainEntity || []).map((item) => ({
        q: item?.name || '', a: item?.acceptedAnswer?.text || '',
      })),
      footVer: String(window.__dgFootVer || ''),
      renderedBodyChars: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().length,
    };
  });
  page.off('console', onC); page.off('pageerror', onE); page.off('requestfailed', onF);
  // Fetch the document as a non-JS consumer receives it, to expose the served-vs-rendered gap.
  let staticBodyChars = null;
  s.staticFaqSchema = null;
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'demigod-seo-audit' }, signal: AbortSignal.timeout(20000) });
    const html = await res.text();
    staticBodyChars = staticBodyTextLength(html);
    s.staticFaqSchema = faqPairsFromHtml(html);
  } catch { /* leave null — unknown is not a finding */ }
  return { ...s, consoleErrors, errorMessages, staticBodyChars };
}

export async function audit() {
  const puppeteer = (await import('puppeteer-core')).default;
  const { chromium } = await import('playwright');
  const browser = await puppeteer.launch({ headless: true, executablePath: chromium.executablePath(), defaultViewport: { width: 1280, height: 900 } });
  const results = [];
  try {
    for (const r of ROUTES) {
      const url = `${SITE}/${r.p}`;
      const page = await browser.newPage();
      try {
        await page.setCacheEnabled(false);
        if (USE_LOCAL) {
          await page.setRequestInterception(true);
          page.on('request', (request) => {
            const requestUrl = request.url();
            const clean = requestUrl.split(/[?#]/)[0];
            if (clean === MANIFEST.cdnUrl || /foot-latest\.js(?:[?#]|$)|demigod-foot/i.test(requestUrl)) {
              request.respond({ status: 200, contentType: 'application/javascript', body: CORE }).catch(() => {});
            } else if (clean === MANIFEST.assets?.headCss?.url || /head-latest\.css(?:[?#]|$)|demigod-head/i.test(requestUrl)) {
              request.respond({ status: 200, contentType: 'text/css', body: HEAD_CSS }).catch(() => {});
            } else if (clean === MANIFEST.assets?.startupMap?.url || /startup-map-latest\.js(?:[?#]|$)/i.test(requestUrl)) {
              request.respond({ status: 200, contentType: 'application/javascript', body: ATLAS }).catch(() => {});
            } else if (clean === MANIFEST.assets?.mapData?.url || /sf-startup-map\.json(?:[?#]|$)/i.test(requestUrl)) {
              request.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: MAP_DATA }).catch(() => {});
            } else request.continue().catch(() => {});
          });
        }
        const s = await gather(page, url);
        const issues = analyzeRoute(s, { expectFaqSchema: r.expectFaqSchema, expectedFootVer: EXPECTED_FOOT_VER });
        results.push({ route: r.name || r.p, issues, signals: s });
      } catch (e) {
        results.push({ route: r.name || r.p, issues: [{ sev: 'error', code: 'render-failed', detail: String(e.message).slice(0, 80) }] });
      }
      try { await page.close(); } catch { /* */ }
    }
  } finally { try { await browser.close(); } catch { /* */ } }
  const ok = !results.some((r) => hasErrors(r.issues));
  return { ok, local: USE_LOCAL, results };
}

// isMain is load-bearing, not decoration. Without it, ANY module that imports this one and is run
// with --selftest has its own selftest hijacked: this block runs instead and calls process.exit(0),
// so the importer reports success having asserted nothing. Found 2026-07-31 when site-health began
// importing staticBodyTextLength and its selftest started printing {"selftest":"seo-audit"}.
if (isMain && process.argv.includes('--selftest')) {
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
  assert(codes({ ...clean, ldTypes: ['FAQPage', 'FAQPage'] }).includes('duplicate-faqpage-schema'), 'duplicate FAQPage schema flagged');
  const faq = [{ q: 'Cost?', a: 'Free.' }];
  assert(!codes({ ...clean, ldTypes: ['FAQPage'], faqVisible: faq, faqSchema: faq, staticFaqSchema: faq }, { expectFaqSchema: true }).includes('faq-schema-content-mismatch'), 'matching FAQ schema passes');
  assert(codes({ ...clean, ldTypes: ['FAQPage'], faqVisible: faq, faqSchema: [{ q: 'Old?', a: 'No.' }], staticFaqSchema: faq }, { expectFaqSchema: true }).includes('faq-schema-content-mismatch'), 'rendered FAQ drift fails');
  // Stale/empty served FAQ while rendered pairs match → warn only (foot owns runtime FAQPage).
  assert(codes({ ...clean, ldTypes: ['FAQPage'], faqVisible: faq, faqSchema: faq, staticFaqSchema: [] }, { expectFaqSchema: true }).includes('served-faq-schema-content-mismatch'), 'served FAQ drift still warned');
  assert(!hasErrors(analyzeRoute({ ...clean, ldTypes: ['FAQPage'], faqVisible: faq, faqSchema: faq, staticFaqSchema: [] }, { expectFaqSchema: true })), 'served FAQ drift is not error when rendered matches');
  assert(
    hasErrors(analyzeRoute({ ...clean, ldTypes: ['FAQPage'], faqVisible: faq, faqSchema: [{ q: 'X?', a: 'Y.' }], staticFaqSchema: [] }, { expectFaqSchema: true })),
    'served FAQ drift stays error when rendered also mismatches',
  );
  const faqHtml = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Cost?","acceptedAnswer":{"@type":"Answer","text":"Free."}}]}</script>';
  assert(faqPairsMatch(faq, faqPairsFromHtml(faqHtml)), 'served FAQ parser returns exact pairs');
  assert(codes({ ...clean, footVer: '1' }, { expectedFootVer: '2' }).includes('foot-version-mismatch'), 'runtime foot mismatch flagged');
  assert(codes({ ...clean, consoleErrors: 4 }).includes('console-errors'), 'console errors counted');
  // js-only-body: an empty served <body> that renders fine is invisible to every other signal here.
  assert(codes({ ...clean, staticBodyChars: 0, renderedBodyChars: 4000 }).includes('js-only-body'), 'empty served body flagged');
  assert(!codes({ ...clean, staticBodyChars: 3000, renderedBodyChars: 4000 }).includes('js-only-body'), 'served markup -> not flagged');
  assert(!codes({ ...clean, staticBodyChars: 0, renderedBodyChars: 0 }).includes('js-only-body'), 'a genuinely empty page is a different defect, not this one');
  assert(!codes(clean).includes('js-only-body'), 'unknown static size is not a finding');
  assert(staticBodyTextLength('<html><body> <script>var x=1</script> Hello  world </body></html>') === 11, 'body text length ignores script');
  assert(staticBodyTextLength('<html><body><!-- c --></body></html>') === 0, 'comment-only body is empty');
  assert(staticBodyTextLength('') === 0 && staticBodyTextLength(null) === 0, 'no html -> 0');
  assert(staticBodyTextLength('<html><body><!-- a > b --></body></html>') === 0, 'a comment containing > is still not content');
  // Regression on the merge: noscript is crawlable text, so it must COUNT, not be stripped.
  assert(staticBodyTextLength('<html><body><noscript>Real fallback</noscript></body></html>') === 13, 'noscript content counts as crawlable');
  assert(staticBodyTextLength('<html><head><noscript>Head fallback</noscript></head><body></body></html>') === 13, 'head noscript rendered by no-JS browsers counts');
  assert(staticBodyTextLength('<html><body>Hi</body>') === 2, 'a missing </body> must not read as an empty page');
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
    for (const m of r.signals?.errorMessages || []) console.log(`      ↳ ${m}`);
  }
  process.exit(res.ok ? 0 : 1);
}
