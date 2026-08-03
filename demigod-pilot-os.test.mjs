#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-pilot-os-'));
const childEnv = { ...process.env, DEMIGOD_ROOT: root };
delete childEnv.NODE_TEST_CONTEXT;
fs.writeFileSync(path.join(root, 'DEMIGOD-PILOTS.json'), JSON.stringify({ schema: 1, pilots: [{ id: 'pilot_real', status: 'new' }] }));

for (const status of ['shortlist', 'intro', 'hired']) {
  const before = fs.readFileSync(path.join(root, 'DEMIGOD-PILOTS.json'), 'utf8');
  const run = spawnSync(process.execPath, [new URL('./demigod-pilot-os.mjs', import.meta.url).pathname, 'set', 'pilot_real', '--status', status], {
    encoding: 'utf8',
    env: childEnv,
  });
  if (run.error?.code === 'EPERM') {
    console.log('demigod-pilot-os evidence gate: SKIP (sandbox forbids nested process creation)');
    process.exit(0);
  }
  assert.equal(run.status, 1, `${status} must require its evidence-gated command`);
  assert.equal(JSON.parse(run.stderr).error, 'evidence_required');
  assert.equal(fs.readFileSync(path.join(root, 'DEMIGOD-PILOTS.json'), 'utf8'), before, 'evidence refusal must not write');
}
const bareClose = spawnSync(process.execPath, [new URL('./demigod-pilot-os.mjs', import.meta.url).pathname, 'set', 'pilot_real', '--status', 'closed'], {
  encoding: 'utf8', env: childEnv,
});
assert.equal(bareClose.status, 1, 'closed pilot requires an attributable disposition');
assert.equal(JSON.parse(bareClose.stderr).error, 'disposition_reason_required');
const reasonedClose = spawnSync(process.execPath, [new URL('./demigod-pilot-os.mjs', import.meta.url).pathname, 'set', 'pilot_real', '--status', 'closed', '--note', 'role: hiring plan changed'], {
  encoding: 'utf8', env: childEnv,
});
assert.equal(reasonedClose.status, 0, reasonedClose.stderr);
assert.equal(JSON.parse(reasonedClose.stdout).pilot.notes, 'role: hiring plan changed');

const receiptDir = path.join(root, 'demigod-outreach', 'funnel-receipts');
const receiptAt = '2026-08-01T12:00:00.000Z';
const receiptBody = [
  'SENT-CONFIRMED',
  'channel: email',
  'kind: intro_made',
  'Message-ID: <lead-bridge@real.test>',
  `at: ${receiptAt}`,
  'pairId: pair-bridge',
  'roleId: role-bridge',
  'candId: cand-bridge',
  'nextUpdateAt: 2099-08-03',
  '',
].join('\n');
fs.mkdirSync(receiptDir, { recursive: true });
const wrongReceipt = path.join(root, 'wrong-intro.txt');
fs.writeFileSync(wrongReceipt, receiptBody);
const beforeInvalidAdd = fs.readFileSync(path.join(root, 'DEMIGOD-PILOTS.json'), 'utf8');
const invalidAdd = spawnSync(process.execPath, [new URL('./demigod-pilot-os.mjs', import.meta.url).pathname, 'add', '--company', 'Bridge Co', '--role', 'Engineer', '--source', 'funnel:lead-bridge', '--intro-receipt', wrongReceipt], {
  encoding: 'utf8', env: childEnv,
});
assert.equal(invalidAdd.status, 1, 'intro receipt must be bound to the source lead path');
assert.equal(JSON.parse(invalidAdd.stderr).error, 'intro_receipt_invalid');
assert.equal(fs.readFileSync(path.join(root, 'DEMIGOD-PILOTS.json'), 'utf8'), beforeInvalidAdd, 'invalid intro receipt does not write');

