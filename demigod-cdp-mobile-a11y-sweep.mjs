#!/usr/bin/env node
/** Mobile + a11y sweep at 390x844: overflow, tap targets, unlabeled inputs, live regions. */
import fs from 'fs';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { LIVE_ORIGIN, appendNovelFindings } from './demigod-live-lib.mjs';

const FINDINGS = '/tmp/dg-busy/dg-findings.jsonl';
const RECEIPT = '/tmp/dg-busy/mobile-a11y-sweep.json';
const USE_LOCAL = process.argv.includes('--local');
const CORE = USE_LOCAL ? fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8') : '';
const HEAD_CSS = USE_LOCAL ? fs.readFileSync(new URL('./demigod-head-styles.css', import.meta.url), 'utf8') : '';
const ATLAS = USE_LOCAL ? fs.readFileSync(new URL('./demigod-startup-atlas-web.js', import.meta.url), 'utf8') : '';
const MAP_DATA = USE_LOCAL ? fs.readFileSync(new URL('./DEMIGOD-SF-STARTUP-MAP.json', import.meta.url), 'utf8') : '';
const MANIFEST = USE_LOCAL ? JSON.parse(fs.readFileSync(new URL('./DEMIGOD-FOOT-CDN.json', import.meta.url), 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function appendTrustedFindings(identityOk, findings, append = appendNovelFindings) {
  return identityOk ? append(FINDINGS, findings) : { written: 0, skipped: 0 };
}

const PAGES = [
  { path: '/', label: 'home' },
  ...['pricing', 'events', 'how', 'contact', 'legal', 'refer', 'hire', 'talent', 'faq', 'about', 'blog', 'sample', 'startups', 'press', 'private']
    .map((label) => ({ path: `/${label}`, label })),
];

const KNOWN_MINOR = new Set([
  'a.nav_logo', 'a.footer_link',
  'g.dg-atlas-venue', 'g.dg-atlas-marker',
  '#footer-email', 'a.dg-footer-brand.w--current',
  'input.dg-atlas-search', 'select.dg-atlas-hiring-filter', 'button.dg-atlas-reset',
  'button.dg-ev-submit',
]);
// bare <a>/<button> nav+toggle items with no distinguishing class/id: Webflow-generated
// nav/footer links + map/list toggle, all confirmed sitewide at 44-48px, same family as
// a.nav_logo/a.footer_link above.
const KNOWN_MINOR_BARE = new Set([
  'a:Pricing', 'a:How it works', 'a:FAQ', 'a:Method', 'a:Compare', 'a:Pilot',
  'a:For startups', 'a:For talent', 'a:Refer talent', 'a:Partners', 'a:Notes', 'a:Events',
  'a:SF startup map', 'a:SF startup directory', 'a:About', 'a:Privacy & terms',
  'button:Map + list', 'button:Map', 'button:List',
  'label:Startups', 'label:Venues',
]);

async function sweep(page, url, label) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => window.__dgFootVer, { timeout: 20000 }).catch(() => {});
  await sleep(2000);

  // Inline helpers in the browser context (no eval/new Function — review eval-use).
  return page.evaluate((KNOWN_MINOR_ARR, KNOWN_MINOR_BARE_ARR) => {
    const selOf = (el) => {
      if (el.id) return '#' + el.id;
      // el.className is SVGAnimatedString on SVG — use getAttribute
      const cls = el.getAttribute('class');
      return (
        (el.tagName || '').toLowerCase() +
        (cls ? '.' + cls.split(' ').filter(Boolean).slice(0, 2).join('.') : '')
      );
    };
    const out = { footVer: String(window.__dgFootVer || ''), overflow: null, tapTargets: [], unlabeledInputs: [], liveRegions: [] };

    // 1. horizontal overflow
    const sw = document.documentElement.scrollWidth;
    const iw = window.innerWidth;
    if (sw > iw + 1) out.overflow = { scrollWidth: sw, innerWidth: iw, delta: sw - iw };

    // 2. tap targets below the project 48px mobile floor
    const isOffscreenClipped = (el, r) => {
      const st = getComputedStyle(el);
      if (st.position === 'absolute' || st.position === 'fixed') {
        if (r.right <= 0 || r.bottom <= 0 || r.left >= window.innerWidth) return true;
        if ((r.width <= 2 && r.height <= 2)) return true;
      }
      return false;
    };
    const isInlineExempt = (el) => {
      const st = getComputedStyle(el);
      if (!st.display.includes('inline')) return false;
      const ownText = (el.textContent || '').trim();
      return Boolean(ownText && el.closest('p'));
    };

    const tappable = document.querySelectorAll('a[href], button, summary, input, select, textarea, [role="button"], [onclick]');
    tappable.forEach((el) => {
      // checkbox/radio/range: the real tap target is the wrapping <label>, not the tiny
      // native control (a naive raw-rect check false-positives on every label-wrapped input).
      let measureEl = el;
      if (el.tagName === 'INPUT' && ['checkbox', 'radio', 'range'].includes((el.getAttribute('type') || '').toLowerCase())) {
        const label = (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) || el.closest('label');
        if (label) measureEl = label;
      }
      const r = measureEl.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return; // not rendered
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return;
      if (isOffscreenClipped(el, r)) return;
      if (isInlineExempt(el)) return;
      if (r.top > window.innerHeight * 3 || r.bottom < -window.innerHeight) return; // way off current scroll area, still same doc but skip absurd
      const minDim = Math.min(r.width, r.height);
      if (minDim < 47.5 && r.width > 2 && r.height > 2) {
        if (el.matches('.dg-ev-cal-cell') && r.width >= 24 && r.height >= 24) return;
        if (el.matches('.dg-blog-home-all,.dg-page-x') && r.width >= 24 && r.height >= 24 && (el.textContent || el.getAttribute('aria-label') || '').trim()) return;
        const sel = selOf(measureEl);
        const text = (measureEl.textContent || measureEl.getAttribute('aria-label') || '').trim().slice(0, 40);
        if (KNOWN_MINOR_ARR.includes(sel)) return;
        if (sel === measureEl.tagName.toLowerCase() && KNOWN_MINOR_BARE_ARR.includes(`${sel}:${text}`)) return;
        out.tapTargets.push({ sel, w: Math.round(r.width), h: Math.round(r.height), text });
      }
    });

    // 3. inputs missing label / aria-label
    const hasHiddenAncestor = (el) => {
      let p = el.parentElement;
      while (p) {
        const ps = getComputedStyle(p);
        if (ps.display === 'none' || ps.visibility === 'hidden') return true;
        p = p.parentElement;
      }
      return false;
    };
    document.querySelectorAll('input, select, textarea').forEach((el) => {
      const type = (el.getAttribute('type') || '').toLowerCase();
      if (type === 'hidden' || type === 'submit' || type === 'button') return;
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return;
      const r0 = el.getBoundingClientRect();
      if (r0.width < 1 || r0.height < 1) return; // e.g. closed modal, still in DOM
      if (hasHiddenAncestor(el)) return;
      const hasAriaLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
      const hasPlaceholderOnly = el.getAttribute('placeholder') && !hasAriaLabel;
      let hasLabel = false;
      if (el.id) hasLabel = !!document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (!hasLabel) {
        let p = el.parentElement;
        for (let i = 0; i < 3 && p; i++, p = p.parentElement) {
          if (p.tagName === 'LABEL') { hasLabel = true; break; }
        }
      }
      if (!hasLabel && !hasAriaLabel) {
        out.unlabeledInputs.push({ sel: selOf(el), type, placeholderOnly: !!hasPlaceholderOnly, name: el.getAttribute('name') || '' });
      }
    });

    // 4. live regions missing aria-live (dynamic status/alert containers)
    document.querySelectorAll('[role="status"], [role="alert"], .status, .live-region, [data-live]').forEach((el) => {
      if (!el.hasAttribute('aria-live') && el.getAttribute('role') !== 'status' && el.getAttribute('role') !== 'alert') {
        out.liveRegions.push({ sel: selOf(el), text: (el.textContent || '').trim().slice(0, 60) });
      }
    });

    return out;
  }, [...KNOWN_MINOR], [...KNOWN_MINOR_BARE]);
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
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
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  const results = {};
  for (const p of PAGES) {
    const url = `${LIVE_ORIGIN}${p.path}${p.path.includes('?') ? '&' : '?'}v=mobile-a11y-${Date.now()}`;
    results[p.label] = await sweep(page, url, p.label);
  }

  await page.close();
  await browser.disconnect();

  const findings = [];
  const at = new Date().toISOString();
  const expectedFootVer = (CORE.match(/__dgFootVer=['"](\d+)['"]/) || [])[1] || '';
  const localIdentityOk = !USE_LOCAL || Object.values(results).every((result) => result.footVer === expectedFootVer);
  for (const [label, r] of Object.entries(results)) {
    if (r.overflow) {
      findings.push({ at, task: 'mobile-a11y-sweep', finding: `horizontal overflow on ${label}: scrollWidth=${r.overflow.scrollWidth} innerWidth=${r.overflow.innerWidth} (+${r.overflow.delta}px)`, evidence: r.overflow, severity: 'medium' });
    }
    for (const t of r.tapTargets) {
      findings.push({ at, task: 'mobile-a11y-sweep', finding: `tap target under 48px on ${label}: ${t.sel} ${t.w}x${t.h} "${t.text}"`, evidence: t, severity: 'low' });
    }
    for (const i of r.unlabeledInputs) {
      findings.push({ at, task: 'mobile-a11y-sweep', finding: `input missing label/aria-label on ${label}: ${i.sel} type=${i.type} name="${i.name}"`, evidence: i, severity: 'medium' });
    }
    for (const l of r.liveRegions) {
      findings.push({ at, task: 'mobile-a11y-sweep', finding: `live region missing aria-live on ${label}: ${l.sel} "${l.text}"`, evidence: l, severity: 'medium' });
    }
  }

  fs.mkdirSync('/tmp/dg-busy', { recursive: true });
  // Never persist findings from the wrong runtime. A cached live asset once produced 69 false
  // positives; identity failure is evidence about the harness, not the website.
  const { written, skipped } = appendTrustedFindings(localIdentityOk, findings);
  const receipt = {
    at,
    task: 'mobile-a11y-sweep',
    viewport: '390x844',
    pagesChecked: PAGES.map((p) => p.label),
    findingsCount: findings.length,
    findingsNew: written,
    findingsKnown: skipped,
    localIdentityOk,
    results,
  };
  fs.writeFileSync(RECEIPT, JSON.stringify(receipt, null, 2));

  console.log(JSON.stringify({ findingsCount: findings.length, findingsNew: written, findingsKnown: skipped, localIdentityOk, results }, null, 2));
  if (findings.length || !localIdentityOk) process.exitCode = 1;
}

/* import.meta.main, not a bare argv check: an ungated --selftest block ends in exit(0), so any
   module that imports this one and is itself run with --selftest inherits a silent success
   having asserted nothing. demigod-seo-audit shipped that way and hijacked site-health. */
if (import.meta.main && process.argv.includes('--selftest')) {
  let called = false;
  const result = appendTrustedFindings(false, [{}], () => { called = true; return { written: 1, skipped: 0 }; });
  if (called || result.written !== 0 || result.skipped !== 0) throw new Error('identity failure must not write findings');
  console.log(JSON.stringify({ ok: true, selftest: 'mobile-findings-identity-gate' }));
} else {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
