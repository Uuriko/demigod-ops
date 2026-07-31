#!/usr/bin/env node
/**
 * dg-close — hire outcome + fee terms + follow-up cadence (not full ATS).
 *
 * Usage:
 *   node demigod-close.mjs status <pilotId>
 *   node demigod-close.mjs hire <pilotId> --start YYYY-MM-DD --base-salary 180000 [--note "…"]
 *   node demigod-close.mjs fee <pilotId> --terms-sent [--invoice-draft]
 *   node demigod-close.mjs followup <pilotId> --day 30|60|90 [--note "…"]
 *   node demigod-close.mjs churn <pilotId> --note "…"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, opt, withFileLock } from './demigod-agent-tools-lib.mjs';
import { CURRENT_FEE_TERMS, feeCents } from './demigod-revenue.mjs';

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
  const baseSalaryArg = opt(args, '--base-salary', '');
  const legacyCompArg = opt(args, '--comp', '');
  if (baseSalaryArg && legacyCompArg) {
    console.error(JSON.stringify({ ok: false, error: 'pass --base-salary or legacy --comp, not both' }));
    process.exit(2);
  }
  const baseSalary = Number(baseSalaryArg || legacyCompArg || 0);
  const note = opt(args, '--note', '');
  const data = load();
  const p = findPilot(data, pid);
  if (!p) {
    console.error(JSON.stringify({ ok: false, error: 'not_found' }));
    process.exit(1);
  }
  if (p.status !== 'intro' && p.status !== 'hired') {
    console.error(JSON.stringify({ ok: false, error: 'expect_status_intro', status: p.status }));
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
  if (!Number.isFinite(baseSalary) || !Number.isSafeInteger(baseSalary) || baseSalary <= 0) {
    console.error(JSON.stringify({ ok: false, error: 'base_salary_required_finite_positive_integer', hint: '--base-salary 180000' }));
    process.exit(2);
  }
  const calc = feeCents(baseSalary);
  if (!calc.ok) {
    console.error(JSON.stringify(calc));
    process.exit(2);
  }
  if (p.status === 'hired') {
    const priorSalary = p.close?.firstYearBaseSalary ?? p.close?.compAnnual;
    if (p.close?.startDate === start && priorSalary === baseSalary) {
      console.log(JSON.stringify({ ok: true, idempotent: true, close: p.close }, null, 2));
      process.exit(0);
    }
    console.error(JSON.stringify({ ok: false, error: 'hired_terms_immutable', startDate: p.close?.startDate || null, firstYearBaseSalary: priorSalary || null }));
    process.exit(1);
  }
  p.status = 'hired';
  p.close = {
    ...(p.close || {}),
    hiredAt: new Date().toISOString(),
    startDate: start,
    firstYearBaseSalary: calc.firstYearBaseSalary,
    baseSalaryCents: calc.baseSalaryCents,
    feeCents: calc.feeCents,
    feeTerms: calc.feeTerms,
    feeNote: calc.note,
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
    if (!p.feeTermsSent) {
      p.feeTermsSent = true;
      p.feeTermsAt = new Date().toISOString();
      p.feeTerms = { ...CURRENT_FEE_TERMS };
    }
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