const validReceipt = path.join(receiptDir, 'lead-bridge-intro_made.txt');
fs.writeFileSync(validReceipt, receiptBody.replace('nextUpdateAt: 2099-08-03\n', ''));
const missingCheckpoint = spawnSync(process.execPath, [new URL('./demigod-pilot-os.mjs', import.meta.url).pathname, 'add', '--company', 'Bridge Co', '--role', 'Engineer', '--source', 'funnel:lead-bridge', '--intro-receipt', validReceipt], {
  encoding: 'utf8', env: childEnv,
});
assert.equal(missingCheckpoint.status, 1, 'intro receipt requires a dated next update');
fs.writeFileSync(validReceipt, receiptBody);
const missingIdentity = spawnSync(process.execPath, [new URL('./demigod-pilot-os.mjs', import.meta.url).pathname, 'add', '--company', 'Bridge Co', '--role', 'Engineer', '--source', 'funnel:lead-bridge', '--intro-receipt', validReceipt], {
  encoding: 'utf8', env: childEnv,
});
assert.equal(missingIdentity.status, 1, 'receipt-backed intro requires the fields counted by demand truth');
assert.equal(JSON.parse(missingIdentity.stderr).error, 'intro_identity_incomplete');
const validAdd = spawnSync(process.execPath, [new URL('./demigod-pilot-os.mjs', import.meta.url).pathname, 'add', '--company', 'Bridge Co', '--role', 'Engineer', '--source', 'funnel:lead-bridge', '--contact', 'founder@bridge.co', '--outcome', 'Ship the first reliable customer workflow', '--intro-receipt', validReceipt], {
  encoding: 'utf8', env: childEnv,
});
assert.equal(validAdd.status, 0, validAdd.stderr);
const bridged = JSON.parse(validAdd.stdout).pilot;
assert.equal(bridged.status, 'intro');
assert.equal(bridged.pairId, 'pair-bridge');
assert.equal(bridged.introReceipt, validReceipt);
assert.equal(bridged.nextUpdateAt, '2099-08-03');
const rescheduled = spawnSync(process.execPath, [new URL('./demigod-pilot-os.mjs', import.meta.url).pathname, 'set', bridged.id, '--status', 'intro', '--next-update', '2099-08-04', '--note', 'next interview update'], {
  encoding: 'utf8', env: childEnv,
});
assert.equal(rescheduled.status, 0, rescheduled.stderr);
assert.equal(JSON.parse(rescheduled.stdout).pilot.nextUpdateAt, '2099-08-04', 'same-stage set reschedules the checkpoint without bypassing intro evidence');
const invalidCheckpoint = spawnSync(process.execPath, [new URL('./demigod-pilot-os.mjs', import.meta.url).pathname, 'set', bridged.id, '--status', 'intro', '--next-update', '2099-02-30'], {
  encoding: 'utf8', env: childEnv,
});
assert.equal(invalidCheckpoint.status, 1);
assert.equal(JSON.parse(invalidCheckpoint.stderr).error, 'invalid_next_update');
const overdueStore = JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PILOTS.json'), 'utf8'));
overdueStore.pilots.push({ id: 'pilot_overdue', status: 'intro', nextUpdateAt: '2020-01-01' });
overdueStore.pilots.push({ id: 'pilot_sample', status: 'intro', nextUpdateAt: '2020-01-01', sample: true });
overdueStore.pilots.push({ id: 'pilot_legacy', status: 'piloted', nextUpdateAt: '2020-01-01' });
fs.writeFileSync(path.join(root, 'DEMIGOD-PILOTS.json'), JSON.stringify(overdueStore));
const open = spawnSync(process.execPath, [new URL('./demigod-pilot-os.mjs', import.meta.url).pathname, 'open'], { encoding: 'utf8', env: childEnv });
assert.equal(open.status, 0, open.stderr);
const openReport = JSON.parse(open.stdout);
assert.equal(openReport.checkpoints.overdue, 1);
assert.equal(openReport.pilots.find((p) => p.id === 'pilot_overdue').checkpoint.state, 'overdue');
assert.equal(openReport.pilots.some((p) => p.id === 'pilot_sample' || p.id === 'pilot_legacy'), false, 'open excludes samples and invalid legacy states');
const bridgeHire = spawnSync(process.execPath, [new URL('./demigod-close.mjs', import.meta.url).pathname, 'hire', bridged.id, '--start', '2026-08-01', '--comp', '180000'], {
  encoding: 'utf8', env: childEnv,
});
assert.equal(bridgeHire.status, 0, bridgeHire.stderr);

const absent = spawnSync(process.execPath, [new URL('./demigod-pilot-os.mjs', import.meta.url).pathname, 'set', 'missing', '--status', 'shortlist'], {
  encoding: 'utf8', env: childEnv,
});
assert.equal(absent.status, 1);
assert.equal(JSON.parse(absent.stderr).error, 'not_found', 'missing pilot must stay not_found ahead of evidence gating');

const store = path.join(root, 'DEMIGOD-PILOTS.json');
const forcedHire = spawnSync(process.execPath, [new URL('./demigod-close.mjs', import.meta.url).pathname, 'hire', 'pilot_real', '--start', '2026-08-01', '--comp', '180000', '--force'], {
  encoding: 'utf8',
  env: childEnv,
});
assert.equal(forcedHire.status, 1, 'hire must follow the evidence-gated intro path');
assert.equal(JSON.parse(forcedHire.stderr).error, 'expect_status_intro');

fs.writeFileSync(store, JSON.stringify({ schema: 1, pilots: [] }));
const lock = store + '.lock';
fs.writeFileSync(lock, `${process.pid}\n`);
let exited = 0;
const add = (company) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [new URL('./demigod-pilot-os.mjs', import.meta.url).pathname, 'add', '--company', company, '--role', 'Founder engineer', '--source', 'manual'], {
    encoding: 'utf8', env: childEnv,
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', reject);
  child.on('exit', (status) => { exited++; resolve({ status, stderr }); });
});
const first = add('Alpha');
const second = add('Beta');
await new Promise((resolve) => setTimeout(resolve, 100));
assert.equal(exited, 0, 'pilot writers must wait for the shared lock');
fs.unlinkSync(lock);
for (const run of await Promise.all([first, second])) assert.equal(run.status, 0, run.stderr);
assert.deepEqual(new Set(JSON.parse(fs.readFileSync(store)).pilots.map((p) => p.company)), new Set(['Alpha', 'Beta']));
assert.deepEqual(
  new Set(JSON.parse(fs.readFileSync(path.join(root, '.dg-busy', 'pilots-open.json'))).open.map((p) => p.company)),
  new Set(['Alpha', 'Beta']),
  'isolated pilot writes keep their derived receipt under DEMIGOD_ROOT',
);

console.log('demigod-pilot-os evidence gate: PASS');
