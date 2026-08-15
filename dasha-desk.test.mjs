import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const worker = await readFile(new URL('./dasha-lobby-worker.mjs', import.meta.url), 'utf8');
const { default: lobby } = await import('./dasha-lobby-worker.mjs');

assert.match(worker, /function isLeftoverDeskPath/, 'desk stays leftover');
assert.match(worker, /path === '\/dasha' \|\| path === '\/desk'/, 'only /dasha and /desk are leftover desk');
assert.doesNotMatch(worker, /pathname === ['"]\/desk['"]/, 'desk must not grow a second worker desk');

for (const host of ['www.getdasha.com', 'getdasha.com', 'lobby.getdasha.com']) {
  for (const path of ['/desk', '/dasha', '/desk/', '/dasha/']) {
    const hop = await lobby.fetch(new Request(`https://${host}${path}`), {});
    assert.equal(hop.status, 308, `${host}${path} must 308 home`);
    assert.equal(hop.headers.get('location'), 'https://www.getdasha.com/');
  }
}

console.log('Dasha Desk: PASS (leftover /desk 308 home)');
