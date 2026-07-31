#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-submit-pilot-'));
const inbox = path.join(root, 'DEMIGOD-SUBMISSIONS-INBOX.json');
const item = {
  id: 'sub-returning', at: new Date().toISOString(), form: 'startup-hire', status: 'updated',
  raw: { 'company-name': 'Real Co', 'role-title': 'Product Lead', 'stack-needs': 'Product' },
};
const write = () => fs.writeFileSync(inbox, JSON.stringify({ items: [item] }));
const bin = new URL('./demigod-submit-to-pilot.mjs', import.meta.url).pathname;
const run = () => spawnSync(process.execPath, [bin, '--id', item.id], { encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: root } });

write();
const beforeReview = run();
assert.equal(beforeReview.status, 1);
assert.equal(JSON.parse(beforeReview.stderr).error, 'review_required');
assert.equal(fs.existsSync(path.join(root, 'DEMIGOD-PILOTS.json')), false);

item.status = 'reviewed';
write();
const afterReview = run();
assert.equal(afterReview.status, 0, afterReview.stderr);
assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PILOTS.json'))).pilots.length, 1);

console.log('demigod submission-to-pilot review gate: PASS');
