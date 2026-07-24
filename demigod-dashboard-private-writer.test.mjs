import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./demigod-agent-dashboard.mjs', import.meta.url), 'utf8');
const unit = fs.readFileSync(new URL('./systemd-user/demigod-dash.service', import.meta.url), 'utf8');
const writer = source.match(/function writeJsonAtomic\([\s\S]*?\n}/)?.[0] || '';
assert.match(writer, /writeFileSync\(tmp,[\s\S]*\{ mode: 0o600 \}/);
assert.match(writer, /chmodSync\(tmp, 0o600\)/);
assert.match(writer, /renameSync\(tmp, file\)/);
for (const file of ['BRIEF_MD', 'BRIEF_JSON', 'HANDOFF_PATH']) {
  assert.match(source, new RegExp(`atomicWrite\\(\\s*${file},[\\s\\S]*?\\{ mode: 0o600 \\}`));
}
assert.doesNotMatch(source, /writeFileSync\((?:BRIEF_MD|BRIEF_JSON|tmp, body)/);
assert.match(unit, /^UMask=0077$/m);

console.log('demigod dashboard private writer: PASS');
