import assert from 'node:assert/strict';
import fs from 'node:fs';

const ship = fs.readFileSync(new URL('./demigod-ship.mjs', import.meta.url), 'utf8');
const prepare = ship.match(/function prepare\(\) \{([\s\S]*?)\n}\n\nfunction requireMutate/)?.[1] || '';
assert.ok(prepare, 'prepare block exists');

for (const file of [
  'demigod-foot-core.js',
  'demigod-head-minimal.html',
  'demigod-head-styles.css',
  'demigod-footer-lite.html',
]) assert.match(prepare, new RegExp(`['"]${file.replaceAll('.', '\\.')}['"]`));

const review = prepare.match(/run\('review', \[([\s\S]*?)\]\)/)?.[1] || '';
assert.match(review, /'--no-contract'/);
assert.match(review, /'--files'/);
for (const file of [
  'demigod-foot-core.js',
  'demigod-head-minimal.html',
  'demigod-head-styles.css',
  'demigod-footer-lite.html',
]) assert.match(review, new RegExp(`['"]${file.replaceAll('.', '\\.')}['"]`));

// Clone-breaker + export-contract gate must stay on the canonical prepare path
// (legacy prep wrappers are insufficient — operators run `bin/dg ship prepare`).
assert.match(prepare, /run\('import-integrity',\s*\[[\s\S]*demigod-import-integrity\.mjs/);
assert.match(prepare, /run\('board-honesty'/);
assert.match(prepare, /run\('foot-smoke'/);

assert.match(prepare, /run\('truth',[\s\S]*\{ allowFail: true \}\)/);
assert.match(prepare, /observational: true/);
assert.match(prepare, /steps\.filter\(\(s\) => s\.label !== 'truth'\)\.every\(\(s\) => s\.ok\)/);
assert.doesNotMatch(review, /allowFail/);
assert.match(prepare, /s\.rawOk \? '✓' : '○'/);
assert.match(prepare, /failure; non-blocking/);
assert.match(prepare, /atomicWrite\([\s\S]*ship-prepare\.json[\s\S]*\{ mode: 0o600 \}/);

const evidence = fs.readFileSync(new URL('./demigod-evidence.mjs', import.meta.url), 'utf8');
// The property is "every evidence write is owner-only", not "the serialization is inline on the
// same line as the write". sealRun was refactored to hoist the serialized body into a variable,
// which broke the old single-line regex while leaving 0o600 intact on both writes. Assert the
// invariant in a form a reformat cannot fake out: sealRun performs exactly two writes, and no
// atomicWrite anywhere in the module omits owner-only mode.
const sealBody = evidence.slice(evidence.indexOf('export function sealRun'));
const sealWrites = sealBody.slice(0, sealBody.indexOf('\nexport ') + 1 || undefined)
  .match(/atomicWrite\(/g) || [];
assert.equal(sealWrites.length, 2, 'sealRun writes the envelope and the latest-<producer> pointer');
const writes = evidence.match(/atomicWrite\([\s\S]{0,160}?\)/g) || [];
assert.ok(writes.length >= 2, 'evidence module must still write via atomicWrite');
for (const call of writes) {
  assert.match(call, /mode:\s*0o600/, `evidence write is not owner-only: ${call.replace(/\s+/g, ' ')}`);
}

console.log('demigod ship prepare contract: PASS');
