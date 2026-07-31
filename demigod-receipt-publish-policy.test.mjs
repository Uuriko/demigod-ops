import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./demigod-receipt-mint.mjs', import.meta.url), 'utf8');
assert.match(source, /publish: false/);
assert.match(source, /a === '--publish'/);
assert.match(source, /a === '--no-publish'[^\n]+noPublish = true/);
assert.match(source, /!args\.noPublish && \(args\.publish \|\| process\.env\.DEMIGOD_FORCE_PUBLISH === '1'\)/);
assert.doesNotMatch(source, /publish: true/);

console.log('demigod receipt publish policy: PASS');
