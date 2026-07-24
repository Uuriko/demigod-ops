#!/usr/bin/env node
/**
 * Demigod funnel — lead state machine + honest status.
 * SoR: DEMIGOD-LEADS.json (does not write board.json).
 *
 *   node demigod-funnel.mjs status
 *   node demigod-funnel.mjs transition --id=LEAD --to=STATE [--evidence=path] [--pair=PAIR]
 *   node demigod-funnel.mjs normalize   # add state from legacy status
 *   node demigod-funnel.mjs draft --id=LEAD   # write email draft artifact only
 *   node demigod-funnel.mjs hygiene           # copy-policy scan of funnel-drafts/
 *   node demigod-funnel.mjs disqualify-junk   # aggregator/SERP noise → disqualified
 *   node demigod-funnel.mjs email-mx          # free DNS MX: bad domains → policy_hold
 *   node demigod-funnel.mjs import-events     # merge consented Events Bot leads (no invent)
 *   node demigod-funnel.mjs release-contactable-holds  # policy_hold + usable contact → drafted
 *   node demigod-funnel.mjs send-package              # approved + contact → human send board (no send)
 *   node demigod-funnel.mjs approve-drafted --note="reviewed batch" [--dry-run]  # human package under /tmp/dg-busy/funnel/
 *   node demigod-funnel.mjs receipt --id=LEAD --channel=email --to=addr --message-id=MID
 *   node demigod-funnel.mjs repair-history --id=LEAD [--apply]
 *   node demigod-funnel.mjs join [--apply]
 *
 * Honesty: no state advances on a claim. `sent` requires a receipt file.
 * No auto-send. No auto-DM.
 */
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { atomicWrite, readJson, BUSY, withFileLock } from './demigod-agent-tools-lib.mjs';
import {
  checkOutreach,
  identityKeys,
  isIdentitySuppressedByOther,
  SUPPRESS_STATES,
} from './demigod-outreach-policy.mjs';
import {
  applyInboxContactPatches,
  extractEmail,
  loadInbox,
  planGmailFormCandidates,
  planInboxContactPatches,
  submissionsWithGmailPatches,
  updateInbox,
} from './demigod-submissions-lib.mjs';
import {
  attachPublicContact,
  isJunkAggregatorLead,
  isUsableOutreachEmail,
  isUsableOutreachHandle,
  needsContactEnrich,
  enrichScrapeUrlKey,
  enrichRecentlyAttempted,
  enrichAttemptsExhausted,
  ENRICH_COOLDOWN_MS,
  leadCollectionPaused,
  scrubNoiseContact,
} from './demigod-lead-collect.mjs';
import { feeCents, invoiceStub } from './demigod-revenue.mjs';
import { draftHygiene } from './demigod-demand.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || __dirname;
const LEADS = path.join(ROOT, 'DEMIGOD-LEADS.json');
const RECEIPTS = path.join(ROOT, 'demigod-outreach', 'funnel-receipts');
const CRM_LOCK = path.join(ROOT, 'DEMIGOD-LEADS.json.lock');
const DRAFTS = path.join(ROOT, 'demigod-outreach', 'funnel-drafts');
const LOG = path.join(BUSY, 'funnel', 'transitions.jsonl');
/** Live Trust Ladder packages under /tmp/dg-busy; isolated DEMIGOD_ROOT never overwrites them. */
const PKG_BUSY =
  path.resolve(ROOT) === path.resolve(__dirname)
    ? (process.env.DEMIGOD_BUSY || BUSY)
    : path.join(ROOT, '.dg-busy');

/** Ordered non-terminal path (not all edges are linear — see ALLOWED). */
export const STATES = [
  'sourced',
  'enriched',
  'drafted',
  'approved',
  'sent',
  'replied',
  'form_filled',
  'in_review',
  'proposed',
  'mutual_yes',
  'intro_made',
  'interviewing',
  'hired',
  'invoiced',
  'paid',
  // terminal / pause
  'nudged',
  'cold',
  'bounced',
  'opted_out',
  'rejected',
  'quarantined',
  'disqualified',
  'policy_hold',
  'enrich_failed',
  'stale_form',
  'one_side_no',
  'fell_through',
  'overdue',
];

const TERMINAL = new Set([
  'paid',
  'opted_out',
  'quarantined',
  'disqualified',
  'rejected',
  'cold',
  'bounced',
  'fell_through',
]);

/** from → allowed next */
const ALLOWED = {
  // sourced→drafted allowed when public signal is already enough (draft cites URL/fact)
  // form_filled from early states: inbound WIZ leads already submitted (join evidence)
  sourced: ['enriched', 'drafted', 'form_filled', 'disqualified', 'quarantined', 'enrich_failed', 'policy_hold'],
  enriched: ['drafted', 'form_filled', 'disqualified', 'policy_hold'],
  drafted: ['approved', 'form_filled', 'policy_hold', 'disqualified'],
  approved: ['sent', 'drafted', 'form_filled', 'policy_hold', 'disqualified'], // DQ junk aggregators post-approve
  sent: ['replied', 'form_filled', 'nudged', 'bounced', 'opted_out', 'cold'], // form without reply
  nudged: ['replied', 'form_filled', 'cold', 'opted_out', 'bounced'],
  replied: ['form_filled', 'opted_out', 'cold', 'stale_form'],
  form_filled: ['in_review', 'opted_out', 'policy_hold', 'quarantined'],
  in_review: ['proposed', 'rejected', 'disqualified'],
  proposed: ['mutual_yes', 'one_side_no', 'rejected'],
  mutual_yes: ['intro_made', 'one_side_no'],
  intro_made: ['interviewing', 'fell_through'],
  interviewing: ['hired', 'fell_through'],
  hired: ['invoiced', 'fell_through'],
  invoiced: ['paid', 'overdue'],
  overdue: ['paid', 'fell_through'],
  // policy_hold → form_filled: parked no-contact lead later fills WIZ with real contact
  policy_hold: ['drafted', 'disqualified', 'form_filled'],
  enrich_failed: ['enriched', 'disqualified'],
  stale_form: ['form_filled', 'cold'],
  one_side_no: ['cold', 'disqualified'],
};

/** Evidence required to enter `to` (relative paths or absolute; must exist + non-empty). */
const EVIDENCE_FOR = {
  enriched: { kind: 'note', hint: 'scrape path or enrichment note' },
  drafted: { kind: 'file', hint: 'draft file under demigod-outreach/funnel-drafts/' },
  approved: { kind: 'note', hint: 'actor note (human approve)' },
  sent: { kind: 'receipt', hint: 'receipt file with Message-ID or SENT-CONFIRMED + channel evidence' },
  nudged: { kind: 'receipt', hint: 'nudge/followup send receipt (SENT-CONFIRMED or Message-ID)' },
  replied: { kind: 'file', hint: 'inbound reply capture path' },
  form_filled: { kind: 'file', hint: 'submission id/path in inbox' },
  // Match bridge money path: vacuous form_filled→in_review without engine artifact is fail-closed
  in_review: { kind: 'file', hint: 'match engine bridge artifact (lead + engine shape)' },
  proposed: { kind: 'note', hint: 'match-review verdict note' },
  mutual_yes: { kind: 'file', hint: 'both-sides-yes artifact' },
  intro_made: { kind: 'receipt', hint: 'intro send receipt' },
  hired: { kind: 'file', hint: 'written hire confirmation' },
  invoiced: { kind: 'file', hint: 'invoice send evidence' },
  paid: { kind: 'file', hint: 'payment/bank evidence' },
  opted_out: { kind: 'note', hint: 'opt-out signal' },
  bounced: { kind: 'note', hint: 'bounce / DSN signal' },
  quarantined: { kind: 'file', hint: 'defect artifact' },
};

function loadLeads() {
  const j = readJson(LEADS);
  if (!j) throw new Error(`missing or invalid ${LEADS}`);
  return j;
}

function allLeads(doc) {
  const out = [];
  for (const p of doc.partners || []) out.push({ side: 'partner', lead: p });
  for (const t of doc.talent || []) out.push({ side: 'talent', lead: t });
  return out;
}

function findLead(doc, id) {
  for (const row of allLeads(doc)) {
    if (row.lead.id === id) return row;
  }
  return null;
}

export function placementPairId(lead, requested = '') {
  const explicit = String(requested || '').trim();
  const primary = String(lead?.pairId || '').trim();
  const listed = [...new Set((Array.isArray(lead?.pairIds) ? lead.pairIds : [])
    .map((id) => String(id).trim()).filter(Boolean))];
  const bound = new Set([primary, ...listed].filter(Boolean));
  if (explicit) return bound.has(explicit) ? explicit : '';
  return primary || (listed.length === 1 ? listed[0] : '');
}

/** Map legacy status → funnel state */
export function legacyToState(status) {
  const s = String(status || '').toLowerCase();
  if (!s || s === 'triage' || s === 'pipeline-source') return 'sourced';
  if (s === 'review-inbox') return 'sourced';
  if (STATES.includes(s)) return s;
  return 'sourced';
}

export function getState(lead) {
  if (lead.state && STATES.includes(lead.state)) return lead.state;
  return legacyToState(lead.status);
}

/** Pure audit: each recorded transition must continue from the prior destination. */
export function lifecycleHistoryIssues(lead) {
  const history = Array.isArray(lead?.stateHistory) ? lead.stateHistory : [];
  return history.flatMap((entry, index) => {
    if (!entry?.from || !entry?.to) return [{ index, reason: 'missing from/to' }];
    if (index && entry.from !== history[index - 1]?.to) {
      return [{ index, reason: `chain break: ${history[index - 1]?.to} → ${entry.from}` }];
    }
    return [];
  });
}

/** Keep a valid chain anchored at the first entry; quarantine links that cannot follow it. */
export function repairLifecycleHistory(lead) {
  const history = Array.isArray(lead?.stateHistory) ? lead.stateHistory : [];
  const kept = [];
  const removed = [];
  for (const [index, entry] of history.entries()) {
    if (!entry?.from || !entry?.to || (kept.length && entry.from !== kept.at(-1).to)) {
      removed.push({ index, entry });
    } else {
      kept.push(entry);
    }
  }
  return { kept, removed };
}

export function receiptLooksValid(text) {
  if (!text || !String(text).trim()) return false;
  const t = String(text);
  // Fail closed: must look like a real send record, not a draft
  if (/SIMULATED|placeholder@|example\.com/i.test(t)) return false;
  if (/DRAFT-ONLY|BLAST/i.test(t)) return false;
  return /SENT-CONFIRMED/i.test(t) && hasTransportReceiptMarker(t);
}

const hasTransportReceiptMarker = (text) =>
  /Message-ID\s*:|message_id\s*[:=]|smtp\s*250|gmail.*id/i.test(String(text || ''));

/**
 * True only when a lead has a revalidated send receipt artifact (history or path).
 * Fail-closed: bare state=sent without valid evidence does not count.
 * Pure aside from optional disk reads for evidence paths.
 */
export function hasValidSendReceipt(
  lead,
  {
    resolve = resolveEvidence,
    read = (p) => fs.readFileSync(p, 'utf8'),
    exists = (p) => fs.existsSync(p),
  } = {},
) {
  if (!lead || typeof lead !== 'object') return false;
  const tryText = (text) => receiptLooksValid(text);
  const tryPath = (raw) => {
    if (!raw) return false;
    try {
      const p = resolve(String(raw));
      if (!p || !exists(p)) return false;
      return tryText(read(p));
    } catch {
      return false;
    }
  };
  const hist = Array.isArray(lead.stateHistory) ? lead.stateHistory : [];
  for (const h of hist) {
    if (!h || (h.to !== 'sent' && h.kind !== 'send' && h.kind !== 'receipt')) continue;
    if (h.evidenceText && tryText(h.evidenceText)) return true;
    if (h.note && tryText(h.note) && /SENT-CONFIRMED|Message-ID/i.test(String(h.note))) return true;
    if (h.evidence && tryPath(h.evidence)) return true;
  }
  if (lead.sentReceipt && tryPath(lead.sentReceipt)) return true;
  if (lead.receiptPath && tryPath(lead.receiptPath)) return true;
  return false;
}

/** Count leads with revalidated send receipts (not alias of mutable sent state). */
export function countReceiptBackedSent(doc, opts) {
  let n = 0;
  for (const { lead } of allLeads(doc || {})) {
    if (hasValidSendReceipt(lead, opts)) n++;
  }
  return n;
}

function resolveEvidence(p) {
  if (!p) return null;
  if (path.isAbsolute(p)) return p;
  const cands = [
    path.join(ROOT, p),
    path.join(RECEIPTS, p),
    path.join(DRAFTS, p),
    path.join(BUSY, 'funnel', p),
  ];
  for (const c of cands) if (fs.existsSync(c)) return c;
  return path.join(ROOT, p);
}

/**
 * Pure transition check — no IO side effects except optional evidence read.
 * @returns {{ ok: boolean, error?: string }}
 */
export function canTransition(from, to, { evidencePath = null, evidenceText = null, actor = 'agent' } = {}) {
  if (!STATES.includes(to)) return { ok: false, error: `unknown state: ${to}` };
  if (from === to) return { ok: false, error: 'already in state' };
  if (TERMINAL.has(from)) {
    return { ok: false, error: `terminal state ${from} cannot move to ${to}` };
  }
  const allowed = ALLOWED[from];
  if (allowed && !allowed.includes(to)) {
    return { ok: false, error: `${from} → ${to} not allowed (allowed: ${allowed.join(', ')})` };
  }
  if (!allowed && !TERMINAL.has(to)) {
    // unknown from — only allow into sourced/disqualified via normalize
    if (from !== 'sourced' && to !== 'sourced') {
      return { ok: false, error: `no edges from ${from}` };
    }
  }
  // Trust Ladder L1: approved is human-only (loop-stopper; actor is self-reported)
  if (to === 'approved' && actor !== 'human') {
    return {
      ok: false,
      error: 'approved requires --actor=human (Trust Ladder L1); agents stop at drafted',
    };
  }

  const need = EVIDENCE_FOR[to];
  if (!need) return { ok: true };

  if (need.kind === 'note') {
    if (!evidenceText && !evidencePath) {
      return { ok: false, error: `${to} requires --evidence note or path (${need.hint})` };
    }
    if (evidenceText && !String(evidenceText).trim()) {
      return { ok: false, error: `${to} evidence note is empty` };
    }
    if (evidencePath) {
      const file = resolveEvidence(evidencePath);
      if (!fs.existsSync(file)) return { ok: false, error: `evidence missing: ${file}` };
      if (!fs.statSync(file).size) return { ok: false, error: `evidence empty: ${file}` };
    }
    return { ok: true };
  }

  // file or receipt
  let text = evidenceText;
  let file = evidencePath ? resolveEvidence(evidencePath) : null;
  if (file) {
    if (!fs.existsSync(file)) return { ok: false, error: `evidence missing: ${file}` };
    const st = fs.statSync(file);
    if (!st.size) return { ok: false, error: `evidence empty: ${file}` };
    text = fs.readFileSync(file, 'utf8');
  }
  if (!text || !String(text).trim()) {
    return { ok: false, error: `${to} requires --evidence path (${need.hint})` };
  }
  if (need.kind === 'receipt' && !receiptLooksValid(text)) {
    return {
      ok: false,
      error: `${to} receipt invalid — need SENT-CONFIRMED or Message-ID (not draft/sim/blast)`,
    };
  }
  if (need.kind === 'receipt' && !hasTransportReceiptMarker(text)) {
    return { ok: false, error: `${to} receipt requires Message-ID, SMTP 250, or Gmail id` };
  }
  return { ok: true };
}

function appendLog(row) {
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  fs.appendFileSync(LOG, JSON.stringify(row) + '\n');
}

const FUNNEL_META_NOTE = 'state is SoR; status mirrored for legacy. No auto-send.';
const FUNNEL_SCHEMA = 'demigod.leads/2+funnel';

export function normalizeDoc(doc) {
  let n = 0;
  for (const { lead } of allLeads(doc)) {
    const before = lead.handle;
    const beforeCo = lead.companyUrl;
    attachPublicContact(lead);
    scrubNoiseContact(lead); // drop junk companyUrl / noise contacts
    if (lead.handle && lead.handle !== before) n++;
    if (beforeCo && !lead.companyUrl) n++;
    const st = getState(lead);
    if (lead.state !== st) {
      lead.state = st;
      n++;
    }
    // keep status as mirror for older readers
    if (!lead.status || lead.status === 'triage') {
      if (lead.status !== st) {
        lead.status = st;
        n++;
      }
    }
  }
  if (!doc.schema || doc.schema.startsWith('demigod.leads/2')) {
    if (doc.schema !== FUNNEL_SCHEMA) {
      doc.schema = FUNNEL_SCHEMA;
      n++;
    }
  }
  // Idempotent: do not rewrite funnel.at when metadata is already current
  const funnelSame =
    doc.funnel &&
    Array.isArray(doc.funnel.states) &&
    doc.funnel.states.length === STATES.length &&
    doc.funnel.states.every((s, i) => s === STATES[i]) &&
    doc.funnel.note === FUNNEL_META_NOTE;
  if (!funnelSame) {
    doc.funnel = {
      at: new Date().toISOString(),
      states: STATES,
      note: FUNNEL_META_NOTE,
    };
    n++;
  }
  return { doc, updated: n };
}

function saveDoc(doc) {
  atomicWrite(LEADS, JSON.stringify(doc, null, 2) + '\n');
  try { fs.chmodSync(LEADS, 0o600); } catch { /* PII (contacts): 0600 even on a fresh (umask) file */ }
}

/** Draft "To:" target: email || handle || url (reply via posting). */
export function draftContactTo(lead) {
  attachPublicContact(lead);
  const email = String(lead.email || lead.contactEmail || '').trim();
  if (email) return email;
  const handle = String(lead.handle || '').trim();
  if (handle) return handle.startsWith('@') ? handle : `@${handle}`;
  if (lead.url) return `${lead.url} (no direct contact — reply via posting)`;
  return '(no direct contact)';
}

/**
 * No email, handle, or posting URL — cannot outbound at all.
 * URL-only is reachable (reply via posting); do not treat as unreachable.
 */
export function isUnreachable(lead) {
  if (!lead || typeof lead !== 'object') return true;
  attachPublicContact(lead);
  const email = String(lead.email || lead.contactEmail || '').trim();
  const handle = String(lead.handle || '').trim();
  const url = String(lead.url || lead.applyUrl || '').trim();
  return !email && !handle && !url;
}

/**
 * FOCUS: draft/approve/send money path needs usable email|handle.
 * URL-only is reachable for enrich but not draftable (would clog human approve queue).
 */
export function hasUsableOutreachContact(lead) {
  if (!lead || typeof lead !== 'object') return false;
  attachPublicContact(lead);
  const email = String(lead.email || lead.contactEmail || '').trim();
  const handle = String(lead.handle || '').trim();
  return isUsableOutreachEmail(email) || isUsableOutreachHandle(handle);
}

/**
 * Park drafted/approved (and sourced/enriched) fully-unreachable leads on policy_hold.
 * Pure-ish: mutates lead rows in doc; caller saveDoc. Idempotent.
 */
export function parkUnreachable(doc, { actor = 'agent', note = 'no-contact-email' } = {}) {
  const parked = [];
  const skipped = [];
  const fromOk = new Set(['sourced', 'enriched', 'drafted', 'approved']);
  for (const { lead } of allLeads(doc)) {
    const from = getState(lead);
    if (!isUnreachable(lead)) {
      skipped.push({ id: lead.id, reason: 'has-contact-or-url' });
      continue;
    }
    if (from === 'policy_hold') {
      if (!lead.policyHoldReason) lead.policyHoldReason = 'no-contact-email';
      skipped.push({ id: lead.id, reason: 'already-hold' });
      continue;
    }
    if (!fromOk.has(from)) {
      skipped.push({ id: lead.id, reason: `state=${from}` });
      continue;
    }
    const check = canTransition(from, 'policy_hold', { evidenceText: note, actor });
    if (!check.ok) {
      skipped.push({ id: lead.id, reason: check.error });
      continue;
    }
    const at = new Date().toISOString();
    lead.state = 'policy_hold';
    lead.status = 'policy_hold';
    lead.policyHoldReason = lead.policyHoldReason || 'no-contact-email';
    lead.stateUpdatedAt = at;
    lead.stateHistory = lead.stateHistory || [];
    lead.stateHistory.push({ at, from, to: 'policy_hold', actor, evidence: null, note });
    parked.push({ id: lead.id, from, at });
  }
  return { parked, skipped };
}

/**
 * Free DNS MX hygiene: leads with a contact email that has no MX → policy_hold.
 * Never invents emails. Handle/url-only skipped. Inject checkMx for tests.
 */
export async function parkNoMx(
  doc,
  { actor = 'agent', note = 'no-mx', checkMx } = {},
) {
  const parked = [];
  const skipped = [];
  const fromOk = new Set(['sourced', 'enriched', 'drafted', 'approved']);
  const mxFn =
    checkMx ||
    (async (email) => {
      const { checkEmailMx } = await import('./demigod-free-ops.mjs');
      return checkEmailMx(email);
    });
  for (const { lead } of allLeads(doc)) {
    const from = getState(lead);
    attachPublicContact(lead);
    const email = String(lead.email || lead.contactEmail || '')
      .trim()
      .toLowerCase();
    if (!email) {
      skipped.push({ id: lead.id, reason: 'no-email' });
      continue;
    }
    if (!isUsableOutreachEmail(email)) {
      skipped.push({ id: lead.id, reason: 'noise-email' });
      continue;
    }
    if (!fromOk.has(from) && from !== 'policy_hold') {
      skipped.push({ id: lead.id, reason: `state=${from}` });
      continue;
    }
    let mx;
    try {
      mx = await mxFn(email);
    } catch (err) {
      skipped.push({ id: lead.id, reason: 'mx-error:' + String(err?.message || err) });
      continue;
    }
    if (mx?.ok) {
      // stamp once only — avoid thrashing leads JSON on every triage tick
      if (!lead.emailCheck || lead.emailCheck.mx !== true) {
        lead.emailCheck = {
          syntax: true,
          mx: true,
          reason: null,
          at: new Date().toISOString(),
        };
      }
      skipped.push({ id: lead.id, reason: 'mx-ok' });
      continue;
    }
    if (mx?.retryable) {
      skipped.push({ id: lead.id, reason: 'mx-retry:' + (mx.reason || 'dns-error') });
      continue;
    }
    if (from === 'policy_hold') {
      lead.policyHoldReason = lead.policyHoldReason || 'no-mx';
      skipped.push({ id: lead.id, reason: 'already-hold' });
      continue;
    }
    const holdNote = note + ':' + (mx?.reason || 'fail');
    const check = canTransition(from, 'policy_hold', { evidenceText: holdNote, actor });
    if (!check.ok) {
      skipped.push({ id: lead.id, reason: check.error });
      continue;
    }
    const at = new Date().toISOString();
    lead.state = 'policy_hold';
    lead.status = 'policy_hold';
    lead.policyHoldReason = 'no-mx';
    lead.emailCheck = {
      syntax: true,
      mx: false,
      reason: mx?.reason || 'fail',
      at,
    };
    lead.stateUpdatedAt = at;
    lead.stateHistory = lead.stateHistory || [];
    lead.stateHistory.push({
      at,
      from,
      to: 'policy_hold',
      actor,
      evidence: null,
      note: holdNote,
    });
    parked.push({ id: lead.id, from, email, at, reason: mx?.reason || 'fail' });
  }
  return { parked, skipped };
}

/**
 * Merge consented Events Bot leads into funnel SoR (spine stage 1 export).
 * Never invents emails; preserves advanced funnel state on existing ids/emails.
 * Pure-ish: mutates doc; caller saveDoc.
 * @param {object} doc
 * @param {{ partners?: object[], talent?: object[] }} events
 */
export function importEventsLeads(doc, events = {}) {
  const added = [];
  const skipped = [];
  if (!doc || typeof doc !== 'object') return { added, skipped };
  doc.partners = Array.isArray(doc.partners) ? doc.partners : [];
  doc.talent = Array.isArray(doc.talent) ? doc.talent : [];

  const byId = new Map();
  const byEmail = new Map();
  for (const { lead, side } of allLeads(doc)) {
    if (lead?.id) byId.set(String(lead.id), { lead, side });
    const em = String(lead?.email || lead?.contactEmail || '')
      .trim()
      .toLowerCase();
    if (em) byEmail.set(em, { lead, side });
  }

  const ingest = (row, side) => {
    if (!row || typeof row !== 'object') {
      skipped.push({ reason: 'empty' });
      return;
    }
    if (row.consented !== true) {
      skipped.push({ id: row.id, reason: 'consent-required' });
      return;
    }
    const email = String(row.email || row.contactEmail || '')
      .trim()
      .toLowerCase();
    const handle = String(row.handle || '')
      .replace(/^@/, '')
      .trim();
    // Funnel needs a contact path — calendar/event signals without email|handle stay in Events store only
    if (!email && !isUsableOutreachHandle(handle)) {
      skipped.push({ id: row.id, reason: 'no-contact' });
      return;
    }
    if (email && !isUsableOutreachEmail(email)) {
      skipped.push({ id: row.id, reason: 'noise-email' });
      return;
    }
    if (row.id && byId.has(String(row.id))) {
      skipped.push({ id: row.id, reason: 'id-exists' });
      return;
    }
    if (email && byEmail.has(email)) {
      skipped.push({ id: row.id, email, reason: 'email-exists' });
      return;
    }
    const lead = {
      ...row,
      email: email || row.email || null,
      state: row.state || 'sourced',
      status: row.status || row.state || 'sourced',
      source: row.source || 'events-bot',
      consented: true,
    };
    if (side === 'talent') doc.talent.push(lead);
    else doc.partners.push(lead);
    if (lead.id) byId.set(String(lead.id), { lead, side });
    if (email) byEmail.set(email, { lead, side });
    added.push({ id: lead.id, side, email: email || null });
  };

  for (const p of events.partners || []) ingest(p, 'partner');
  for (const t of events.talent || []) ingest(t, 'talent');
  return { added, skipped };
}

