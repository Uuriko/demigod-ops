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
  raw: {
    'company-name': 'Real Co',
    'company-stage': 'seed',
    'role-title': 'Product Lead',
    'stack-needs': 'Product systems ownership',
    '90day-outcome': 'Ship the first customer workflow',
    'work-location': 'sf-hybrid',
    'salary-range': '190-220k',
    'interview-process': 'Founder call, work review, team conversation',
    'contact-email': 'founder@real.test',
  },
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
const pilot = JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PILOTS.json'))).pilots[0];
assert.deepEqual(
  {
    company: pilot.company,
    role: pilot.role,
    companyStage: pilot.companyStage,
    requirements: pilot.requirements,
    outcome90d: pilot.outcome90d,
    workLocation: pilot.workLocation,
    salaryRange: pilot.salaryRange,
    interviewProcess: pilot.interviewProcess,
    contact: pilot.contact,
  },
  {
    company: 'Real Co',
    role: 'Product Lead',
    companyStage: 'seed',
    requirements: 'Product systems ownership',
    outcome90d: 'Ship the first customer workflow',
    workLocation: 'sf-hybrid',
    salaryRange: '190-220k',
    interviewProcess: 'Founder call, work review, team conversation',
    contact: 'founder@real.test',
  },
);

console.log('demigod submission-to-pilot review gate: PASS');
