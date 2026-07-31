import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('full boot has no delayed repair', () => {
  const source = fs.readFileSync('demigod-foot-core.js', 'utf8');
  const scheduled = [...source.matchAll(/setTimeout\(boot\s*,\s*(\d+)\s*\)/g)].map((m) => Number(m[1]));
  assert.deepEqual(scheduled, []);
  assert.doesNotMatch(source, /\[\s*400\s*,\s*1500\s*\]/);
  assert.doesNotMatch(source, /function\s+forceMainVisible|forceMainVisible\(\)/);
  assert.match(source, /function boot\(\)\{if\(!document\.body\)return;run\(\);/);
  assert.doesNotMatch(source.match(/function boot\(\)[^\n]+/)[0], /scrubBadStaticClaims|scrubContactEmail|wireLogoHome|ensureLogo/);
  assert.match(source, /if\(document\.readyState==='loading'\)document\.addEventListener\('DOMContentLoaded',boot,\{once:true\}\);else boot\(\);/);
  assert.doesNotMatch(source, /\}boot\(\);document\.addEventListener\('DOMContentLoaded',boot\)/);
});
