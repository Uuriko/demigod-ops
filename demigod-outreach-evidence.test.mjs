#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-outreach-'));
const store = path.join(root, 'DEMIGOD-OUTREACH.json');
fs.writeFileSync(store, JSON.stringify({ schema: 1, leads: [{ id: 'out_real', status: 'drafted' }] }));
const bin = new URL('./demigod-outreach-tracker.mjs', import.meta.url).pathname;
const run = (...args) => spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: root } });

const bare = run('set', 'out_real', '--status', 'sent');
assert.equal(bare.status, 1);
assert.equal(JSON.parse(fs.readFileSync(store)).leads[0].status, 'drafted');

const receipt = path.join(root, 'receipt.txt');
fs.writeFileSync(receipt, 'SENT-CONFIRMED\nMessage-ID: <real@transport>\n');
const backed = run('set', 'out_real', '--status', 'sent', '--evidence', receipt);
assert.equal(backed.status, 0, backed.stderr);
assert.equal(JSON.parse(fs.readFileSync(store)).leads[0].status, 'sent');

console.log('demigod outreach send evidence gate: PASS');