/**
 * Disqualify aggregator/SERP junk (web-* fragments + AGG URLs). Keeps rows for audit.
 * Pure-ish: mutates lead rows; caller saveDoc. Idempotent. Skips intentional waas- jobs.
 */
export function disqualifyJunk(doc, { actor = 'agent', note = 'junk-aggregator-or-fragment' } = {}) {
  const disqualified = [];
  const skipped = [];
  for (const { lead } of allLeads(doc)) {
    const from = getState(lead);
    if (from === 'disqualified') {
      skipped.push({ id: lead.id, reason: 'already-dq' });
      continue;
    }
    const legacyWizPlaceholder =
      String(lead.source || '').startsWith('submissions-inbox:') &&
      String(lead.company || '').trim() === '(from WIZ)' &&
      !lead.url &&
      !isUsableOutreachEmail(lead.email || lead.contactEmail) &&
      !isUsableOutreachHandle(lead.handle);
    if (!isJunkAggregatorLead(lead) && !legacyWizPlaceholder) {
      skipped.push({ id: lead.id, reason: 'not-junk' });
      continue;
    }
    const check = canTransition(from, 'disqualified', { evidenceText: note, actor });
    if (!check.ok) {
      skipped.push({ id: lead.id, reason: check.error, from });
      continue;
    }
    const at = new Date().toISOString();
    lead.state = 'disqualified';
    lead.status = 'disqualified';
    lead.stateUpdatedAt = at;
    lead.stateHistory = lead.stateHistory || [];
    lead.stateHistory.push({ at, from, to: 'disqualified', actor, evidence: null, note });
    disqualified.push({ id: lead.id, from, at });
  }
  return { disqualified, skipped };
}

/** drafted/approved with no *usable* email/handle (noise-only = gap). */
export function countNoContact(doc) {
  let n = 0;
  const ids = [];
  for (const { lead } of allLeads(doc)) {
    const st = getState(lead);
    if (st !== 'drafted' && st !== 'approved') continue;
    attachPublicContact(lead);
    const email = String(lead.email || lead.contactEmail || '').trim();
    const handle = String(lead.handle || '').trim();
    if (!isUsableOutreachEmail(email) && !isUsableOutreachHandle(handle)) {
      n++;
      ids.push(lead.id);
    }
  }
  return { noContact: n, ids };
}

/**
 * FOCUS: drafted/approved url-only (no usable email|handle) clog the human approve queue.
 * Park → policy_hold so once-draft only advances contactable sourced leads.
 * URL remains on the row for later enrich; never invents email.
 */
export function parkNoUsableContact(
  doc,
  { actor = 'agent', note = 'no-usable-contact-url-only' } = {},
) {
  const parked = [];
  const skipped = [];
  for (const { lead } of allLeads(doc)) {
    const from = getState(lead);
    if (from !== 'drafted' && from !== 'approved') {
      skipped.push({ id: lead.id, reason: `state=${from}` });
      continue;
    }
    attachPublicContact(lead);
    const email = String(lead.email || lead.contactEmail || '').trim();
    const handle = String(lead.handle || '').trim();
    if (isUsableOutreachEmail(email) || isUsableOutreachHandle(handle)) {
      skipped.push({ id: lead.id, reason: 'has-usable-contact' });
      continue;
    }
    const check = canTransition(from, 'policy_hold', { evidenceText: note, actor });
    if (!check.ok) {
      skipped.push({ id: lead.id, reason: check.error });
      continue;
    }
    const at = new Date().toISOString();
    lead.state = 'policy_hold';
    lead.status = 'policy_hold';
    lead.policyHoldReason = 'no-usable-contact';
    lead.stateUpdatedAt = at;
    lead.stateHistory = lead.stateHistory || [];
    lead.stateHistory.push({ at, from, to: 'policy_hold', actor, evidence: null, note });
    parked.push({ id: lead.id, from, at, url: lead.url || lead.applyUrl || null });
  }
  return { parked, skipped };
}

/**
 * After enrich (or manual fix): policy_hold rows with usable email|handle → drafted.
 * Never invents contact. Leaves no-usable-contact holds parked for URL enrich later.
 */
export function releaseContactableHolds(
  doc,
  { actor = 'agent', note = 'contact-available' } = {},
) {
  const released = [];
  const skipped = [];
  for (const { lead } of allLeads(doc)) {
    const from = getState(lead);
    if (from !== 'policy_hold') {
      skipped.push({ id: lead.id, reason: `state=${from}` });
      continue;
    }
    attachPublicContact(lead);
    const email = String(lead.email || lead.contactEmail || '').trim();
    const handle = String(lead.handle || '').trim();
    if (!isUsableOutreachEmail(email) && !isUsableOutreachHandle(handle)) {
      skipped.push({ id: lead.id, reason: 'still-no-usable-contact' });
      continue;
    }
    const check = canTransition(from, 'drafted', { evidenceText: note, actor });
    if (!check.ok) {
      skipped.push({ id: lead.id, reason: check.error });
      continue;
    }
    const at = new Date().toISOString();
    lead.state = 'drafted';
    lead.status = 'drafted';
    if (
      lead.policyHoldReason === 'no-usable-contact' ||
      lead.policyHoldReason === 'no-contact-email' ||
      lead.policyHoldReason === 'enrich-exhausted'
    ) {
      delete lead.policyHoldReason;
      if (lead.enrichExhaustedAt) delete lead.enrichExhaustedAt;
    }
    lead.stateUpdatedAt = at;
    lead.stateHistory = lead.stateHistory || [];
    lead.stateHistory.push({ at, from, to: 'drafted', actor, evidence: null, note });
    released.push({ id: lead.id, at, email: email || null, handle: handle || null });
  }
  return { released, skipped };
}

export function statusReport(doc, { focusPaused = false, activeEventId } = {}) {
  const counts = {};
  for (const s of STATES) counts[s] = 0;
  const rows = [];
  const idsByUrl = new Map();
  const invalidHistoryIds = [];
  let invalidHistoryTransitions = 0;
  for (const { side, lead } of allLeads(doc)) {
    attachPublicContact(lead);
    const st = getState(lead);
    counts[st] = (counts[st] || 0) + 1;
    const discontinuities = lifecycleHistoryIssues(lead);
    if (discontinuities.length) invalidHistoryIds.push(lead.id);
    invalidHistoryTransitions += discontinuities.length;
    rows.push({
      id: lead.id,
      side,
      state: st,
      company: lead.company || null,
      name: lead.name || lead.handle || null,
      title: lead.title || null,
      score: lead.score ?? null,
      source: lead.source || null,
      eventId: lead.eventId || null,
      email: lead.email || lead.contactEmail || null,
      handle: lead.handle || null,
      stateUpdatedAt: lead.stateUpdatedAt || null,
    });
    const url = partnerUrlKey(lead.url);
    if (side === 'partner' && url && !String(lead.source || '').startsWith('events-bot:')) {
      idsByUrl.set(url, [...(idsByUrl.get(url) || []), lead.id]);
    }
  }
  const duplicateUrlGroups = [...idsByUrl.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([url, ids]) => ({ url, ids }));
  const byState = Object.fromEntries(
    Object.entries(counts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]),
  );
  const visible = (row) => !focusPaused || row.state !== 'policy_hold';
  const stuck = rows
    .filter((r) => visible(r) && !TERMINAL.has(r.state) && r.state !== 'sourced')
    .sort((a, b) => (a.stateUpdatedAt || '9999').localeCompare(b.stateUpdatedAt || '9999'))
    .slice(0, 20);
  const { noContact } = countNoContact(doc);
  // Human Trust Ladder boards (report only — never sends)
  let approveReady = 0;
  let approveReadyEmail = 0;
  let approveReadyHandle = 0;
  let approveEmailIds = [];
  let approveEmailTos = [];
  let sendReady = 0;
  let holdsEnrichable = 0;
  let holdsCooling = 0; // enrichable but within scrape cooldown (not re-scraped this day)
  let holdsScrapeDueRows = []; // enrichable + not cooling — next --enrich targets
  const ap = planApproveDrafted(doc, {
    note: 'status',
    actor: 'human',
    draftsDir: DRAFTS,
  });
  const ready = ap.ready || [];
  approveReady = ready.length;
  const apEmail = ready.filter((r) => r.channel === 'email');
  approveEmailIds = apEmail.map((r) => r.id);
  approveEmailTos = apEmail.map((r) => r.to).filter(Boolean);
  approveReadyEmail = approveEmailIds.length;
  approveReadyHandle = ready.filter((r) => r.channel === 'handle').length;
  let sendReadyEmail = 0;
  let sendReadyHandle = 0;
  let sendEmailIds = [];
  let sendEmailTos = [];
  const sp = planSendReady(doc, { draftsDir: DRAFTS });
  const sready = sp.ready || [];
  sendReady = sready.length;
  const seEmail = sready.filter((r) => r.channel === 'email');
  sendEmailIds = seEmail.map((r) => r.id);
  sendEmailTos = seEmail.map((r) => r.to).filter(Boolean);
  sendReadyEmail = sendEmailIds.length;
  sendReadyHandle = sready.filter((r) => r.channel === 'handle').length;
  let holdsExhausted = 0;
  const holdsReason = {};
  const holdsCoolingIds = [];
  const holdsExhaustedIds = [];
  let holdsCoolingMinRemainingSec = null;
  const nowMs = Date.now();
  for (const { lead } of allLeads(doc)) {
    if (getState(lead) !== 'policy_hold') continue;
    const reason = String(lead.policyHoldReason || 'unspecified').slice(0, 64);
    holdsReason[reason] = (holdsReason[reason] || 0) + 1;
  }
  for (const { lead, side } of allLeads(doc)) {
    if (getState(lead) !== 'policy_hold' || !needsContactEnrich(lead)) continue;
    holdsEnrichable++;
    if (enrichAttemptsExhausted(lead)) {
      holdsExhausted++;
      holdsExhaustedIds.push(lead.id);
      continue;
    }
    if (enrichRecentlyAttempted(lead, { now: nowMs })) {
      holdsCooling++;
      holdsCoolingIds.push(lead.id);
      const at = lead.enrichAttemptedAt || lead.contactProvenance?.at || null;
      const t = at ? Date.parse(at) : NaN;
      if (Number.isFinite(t)) {
        const rem = Math.max(0, Math.ceil((t + ENRICH_COOLDOWN_MS - nowMs) / 1000));
        if (holdsCoolingMinRemainingSec == null || rem < holdsCoolingMinRemainingSec) {
          holdsCoolingMinRemainingSec = rem;
        }
      }
      continue;
    }
    holdsScrapeDueRows.push({
      id: lead.id,
      side,
      company: lead.company || null,
      score: lead.score ?? null,
      url: lead.url || null,
      applyUrl: lead.applyUrl || null,
      companyUrl: lead.companyUrl || null,
      source: lead.source || null,
      enrichAttemptCount: lead.enrichAttemptCount ?? 0,
    });
  }
  holdsScrapeDueRows.sort((a, b) => (b.score || 0) - (a.score || 0));
  const holdsScrapeDueUrls = new Set();
  holdsScrapeDueRows = holdsScrapeDueRows.filter((lead) => {
    const url = enrichScrapeUrlKey(lead);
    if (holdsScrapeDueUrls.has(url)) return false;
    holdsScrapeDueUrls.add(url);
    return true;
  });

  // Human package board honesty (detect stale approve/send md vs live ready counts)
  let packageHonesty = {
    packageApproveReady: null,
    packageSendReady: null,
    approveDrift: false,
    sendDrift: false,
    drift: false,
    ok: true,
  };
  let packageAgeSec = null;
  let packagePaths = {
    approve: path.join(PKG_BUSY, 'funnel', 'approve-batch-latest.md'),
    approveEmailFirst: path.join(PKG_BUSY, 'funnel', 'approve-email-first-latest.md'),
    send: path.join(PKG_BUSY, 'funnel', 'send-batch-latest.md'),
    sendEmailFirst: path.join(PKG_BUSY, 'funnel', 'send-email-first-latest.md'),
    l1Snapshot: path.join(PKG_BUSY, 'funnel', 'l1-snapshot-latest.json'),
    inviteDrain: path.join(BUSY, 'events-bot', 'INVITE-DRAIN.md'),
    inviteDrainJson: path.join(BUSY, 'events-bot', 'invite-drain-latest.json'),
    outboxPurge: path.join(BUSY, 'events-bot', 'outbox-purge-latest.json'),
  };
  try {
    const funnelPkg = path.join(PKG_BUSY, 'funnel');
    const commitPath = path.join(funnelPkg, 'package-commit-latest.json');
    const commitRaw = fs.readFileSync(commitPath, 'utf8');
    const commit = JSON.parse(commitRaw);
    const generation = path.resolve(String(commit?.generation || ''));
    const expectedPackageKeys = [
      'events-bot/INVITE-DRAIN.md',
      'events-bot/invite-drain-latest.json',
      'events-bot/outbox-purge-latest.json',
      'funnel/approve-batch-latest.md',
      'funnel/approve-email-first-latest.md',
      'funnel/l1-snapshot-latest.json',
      'funnel/send-batch-latest.md',
      'funnel/send-email-first-latest.md',
    ];
    const packageKeys = Object.keys(commit?.files || {}).sort();
    const packageFiles = packageKeys.map((file) => path.join(generation, file));
    const committed = commit?.schema === 'demigod.package-commit/2' &&
      generation.startsWith(path.join(PKG_BUSY, 'package-generations') + path.sep) &&
      !fs.existsSync(path.join(funnelPkg, 'package-refresh.lock')) &&
      JSON.stringify(packageKeys) === JSON.stringify(expectedPackageKeys) && packageFiles.every((file) =>
        crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') === commit.files[path.relative(generation, file)],
      );
    if (!committed) throw new Error('package generation is incomplete');
    packagePaths = {
      approve: path.join(generation, 'funnel/approve-batch-latest.md'),
      approveEmailFirst: path.join(generation, 'funnel/approve-email-first-latest.md'),
      send: path.join(generation, 'funnel/send-batch-latest.md'),
      sendEmailFirst: path.join(generation, 'funnel/send-email-first-latest.md'),
      l1Snapshot: path.join(generation, 'funnel/l1-snapshot-latest.json'),
      inviteDrain: path.join(BUSY, 'events-bot/INVITE-DRAIN.md'),
      inviteDrainJson: path.join(BUSY, 'events-bot/invite-drain-latest.json'),
      outboxPurge: path.join(BUSY, 'events-bot/outbox-purge-latest.json'),
    };
    const apPath = packagePaths.approve;
    const spPath = packagePaths.send;
    const apMd = fs.readFileSync(apPath, 'utf8');
    const spMd = fs.readFileSync(spPath, 'utf8');
    if (fs.existsSync(path.join(funnelPkg, 'package-refresh.lock')) || fs.readFileSync(commitPath, 'utf8') !== commitRaw) {
      throw new Error('package generation changed while reading');
    }
    packageHonesty = packageBoardHonesty({
      approveReady,
      sendReady,
      approveMd: apMd,
      sendMd: spMd,
    });
    // Age the full composite package so one refreshed sibling cannot hide stale evidence.
    let oldest = Infinity;
    for (const p of packageFiles) {
      try {
        const mt = fs.statSync(p).mtimeMs;
        if (mt < oldest) oldest = mt;
      } catch {
        /* missing */
      }
    }
    if (Number.isFinite(oldest)) packageAgeSec = Math.max(0, Math.round((Date.now() - oldest) / 1000));
  } catch {
    packageHonesty = { ...packageHonesty, approveDrift: true, sendDrift: true, drift: true, ok: false };
  }

  // L1 machine snapshot age (written by cmdStatus)
  let l1SnapshotAgeSec = null;
  try {
    const l1Path = packagePaths.l1Snapshot;
    if (fs.existsSync(l1Path)) {
      const j = JSON.parse(fs.readFileSync(l1Path, 'utf8'));
      if (j?.at) {
        const t = Date.parse(j.at);
        if (Number.isFinite(t)) l1SnapshotAgeSec = Math.max(0, Math.round((Date.now() - t) / 1000));
      }
      if (l1SnapshotAgeSec == null) {
        l1SnapshotAgeSec = Math.max(0, Math.round((Date.now() - fs.statSync(l1Path).mtimeMs) / 1000));
      }
    }
  } catch {
    /* optional */
  }

  // Events public API config (disk SoR — no network probe; heal ladder is separate)
  let eventsApi = { base: null, ageSec: null, published: null };
  try {
    const apiPath = path.join(ROOT, 'DEMIGOD-EVENTS-API.json');
    if (fs.existsSync(apiPath)) {
      const j = JSON.parse(fs.readFileSync(apiPath, 'utf8'));
      eventsApi.base = j.apiBase || null;
      eventsApi.published = j.published?.ok === true ? 1 : j.published?.ok === false ? 0 : null;
      if (j.at) {
        const t = Date.parse(j.at);
        if (Number.isFinite(t)) eventsApi.ageSec = Math.max(0, Math.round((Date.now() - t) / 1000));
      }
    }
  } catch {
    /* optional */
  }

  // Events active night honesty (disk SoR — hasActive false after seed/clear)
  let eventsActive = {
    hasActive: null,
    stage: null,
    title: null,
    id: null,
    eventCount: null,
    fixtureCount: null,
  };
  try {
    const evPath = path.join(ROOT, 'DEMIGOD-EVENTS.json');
    if (fs.existsSync(evPath)) {
      const j = JSON.parse(fs.readFileSync(evPath, 'utf8'));
      const ae = j.activeEvent || {};
      const isFixtureTitle = (t) =>
        /\bfogline\b|\bselftest\b|\bfixture\b/i.test(String(t || ''));
      // Fogline = fixture brand — never report as live night (even if id present)
      const fixtureTitle = isFixtureTitle(ae.title);
      const hasActive = !!(ae.id) && !fixtureTitle;
      const events = Array.isArray(j.events) ? j.events : [];
      const fixtureCount = events.filter((e) => isFixtureTitle(e?.title)).length;
      eventsActive = {
        hasActive: hasActive ? 1 : 0,
        stage: hasActive ? ae.stage || 'ideate' : 'ideate',
        title: hasActive ? ae.title || null : null,
        id: hasActive ? ae.id || null : null,
        // real nights only — fixtures excluded from public count
        eventCount: events.length - fixtureCount,
        fixtureCount,
      };
    }
  } catch {
    /* optional */
  }
  const currentEventId = activeEventId === undefined ? eventsActive.id : activeEventId;
  for (const row of rows) {
    if (row.source === 'events-bot:event' && row.eventId) {
      row.eventStatus = row.eventId === currentEventId ? 'active' : 'historical';
    }
  }

  // FOCUS #2: invite outbox drain snapshot (JSON preferred, md fallback — never invents URLs)
  let inviteDrain = { total: null, needsUrl: null, recorded: null, ageSec: null };
  let outboxPurge = { deleted: null, capped: null, scanned: null };
  try {
    const invJsonPath = packagePaths.inviteDrainJson;
    if (fs.existsSync(invJsonPath)) {
      const j = JSON.parse(fs.readFileSync(invJsonPath, 'utf8'));
      let ageSec = null;
      try {
        ageSec = Math.max(0, Math.round((Date.now() - fs.statSync(invJsonPath).mtimeMs) / 1000));
      } catch {
        /* */
      }
      if (j.at) {
        const t = Date.parse(j.at);
        if (Number.isFinite(t)) ageSec = Math.max(0, Math.round((Date.now() - t) / 1000));
      }
      inviteDrain = {
        total: Number(j.total),
        needsUrl: Number(j.needsUrl),
        recorded: Number(j.recorded ?? j.hasUrl),
        ageSec,
      };
    } else {
      const invPath = packagePaths.inviteDrain;
      if (fs.existsSync(invPath)) {
        const invMd = fs.readFileSync(invPath, 'utf8');
        const m = invMd.match(
          /Total drafts:\s*(\d+)\s*[·.]\s*need URL:\s*(\d+)\s*[·.]\s*recorded:\s*(\d+)/i,
        );
        if (m) {
          inviteDrain = {
            total: Number(m[1]),
            needsUrl: Number(m[2]),
            recorded: Number(m[3]),
          };
        }
      }
    }
    const purgePath = packagePaths.outboxPurge;
    if (fs.existsSync(purgePath)) {
      const p = JSON.parse(fs.readFileSync(purgePath, 'utf8'));
      outboxPurge = {
        deleted: Number.isFinite(Number(p.deleted)) ? Number(p.deleted) : null,
        capped: p.capped === true ? 1 : p.capped === false ? 0 : null,
        scanned: Number.isFinite(Number(p.scanned)) ? Number(p.scanned) : null,
      };
    }
  } catch {
    /* optional */
  }

  // Cheap filename-only residual fixture hits in events-bot-outbox (no content scan)
  let outboxFixtureNames = null;
  let outboxFileTotal = null;
  try {
    const outboxDir = path.join(ROOT, 'events-bot-outbox');
    if (fs.existsSync(outboxDir)) {
      let total = 0;
      let names = 0;
      for (const name of fs.readdirSync(outboxDir)) {
        if (!/\.(txt|json)$/i.test(name)) continue;
        total++;
        if (/\bfogline\b|\bselftest\b|\bfixture\b/i.test(name)) names++;
      }
      outboxFileTotal = total;
      outboxFixtureNames = names;
    }
  } catch {
    /* optional */
  }

  return {
    ok: true,
    at: new Date().toISOString(),
    focusPaused: !!focusPaused,
    leadsFile: LEADS,
    total: rows.length,
    partners: (doc.partners || []).length,
    talent: (doc.talent || []).length,
    byState,
    // honesty: never call drafts "sent"; receipt-backed ≠ bare state=sent
    metrics: {
      sourced: counts.sourced || 0,
      drafted: counts.drafted || 0,
      approved: counts.approved || 0,
      noContact,
      invalid_history_transitions: invalidHistoryTransitions,
      invalid_history_ids: invalidHistoryIds,
      duplicate_partner_url_groups: duplicateUrlGroups.length,
      duplicate_partner_url_ids: duplicateUrlGroups,
      approve_ready: approveReady,
      approve_ready_email: approveReadyEmail,
      approve_ready_handle: approveReadyHandle,
      // Machine-readable L1 email-first ids + tos (no parse nextHuman / package md)
      approve_ready_email_ids: approveEmailIds,
      approve_ready_email_tos: approveEmailTos,
      send_ready: sendReady,
      send_ready_email: sendReadyEmail,
      send_ready_handle: sendReadyHandle,
      send_ready_human_only: sendReadyHandle,
      send_ready_email_ids: sendEmailIds,
      send_ready_email_tos: sendEmailTos,
      package_approve_ready: packageHonesty.packageApproveReady,
      package_send_ready: packageHonesty.packageSendReady,
      package_drift: packageHonesty.drift ? 1 : 0,
      package_age_sec: packageAgeSec,
      // >10m without refresh — pipeline --stage=packages refreshes all package evidence
      package_stale: packageAgeSec != null && packageAgeSec > 600 ? 1 : 0,
      l1_snapshot_age_sec: l1SnapshotAgeSec,
      events_api_base: eventsApi.base,
      events_api_age_sec: eventsApi.ageSec,
      // CDN config publication is not endpoint reachability; events-online owns health.
      events_api_config_published: eventsApi.published,
      events_active_has_active: eventsActive.hasActive,
      events_active_stage: eventsActive.stage,
      events_active_id: eventsActive.id,
      // title only when hasActive — never advertise empty-shell / fixture noise
      events_active_title: eventsActive.title,
      events_event_count: eventsActive.eventCount,
      events_fixture_count: eventsActive.fixtureCount,
      invite_drain_total: inviteDrain.total,
      invite_drain_needs_url: inviteDrain.needsUrl,
      invite_drain_recorded: inviteDrain.recorded,
      outbox_purge_deleted: outboxPurge.deleted,
      outbox_purge_capped: outboxPurge.capped,
      outbox_purge_scanned: outboxPurge.scanned,
      outbox_file_total: outboxFileTotal,
      outbox_fixture_names: outboxFixtureNames,
      invite_drain_age_sec: inviteDrain.ageSec,
      invite_drain_stale: inviteDrain.needsUrl > 0 && inviteDrain.ageSec != null && inviteDrain.ageSec > 600 ? 1 : 0,
      holds_enrichable: holdsEnrichable,
      holds_cooling: holdsCooling,
      holds_cooling_ids: holdsCoolingIds,
      // Seconds until earliest cooling hold is due for enrich (null if none cooling)
      holds_cooling_min_remaining_sec: holdsCoolingMinRemainingSec,
      holds_exhausted: holdsExhausted,
      holds_exhausted_ids: holdsExhaustedIds,
      holds_scrape_due: holdsScrapeDueRows.length,
      enrichment_paused: !!focusPaused,
      // Machine path for pipeline skip honesty (0 due → skip Firecrawl)
      holds_scrape_due_ids: holdsScrapeDueRows.map((r) => r.id),
      holds_reason: holdsReason,
      sent: counts.sent || 0,
      sent_receipt_backed: countReceiptBackedSent(doc),
      replied: counts.replied || 0,
      form_filled: counts.form_filled || 0,
      in_review: counts.in_review || 0,
      proposed: counts.proposed || 0,
      mutual_yes: counts.mutual_yes || 0,
      intro_made: counts.intro_made || 0,
      pilots_bridged: allLeads(doc).filter(({ lead }) => !!lead.pilotId).length,
      hired: counts.hired || 0,
      invoiced: counts.invoiced || 0,
      paid: counts.paid || 0,
      opted_out: counts.opted_out || 0,
      policy_hold: counts.policy_hold || 0,
    },
    autoSend: false,
    autoDm: false,
    packages: {
      ...packagePaths,
      holdsEnrichDue: path.join(PKG_BUSY, 'funnel', 'holds-enrich-due-latest.md'),
    },
    eventLeads: rows.filter((row) => row.source === 'events-bot:event'),
    holdsScrapeDue: holdsScrapeDueRows,
    stuckOldest: stuck,
    top: rows
      .filter((row) => row.state !== 'policy_hold' && !TERMINAL.has(row.state))
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 12),
    opsNotes: [
      duplicateUrlGroups.length
        ? `Duplicate partner URLs (${duplicateUrlGroups.length}) — review: funnel collision-plan`
        : null,
      !focusPaused &&
      (packageHonesty.drift || (packageAgeSec != null && packageAgeSec > 600) || (inviteDrain.ageSec != null && inviteDrain.ageSec > 600))
        ? `Package evidence stale or drifted — node demigod-lead-pipeline.mjs tick --stage=packages`
        : null,
      !focusPaused && approveReadyEmail
        ? `Prefer email approve first (${approveReadyEmail}): node demigod-funnel.mjs approve-drafted --note="reviewed email" --actor=human --id=${approveEmailIds.join(',')} · board /tmp/dg-busy/funnel/approve-email-first-latest.md · l1 /tmp/dg-busy/funnel/l1-snapshot-latest.json`
        : null,
      !focusPaused && approveReady
        ? `Review approve package (${approveReady} ready · email ${approveReadyEmail} · handle ${approveReadyHandle}) — /tmp/dg-busy/funnel/approve-batch-latest.md`
        : focusPaused ? null : 'No drafted contactable batch ready — enrich holds or collect',
      !focusPaused && sendReadyEmail
        ? `Prefer email send first (${sendReadyEmail}): human transport + receipt · board /tmp/dg-busy/funnel/send-email-first-latest.md`
        : null,
      !focusPaused && sendReady
        ? `Human send package (${sendReady} ready · email ${sendReadyEmail} · handle ${sendReadyHandle}) — /tmp/dg-busy/funnel/send-batch-latest.md`
        : focusPaused ? null : 'No approved send-ready leads',
      !focusPaused && holdsScrapeDueRows.length
        ? `Enrich scrape due (${holdsScrapeDueRows.length} holds not cooling) — node demigod-lead-collect.mjs --enrich --limit=4`
        : focusPaused
          ? null
          : holdsExhausted
          ? `${holdsExhausted} holds enrich-exhausted (max scrapes, no contact) — human URL/handle or --id= force`
          : holdsCooling
            ? `All ${holdsCooling} enrichable holds in 24h cooldown` +
              (holdsCoolingMinRemainingSec != null
                ? ` (earliest free in ~${Math.ceil(holdsCoolingMinRemainingSec / 3600)}h)`
                : '') +
              ` — wait or --id= force`
            : null,
      ['rsvp', 'run', 'followup', 'debrief'].includes(eventsActive.stage) && inviteDrain.needsUrl > 0
        ? `Events invite URL pending (${inviteDrain.needsUrl}) — drain path /tmp/dg-busy/events-bot/HUMAN-INVITE-URLS.md · demigod-events-invite-drain.mjs`
        : null,
      eventsActive.fixtureCount > 0
        ? `Events store has ${eventsActive.fixtureCount} fixture-titled night(s) (Fogline/selftest) — purge from DEMIGOD-EVENTS.json`
        : null,
      outboxPurge.capped === 1
        ? `Outbox fixture purge still capped (deleted ${outboxPurge.deleted} last tick) — node demigod-events-invite-drain.mjs`
        : null,
      outboxFixtureNames > 0
        ? `Outbox still has ${outboxFixtureNames} fixture-named files — node demigod-events-invite-drain.mjs`
        : null,
      !focusPaused && 'Send is human; log receipt then: funnel receipt --message-id=…',
    ].filter(Boolean),
    packageHonesty,
  };
}

function partnerUrlKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.hash = '';
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.href;
  } catch {
    return raw;
  }
}

/** Pure review plan; never mutates or silently discards duplicate evidence. */
export function planPartnerUrlCollisionMerges(doc) {
  const progress = STATES.slice(0, STATES.indexOf('paid') + 1);
  const rank = (lead) => Math.max(0, progress.indexOf(getState(lead)));
  const suppressionRank = (lead) => {
    const state = getState(lead);
    return state === 'opted_out' ? 3 : ['bounced', 'quarantined'].includes(state) ? 2 : TERMINAL.has(state) ? 1 : 0;
  };
  const updatedAt = (lead) => Date.parse(lead.stateUpdatedAt || '') || 0;
  const groups = new Map();
  for (const lead of doc?.partners || []) {
    const url = partnerUrlKey(lead.url);
    if (url && !String(lead.source || '').startsWith('events-bot:')) {
      groups.set(url, [...(groups.get(url) || []), lead]);
    }
  }
  return [...groups.entries()].filter(([, leads]) => leads.length > 1).map(([url, leads]) => {
    const survivor = [...leads].sort((a, b) =>
      suppressionRank(b) - suppressionRank(a) ||
      rank(b) - rank(a) ||
      updatedAt(b) - updatedAt(a) ||
      String(a.id).localeCompare(String(b.id))
    )[0];
    return {
      url,
      keepId: survivor.id,
      keepState: getState(survivor),
      mergeIds: leads.filter((lead) => lead !== survivor).map((lead) => lead.id),
      evidence: leads.map((lead) => ({
        id: lead.id,
        state: getState(lead),
        stateHistory: lead.stateHistory || [],
        history: lead.history || [],
        provenance: lead.provenance || null,
        contactProvenance: lead.contactProvenance || null,
      })),
    };
  });
}

/**
 * Apply a collision plan: keep survivors, drop mergeIds, attach full evidence on survivor.
 * Pure doc mutation (caller persists). Same-URL only; never invents contact.
 */
export function applyPartnerUrlCollisionMerges(doc, plan = null, { at = new Date().toISOString(), actor = 'agent' } = {}) {
  const groups = Array.isArray(plan) ? plan : planPartnerUrlCollisionMerges(doc);
  const partners = Array.isArray(doc?.partners) ? doc.partners : [];
  const byId = new Map(partners.map((p) => [p.id, p]));
  const remove = new Set();
  const applied = [];
  for (const g of groups) {
    const keep = byId.get(g.keepId);
    if (!keep) continue;
    const keepUrl = partnerUrlKey(keep.url);
    const merged = [];
    for (const mid of g.mergeIds || []) {
      const m = byId.get(mid);
      if (!m || remove.has(mid)) continue;
      if (partnerUrlKey(m.url) !== keepUrl) continue;
      merged.push({
        id: m.id,
        state: getState(m),
        source: m.source || null,
        score: m.score ?? null,
        stateHistory: m.stateHistory || [],
        history: m.history || [],
        provenance: m.provenance || null,
        contactProvenance: m.contactProvenance || null,
      });
      remove.add(mid);
    }
    if (!merged.length) continue;
    keep.mergedFrom = [...new Set([...(keep.mergedFrom || []), ...merged.map((x) => x.id)])];
    if (!Array.isArray(keep.history)) keep.history = [];
    keep.history.push({
      at,
      kind: 'url_collision_merge',
      actor,
      url: g.url,
      mergedIds: merged.map((x) => x.id),
      evidence: merged,
    });
    applied.push({ keepId: keep.id, mergeIds: merged.map((x) => x.id), url: g.url });
  }
  if (remove.size) doc.partners = partners.filter((p) => !remove.has(p.id));
  return { applied, removed: [...remove], remainingGroups: planPartnerUrlCollisionMerges(doc).length };
}

/**
 * Pure markdown board: policy_hold leads due for contact scrape (not in cooldown).
 * Agent/human visibility for holds_scrape_due.
 */
export function formatHoldsEnrichDuePackage(
  rows,
  {
    at = new Date().toISOString(),
    cooling = 0,
    coolingIds = [],
    coolingMinRemainingSec = null,
    exhausted = 0,
    exhaustedIds = [],
  } = {},
) {
  const list = Array.isArray(rows) ? rows : [];
  const coolIds = Array.isArray(coolingIds) ? coolingIds : [];
  const exhIds = Array.isArray(exhaustedIds) ? exhaustedIds : [];
  const rem =
    coolingMinRemainingSec != null && Number.isFinite(Number(coolingMinRemainingSec))
      ? Math.max(0, Number(coolingMinRemainingSec))
      : null;
  const lines = [
    '# Holds enrich-due (scrape for usable contact — never invent)',
    '',
    `at: ${at}`,
    `due: ${list.length}`,
    `cooling: ${Number(cooling) || 0}`,
    `cooling_min_remaining_sec: ${rem == null ? '—' : rem}`,
    `exhausted: ${Number(exhausted) || 0}`,
    '',
    '## Due (batch --enrich picks these first; ATS/company before aggregators)',
  ];
  if (!list.length) {
    lines.push('- (none — all enrichable holds cooling or none enrichable)');
  } else {
    for (const r of list) {
      lines.push(
        `- **${r.id}** (${r.side || '?'}) · ${r.company || '—'} · score=${r.score ?? '—'} · src=${r.source || '—'}`,
      );
      if (r.applyUrl) lines.push(`  - applyUrl: ${r.applyUrl}`);
      if (r.companyUrl) lines.push(`  - companyUrl: ${r.companyUrl}`);
      if (r.url) lines.push(`  - url: ${r.url}`);
    }
  }
  if ((Number(cooling) || 0) > 0 || coolIds.length) {
    lines.push('', '## Cooling (24h cooldown — pipeline skips Firecrawl when due=0)');
    lines.push(
      `- ${Number(cooling) || coolIds.length} holds cooling` +
        (rem != null ? ` · earliest free in ~${Math.ceil(rem / 3600)}h (${rem}s)` : '') +
        (coolIds.length ? ` · e.g. ${coolIds.slice(0, 8).join(', ')}` : ''),
    );
  }
  if ((Number(exhausted) || 0) > 0 || exhIds.length) {
    lines.push('', '## Exhausted (max scrapes — human URL/handle or --id= force)');
    lines.push(
      `- ${Number(exhausted) || exhIds.length} holds exhausted` +
        (exhIds.length ? ` · e.g. ${exhIds.slice(0, 8).join(', ')}` : ''),
    );
  }
  lines.push(
    '',
    '## Commands',
    '```',
    'node demigod-lead-collect.mjs --enrich --limit=4',
    'node demigod-funnel.mjs release-contactable-holds',
    '```',
    '',
  );
  return lines.join('\n');
}

/** WIZ URL with lead id so join can attach after form submit (never invents contact). */
export function wizLinkFor(lead, side) {
  const wiz = side === 'partner' || side === 'startup' ? 'startup' : 'engineer';
  const id = encodeURIComponent(String(lead?.id || '').trim());
  const base = `https://www.trydemigod.com/?wiz=${wiz}`;
  if (!id) return base;
  return `${base}&dg_lead=${id}`;
}

/**
 * Pure: true when talent draft body greets with SEO junk or full name instead of first name.
 */
export function talentDraftNeedsGreetingRefresh(body, lead) {
  const who = talentGreetingName(lead);
  if (!who || who === 'there') return false;
  const m = String(body || '').match(/^Hi\s+([^\n—\-]{1,80})/m);
  if (!m) return true;
  const greeter = m[1].trim().replace(/\s+$/, '');
  if (isSeoDisplayJunk(greeter)) return true;
  if (greeter === who) return false;
  // "Kaveri Mekala" when we prefer "Kaveri"
  if (greeter.startsWith(who + ' ')) return true;
  // Completely different SEO string
  if (isSeoDisplayJunk(greeter) || greeter.length > who.length + 8) return true;
  return false;
}

/**
 * Soft-rewrite talent draft files whose greeting is SEO/full-name junk.
 * Returns refreshed lead ids. Never invents contact.
 */
export function refreshTalentDraftGreetings(doc, { draftsDir = DRAFTS } = {}) {
  const refreshed = [];
  if (!draftsDir || !fs.existsSync(draftsDir)) return refreshed;
  for (const { lead, side } of allLeads(doc || {})) {
    if (side !== 'talent' && side !== 'engineer') continue;
    const st = getState(lead);
    if (st !== 'drafted' && st !== 'approved') continue;
    const df = path.join(draftsDir, `${lead.id}.txt`);
    let body = '';
    try {
      if (!fs.existsSync(df) || !fs.statSync(df).size) continue;
      body = fs.readFileSync(df, 'utf8');
    } catch {
      continue;
    }
    if (!talentDraftNeedsGreetingRefresh(body, lead)) continue;
    const fresh = draftEmail(lead, 'talent');
    try {
      atomicWrite(df, fresh);
      refreshed.push(lead.id);
    } catch {
      /* skip unwritable */
    }
  }
  return refreshed;
}

/**
 * Pure: human-facing first name for talent drafts.
 * Avoids SEO titles like "Fractional CTO in San Francisco From $60/hr".
 */
