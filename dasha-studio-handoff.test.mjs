import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sanitizeHandoffBody, handoffToStudioHash, handoffCardHtml } from './dasha-lobby-worker.mjs';
import { handoffOgPng } from './dasha-handoff-og.mjs';

const studio = await readFile(new URL('./dasha-meme-studio.html', import.meta.url), 'utf8');
assert.match(studio, /ensureHandoffUrl/, 'Studio missing handoff mint helper');
assert.match(studio, /studio\/handoff/, 'Studio missing handoff API path');
assert.match(studio, /handoff_mint/, 'Studio never tracks handoff mint');
assert.match(studio, /Pass-it-on link copied/, 'Studio lost handoff copy status');
assert.match(studio, /function surpriseMe/, 'Studio lost surprise');
assert.match(studio, /todaysRitual|ritual-today/, 'Studio lost Today ritual starter');
assert.match(studio, /nextSticker|STICKERS\[Math\.floor/, 'Surprise no longer rolls stickers');

const ok = sanitizeHandoffBody({
  look: 'poster',
  format: 'square',
  line: 'It’s time $dasha',
  effect: 'clean',
  sticker: '✦',
  src: 'home',
});
assert.equal(ok.look, 'poster');
assert.equal(ok.sticker, '✦');
assert.equal(ok.src, 'home');

assert.equal(sanitizeHandoffBody({ look: 'nope', format: 'square', line: 'x' }), null);
assert.equal(sanitizeHandoffBody({ look: 'poster', format: 'square', line: '' }), null);
assert.equal(sanitizeHandoffBody({ look: 'poster', format: 'square', line: 'hi', photo: 'https://evil.test/x.png' }), null);
assert.ok(sanitizeHandoffBody({ look: 'photo', format: 'story', line: 'Cmon', photo: 'hero', effect: 'fry' }));

const hash = handoffToStudioHash(ok);
assert.match(hash, /look=poster/);
assert.match(hash, /line=/);
assert.match(hash, /sticker=/);

const html = handoffCardHtml('abc123XYZ', ok);
assert.match(html, /og:title/);
assert.match(html, /og:image/);
assert.match(html, /twitter:card/);
assert.match(html, /Your turn/);
assert.match(html, /poster · square/i);
assert.match(html, /getdasha\.com\/studio#/);
assert.match(html, /\/h\/abc123XYZ\/og\.png/, 'handoff card lost dynamic OG PNG URL');
assert.doesNotMatch(html, /<script>.*eval/i);
assert.ok(!html.includes('<script src='));

const png = await handoffOgPng(ok);
assert.ok(png.byteLength > 800, 'OG PNG too small');
assert.ok(png.byteLength < 200_000, `OG PNG too large (${png.byteLength}) — compression missing?`);
assert.equal(png[0], 0x89);
assert.equal(png[1], 0x50);
assert.equal(png[2], 0x4e);
assert.equal(png[3], 0x47);

console.log('dasha studio handoff: sanitize, card HTML, OG PNG, ritual/surprise wiring OK');
