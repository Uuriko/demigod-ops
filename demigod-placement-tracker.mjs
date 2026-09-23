/**
 * Demigod Placement Tracker (to payment)
 * Logs hires from pilots and writes a local dry-run payout record.
 * No Stripe call, no invoice send. Pending: live payment.
 * Run: node demigod-placement-tracker.mjs --hire <pilotId> YYYY-MM-DD <annualDollars>
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

function opsRoot() {
  return process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
}

function payoutFile() {
  return process.env.DEMIGOD_PAYOUT_PATH || path.join(opsRoot(), 'DEMIGOD-PLACEMENT-PAYOUTS.json');
}

function readStore() {
  try {
    const store = JSON.parse(fs.readFileSync(payoutFile(), 'utf8'));
    if (store && Array.isArray(store.records)) return store;
  } catch {
    /* first record creates the file */
  }
  return { at: null, records: [] };
}

/** Dry-run placement payout. Writes the local record. Never charges. */
export function recordPlacementPayout({
  pairId = '',
  pilotId = '',
  hireDate = '',
  salary = 0,
  baseSalaryCents = 0,
  feeCents = 0,
  lines = [],
} = {}) {
  const now = new Date().toISOString();
  const id = `payout_${pairId || pilotId || 'manual'}`;
  const record = {
    id,
    pairId: pairId || null,
    pilotId: pilotId || null,
    hireDate: hireDate || null,
    salary: Number(salary) || null,
    baseSalaryCents: Number(baseSalaryCents) || 0,
    feeCents: Number(feeCents) || 0,
    status: 'completed_local',
    dryRun: true,
    livePayment: false,
    paymentProvider: null,
    payable: false,
    feePaidAndRetained: false,
    at: now,
    lines: (lines || []).map((row) => ({
      portionId: row.id || null,
      submissionId: row.submissionId || null,
      submitterEmail: row.submitterEmail || '',
      subjectKind: row.subjectKind || '',
      rewardMode: row.rewardMode || '',
      personalCash: row.personalCash === true,
      portionCents: row.portionCents,
      owed: true,
    })),
  };
  const store = readStore();
  const byId = new Map((store.records || []).map((row) => [row.id, row]));
  byId.set(record.id, record);
  atomicWrite(payoutFile(), `${JSON.stringify({
    at: now,
    records: [...byId.values()],
    dryRun: true,
    livePayment: false,
  }, null, 2)}\n`);
  return record;
}

/** Local release after an observed client payment. Writes the record. Never charges. */
export function recordReleasedPlacementPayout({
  pilotId = '',
  invoiceDraftId = '',
  baseSalaryCents = 0,
  feeCents = 0,
  observedAmountCents = 0,
  paidAt = '',
  lines = [],
} = {}) {
  const now = new Date().toISOString();
  const id = `payout_released_${pilotId || 'manual'}`;
  const record = {
    id,
    pairId: null,
    pilotId: pilotId || null,
    invoiceDraftId: invoiceDraftId || null,
    hireDate: null,
    salary: null,
    baseSalaryCents: Number(baseSalaryCents) || 0,
    feeCents: Number(feeCents) || 0,
    observedAmountCents: Number(observedAmountCents) || 0,
    paidAt: paidAt || null,
    status: 'released_local',
    released: true,
    source: 'observed_client_payment_fixture',
    dryRun: true,
    livePayment: false,
    paymentProvider: null,
    payable: false,
    feePaidAndRetained: true,
    at: now,
    lines: (lines || []).map((row) => ({
      portionId: row.id || row.portionId || null,
      submissionId: row.submissionId || null,
      submitterEmail: row.submitterEmail || '',
      subjectKind: row.subjectKind || '',
      rewardMode: row.rewardMode || '',
      personalCash: row.personalCash === true,
      portionCents: row.portionCents,
      owed: true,
      settlementStatus: 'released_local',
      livePayment: false,
    })),
  };
  const store = readStore();
  const byId = new Map((store.records || []).map((row) => [row.id, row]));
  byId.set(record.id, record);
  atomicWrite(payoutFile(), `${JSON.stringify({
    at: now,
    records: [...byId.values()],
    dryRun: true,
    livePayment: false,
  }, null, 2)}\n`);
  return record;
}

function placementLogFile() {
  return path.join(opsRoot(), 'DEMIGOD-PLACEMENTS.jsonl');
}

function refuse(error) {
  console.error(JSON.stringify({ ok: false, error, livePayment: false }));
  process.exit(2);
}

async function runCli() {
  const args = process.argv.slice(2);
  if (args[0] !== '--hire') refuse('hire_required');
  const pilot = String(args[1] || '').trim();
  const date = String(args[2] || '');
  const salary = Number(args[3]);
  if (!pilot) refuse('pilot_required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) refuse('start_date_required');
  if (!Number.isSafeInteger(salary) || salary <= 0) refuse('salary_required');
  const { retentionSchedule, PUBLISHED_REFERRAL_TERMS, roundBps } = await import('./demigod-referral-ledger.mjs');
  const schedule = retentionSchedule(date);
  if (!schedule) refuse('start_date_invalid');
  const baseSalaryCents = salary * 100;
  if (!Number.isSafeInteger(baseSalaryCents)) refuse('salary_required');
  const feeCents = roundBps(baseSalaryCents, PUBLISHED_REFERRAL_TERMS.placementFeeBps);
  if (feeCents == null) refuse('fee_invalid');
  const payout = recordPlacementPayout({
    pilotId: pilot,
    hireDate: date,
    salary,
    baseSalaryCents,
    feeCents,
  });
  const record = {
    ok: true,
    pilot,
    hireDate: date,
    salary,
    feeCents,
    guaranteeEnd: schedule.d90.due,
    status: 'pending-invoice',
    payoutId: payout.id,
    dryRun: true,
    livePayment: false,
    paymentProvider: null,
    log: placementLogFile(),
  };
  fs.appendFileSync(placementLogFile(), `${JSON.stringify(record)}\n`);
  console.log(JSON.stringify(record));
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  runCli().catch((err) => {
    console.error(JSON.stringify({ ok: false, error: 'placement_cli_failed', detail: String(err?.message || err), livePayment: false }));
    process.exit(1);
  });
}
