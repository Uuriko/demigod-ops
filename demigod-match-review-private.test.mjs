#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeQueue } from './demigod-match-review.mjs';

const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dg-match-review-')), 'queue.json');
writeQueue(file, { pairs: [{ roleId: 'private-role', candId: 'private-candidate' }] });
assert.equal(fs.statSync(file).mode & 0o777, 0o600);

const ui = fs.readFileSync(new URL('./demigod-agent-dashboard-ui.html', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('./demigod-agent-dashboard.mjs', import.meta.url), 'utf8');
assert.match(ui, /const total=pairs\.length;/);
assert.match(ui, /samples hidden/);
assert.doesNotMatch(ui, /Seed fixtures|btnMatchSeed/);
assert.match(ui, /const note=window\.prompt\('Review evidence for '\+decision\+' \(required\):',''\)/);
assert.match(ui, /action:'review',pairId:id,decision,reviewed:true,note/);
assert.match(server, /reviewed: body\.reviewed === true,[\s\S]*actor: 'human:dashboard'/);
assert.doesNotMatch(server, /reviewPair\(pairId,[\s\S]{0,180}actor,\s*\}\)/);

// Missing --state value must not treat next --flag as a state (false-empty queue wipe).
const bin = new URL('./demigod-match-review.mjs', import.meta.url).pathname;
const missingState = spawnSync(process.execPath, [bin, '--state', '--include-sample', '--json'], {
  encoding: 'utf8',
});
assert.equal(missingState.status, 2, missingState.stderr || missingState.stdout);
assert.match(missingState.stderr || missingState.stdout, /--state requires a value/);

console.log('demigod match review private write: PASS');
