#!/usr/bin/env node
/**
 * dg-close — hire outcome + fee terms + follow-up cadence (not full ATS).
 *
 * Usage:
 *   node demigod-close.mjs status <pilotId>
 *   node demigod-close.mjs hire <pilotId> --start YYYY-MM-DD [--comp 180000] [--note "…"]
 *   node demigod-close.mjs fee <pilotId> --terms-sent [--invoice-draft]
 *   node demigod-close.mjs followup <pilotId> --day 30|60|90 [--note "…"]
 *   node demigod-close.mjs churn <pilotId> --note "…"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, opt, withFileLock } from './demigod-agent-tools-lib.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const STORE = path.join(ROOT, 'DEMIGOD-PILOTS.json');
const STORE_LOCK = path.join(ROOT, 'DEMIGOD-PILOTS.json.lock');
const args = process.argv.slice(2);
const cmd = args[0] || 'help';

function load() {
  return JSON.parse(fs.readFileSync(STORE, 'utf8'));
}
function save(data) {
  data.at = new Date().toISOString();
  atomicWrite(STORE, JSON.stringify(data, null, 2) + '\n');
}
/** Exclusive load → mutate → save (prevents lost updates). */
function updatePilot(mutator) {
  return withFileLock(STORE_LOCK, () => {
    const data = load();
    const out = mutator(data);
    data.at = new Date().toISOString();
    atomicWrite(STORE, JSON.stringify(data, null, 2) + '\n');
    return out;
  });
}
function findPilot(data, pid) {
  const exact = data.pilots.find((p) => p.id === pid);
  if (exact) return exact;
  const hits = data.pilots.filter((p) => p.id.startsWith(pid));
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) {
    console.error(JSON.stringify({ ok: false, error: 'ambiguous_id', matches: hits.map((h) => h.id) }));
    process.exit(1);
  }
  return null;
}

if (cmd === 'status') {
  const p = findPilot(load(), args[1]);
  if (!p) {
    console.error(JSON.stringify({ ok: false, error: 'not_found' }));
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      {
        pilotId: p.id,
        status: p.status,
        close: p.close || null,
        feeTermsSent: p.feeTermsSent || false,
        introAt: p.introAt || null,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (cmd === 'hire') {
  const pid = args[1];
  const start = opt(args, '--start', '');
  const comp = Number(opt(args, '--comp', '0')) || 0;
  const note = opt(args, '--note', '');
  const data = load();
  const p = findPilot(data, pid);
  if (!p) {
    console.error(JSON.stringify({ ok: false, error: 'not_found' }));
    process.exit(1);
  }
  if (p.status !== 'intro' && p.status !== 'hired' && !args.includes('--force')) {
    console.error(JSON.stringify({ ok: false, error: 'expect_status_intro', status: p.status, hint: '--force to override' }));
    process.exit(1);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    console.error(JSON.stringify({ ok: false, error: 'start_date_required', hint: '--start YYYY-MM-DD' }));
    process.exit(2);
  }
  const parsed = new Date(`${start}T00:00:00Z`);
  if (Number.isNaN(+parsed) || parsed.toISOString().slice(0, 10) !== start) {
    console.error(JSON.stringify({ ok: false, error: 'start_date_invalid', hint: '--start YYYY-MM-DD real calendar date' }));
    process.exit(2);
  }
  if (!Number.isFinite(comp) || !Number.isSafeInteger(comp) || comp <= 0) {
    console.error(JSON.stringify({ ok: false, error: 'comp_required_finite_positive_integer', hint: '--comp 180000' }));
    process.exit(2);
  }
  p.status = 'hired';
  p.close = {
    ...(p.close || {}),
    hiredAt: new Date().toISOString(),
    startDate: start,
    compAnnual: comp,
    feeEstimate: Math.round(comp * 0.1),
    feeNote: '10% first-year cash salary on hire; Stripe pending — invoice manually',
    note,
    followups: p.close?.followups || {},
  };
  p.history = p.history || [];
  p.history.push({ at: p.close.hiredAt, status: 'hired', by: 'dg-close', note });
  save(data);
  console.log(JSON.stringify({ ok: true, close: p.close }, null, 2));
  process.exit(0);
}

if (cmd === 'fee') {
  const pid = args[1];
  const data = load();
  const p = findPilot(data, pid);
  if (!p) {
    console.error(JSON.stringify({ ok: false, error: 'not_found' }));
    process.exit(1);
  }
  if (args.includes('--terms-sent')) {
    p.feeTermsSent = true;
    p.feeTermsAt = new Date().toISOString();
  }
  if (args.includes('--invoice-draft')) {
    p.close = p.close || {};
    p.close.invoiceDraftAt = new Date().toISOString();
    p.close.invoiceStatus = 'draft_manual';
  }
  save(data);
  console.log(JSON.stringify({ ok: true, feeTermsSent: p.feeTermsSent, close: p.close }, null, 2));
  process.exit(0);
}

if (cmd === 'followup') {
  const pid = args[1];
  const day = opt(args, '--day', '30');
  const note = opt(args, '--note', '');
  const data = load();
  const p = findPilot(data, pid);
  if (!p) {
    console.error(JSON.stringify({ ok: false, error: 'not_found' }));
    process.exit(1);
  }
  p.close = p.close || {};
  p.close.followups = p.close.followups || {};
  p.close.followups[`d${day}`] = { at: new Date().toISOString(), note };
  save(data);
  console.log(JSON.stringify({ ok: true, followups: p.close.followups }, null, 2));
  process.exit(0);
}

if (cmd === 'churn') {
  const pid = args[1];
  const note = opt(args, '--note', '');
  const data = load();
  const p = findPilot(data, pid);
  if (!p) {
    console.error(JSON.stringify({ ok: false, error: 'not_found' }));
    process.exit(1);
  }
  p.status = 'churned';
  p.churnedAt = new Date().toISOString();
  p.churnNote = note;
  p.history = p.history || [];
  p.history.push({ at: p.churnedAt, status: 'churned', by: 'dg-close', note });
  save(data);
  console.log(JSON.stringify({ ok: true, status: 'churned' }, null, 2));
  process.exit(0);
}

console.error('usage: status|hire|fee|followup|churn <pilotId> …');
process.exit(2);
