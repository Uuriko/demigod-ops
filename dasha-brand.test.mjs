#!/usr/bin/env node
/**
 * Gate for the brand system itself.
 *
 * DASHA-ART-DIRECTION.md is only a document; this is what makes it binding. Two rules are enforced
 * because both are load-bearing and both would rot silently:
 *
 *   1. Every look carries the mark. Recognition comes from the same shape appearing on everything,
 *      so a look that quietly stops drawing it breaks the system without breaking anything visible.
 *   2. The CC0 dedication stays visible in the product. A licence nobody sees produces no remixes,
 *      which is the entire reason for granting it.
 *
 * The mark check measures pixels rather than grepping for drawMark(), because a call that draws
 * off-canvas, at zero size, or in the background colour would pass a text search and produce
 * nothing.
 *
 *   node dasha-brand.test.mjs        # needs CDP Chrome on :9223
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const here = (f) => new URL(`./${f}`, import.meta.url);
const html = await readFile(here('dasha-meme-studio.html'), 'utf8');

// ---- the dedication is stated where people actually are ---------------------
assert.match(html, /creativecommons\.org\/publicdomain\/zero\/1\.0/,
  'the Studio does not link the CC0 dedication — an unseen licence produces no remixes');
assert.match(html, /CC0 1\.0/, 'the Studio does not name the licence it is granting');
/* CC0 waives copyright only. Claiming more than that in public would be worse than not granting it,
   so the two carve-outs have to survive any future copy edit. */
assert.match(html, /not permission to pass work off as official/i,
  'the CC0 notice dropped its trademark carve-out');
assert.match(html, /Nekrasova/,
  'the CC0 notice dropped the publicity-rights carve-out for name and likeness');
assert.match(html, /🍒/, 'the typeable form of the mark is missing from the Studio');

const kit = await readFile(here('DASHA-KIT-LICENSE.md'), 'utf8');
assert.match(kit, /irrevocable/i, 'the dedication does not say it is irrevocable');
const legal = await readFile(here('LICENSE-KIT'), 'utf8');
assert.match(legal, /CC0 1\.0 Universal/, 'LICENSE-KIT is not the CC0 legal text');

const server = createServer((_, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
await page.setViewport({ width: 1280, height: 900 });
await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle2' });

/* Count the mark by rendering each look twice — once normally, once with drawMark stubbed out —
   and diffing. Anything else (colour sampling, template matching) either false-positives on the
   art or needs a reference image that would itself have to be maintained. */
const marked = await page.evaluate(async () => {
  const shot = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 200;
    c.getContext('2d').drawImage(canvas, 0, 0, 200, 200);
    return c.toDataURL();
  };
  const real = window.drawMark;
  const results = {};
  for (const option of LOOKS) {
    look = option;
    render(0);
    const withMark = shot();
    window.drawMark = () => {};
    render(0);
    const without = shot();
    window.drawMark = real;
    results[option.id] = withMark !== without;
  }
  look = LOOKS[0];
  render(0);
  return results;
});

for (const [id, hasMark] of Object.entries(marked)) {
  assert.equal(hasMark, true, `the "${id}" look does not draw the mark — the system only works if every look carries it`);
}

// The mark has to survive the downscale to GIF size, or it is decoration at export resolution.
const survives = await page.evaluate(() => {
  look = LOOKS.find((l) => l.id === 'poster');
  render(0);
  const small = document.createElement('canvas');
  small.width = small.height = 480;
  const sctx = small.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(canvas, 0, 0, 480, 480);
  // the poster's mark sits top-right; count paper-ish pixels in that corner
  const { data } = sctx.getImageData(400, 28, 70, 70);
  let lit = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] > 180 && data[i + 1] > 170) lit++;
  return lit;
});
assert.ok(survives > 120, `the mark nearly vanishes at GIF scale (${survives} lit pixels in its corner)`);

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors[0] || ''}`);
await page.close();
await browser.disconnect();
server.closeAllConnections();
server.close();
console.log('Dasha brand: PASS (mark on every look, survives GIF scale, CC0 stated with both carve-outs, 🍒 present)');
