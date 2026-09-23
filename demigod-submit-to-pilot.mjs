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

const OPS = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || OPS;
const INBOX = path.join(ROOT, 'DEMIGOD-SUBMISSIONS-INBOX.json');
const PILOT_OS = path.join(OPS, 'demigod-pilot-os.mjs');
const args = process.argv.slice(2);

const inbox = readJson(INBOX) || { items: [] };
const items = inbox.items || [];

function isStartup(it) {
  return /startup/i.test(it.form || '');
}

function findSubmission(id) {
  const exact = items.find((row) => row && row.id === id);
  if (exact) return { item: exact };
  const hits = items.filter((row) => row && String(row.id).startsWith(id));
  if (hits.length === 1) return { item: hits[0] };
  if (hits.length > 1) return { error: 'ambiguous_id', matches: hits.map((row) => row.id) };
  return { error: 'not_found' };
}

let item = null;
const id = opt(args, '--id');
if (id) {
  const found = findSubmission(id);
  if (found.error) {
    console.error(JSON.stringify({ ok: false, error: found.error, matches: found.matches || [], hint: '--id or --latest-startup' }));
    process.exit(1);
  }
  item = found.item;
} else if (flag(args, '--latest-startup')) {
  item = items
    .filter(isStartup)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))[0];
}

if (!item) {
  console.error(JSON.stringify({ ok: false, error: 'not_found', hint: '--id or --latest-startup' }));
  process.exit(1);
}
if (!isStartup(item)) {
  console.error(JSON.stringify({ ok: false, error: 'startup_submission_required', id: item.id }));
  process.exit(1);
}

const raw = item.raw || {};
const company = raw['company-name'] || raw.companyName || raw.company || 'Unknown';
const role = raw['role-title'] || raw.roleTitle || raw.role || 'Role TBD';
const outcome =
  raw['90day-outcome'] || raw['90-day-outcome'] || raw.outcome90d || raw['stack-needs'] || '';
const contact = raw['contact-email'] || raw.contactEmail || '';

const r = spawnSync(
  process.execPath,
  [
    PILOT_OS,
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
    '--note',
    `from submission ${item.id} at ${item.at}`,
  ],
  { cwd: OPS, env: { ...process.env, DEMIGOD_ROOT: ROOT }, encoding: 'utf8' },
);

const out = (r.stdout || '') + (r.stderr || '');
console.log(out.trim());
process.exit(r.status ?? 1);
