import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sanitizeHandoffBody, handoffToStudioHash, handoffCardHtml } from './dasha-lobby-worker.mjs';
import { handoffOgPng } from './dasha-handoff-og.mjs';

const studio = await readFile(new URL('./dasha-meme-studio.html', import.meta.url), 'utf8');
assert.match(studio, /ensureHandoffUrl/, 'Studio missing handoff mint helper');
assert.match(studio, /studio\/handoff/, 'Studio missing handoff API path');
assert.match(studio, /handoff_mint/, 'Studio never tracks handoff mint');
assert.match(studio, /Pass-it-on link copied/, 'Studio lost handoff copy status');
assert.match(studio, /function handoffCopiedOk/, 'copy-link must verify clipboard');
assert.match(studio, /function forumDraftUrl/, 'Studio lost its Forum draft handoff');
assert.match(studio, /getdasha\.com\/lobby#\$\{params\}/, 'Forum draft must stay in the URL fragment');
assert.doesNotMatch(studio, /Copy post text/, 'redundant post-text action returned');
assert.match(studio, /X did not open/, 'share must not claim an X tab that did not open');
assert.doesNotMatch(studio, /\+simp|earn points|points for shar/i, 'C11: share must not award points');
{
  const body = studio.match(/function handoffCopiedOk\(got, want\) \{\s*return ([^;]+);/);
  assert.ok(body, 'handoffCopiedOk body');
  const handoffCopiedOk = new Function('got', 'want', `return ${body[1]};`);
  const url = 'https://lobby.getdasha.com/h/abc123XYZ';
  assert.equal(handoffCopiedOk(url, url), true);
  assert.equal(handoffCopiedOk(url + 'x', url), false);
  assert.equal(handoffCopiedOk('', url), false);
}
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
assert.match(html, /location\.replace/, 'human handoff card must auto-open Studio');
assert.doesNotMatch(html, /<script>.*eval/i);
assert.ok(!html.includes('<script src='));
const botHtml = handoffCardHtml('abc123XYZ', ok, { autoRedirect: false });
assert.doesNotMatch(botHtml, /location\.replace/, 'bot card must stay on OG page');
assert.match(botHtml, /Open Studio/);

const png = await handoffOgPng(ok);
assert.ok(png.byteLength > 800, 'OG PNG too small');
assert.ok(png.byteLength < 200_000, `OG PNG too large (${png.byteLength}) — compression missing?`);
assert.equal(png[0], 0x89);
assert.equal(png[1], 0x50);
assert.equal(png[2], 0x4e);
assert.equal(png[3], 0x47);

// Long line still produces a card (wrap + hard-split, not empty field)
const longPng = await handoffOgPng({
  look: 'signal',
  format: 'story',
  line: 'Friday in the 4HL you can really feel the pull of the weekend and then some more words',
  sticker: '🍒',
});
assert.ok(longPng.byteLength > 1500, 'long-line OG PNG empty-ish');
assert.ok(longPng.byteLength < 200_000);

// Acid brand bar: sample bottom-center must be acid-yellow-ish after decode is heavy;
// instead assert IHDR is 600×314 (fixed public OG size)
assert.equal(png[16] << 24 | png[17] << 16 | png[18] << 8 | png[19], 600);
assert.equal(png[20] << 24 | png[21] << 16 | png[22] << 8 | png[23], 314);

console.log('dasha studio handoff: sanitize, card HTML, OG PNG, ritual/surprise wiring OK');