export function talentGreetingName(lead) {
  const raw = String(lead?.name || '').trim();
  const seoJunk =
    !raw ||
    raw.length > 40 ||
    /\$|\/\s*hr|from\s*\$?\d|san francisco from|open roles?|hiring|jobs?\b|looking for/i.test(raw);
  if (!seoJunk) {
    // First token if it looks like a given name
    const first = raw.split(/\s+/)[0];
    if (/^[A-Za-z][A-Za-z'.-]{1,24}$/.test(first)) return first;
  }
  const email = String(lead?.email || lead?.contactEmail || '').trim().toLowerCase();
  const local = email.split('@')[0] || '';
  if (
    local &&
    /^[a-z][a-z0-9._+-]{1,24}$/i.test(local) &&
    !/^(noreply|no-reply|info|hello|contact|admin|support|team|jobs|careers)$/i.test(local)
  ) {
    const token = local.split(/[._+-]/)[0];
    return token.charAt(0).toUpperCase() + token.slice(1);
  }
  const h = String(lead?.handle || '')
    .replace(/^@/, '')
    .trim();
  if (h && /^[A-Za-z][A-Za-z0-9_]{1,20}$/.test(h)) return h;
  return 'there';
}

export function draftEmail(lead, side) {
  attachPublicContact(lead);
  const toLine = `To: ${draftContactTo(lead)}`;
  const company = lead.company || 'your company';
  const fact =
    lead.signal ||
    lead.url ||
    (lead.location ? `you're hiring in ${lead.location}` : 'your public hiring signal');
  const wiz = wizLinkFor(lead, side);
  if (side === 'partner') {
    return [
      toLine,
      `Lead-Id: ${lead.id || ''}`,
      `Subject: eng hiring at ${company}`,
      '',
      `Saw ${fact}${lead.url ? ` (${lead.url})` : ''}.`,
      '',
      'I run Demigod — SF-only matching between startups and engineers. A human reviews every match, both sides approve before any intro, and it costs 10% of first-year cash only if you hire. Nothing before that.',
      '',
      `If useful: ${wiz} — asks what a great 90-day outcome looks like.`,
      '',
      'Reply "no thanks" and you will not hear from me again.',
      '',
      '— Potter, potter@trydemigod.com',
      '',
    ].join('\n');
  }
  const who = talentGreetingName(lead);
  // If signal already narrates the person, don't glue "Hi Name — Name has been…"
  const factStr = String(fact || '').trim();
  const whoRe = new RegExp('^' + who.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
  const opener =
    factStr && whoRe.test(factStr)
      ? `Hi ${who} — saw your public profile note.`
      : `Hi ${who} — ${factStr || 'saw your public SF eng signal'}.`;
  return [
    toLine,
    `Lead-Id: ${lead.id || ''}`,
    `Subject: SF startup matching, free for engineers`,
    '',
    opener,
    '',
    'Demigod matches SF engineers with startups. Free for you, always — startups pay only when a hire happens. You approve before your name is ever shared.',
    '',
    `If open: ${wiz}`,
    '',
    'Reply "no thanks" to be removed.',
    '',
    '— Potter, potter@trydemigod.com',
    '',
  ].join('\n');
}

function cmdNormalize() {
  const doc = loadLeads();
  const { updated } = normalizeDoc(doc);
  if (updated > 0) saveDoc(doc);
  console.log(JSON.stringify({ ok: true, updated, total: allLeads(doc).length, file: LEADS, written: updated > 0 }, null, 2));
}

export function currentStatusReport() {
  const doc = loadLeads();
  normalizeDoc(doc); // in-memory only for report consistency
  const focusPath = path.join(BUSY, 'lead-system', 'FOCUS.md');
  const focus = fs.existsSync(focusPath) ? fs.readFileSync(focusPath, 'utf8') : '';
  return statusReport(doc, { focusPaused: leadCollectionPaused(focus) });
}

function cmdStatus() {
  console.log(JSON.stringify(currentStatusReport(), null, 2));
}

export function cmdL1Snapshot({ emit = true, busyDir = PKG_BUSY } = {}) {
  const doc = loadLeads();
  normalizeDoc(doc);
  const rep = statusReport(doc);
  const out = path.join(busyDir, 'funnel', 'l1-snapshot-latest.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  atomicWrite(out, JSON.stringify(buildL1Snapshot(rep, { pkgDir: path.dirname(out), busyDir: PKG_BUSY }), null, 2) + '\n');
  const result = { ok: true, out, autoSend: false, autoDm: false };
  if (emit) console.log(JSON.stringify(result));
  return result;
}

function policyGate(lead, doc, mode, action) {
  // Human already put lead in `approved` before receipt/send logging.
  const approved = action === 'send' ? getState(lead) === 'approved' : true;
  const r = checkOutreach(lead, doc, { mode, action, approved });
  if (!r.ok) {
    return r;
  }
  return { ok: true, mode };
}

/**
 * Classify a batch-approve block reason for human histogram (pure).
 * Fail-closed: unknown reasons stay 'other' (never silent collapse).
 */
export function classifyApproveBlockReason(reason) {
  const r = String(reason || '');
  if (/--note is required/i.test(r)) return 'missing_note';
  if (/actor=human|Trust Ladder L1/i.test(r)) return 'actor';
  if (/sample_or_test/i.test(r)) return 'sample';
  if (/identity_suppressed/i.test(r)) return 'identity_suppressed';
  if (/junk aggregator/i.test(r)) return 'junk';
  if (/noise contact/i.test(r)) return 'noise_contact';
  if (/ATS apply only|applyUrl/i.test(r)) return 'ats_apply_only';
  if (/no email\/handle|url-only|enrich first/i.test(r)) return 'no_contact';
  if (/draft file missing/i.test(r)) return 'draft_missing';
  if (/draft file unreadable/i.test(r)) return 'draft_unreadable';
  if (/copy-policy/i.test(r)) return 'copy_policy';
  if (/policy gate/i.test(r)) return 'policy';
  if (/unreachable/i.test(r)) return 'unreachable';
  if (/state=/i.test(r)) return 'wrong_state';
  return 'other';
}

/**
 * Pure histogram of blocked reasons for human batch-approve console.
 * Vacuous: empty blocked → empty object (not a fake green summary).
 * @returns {Record<string, number>}
 */
export function summarizeBlockedReasons(blocked = []) {
  const counts = {};
  for (const b of blocked || []) {
    const k = classifyApproveBlockReason(b?.reason);
    counts[k] = (counts[k] || 0) + 1;
  }
  return counts;
}

/** Pure: Subject + first body line from a funnel draft file body (never invents). */
export function draftSubjectPreview(body) {
  const text = String(body || '');
  if (!text.trim()) return { subject: null, preview: null };
  const sm = text.match(/^Subject:\s*(.+)$/im);
  const subject = sm ? sm[1].trim() : null;
  // Body after first blank line; skip To:/Lead-Id:/Subject: header block
  const parts = text.split(/\n\s*\n/);
  let preview = null;
  for (let i = 1; i < parts.length; i++) {
    const line = String(parts[i] || '')
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !/^(To|Lead-Id|Subject):/i.test(l));
    if (line) {
      preview = line.slice(0, 140);
      break;
    }
  }
  return { subject, preview };
}

/**
 * Pure batch-approve plan (Trust Ladder L1) — no mutations.
 * Ready only when drafted + human actor + note + email|handle (not url-only)
 * + not junk aggregator + not sample/selftest + not identity-suppressed twin
 * + optional draft file on disk. Fail-closed (followup/match-bridge parity).
 * Human console: ready rows carry draftPath, subject/preview, sendLane;
 * blocked rows carry reasonClass + applyUrl when present.
 * @returns {{ ready: object[], blocked: object[], noteOk: boolean, actor: string, blockedSummary: object }}
 */
export function planApproveDrafted(
  doc,
  {
    note,
    actor = 'human',
    mode = 'draft-only',
    ids = null,
    requireContact = true,
    draftsDir = null,
  } = {},
) {
  const ready = [];
  const blocked = [];
  const root = doc || {};
  const noteOk = !!String(note || '').trim();
  const idSet =
    ids == null
      ? null
      : new Set(
          (Array.isArray(ids) ? ids : String(ids).split(','))
            .map((s) => String(s || '').trim())
            .filter(Boolean),
        );

  const pushBlocked = (row) => {
    blocked.push({
      ...row,
      reasonClass: classifyApproveBlockReason(row.reason),
    });
  };

  for (const { lead, side } of allLeads(root)) {
    if (idSet && !idSet.has(lead.id)) continue;
    const st = getState(lead);
    if (st !== 'drafted') {
      if (idSet) pushBlocked({ id: lead.id, side, reason: `state=${st} (need drafted)` });
      continue;
    }
    if (!noteOk) {
      pushBlocked({ id: lead.id, side, reason: '--note is required' });
      continue;
    }
    if (actor !== 'human') {
      pushBlocked({
        id: lead.id,
        side,
        reason: 'approved requires actor=human (Trust Ladder L1); agents stop at drafted',
      });
      continue;
    }
    // Sample/selftest never enter money path (followup / match-bridge parity)
    if (lead.sample || lead.selftest || lead.test) {
      pushBlocked({ id: lead.id, side, reason: 'sample_or_test' });
      continue;
    }
    // Twin opted_out / quarantine / bounce blocks approve (do not re-outreach)
    if (isIdentitySuppressedByOther(lead, root)) {
      pushBlocked({ id: lead.id, side, reason: 'identity_suppressed' });
      continue;
    }
    if (isJunkAggregatorLead(lead)) {
      pushBlocked({ id: lead.id, side, reason: 'junk aggregator — disqualify-junk first' });
      continue;
    }
    attachPublicContact(lead);
    const email = String(lead.email || lead.contactEmail || '').trim();
    const handle = String(lead.handle || '').trim();
    const emailOk = isUsableOutreachEmail(email);
    const handleOk = isUsableOutreachHandle(handle);
    const applyUrl = String(lead.applyUrl || '').trim() || null;
    if (requireContact && !emailOk && !handleOk) {
      // ATS apply-only is still not batch-approvable (no sendable To:), but human can open posting
      const why =
        email || handle
          ? `noise contact (${email || handle}) — self/org/noreply not batch-approvable`
          : applyUrl
            ? 'ATS apply only — open posting; not batch-approvable (no email/handle)'
            : 'no email/handle — enrich first (url-only not batch-approvable)';
      pushBlocked({ id: lead.id, side, reason: why, applyUrl });
      continue;
    }
    if (isUnreachable(lead)) {
      pushBlocked({
        id: lead.id,
        side,
        reason: 'unreachable: no email/handle/url — park-no-contact first',
      });
      continue;
    }
    // When draftsDir set (CLI defaults to funnel-drafts/): require file + copy-policy pass
    let subject = null;
    let preview = null;
    if (draftsDir) {
      const df = path.join(draftsDir, `${lead.id}.txt`);
      try {
        if (!fs.existsSync(df) || !fs.statSync(df).size) {
          pushBlocked({ id: lead.id, side, reason: 'draft file missing under funnel-drafts/' });
          continue;
        }
        const body = fs.readFileSync(df, 'utf8');
        const hy = draftHygiene({ name: lead.id, company: lead.company, handle: lead.handle, body });
        if (hy && hy.ok === false) {
          const fl = (hy.flags || []).map((f) => f.rule || f.id || f.kind || 'flag').join(',');
          pushBlocked({
            id: lead.id,
            side,
            reason: `copy-policy hygiene failed${fl ? ': ' + fl : ''}`,
          });
          continue;
        }
        const sp = draftSubjectPreview(body);
        subject = sp.subject;
        preview = sp.preview;
      } catch {
        pushBlocked({ id: lead.id, side, reason: 'draft file unreadable' });
        continue;
      }
    }
    const pol = policyGate(lead, doc, mode, 'draft');
    if (!pol.ok) {
      pushBlocked({ id: lead.id, side, reason: pol.reason || 'policy gate' });
      continue;
    }
    const check = canTransition('drafted', 'approved', { evidenceText: note, actor });
    if (!check.ok) {
      pushBlocked({ id: lead.id, side, reason: check.error });
      continue;
    }
    // Human console fields: draft path + who/what so batch review needs no extra greps
    const draftPath = draftsDir ? path.join(draftsDir, `${lead.id}.txt`) : null;
    const greet =
      side === 'talent' || side === 'engineer' ? talentGreetingName(lead) : null;
    // Prefer real person name over SEO company/title junk for talent rows
    const displayWho =
      greet && greet !== 'there'
        ? greet
        : lead.company && !isSeoDisplayJunk(lead.company)
          ? lead.company
          : lead.name && !isSeoDisplayJunk(lead.name)
            ? lead.name
            : lead.title && !isSeoDisplayJunk(lead.title)
              ? lead.title
              : lead.company || lead.name || lead.title || lead.id;
    ready.push({
      id: lead.id,
      side,
      channel: emailOk ? 'email' : 'handle',
      to: emailOk ? email : handle,
      company: lead.company || null,
      name: lead.name || null,
      title: lead.title || lead.role || null,
      displayWho,
      draftPath,
      subject,
      preview,
      // email = commercial path after approve; handle = X/LI human-send only (never auto)
      sendLane: emailOk ? 'email' : 'x-or-li-human',
    });
  }
  // Human batch: email lane first (commercial path) before X/LI handle-only
  ready.sort((a, b) => {
    if (a.channel === 'email' && b.channel !== 'email') return -1;
    if (b.channel === 'email' && a.channel !== 'email') return 1;
    return 0;
  });
  return {
    ready,
    blocked,
    noteOk,
    actor,
    blockedSummary: summarizeBlockedReasons(blocked),
  };
}

/**
 * Pure: compact Trust Ladder L1 machine snapshot (never claims approve/send done).
 */
export function buildL1Snapshot(rep, { pkgDir = null, busyDir = null } = {}) {
  const m = rep?.metrics || {};
  const pkg = pkgDir || path.join(PKG_BUSY, 'funnel');
  const busy = busyDir || BUSY;
  const emailIds = m.approve_ready_email_ids || [];
  return {
    schema: 'demigod.funnel-l1/1',
    at: rep?.at || new Date().toISOString(),
    autoSend: false,
    autoDm: false,
    trustLadder: 'L1-human-approve-send-only',
    byState: rep?.byState || {},
    total: rep?.total ?? null,
    approve_ready: m.approve_ready ?? 0,
    approve_ready_email: m.approve_ready_email ?? 0,
    approve_ready_email_ids: emailIds,
    approve_ready_email_tos: m.approve_ready_email_tos || [],
    send_ready: m.send_ready ?? 0,
    send_ready_email: m.send_ready_email ?? 0,
    send_ready_email_ids: m.send_ready_email_ids || [],
    send_ready_email_tos: m.send_ready_email_tos || [],
    holds_enrichable: m.holds_enrichable ?? 0,
    holds_cooling: m.holds_cooling ?? 0,
    holds_cooling_min_remaining_sec: m.holds_cooling_min_remaining_sec ?? null,
    holds_scrape_due: m.holds_scrape_due ?? 0,
    holds_reason: m.holds_reason || {},
    invite_drain_needs_url: m.invite_drain_needs_url ?? null,
    invite_drain_total: m.invite_drain_total ?? null,
    invite_drain_recorded: m.invite_drain_recorded ?? null,
    events_api_base: m.events_api_base ?? null,
    events_api_age_sec: m.events_api_age_sec ?? null,
    events_api_config_published: m.events_api_config_published ?? m.events_api_published ?? null,
    outbox_purge_deleted: m.outbox_purge_deleted ?? null,
    outbox_purge_capped: m.outbox_purge_capped ?? null,
    outbox_purge_scanned: m.outbox_purge_scanned ?? null,
    outbox_file_total: m.outbox_file_total ?? null,
    outbox_fixture_names: m.outbox_fixture_names ?? null,
    events_active_has_active: m.events_active_has_active ?? null,
    events_active_stage: m.events_active_stage ?? null,
    events_active_id: m.events_active_id ?? null,
    events_active_title: m.events_active_title ?? null,
    events_event_count: m.events_event_count ?? null,
    events_fixture_count: m.events_fixture_count ?? null,
    l1_snapshot_age_sec: m.l1_snapshot_age_sec ?? null,
    sent: m.sent ?? 0,
    paid: m.paid ?? 0,
    boards: {
      approveEmailFirst: path.join(pkg, 'approve-email-first-latest.md'),
      sendEmailFirst: path.join(pkg, 'send-email-first-latest.md'),
      holdsEnrichDue: path.join(pkg, 'holds-enrich-due-latest.md'),
      inviteDrainJson: path.join(busy, 'events-bot', 'invite-drain-latest.json'),
      l1Snapshot: path.join(pkg, 'l1-snapshot-latest.json'),
    },
    human: {
      approve:
        emailIds.length > 0
          ? `node demigod-funnel.mjs approve-drafted --note="reviewed email" --actor=human --id=${emailIds.join(',')}`
          : null,
      receipt: 'node demigod-funnel.mjs receipt --id=<leadId> --message-id=<real-message-id>',
      eventsHeal: 'node demigod-events-online.mjs status  # exit 2 → heal',
    },
  };
}

/**
 * Pure: one-screen L1 email-first approve board (commercial path only).
 * Human-only Trust Ladder — never auto-approves or sends.
 */
export function formatEmailFirstApprovePackage(plan, { at = new Date().toISOString() } = {}) {
  const ready = (plan?.ready || []).filter((r) => r.channel === 'email');
  const lines = [
    '# Email-first approve (Trust Ladder L1 — human only)',
    '',
    `at: ${at}`,
    `email_ready: ${ready.length}`,
    '',
    'Commercial path: approve these **email** drafts first (handle/X/LI is secondary).',
    'Agents never approve or send. Requires `--actor=human` + non-empty `--note`.',
    '',
  ];
  if (!ready.length) {
    lines.push('## Ready', '- (none — no drafted leads with usable email)', '');
  } else {
    lines.push('## Ready (email)');
    for (const r of ready) {
      lines.push(
        `- **${r.id}** (${r.side || '?'}) · ${r.displayWho || r.name || r.company || '—'} → \`${r.to}\``,
      );
      if (r.subject) lines.push(`  - subject: ${r.subject}`);
      if (r.preview) lines.push(`  - preview: ${r.preview}`);
      if (r.draftPath) lines.push(`  - draft: \`${r.draftPath}\``);
    }
    lines.push(
      '',
      '## Human command',
      '```',
      `node demigod-funnel.mjs approve-drafted --note="reviewed email" --actor=human --id=${ready.map((r) => r.id).join(',')}`,
      '```',
      '',
    );
  }
  return lines.join('\n');
}

/**
 * Pure: one-screen L1 email-first **send** board (after human approve).
 * Never auto-sends — human transport + receipt only.
 */
export function formatEmailFirstSendPackage(plan, { at = new Date().toISOString() } = {}) {
  const ready = (plan?.ready || []).filter((r) => r.channel === 'email');
  const lines = [
    '# Email-first send (Trust Ladder L1 — human only)',
    '',
    `at: ${at}`,
    `email_send_ready: ${ready.length}`,
    '',
    'Commercial path: human sends these **email** approved drafts (no agent send).',
    'After real send: log receipt with message-id (never invent receipts).',
    '',
  ];
  if (!ready.length) {
    lines.push(
      '## Ready',
      '- (none — no approved leads with usable email; approve email-first drafts first)',
      '',
      '## Upstream',
      '- board: `/tmp/dg-busy/funnel/approve-email-first-latest.md`',
      '',
    );
  } else {
    lines.push('## Ready (email — human send)');
    for (const r of ready) {
      lines.push(
        `- **${r.id}** (${r.side || '?'}) · ${r.displayWho || r.name || r.company || '—'} → \`${r.to}\``,
      );
      if (r.subject) lines.push(`  - subject: ${r.subject}`);
      if (r.draftPath) lines.push(`  - draft: \`${r.draftPath}\``);
    }
    lines.push(
      '',
      '## After human send',
      '```',
      'node demigod-funnel.mjs receipt --id=<leadId> --message-id=<real-message-id>',
      '```',
      '',
    );
  }
  return lines.join('\n');
}

/** Pure: SEO / pricing blurb is not a human-facing company or name on packages. */
export function isSeoDisplayJunk(s) {
  const t = String(s || '').trim();
  if (!t) return true;
  if (t.length > 48) return true;
  return /\$|\/\s*hr|from\s*\$?\d|san francisco from|open roles?|hiring|jobs?\b|looking for|fractional cto in/i.test(
    t,
  );
}

/**
 * Pure: parse `ready: N` from approve/send batch markdown packages.
 * @returns {number|null}
 */
export function parsePackageReadyCount(md) {
  const m = String(md || '').match(/^ready:\s*(\d+)\s*$/im);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Pure: live approve/send ready vs on-disk human package board (Trust Ladder honesty).
 * Drift means package file is stale vs live SoR — refresh with --package dry-run.
 */
export function packageBoardHonesty({
  approveReady = 0,
  sendReady = 0,
  approveMd = '',
  sendMd = '',
} = {}) {
  const packageApproveReady = parsePackageReadyCount(approveMd);
  const packageSendReady = parsePackageReadyCount(sendMd);
  const approveDrift =
    packageApproveReady == null || Number(packageApproveReady) !== Number(approveReady);
  const sendDrift =
    packageSendReady == null || Number(packageSendReady) !== Number(sendReady);
  return {
    approveReady: Number(approveReady) || 0,
    sendReady: Number(sendReady) || 0,
    packageApproveReady,
    packageSendReady,
    approveDrift,
    sendDrift,
    drift: approveDrift || sendDrift,
    ok: !approveDrift && !sendDrift,
  };
}

/**
 * Pure markdown package for human batch-approve console (Trust Ladder L1).
 * Never sends. Empty ready → explicit "none ready" (vacuous-green guard).
 * Includes blocked-reason histogram + draft subject/preview when present.
 */
export function formatApproveBatchPackage(
  plan,
  { note = '', at = new Date().toISOString(), draftsDir = null } = {},
) {
  const ready = plan?.ready || [];
  const blocked = plan?.blocked || [];
  const summary =
    plan?.blockedSummary && typeof plan.blockedSummary === 'object'
      ? plan.blockedSummary
      : summarizeBlockedReasons(blocked);
  const lines = [
    '# Funnel batch-approve package (human only — Trust Ladder L1)',
    '',
    `at: ${at}`,
    `note: ${String(note || '').trim() || '(none)'}`,
    `ready: ${ready.length}`,
    `blocked: ${blocked.length}`,
    draftsDir ? `draftsDir: ${draftsDir}` : null,
    '',
    '## Ready (human may approve → then human sends)',
    '',
  ].filter((x) => x != null);
  if (!ready.length) {
    lines.push('_none ready — do not approve an empty batch_');
    lines.push('');
  } else {
    const emails = ready.filter((r) => r.channel === 'email');
    const handles = ready.filter((r) => r.channel !== 'email');
    if (emails.length) {
      lines.push('### Email (commercial path — prefer first)');
      lines.push('');
      for (const r of emails) {
        const who = r.displayWho || r.company || r.name || r.title || r.id;
        lines.push(
          `- **${r.id}** (${r.side}) · ${who} · email → \`${r.to}\` · lane=${r.sendLane || 'email'}`,
        );
        if (r.subject) lines.push(`  - subject: ${r.subject}`);
        if (r.preview) lines.push(`  - preview: ${r.preview}`);
        if (r.draftPath) lines.push(`  - draft: \`${r.draftPath}\``);
      }
      lines.push('');
    }
    if (handles.length) {
      lines.push('### Handle (X/LI human-send only — never auto)');
      lines.push('');
      for (const r of handles) {
        const who = r.displayWho || r.company || r.name || r.title || r.id;
        lines.push(
          `- **${r.id}** (${r.side}) · ${who} · handle → \`${r.to}\` · lane=${r.sendLane || 'x-or-li-human'}`,
        );
        if (r.subject) lines.push(`  - subject: ${r.subject}`);
        if (r.preview) lines.push(`  - preview: ${r.preview}`);
        if (r.draftPath) lines.push(`  - draft: \`${r.draftPath}\``);
      }
      lines.push('');
    }
  }
  lines.push('## Blocked summary');
  lines.push('');
  const summaryKeys = Object.keys(summary);
  if (!summaryKeys.length) {
    lines.push('_none blocked_');
  } else {
    for (const k of summaryKeys.sort()) {
      lines.push(`- ${k}: ${summary[k]}`);
    }
  }
  lines.push('');
  lines.push('## Blocked (not approvable this pass)');
  lines.push('');
  if (!blocked.length) {
    lines.push('_none blocked_');
  } else {
    for (const b of blocked.slice(0, 40)) {
      const cls = b.reasonClass || classifyApproveBlockReason(b.reason);
      const apply = b.applyUrl ? ` · apply: \`${b.applyUrl}\`` : '';
      lines.push(`- ${b.id} [${cls}]: ${b.reason || '?'}${apply}`);
    }
    if (blocked.length > 40) lines.push(`- … +${blocked.length - 40} more`);
  }
  lines.push('');
  lines.push('## Commands');
  lines.push('');
  lines.push('```');
  lines.push('# review only');
  lines.push('node demigod-funnel.mjs approve-drafted --dry-run --package');
  lines.push('# apply after human review (never auto)');
  if (ready.length) {
    const emailIds = ready.filter((r) => r.channel === 'email').map((r) => r.id);
    const handleIds = ready.filter((r) => r.channel !== 'email').map((r) => r.id);
    if (emailIds.length) {
      lines.push(`# email first (commercial)`);
      lines.push(
        `node demigod-funnel.mjs approve-drafted --note="reviewed email batch" --actor=human --id=${emailIds.join(',')}`,
      );
    }
    if (handleIds.length) {
      lines.push(`# handle X/LI (optional)`);
      lines.push(
        `node demigod-funnel.mjs approve-drafted --note="reviewed handle batch" --actor=human --id=${handleIds.join(',')}`,
      );
    }
  } else {
    lines.push('node demigod-funnel.mjs approve-drafted --note="reviewed batch" --actor=human');
  }
  lines.push('# after human send:');
  lines.push('node demigod-funnel.mjs receipt --id=LEAD --channel=email --to=ADDR --message-id=MID');
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

/**
 * Pure plan: approved leads ready for human send (Trust Ladder — never auto-sends).
 * Requires usable email|handle; includes draft path + receipt command template.
 */
export function planSendReady(doc, { draftsDir = null, ids = null } = {}) {
  const ready = [];
  const blocked = [];
  const idSet =
    ids == null
      ? null
      : new Set(
          (Array.isArray(ids) ? ids : String(ids).split(','))
            .map((s) => String(s || '').trim())
            .filter(Boolean),
        );
  for (const { lead, side } of allLeads(doc || {})) {
    if (idSet && !idSet.has(lead.id)) continue;
    const st = getState(lead);
    if (st !== 'approved') {
      if (idSet) blocked.push({ id: lead.id, side, reason: `state=${st} (need approved)` });
      continue;
    }
    if (lead.sample || lead.selftest || lead.test) {
      blocked.push({ id: lead.id, side, reason: 'sample_or_test' });
      continue;
    }
    if (isIdentitySuppressedByOther(lead, doc)) {
      blocked.push({ id: lead.id, side, reason: 'identity_suppressed' });
      continue;
    }
    attachPublicContact(lead);
    const email = String(lead.email || lead.contactEmail || '').trim();
    const handle = String(lead.handle || '').trim();
    const emailOk = isUsableOutreachEmail(email);
    const handleOk = isUsableOutreachHandle(handle);
    if (!emailOk && !handleOk) {
      blocked.push({
        id: lead.id,
        side,
        reason: 'no usable email|handle — cannot send',
      });
      continue;
    }
    let subject = null;
    let preview = null;
    let draftPath = null;
    if (draftsDir) {
      draftPath = path.join(draftsDir, `${lead.id}.txt`);
      try {
        if (fs.existsSync(draftPath) && fs.statSync(draftPath).size) {
          const body = fs.readFileSync(draftPath, 'utf8');
          const sp = draftSubjectPreview(body);
          subject = sp.subject;
          preview = sp.preview;
        } else {
          blocked.push({ id: lead.id, side, reason: 'draft file missing or empty' });
          continue;
        }
      } catch {
        blocked.push({ id: lead.id, side, reason: 'draft file unreadable' });
        continue;
      }
    }
    const greet =
      side === 'talent' || side === 'engineer' ? talentGreetingName(lead) : null;
    const displayWho =
      greet && greet !== 'there'
        ? greet
        : lead.company && !isSeoDisplayJunk(lead.company)
          ? lead.company
          : lead.name && !isSeoDisplayJunk(lead.name)
            ? lead.name
            : lead.title && !isSeoDisplayJunk(lead.title)
              ? lead.title
              : lead.company || lead.name || lead.title || lead.id;
    ready.push({
      id: lead.id,
      side,
      channel: emailOk ? 'email' : 'handle',
      to: emailOk ? email : handle,
      company: lead.company || null,
      name: lead.name || null,
      title: lead.title || lead.role || null,
      displayWho,
      draftPath,
      subject,
      preview,
      sendLane: emailOk ? 'email' : 'x-or-li-human',
      receiptCmd: emailOk
        ? `node demigod-funnel.mjs receipt --id=${lead.id} --channel=email --to=${email} --message-id=MID`
        : `node demigod-funnel.mjs receipt --id=${lead.id} --channel=x --to=${handle} --message-id=MID`,
    });
  }
  // Email commercial path first (parity with planApproveDrafted)
  ready.sort((a, b) => {
    if (a.channel === 'email' && b.channel !== 'email') return -1;
    if (b.channel === 'email' && a.channel !== 'email') return 1;
    return 0;
  });
  return {
    ready,
    blocked,
    blockedSummary: summarizeBlockedReasons(blocked),
  };
}

/** Markdown board for human-only send after approve (never auto-sends). */
export function formatSendBatchPackage(
  plan,
  { note = '', at = new Date().toISOString(), draftsDir = null } = {},
) {
  const ready = plan?.ready || [];
  const blocked = plan?.blocked || [];
  const summary =
    plan?.blockedSummary && typeof plan.blockedSummary === 'object'
      ? plan.blockedSummary
      : summarizeBlockedReasons(blocked);
  const lines = [
    '# Funnel human-send package (Trust Ladder — NEVER auto-send)',
    '',
    `at: ${at}`,
    `note: ${String(note || '').trim() || '(none)'}`,
    `ready: ${ready.length}`,
    `blocked: ${blocked.length}`,
    draftsDir ? `draftsDir: ${draftsDir}` : null,
    '',
    '## Ready (human sends → then receipt)',
    '',
  ].filter((x) => x != null);
  if (!ready.length) {
    lines.push('_none ready — approve drafted first or wait for contactable approved_');
    lines.push('');
  } else {
    const emails = ready.filter((r) => r.channel === 'email');
    const handles = ready.filter((r) => r.channel !== 'email');
    const emit = (r) => {
      const who = r.displayWho || r.company || r.name || r.title || r.id;
      lines.push(
        `- **${r.id}** (${r.side}) · ${who} · ${r.channel} → \`${r.to}\` · lane=${r.sendLane || '?'}`,
      );
      if (r.subject) lines.push(`  - subject: ${r.subject}`);
      if (r.preview) lines.push(`  - preview: ${r.preview}`);
      if (r.draftPath) lines.push(`  - draft: \`${r.draftPath}\``);
      if (r.receiptCmd) lines.push(`  - after send: \`${r.receiptCmd}\``);
    };
    if (emails.length) {
      lines.push('### Email (commercial path — prefer first)');
      lines.push('');
      for (const r of emails) emit(r);
      lines.push('');
    }
    if (handles.length) {
      lines.push('### Handle (X/LI human-send only — never auto)');
      lines.push('');
      for (const r of handles) emit(r);
      lines.push('');
    }
  }
  lines.push('## Blocked summary');
  lines.push('');
  const summaryKeys = Object.keys(summary);
  if (!summaryKeys.length) lines.push('_none blocked_');
  else for (const k of summaryKeys.sort()) lines.push(`- ${k}: ${summary[k]}`);
  lines.push('');
  lines.push('## Rules');
  lines.push('');
  lines.push('- Human sends only (email or X/LI). Agents never auto-send.');
  lines.push('- Prefer email commercial path before handle X/LI.');
  lines.push('- Log receipt with real Message-ID before state becomes `sent`.');
  lines.push('- No invent emails / fake receipts.');
  lines.push('');
  return lines.join('\n');
}

/** Approve every eligible drafted lead with one required review note. */
export function approveDrafted(
  doc,
  { note, actor = 'human', mode = 'draft-only', ids = null, requireContact = true, draftsDir = null } = {},
) {
  if (!String(note || '').trim()) {
    return { approved: [], errors: [{ error: '--note is required' }], plan: { ready: [], blocked: [], noteOk: false, actor } };
  }
  const plan = planApproveDrafted(doc, { note, actor, mode, ids, requireContact, draftsDir });
  const approved = [];
  const errors = plan.blocked.map((b) => ({ id: b.id, error: b.reason }));
  for (const r of plan.ready) {
    const row = findLead(doc, r.id);
    if (!row) {
      errors.push({ id: r.id, error: 'lead vanished' });
      continue;
    }
    const at = new Date().toISOString();
    row.lead.state = 'approved';
    row.lead.status = 'approved';
    row.lead.stateUpdatedAt = at;
    row.lead.stateHistory = row.lead.stateHistory || [];
    row.lead.stateHistory.push({ at, from: 'drafted', to: 'approved', actor, evidence: null, note });
    approved.push({ id: r.id, at, channel: r.channel, to: r.to });
  }
  return { approved, errors, plan };
}

export function cmdApproveDrafted(args, { emit = true, busyDir = PKG_BUSY } = {}) {
  const note = arg(args, '--note');
  const actor = arg(args, '--actor') || 'human';
  const mode = arg(args, '--mode') || 'draft-only';
  const dryRun = args.includes('--dry-run') || args.includes('--plan');
  const wantPackage = dryRun || args.includes('--package');
  const idArg = arg(args, '--id');
  const ids = idArg
    ? idArg
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null;
  if (!dryRun && !String(note || '').trim()) {
    console.error(
      'usage: approve-drafted --note=text [--actor=human] [--id=a,b] [--dry-run] [--package]\n' +
        '  Human-only Trust Ladder L1. Requires email|handle (url-only blocked). Never sends.\n' +
        '  --dry-run / --package writes human review md under /tmp/dg-busy/funnel/.',
    );
    process.exit(2);
  }
  const doc = loadLeads();
  normalizeDoc(doc);
  // Soft-refresh talent draft greetings before package preview (SEO/full-name → first name)
  const greetingRefreshed = wantPackage
    ? refreshTalentDraftGreetings(doc, { draftsDir: DRAFTS })
    : [];
  const opts = {
    note: note || 'dry-run preview',
    actor: dryRun ? 'human' : actor,
    mode,
    ids,
    requireContact: true,
    draftsDir: DRAFTS,
  };
  if (dryRun) {
    const plan = planApproveDrafted(doc, opts);
    let packagePath = null;
    if (wantPackage) {
      const pkgDir = path.join(busyDir, 'funnel');
      fs.mkdirSync(pkgDir, { recursive: true });
      packagePath = path.join(pkgDir, 'approve-batch-latest.md');
      atomicWrite(
        packagePath,
        formatApproveBatchPackage(plan, {
          note: opts.note,
          draftsDir: DRAFTS,
        }),
      );
      atomicWrite(
        path.join(pkgDir, 'approve-email-first-latest.md'),
        formatEmailFirstApprovePackage(plan),
      );
    }
    const result = {
          ok: true,
          dryRun: true,
          readyCount: plan.ready.length,
          blockedCount: plan.blocked.length,
          blockedSummary: plan.blockedSummary || summarizeBlockedReasons(plan.blocked),
          ready: plan.ready,
          blocked: plan.blocked,
          packagePath,
          greetingRefreshed,
          note: 'report only — pass --note=… without --dry-run to apply (actor=human)',
        };
    if (emit) console.log(JSON.stringify(result, null, 2));
    return result;
  }
  const result = approveDrafted(doc, { ...opts, actor });
  if (result.approved.length) saveDoc(doc);
  for (const row of result.approved) {
    appendLog({ at: row.at, id: row.id, from: 'drafted', to: 'approved', actor, evidence: null });
  }
  let packagePath = null;
  if (args.includes('--package') && result.plan) {
    const pkgDir = path.join(busyDir, 'funnel');
    fs.mkdirSync(pkgDir, { recursive: true });
    packagePath = path.join(pkgDir, 'approve-batch-latest.md');
    atomicWrite(
      packagePath,
      formatApproveBatchPackage(result.plan, { note, draftsDir: DRAFTS }),
    );
  }
  console.log(
    JSON.stringify(
      {
        ok: result.errors.length === 0,
        approved: result.approved,
        errors: result.errors,
        readyCount: result.plan?.ready?.length ?? result.approved.length,
        blockedCount: result.plan?.blocked?.length ?? result.errors.length,
        blockedSummary:
          result.plan?.blockedSummary || summarizeBlockedReasons(result.plan?.blocked || []),
        packagePath,
      },
      null,
      2,
    ),
  );
  if (result.errors.length) process.exitCode = 1;
}

export function cmdSendPackage(args, { emit = true, busyDir = PKG_BUSY } = {}) {
  const note = arg(args, '--note') || 'pipeline-send-board';
  const idArg = arg(args, '--id');
  const ids = idArg
    ? idArg
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null;
  const doc = loadLeads();
  normalizeDoc(doc);
  const greetingRefreshed = refreshTalentDraftGreetings(doc, { draftsDir: DRAFTS });
  const plan = planSendReady(doc, { draftsDir: DRAFTS, ids });
  const pkgDir = path.join(busyDir, 'funnel');
  fs.mkdirSync(pkgDir, { recursive: true });
  const packagePath = path.join(pkgDir, 'send-batch-latest.md');
  atomicWrite(
    packagePath,
    formatSendBatchPackage(plan, { note, draftsDir: DRAFTS }),
  );
  atomicWrite(
    path.join(pkgDir, 'send-email-first-latest.md'),
    formatEmailFirstSendPackage(plan),
  );
  const result = {
        ok: true,
        readyCount: plan.ready.length,
        blockedCount: plan.blocked.length,
        blockedSummary: plan.blockedSummary,
        ready: plan.ready,
        blocked: plan.blocked,
        packagePath,
        greetingRefreshed,
        autoSend: false,
        note: 'human send board only — never auto-sends',
      };
  if (emit) console.log(JSON.stringify(result, null, 2));
  return result;
}

function cmdTransition(args) {
  const id = arg(args, '--id');
  const to = arg(args, '--to');
  const evidence = arg(args, '--evidence');
  const note = arg(args, '--note');
  const actor = arg(args, '--actor') || 'agent';
  const mode = arg(args, '--mode') || 'draft-only';
  const requestedPairId = arg(args, '--pair');
  if (!id || !to) {
    console.error('usage: transition --id=LEAD --to=STATE [--evidence=path] [--note=text] [--pair=PAIR]');
    process.exit(2);
  }
  if (to === 'invoiced') {
    console.error(JSON.stringify({ ok: false, error: 'use invoice so the placement pair and fee are recorded together' }));
    process.exit(1);
  }
  const doc = loadLeads();
  normalizeDoc(doc);
  const row = findLead(doc, id);
  if (!row) {
    console.error(JSON.stringify({ ok: false, error: `lead not found: ${id}` }));
    process.exit(1);
  }
  const pairBound = to === 'hired' || to === 'paid';
  const pairId = pairBound ? placementPairId(row.lead, requestedPairId) : '';
  if (pairBound && !pairId) {
    console.error(JSON.stringify({
      ok: false,
      id,
      to,
      error: requestedPairId ? 'pair_not_bound_to_lead' : `${to}_requires_unambiguous_pair`,
    }));
    process.exit(1);
  }
  let paidFeeCents;
  if (to === 'paid') {
    const invoice = [...(row.lead.stateHistory || [])].reverse().find((entry) =>
      entry?.to === 'invoiced' && entry?.pairId === pairId && entry?.evidence);
    const invoiceAt = Date.parse(invoice?.at || '');
    if (!Number.isFinite(invoiceAt) || invoiceAt > Date.now()) {
      console.error(JSON.stringify({ ok: false, id, to, pairId, error: 'paid_requires_pair_bound_invoice_chronology' }));
      process.exit(1);
    }
    paidFeeCents = Number(invoice?.netFeeCents ?? invoice?.feeCents);
    if (!Number.isSafeInteger(paidFeeCents) || paidFeeCents <= 0) {
      console.error(JSON.stringify({ ok: false, id, to, pairId, error: 'paid_requires_pair_bound_invoice_fee' }));
      process.exit(1);
    }
  }
  if (to === 'approved' || to === 'sent' || to === 'drafted') {
    if (isUnreachable(row.lead)) {
      console.error(
        JSON.stringify({
          ok: false,
          id,
          to,
          error: 'unreachable: no email/handle/url — use park-no-contact or enrich first',
        }),
      );
      process.exit(1);
    }
    // URL-only is reachable but not draftable/approvable/sendable (FOCUS usable-contact)
    if (!hasUsableOutreachContact(row.lead)) {
      console.error(
        JSON.stringify({
          ok: false,
          id,
          to,
          error: 'no usable email|handle — url-only not draftable (park-no-usable-contact or enrich)',
        }),
      );
      process.exit(1);
    }
    const pol = policyGate(row.lead, doc, mode, to === 'sent' ? 'send' : 'draft');
    if (!pol.ok) {
      console.error(JSON.stringify({ ok: false, id, to, error: pol.reason, policy: pol }, null, 2));
      process.exit(1);
    }
  }
  const from = getState(row.lead);
  const check = canTransition(from, to, {
    evidencePath: evidence,
    evidenceText: note,
    actor,
  });
  if (!check.ok) {
    console.error(JSON.stringify({ ok: false, id, from, to, error: check.error }, null, 2));
    process.exit(1);
  }
  row.lead.state = to;
  row.lead.status = to;
  if (pairId) row.lead.pairId = pairId;
  row.lead.stateUpdatedAt = new Date().toISOString();
  row.lead.stateHistory = row.lead.stateHistory || [];
  row.lead.stateHistory.push({
    at: row.lead.stateUpdatedAt,
    from,
    to,
    actor,
    evidence: evidence || null,
    note: note || null,
    ...(pairId ? { pairId } : {}),
    ...(paidFeeCents ? { feeCents: paidFeeCents } : {}),
  });
  saveDoc(doc);
  appendLog({
    at: row.lead.stateUpdatedAt,
    id,
    from,
    to,
    actor,
    evidence: evidence || null,
    pairId: pairId || undefined,
    feeCents: paidFeeCents,
  });
  console.log(JSON.stringify({ ok: true, id, from, to, actor, pairId: pairId || undefined, feeCents: paidFeeCents }, null, 2));
}

function cmdParkNoContact(args) {
  const actor = arg(args, '--actor') || 'agent';
  const note = arg(args, '--note') || 'no-contact-email';
  const doc = loadLeads();
  normalizeDoc(doc);
  const result = parkUnreachable(doc, { actor, note });
  if (result.parked.length) {
    saveDoc(doc);
    for (const row of result.parked) {
      appendLog({ at: row.at, id: row.id, from: row.from, to: 'policy_hold', actor, evidence: null });
    }
  }
  console.log(
    JSON.stringify(
      { ok: true, parked: result.parked.length, ids: result.parked.map((p) => p.id), detail: result.parked },
      null,
      2,
    ),
  );
}

function cmdParkNoUsableContact(args) {
  const actor = arg(args, '--actor') || 'agent';
  const note = arg(args, '--note') || 'no-usable-contact-url-only';
  const doc = loadLeads();
  normalizeDoc(doc);
  const result = parkNoUsableContact(doc, { actor, note });
  if (result.parked.length) {
    saveDoc(doc);
    for (const row of result.parked) {
      appendLog({ at: row.at, id: row.id, from: row.from, to: 'policy_hold', actor, evidence: null });
    }
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        parked: result.parked.length,
        ids: result.parked.map((p) => p.id),
        detail: result.parked,
      },
      null,
      2,
    ),
  );
}

function cmdReleaseContactableHolds(args) {
  const actor = arg(args, '--actor') || 'agent';
  const note = arg(args, '--note') || 'contact-available';
  const doc = loadLeads();
  normalizeDoc(doc);
  const result = releaseContactableHolds(doc, { actor, note });
  if (result.released.length) {
    saveDoc(doc);
    for (const row of result.released) {
      appendLog({
        at: row.at,
        id: row.id,
        from: 'policy_hold',
        to: 'drafted',
        actor,
        evidence: null,
      });
    }
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        released: result.released.length,
        ids: result.released.map((r) => r.id),
        detail: result.released,
      },
      null,
      2,
    ),
  );
}

function cmdDisqualifyJunk(args) {
  const actor = arg(args, '--actor') || 'agent';
  const note = arg(args, '--note') || 'junk-aggregator-or-fragment';
  const doc = loadLeads();
  normalizeDoc(doc);
  const result = disqualifyJunk(doc, { actor, note });
  if (result.disqualified.length) {
    saveDoc(doc);
    for (const row of result.disqualified) {
      appendLog({ at: row.at, id: row.id, from: row.from, to: 'disqualified', actor, evidence: null });
    }
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        disqualified: result.disqualified.length,
        ids: result.disqualified.map((p) => p.id),
        detail: result.disqualified,
      },
      null,
      2,
    ),
  );
}

