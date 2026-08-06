#!/usr/bin/env node
/**
 * Landing-page gate. Turns the Phase 0 exit criteria in DASHA-ROADMAP.md into a runnable check.
 *
 * Everything here was verified by hand on 2026-08-06 and would otherwise rot: axe, overflow, the
 * telegram removal, indexable content, link labels, og:image dimensions, and whether the inlined
 * tool still works. A hand check is a memory, not a gate.
 *
 * Widths are 390 and 1440 because those are the two the exit gate names.
 *
 *   node dasha-landing.test.mjs        # needs CDP Chrome on :9223
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';

const require = createRequire(import.meta.url);
const here = (f) => new URL(`./${f}`, import.meta.url);
const landing = await readFile(here('dasha-landing.html'), 'utf8');
const standalone = await readFile(here('dasha-conviction-receipt.html'), 'utf8');
const ogPng = await readFile(here('dasha-og-card.png'));

let axeSrc;
try { axeSrc = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8'); }
catch { axeSrc = await readFile(require.resolve('@axe-core/cli/node_modules/axe-core/axe.min.js'), 'utf8'); }

/* PURE: the tool's FORM markup, normalised. The script check below missed a real divergence —
   I fixed two link aria-labels in the landing copy and left the standalone unlabelled, and
   nothing noticed because that is markup, not script. Scoped to the form region because the two
   files legitimately differ everywhere else: one has its own <head>, the other a hero and footer. */
export function toolForm(html) {
  // The whole inlined region, not just <form>. First attempt compared form-to-/form and did NOT
  // catch the divergence it was written for: #share and #inspect live in the #output section,
  // outside the form. Proved by breaking it. Standalone wraps this in <main class="receipt">;
  // the landing page wraps the identical content in <div class="toolhost">.
  // Anchor on the form, not the eyebrow: the landing page has its OWN <p class="eyebrow"> in the
  // hero, so indexOf found that one and extracted the whole hero-to-tool span. Caught by the test
  // failing on an unmodified pair. <form id="receipt-form"> is unambiguous in both files, and the
  // range still covers #output where the share/inspect links live.
  const start = html.indexOf('<form id="receipt-form"');
  const end = html.indexOf('</section>', html.indexOf('id="output"'));
  if (start < 0 || end < 0) return '';
  return html.slice(start, end + 10).replace(/\s+/g, ' ').trim();
}

/** PURE: the tool's script, normalised, so the two copies can be compared. */
export function toolScript(html) {
  const m = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]);
  const body = m.find((x) => /receipt-form/.test(x)) || '';
  return body.replace(/\s+/g, ' ').trim();
}

const server = createServer((_, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(landing);
});
// listen() is async — reading address() before the bind resolves returns null.
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

