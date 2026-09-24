/**
 * Local referral attribution and owed-portion ledger.
 * Records a portion a later authorized payment step can consume.
 * Does not call Stripe or any other payment provider.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';
import { recordPlacementPayout, recordReleasedPlacementPayout } from './demigod-placement-tracker.mjs';

export const PUBLISHED_REFERRAL_TERMS = {
  version: '2026-07-21.1',
  placementFeeBps: 1000,
  individualTalentBps: 2000,
  individualCompanyBps: 1000,
  companyCreditBps: 1000,
  retentionDays: 90,
  basis: 'net_placement_fee_collected_and_retained',
  livePayout: false,
};

function opsRoot() {
  return process.env.DEMIGOD_ROOT || '/home/potter';
}

function inboxFile() {
  return process.env.DEMIGOD_INBOX_PATH || path.join(opsRoot(), 'DEMIGOD-SUBMISSIONS-INBOX.json');
}

function ledgerFile() {
  if (process.env.DEMIGOD_REFERRAL_LEDGER_PATH) return process.env.DEMIGOD_REFERRAL_LEDGER_PATH;
  const root = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
  return path.join(root, 'DEMIGOD-REFERRAL-LEDGER.json');
}

function invoiceFile() {
  return process.env.DEMIGOD_INVOICE_PATH || path.join(opsRoot(), 'DEMIGOD-INVOICE-DRAFTS.json');
}

function observedFile() {
  return process.env.DEMIGOD_OBSERVED_PATH || path.join(opsRoot(), 'DEMIGOD-OBSERVED-PAYMENTS.json');
}

function pairsFile() {
  return process.env.DEMIGOD_PAIRS_PATH || path.join(opsRoot(), 'DEMIGOD-PAIRS.json');
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function clip(value, max = 120) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : text.slice(0, max);
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function roundBps(amount, bps) {
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  if (!Number.isSafeInteger(bps) || bps <= 0 || bps > 10000) return null;
  const out = (BigInt(amount) * BigInt(bps) + 5000n) / 10000n;
  return out <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(out) : null;
}

export function subjectKindForForm(form = '') {
  const value = String(form).toLowerCase();
  if (/partner/.test(value)) return 'hiring_partner';
  if (/engineer|jobseeker|candidate|talent/.test(value)) return 'talent';
  return '';
}

/** Stamp third-party attribution onto a submission record. No I/O. */
export function attachAttribution(record = {}, data = {}) {
  const submitterEmail = normalizeEmail(data['submitted-by'] || data.submittedBy || '');
  if (!submitterEmail) return record;
  const subjectKind = subjectKindForForm(record.form);
  if (!subjectKind) return record;
  const subjectEmail = normalizeEmail(
    subjectKind === 'hiring_partner'
      ? data['partner-email'] || data.partnerEmail
      : data['seeker-email'] || data.seekerEmail,
  );
  if (subjectEmail && subjectEmail === submitterEmail) {
    record.attribution = { attached: false, reason: 'self_referral_forbidden' };
    return record;
  }
  record.attribution = {
    attached: true,
    submitterEmail,
    submitterName: clip(data['submitted-by-name'] || data.submittedByName || ''),
    subjectKind,
    subjectEmail: subjectEmail || null,
  };
  return record;
}

function normToken(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function sameToken(a, b) {
  return Boolean(a) && a === b;
}

/** Parse the comp strings the wizards actually collect ($180k, $180-220k). */
export function parseMoneyToCents(value) {
  const text = String(value || '').replace(/,/g, '');
  const nums = text.match(/\d+(?:\.\d+)?/g);
  if (!nums?.length) return 0;
  let amount = Number(nums[0]);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (/[kK]/.test(text) && amount < 100000) amount *= 1000;
  else if (/[mM]/.test(text) && !/[kK]/.test(text) && amount < 1000) amount *= 1000000;
  if (amount < 1000) return 0;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) ? cents : 0;
}