async function cmdEmailMx(args) {
  const actor = arg(args, '--actor') || 'agent';
  const note = arg(args, '--note') || 'no-mx';
  const doc = loadLeads();
  normalizeDoc(doc);
  const before = JSON.stringify(doc);
  const result = await parkNoMx(doc, { actor, note });
  const dirty = result.parked.length > 0 || JSON.stringify(doc) !== before;
  if (dirty) {
    saveDoc(doc);
    for (const row of result.parked) {
      appendLog({
        at: row.at,
        id: row.id,
        from: row.from,
        to: 'policy_hold',
        actor,
        evidence: null,
      });
    }
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        parked: result.parked.length,
        ids: result.parked.map((p) => p.id),
        detail: result.parked,
        checked: result.skipped.filter((s) => s.reason === 'mx-ok').length,
        written: dirty,
      },
      null,
      2,
    ),
  );
}

async function cmdImportEvents(args) {
  const dry = args.includes('--dry-run');
  const doc = loadLeads();
  normalizeDoc(doc);
  const { eventsBotLeads } = await import('./demigod-lead-collect.mjs');
  const events = eventsBotLeads();
  const result = importEventsLeads(doc, events);
  if (result.added.length && !dry) {
    normalizeDoc(doc);
    saveDoc(doc);
    for (const row of result.added) {
      appendLog({
        at: new Date().toISOString(),
        id: row.id,
        from: null,
        to: 'sourced',
        actor: 'agent',
        evidence: null,
        note: 'import-events:' + (row.side || 'partner'),
      });
    }
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: dry,
        added: result.added.length,
        skipped: result.skipped.length,
        ids: result.added.map((a) => a.id),
        eventsPartners: (events.partners || []).length,
        eventsTalent: (events.talent || []).length,
        written: !!(result.added.length && !dry),
      },
      null,
      2,
    ),
  );
}

function cmdDraft(args) {
  const id = arg(args, '--id');
  const mode = arg(args, '--mode') || 'draft-only';
  if (!id) {
    console.error('usage: draft --id=LEAD');
    process.exit(2);
  }
  const doc = loadLeads();
  normalizeDoc(doc);
  const row = findLead(doc, id);
  if (!row) {
    console.error(JSON.stringify({ ok: false, error: `lead not found: ${id}` }));
    process.exit(1);
  }
  if (isUnreachable(row.lead)) {
    console.error(
      JSON.stringify({
        ok: false,
        id,
        error: 'unreachable: no email/handle/url — park-no-contact or enrich first',
      }),
    );
    process.exit(1);
  }
  // FOCUS: draft only with usable email|handle (url-only parks via park-no-usable-contact)
  if (!hasUsableOutreachContact(row.lead)) {
    console.error(
      JSON.stringify({
        ok: false,
        id,
        error: 'no usable email|handle — url-only not draftable (enrich or park-no-usable-contact)',
      }),
    );
    process.exit(1);
  }
  const pol = policyGate(row.lead, doc, mode, 'draft');
  if (!pol.ok) {
    console.error(JSON.stringify({ ok: false, id, error: pol.reason, policy: pol }, null, 2));
    process.exit(1);
  }
  const body = draftEmail(row.lead, row.side);
  fs.mkdirSync(DRAFTS, { recursive: true });
  const out = path.join(DRAFTS, `${id}.txt`);
  atomicWrite(out, body);
  const from = getState(row.lead);
  const hygiene = draftHygiene({
    name: row.lead.name || row.lead.company || id,
    company: row.lead.company,
    handle: row.lead.handle,
    body,
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        id,
        side: row.side,
        draft: out,
        state: from,
        policy: pol.mode,
        hygiene: { ok: hygiene.ok, flags: hygiene.flags },
        hint: `After review: node demigod-funnel.mjs transition --id=${id} --to=drafted --evidence=${out}`,
      },
      null,
      2,
    ),
  );
  console.log('\n--- draft ---\n' + body);
}

/**
 * Sweep funnel draft artifacts for copy-policy flags (advisory; never rewrites).
 * Empty/missing drafts dir is NOT ok (vacuous-green guard).
 * @returns {{ ok: boolean, checked: number, flagged: number, flags: object[], error?: string, items?: object[] }}
 */
export function scanFunnelDraftHygiene({ draftsDir = DRAFTS } = {}) {
  if (!fs.existsSync(draftsDir)) {
    return {
      ok: false,
      checked: 0,
      flagged: 0,
      flags: [],
      items: [],
      error: 'drafts dir missing',
    };
  }
  const files = fs
    .readdirSync(draftsDir)
    .filter((f) => f.endsWith('.txt'))
    .filter((f) => {
      try {
        return fs.statSync(path.join(draftsDir, f)).isFile();
      } catch {
        return false;
      }
    })
    .sort();
  if (files.length === 0) {
    return {
      ok: false,
      checked: 0,
      flagged: 0,
      flags: [],
      items: [],
      error: 'empty drafts dir',
    };
  }
  const items = [];
  const flags = [];
  let flagged = 0;
  for (const f of files) {
    const id = f.replace(/\.txt$/i, '');
    const body = fs.readFileSync(path.join(draftsDir, f), 'utf8');
    const h = draftHygiene({ name: id, body });
    const item = { id, file: f, ok: h.ok, flags: h.flags };
    items.push(item);
    if (!h.ok || h.flags.length) {
      flagged++;
      for (const fl of h.flags) flags.push({ id, ...fl });
    }
  }
  // ok = no error-severity flags (warns still surface in flagged count)
  const ok = items.every((it) => it.ok);
  return { ok, checked: files.length, flagged, flags, items };
}

function cmdHygiene() {
  const report = scanFunnelDraftHygiene();
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        checked: report.checked,
        flagged: report.flagged,
        flags: report.flags,
        ...(report.error ? { error: report.error } : {}),
      },
      null,
      2,
    ),
  );
  if (!report.ok && report.checked === 0) process.exit(1);
}

/**
 * Human-send receipt edges only. Fail-closed map — never invent sends.
 * approved → sent (outreach) · sent → nudged (followup #1) · mutual_yes → intro_made.
 * Second nudge (already nudged) is record-only via planReceipt (state stays nudged).
 */
export const RECEIPT_TARGETS = Object.freeze({
  approved: 'sent',
  sent: 'nudged',
  mutual_yes: 'intro_made',
});

/**
 * Pure fail-closed receipt plan (no IO).
 * @param {string} from
 * @param {{ toState?: string|null, messageId?: string|null, note?: string, nudgeCount?: number }} [opts]
 * @returns {{ ok: boolean, from?: string, to?: string, reason: string, evidenceText?: string, recordOnly?: boolean }}
 */
