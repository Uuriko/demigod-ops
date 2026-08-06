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
    await page.click('#tool button[type=submit]');
    await page.waitForSelector('#output:not([hidden])', { timeout: 8000 });
    const out = await page.evaluate(() => {
      const text = document.getElementById('receipt-text').textContent;
      const c = card(text.split('\n'), 'abc123');
      return { text, dims: [c.width, c.height] };
    });
    assert.match(out.text, /Not financial advice/, `@${width}px: generated receipt has no risk line`);
    assert.match(out.text, /Invalid if:/, `@${width}px: generated receipt has no invalidation`);
    assert.deepEqual(out.dims, [1200, 675], `@${width}px: share card is ${out.dims.join('x')}, expected 1200x675`);
    assert.deepEqual(pageErrors, [], `@${width}px: page errors: ${pageErrors[0] || ''}`);

    await page.close();
  }

  await browser.disconnect();
  console.log('Dasha landing gate: PASS (390 + 1440, axe, drift, tool, og)');
} finally { server.close(); }