try {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });

  // ---- drift: the inlined copy must match the standalone -------------------
  const a = toolScript(landing);
  const b = toolScript(standalone);
  assert.ok(a.length > 400, `landing page has no inlined tool script (got ${a.length} chars)`);
  assert.equal(a, b,
    'dasha-landing.html and dasha-conviction-receipt.html hold DIFFERENT tool scripts — '
    + 'one was edited without the other. Re-inline from the standalone.');

  const fa = toolForm(landing);
  const fb = toolForm(standalone);
  assert.ok(fa.length > 200, `landing page has no inlined tool form (got ${fa.length} chars)`);
  assert.equal(fa, fb,
    'dasha-landing.html and dasha-conviction-receipt.html hold DIFFERENT tool FORM markup — '
    + 'an attribute, label or field changed in one copy only.');

  /* ---- asset + palette parity across the two copies -------------------------
     These exist because three of the standalone's edits were String.replace() against
     remembered markup, and a non-matching pattern returns the original and throws
     nothing. Nothing in either suite had an opinion on the result. */
  const iconOf = (h) => (h.match(/<link rel="icon" href="([^"]*)"/) || [])[1] || '';
  assert.ok(iconOf(landing).startsWith('data:image/svg+xml,'), 'landing page has no inline SVG favicon');
  assert.equal(iconOf(landing), iconOf(standalone),
    'the two copies carry DIFFERENT favicons — one was recoloured without the other.');

  // The tool CSS used to re-declare :root AFTER the page's own, silently winning every
  // variable and making the page immune to its own stylesheet. One block per file or it
  // can come back.
  for (const [name, html] of [['landing', landing], ['standalone', standalone]]) {
    const roots = (html.match(/:root\s*\{/g) || []).length;
    assert.equal(roots, 1, `${name} declares :root ${roots} times — a later block overrides the palette`);
  }

  // The 2026-08-06 palette migration was case-sensitive; these are the colours it replaced.
  for (const [name, html] of [['landing', landing], ['standalone', standalone]]) {
    const stale = ['08090b', '121419', '292d36', 'f4f5f7', 'a9afbc', 'd8ff52', 'ffb4a8', '0b0d11', '101300', '0d0f13']
      .filter((c) => new RegExp(c, 'i').test(html));
    assert.deepEqual(stale, [], `${name} still carries pre-overhaul palette hex: ${stale.join(', ')}`);
  }

  for (const width of [390, 1440]) {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await page.setViewport({ width, height: 900 });
    await page.goto(base, { waitUntil: 'networkidle2' });

    const doc = await page.evaluate(() => {
      const strip = document.documentElement.outerHTML
        .replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
      const meta = (sel, attr = 'content') => document.querySelector(sel)?.getAttribute(attr) || '';
      return {
        telegram: /t\.me\/dashacommunity/.test(document.documentElement.outerHTML),
        indexable: strip.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        lang: document.documentElement.lang,
        canonical: meta('link[rel=canonical]', 'href'),
        ogUrl: meta('meta[property="og:url"]'),
        ogImage: meta('meta[property="og:image"]'),
        ogW: meta('meta[property="og:image:width"]'),
        ogH: meta('meta[property="og:image:height"]'),
        blankNoName: [...document.querySelectorAll('a[target="_blank"]')]
          .filter((el) => !/new tab|new window/i.test(el.getAttribute('aria-label') || el.textContent || ''))
          .map((el) => el.id || el.textContent.trim().slice(0, 20)),
      };
    });

    assert.equal(doc.telegram, false, `@${width}px: t.me/dashacommunity is present — Phase 0 gate item 1`);
    assert.ok(doc.indexable > 2000, `@${width}px: only ${doc.indexable} indexable chars in the top-level document`);
    assert.equal(doc.overflow, false, `@${width}px: horizontal overflow`);
    assert.equal(doc.lang, 'en', `@${width}px: <html lang> is "${doc.lang}"`);
    for (const [name, v] of [['canonical', doc.canonical], ['og:url', doc.ogUrl], ['og:image', doc.ogImage]]) {
      assert.ok(/^https:\/\//.test(v), `@${width}px: ${name} must be an absolute https URL, got "${v}"`);
    }
    // Against the PNG's own header, not against the markup — checking markup with markup proves nothing.
    assert.equal(Number(doc.ogW), ogPng.readUInt32BE(16), `og:image:width disagrees with the PNG header`);
    assert.equal(Number(doc.ogH), ogPng.readUInt32BE(20), `og:image:height disagrees with the PNG header`);
    assert.deepEqual(doc.blankNoName, [],
      `@${width}px: link(s) open a new tab without saying so in the accessible name: ${doc.blankNoName.join(', ')}`);

    // ---- axe, with proof it actually ran -----------------------------------
    await page.addScriptTag({ content: axeSrc });
    const axeRes = await page.evaluate(async () => {
      const r = await axe.run(document, {});
      return { rules: r.passes.length + r.inapplicable.length,
        bad: r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id} (${v.nodes.length})`) };
    });
    assert.ok(axeRes.rules > 30, `axe evaluated only ${axeRes.rules} rules — the harness did not really run`);
    assert.deepEqual(axeRes.bad, [], `@${width}px: serious/critical axe violations: ${axeRes.bad.join(', ')}`);

    // ---- the inlined tool must actually work, not merely exist -------------
    await page.type('#address', '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump');
    await page.type('#thesis', 'Depth improves after listing.');
    await page.type('#invalidation', 'Depth under 50k for three days.');
    await page.$eval('#resolution', (node) => { node.value = '2099-12-31'; });
    await page.click('#tool button[type=submit]');
    await page.waitForSelector('#output:not([hidden])', { timeout: 8000 });
    const out = await page.evaluate(() => {
      const text = document.getElementById('receipt-text').textContent;
      const c = card(text.split('\n'), 'abc123');
      return { text, fingerprint: document.getElementById('fingerprint').textContent,
        calendar: calendar('2099-12-31', '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump', 'Depth improves', 'Depth falls'),
        dims: [c.width, c.height] };
    });
    assert.match(out.text, /Not financial advice/, `@${width}px: generated receipt has no risk line`);
    assert.match(out.text, /Invalid if:/, `@${width}px: generated receipt has no invalidation`);
    assert.match(out.text, /Device time:/, `@${width}px: generated receipt mislabels device time`);
    assert.match(out.text, /Resolve on: 2099-12-31/, `@${width}px: generated receipt has no exact resolution date`);
    assert.match(out.calendar, /DTSTART;VALUE=DATE:20991231/, `@${width}px: calendar reminder has the wrong date`);
    assert.match(out.fingerprint, /[0-9a-f]{64}$/, `@${width}px: full SHA-256 checksum is not displayed`);
    assert.deepEqual(out.dims, [1200, 675], `@${width}px: share card is ${out.dims.join('x')}, expected 1200x675`);
    assert.deepEqual(pageErrors, [], `@${width}px: page errors: ${pageErrors[0] || ''}`);

    await page.close();
  }

  await browser.disconnect();
  console.log('Dasha landing gate: PASS (390 + 1440, axe, drift, tool, og)');
} finally { server.close(); }
