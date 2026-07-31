import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeResult } from './demigod-webhook-ensure.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-webhook-result-'));
const file = path.join(root, 'DEMIGOD-WEBHOOK-ENSURE.json');
fs.writeFileSync(file, '{}', { mode: 0o644 });
writeResult(file, { publicUrl: 'https://private-tunnel.example/', ok: true });

assert.equal(fs.statSync(file).mode & 0o777, 0o600);
assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), {
  publicUrl: 'https://private-tunnel.example/',
  ok: true,
});
const source = fs.readFileSync(new URL('./demigod-webhook-ensure.mjs', import.meta.url), 'utf8');
assert.doesNotMatch(source, /demigod:webhook:wire|spawnSync/);
assert.doesNotMatch(source, /extractLiveWebhookUrl|ship_required|needsShip/);
console.log('demigod webhook result private overwrite: PASS');
