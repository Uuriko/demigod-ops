#!/usr/bin/env node
/** Mobile + a11y sweep @ 390x844: overflow, tap targets, unlabeled inputs, missing live regions. */
import fs from 'fs';
import puppeteer from 'puppeteer-core';
import { CDP_URL } from './cdp-config.mjs';
import { LIVE_ORIGIN, appendNovelFindings } from './demigod-live-lib.mjs';

const FINDINGS = '/tmp/dg-busy/dg-findings.jsonl';
const RECEIPT = '/tmp/dg-busy/claude-yolo-last.json';
const USE_LOCAL = process.argv.includes('--local');
const CORE = USE_LOCAL ? fs.readFileSync('demigod-foot-core.js', 'utf8') : '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = [
  { path: '/', label: 'home' },
  { path: '/?p=events', label: 'events' },
  { path: '/?p=mud', label: 'mud' },
];

async function sweep(page, url, label) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__dgFootVer, { timeout: 20000 }).catch(() => {});
  await sleep(1500);

  return page.evaluate(() => {
    const out = { overflow: null, tapTargets: [], unlabeledInputs: [], missingLiveRegions: [] };

    const sw = document.documentElement.scrollWidth;
    const iw = window.innerWidth;
    if (sw > iw + 1) {
      let worst = null;
      document.querySelectorAll('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > iw + 1 && r.width > 0) {
          if (!worst || r.right > worst.right) {
            const cls = el.getAttribute('class');
            worst = { right: Math.round(r.right), sel: el.id ? '#' + el.id : cls ? '.' + cls.split(' ').filter(Boolean).join('.') : el.tagName.toLowerCase() };
          }
        }
      });
      out.overflow = { scrollWidth: sw, innerWidth: iw, worstOffender: worst };
    }

    const KNOWN_MINOR = ['a.nav_logo', 'a.footer_link'];
    document.querySelectorAll('a,button,input[type=button],input[type=submit],[role=button],[onclick]').forEach((el) => {
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      if (r.height < 44 || r.width < 44) {
        if (el.matches('.dg-ev-cal-cell') && r.width >= 24 && r.height >= 24) return;
        if (el.matches('.dg-blog-home-all,.dg-page-x') && r.width >= 24 && r.height >= 24 && (el.textContent || el.getAttribute('aria-label') || '').trim()) return;
        // WCAG 2.5.8 inline exception: a link inside a sentence of text is exempt.
        if (st.display.includes('inline')) {
          const ownText = (el.textContent || '').trim();
          if (ownText && el.closest('p')) return;
        }
        const cls = el.getAttribute('class');
        const sel = el.id ? '#' + el.id : (el.tagName.toLowerCase() + (cls ? '.' + cls.split(' ').filter(Boolean).slice(0, 2).join('.') : ''));
        if (KNOWN_MINOR.some((k) => sel.startsWith(k))) return;
        out.tapTargets.push({
          sel,
          text: (el.textContent || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height),
        });
      }
    });

    document.querySelectorAll('input,select,textarea').forEach((el) => {
      if (el.type === 'hidden') return;
      const st = getComputedStyle(el);
      if (st.display === 'none') return;
      const hasLabel = el.id && document.querySelector(`label[for="${el.id}"]`);
      const hasAria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
      const wrappedInLabel = el.closest('label');
      const hasPlaceholderOnly = el.placeholder && !hasLabel && !hasAria && !wrappedInLabel;
      if (!hasLabel && !hasAria && !wrappedInLabel) {
        out.unlabeledInputs.push({
          sel: el.id ? '#' + el.id : (el.name ? `${el.tagName.toLowerCase()}[name=${el.name}]` : el.tagName.toLowerCase()),
          type: el.type || el.tagName.toLowerCase(),
          placeholderOnly: !!hasPlaceholderOnly,
        });
      }
    });

    document.querySelectorAll('[data-dg-toast],[class*=toast],[class*=Toast],[id*=toast],[class*=alert]:not([role]),[class*=status]:not([role])').forEach((el) => {
      // SVG className is SVGAnimatedString; String(el.className) → "[object SVGAnimatedString]" and floods noise.
      // Decorative icons inside <svg> are not toast/status surfaces.
      if (el.closest('svg')) return;
      if (!el.hasAttribute('aria-live') && el.getAttribute('role') !== 'status' && el.getAttribute('role') !== 'alert') {
        const cls = el.getAttribute('class') || '';
        const token = cls.split(/\s+/).filter(Boolean)[0];
        out.missingLiveRegions.push({
          sel: el.id ? '#' + el.id : (token ? '.' + token : el.tagName.toLowerCase()),
        });
      }
    });

    return out;
  });
}

async function main() {
  const browser = await puppeteer.connect({ browserURL: CDP_URL, protocolTimeout: 120000 });
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  if (USE_LOCAL) {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (/foot-latest\.js(?:[?#]|$)|demigod-foot/i.test(url) || (/catbox|jsdelivr/i.test(url) && /foot.*\.js(?:[?#]|$)/i.test(url))) {
        req.respond({ status: 200, contentType: 'application/javascript', body: CORE }).catch(() => {});
      } else req.continue().catch(() => {});
    });
  }

  const results = {};
  for (const p of PAGES) {
    const url = `${LIVE_ORIGIN}${p.path}${p.path.includes('?') ? '&' : '?'}v=a11y-${Date.now()}`;
    results[p.label] = await sweep(page, url, p.label);
  }

  await page.close();
  await browser.disconnect();

  const findings = [];
  const at = new Date().toISOString();
  for (const [label, r] of Object.entries(results)) {
    if (r.overflow) {
      findings.push({ at, task: 'mobile-a11y-sweep', finding: `horizontal overflow on ${label}: scrollWidth=${r.overflow.scrollWidth} > innerWidth=${r.overflow.innerWidth}, worst offender ${r.overflow.worstOffender?.sel} (right=${r.overflow.worstOffender?.right})`, evidence: r.overflow, severity: 'medium' });
    }
    for (const t of r.tapTargets) {
      findings.push({ at, task: 'mobile-a11y-sweep', finding: `tap target <44px on ${label}: ${t.sel} "${t.text}" is ${t.w}x${t.h}`, evidence: t, severity: 'low' });
    }
    for (const u of r.unlabeledInputs) {
      findings.push({ at, task: 'mobile-a11y-sweep', finding: `input missing label/aria-label on ${label}: ${u.sel} (type=${u.type}${u.placeholderOnly ? ', placeholder-only' : ''})`, evidence: u, severity: u.placeholderOnly ? 'medium' : 'high' });
    }
    for (const m of r.missingLiveRegions) {
      findings.push({ at, task: 'mobile-a11y-sweep', finding: `status/toast-like element missing aria-live on ${label}: ${m.sel}`, evidence: m, severity: 'low' });
    }
  }

  fs.mkdirSync('/tmp/dg-busy', { recursive: true });
  // Dedupe vs existing jsonl — same known taps were re-appending every run (1415 lines / 192 unique).
  const { written, skipped } = appendNovelFindings(FINDINGS, findings);
  const receipt = {
    at,
    task: 'mobile-a11y-sweep',
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
