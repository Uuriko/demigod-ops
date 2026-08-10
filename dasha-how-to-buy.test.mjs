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
assert.ok(html.includes('DashaHowToBuy'), 'export for tests');
assert.ok(html.includes('/dasha') && html.includes('/studio'), 'nav loops to product surfaces');
for (const step of ['data-n="01"', 'data-n="02"', 'data-n="03"']) assert.ok(html.includes(step), `missing buyer step: ${step}`);
assert.doesNotMatch(html, /application\/ld\+json|"@type"\s*:\s*"HowTo"/, 'retired HowTo structured data returned');
assert.ok(html.includes('user-select:all'), 'mint must remain selectable');
assert.ok(!/04 · Share|Copy share pack|Draft on X|buildSharePack/.test(html), 'promotion leaked into the four-step buy path');
assert.ok(!html.includes('t.me/dashacommunity'), 'no disallowed telegram');

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

console.log('dasha how-to-buy: PASS [vm]');