export function planReceipt(
  from,
  { toState = null, messageId = null, note = '', nudgeCount: nCount = 0 } = {},
) {
  const f = String(from || '').toLowerCase();
  if (!f) return { ok: false, reason: 'state_required' };

  const hasMid = !!(messageId && String(messageId).trim());
  const hasNote = !!(note && String(note).trim());
  if (!hasMid && !hasNote) {
    return { ok: false, reason: 'message-id or note required' };
  }
  // SENT-CONFIRMED plus transport evidence is required; note is supplementary context.
  const evidenceText = [
    'SENT-CONFIRMED',
    hasMid ? `Message-ID: ${String(messageId).trim()}` : null,
    hasNote ? `note: ${String(note).trim()}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  // Second nudge: already nudged — stay in state, append history only (max MAX_NUDGES)
  if (f === 'nudged') {
    const to = toState ? String(toState).toLowerCase() : 'nudged';
    if (to !== 'nudged') {
      return { ok: false, reason: `from nudged receipt only → nudged (nudge record), not ${to}` };
    }
    const n = Number(nCount) || 0;
    if (n >= MAX_NUDGES) {
      return { ok: false, reason: `max ${MAX_NUDGES} nudges reached — mark cold instead` };
    }
    if (!receiptLooksValid(evidenceText)) {
      return { ok: false, reason: 'nudge receipt invalid — Message-ID or transport proof required' };
    }
    return {
      ok: true,
      from: f,
      to: 'nudged',
      reason: 'nudge_record',
      evidenceText,
      recordOnly: true,
    };
  }

  const defaultTo = RECEIPT_TARGETS[f];
  if (!defaultTo) {
    return {
      ok: false,
      reason: `receipt not allowed from ${f} (allowed: ${Object.keys(RECEIPT_TARGETS).join(', ')}, nudged)`,
    };
  }
  const to = toState ? String(toState).toLowerCase() : defaultTo;
  if (to !== defaultTo) {
    return { ok: false, reason: `from ${f} receipt only → ${defaultTo}, not ${to}` };
  }
  const check = canTransition(f, to, { evidenceText, actor: 'human' });
  if (!check.ok) return { ok: false, reason: check.error || 'canTransition_denied' };
  return { ok: true, from: f, to, reason: 'allowed', evidenceText };
}

/** Commit CRM/log before publishing receipt evidence; restore every target on write failure. */
export function commitReceiptTransaction({ receiptPath, receiptBody, trackedPaths, commit }) {
  const stage = `${receiptPath}.stage.${process.pid}.${Date.now()}`;
  const paths = [...new Set([...trackedPaths, receiptPath])];
  const before = new Map(paths.map((file) => {
    try {
      const stat = fs.statSync(file);
      return [file, { body: fs.readFileSync(file), mode: stat.mode & 0o777 }];
    } catch {
      return [file, null];
    }
  }));
  try {
    atomicWrite(stage, receiptBody);
    commit();
    fs.renameSync(stage, receiptPath);
  } catch (error) {
    const rollbackErrors = [];
    for (const [file, snapshot] of before) {
      try {
        if (snapshot) atomicWrite(file, snapshot.body, { mode: snapshot.mode });
        else fs.unlinkSync(file);
      } catch (rollbackError) {
        if (snapshot || rollbackError?.code !== 'ENOENT') rollbackErrors.push({ file, error: String(rollbackError) });
      }
    }
    try { fs.unlinkSync(stage); } catch (rollbackError) {
      if (rollbackError?.code !== 'ENOENT') rollbackErrors.push({ file: stage, error: String(rollbackError) });
    }
    if (rollbackErrors.length) error.rollbackErrors = rollbackErrors;
    throw error;
  }
}

/**
 * Log a real send receipt then transition:
 *   approved → sent  |  sent → nudged  |  mutual_yes → intro_made
 * Already-nudged + receipt → record-only (history + nudgeCount; state stays nudged).
 * Human must have already sent; this only records evidence. Never sends.
 */
function cmdReceipt(args) {
  if (!receiptArgsValid(args)) {
    console.error('unknown, duplicate, or missing receipt argument');
    process.exit(2);
  }
  const id = arg(args, '--id');
  const channel = arg(args, '--channel') || 'email';
  const toAddr = arg(args, '--to');
  const messageId = arg(args, '--message-id') || arg(args, '--messageId');
  const note = arg(args, '--note') || '';
  const actor = arg(args, '--actor') || 'human';
  const toStateArg = arg(args, '--to-state') || arg(args, '--toState');
  if (!id) {
    console.error(
      'usage: receipt --id=LEAD [--to-state=sent|nudged|intro_made] --channel=email --to=addr --message-id=MID\n' +
        '  approved→sent · sent→nudged · nudged→nudge-record · mutual_yes→intro_made (never sends)',
    );
    process.exit(2);
  }
  const doc = loadLeads();
  normalizeDoc(doc);
  const row = findLead(doc, id);
  if (!row) {
    console.error(JSON.stringify({ ok: false, error: `lead not found: ${id}` }));
    process.exit(1);
  }
  const from = getState(row.lead);
  const plan = planReceipt(from, {
    toState: toStateArg,
    messageId,
    note,
    nudgeCount: nudgeCount(row.lead),
  });
  if (!plan.ok) {
    console.error(
      JSON.stringify({
        ok: false,
        id,
        from,
        error: plan.reason,
        allowedFrom: [...Object.keys(RECEIPT_TARGETS), 'nudged'],
      }),
    );
    process.exit(1);
  }
  if ((plan.to === 'sent' || plan.to === 'nudged' || plan.recordOnly) && !receiptDestinationMatches(row.lead, channel, toAddr)) {
    console.error(JSON.stringify({ ok: false, id, from, to: plan.to, error: 'receipt destination missing or does not match lead' }));
    process.exit(1);
  }
  if (!plan.recordOnly && (plan.to === 'sent' || plan.to === 'drafted' || plan.to === 'approved')) {
    if (isUnreachable(row.lead) || !hasUsableOutreachContact(row.lead)) {
      console.error(JSON.stringify({ ok: false, id, from, to: plan.to, error: 'no usable email|handle' }));
      process.exit(1);
    }
    const pol = policyGate(row.lead, doc, 'approve-each', plan.to === 'sent' ? 'send' : 'draft');
    if (!pol.ok) {
      console.error(JSON.stringify({ ok: false, id, from, to: plan.to, error: pol.reason, policy: pol }, null, 2));
      process.exit(1);
    }
  }
  if (!plan.recordOnly) {
    const check = canTransition(from, plan.to, { evidenceText: plan.evidenceText, actor });
    if (!check.ok) {
      console.error(JSON.stringify({ ok: false, id, from, to: plan.to, error: check.error }, null, 2));
      process.exit(1);
    }
  }
  const at = new Date().toISOString();
  const lines = [
    'SENT-CONFIRMED',
    `channel: ${channel}`,
    `kind: ${plan.recordOnly ? 'nudge_record' : plan.to}`,
    toAddr ? `to: ${toAddr}` : null,
    messageId ? `Message-ID: ${messageId}` : null,
    `at: ${at}`,
    `actor: ${actor}`,
    note ? `note: ${note}` : null,
    '',
  ].filter((x) => x != null);
  fs.mkdirSync(RECEIPTS, { recursive: true });
  // Separate files so intro/nudge receipts never clobber outreach receipt
  let out;
  if (plan.to === 'sent') {
    out = path.join(RECEIPTS, `${id}.txt`);
  } else if (plan.to === 'nudged' || plan.recordOnly) {
    const n = plan.recordOnly ? nudgeCount(row.lead) + 1 : 1;
    out = path.join(RECEIPTS, `${id}-nudged-${n}.txt`);
  } else {
    out = path.join(RECEIPTS, `${id}-${plan.to}.txt`);
  }
  commitReceiptTransaction({
    receiptPath: out,
    receiptBody: lines.join('\n'),
    trackedPaths: [LEADS, LOG],
    commit() {
      const lead = row.lead;
      lead.stateUpdatedAt = at;
      lead.stateHistory = lead.stateHistory || [];
      if (plan.recordOnly) lead.nudgeCount = nudgeCount(lead) + 1;
      else {
        lead.state = plan.to;
        lead.status = plan.to;
        if (plan.to === 'nudged') lead.nudgeCount = Math.max(1, nudgeCount(lead));
      }
      lead.stateHistory.push({
        at,
        from,
        to: plan.to,
        ...(plan.recordOnly ? { kind: 'nudge' } : {}),
        actor,
        evidence: out,
        note: note || (plan.recordOnly ? 'nudge_record' : null),
      });
      saveDoc(doc);
      appendLog({
        at,
        id,
        from,
        to: plan.to,
        ...(plan.recordOnly ? { kind: 'nudge_record' } : {}),
        actor,
        evidence: out,
      });
    },
  });

  if (plan.recordOnly) {
    const lead = row.lead;
    console.log(
      JSON.stringify(
        {
          ok: true,
          id,
          from,
          to: 'nudged',
          recordOnly: true,
          nudgeCount: lead.nudgeCount,
          receipt: out,
          channel,
          toAddr: toAddr || null,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        id,
        from,
        to: plan.to,
        receipt: out,
        channel,
        toAddr: toAddr || null,
      },
      null,
      2,
    ),
  );
}

/** Receipt writes real-send evidence, so ambiguous or stray CLI input fails closed. */
export function receiptArgsValid(args) {
  const names = new Map([
    ['--id', '--id'],
    ['--channel', '--channel'],
    ['--to', '--to'],
    ['--message-id', '--message-id'],
    ['--messageId', '--message-id'],
    ['--note', '--note'],
    ['--actor', '--actor'],
    ['--to-state', '--to-state'],
    ['--toState', '--to-state'],
  ]);
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const [raw, inline] = args[i].split(/=(.*)/s, 2);
    const name = names.get(raw);
    if (!name || seen.has(name)) return false;
    seen.add(name);
    if (inline === undefined && (!args[++i] || args[i].startsWith('-'))) return false;
    if (inline !== undefined && !inline) return false;
  }
  return true;
}

/** Bind outreach receipts to the selected CRM identity; intro recipients are handled separately. */
export function receiptDestinationMatches(lead, channel, destination) {
  const value = normalizeLoose(destination).toLowerCase();
  if (channel === 'email') return Boolean(value && value === normalizeLoose(lead?.email || lead?.contactEmail).toLowerCase());
  if (channel === 'x') return Boolean(value && value.replace(/^@/, '') === normalizeLoose(lead?.handle || lead?.twitter || lead?.x).replace(/^@/, '').toLowerCase());
  return false;
}

function isSyntheticSubmission(sub) {
  const blob = JSON.stringify(sub || {}).toLowerCase();
  if (sub?.sample || sub?.selftest || sub?.test) return true;
  // SMS mocks use @pending.example; never count as real WIZ form_filled
  if (
    /e2e_playtest|selftest|fixture|bulk_triage|@test\.|playwright|synthetic|@pending\.example|@example\.(com|org)/.test(
      blob,
    )
  ) {
    return true;
  }
  if (/\bacme labs\b|\balex rivera\b|\bfounder@example\b/.test(blob)) return true;
  if (sub?.status === 'spam' || sub?.status === 'rejected') return true;
  if (Array.isArray(sub?.rejectReasons) && sub.rejectReasons.some((r) => /e2e|test|playtest/i.test(r))) {
    return true;
  }
  return false;
}

function submissionIdentity(sub) {
  const data = sub?.data || sub?.payload || sub?.raw || sub || {};
  const form = sub?.formName || sub?.form || '';
  const email =
    extractEmail(data, form) ||
    normalizeLoose(
      data.email ||
        data['partner-email'] ||
        data['contact-email'] ||
        data['seeker-email'] ||
        data['engineer-email'] ||
        data.startup_email ||
        data.contactEmail,
    );
  const handle = normalizeLoose(
    data.handle || data.twitter || data.x || data.twitter_handle || data.linkedin,
  ).replace(/^@/, '');
  return { email: (email || '').toLowerCase(), handle: (handle || '').toLowerCase(), id: sub?.id };
}

function normalizeLoose(s) {
  return String(s || '').trim();
}

function leadIdentity(lead) {
  return {
    email: normalizeLoose(lead.email || lead.contactEmail).toLowerCase(),
    handle: normalizeLoose(lead.handle || lead.twitter || lead.x)
      .replace(/^@/, '')
      .toLowerCase(),
  };
}

/** Past form_filled — join must not regress. */
const PAST_FORM_FILLED = new Set([
  'form_filled',
  'in_review',
  'proposed',
  'mutual_yes',
  'intro_made',
  'interviewing',
  'hired',
  'invoiced',
  'paid',
]);

/**
 * How a lead identity links to a submission (pure).
 * Prefer email/handle; dg_lead from WIZ personalization; inbox-sub id.
 * @returns {'email'|'handle'|'dg_lead'|'joinedSubmissionId'|'inbox_id'|null}
 */
export function joinMatchVia(lead, sub, si = null, li = null) {
  if (!lead || !sub) return null;
  const subId = sub.id || si?.id || null;
  const identity = si || submissionIdentity(sub);
  const leadIdn = li || leadIdentity(lead);
  if (identity.email && leadIdn.email && identity.email === leadIdn.email) return 'email';
  if (identity.handle && leadIdn.handle && identity.handle === leadIdn.handle) return 'handle';
  // Draft personalization: WIZ opened with ?dg_lead=<id> (or form field)
  const raw = sub.raw || sub.data || sub.payload || {};
  const dgLead = String(
    raw.dg_lead || raw.dgLead || raw['dg-lead'] || raw.lead_id || raw.leadId || '',
  ).trim();
  if (dgLead && lead.id && dgLead === String(lead.id)) return 'dg_lead';
  if (lead.joinedSubmissionId && subId && String(lead.joinedSubmissionId) === String(subId)) {
    return 'joinedSubmissionId';
  }
  // lead-collect: id = 'inbox-' + submission.id  (e.g. inbox-sub-720607a8)
  if (subId && lead.id === `inbox-${subId}`) return 'inbox_id';
  return null;
}

/**
 * Hard suppress for form_filled only (inbound WIZ re-engage).
 * colder/disqualified twins must NOT block a real form fill; opted_out/bounce/quarantine do.
 * (Outreach re-draft uses broader SUPPRESS_STATES via isIdentitySuppressedByOther.)
 */
const FORM_FILL_HARD_SUPPRESS = new Set(['opted_out', 'quarantined', 'bounced']);

function isFormFillIdentitySuppressed(lead, doc) {
  if (!lead || typeof lead !== 'object') return false;
  const myKeys = identityKeys(lead);
  if (!myKeys.size) return false;
  for (const { lead: o } of allLeads(doc || {})) {
    if (!o || o.id === lead.id) continue;
    const st = String(o.state || o.status || '').toLowerCase();
    if (!FORM_FILL_HARD_SUPPRESS.has(st)) continue;
    for (const k of identityKeys(o)) {
      if (myKeys.has(k)) return true;
    }
  }
  return false;
}

/**
 * Pure form_filled join plan — no IO. Matches real (caller-filtered) submissions to leads.
 * Eligible when ALLOWED[state] includes form_filled (inbound early states + replied/sent/…).
 * Contactless / noise-only joins stay in the plan as ineligible — never silent vanish,
 * never promote SMS mocks or self-joins to form_filled. attachEmail only for usable emails.
 * Fail-closed (replies/match parity): sample leads, hard-suppress twins (opt-out/bounce/
 * quarantine), and one submission matching multiple eligible leads never convert.
 * Cold twin sharing email is allowed (person re-engaged via WIZ).
 */
export function planFormFilledJoins(doc, submissions = []) {
  const pairs = [];
  const root = doc || {};
  const leads = allLeads(root);
  for (const sub of submissions || []) {
    if (isSyntheticSubmission(sub)) continue;
    const si = submissionIdentity(sub);
    const subId = sub.id || si.id;
    if (!subId && !si.email && !si.handle) continue;
    const hasAnyContactField = !!(si.email || si.handle);
    // Money path: usable contact on submission, OR (structural via + usable contact on lead
    // after gmail rehydrate attach). Never promote contactless id-only self-joins.
    const usableFromSub =
      isUsableOutreachEmail(si.email) || isUsableOutreachHandle(si.handle);
    for (const { lead, side } of leads) {
      const st = getState(lead);
      if (PAST_FORM_FILLED.has(st) || TERMINAL.has(st)) continue;
      const li = leadIdentity(lead);
      const via = joinMatchVia(lead, sub, si, li);
      if (!via) continue;
      // email/handle vias need an identity field on the sub (match already requires equality)
      if ((via === 'email' || via === 'handle') && !hasAnyContactField) continue;
      const allowed = ALLOWED[st] || [];
      let eligible = allowed.includes('form_filled');
      let reason = eligible ? null : `state=${st} cannot → form_filled`;
      const structuralVia =
        via === 'inbox_id' || via === 'joinedSubmissionId' || via === 'dg_lead';
      const usableFromLead =
        structuralVia &&
        (isUsableOutreachEmail(li.email) || isUsableOutreachHandle(li.handle));
      const usableContact = usableFromSub || usableFromLead;
      // Any via without usable contact cannot verify a person filled the form
      // (id-only, dg_lead, and email-matched noise like @pending.example)
      if (!usableContact) {
        eligible = false;
        const noiseOnSub = hasAnyContactField && !usableFromSub;
        const noiseOnLead =
          structuralVia && !!(li.email || li.handle) && !usableFromLead;
        reason =
          noiseOnSub || noiseOnLead
            ? 'noise contact (pending/noreply/self) — cannot verify real form fill'
            : 'submission has no contact — cannot verify a person filled the form';
      }
      // Sample/selftest never enter money path (match-bridge parity)
      if (eligible && (lead.sample || lead.selftest || lead.test)) {
        eligible = false;
        reason = 'sample';
      }
      // Hard suppress only: opted_out / quarantined / bounced twin (not cold)
      if (eligible && isFormFillIdentitySuppressed(lead, root)) {
        eligible = false;
        reason = 'identity_suppressed';
      }
      const attachEmail = !!(isUsableOutreachEmail(si.email) && !li.email);
      const attachHandle = !!(isUsableOutreachHandle(si.handle) && !li.handle);
      pairs.push({
        leadId: lead.id,
        side,
        leadState: st,
        submissionId: subId,
        via,
        emailFromSub: si.email || null,
        handleFromSub: si.handle || null,
        attachEmail,
        attachHandle,
        eligible,
        reason,
      });
    }
  }
  // Ambiguous: one submission → multiple still-eligible leads → deny all (replies parity)
  const bySub = new Map();
  for (const p of pairs) {
    if (!p.eligible || !p.submissionId) continue;
    const g = bySub.get(p.submissionId) || [];
    g.push(p);
    bySub.set(p.submissionId, g);
  }
  for (const group of bySub.values()) {
    if (group.length < 2) continue;
    for (const p of group) {
      p.eligible = false;
      p.reason = 'ambiguous_identity';
    }
  }
  return { pairs, eligible: pairs.filter((p) => p.eligible) };
}

/** Load Gmail form dump for join rehydrate (FOCUS: webhook missing contact). Never invents. */
function loadGmailDumpForJoin(args = []) {
  if (args.includes('--no-gmail')) return null;
  const fileArg = (args.find((a) => a.startsWith('--gmail=')) || '').slice('--gmail='.length);
  const p = fileArg || process.env.DEMIGOD_GMAIL_DUMP || '/tmp/demigod-gmail-inbound.json';
  if (!fs.existsSync(p)) return null;
  try {
    return { path: p, payload: JSON.parse(fs.readFileSync(p, 'utf8')) };
  } catch {
    return null;
  }
}

/** Report (default) or apply form_filled joins. Optional Gmail dump → contact patches for join plan. */
function cmdJoin(args) {
  const apply = args.includes('--apply');
  const doc = loadLeads();
  normalizeDoc(doc);
  let inbox;
  try {
    inbox = loadInbox();
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: `inbox: ${e.message || e}` }));
    process.exit(1);
  }
  const rawSubs = inbox?.submissions || inbox?.items || (Array.isArray(inbox) ? inbox : []);
  const skippedSynthetic = rawSubs.filter((s) => isSyntheticSubmission(s)).length;
  let subs = rawSubs.filter((s) => !isSyntheticSubmission(s));

  // Gmail form rehydrate → in-memory (and on --apply, persisted) contact on incomplete WIZ rows
  const gmailDump = loadGmailDumpForJoin(args);
  let gmail = { loaded: false, path: null, real: 0, patches: 0, inboxPatched: 0, skipped: [] };
  if (gmailDump) {
    const candidates = planGmailFormCandidates(gmailDump.payload);
    const patchPlan = planInboxContactPatches(candidates.real, subs);
    gmail = {
      loaded: true,
      path: gmailDump.path,
      real: candidates.real.length,
      patches: patchPlan.patches.length,
      inboxPatched: 0,
      skipped: (patchPlan.skipped || []).slice(0, 8),
    };
    if (apply && patchPlan.patches.length) {
      try {
        let refreshed = [];
        gmail.inboxPatched = updateInbox((live) => {
          const items = live.items || live.submissions || [];
          const patched = applyInboxContactPatches(items, patchPlan.patches);
          if (patched) {
            if (live.items) live.items = items;
            else if (live.submissions) live.submissions = items;
          }
          refreshed = live.items || live.submissions || items;
          return patched;
        });
        if (gmail.inboxPatched) {
          // refresh subs after durable patch
          subs = refreshed.filter((s) => !isSyntheticSubmission(s));
        }
      } catch (e) {
        gmail.patchError = String(e.message || e).slice(0, 200);
      }
    } else if (patchPlan.patches.length) {
      // Report-only: plan join against contact-patched clones (never invents)
      subs = submissionsWithGmailPatches(subs, patchPlan.patches);
    }
  }

  const plan = planFormFilledJoins(doc, subs);
  const matched = plan.pairs;
  let applied = 0;
  const errors = [];
  if (apply) {
    for (const m of matched) {
      if (!m.eligible) {
        errors.push({ ...m, error: m.reason || `need form_filled-eligible state (have ${m.leadState})` });
        continue;
      }
      const evidenceDir = path.join(BUSY, 'funnel', 'joins');
      fs.mkdirSync(evidenceDir, { recursive: true });
      const ev = path.join(evidenceDir, `${m.leadId}__${m.submissionId}.txt`);
      atomicWrite(
        ev,
        `form_filled join\nlead: ${m.leadId}\nsubmission: ${m.submissionId}\nvia: ${m.via}\nat: ${new Date().toISOString()}\n`,
      );
      const from = m.leadState;
      const check = canTransition(from, 'form_filled', { evidencePath: ev });
      if (!check.ok) {
        errors.push({ ...m, error: check.error });
        continue;
      }
      const row = findLead(doc, m.leadId);
      if (!row) {
        errors.push({ ...m, error: 'lead vanished' });
        continue;
      }
      row.lead.state = 'form_filled';
      row.lead.status = 'form_filled';
      row.lead.joinedSubmissionId = m.submissionId;
      // Onboarding: attach only usable WIZ contact when lead was missing it
      if (m.attachEmail && m.emailFromSub && isUsableOutreachEmail(m.emailFromSub)) {
        row.lead.email = m.emailFromSub;
      }
      if (m.attachHandle && m.handleFromSub && isUsableOutreachHandle(m.handleFromSub)) {
        const h = String(m.handleFromSub).replace(/^@/, '');
        row.lead.handle = `@${h}`;
      }
      // Clear park reason once real form fill proves contact
      if (row.lead.policyHoldReason) delete row.lead.policyHoldReason;
      row.lead.stateUpdatedAt = new Date().toISOString();
      row.lead.stateHistory = row.lead.stateHistory || [];
      row.lead.stateHistory.push({
        at: row.lead.stateUpdatedAt,
        from,
        to: 'form_filled',
        actor: 'funnel-join',
        evidence: ev,
        note: m.via,
      });
      applied++;
    }
    if (applied) saveDoc(doc);
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        matched: matched.length,
        eligible: plan.eligible.length,
        applied,
        realSubmissions: subs.length,
        skippedSynthetic,
        unmatchedSubmissions: Math.max(0, subs.length - new Set(matched.map((m) => m.submissionId)).size),
        gmail,
        pairs: matched,
        errors,
        apply,
      },
      null,
      2,
    ),
  );
}

/** Max follow-up drafts per lead (Fable: 5d + 14d final, then cold). Never auto-sends. */
export const MAX_NUDGES = 2;

/** Count recorded nudges (stateHistory → nudged, or explicit nudgeCount). */
export function nudgeCount(lead) {
  const hist = Array.isArray(lead?.stateHistory) ? lead.stateHistory : [];
  let n = 0;
  for (const h of hist) {
    if (h && (h.to === 'nudged' || h.kind === 'nudge')) n++;
  }
  if (typeof lead?.nudgeCount === 'number' && lead.nudgeCount > n) n = lead.nudgeCount;
  return n;
}

/**
 * Pure follow-up plan — no IO. Draft only when age gate passes and under MAX_NUDGES.
 * Fail-closed (batch-approve / match-bridge parity): sample, identity-suppressed,
 * and no usable email|handle never enter draftable (url-only / noise are not sendable).
 * @returns {{ draftable: object[], skipped: object[], coldEligible: object[] }}
 */
export function planFollowups(doc, { days = 5, id = null, now = Date.now() } = {}) {
  const draftable = [];
  const skipped = [];
  const coldEligible = [];
  const minDays = Number(days);
  if (!Number.isFinite(minDays) || minDays <= 0) throw new Error('days must be a positive number');
  const root = doc || {};
  for (const { lead, side } of allLeads(root)) {
    if (id && lead.id !== id) continue;
    const st = getState(lead);
    if (st !== 'sent' && st !== 'nudged') {
      if (id) skipped.push({ id: lead.id, reason: `state=${st}`, state: st });
      continue;
    }
    // Sample/selftest never re-enter outbound (money-path honesty)
    if (lead.sample || lead.selftest || lead.test) {
      skipped.push({ id: lead.id, side, reason: 'sample_or_test', state: st });
      continue;
    }
    // Twin opted_out / quarantine / bounce blocks further nudges
    if (isIdentitySuppressedByOther(lead, root)) {
      skipped.push({ id: lead.id, side, reason: 'identity_suppressed', state: st });
      continue;
    }
    attachPublicContact(lead);
    const email = String(lead.email || lead.contactEmail || '').trim();
    const handle = String(lead.handle || '').trim();
    const emailOk = isUsableOutreachEmail(email);
    const handleOk = isUsableOutreachHandle(handle);
    if (!emailOk && !handleOk) {
      const why =
        email || handle
          ? `noise contact (${email || handle}) — not followup-draftable`
          : 'no email/handle — cannot draft followup (url-only not sendable)';
      skipped.push({ id: lead.id, side, reason: why, state: st });
      continue;
    }
    const nudges = nudgeCount(lead);
    const since = Date.parse(lead.stateUpdatedAt || lead.at || 0) || 0;
    const ageDays = since ? (now - since) / 86400000 : 999;
    const age = Math.round(ageDays * 10) / 10;
    if (nudges >= MAX_NUDGES) {
      coldEligible.push({
        id: lead.id,
        side,
        state: st,
        nudges,
        ageDays: age,
        reason: `max ${MAX_NUDGES} nudges reached — human may mark cold`,
      });
      continue;
    }
    // Second nudge waits longer (final ~14d) unless --id forces one target.
    const needDays = nudges === 0 ? minDays : Math.max(minDays, 14);
    if (!id && ageDays < needDays) {
      skipped.push({ id: lead.id, reason: `age ${age}d < ${needDays}d`, state: st, nudges });
      continue;
    }
    draftable.push({
      id: lead.id,
      side,
      state: st,
      ageDays: age,
      nudges,
      nextNudge: nudges + 1,
      final: nudges + 1 >= MAX_NUDGES,
      // Human console: who to send to (never auto)
      channel: emailOk ? 'email' : 'handle',
      to: emailOk ? email : handle.startsWith('@') ? handle : `@${handle}`,
    });
  }
  return { draftable, skipped, coldEligible, maxNudges: MAX_NUDGES, days: minDays };
}

function followupBody(lead, side, { final = false } = {}) {
  const who = lead.company || lead.name || lead.handle || lead.id;
  const wiz = wizLinkFor(lead, side);
  const bump = final
    ? `Last check-in for ${who} — if timing is wrong I'll close this out (no hard feelings).`
    : `Quick bump for ${who} — no pressure.`;
  return [
    `To: ${draftContactTo(lead)}`,
    `Lead-Id: ${lead.id || ''}`,
    `Subject: re: ${side === 'partner' ? 'eng hiring' : 'SF matching'}`,
    '',
    bump,
    `If useful: ${wiz}`,
    `If the timing is wrong, "not now" / "no thanks" is fine and I'll close it out.`,
    '',
    '— Potter, potter@trydemigod.com',
    '',
  ].join('\n');
}

/** Nudge draft for sent/nudged leads (never sends). Caps at MAX_NUDGES. */
function cmdFollowup(args) {
  const id = arg(args, '--id');
  const days = Number(arg(args, '--days') ?? 5);
  const doc = loadLeads();
  normalizeDoc(doc);
  const plan = planFollowups(doc, { days, id, now: Date.now() });
  if (!plan.draftable.length) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          drafted: [],
          coldEligible: plan.coldEligible,
          skipped: plan.skipped.slice(0, 20),
          maxNudges: MAX_NUDGES,
          note: 'no sent/nudged leads past age gate under max-nudge cap',
        },
        null,
        2,
      ),
    );
    return;
  }
  const outDir = path.join(DRAFTS, 'followups');
  fs.mkdirSync(outDir, { recursive: true });
  const drafted = [];
  for (const t of plan.draftable) {
    const row = findLead(doc, t.id);
    if (!row) continue;
    const out = path.join(outDir, `${t.id}.txt`);
    atomicWrite(out, followupBody(row.lead, t.side, { final: t.final }));
    drafted.push({
      id: t.id,
      ageDays: t.ageDays,
      state: t.state,
      nudges: t.nudges,
      nextNudge: t.nextNudge,
      final: t.final,
      channel: t.channel || null,
      to: t.to || null,
      draft: out,
    });
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        drafted,
        coldEligible: plan.coldEligible,
        skipped: plan.skipped.slice(0, 20),
        days,
        maxNudges: MAX_NUDGES,
        note: 'drafts only — human sends; receipt → nudged',
      },
      null,
      2,
    ),
  );
}

/**
 * Pure match-bridge plan — no IO. Fail-closed eligibility only.
 * Talent needs joinedSubmissionId; partner ready when form_filled|in_review.
 * Sample/seed leads never enter the money path.
 * Identity shared with any suppress-terminal twin is denied (replies/outreach parity).
 * Partner needs title|role|company (id alone is not a usable query surface).
 * Two ready leads sharing email/handle → both denied (ambiguous identity, replies parity).
 */
export function planMatchBridge(doc) {
  const ready = [];
  const skipped = [];
  const root = doc || {};
  const candidates = []; // { row, keys }
  for (const { lead, side } of allLeads(root)) {
    if (!lead?.id) continue;
    const st = getState(lead);
    if (!['form_filled', 'in_review'].includes(st)) continue;
    if (lead.sample || lead.selftest || lead.test) {
      skipped.push({ leadId: lead.id, side, state: st, reason: 'sample_or_test' });
      continue;
    }
    if (isIdentitySuppressedByOther(lead, root)) {
      skipped.push({ leadId: lead.id, side, state: st, reason: 'identity_suppressed' });
      continue;
    }
    const subId = lead.joinedSubmissionId || null;
    if (side === 'talent' && !subId) {
      skipped.push({
        leadId: lead.id,
        side,
        state: st,
        reason: 'talent needs joinedSubmissionId — run join first',
      });
      continue;
    }
    if (side !== 'talent' && side !== 'partner') {
      skipped.push({ leadId: lead.id, side, state: st, reason: 'unknown side' });
      continue;
    }
    // Partner roles need a real query surface — bare id alone was a vacuous pass.
    // joinedSubmissionId is a real inbox role id (WIZ join); title/company also OK.
    if (
      side === 'partner' &&
      !subId &&
      !String(lead.title || lead.role || lead.company || '').trim()
    ) {
      skipped.push({ leadId: lead.id, side, state: st, reason: 'partner missing title/company' });
      continue;
    }
    candidates.push({
      row: {
        leadId: lead.id,
        side,
        state: st,
        subId,
        // Prefer WIZ submission id (inbox role + 90d); else funnel: lead role from partners.
        query:
          side === 'partner'
            ? subId || (lead.id ? `funnel:${lead.id}` : lead.title || lead.company || lead.id)
            : subId,
        mode: side === 'talent' ? 'propose-for-candidate' : 'suggest',
        canAdvanceToInReview: st === 'form_filled',
      },
      keys: identityKeys(lead),
    });
  }
  // Ambiguous identity among ready: same email/handle on 2+ leads → deny money path for both
  const keyToIds = new Map();
  for (const { row, keys } of candidates) {
    for (const k of keys) {
      if (!keyToIds.has(k)) keyToIds.set(k, new Set());
      keyToIds.get(k).add(row.leadId);
    }
  }
  const ambiguousIds = new Set();
  for (const ids of keyToIds.values()) {
    if (ids.size > 1) for (const id of ids) ambiguousIds.add(id);
  }
  for (const { row } of candidates) {
    if (ambiguousIds.has(row.leadId)) {
      skipped.push({
        leadId: row.leadId,
        side: row.side,
        state: row.state,
        reason: 'ambiguous_identity',
      });
    } else {
      ready.push(row);
    }
  }
  return { ready, skipped };
}

/**
 * Pure fail-closed: may form_filled → in_review only after a clean engine result.
 * Empty ranked is OK (human still reviews zero suggestions); engine error is not.
 * Vacuous `{}` (empty-stdout parse) is not OK — must look like suggest/propose output.
 * Sample/blocked/identity-suppressed plan rows never advance (defense in depth).
 * Engine subject bind (always required when mode is set — not only when stdout names a field):
 *  - propose-for-candidate: candId must be present and equal subId
 *  - suggest: role.id must be present and equal query (matches-only / ranked-only is not a bind)
 * Stale/swapped JSON without subject cannot open another lead's money path.
 * Evidence text always carries mode + subject bind + engine shape (not vacuous "match bridge").
 */
export function planMatchAdvance(planRow, engineResult, { engineExitOk = true } = {}) {
  if (!planRow || !planRow.leadId) return { ok: false, reason: 'no_plan_row' };
  if (planRow.sample || planRow.selftest || planRow.test) {
    return { ok: false, reason: 'sample_or_test' };
  }
  if (planRow.blocked === 'identity_suppressed' || planRow.identitySuppressed) {
    return { ok: false, reason: 'identity_suppressed' };
  }
  if (!planRow.canAdvanceToInReview) {
    return { ok: false, reason: 'not_form_filled' };
  }
  // Mode required so unbound generic shapes cannot open money path
  const mode = String(planRow.mode || '').trim();
  if (!mode) return { ok: false, reason: 'mode_required' };
  if (mode !== 'suggest' && mode !== 'propose-for-candidate') {
    return { ok: false, reason: 'mode_unknown:' + mode };
  }
  if (!engineExitOk) return { ok: false, reason: 'engine_exit_nonzero' };
  if (!engineResult || typeof engineResult !== 'object') {
    return { ok: false, reason: 'engine_no_json' };
  }
  if (engineResult.error) return { ok: false, reason: String(engineResult.error) };
  if (engineResult.ok === false) {
    return { ok: false, reason: String(engineResult.error || 'engine_not_ok') };
  }
  // Fail-closed shape: suggestMatches has role|matches; proposeForCandidate has ok:true|ranked
  // Empty `{}` from `JSON.parse('')` fallback must not advance the money path.
  const hasShape =
    engineResult.ok === true ||
    engineResult.role != null ||
    Array.isArray(engineResult.matches) ||
    Array.isArray(engineResult.ranked);
  if (!hasShape) {
    return { ok: false, reason: 'engine_shape_invalid' };
  }
  // Bind engine-named subject to this plan row (fail-closed against swapped/anonymous stdout)
  const expectCand =
    mode === 'propose-for-candidate' ? String(planRow.subId || '').trim() : '';
  const expectRole =
    mode === 'suggest' ? String(planRow.query || planRow.subId || '').trim() : '';
  if (mode === 'propose-for-candidate' && !expectCand) {
    return { ok: false, reason: 'subId_required' };
  }
  if (mode === 'suggest' && !expectRole) {
    return { ok: false, reason: 'query_required' };
  }
  if (expectCand) {
    // Always require candId (not only when ok:true) — ranked-only is not a subject bind
    if (engineResult.candId == null || String(engineResult.candId).trim() === '') {
      return { ok: false, reason: 'engine_cand_missing' };
    }
    if (String(engineResult.candId) !== expectCand) {
      return { ok: false, reason: 'engine_cand_mismatch' };
    }
  } else if (
    engineResult.candId != null &&
    planRow.subId &&
    String(engineResult.candId) !== String(planRow.subId)
  ) {
    return { ok: false, reason: 'engine_cand_mismatch' };
  }
  if (expectRole) {
    // Always require role.id (matches-only / empty role {} is not a subject bind)
    if (
      engineResult.role == null ||
      engineResult.role.id == null ||
      String(engineResult.role.id).trim() === ''
    ) {
      return { ok: false, reason: 'engine_role_missing' };
    }
    if (String(engineResult.role.id) !== expectRole) {
      return { ok: false, reason: 'engine_role_mismatch' };
    }
  }
  // Evidence must name lead + mode + subject bind + engine shape (not vacuous "match bridge" alone)
  const shapeTag =
    engineResult.ok === true
      ? 'ok'
      : engineResult.role != null
        ? 'role'
        : Array.isArray(engineResult.matches)
          ? `matches:${engineResult.matches.length}`
          : Array.isArray(engineResult.ranked)
            ? `ranked:${engineResult.ranked.length}`
            : 'shape';
  const evidenceText = [
    'match bridge',
    `lead: ${planRow.leadId}`,
    `mode: ${mode}`,
    expectCand ? `candId: ${expectCand}` : null,
    expectRole ? `roleId: ${expectRole}` : null,
    `engine: ${shapeTag}`,
  ]
    .filter(Boolean)
    .join('\n');
  const check = canTransition('form_filled', 'in_review', {
    evidenceText,
    actor: 'funnel-match',
  });
  if (!check.ok) return { ok: false, reason: check.error || 'canTransition_denied' };
  return { ok: true, to: 'in_review', reason: 'engine_ok', evidenceText };
}