function baseCents(raw = {}) {
  const cents = Number(raw['first-year-base-cents'] || raw.firstYearBaseCents || 0);
  if (Number.isSafeInteger(cents) && cents > 0) return cents;
  const dollars = Number(raw['first-year-base'] || raw.firstYearBase || 0);
  if (Number.isSafeInteger(dollars) && dollars > 0) return dollars * 100;
  for (const key of ['salary-range', 'salaryRange', 'comp', 'salary-expectation', 'salaryExpectation']) {
    const parsed = parseMoneyToCents(raw[key]);
    if (parsed) return parsed;
  }
  return 0;
}

function boardFile() {
  return process.env.DEMIGOD_BOARD_PATH || path.join(opsRoot(), 'DEMIGOD-BOARD.json');
}

function pilotsFile() {
  return process.env.DEMIGOD_PILOTS_PATH || path.join(opsRoot(), 'DEMIGOD-PILOTS.json');
}

function personOf(item) {
  const raw = item.raw || {};
  const form = String(item.form || '');
  let kind = item.attribution?.subjectKind || subjectKindForForm(form);
  if (!kind && /startup|hire|founder/.test(form)) kind = 'role';
  return {
    item,
    kind,
    id: item.id,
    email: normalizeEmail(raw['seeker-email'] || raw.seekerEmail || raw['partner-email'] || raw.partnerEmail || raw['contact-email'] || raw.contactEmail),
    name: normToken(raw['full-name'] || raw.fullName || raw['partner-name'] || raw.partnerName),
    org: normToken(raw['partner-org'] || raw.partnerOrg || raw['company-name'] || raw.companyName),
    role: normToken(raw['role-title'] || raw.roleTitle),
  };
}

function pushToken(list, value) {
  const token = normToken(value);
  if (token && !list.includes(token)) list.push(token);
}

function writtenCompany(ident = {}, pilot = null, role = null) {
  return normToken(
    ident.company || ident.org || ident.companyName
    || pilot?.company || pilot?.companyName || pilot?.org
    || role?.company || role?.companyName
    || '',
  );
}

/** Submissions the match identity uniquely names. Same title or same name is not enough. */
export function submissionsInMatch(pair = {}) {
  const inbox = readJson(inboxFile(), { items: [] });
  const people = (inbox.items || [])
    .filter((item) => item && item.status !== 'rejected' && item.status !== 'spam')
    .map(personOf);
  const ident = pair.identity || {};
  const chosen = new Map();

  function takeAttached(person) {
    if (person?.item?.attribution?.attached) chosen.set(person.item.id, person.item);
  }

  const pilots = readJson(pilotsFile(), { pilots: [] });
  const pilot = (pilots.pilots || []).find((row) => row.id === pair.roleId || row.id === pair.candId) || null;
  const cand = (pilot?.shortlist || []).find((row) => row.id === pair.candId || row.id === pair.roleId) || null;
  const board = readJson(boardFile(), { roles: [], candidates: [] });
  const role = (board.roles || []).find((row) => row.id === pair.roleId || row.id === pair.candId) || null;
  const company = writtenCompany(ident, pilot, role);

  const email = normalizeEmail(
    ident.candidateEmail || ident.email || ident.candidateLinks
    || cand?.email || cand?.links
    || '',
  );
  const name = normToken(ident.candidateName || ident.name || cand?.name || '');

  for (const person of people) {
    if (person.id === pair.roleId || person.id === pair.candId) takeAttached(person);
    if (email && person.email === email) takeAttached(person);
  }

  const talentChosen = [...chosen.values()].some((item) => (item.attribution?.subjectKind || subjectKindForForm(item.form)) === 'talent');
  if (!talentChosen && name) {
    const nameHits = people.filter((person) => person.kind === 'talent' && sameToken(person.name, name));
    if (nameHits.length === 1) takeAttached(nameHits[0]);
  }

  if (company) {
    for (const person of people) {
      if (person.kind === 'hiring_partner' && (sameToken(person.org, company) || sameToken(person.name, company))) {
        takeAttached(person);
      }
    }
  }

  const salaryRaws = [];
  const writtenRange = ident.salaryRange || ident.comp || role?.comp || role?.['salary-range'] || pilot?.['salary-range'] || pilot?.salaryRange || '';
  if (writtenRange) salaryRaws.push({ 'salary-range': writtenRange });
  if (company) {
    for (const person of people) {
      if (person.kind === 'role' && sameToken(person.org, company)) salaryRaws.push(person.item.raw || {});
    }
  }

  return { rows: [...chosen.values()], salaryRaws };
}

