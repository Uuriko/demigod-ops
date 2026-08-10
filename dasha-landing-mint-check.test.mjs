#!/usr/bin/env node
/**
 * Home mint paste-check — drives real landing script exports (normalizeMint / checkMint).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(root, 'dasha-landing.html'), 'utf8');
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';

assert.ok(html.includes('id="mint-check"'), 'landing mint-check input missing');
assert.ok(html.includes('id="mint-check-out"'), 'landing mint-check status missing');
assert.ok(html.includes('Is this the mint?'), 'landing mint-check label missing');

const scripts = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const inline = scripts.find((s) => s.includes('DashaLanding') || s.includes('normalizeMint'));
assert.ok(inline, 'landing inline mint-check script missing');

const sandbox = { globalThis: {}, console };
sandbox.globalThis = sandbox;
// no document → pure export only
vm.runInNewContext(inline, sandbox, { filename: 'dasha-landing.html' });
const DL = sandbox.globalThis.DashaLanding;
assert.ok(DL, 'DashaLanding export missing');
assert.equal(DL.mint, MINT);
assert.equal(DL.normalizeMint(MINT), MINT);
assert.equal(DL.normalizeMint('  ' + MINT + '  '), MINT);
assert.equal(DL.normalizeMint('https://solscan.io/token/' + MINT), MINT);
assert.equal(DL.normalizeMint('https://pump.fun/coin/' + MINT), MINT);
assert.equal(DL.normalizeMint('https://raydium.io/swap/?inputMint=sol&outputMint=' + MINT), MINT);
assert.equal(DL.normalizeMint('\u200b' + MINT), MINT);

assert.equal(DL.checkMint('').state, 'empty');
assert.equal(DL.checkMint(MINT).state, 'ok');
assert.equal(DL.checkMint('11111111111111111111111111111111').state, 'bad');
assert.equal(DL.checkMint('not-a-mint').state, 'warn');
assert.match(DL.checkMint(MINT).message, /exact match/i);

console.log('dasha-landing-mint-check: PASS');
