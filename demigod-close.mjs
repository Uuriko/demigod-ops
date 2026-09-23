#!/usr/bin/env node
/**
 * dg-close — hire outcome + fee terms + follow-up cadence (not full ATS).
 *
 * Usage:
 *   node demigod-close.mjs status <pilotId>
 *   node demigod-close.mjs hire <pilotId> --start YYYY-MM-DD [--comp 180000] [--cand <shortlistId>] [--note "…"]
 *   node demigod-close.mjs fee <pilotId> --terms-sent [--invoice-draft]
 *   node demigod-close.mjs payment <pilotId> --observed fixture.json [--record]
 *   node demigod-close.mjs check <pilotId> --date YYYY-MM-DD
 *   node demigod-close.mjs followup <pilotId> --day 30|60|90 [--note "…"]
 *   node demigod-close.mjs churn <pilotId> --note "…"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite, opt, withFileLock } from './demigod-agent-tools-lib.mjs';
import {
  emitPlacementInvoiceDraft,
  pairForHiredCandidate,
  releasePortionsOnObservedPayment,
  retentionSchedule,
  markDueRetentionChecks,
  saveObservedPaymentFixture,
  loadObservedPaymentFixture,
} from './demigod-referral-ledger.mjs';

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
  const shortlist = Array.isArray(p.shortlist) ? p.shortlist : [];
  const hiredCandId = opt(args, '--cand', '') || (shortlist.length === 1 ? shortlist[0].id : '');
  if (!hiredCandId) {
    console.error(JSON.stringify({ ok: false, error: 'hired_candidate_required', hint: '--cand <shortlistId>' }));
    process.exit(2);
  }
  if (!shortlist.some((row) => row.id === hiredCandId)) {
    console.error(JSON.stringify({ ok: false, error: 'hired_candidate_not_on_shortlist', candId: hiredCandId }));
    process.exit(1);
  }
  const hiredPair = pairForHiredCandidate(p.id, hiredCandId);
  if (!hiredPair) {
    console.error(JSON.stringify({ ok: false, error: 'pair_required', candId: hiredCandId }));
    process.exit(1);
  }
  if (hiredPair.state === 'rejected') {
    console.error(JSON.stringify({
      ok: false,
      error: 'rejected_pair_blocks_hire',
      pairId: hiredPair.pairId,
      released: false,
      livePayment: false,
    }));
    process.exit(1);
  }
  p.status = 'hired';
  p.close = {
    ...(p.close || {}),
    hiredAt: new Date().toISOString(),
    startDate: start,
    compAnnual: comp,
    hiredCandId,
    hiredPairId: hiredPair.pairId,
    hiredPairState: hiredPair.state,
    feeNote: '10% first-year cash salary on hire; Stripe pending — invoice manually',
    note,
    followups: p.close?.followups || {},
    retentionChecks: retentionSchedule(start),
  };
  p.history = p.history || [];
  p.history.push({ at: p.close.hiredAt, status: 'hired', by: 'dg-close', note });
  const invoiceDraft = emitPlacementInvoiceDraft({
    pilotId: p.id,
    company: p.company || p.companyName || '',
    roleTitle: p.role || p.roleTitle || '',
    startDate: start,
    compAnnual: comp,
    hiredCandId,
  });
  p.close.invoiceDraftAt = invoiceDraft.at;
  p.close.invoiceDraftId = invoiceDraft.id;
  p.close.invoiceStatus = 'draft';
  p.close.invoiceDryRun = true;
  p.close.feeEstimate = invoiceDraft.feeCents;
  p.close.feeEstimateCents = invoiceDraft.feeCents;
  save(data);
  console.log(JSON.stringify({ ok: true, close: p.close, invoiceDraft }, null, 2));
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
  let invoiceDraft = null;
  if (args.includes('--invoice-draft')) {
    p.close = p.close || {};
    const comp = Number(p.close.compAnnual || 0);
    if (comp > 0) {
      invoiceDraft = emitPlacementInvoiceDraft({
        pilotId: p.id,
        company: p.company || p.companyName || '',
        roleTitle: p.role || p.roleTitle || '',
        startDate: p.close.startDate || '',
        compAnnual: comp,
      });
      p.close.invoiceDraftAt = invoiceDraft.at;
      p.close.invoiceDraftId = invoiceDraft.id;
      p.close.invoiceStatus = 'draft';
      p.close.invoiceDryRun = true;
    } else {
      p.close.invoiceDraftAt = new Date().toISOString();
      p.close.invoiceStatus = 'draft_manual';
    }
  }
  save(data);
  console.log(JSON.stringify({ ok: true, feeTermsSent: p.feeTermsSent, close: p.close, invoiceDraft }, null, 2));
  process.exit(0);
}

if (cmd === 'payment') {
  const pid = args[1];
  const fixturePath = opt(args, '--observed', '');
  if (!fixturePath) {
    console.error(JSON.stringify({ ok: false, error: 'observed_fixture_required' }));
    process.exit(2);
  }
  let fixture;
  try {
    fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  } catch {
    console.error(JSON.stringify({ ok: false, error: 'observed_fixture_unreadable' }));
    process.exit(2);
  }
  const data = load();
  const p = findPilot(data, pid);
  if (!p) {
    console.error(JSON.stringify({ ok: false, error: 'not_found' }));
    process.exit(1);
  }
  if (p.status !== 'hired' && p.status !== 'churned' && !args.includes('--force')) {
    console.error(JSON.stringify({ ok: false, error: 'expect_status_hired', status: p.status }));
    process.exit(1);
  }
  saveObservedPaymentFixture(p.id, fixture);
  if (args.includes('--record')) {
    p.close = p.close || {};
    p.close.observedFixture = true;
    p.close.observedFixtureAt = new Date().toISOString();
    save(data);
    console.log(JSON.stringify({ ok: true, recorded: true, released: false, livePayment: false }, null, 2));
    process.exit(0);
  }
  if (p.status === 'churned') {
    console.error(JSON.stringify({ ok: false, error: 'churn_blocks_release', released: false, livePayment: false }));
    process.exit(1);
  }
  const released = releasePortionsOnObservedPayment(p.id, fixture);
  if (!released.ok) {
    console.error(JSON.stringify(released));
    process.exit(1);
  }
  p.close = p.close || {};
  p.close.observedPaymentAt = fixture.paidAt;
  p.close.payoutId = released.payout.id;
  p.close.payoutStatus = released.payout.status;
  p.close.invoiceStatus = 'payment_observed';
  p.close.invoiceDryRun = true;
  p.history = p.history || [];
  p.history.push({ at: new Date().toISOString(), status: 'payment_observed', by: 'dg-close', note: 'observed client payment fixture' });
  save(data);
  console.log(JSON.stringify({ ok: true, close: p.close, payout: released.payout }, null, 2));
  process.exit(0);
}

if (cmd === 'check') {
  const pid = args[1];
  const date = opt(args, '--date', '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(JSON.stringify({ ok: false, error: 'check_date_required', hint: '--date YYYY-MM-DD' }));
    process.exit(2);
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(+parsed) || parsed.toISOString().slice(0, 10) !== date) {
    console.error(JSON.stringify({ ok: false, error: 'check_date_invalid', hint: '--date YYYY-MM-DD real calendar date' }));
    process.exit(2);
  }
  const data = load();
  const p = findPilot(data, pid);
  if (!p) {
    console.error(JSON.stringify({ ok: false, error: 'not_found' }));
    process.exit(1);
  }
  if (!p.close?.retentionChecks) {
    console.error(JSON.stringify({ ok: false, error: 'retention_schedule_required' }));
    process.exit(1);
  }
  const at = new Date().toISOString();
  const marked = markDueRetentionChecks(p.close.retentionChecks, date, at);
  p.close.retentionChecks = marked.checks;
  let payout = null;
  let releaseError = null;
  if (marked.day90Due) {
    const fixture = loadObservedPaymentFixture(p.id);
    if (fixture) {
      const released = releasePortionsOnObservedPayment(p.id, fixture);
      if (released.ok) {
        payout = released.payout;
        p.close.observedPaymentAt = fixture.paidAt;
        p.close.payoutId = payout.id;
        p.close.payoutStatus = payout.status;
        p.close.invoiceStatus = 'payment_observed';
        p.close.invoiceDryRun = true;
      } else {
        releaseError = released.error;
      }
    }
  }
  p.history = p.history || [];
  p.history.push({ at, status: 'retention_check', by: 'dg-close', note: date });
  save(data);
  console.log(JSON.stringify({
    ok: true,
    date,
    day90Due: marked.day90Due,
    retentionChecks: p.close.retentionChecks,
    released: Boolean(payout),
    payout,
    releaseError,
    livePayment: false,
  }, null, 2));
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

console.error('usage: status|hire|fee|payment|check|followup|churn <pilotId> …');
process.exit(2);
