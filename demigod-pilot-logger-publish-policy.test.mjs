import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./demigod-pilot-logger.mjs', import.meta.url), 'utf8');
assert.match(source, /publish: false/);
assert.match(source, /noPublish: false/);
assert.match(source, /a === '--publish'/);
assert.match(source, /!args\.noPublish && \(args\.publish \|\| process\.env\.DEMIGOD_FORCE_PUBLISH === '1'\)/);

console.log('demigod pilot logger publish policy: PASS');
