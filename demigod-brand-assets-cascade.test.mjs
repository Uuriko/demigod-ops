import assert from 'node:assert/strict';
import fs from 'node:fs';
const core = fs.readFileSync(new URL('./demigod-foot-core.js', import.meta.url), 'utf8');
const baStart = core.indexOf('function brandAssets');
assert.ok(baStart >= 0, 'brandAssets defined');
const baEnd = core.indexOf('\nfunction ', baStart + 10);
const ba = core.slice(baStart, baEnd > baStart ? baEnd : baStart + 60000);
for (const m of [
  '#dg-night-stage{position:absolute',
  '#dg-bar{position:fixed',
  '.hero-actions.dg-path-pair',
  'data-dg-cta=hire',
]) {
  assert.ok(ba.includes(m), `brandAssets missing ${m}`);
}
assert.ok(ba.length >= 20000, `brandAssets too small: ${ba.length}`);
assert.ok((ba.match(/\+"/g) || []).length >= 100, 'brandAssets concat under-fed');
console.log('demigod brandAssets cascade: PASS', ba.length);
