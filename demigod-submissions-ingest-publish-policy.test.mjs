import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./demigod-submissions-ingest.mjs', import.meta.url), 'utf8');
assert.match(source, /!args\.includes\('--no-publish'\)/);
assert.match(source, /args\.includes\('--publish'\).*DEMIGOD_FORCE_PUBLISH === '1'/s);
assert.match(source, /if \(publishRequested\)[\s\S]*demigod-board-publish\.mjs/);
assert.match(source, /reason: 'explicit_publish_required'/);

console.log('demigod submissions ingest publish policy: PASS');