/**
 * Pure intro queue from pairs ledger map. Never sends.
 * Fail-closed:
 *  - default excludes sample pairs (seed inflation)
 *  - requires roleId + candId (intro-draft needs both sides)
 *  - roleId === candId denied (vacuous same-side pair)
 *  - mutual_yes requires both mutual.founder and mutual.candidate
 *  - optional leadsDoc: pair linked to sample / identity-suppressed / terminal lead is denied
 *  - optional leadsDoc: linked leads sharing identity with another pair-linked lead
 *    denied (ambiguous_identity — match/replies/pair-sync parity)
 *  - when leadsDoc links exist, eligible items carry leadIds (intro receipt bridge)
 * Draft prep allowed for human-approved pairs; intro-ready only when mutual_yes + both consents.
 */
export function planIntroQueue(pairsMap, { includeSample = false, leadsDoc = null } = {}) {
  const items = [];
  const skipped = [];
  const map = pairsMap && typeof pairsMap === 'object' ? pairsMap : {};
  const list = Array.isArray(map) ? map : Object.values(map);
  // Index leads that claim each pairId (money-path identity gate)
  const leadsByPair = new Map();
  // Ambiguous identity among pair-linked non-sample non-suppress leads (pair-sync parity)
  const ambiguousLeadIds = new Set();
  if (leadsDoc && typeof leadsDoc === 'object') {
    const keyToIds = new Map();
    for (const { lead } of allLeads(leadsDoc)) {
      if (!lead?.id) continue;
      for (const pid of lead.pairIds || []) {
        const k = String(pid);
        if (!leadsByPair.has(k)) leadsByPair.set(k, []);
        leadsByPair.get(k).push(lead);
      }
      if (lead.sample || lead.selftest || lead.test) continue;
      if (SUPPRESS_STATES.has(getState(lead))) continue;
      if (!(lead.pairIds || []).length) continue;
      for (const ik of identityKeys(lead)) {
        if (!keyToIds.has(ik)) keyToIds.set(ik, new Set());
        keyToIds.get(ik).add(lead.id);
      }
    }
    for (const ids of keyToIds.values()) {
      if (ids.size > 1) for (const lid of ids) ambiguousLeadIds.add(lid);
    }
  }
  for (const p of list) {
    if (!p || typeof p !== 'object') continue;
    const id = p.pairId || p.id;
    if (!id) {
      skipped.push({ reason: 'no_id' });
      continue;
    }
    if (p.sample && !includeSample) {
      skipped.push({ pairId: id, state: p.state, reason: 'sample' });
      continue;
    }
    if (!['approved', 'mutual_yes'].includes(p.state)) {
      skipped.push({ pairId: id, state: p.state, reason: `state=${p.state || 'empty'}` });
      continue;
    }
    if (!p.roleId || !p.candId) {
      skipped.push({ pairId: id, state: p.state, reason: 'missing_roleId_or_candId' });
      continue;
    }
    // Vacuous same-side pair cannot open intro money path
    if (String(p.roleId) === String(p.candId)) {
      skipped.push({ pairId: id, state: p.state, reason: 'roleId_equals_candId' });
      continue;
    }
    const mutual = p.mutual || {};
    if (p.state === 'mutual_yes' && !(mutual.founder && mutual.candidate)) {
      skipped.push({
        pairId: id,
        state: p.state,
        reason: 'mutual_yes_without_both_consents',
      });
      continue;
    }
    // When leadsDoc is present: any linked lead that is sample, terminal, or identity-suppressed
    // blocks the pair money path (parity with planIntroLeadReady / replies-ingest).
    const linked = leadsByPair.get(String(id)) || [];
    if (linked.length && leadsDoc) {
      if (linked.some((l) => l.sample || l.selftest || l.test) && !includeSample) {
        skipped.push({ pairId: id, state: p.state, reason: 'linked_sample_or_test_lead' });
        continue;
      }
      // Self-terminal linked lead (desync: pair still mutual_yes, lead already cold/opted_out/…)
      if (linked.some((l) => SUPPRESS_STATES.has(getState(l)))) {
        skipped.push({ pairId: id, state: p.state, reason: 'linked_lead_terminal' });
        continue;
      }
      if (linked.some((l) => isIdentitySuppressedByOther(l, leadsDoc))) {
        skipped.push({ pairId: id, state: p.state, reason: 'identity_suppressed' });
        continue;
      }
      // Same email/handle on 2+ pair-linked leads → deny (which person gets the intro?)
      if (linked.some((l) => ambiguousLeadIds.has(l.id))) {
        skipped.push({ pairId: id, state: p.state, reason: 'ambiguous_identity' });
        continue;
      }
    }
    const leadIds = linked.map((l) => l.id).filter(Boolean);
    items.push({
      pairId: id,
      state: p.state,
      roleId: p.roleId,
      candId: p.candId,
      sample: !!p.sample,
      eligible: true,
      // approved = human shortlist prep; mutual_yes + both consents = intro-ready
      introReady: p.state === 'mutual_yes' && !!mutual.founder && !!mutual.candidate,
      // Bridge surface for receipt path (empty when pair-only / unlinked)
      ...(leadIds.length ? { leadIds } : {}),
    });
  }
  return { items, skipped, eligible: items };
}

/**
 * Pure lead-side intro bridge: mutual_yes leads ready for receipt → intro_made.
 * Fail-closed: sample, no pairIds, missing pair, half-consent, missing role/cand,
 * roleId === candId (vacuous same-side), co-linked lead on same pair is
 * sample/terminal/identity-suppressed (pair-queue parity), or ambiguous identity
 * among ready leads (match/replies parity).
 * Never sends — only reports who may receive an intro receipt.
 * @returns {{ ready: object[], skipped: object[] }}
 */
export function planIntroLeadReady(doc, pairsMap, { includeSample = false } = {}) {
  const ready = [];
  const skipped = [];
  const map = pairsMap && typeof pairsMap === 'object' ? pairsMap : {};
  const root = doc || {};
  // Index co-leads per pairId (money path must not open when the other side is terminal)
  const leadsByPair = new Map();
  for (const { lead } of allLeads(root)) {
    if (!lead?.id) continue;
    for (const pid of lead.pairIds || []) {
      const k = String(pid);
      if (!leadsByPair.has(k)) leadsByPair.set(k, []);
      leadsByPair.get(k).push(lead);
    }
  }
  const candidates = []; // { row, keys }
  for (const { lead, side } of allLeads(root)) {
    if (!lead?.id) continue;
    const st = getState(lead);
    if (st !== 'mutual_yes') continue;
    if ((lead.sample || lead.selftest || lead.test) && !includeSample) {
      skipped.push({ leadId: lead.id, side, reason: 'sample_or_test' });
      continue;
    }
    if (isIdentitySuppressedByOther(lead, root)) {
      skipped.push({ leadId: lead.id, side, reason: 'identity_suppressed' });
      continue;
    }
    const ids = lead.pairIds || [];
    if (!ids.length) {
      skipped.push({ leadId: lead.id, side, reason: 'no_pairIds' });
      continue;
    }
    let best = null;
    for (const pid of ids) {
      const pair = map[pid] || map[String(pid)];
      if (!pair || typeof pair !== 'object') {
        skipped.push({ leadId: lead.id, pairId: pid, reason: 'pair_missing' });
        continue;
      }
      if (pair.sample && !includeSample) {
        skipped.push({ leadId: lead.id, pairId: pid, reason: 'sample' });
        continue;
      }
      if (pair.state !== 'mutual_yes') {
        skipped.push({
          leadId: lead.id,
          pairId: pid,
          reason: `pair_state=${pair.state || 'empty'}`,
        });
        continue;
      }
      const mutual = pair.mutual || {};
      if (!(mutual.founder && mutual.candidate)) {
        skipped.push({
          leadId: lead.id,
          pairId: pid,
          reason: 'mutual_yes_without_both_consents',
        });
        continue;
      }
      if (!pair.roleId || !pair.candId) {
        skipped.push({ leadId: lead.id, pairId: pid, reason: 'missing_roleId_or_candId' });
        continue;
      }
      // Vacuous same-side pair cannot open intro money path (planIntroQueue parity)
      if (String(pair.roleId) === String(pair.candId)) {
        skipped.push({ leadId: lead.id, pairId: pid, reason: 'roleId_equals_candId' });
        continue;
      }
      // Co-linked leads on this pair (other side terminal / sample / suppress twin)
      const linked = leadsByPair.get(String(pid)) || [];
      if (linked.some((l) => l.id !== lead.id && (l.sample || l.selftest || l.test)) && !includeSample) {
        skipped.push({ leadId: lead.id, pairId: pid, reason: 'linked_sample_or_test_lead' });
        continue;
      }
      if (linked.some((l) => l.id !== lead.id && SUPPRESS_STATES.has(getState(l)))) {
        skipped.push({ leadId: lead.id, pairId: pid, reason: 'linked_lead_terminal' });
        continue;
      }
      if (linked.some((l) => l.id !== lead.id && isIdentitySuppressedByOther(l, root))) {
        skipped.push({ leadId: lead.id, pairId: pid, reason: 'linked_identity_suppressed' });
        continue;
      }
      best = { pairId: pid, roleId: pair.roleId, candId: pair.candId };
      break;
    }
    if (!best) {
      if (!skipped.some((s) => s.leadId === lead.id)) {
        skipped.push({ leadId: lead.id, side, reason: 'no_intro_ready_pair' });
      }
      continue;
    }
    // Readiness evidence binds pair + role/cand; the later receipt command still
    // requires real transport evidence before it may transition to intro_made.
    const evidenceText = [
      `intro ready pair ${best.pairId}`,
      `roleId: ${best.roleId}`,
      `candId: ${best.candId}`,
    ].join('\n');
    candidates.push({
      row: {
        leadId: lead.id,
        side,
        state: st,
        to: 'intro_made',
        pairId: best.pairId,
        roleId: best.roleId,
        candId: best.candId,
        eligible: true,
        // Surface receipt evidence text (role/cand bind) for apply consumers
        evidenceText,
      },
      keys: identityKeys(lead),
    });
  }
  // Ambiguous identity among ready: same email/handle on 2+ leads → deny both (replies/match parity)
  const keyToIds = new Map();
  for (const { row, keys } of candidates) {
    for (const k of keys) {
      if (!keyToIds.has(k)) keyToIds.set(k, new Set());
      keyToIds.get(k).add(row.leadId);
    }
  }
  const ambiguousIds = new Set();
  for (const ids of keyToIds.values()) {
    if (ids.size > 1) for (const id of ids) ambiguousIds.add(id);
  }
  for (const { row } of candidates) {
    if (ambiguousIds.has(row.leadId)) {
      skipped.push({
        leadId: row.leadId,
        side: row.side,
        reason: 'ambiguous_identity',
      });
    } else {
      ready.push(row);
    }
  }
  return { ready, skipped };
}

/**
 * Match bridge: form_filled/in_review leads → matching-engine.
 * Talent with joinedSubmissionId uses propose-for-candidate.
 * Partner uses suggest by funnel: role id or title.
 * --apply moves form_filled→in_review only when engine is clean (fail-closed).
 * --force also --propose pairs (sample seeds stay sample).
 */
function cmdMatch(args) {
  const apply = args.includes('--apply');
  const force = args.includes('--force');
  const doc = loadLeads();
  normalizeDoc(doc);
  const plan = planMatchBridge(doc);
  const suggestions = [];
  const skipped = [...plan.skipped];
  const advanced = [];
  const blocked = [];
  for (const row of plan.ready) {
    const leadRow = findLead(doc, row.leadId);
    if (!leadRow) {
      skipped.push({ leadId: row.leadId, reason: 'lead vanished' });
      continue;
    }
    const { lead } = leadRow;
    let r;
    if (row.mode === 'propose-for-candidate') {
      const cli = [
        path.join(ROOT, 'demigod-matching-engine.mjs'),
        'propose-for-candidate',
        String(row.subId),
      ];
      if (!(apply && force)) cli.push('--rank-only');
      r = spawnSync(process.execPath, cli, {
        encoding: 'utf8',
        timeout: 60000,
        cwd: ROOT,
        maxBuffer: 4 * 1024 * 1024,
      });
    } else {
      const cli = [path.join(ROOT, 'demigod-matching-engine.mjs'), 'suggest', String(row.query)];
      if (apply && force) cli.push('--propose');
      r = spawnSync(process.execPath, cli, {
        encoding: 'utf8',
        timeout: 60000,
        cwd: ROOT,
        maxBuffer: 4 * 1024 * 1024,
      });
    }
    let parsed = null;
    try {
      parsed = JSON.parse(r.stdout || '{}');
    } catch {
      /* */
    }
    const pairIds = (parsed?.proposed || [])
      .map((p) => p.pairId)
      .filter(Boolean);
    if (pairIds.length) {
      lead.pairIds = [...new Set([...(lead.pairIds || []), ...pairIds])];
    }
    const engineOk = r.status === 0 && !parsed?.error && parsed?.ok !== false;
    suggestions.push({
      leadId: lead.id,
      side: row.side,
      state: getState(lead),
      subId: row.subId,
      ok: engineOk,
      error: parsed?.error || (r.status !== 0 ? 'engine_exit_nonzero' : null),
      pairIds,
      ranked: (parsed?.ranked || parsed?.matches || []).slice?.(0, 3) || [],
    });
    if (!apply || !row.canAdvanceToInReview) continue;
    const adv = planMatchAdvance(row, parsed, { engineExitOk: r.status === 0 });
    if (!adv.ok) {
      blocked.push({ leadId: lead.id, reason: adv.reason });
      continue;
    }
    const evDir = path.join(BUSY, 'funnel', 'match');
    fs.mkdirSync(evDir, { recursive: true });
    const ev = path.join(evDir, `${lead.id}.txt`);
    // Prefer pure-plan evidence text (includes engine shape); fall back to path-only blob
    const evBody =
      adv.evidenceText ||
      `match bridge\nlead: ${lead.id}\nsub: ${row.subId || ''}\npairs: ${(lead.pairIds || []).join(',')}\nat: ${new Date().toISOString()}\n`;
    atomicWrite(
      ev,
      `${evBody}\nsub: ${row.subId || ''}\npairs: ${(lead.pairIds || []).join(',')}\nat: ${new Date().toISOString()}\n`,
    );
    const check = canTransition('form_filled', 'in_review', { evidencePath: ev, actor: 'funnel-match' });
    if (!check.ok) {
      blocked.push({ leadId: lead.id, reason: check.error || 'canTransition_denied' });
      continue;
    }
    lead.state = 'in_review';
    lead.status = 'in_review';
    lead.stateUpdatedAt = new Date().toISOString();
    lead.stateHistory = lead.stateHistory || [];
    lead.stateHistory.push({
      at: lead.stateUpdatedAt,
      from: 'form_filled',
      to: 'in_review',
      actor: 'funnel-match',
      evidence: ev,
    });
    advanced.push(lead.id);
  }
  if (apply && (advanced.length || suggestions.some((s) => s.pairIds?.length))) saveDoc(doc);
  console.log(
    JSON.stringify(
      {
        ok: true,
        ready: plan.ready.length,
        suggestions,
        skipped,
        advanced,
        blocked,
        apply,
        force,
        note: force
          ? 'pairs proposed where scores clear threshold; human still reviews via match-review'
          : 'rank-only unless --apply --force; form_filled→in_review only on clean engine (fail-closed)',
      },
      null,
      2,
    ),
  );
}

/**
 * Pure fail-closed pair ledger → lead moves (no IO).
 * Sample pairs never open the money path.
 * approved → proposed and mutual_yes both require roleId + candId and roleId !== candId
 * (intro-queue parity — vacuous same-side / half-identified pairs never open money path).
 * mutual_yes also requires both consents.
 * Two pair-linked leads sharing email/handle → both denied (ambiguous identity, match/replies parity).
 * Co-linked lead on same pair is sample / terminal / identity-suppressed → deny
 * (parity with planIntroLeadReady / planIntroQueue — other side cold blocks money path).
 * @returns {{ moves: object[], skipped: object[] }}
 */
export function planPairSyncMoves(doc, pairsMap, { includeSample = false } = {}) {
  const moves = [];
  const skipped = [];
  const map = pairsMap && typeof pairsMap === 'object' ? pairsMap : {};
  const root = doc || {};
  // Index co-leads per pairId (money path must not open when the other side is cold)
  const leadsByPair = new Map();
  for (const { lead } of allLeads(root)) {
    if (!lead?.id) continue;
    for (const pid of lead.pairIds || []) {
      const k = String(pid);
      if (!leadsByPair.has(k)) leadsByPair.set(k, []);
      leadsByPair.get(k).push(lead);
    }
  }
  // Pre-scan: pair-linked non-sample, non-suppress leads that share identity → ambiguous
  const keyToIds = new Map();
  for (const { lead } of allLeads(root)) {
    if (!lead?.id) continue;
    if (lead.sample || lead.selftest || lead.test) continue;
    if (isIdentitySuppressedByOther(lead, root)) continue;
    if (!(lead.pairIds || []).length) continue;
    for (const k of identityKeys(lead)) {
      if (!keyToIds.has(k)) keyToIds.set(k, new Set());
      keyToIds.get(k).add(lead.id);
    }
  }
  const ambiguousIds = new Set();
  for (const ids of keyToIds.values()) {
    if (ids.size > 1) for (const id of ids) ambiguousIds.add(id);
  }
  for (const { lead } of allLeads(root)) {
    if (!lead?.id) continue;
    if (lead.sample || lead.selftest || lead.test) {
      if ((lead.pairIds || []).length) {
        skipped.push({ leadId: lead.id, reason: 'sample_or_test_lead' });
      }
      continue;
    }
    if (isIdentitySuppressedByOther(lead, root)) {
      if ((lead.pairIds || []).length) {
        skipped.push({ leadId: lead.id, reason: 'identity_suppressed' });
      }
      continue;
    }
    if (ambiguousIds.has(lead.id)) {
      skipped.push({ leadId: lead.id, reason: 'ambiguous_identity' });
      continue;
    }
    const ids = lead.pairIds || [];
    if (!ids.length) continue;
    for (const pid of ids) {
      const pair = map[pid] || map[String(pid)];
      if (!pair || typeof pair !== 'object') {
        skipped.push({ leadId: lead.id, pairId: pid, reason: 'pair_missing' });
        continue;
      }
      if (pair.sample && !includeSample) {
        skipped.push({ leadId: lead.id, pairId: pid, reason: 'sample' });
        continue;
      }
      // Co-linked leads on this pair (intro-bridge / replies parity)
      const linked = leadsByPair.get(String(pid)) || [];
      if (
        linked.some((l) => l.id !== lead.id && (l.sample || l.selftest || l.test)) &&
        !includeSample
      ) {
        skipped.push({ leadId: lead.id, pairId: pid, reason: 'linked_sample_or_test_lead' });
        continue;
      }
      if (linked.some((l) => l.id !== lead.id && SUPPRESS_STATES.has(getState(l)))) {
        skipped.push({ leadId: lead.id, pairId: pid, reason: 'linked_lead_terminal' });
        continue;
      }
      if (linked.some((l) => l.id !== lead.id && isIdentitySuppressedByOther(l, root))) {
        skipped.push({ leadId: lead.id, pairId: pid, reason: 'linked_identity_suppressed' });
        continue;
      }
      const st = getState(lead);
      if (pair.state === 'approved' && st === 'in_review') {
        // Intro-queue parity: approved prep still needs both side ids (not half-identified)
        if (!pair.roleId || !pair.candId) {
          skipped.push({ leadId: lead.id, pairId: pid, reason: 'missing_roleId_or_candId' });
          continue;
        }
        // Vacuous same-side pair cannot open proposed money path
        if (String(pair.roleId) === String(pair.candId)) {
          skipped.push({ leadId: lead.id, pairId: pid, reason: 'roleId_equals_candId' });
          continue;
        }
        // Evidence must bind pair + role/cand (mutual path parity — not "approved by human" alone)
        const note = [
          'pair-sync approved',
          `pairId: ${pid}`,
          `roleId: ${pair.roleId}`,
          `candId: ${pair.candId}`,
          `by: ${pair.reviewedBy || 'human'}`,
          pair.reviewedAt ? `at: ${pair.reviewedAt}` : null,
        ]
          .filter(Boolean)
          .join('\n');
        const check = canTransition('in_review', 'proposed', { evidenceText: note, actor: 'pair-sync' });
        if (!check.ok) {
          skipped.push({ leadId: lead.id, pairId: pid, reason: check.error || 'canTransition_denied' });
          continue;
        }
        moves.push({
          leadId: lead.id,
          pairId: pid,
          from: st,
          to: 'proposed',
          note,
          roleId: pair.roleId,
          candId: pair.candId,
          evidenceKind: 'note',
        });
        continue;
      }
      if (pair.state === 'mutual_yes' && (st === 'proposed' || st === 'in_review')) {
        const mutual = pair.mutual || {};
        if (!(mutual.founder && mutual.candidate)) {
          skipped.push({
            leadId: lead.id,
            pairId: pid,
            reason: 'mutual_yes_without_both_consents',
          });
          continue;
        }
        if (!pair.roleId || !pair.candId) {
          skipped.push({ leadId: lead.id, pairId: pid, reason: 'missing_roleId_or_candId' });
          continue;
        }
        // Vacuous same-side pair (intro bridge parity)
        if (String(pair.roleId) === String(pair.candId)) {
          skipped.push({ leadId: lead.id, pairId: pid, reason: 'roleId_equals_candId' });
          continue;
        }
        // Pure check: evidenceText stands in for the mutual artifact written on apply
        const evText = `pair-sync mutual\npairId: ${pid}\nroleId: ${pair.roleId}\ncandId: ${pair.candId}`;
        if (st === 'in_review') {
          const hop = canTransition('in_review', 'proposed', {
            evidenceText: `pair ${pid} ledger mutual_yes — hop to proposed`,
            actor: 'pair-sync',
          });
          if (!hop.ok) {
            skipped.push({ leadId: lead.id, pairId: pid, reason: hop.error || 'hop_denied' });
            continue;
          }
        }
        const check = canTransition('proposed', 'mutual_yes', {
          evidenceText: evText,
          actor: 'pair-sync',
        });
        if (!check.ok) {
          skipped.push({ leadId: lead.id, pairId: pid, reason: check.error || 'canTransition_denied' });
          continue;
        }
        moves.push({
          leadId: lead.id,
          pairId: pid,
          from: st,
          to: 'mutual_yes',
          hopViaProposed: st === 'in_review',
          roleId: pair.roleId,
          candId: pair.candId,
          mutual: { founder: true, candidate: true },
          evidenceKind: 'file',
        });
      }
    }
  }
  return { moves, skipped };
}

/**
 * Mirror pairs ledger → funnel states (report default; --apply mutates).
 * approved pair → proposed; mutual_yes pair → mutual_yes on linked lead.
 * Pure plan via planPairSyncMoves (fail-closed: sample + both-consent gates).
 */
function cmdPairSync(args) {
  const apply = args.includes('--apply');
  const includeSample = args.includes('--sample');
  const doc = loadLeads();
  normalizeDoc(doc);
  let pairsStore = { pairs: {} };
  try {
    pairsStore = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-PAIRS.json'), 'utf8'));
  } catch {
    /* */
  }
  const map = pairsStore.pairs || {};
  const plan = planPairSyncMoves(doc, map, { includeSample });
  const moves = [];
  const errors = [];
  for (const m of plan.moves) {
    const leadRow = findLead(doc, m.leadId);
    if (!leadRow) {
      errors.push({ leadId: m.leadId, pairId: m.pairId, error: 'lead_vanished' });
      continue;
    }
    const { lead } = leadRow;
    if (m.to === 'proposed') {
      if (apply) {
        const check = canTransition('in_review', 'proposed', {
          evidenceText: m.note,
          actor: 'pair-sync',
        });
        if (!check.ok) {
          errors.push({ leadId: lead.id, pairId: m.pairId, error: check.error });
          continue;
        }
        lead.state = 'proposed';
        lead.status = 'proposed';
        lead.stateUpdatedAt = new Date().toISOString();
        lead.stateHistory = lead.stateHistory || [];
        lead.stateHistory.push({
          at: lead.stateUpdatedAt,
          from: 'in_review',
          to: 'proposed',
          actor: 'pair-sync',
          note: m.note,
        });
      }
      moves.push({ leadId: lead.id, pairId: m.pairId, to: 'proposed', apply });
      continue;
    }
    if (m.to === 'mutual_yes') {
      const pid = m.pairId;
      const pair = map[pid] || map[String(pid)] || {};
      const evDir = path.join(BUSY, 'funnel', 'mutual');
      fs.mkdirSync(evDir, { recursive: true });
      const ev = path.join(evDir, `${pid}.txt`);
      atomicWrite(
        ev,
        JSON.stringify(
          {
            pairId: pid,
            roleId: m.roleId || pair.roleId,
            candId: m.candId || pair.candId,
            mutual: m.mutual || pair.mutual,
            history: (pair.history || []).slice(-5),
            at: new Date().toISOString(),
          },
          null,
          2,
        ) + '\n',
        { mode: 0o600 },
      );
      if (apply) {
        if (m.hopViaProposed || getState(lead) === 'in_review') {
          const n1 = `pair ${pid} ledger mutual_yes — hop to proposed`;
          if (canTransition('in_review', 'proposed', { evidenceText: n1, actor: 'pair-sync' }).ok) {
            lead.state = 'proposed';
            lead.status = 'proposed';
          }
        }
        const from = getState(lead);
        const check = canTransition(from, 'mutual_yes', { evidencePath: ev, actor: 'pair-sync' });
        if (!check.ok) {
          errors.push({ leadId: lead.id, pairId: pid, error: check.error });
          continue;
        }
        lead.state = 'mutual_yes';
        lead.status = 'mutual_yes';
        lead.stateUpdatedAt = new Date().toISOString();
        lead.stateHistory = lead.stateHistory || [];
        lead.stateHistory.push({
          at: lead.stateUpdatedAt,
          from,
          to: 'mutual_yes',
          actor: 'pair-sync',
          evidence: ev,
        });
      }
      moves.push({ leadId: lead.id, pairId: pid, to: 'mutual_yes', apply });
    }
  }
  if (apply && moves.length) saveDoc(doc);
  console.log(
    JSON.stringify(
      {
        ok: true,
        moves,
        skipped: plan.skipped.slice(0, 40),
        skippedTotal: plan.skipped.length,
        plannable: plan.moves.length,
        errors,
        apply,
        note: 'Fail-closed: sample pairs/leads skipped; mutual_yes needs both consents + roleId/candId',
      },
      null,
      2,
    ),
  );
}

