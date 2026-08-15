import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const worker = await readFile(new URL('./dasha-lobby-worker.mjs', import.meta.url), 'utf8');
const { default: lobby } = await import('./dasha-lobby-worker.mjs');

assert.match(worker, /function isLeftoverStudioPath/, 'studio stays leftover');
assert.match(worker, /path === '\/studio'/, 'only /studio is leftover studio');
assert.doesNotMatch(worker, /pbs\.twimg\.com/, 'worker must not hotlink twimg for studio');

for (const host of ['www.getdasha.com', 'getdasha.com', 'lobby.getdasha.com']) {
  for (const path of ['/studio', '/studio/']) {
    const hop = await lobby.fetch(new Request(`https://${host}${path}`), {});
    assert.equal(hop.status, 308, `${host}${path} must 308 home`);
    assert.equal(hop.headers.get('location'), 'https://www.getdasha.com/');
  }
}

console.log('dasha-studio-image: PASS (leftover /studio 308 home)');
