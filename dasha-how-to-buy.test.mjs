#!/usr/bin/env node
/**
 * How-to-buy conversion gate — deterministic disk + VM checks.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const html = readFileSync(join(__dirname, 'dasha-how-to-buy.html'), 'utf8');
assert.ok(html.includes(MINT), 'mint on how-to-buy');
assert.ok(html.includes('jup.ag/swap'), 'jupiter deep link');
assert.equal((html.match(/<a\b[^>]*href="https:\/\/jup\.ag\/swap\?/g) || []).length, 1,
  'how-to-buy must expose exactly one Jupiter action');
assert.doesNotMatch(html, /buy-sticky/, 'retired sticky Buy must not compete with step 03');
assert.ok(html.includes('DashaHowToBuy'), 'export for tests');
assert.ok(html.includes('/dasha') && html.includes('/studio'), 'nav loops to product surfaces');
for (const step of ['data-n="01"', 'data-n="02"', 'data-n="03"']) assert.ok(html.includes(step), `missing buyer step: ${step}`);
assert.doesNotMatch(html, /application\/ld\+json|"@type"\s*:\s*"HowTo"/, 'retired HowTo structured data returned');
assert.ok(html.includes('user-select:all'), 'mint must remain selectable');
assert.ok(html.includes('.source a{display:inline-flex;align-items:center;min-height:44px}'), 'source links must remain 44px touch targets');
assert.ok(!/04 · Share|Copy share pack|Draft on X|buildSharePack/.test(html), 'promotion leaked into the four-step buy path');
assert.ok(!html.includes('t.me/dashacommunity'), 'no disallowed telegram');
assert.ok(html.includes('id="mint-check"') && html.includes('id="mint-check-out"'), 'how-to-buy must expose the paste-to-compare mint check');
assert.ok(html.includes('Is this the mint?'), 'mint-check label missing');
assert.match(html, /class="skip-link" href="#ca"/, 'how-to-buy first visit must skip chrome to the mint');
assert.match(html, /Dasha \(VVAIFU\)/, 'must name the CoinGecko ticker collision so buyers do not treat VVAIFU as this mint');
assert.ok(!html.toLowerCase().includes('coingecko.com/en/coins/dasha'), 'must not send buyers to the VVAIFU listing');
assert.doesNotMatch(html, /#ffc857/i, 'no invented warn-yellow on how-to-buy (art direction bans a new yellow)');
assert.match(html, /Supply<\/dt><dd>999,831,949 · observed 18 Aug 2026<\/dd>/,
  'supply must be a dated observation, not an unchanging promise');
assert.match(html, /Holders can still burn their own tokens, which lowers total supply\./,
  'revoked mint authority must not be mistaken for a supply that cannot decrease');
assert.doesNotMatch(html, /999,831,949[^<]*\bfixed\b/i, 'burnable supply must not be labeled fixed');

/* The worker tree keeps its own copy of this page and the deploy reads THAT one, so whenever the two
   differ the live page is whatever the copy says and every check above is testing a file nobody
   serves. It has bitten twice on 2026-08-09: once shipping a stale card and no structured data while
   this repo believed it had both, and once silently reverting the search description and the HowTo
   block minutes after they went live. The copy is allowed to exist — the worker tree deploys
   standalone — it is just not allowed to drift. Skipped when the tree is absent so this still runs
   on a clean checkout. */
const workerCopy = join(__dirname, '.grok/worktrees/potter/dasha/dasha-how-to-buy.html');
if (existsSync(workerCopy)) {
  assert.equal(readFileSync(workerCopy, 'utf8'), html,
    'the worker tree copy of dasha-how-to-buy.html has drifted from this one — it is the copy that actually ships, so fix it before deploying: cp dasha-how-to-buy.html .grok/worktrees/potter/dasha/');
}
for (const bad of ['official Dasha', 'safe token', 'verified mint', 'endorsed by']) {
  assert.ok(!html.toLowerCase().includes(bad.toLowerCase()), `howto must not claim: ${bad}`);
}
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
assert.ok(H.BUY.includes(MINT) && /jup\.ag/.test(H.BUY), 'buy export lost exact Jupiter route');
assert.equal(typeof H.mintCopiedOk, 'function', 'copy helper must be the shipped function');
assert.equal(H.mintCopiedOk(MINT, MINT), true);
assert.equal(H.mintCopiedOk(MINT + '\n', MINT), true, 'trailing whitespace from select-all is still our mint');
assert.equal(H.mintCopiedOk('', MINT), false);
assert.equal(H.mintCopiedOk(MINT.slice(0, -4) + 'XXXX', MINT), false, 'last-4 vanity is not the mint');
assert.equal(H.mintCopiedOk(MINT.slice(0, 4) + 'xxxx' + MINT.slice(-4), MINT), false, 'first+last-4 poison is not the mint');
assert.equal(typeof H.normalizeMint, 'function', 'must drive the shipped normalizeMint');
assert.equal(typeof H.checkMint, 'function', 'must drive the shipped checkMint');
assert.equal(H.normalizeMint(MINT), MINT);
assert.equal(H.normalizeMint('  ' + MINT + '  '), MINT);
assert.equal(H.normalizeMint('https://solscan.io/token/' + MINT), MINT);
assert.equal(H.normalizeMint('https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=' + MINT), MINT);
assert.equal(H.normalizeMint('\u200b' + MINT), MINT);
assert.equal(H.checkMint('').state, 'empty');
assert.equal(H.checkMint(MINT).state, 'ok');
assert.equal(H.checkMint('11111111111111111111111111111111').state, 'bad');
assert.equal(H.checkMint('VVAIFU').state, 'warn');
assert.equal(H.checkMint(MINT.slice(0, -4) + 'XXXX').state, 'bad', 'last-4 vanity is not an exact match');
assert.match(H.checkMint(MINT).message, /associated mint/i);
assert.equal(H.CA, MINT);
assert.ok(H.BUY.includes(MINT) && H.BUY.includes('jup.ag/swap') && H.BUY.includes('sell=So11111111111111111111111111111111111111112'), 'Buy export must stay SOL → exact mint Jupiter');
assert.match(html, /Last four characters are not enough/, 'buy path must warn last-4 is not a match');
assert.doesNotMatch(html, /verified mint|safe token/i);

console.log('dasha how-to-buy: PASS [vm]');
