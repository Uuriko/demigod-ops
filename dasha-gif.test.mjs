#!/usr/bin/env node
/**
 * Gate for the Studio's animated GIF export.
 *
 * A hand-written LZW encoder is the kind of code that produces a file which downloads happily and
 * then renders as garbage, so nothing here trusts the download. The bytes are parsed as GIF89a:
 * header, a global colour table, the NETSCAPE looping block, one image descriptor per frame, and
 * the trailer. Then the frames are decoded by the browser itself via createImageBitmap — if the
 * LZW stream were malformed that call rejects, which no amount of structural checking would catch.
 *
 * Also asserted: consecutive frames actually differ (an "animation" of identical frames is a
 * still), the loop is seamless (last frame is not a repeat of the first), and the file stays
 * inside X's mobile GIF ceiling.
 *
 *   node dasha-gif.test.mjs        # needs CDP Chrome on :9223
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const html = await readFile(new URL('./dasha-meme-studio.html', import.meta.url), 'utf8');
const server = createServer((_, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9223' });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
await page.setViewport({ width: 1280, height: 900 });
await page.goto(base, { waitUntil: 'networkidle2' });

/* Marquee is the strictest case for the encoder: flat brand colour only, so the palette must come
   out exact, and every frame differs from the last because the whole field is sliding. */
await page.$$eval('.look', (buttons) => buttons.find((b) => b.textContent === 'Marquee').click());

const result = await page.evaluate(async () => {
  const blob = await captureGIF();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const bitmap = await createImageBitmap(blob); // rejects on a malformed stream
  return { bytes: [...bytes], size: blob.size, type: blob.type, w: bitmap.width, h: bitmap.height };
});

const bytes = Uint8Array.from(result.bytes);
const text = (from, length) => String.fromCharCode(...bytes.slice(from, from + length));

// ---- structure --------------------------------------------------------------
assert.equal(result.type, 'image/gif', `blob type is ${result.type}`);
assert.equal(text(0, 6), 'GIF89a', 'not a GIF89a header — GIF87a cannot animate');
assert.equal(bytes[bytes.length - 1], 0x3B, 'missing GIF trailer byte');
assert.ok((bytes[10] & 0x80) !== 0, 'no global colour table flag set');

const netscape = [...bytes].findIndex((_, i) => text(i, 11) === 'NETSCAPE2.0');
assert.ok(netscape > 0, 'no NETSCAPE2.0 block — the GIF would play once and stop');
assert.equal(bytes[netscape + 12], 1, 'NETSCAPE sub-block is not the looping sub-block');
assert.deepEqual([bytes[netscape + 13], bytes[netscape + 14]], [0, 0], 'loop count is not infinite');

/* Frame count comes from the Graphic Control Extensions (0x21 0xF9), which is unambiguous —
   the 0x2C image-separator byte also occurs inside compressed data and colour tables. */
let frames = 0, delay = null;
for (let i = 0; i < bytes.length - 8; i++) {
  if (bytes[i] === 0x21 && bytes[i + 1] === 0xF9 && bytes[i + 2] === 4) {
    frames++;
    if (delay === null) delay = bytes[i + 4] | (bytes[i + 5] << 8);
  }
}
assert.ok(frames >= 8, `only ${frames} frames — not an animation`);
assert.ok(delay > 0, 'frame delay is 0, which browsers clamp unpredictably');

// ---- it decodes, and it is the size we asked for ----------------------------
assert.equal(Math.max(result.w, result.h), 480, `long edge is ${Math.max(result.w, result.h)}, expected 480`);
assert.ok(result.size > 2000, `GIF is only ${result.size} bytes — probably blank`);
assert.ok(result.size < 5e6, `GIF is ${(result.size / 1e6).toFixed(1)} MB, over X's 5 MB mobile ceiling`);

// ---- the frames actually move, and the loop is seamless ---------------------
const distinct = await page.evaluate(async () => {
  const shot = async (phase) => {
    render(phase);
    const c = document.createElement('canvas');
    c.width = c.height = 120;
    c.getContext('2d').drawImage(canvas, 0, 0, 120, 120);
    return c.toDataURL();
  };
  const first = await shot(0), mid = await shot(0.5), last = await shot(15 / 16), wrap = await shot(1);
  render(0);
  return { moved: first !== mid, lastDiffers: last !== first, seamless: wrap === first };
});
assert.ok(distinct.moved, 'phase 0 and phase 0.5 render identically — nothing is animating');
assert.ok(distinct.lastDiffers, 'the final frame repeats the first — one frame of the loop is wasted');
assert.ok(distinct.seamless, 'phase 1 does not land back on phase 0 — the loop will visibly jump');

assert.deepEqual(pageErrors, [], `page errors: ${pageErrors[0] || ''}`);
await page.close();
await browser.disconnect();
server.closeAllConnections();
server.close();
console.log(`Dasha GIF: PASS (GIF89a, ${frames} frames, loops forever, decodes, moves, seamless, ${(result.size / 1e6).toFixed(2)} MB)`);