function matchBaseCents(rows, salaryRaws) {
  for (const raw of salaryRaws) {
    const parsed = parseMoneyToCents(raw?.['salary-range'] || raw?.salaryRange || raw?.comp);
    if (parsed) return parsed;
  }
  for (const row of rows) {
    if (row.attribution?.subjectKind !== 'talent') continue;
    const parsed = parseMoneyToCents(row.raw?.['salary-expectation'] || row.raw?.salaryExpectation);
    if (parsed) return parsed;
  }
  for (const row of rows) {
    const parsed = baseCents(row.raw || {});
    if (parsed) return parsed;
  }
  return 0;
}

export function portionForSubmission(submission, { pairId, baseSalaryCents } = {}) {
  const terms = PUBLISHED_REFERRAL_TERMS;
  const hiring = submission?.attribution?.subjectKind === 'hiring_partner';
  const rateBps = hiring ? terms.companyCreditBps : terms.individualTalentBps;
  const feeCents = roundBps(baseSalaryCents, terms.placementFeeBps);
  const portionCents = feeCents == null ? null : roundBps(feeCents, rateBps);
  if (feeCents == null || portionCents == null) return null;
  return {
    id: `owe_${pairId}_${submission.id}`,
    submissionId: submission.id,
    pairId,
    submitterEmail: submission.attribution.submitterEmail,
    submitterName: submission.attribution.submitterName || '',
    subjectKind: submission.attribution.subjectKind,
    rewardMode: hiring ? 'company_credit' : 'fee_share',
    personalCash: hiring ? false : true,
    rateBps,
    placementFeeBps: terms.placementFeeBps,
    basis: terms.basis,
    retentionDays: terms.retentionDays,
    baseSalaryCents,
    feeCents,
    portionCents,
    owed: true,
    payable: false,
    feePaidAndRetained: false,
    livePayment: false,
    paymentProvider: null,
  };
}

/** Owed estimate for one ingested submission. Writes the local ledger. Never charges. */
export function recordOwedForSubmission(submission = {}) {
  if (!submission?.attribution?.attached || !submission.id) return null;
  const baseSalaryCents = baseCents(submission.raw || {});
  if (!baseSalaryCents) return null;
  const row = portionForSubmission(submission, {
    pairId: `submission:${submission.id}`,
    baseSalaryCents,
  });
  if (!row) return null;
  const now = new Date().toISOString();
  const stamped = {
    ...row,
    at: now,
    payable: false,
    livePayment: false,
    paymentProvider: null,
  };
  const store = loadReferralLedger();
  const estimates = new Map((store.estimates || []).map((item) => [item.id, item]));
  estimates.set(stamped.id, stamped);
  atomicWrite(ledgerFile(), `${JSON.stringify({
    at: now,
    portions: store.portions || [],
    estimates: [...estimates.values()],
    paymentCalls: 0,
    livePayout: false,
  }, null, 2)}\n`);
  return stamped;
}

export function loadReferralLedger() {
  const store = readJson(ledgerFile(), null);
  if (!store || !Array.isArray(store.portions)) {
    return { at: null, portions: [], paymentCalls: 0 };
  }
  store.paymentCalls = 0;
  return store;
}

/** Called by the match entry point. Writes the owed record. Never charges. */
export function recordPortionsForMatch(pair = {}) {
  const { rows, salaryRaws } = submissionsInMatch(pair);
  const base = matchBaseCents(rows, salaryRaws);
  if (!rows.length || !base || !pair.pairId) return [];
  const now = new Date().toISOString();
  const fresh = rows
    .map((item) => portionForSubmission(item, { pairId: pair.pairId, baseSalaryCents: base }))
    .filter(Boolean)
    .map((row) => ({ ...row, at: now }));
  const store = loadReferralLedger();
  const byId = new Map((store.portions || []).map((row) => [row.id, row]));
  for (const row of fresh) byId.set(row.id, row);
  const taken = new Set(fresh.map((row) => row.submissionId));
  const estimates = (store.estimates || []).filter((row) => !taken.has(row.submissionId));
  const next = {
    at: now,
    portions: [...byId.values()],
    estimates,
    paymentCalls: 0,
    livePayout: false,
  };
  atomicWrite(ledgerFile(), `${JSON.stringify(next, null, 2)}\n`);
  recordPlacementPayout({
    pairId: pair.pairId,
    pilotId: pair.roleId || '',
    baseSalaryCents: base,
    feeCents: fresh[0]?.feeCents || 0,
    lines: fresh,
  });
  return fresh;
}

