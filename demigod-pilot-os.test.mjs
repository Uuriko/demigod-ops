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

const absent = spawnSync(process.execPath, [new URL('./demigod-pilot-os.mjs', import.meta.url).pathname, 'set', 'missing', '--status', 'shortlist'], {
  encoding: 'utf8', env: childEnv,
});
assert.equal(absent.status, 1);
assert.equal(JSON.parse(absent.stderr).error, 'not_found', 'missing pilot must stay not_found ahead of evidence gating');

const ready = {
  schema: 1,
  pilots: [
    {
      id: 'pilot_ready', status: 'shortlist', outcome90d: 'Ship the first customer workflow',
      shortlist: [{ id: 'cand_real', name: 'Candidate', consent: true }],
      mutual: { candId: 'cand_real', founderYesFor: 'cand_real', candidateYesFor: 'cand_real' },
    },
    { id: 'pilot_real', status: 'new' },
  ],
};
const store = path.join(root, 'DEMIGOD-PILOTS.json');
fs.writeFileSync(store, JSON.stringify(ready));
const beforeSend = fs.readFileSync(store, 'utf8');
const refusedSend = spawnSync(process.execPath, [new URL('./demigod-intro.mjs', import.meta.url).pathname, 'send', 'pilot_ready'], {
  encoding: 'utf8', env: childEnv,
});
assert.equal(refusedSend.status, 2, 'intro send must require externally observed delivery');
assert.equal(JSON.parse(refusedSend.stderr).error, 'external_delivery_receipt_required');
assert.equal(fs.readFileSync(store, 'utf8'), beforeSend, 'refused send must not mutate pilot state');

const forcedHire = spawnSync(process.execPath, [new URL('./demigod-close.mjs', import.meta.url).pathname, 'hire', 'pilot_real', '--start', '2026-08-01', '--comp', '180000', '--force'], {
  encoding: 'utf8',
  env: childEnv,
});
assert.equal(forcedHire.status, 1, 'hire must follow the evidence-gated intro path');
assert.equal(JSON.parse(forcedHire.stderr).error, 'expect_status_intro');

fs.writeFileSync(store, JSON.stringify({ schema: 1, pilots: [{ id: 'pilot_terms', status: 'intro' }] }));
const closeBin = new URL('./demigod-close.mjs', import.meta.url).pathname;
const hired = spawnSync(process.execPath, [closeBin, 'hire', 'pilot_terms', '--start', '2026-08-01', '--base-salary', '180000'], {
  encoding: 'utf8',
  env: childEnv,
});
assert.equal(hired.status, 0, hired.stderr);
const closed = JSON.parse(fs.readFileSync(store, 'utf8')).pilots[0];
assert.equal(closed.close.firstYearBaseSalary, 180000);
assert.equal(closed.close.feeCents, 1800000);
assert.equal(closed.close.feeTerms.basis, 'first-year base salary');
const closedBytes = fs.readFileSync(store, 'utf8');
const sameHire = spawnSync(process.execPath, [closeBin, 'hire', 'pilot_terms', '--start', '2026-08-01', '--base-salary', '180000'], {
  encoding: 'utf8',
  env: childEnv,
});
assert.equal(sameHire.status, 0, sameHire.stderr);
assert.equal(JSON.parse(sameHire.stdout).idempotent, true, 'same hire terms are idempotent');
assert.equal(fs.readFileSync(store, 'utf8'), closedBytes, 'idempotent close does not rewrite the terms snapshot');
const changedHire = spawnSync(process.execPath, [closeBin, 'hire', 'pilot_terms', '--start', '2026-08-02', '--base-salary', '190000'], {
  encoding: 'utf8',
  env: childEnv,
});
assert.equal(changedHire.status, 1, 'a recorded hire cannot be rebound to different terms');
assert.equal(JSON.parse(changedHire.stderr).error, 'hired_terms_immutable');
assert.equal(fs.readFileSync(store, 'utf8'), closedBytes, 'changed hire terms do not mutate history');

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