/**
 * Onboarding helper: report WIZ inbox → funnel join readiness + 90d signal.
 * --apply runs join --apply only for non-synthetic with matching emails.
 */
function cmdOnboard(args) {
  const apply = args.includes('--apply');
  // re-use join logic by spawning join
  const join = spawnSync(
    process.execPath,
    [path.join(ROOT, 'demigod-funnel.mjs'), 'join', ...(apply ? ['--apply'] : [])],
    { encoding: 'utf8', timeout: 60000, cwd: ROOT, maxBuffer: 4e6 },
  );
  let joinOut = {};
  try {
    joinOut = JSON.parse(join.stdout || '{}');
  } catch {
    joinOut = { raw: (join.stdout || '').slice(0, 500) };
  }
  // 90d triage summary from real inbox
  let inbox = { items: [] };
  try {
    inbox = loadInbox();
  } catch {
    /* */
  }
  const real = (inbox.items || inbox.submissions || []).filter((s) => !isSyntheticSubmission(s));
  const with90 = real.filter((s) => {
    const raw = s.raw || s.data || {};
    return !!(raw['90day-outcome'] || raw.outcome90d || raw['90d-outcome']);
  });
  console.log(
    JSON.stringify(
      {
        ok: join.status === 0,
        join: joinOut,
        realSubmissions: real.length,
        with90d: with90.length,
        wizLinks: {
          startup: 'https://www.trydemigod.com/?wiz=startup',
          engineer: 'https://www.trydemigod.com/?wiz=engineer',
        },
        note: 'Drafts already include WIZ links; join wires form_filled when email/handle matches',
        apply,
      },
      null,
      2,
    ),
  );
}

/**
 * Queue intro drafts for approved|mutual_yes pairs (never sends). Pure plan via planIntroQueue.
 * --apply / --draft: write drafts.
 * Default drafts all eligible (approved prep + introReady mutual).
 * --ready-only: only mutual_yes with both consents (strict money path).
 * Also reports planIntroLeadReady (lead mutual_yes → receipt → intro_made candidates).
 */
function cmdIntro(args) {
  const apply = args.includes('--apply') || args.includes('--draft');
  const readyOnly = args.includes('--ready-only');
  let pairs = { pairs: {} };
  try {
    pairs = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-PAIRS.json'), 'utf8'));
  } catch {
    /* empty */
  }
  const map = pairs.pairs || pairs;
  const includeSample = args.includes('--sample');
  let leadsDoc = null;
  try {
    leadsDoc = loadLeads();
    normalizeDoc(leadsDoc);
  } catch {
    /* pair-only report still works without leads SoR */
  }
  const plan = planIntroQueue(map, { includeSample, leadsDoc });
  const draftTargets = readyOnly ? plan.items.filter((p) => p.introReady) : plan.items;
  fs.mkdirSync(path.join(BUSY, 'intros'), { recursive: true });
  const queued = [];
  for (const p of draftTargets) {
    if (apply) {
      const r = spawnSync(process.execPath, [path.join(ROOT, 'demigod-intro-draft.mjs'), p.pairId], {
        encoding: 'utf8',
        timeout: 30000,
        cwd: ROOT,
      });
      queued.push({
        pairId: p.pairId,
        state: p.state,
        introReady: !!p.introReady,
        ...(p.leadIds?.length ? { leadIds: p.leadIds } : {}),
        ok: r.status === 0,
        tail: (r.stdout || r.stderr || '').slice(-200),
      });
    } else {
      queued.push({
        pairId: p.pairId,
        state: p.state,
        sample: !!p.sample,
        eligible: true,
        introReady: !!p.introReady,
        ...(p.leadIds?.length ? { leadIds: p.leadIds } : {}),
      });
    }
  }
  // Report-only still lists approved prep when --ready-only (visible, not drafted)
  const heldPrep =
    readyOnly && !apply
      ? plan.items
          .filter((p) => !p.introReady)
          .map((p) => ({ pairId: p.pairId, state: p.state, introReady: false, action: 'prep_only' }))
      : [];
  // Lead-side money bridge (report only — receipt still human)
  let leadReady = { ready: [], skipped: [] };
  if (leadsDoc) {
    leadReady = planIntroLeadReady(leadsDoc, map, { includeSample });
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        mutualOrApproved: plan.items.length,
        introReady: plan.items.filter((p) => p.introReady).length,
        drafted: apply ? queued.filter((q) => q.ok).length : 0,
        items: queued,
        heldPrep: heldPrep.length ? heldPrep : undefined,
        leadIntroReady: leadReady.ready.length,
        leadReady: leadReady.ready.slice(0, 40),
        leadSkipped: leadReady.skipped.slice(0, 20),
        skipped: plan.skipped.slice(0, 40),
        skippedTotal: plan.skipped.length,
        apply,
        readyOnly,
        note: readyOnly
          ? 'Never sends. --ready-only: only mutual_yes + both consents (fail-closed money path)'
          : 'Never sends. Fail-closed: approved|mutual_yes only; samples excluded unless --sample; introReady = mutual + both consents; leadReady = mutual_yes leads with both-consent pair (receipt next)',
      },
      null,
      2,
    ),
  );
}

/**
 * intro_made → pilot-os record (report-only default; --apply writes).
 * Spawns demigod-pilot-os.mjs add; never writes DEMIGOD-PILOTS.json directly.
 * Idempotent via lead.pilotId. Does not advance hired (human evidence).
 */
function cmdPilot(args) {
  const apply = args.includes('--apply');
  const doc = loadLeads();
  normalizeDoc(doc);
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const pilotOs = path.join(scriptDir, 'demigod-pilot-os.mjs');
  const all = allLeads(doc);
  const items = [];
  let eligible = 0;
  let bridged = 0;
  for (const { lead, side } of all) {
    const st = getState(lead);
    if (st !== 'intro_made') continue;
    if (lead.pilotId) {
      items.push({
        leadId: lead.id,
        side,
        state: st,
        action: 'skip',
        reason: 'already_bridged',
        pilotId: lead.pilotId,
      });
      continue;
    }
    eligible++;
    const company = String(lead.company || '').trim();
    const role = String(lead.title || lead.role || '').trim();
    const source = `funnel:${lead.id}`;
    if (!company || !role) {
      items.push({
        leadId: lead.id,
        side,
        state: st,
        action: 'error',
        reason: 'missing_company_or_role',
      });
      continue;
    }
    if (!apply) {
      items.push({ leadId: lead.id, side, state: st, action: 'would_bridge', company, role, source });
      continue;
    }
    const r = spawnSync(
      process.execPath,
      [pilotOs, 'add', '--company', company, '--role', role, '--source', source],
      {
        encoding: 'utf8',
        timeout: 30000,
        cwd: scriptDir,
        env: { ...process.env, DEMIGOD_ROOT: ROOT },
        maxBuffer: 2 * 1024 * 1024,
      },
    );
    let parsed = null;
    try {
      parsed = JSON.parse((r.stdout || '').trim() || '{}');
    } catch {
      /* */
    }
    if (r.status === 0 && parsed?.ok && parsed?.pilot?.id) {
      lead.pilotId = parsed.pilot.id;
      lead.pilotBridgedAt = new Date().toISOString();
      bridged++;
      items.push({
        leadId: lead.id,
        side,
        state: st,
        action: 'bridged',
        pilotId: lead.pilotId,
        source,
      });
    } else {
      items.push({
        leadId: lead.id,
        side,
        state: st,
        action: 'error',
        reason: parsed?.error || parsed?.detail || `exit_${r.status}`,
        tail: ((r.stderr || r.stdout || '') + '').slice(-200),
      });
    }
  }
  if (apply && bridged) saveDoc(doc);
  console.log(
    JSON.stringify(
      {
        ok: true,
        apply,
        scanned: all.length,
        eligible,
        bridged: apply ? bridged : 0,
        wouldBridge: apply ? 0 : eligible,
        items,
        note: apply
          ? 'pilot-os add via funnel:<id>; hired stays human'
          : 'report-only; pass --apply to bridge',
      },
      null,
      2,
    ),
  );
}

/**
 * hired → invoiced via revenue stub (explicit --cash; never infers; never paid).
 * Stub file is the invoiced evidence. Report-only default; --apply writes.
 */
function cmdInvoice(args) {
  const id = arg(args, '--id');
  const cashRaw = arg(args, '--cash');
  const apply = args.includes('--apply');
  const actor = arg(args, '--actor') || 'agent';
  const evidenceArg = arg(args, '--evidence');
  const requestedPairId = arg(args, '--pair');
  const toArg = arg(args, '--to');

  if (toArg === 'paid') {
    console.error(
      JSON.stringify({
        ok: false,
        error: 'paid is human-only (bank/Stripe evidence); invoice never advances to paid',
      }),
    );
    process.exit(1);
  }
  if (!id) {
    // Report-only: list hired leads ready for human cash + invoice (pipeline tick)
    const doc0 = loadLeads();
    normalizeDoc(doc0);
    const hired = allLeads(doc0)
      .filter(({ lead }) => getState(lead) === 'hired')
      .map(({ lead, side }) => ({
        id: lead.id,
        side,
        company: lead.company || null,
        title: lead.title || null,
        pilotId: lead.pilotId || null,
      }));
    console.log(
      JSON.stringify(
        {
          ok: true,
          apply: false,
          hired: hired.length,
          items: hired,
          note: 'pass --id=LEAD --cash=INTEGER [--apply] to stub invoice; never paid',
        },
        null,
        2,
      ),
    );
    return;
  }
  if (cashRaw == null || String(cashRaw).trim() === '') {
    console.error(JSON.stringify({ ok: false, error: 'missing --cash (explicit first-year cash; never inferred)' }));
    process.exit(1);
  }
  if (!/^\d+$/.test(String(cashRaw).trim())) {
    console.error(JSON.stringify({ ok: false, error: '--cash must be a positive integer (dollars)' }));
    process.exit(1);
  }
  const cash = Number(String(cashRaw).trim());
  if (!Number.isFinite(cash) || cash <= 0) {
    console.error(JSON.stringify({ ok: false, error: '--cash must be a positive integer (dollars)' }));
    process.exit(1);
  }

  const doc = loadLeads();
  normalizeDoc(doc);
  const row = findLead(doc, id);
  if (!row) {
    console.error(JSON.stringify({ ok: false, error: `lead not found: ${id}` }));
    process.exit(1);
  }
  const from = getState(row.lead);
  if (from !== 'hired') {
    console.error(
      JSON.stringify({
        ok: false,
        id,
        from,
        error: `invoice requires state hired (got ${from})`,
      }),
    );
    process.exit(1);
  }
  const pairId = placementPairId(row.lead, requestedPairId);
  if (!pairId) {
    console.error(JSON.stringify({
      ok: false,
      id,
      error: requestedPairId ? 'pair_not_bound_to_lead' : 'invoice_requires_unambiguous_pair',
    }));
    process.exit(1);
  }

  const hire = [...(row.lead.stateHistory || [])].reverse().find((entry) =>
    entry?.to === 'hired' && entry?.pairId === pairId && entry?.evidence);
  const hireAt = Date.parse(hire?.at || '');
  const hireEvidence = hire?.evidence ? resolveEvidence(hire.evidence) : null;
  const requestedEvidence = evidenceArg ? resolveEvidence(evidenceArg) : hireEvidence;
  if (!Number.isFinite(hireAt) || hireAt > Date.now() || !hireEvidence ||
      !fs.existsSync(hireEvidence) || !fs.statSync(hireEvidence).isFile() || !fs.statSync(hireEvidence).size) {
    console.error(
      JSON.stringify({
        ok: false,
        id,
        error: 'pair-bound hired transition with valid evidence and chronology required',
      }),
    );
    process.exit(1);
  }
  if (path.resolve(requestedEvidence) !== path.resolve(hireEvidence)) {
    console.error(JSON.stringify({ ok: false, id, pairId, error: 'invoice_evidence_must_match_pair_hire' }));
    process.exit(1);
  }

  const calc = feeCents(cash);
  if (!calc.ok) {
    console.error(JSON.stringify({ ok: false, id, error: calc.error }));
    process.exit(1);
  }

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          apply: false,
          id,
          from,
          would: 'invoiced',
          cash,
          pairId,
          feeCents: calc.feeCents,
          hireEvidence,
          note: 'report-only; pass --apply to write stub + transition',
        },
        null,
        2,
      ),
    );
    return;
  }

  const stub = invoiceStub({
    pairId,
    cash,
    evidencePath: hireEvidence,
    actor,
  });
  if (!stub.ok) {
    console.error(JSON.stringify({ ok: false, id, error: stub.error }));
    process.exit(1);
  }

  const check = canTransition(from, 'invoiced', {
    evidencePath: stub.path,
    actor,
  });
  if (!check.ok) {
    console.error(JSON.stringify({ ok: false, id, from, to: 'invoiced', error: check.error }));
    process.exit(1);
  }

  const at = new Date().toISOString();
  row.lead.state = 'invoiced';
  row.lead.status = 'invoiced';
  row.lead.pairId = pairId;
  row.lead.stateUpdatedAt = at;
  row.lead.invoiceId = stub.invoice?.id || null;
  row.lead.invoicePath = stub.path;
  row.lead.feeCents = calc.feeCents;
  row.lead.stateHistory = row.lead.stateHistory || [];
  row.lead.stateHistory.push({
    at,
    from,
    to: 'invoiced',
    actor,
    evidence: stub.path,
    pairId,
    feeCents: calc.feeCents,
    note: `invoice stub feeCents=${calc.feeCents}`,
  });
  saveDoc(doc);
  appendLog({
    at,
    id,
    from,
    to: 'invoiced',
    actor,
    evidence: stub.path,
    pairId,
    feeCents: calc.feeCents,
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        apply: true,
        id,
        from,
        to: 'invoiced',
        cash,
        pairId,
        feeCents: calc.feeCents,
        invoiceId: stub.invoice?.id,
        path: stub.path,
        hireEvidence,
      },
      null,
      2,
    ),
  );
}

/**
 * Gmail / reply-check → funnel (FOCUS #4). Report-only default; --apply transitions.
 * Dump path: --file= or /tmp/demigod-gmail-inbound.json
 */
function cmdReplies(args) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const ingest = path.join(scriptDir, 'demigod-replies-ingest.mjs');
  const childArgs = [ingest];
  if (args.includes('--apply')) childArgs.push('--apply');
  const file = arg(args, '--file');
  if (file) childArgs.push(`--file=${file}`);
  const r = spawnSync(process.execPath, childArgs, {
    encoding: 'utf8',
    timeout: 90000,
    cwd: scriptDir,
    env: { ...process.env, DEMIGOD_ROOT: ROOT },
    maxBuffer: 4 * 1024 * 1024,
  });
  process.stdout.write(r.stdout || '');
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) process.exit(r.status ?? 1);
  // Honest dump presence for operators
  const dump = file || '/tmp/demigod-gmail-inbound.json';
  const hasDump = fs.existsSync(dump);
  if (!hasDump && !args.includes('--apply')) {
    // already printed ingest JSON; append note via second line only if quiet
  }
}

function cmdRepairHistory(args) {
  const id = arg(args, '--id');
  const apply = args.includes('--apply');
  if (!id) throw new Error('repair-history requires --id=LEAD');
  const doc = loadLeads();
  const row = findLead(doc, id);
  if (!row) throw new Error(`lead not found: ${id}`);
  const repair = repairLifecycleHistory(row.lead);
  if (!repair.removed.length || !apply) {
    console.log(JSON.stringify({ ok: true, apply: false, id, remove: repair.removed.length }, null, 2));
    return;
  }
  const at = new Date().toISOString();
  const receipt = path.join(PKG_BUSY, 'funnel', `history-repair-${id}-${at.replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(receipt), { recursive: true });
  row.lead.stateHistory = repair.kept;
  commitReceiptTransaction({
    receiptPath: receipt,
    receiptBody: JSON.stringify({ schema: 'demigod.lifecycle-history-repair/1', at, id, removed: repair.removed }, null, 2) + '\n',
    trackedPaths: [LEADS],
    commit: () => saveDoc(doc),
  });
  console.log(JSON.stringify({ ok: true, apply: true, id, removed: repair.removed.length, receipt }, null, 2));
}

function cmdCollisionPlan(args = []) {
  const apply = args.includes('--apply');
  const at = new Date().toISOString();
  const doc = loadLeads();
  const plan = planPartnerUrlCollisionMerges(doc);
  if (!apply) {
    const receipt = path.join(PKG_BUSY, 'funnel', `partner-url-collision-plan-${at.replace(/[:.]/g, '-')}.json`);
    fs.mkdirSync(path.dirname(receipt), { recursive: true });
    atomicWrite(receipt, JSON.stringify({ schema: 'demigod.partner-url-collision-plan/1', at, apply: false, plan }, null, 2) + '\n');
    console.log(JSON.stringify({ ok: true, apply: false, groups: plan.length, receipt, plan }, null, 2));
    return;
  }
  const result = applyPartnerUrlCollisionMerges(doc, plan, { at, actor: 'agent' });
  const receipt = path.join(PKG_BUSY, 'funnel', `partner-url-collision-apply-${at.replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(receipt), { recursive: true });
  commitReceiptTransaction({
    receiptPath: receipt,
    receiptBody: JSON.stringify({
      schema: 'demigod.partner-url-collision-apply/1',
      at,
      apply: true,
      plan,
      applied: result.applied,
      removed: result.removed,
      remainingGroups: result.remainingGroups,
    }, null, 2) + '\n',
    trackedPaths: [LEADS],
    commit: () => saveDoc(doc),
  });
  console.log(JSON.stringify({
    ok: true,
    apply: true,
    groups: plan.length,
    applied: result.applied.length,
    removed: result.removed.length,
    remainingGroups: result.remainingGroups,
    receipt,
    appliedGroups: result.applied,
  }, null, 2));
}

function arg(args, name) {
  const hit = args.find((a) => a.startsWith(name + '='));
  if (hit) return hit.slice(name.length + 1);
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1] && !args[i + 1].startsWith('-')) return args[i + 1];
  return null;
}

function usage() {
  console.log(`demigod-funnel — lead funnel SoR helper

Commands:
  status
  normalize
  transition --id=LEAD --to=STATE [--evidence=path] [--note=text] [--actor=name] [--mode=draft-only] [--pair=PAIR]
  approve-drafted --note=text [--actor=human] [--id=a,b] [--dry-run] [--package]
                  # Trust Ladder L1 human-only; email|handle required (not url-only)
  match [--apply] [--force]
  pair-sync [--apply]
  onboard [--apply]
  followup|intro|join|receipt (see above)
  draft --id=LEAD [--mode=draft-only]
  park-no-contact [--actor=agent] [--note=no-contact-email]
                  # drafted/approved/sourced unreachable → policy_hold
  park-no-usable-contact  # drafted/approved url-only (no email|handle) → policy_hold
  release-contactable-holds  # policy_hold + usable contact → drafted
  send-package [--note=…]    # approved + contact → human send board (no send)
  disqualify-junk [--actor=agent] [--note=junk-aggregator-or-fragment]
                  # web-*/AGG SERP noise → disqualified (keeps waas- jobs)
  email-mx [--actor=agent]  # free DNS MX fail → policy_hold (no invent)
  import-events [--dry-run] # merge consented Events Bot leads into DEMIGOD-LEADS
  hygiene                  # scan funnel-drafts/ for copy-policy flags
  receipt --id=LEAD [--to-state=sent|nudged|intro_made] --channel=email --to=addr --message-id=MID
                  # approved→sent · sent→nudged · nudged→nudge-record · mutual_yes→intro_made
  repair-history --id=LEAD [--apply]  # quarantine broken history entries with receipt
  collision-plan [--apply]  # review-only plan; --apply merges same-URL partners (evidence kept)
  join [--apply]
  followup [--id=LEAD] [--days=5]   # drafts only; max 2 nudges then coldEligible
  match [--apply]
  intro [--draft]
  pilot [--apply]   # intro_made → pilot-os add (idempotent via pilotId)
  invoice --id=LEAD --cash=INTEGER [--apply] [--evidence=hire-path] [--pair=PAIR]
                  # hired → invoiced; stub is evidence; never paid
  replies [--apply] [--file=/tmp/demigod-gmail-inbound.json]
                  # Gmail dump → replied/opted_out (never invents From)

Rules:
  • sent / nudged / intro_made need receipt files (SENT-CONFIRMED or Message-ID)
  • receipt from approved|sent|nudged|mutual_yes (pure planReceipt; never invents send)
  • outreach policy fail-closed (opt-outs suppress re-drafts)
  • no auto-send, no board writes
  • invoice needs explicit --cash; paid is human/bank only
  • states: ${STATES.filter((s) => !TERMINAL.has(s)).slice(0, 12).join(' → ')} → …
`);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

const CRM_MUTATING_COMMANDS = new Set([
  'normalize',
  'norm',
  'transition',
  'to',
  'approve-drafted',
  'approve',
  'park-no-contact',
  'park',
  'park-no-usable-contact',
  'park-url-only',
  'hygiene-contact',
  'release-contactable-holds',
  'release-holds',
  'unpark-contact',
  'disqualify-junk',
  'dq-junk',
  'email-mx',
  'mx-hygiene',
  'import-events',
  'events-import',
  'receipt',
  'repair-history',
  'join',
  'match',
  'pair-sync',
  'pairsync',
  'pilot',
  'invoice',
]);

if (isMain) {
  const cmd = process.argv[2] || 'status';
  const rest = process.argv.slice(3);
  (async () => {
    try {
      const execute = () => {
        if (cmd === 'status' || cmd === 'st') {
          if (rest.length) {
            console.error(`unknown option: ${rest[0]}`);
            process.exit(2);
          }
          cmdStatus();
        }
        else if (cmd === 'l1-snapshot') cmdL1Snapshot();
        else if (cmd === 'normalize' || cmd === 'norm') cmdNormalize();
        else if (cmd === 'transition' || cmd === 'to') cmdTransition(rest);
        else if (cmd === 'approve-drafted' || cmd === 'approve') cmdApproveDrafted(rest);
        else if (cmd === 'draft') cmdDraft(rest);
        else if (cmd === 'park-no-contact' || cmd === 'park') cmdParkNoContact(rest);
        else if (
          cmd === 'park-no-usable-contact' ||
          cmd === 'park-url-only' ||
          cmd === 'hygiene-contact'
        )
          cmdParkNoUsableContact(rest);
        else if (
          cmd === 'release-contactable-holds' ||
          cmd === 'release-holds' ||
          cmd === 'unpark-contact'
        )
          cmdReleaseContactableHolds(rest);
        else if (cmd === 'send-package' || cmd === 'send-board' || cmd === 'human-send-package')
          cmdSendPackage(rest);
        else if (cmd === 'disqualify-junk' || cmd === 'dq-junk') cmdDisqualifyJunk(rest);
        else if (cmd === 'email-mx' || cmd === 'mx-hygiene') return cmdEmailMx(rest);
        else if (cmd === 'import-events' || cmd === 'events-import') return cmdImportEvents(rest);
        else if (cmd === 'hygiene') cmdHygiene(rest);
        else if (cmd === 'receipt') cmdReceipt(rest);
        else if (cmd === 'repair-history') cmdRepairHistory(rest);
        else if (cmd === 'collision-plan') {
          const unknown = rest.find((a) => a !== '--apply');
          if (unknown) {
            console.error(`unknown option: ${unknown}`);
            process.exit(2);
          }
          cmdCollisionPlan(rest);
        }
        else if (cmd === 'join') cmdJoin(rest);
        else if (cmd === 'followup' || cmd === 'nudge') cmdFollowup(rest);
        else if (cmd === 'match') cmdMatch(rest);
        else if (cmd === 'pair-sync' || cmd === 'pairsync') cmdPairSync(rest);
        else if (cmd === 'onboard' || cmd === 'onboarding') cmdOnboard(rest);
        else if (cmd === 'intro') cmdIntro(rest);
        else if (cmd === 'pilot') cmdPilot(rest);
        else if (cmd === 'invoice') cmdInvoice(rest);
        else if (cmd === 'replies' || cmd === 'reply-ingest') cmdReplies(rest);
        else if (cmd === 'help' || cmd === '-h' || cmd === '--help') usage();
        else {
          usage();
          process.exit(2);
        }
      };
      const needsLock =
        CRM_MUTATING_COMMANDS.has(cmd) ||
        (cmd === 'collision-plan' && rest.includes('--apply'));
      await (needsLock ? withFileLock(CRM_LOCK, execute) : execute());
    } catch (e) {
      console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
      process.exit(1);
    }
  })();
}
