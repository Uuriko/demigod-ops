import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./demigod-board-reset.mjs', import.meta.url), 'utf8');
assert.match(source, /if \(process\.env\.DEMIGOD_FORCE_PUBLISH === '1'\)/);
assert.match(source, /reason: 'explicit_publish_required'/);
assert.match(source, /publish\.skipped \|\| publish\.ok/);

console.log('demigod board reset publish policy: PASS');
