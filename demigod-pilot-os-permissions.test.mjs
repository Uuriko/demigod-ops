import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./demigod-pilot-os.mjs', import.meta.url), 'utf8');
assert.match(source, /atomicWrite\(STORE,[^\n]+\{ mode: 0o600 \}/);
assert.match(source, /pilots-open\.json[\s\S]*\{ mode: 0o600 \}/);
assert.match(source, /copyFileSync\(STORE, bak\);\s*fs\.chmodSync\(bak, 0o600\)/);

console.log('demigod pilot OS permissions: PASS');
