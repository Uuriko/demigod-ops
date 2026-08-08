#!/usr/bin/env node
/**
 * Gate for the Dasha mark assets.
 *
 * Three things worth protecting, each of which has a real failure mode:
 *   - xmlns. Inline SVG in HTML inherits it; the same string loaded through <img src="data:...">
 *     or a favicon link is a standalone document and silently fails to render without it. This
 *     actually happened while drawing these.
 *   - self-containment. A mark that reaches for an external image or font breaks the moment it is
 *     pasted into Webflow or inlined as a data: URI.
 *   - legibility at 16px. A favicon that is a smudge at favicon size is not a favicon. Rendered and
 *     measured, not eyeballed: the mark must actually cover a sensible share of the tile.
 *
 *   node dasha-mark.test.mjs        # needs CDP Chrome on :9223
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const here = (f) => new URL(`./${f}`, import.meta.url);
const files = { 'dasha-mark.svg': await readFile(here('dasha-mark.svg'), 'utf8'),
  'dasha-favicon.svg': await readFile(here('dasha-favicon.svg'), 'utf8') };

for (const [name, svg] of Object.entries(files)) {
  assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/,
    `${name} has no xmlns — it renders inline but fails as a favicon or data: URI`);
  assert.ok(!/<image|xlink:href|url\(|@import|<script|<foreignObject/i.test(svg),
    `${name} reaches outside itself — it must be self-contained to survive being pasted or inlined`);
  assert.match(svg, /<title>/, `${name} has no <title> for assistive technology`);
}

// currentColor keeps one file usable on ink, on paper and in a single-colour context.
assert.match(files['dasha-mark.svg'], /currentColor/, 'the bare mark hardcodes a colour');
assert.ok(!/currentColor/.test(files['dasha-favicon.svg']),
  'the favicon must paint itself: currentColor resolves to the browser chrome colour');

/* The Studio inlines the favicon as a data: URI so it stays self-contained from file:// and from
   any host that serves it. That makes a second copy of the artwork, so it is re-derived here and
   compared: edit dasha-favicon.svg without updating the page and this fails, which is the whole
   point of allowing the copy at all. */
const minify = (svg) => svg.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim();
const studio = await readFile(here('dasha-meme-studio.html'), 'utf8');
const inlined = studio.match(/<link rel="icon" href="([^"]+)"/);
assert.ok(inlined, 'the Studio has no favicon');
assert.equal(decodeURIComponent(inlined[1].replace('data:image/svg+xml,', '')), minify(files['dasha-favicon.svg']),
  'the Studio\'s inlined favicon has drifted from dasha-favicon.svg — re-derive it from the SVG');

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
const page = await browser.newPage();
await page.goto('about:blank');

for (const [name, svg] of Object.entries(files)) {
  const painted = svg.replaceAll('currentColor', '#dfff00');
  const ink = await page.evaluate(async (source) => {
    const image = new Image();
    image.src = `data:image/svg+xml,${encodeURIComponent(source)}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, 16, 16);
    const { data } = ctx.getImageData(0, 0, 16, 16);
    let lit = 0;
    // The acid is the only bright-green thing in either file; count what a tab strip would show.
    for (let i = 0; i < data.length; i += 4) if (data[i] > 120 && data[i + 1] > 180 && data[i + 2] < 120) lit++;
    return { lit, total: 256 };
  }, painted);

  const share = ink.lit / ink.total;
  assert.ok(share > 0.10, `${name} renders only ${(share * 100).toFixed(1)}% mark at 16px — it will read as a smudge`);
  assert.ok(share < 0.75, `${name} floods ${(share * 100).toFixed(1)}% of the tile at 16px — no shape is left`);
}

await page.close();
await browser.disconnect();
console.log('Dasha mark: PASS (xmlns, self-contained, titled, currentColor split, legible at 16px)');
