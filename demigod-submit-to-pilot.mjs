#!/usr/bin/env node
/**
 * Bridge: new startup submission → pilot-os draft (no board mint).
 *
 * Usage:
 *   node demigod-submit-to-pilot.mjs --id sub-xxx
 *   node demigod-submit-to-pilot.mjs --latest-startup
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { readJson, opt, flag } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const INBOX = path.join(ROOT, 'DEMIGOD-SUBMISSIONS-INBOX.json');
const args = process.argv.slice(2);

const inbox = readJson(INBOX) || { items: [] };
const items = inbox.items || [];

function isStartup(it) {
  return /startup/i.test(it.form || '');
}

let item = null;
const id = opt(args, '--id');
if (id) item = items.find((i) => i.id === id || String(i.id).startsWith(id));
else if (flag(args, '--latest-startup')) {
  item = items
    .filter(isStartup)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))[0];
}

if (!item) {
  console.error(JSON.stringify({ ok: false, error: 'not_found', hint: '--id or --latest-startup' }));
  process.exit(1);
}
if (!['reviewed', 'featured', 'approved'].includes(item.status)) {
  console.error(JSON.stringify({ ok: false, error: 'review_required', id: item.id, status: item.status || 'unknown' }));
  process.exit(1);
}

const raw = item.raw || {};
const company = raw['company-name'] || raw.companyName || raw.company || 'Unknown';
const role = raw['role-title'] || raw.roleTitle || raw.role || 'Role TBD';
const outcome =
  raw['90day-outcome'] || raw['90-day-outcome'] || raw.outcome90d || raw['stack-needs'] || '';
const contact = raw['contact-email'] || raw.contactEmail || '';

const r = spawnSync(
  'node',
  [
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'demigod-pilot-os.mjs'),
    'add',
    '--company',
    String(company),
    '--role',
    String(role),
    '--source',
    `submit:${item.id}`,
    '--contact',
    String(contact),
    '--90d',
    String(outcome).slice(0, 500),
    '--company-stage',
    String(raw['company-stage'] || raw.companyStage || ''),
    '--requirements',
    String(raw['stack-needs'] || raw.stackNeeds || '').slice(0, 500),
    '--work-location',
    String(raw['work-location'] || raw.workLocation || ''),
    '--salary-range',
    String(raw['salary-range'] || raw.salaryRange || ''),
    '--interview-process',
    String(raw['interview-process'] || raw.interviewProcess || '').slice(0, 300),
    '--note',
    `from submission ${item.id} at ${item.at}`,
  ],
  { cwd: ROOT, encoding: 'utf8' },
);

const out = (r.stdout || '') + (r.stderr || '');
console.log(out.trim());
process.exit(r.status ?? 1);
