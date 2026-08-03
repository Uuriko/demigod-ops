#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-reconcile-'));
const receipt = path.join(root, 'send-receipt.txt');
fs.writeFileSync(receipt, 'SENT-CONFIRMED\nMessage-ID: <real@transport>\n');
fs.writeFileSync(path.join(root, 'DEMIGOD-SUBMISSIONS-INBOX.json'), '{"items":[]}');
fs.writeFileSync(path.join(root, 'DEMIGOD-PILOTS.json'), JSON.stringify({ pilots: [
  { id: 'pilot-legacy-fixture', candidate: 'sample-cand-pm', status: 'piloted' },
  {
    id: 'pilot-real',
    company: 'Acme',
    role: 'Founding Engineer',
    outcome90d: 'Ship the first production release',
    contact: 'founder@acme.com',
    status: 'sourcing',
    at: '2026-01-01T00:00:00Z',
  },
] }));
fs.writeFileSync(path.join(root, 'DEMIGOD-OUTREACH.json'), JSON.stringify({ leads: [
  { id: 'bare', status: 'sent', sentAt: new Date().toISOString() },
  { id: 'backed', status: 'sent', history: [{ status: 'sent', evidence: receipt }] },
] }));

const run = spawnSync(process.execPath, [new URL('./demigod-ops-reconcile.mjs', import.meta.url).pathname, '--json'], {
  encoding: 'utf8',
  env: { ...process.env, DEMIGOD_ROOT: root },
});
assert.equal(run.status, 0, run.stderr);
const report = JSON.parse(run.stdout);
assert.equal(report.counts.outreachSent, 1);
assert.equal(report.counts.pilotsOpen, 1, 'legacy fixture without a real Pilot OS identity must not count');

console.log('demigod reconcile receipt-backed sent count: PASS');
