#!/usr/bin/env node
/**
 * Homepage Copy CA must not say COPIED unless the clipboard is the full mint.
 * Same 2026 clipboard-hijack / last-4 poison hole as how-to-buy. No new copy.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const MINT = '53uxQtB9pcjWvCHguz3JTTndvuKqGxhrD37EetnCpump';
const html = readFileSync(join(root, 'dasha-landing.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((row) => row[1]);
const src = scripts.find((s) => s.includes('mintCopiedOk') && s.includes('.copy'));
assert.ok(src, 'homepage copy script must export mintCopiedOk');

const box = {
  window: {},
  document: { querySelector: () => null, createRange: () => ({ selectNodeContents() {} }) },
  navigator: { clipboard: {} },
  getSelection: () => ({ removeAllRanges() {}, addRange() {} }),
};
box.window = box;
vm.runInNewContext(src, box, { filename: 'dasha-landing.html#copy' });
const H = box.window.DashaHomeMint || box.DashaHomeMint;
assert.ok(H, 'DashaHomeMint export');
assert.equal(H.CA, MINT);
assert.equal(typeof H.mintCopiedOk, 'function', 'must drive the shipped helper');
assert.equal(H.mintCopiedOk(MINT, MINT), true);
assert.equal(H.mintCopiedOk(MINT + '\n', MINT), true);
assert.equal(H.mintCopiedOk('', MINT), false);
assert.equal(H.mintCopiedOk(MINT.slice(0, -4) + 'XXXX', MINT), false, 'last-4 vanity is not the mint');
assert.equal(H.mintCopiedOk(MINT.slice(0, 4) + 'xxxx' + MINT.slice(-4), MINT), false, 'first+last-4 poison is not the mint');
assert.doesNotMatch(html, /fakes exist|never trust|wrong one/i, 'homepage must not grow banned negative coin copy');

console.log('dasha-landing-mint-copy: PASS');
