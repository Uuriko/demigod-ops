import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./demigod-priority-board.mjs', import.meta.url), 'utf8');
assert.match(source, /atomicWrite\([\s\S]*priority-board\.json[\s\S]*\{ mode: 0o600 \}/);
assert.doesNotMatch(source, /writeFileSync\([^\n]*priority-board\.json/);

console.log('demigod priority board writer: PASS');