function hiredCandIdFromPilot(pilotId) {
  const pilots = readJson(pilotsFile(), { pilots: [] });
  const pilot = (pilots.pilots || []).find((row) => row.id === pilotId);
  return pilot?.close?.hiredCandId || '';
}

/** The pair the hire names. roleId is the pilot; candId is the shortlist person. */
export function pairForHiredCandidate(pilotId, candId) {
  if (!pilotId || !candId) return null;
  const pairs = readJson(pairsFile(), { pairs: {} });
  return Object.values(pairs.pairs || {}).find((row) =>
    row && row.roleId === pilotId && row.candId === candId
  ) || null;
}

function portionsForPilot(pilotId, hiredCandId = '') {
  const candId = hiredCandId || hiredCandIdFromPilot(pilotId);
  const pairs = readJson(pairsFile(), { pairs: {} });
  const pairIds = new Set(
    Object.values(pairs.pairs || {})
      .filter((row) => {
        if (!row || row.state === 'rejected') return false;
        const onPilot = row.roleId === pilotId || row.candId === pilotId;
        if (!onPilot) return false;
        if (candId && row.candId !== candId) return false;
        return true;
      })
      .map((row) => row.pairId),
  );
  return (loadReferralLedger().portions || []).filter((row) => pairIds.has(row.pairId));
}

function addUtcDays(startDate, days) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  return new Date(start + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 30/60/90 checks dated from the hire start. No person enters the three dates. */
export function retentionSchedule(startDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(startDate || ''))) return null;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  if (!Number.isFinite(start) || new Date(start).toISOString().slice(0, 10) !== startDate) return null;
  const row = (day) => ({ day, due: addUtcDays(startDate, day), status: 'scheduled' });
  return {
    d30: row(30),
    d60: row(60),
    d90: row(PUBLISHED_REFERRAL_TERMS.retentionDays),
  };
}

/** Mark checks whose due date is on or before the given date. Does not release. */
export function markDueRetentionChecks(checks = {}, date = '', at = '') {
  const next = {
    d30: { ...(checks.d30 || {}) },
    d60: { ...(checks.d60 || {}) },
    d90: { ...(checks.d90 || {}) },
  };
  let day90Due = false;
  for (const key of ['d30', 'd60', 'd90']) {
    const row = next[key];
    if (!row.due || String(row.due) > String(date)) continue;
    if (row.status !== 'complete') {
      row.status = 'complete';
      row.checkedOn = date;
      if (at) row.checkedAt = at;
    }
    if (key === 'd90') day90Due = true;
  }
  return { checks: next, day90Due };
}

export function saveObservedPaymentFixture(pilotId, fixture = {}) {
  const now = new Date().toISOString();
  const store = readJson(observedFile(), { records: {} });
  const records = store.records && typeof store.records === 'object' ? store.records : {};
  records[pilotId] = {
    observed: fixture.observed === true,
    amountCents: Number(fixture.amountCents),
    currency: String(fixture.currency || ''),
    paidAt: fixture.paidAt || '',
    retained: fixture.retained === true,
    at: now,
  };
  atomicWrite(observedFile(), `${JSON.stringify({ at: now, records, livePayment: false }, null, 2)}\n`);
  return records[pilotId];
}

export function loadObservedPaymentFixture(pilotId) {
  const store = readJson(observedFile(), { records: {} });
  return store.records?.[pilotId] || null;
}

function applyHireBase(row, baseSalaryCents) {
  const terms = PUBLISHED_REFERRAL_TERMS;
  const hiring = row.subjectKind === 'hiring_partner' || row.rewardMode === 'company_credit';
  const rateBps = hiring ? terms.companyCreditBps : terms.individualTalentBps;
  const feeCents = roundBps(baseSalaryCents, terms.placementFeeBps);
  const portionCents = feeCents == null ? null : roundBps(feeCents, rateBps);
  if (feeCents == null || portionCents == null) return false;
  row.baseSalaryCents = baseSalaryCents;
  row.feeCents = feeCents;
  row.portionCents = portionCents;
  row.rateBps = rateBps;
  row.placementFeeBps = terms.placementFeeBps;
  return true;
}

