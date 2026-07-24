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
// (ship-prep alone is not enough — operators run `bin/dg ship prepare`).
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
assert.equal((evidence.match(/atomicWrite\([^\n]+JSON\.stringify\(sealed[^\n]+\{ mode: 0o600 \}/g) || []).length, 2);

console.log('demigod ship prepare contract: PASS');
