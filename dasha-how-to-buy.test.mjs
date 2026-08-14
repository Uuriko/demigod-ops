#!/usr/bin/env node
/**
 * How-to-buy disk gate. Route is live and crawlably linked from Home.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const html = readFileSync(join(__dirname, 'dasha-how-to-buy.html'), 'utf8');
const landing = readFileSync(join(__dirname, 'dasha-landing.html'), 'utf8');
const desk = readFileSync(join(__dirname, 'dasha-desk/src/body.html'), 'utf8');

assert.ok(html.includes(MINT), 'mint on how-to-buy');
assert.ok(html.includes('jup.ag/swap'), 'jupiter deep link');
assert.ok(!/pump\.fun|phantom\.com\/tokens|raydium\.io\/swap/i.test(html), 'extra transaction venues returned');
assert.ok(html.includes('DashaHowToBuy'), 'export for tests');
assert.ok(html.includes('/studio') && html.includes('/lobby') && html.includes('/verse'), 'footer loops to product surfaces');
assert.ok(!html.includes('t.me/dashacommunity'), 'no disallowed telegram');
assert.ok(!/can go to zero|not financial advice|\bNFA\b|rugcheck|warning|disclaimer|not an endorsement|never trust|wrong one|lookalike|fake token|token safe/i.test(html), 'negative coin copy returned');
for (const step of ['01', '02', '03']) assert.ok(html.includes(`data-n="${step}"`), `howto missing step ${step}`);
assert.ok(html.includes('id="buy-sticky"') || html.includes('buy-sticky'), 'howto sticky buy bar');
assert.ok(html.includes('SOL → match mint → swap') || html.includes('match mint'), 'howto concise lede');
assert.match(html, /property="og:image" content="https:\/\//, 'howto must have a share image');
assert.match(html, /name="twitter:card" content="summary_large_image"/, 'howto must declare a large X card');
assert.doesNotMatch(html, /application\/ld\+json|"@type"\s*:\s*"HowTo"/, 'retired HowTo structured data returned');
// One copy affordance is clearer than making both the code block and button perform the same action.
assert.ok(html.includes('user-select:all'), 'mint must remain selectable');
assert.equal((html.match(/id="copy"/g) || []).length, 1, 'howto must expose one primary mint-copy control');
assert.ok(!html.includes('copyFromCa'), 'duplicate tap-to-copy behavior returned to the mint code');
assert.ok(!/04 · Share|Copy share pack|Draft on X|buildSharePack/.test(html), 'no promo share ladder');
for (const bad of ['official Dasha', 'safe token', 'verified mint', 'endorsed by']) {
  assert.ok(!html.toLowerCase().includes(bad.toLowerCase()), `howto must not claim: ${bad}`);
}
assert.match(landing, /href=["']\/how-to-buy["']/, 'home must crawlably link live how-to-buy');
assert.ok(!/href=["']\/how-to-buy["']/.test(desk), 'desk must not primary-link how-to-buy');

const m = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(m, 'howto script');
const box = {
  window: {},
  document: {
    getElementById: () => null,
    createElement: () => ({}),
    body: { appendChild() {}, removeChild() {} },
  },
  navigator: {},
  URL,
  console,
};
box.window = box;
vm.runInNewContext(m[1], box, { filename: 'how-to-buy.html' });
const H = box.window.DashaHowToBuy || box.DashaHowToBuy;
assert.ok(H, 'DashaHowToBuy export');
assert.equal(H.CA, MINT);
assert.ok(H.BUY.includes(MINT) && /jup\.ag/.test(H.BUY), 'buy route lost exact mint');
assert.deepEqual(Object.keys(H).sort(), ['BUY', 'CA'], 'buy guide exports more than its one handoff needs');

console.log('dasha how-to-buy: PASS');