/** Mark this hire's owed portions payable only after the client payment is observed. Never charges. */
export function attachPortionsOnObservedPayment(pilotId, invoiceDraftId, baseSalaryCents = 0, hiredCandId = '') {
  const wanted = new Set(portionsForPilot(pilotId, hiredCandId).map((row) => row.id));
  const store = loadReferralLedger();
  const now = new Date().toISOString();
  const attached = [];
  for (const row of store.portions || []) {
    if (!wanted.has(row.id)) continue;
    if (baseSalaryCents && !applyHireBase(row, baseSalaryCents)) continue;
    row.payable = false;
    row.payableOn = 'observed_payment';
    row.settlementStatus = 'payable_on_observed_payment';
    row.livePayment = false;
    row.paymentProvider = null;
    row.feePaidAndRetained = false;
    row.invoiceDraftId = invoiceDraftId;
    row.attachedAt = now;
    attached.push(row);
  }
  atomicWrite(ledgerFile(), `${JSON.stringify({
    ...store,
    at: now,
    paymentCalls: 0,
    livePayout: false,
  }, null, 2)}\n`);
  return attached;
}

/** Placement-invoice dry-run. Writes a local draft and attaches owed portions. Never sends. */
export function emitPlacementInvoiceDraft({
  pilotId,
  company = '',
  roleTitle = '',
  startDate = '',
  compAnnual = 0,
  hiredCandId = '',
} = {}) {
  const baseSalaryCents = Number(compAnnual) > 0 ? Number(compAnnual) * 100 : 0;
  const feeCents = roundBps(baseSalaryCents, PUBLISHED_REFERRAL_TERMS.placementFeeBps);
  const now = new Date().toISOString();
  const id = `inv_${pilotId}`;
  const namedCand = hiredCandId || hiredCandIdFromPilot(pilotId);
  const hiredPair = pairForHiredCandidate(pilotId, namedCand);
  const attached = attachPortionsOnObservedPayment(pilotId, id, baseSalaryCents, namedCand);
  const draft = {
    id,
    pilotId,
    status: 'draft',
    dryRun: true,
    livePayment: false,
    paymentProvider: null,
    sendInvoice: false,
    billTo: 'hiring_company',
    talentBilled: false,
    currency: 'USD',
    netDays: 30,
    company,
    roleTitle,
    startDate,
    hiredCandId: namedCand || null,
    hiredPairId: hiredPair?.pairId || null,
    baseSalaryCents,
    feeCents,
    payableOn: 'observed_payment',
    portions: attached.map((row) => ({
      portionId: row.id,
      submissionId: row.submissionId,
      pairId: row.pairId,
      submitterEmail: row.submitterEmail,
      subjectKind: row.subjectKind,
      rewardMode: row.rewardMode,
      personalCash: row.personalCash === true,
      portionCents: row.portionCents,
      feeCents: row.feeCents,
      baseSalaryCents: row.baseSalaryCents,
      payable: false,
      payableOn: 'observed_payment',
      settlementStatus: 'payable_on_observed_payment',
      livePayment: false,
    })),
    at: now,
  };
  const store = readJson(invoiceFile(), { records: [] });
  const records = Array.isArray(store.records) ? store.records : [];
  const byId = new Map(records.map((row) => [row.id, row]));
  byId.set(draft.id, draft);
  atomicWrite(invoiceFile(), `${JSON.stringify({
    at: now,
    records: [...byId.values()],
    dryRun: true,
    livePayment: false,
  }, null, 2)}\n`);
  return draft;
}

