import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./demigod-submissions-triage.mjs', import.meta.url), 'utf8');
assert.match(source, /email: maskEmail\(extractEmail\(/);
assert.match(source, /atomicWrite\(OUT,[\s\S]*\{ mode: 0o600 \}/);
assert.doesNotMatch(source, /writeFileSync\(OUT/);
assert.match(source, /const APPLY = process\.argv\.includes\('--apply'\)/);
assert.match(source, /if \(APPLY\) updateInbox\(triage\)/);
assert.doesNotMatch(source, /saveInbox\(/);
// updated SMS sims + orphan featured e2e must be triageable (not only new/pending).
assert.match(source, /triageable = new Set\(\['new', 'pending', 'updated', 'featured'\]\)/);
assert.match(source, /reserved_tld_fixture/);

console.log('demigod submissions triage privacy: PASS');
