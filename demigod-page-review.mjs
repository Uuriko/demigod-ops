#!/usr/bin/env node
/**
 * Visual/density review of any page — the check nothing else here performs.
 *
 * axe reads the DOM, the honesty audit reads served HTML, the conversion audit reads CTAs. None of
 * them sees text sitting outside its box, a first screen that is all chrome, or a CTA below the
 * fold. Both live defects found on 2026-08-06 — a <span> chip rendering its text outside the pill,
 * and six FAQ accordions with no disclosure affordance — were invisible to every gate and obvious
 * in a screenshot.
 *
 * Written after hand-rolling the same inline script four times in one day. Works on ANY url, so it
 * covers a new landing page as readily as trydemigod.com.
 *
 *   node demigod-page-review.mjs --url=https://example.com
 *   node demigod-page-review.mjs --url=… --width=390        # single viewport
 *   node demigod-page-review.mjs --url=… --shots=/tmp/shots # keep screenshots
 *   node demigod-page-review.mjs --selftest                 # no network
 *
 * Reports per viewport: HTTP status, page errors, horizontal overflow, the vertical budget above
 * the primary CTA, and the largest single text block — which is what redirected a trim from the
 * paragraph I assumed was heaviest to the one that actually was.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const arg = (name, dflt = null) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
};

/** PURE: rank blocks by height so the biggest text block is obvious. Exported for the selftest. */
export function rankBlocks(blocks) {
  return [...(blocks || [])]
    .filter((b) => b && Number.isFinite(b.h) && b.h > 4 && !/dg-page-ctas|dg-page-top/.test(b.tag || ''))
    .sort((a, b) => b.h - a.h);
}

/** PURE: a first screen is "mostly chrome" when content starts below this share of the viewport. */
export function chromeShare(firstContentTop, viewportH) {
  if (!Number.isFinite(firstContentTop) || !Number.isFinite(viewportH) || viewportH <= 0) return null;
  return Math.round((firstContentTop / viewportH) * 100);
}

const IN_PAGE = `(() => {
  const card = document.querySelector('#dg-page .dg-page-card') || document.querySelector('main') || document.body;
  const kids = [...card.children].map((e) => ({
    tag: e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''),
    h: Math.round(e.getBoundingClientRect().height),
    chars: (e.textContent || '').replace(/\\s+/g, ' ').trim().length,
  }));
  const cta = [...document.querySelectorAll('a,button')].find((e) => {
    const r = e.getBoundingClientRect();
    return r.height > 20 && r.top > 0 && /start|brief|hire|join|sign|buy|get|share/i.test(e.textContent || '');
  });
  return {
    kids,
    chars: (document.body.innerText || '').replace(/\\s+/g, ' ').trim().length,
    xOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    firstCtaTop: cta ? Math.round(cta.getBoundingClientRect().top) : null,
    ctaText: cta ? (cta.textContent || '').trim().slice(0, 30) : null,
  };
})()`;

export async function review(url, { widths = [390, 1280], shots = null } = {}) {
  const puppeteer = (await import('puppeteer-core')).default;
  const { CDP_URL } = await import('./cdp-config.mjs');
  const browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const out = [];
  try {
    for (const width of widths) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e).slice(0, 90)));
      try {
        await page.setViewport({ width, height: width < 700 ? 844 : 900, deviceScaleFactor: 1 });
        const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
        await new Promise((r) => setTimeout(r, 1500));
        const data = await page.evaluate(IN_PAGE);
        const ranked = rankBlocks(data.kids);
        if (shots) {
          fs.mkdirSync(shots, { recursive: true });
          await page.screenshot({ path: path.join(shots, `review-${width}.png`) });
        }
        out.push({
          width,
          status: resp ? resp.status() : null,
          chars: data.chars,
          xOverflow: data.xOverflow,
          pageErrors: errors,
          firstCtaTop: data.firstCtaTop,
          ctaText: data.ctaText,
          ctaBelowFold: data.firstCtaTop == null ? null : data.firstCtaTop > (width < 700 ? 844 : 900),
          chromeSharePct: chromeShare(data.firstCtaTop, width < 700 ? 844 : 900),
          biggestBlock: ranked[0] || null,
          topBlocks: ranked.slice(0, 4),
        });
      } finally { await page.close(); }
    }
  } finally { await browser.disconnect(); }
  return out;
}

function selftest() {
  const assert = (c, m) => { if (!c) { console.error('FAIL: ' + m); process.exit(1); } };
  const ranked = rankBlocks([
    { tag: 'div.dg-page-ctas', h: 500 }, { tag: 'p.lead', h: 174 },
    { tag: 'p.small', h: 20 }, { tag: 'div.spacer', h: 2 }, null,
  ]);
  assert(ranked.length === 2, 'drops the CTA row, sub-5px blocks and nulls');
  assert(ranked[0].tag === 'p.lead', 'ranks by height, biggest first');
  assert(chromeShare(422, 844) === 50, 'chrome share is a percentage of viewport');
  assert(chromeShare(null, 844) === null, 'missing CTA yields null, not 0');
  assert(chromeShare(100, 0) === null, 'zero viewport yields null rather than dividing by zero');
  console.log(JSON.stringify({ ok: true, selftest: 'page-review' }));
}

if (isMain) {
  if (process.argv.includes('--selftest')) selftest();
  else {
    const url = arg('url');
    if (!url) { console.error('usage: node demigod-page-review.mjs --url=https://… [--width=390] [--shots=DIR]'); process.exit(2); }
    const w = arg('width');
    const res = await review(url, { widths: w ? [Number(w)] : [390, 1280], shots: arg('shots') });
    for (const r of res) {
      console.log(`\n${url}  @${r.width}px  HTTP ${r.status}`);
      console.log(`  text ${r.chars} chars · x-overflow ${r.xOverflow ? 'YES' : 'no'} · page errors ${r.pageErrors.length}`);
      if (r.pageErrors.length) r.pageErrors.slice(0, 2).forEach((e) => console.log(`    ! ${e}`));
      console.log(`  first CTA "${r.ctaText || '—'}" at ${r.firstCtaTop ?? '—'}px${r.ctaBelowFold ? '  <-- BELOW THE FOLD' : ''}${r.chromeSharePct != null ? ` (${r.chromeSharePct}% of viewport above it)` : ''}`);
      if (r.biggestBlock) console.log(`  biggest block ${r.biggestBlock.h}px ${r.biggestBlock.tag} (${r.biggestBlock.chars} chars)`);
      r.topBlocks.slice(1).forEach((b) => console.log(`                ${b.h}px ${b.tag} (${b.chars} chars)`));
    }
  }
}