function retentionWindowMet(startDate, paidAt, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(startDate || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(paidAt || ''))) return false;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const paid = Date.parse(`${paidAt}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(paid)) return false;
  return paid >= start + days * 24 * 60 * 60 * 1000;
}

function pilotStatus(pilotId) {
  const pilots = readJson(pilotsFile(), { pilots: [] });
  const pilot = (pilots.pilots || []).find((row) => row.id === pilotId);
  return pilot?.status || '';
}

/** Consume an observed client-payment fixture. Writes a local released payout. Never charges. */
export function releasePortionsOnObservedPayment(pilotId, fixture = {}) {
  if (fixture?.observed !== true) return { ok: false, error: 'settlement_attestation_required' };
  if (pilotStatus(pilotId) === 'churned') return { ok: false, error: 'churn_blocks_release' };
  const hired = pairForHiredCandidate(pilotId, hiredCandIdFromPilot(pilotId));
  if (hired?.state === 'rejected') return { ok: false, error: 'rejected_pair_blocks_release' };
  const invoices = readJson(invoiceFile(), { records: [] });
  const draft = (invoices.records || []).find((row) => row.pilotId === pilotId);
  if (!draft) return { ok: false, error: 'invoice_draft_required' };
  const amountCents = Number(fixture.amountCents);
  if (!Number.isSafeInteger(amountCents) || amountCents !== draft.feeCents) {
    return { ok: false, error: 'settlement_amount_mismatch' };
  }
  if (String(fixture.currency || '').toUpperCase() !== 'USD') return { ok: false, error: 'settlement_currency_invalid' };
  if (fixture.retained !== true) return { ok: false, error: 'retention_attestation_required' };
  if (!retentionWindowMet(draft.startDate, fixture.paidAt, PUBLISHED_REFERRAL_TERMS.retentionDays)) {
    return { ok: false, error: 'retention_window_open' };
  }
  const wanted = new Set(portionsForPilot(pilotId).map((row) => row.id));
  const store = loadReferralLedger();
  const now = new Date().toISOString();
  const payoutId = `payout_released_${pilotId}`;
  const released = [];
  for (const row of store.portions || []) {
    if (!wanted.has(row.id)) continue;
    if (row.invoiceDraftId && row.invoiceDraftId !== draft.id) continue;
    if (!applyHireBase(row, draft.baseSalaryCents)) continue;
    row.settlementStatus = 'released_local';
    row.payable = false;
    row.livePayment = false;
    row.paymentProvider = null;
    row.feePaidAndRetained = true;
    row.observedPayment = true;
    row.observedAmountCents = amountCents;
    row.observedPaidAt = fixture.paidAt;
    row.releasedAt = row.releasedAt || now;
    row.payoutId = payoutId;
    released.push(row);
  }
  if (!released.length) return { ok: false, error: 'portions_required' };
  atomicWrite(ledgerFile(), `${JSON.stringify({
    ...store,
    at: now,
    paymentCalls: 0,
    livePayout: false,
  }, null, 2)}\n`);
  const payout = recordReleasedPlacementPayout({
    pilotId,
    invoiceDraftId: draft.id,
    baseSalaryCents: draft.baseSalaryCents,
    feeCents: draft.feeCents,
    observedAmountCents: amountCents,
    paidAt: fixture.paidAt,
    lines: released,
  });
  draft.status = 'payment_observed';
  draft.sendInvoice = false;
  draft.livePayment = false;
  draft.paymentProvider = null;
  draft.dryRun = true;
  draft.observed = true;
  draft.observedAmountCents = amountCents;
  draft.paidAt = fixture.paidAt;
  draft.payoutId = payout.id;
  draft.releasedAt = now;
  for (const line of draft.portions || []) {
    if (!released.some((row) => row.id === line.portionId || row.submissionId === line.submissionId)) continue;
    line.settlementStatus = 'released_local';
    line.payable = false;
    line.livePayment = false;
    line.payoutId = payout.id;
    line.baseSalaryCents = draft.baseSalaryCents;
    line.feeCents = draft.feeCents;
    const releasedRow = released.find((row) => row.id === line.portionId || row.submissionId === line.submissionId);
    if (releasedRow) line.portionCents = releasedRow.portionCents;
  }
  const byId = new Map((invoices.records || []).map((row) => [row.id, row]));
  byId.set(draft.id, draft);
  atomicWrite(invoiceFile(), `${JSON.stringify({
    ...invoices,
    at: now,
    records: [...byId.values()],
    dryRun: true,
    livePayment: false,
  }, null, 2)}\n`);
  return { ok: true, payout, portions: released, invoiceDraft: draft };
}
