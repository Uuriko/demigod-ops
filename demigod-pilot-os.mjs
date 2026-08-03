#!/usr/bin/env node
/**
 * Thin pilot OS — one place for white-glove pilot state (not a product rewrite).
 * Stores DEMIGOD-PILOTS.json; never mints board sample:false without honesty gate.
 *
 * Usage:
 *   node demigod-pilot-os.mjs list
 *   node demigod-pilot-os.mjs open
 *   node demigod-pilot-os.mjs add --company "Acme" --role "Founding eng" --source wiz [--outcome "first result"]
 *   node demigod-pilot-os.mjs add --company "Acme" --role "Founding eng" --source funnel:LEAD --contact founder@acme.com --outcome "first result" --intro-receipt PATH
 *   node demigod-pilot-os.mjs set <id> --status briefed|sourcing|shortlist|intro|hired|closed|churned [--next-update YYYY-MM-DD]
 *   node demigod-pilot-os.mjs show <id>
 *   node demigod-pilot-os.mjs checklist <id>
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  BUSY,
  atomicWrite,
  opt,
  withFileLock,
} from './demigod-agent-tools-lib.mjs';
import { isRealReceipt } from './demigod-submissions-lib.mjs';
import { receiptLooksValid } from './demigod-funnel.mjs';

function multi(args, name) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name && args[i + 1]) out.push(args[++i]);
  }
  return out;
}

const SOURCE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.DEMIGOD_ROOT || SOURCE_ROOT;
const PILOT_BUSY =
  path.resolve(ROOT) === path.resolve(SOURCE_ROOT) ? BUSY : path.join(ROOT, '.dg-busy');
const STORE = path.join(ROOT, 'DEMIGOD-PILOTS.json');
const STORE_LOCK = STORE + '.lock';
const STATUSES = new Set([
  'new',
  'briefed',
  'sourcing',
  'shortlist',
  'intro',
  'hired',
  'closed',
  'churned',
]);
const TERMINAL_STATUSES = new Set(['hired', 'closed', 'churned']);
const EVIDENCE_COMMANDS = {
  shortlist: 'node demigod-match.mjs finalize <pilotId>',
  intro: 'externally observed delivery receipt (no local command yet)',
  hired: 'node demigod-close.mjs hire <pilotId> --start YYYY-MM-DD --comp INTEGER',
};

const args = process.argv.slice(2);
const cmd = args[0] || 'list';

function load() {
  if (!fs.existsSync(STORE)) {
    return { schema: 1, pilots: [], at: new Date().toISOString() };
  }
  try {
    const j = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    if (!j || !Array.isArray(j.pilots)) throw new Error('invalid pilots shape');
    return j;
  } catch (e) {
    const bak = STORE + '.corrupt-' + Date.now();
    try {
      fs.copyFileSync(STORE, bak);
      fs.chmodSync(bak, 0o600);
    } catch {
      /* */
    }
    console.error(JSON.stringify({ ok: false, error: 'pilots_corrupt', backup: bak, detail: String(e.message || e) }));
    process.exit(1);
  }
}

function save(data) {
  data.at = new Date().toISOString();
  atomicWrite(STORE, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  atomicWrite(
    path.join(PILOT_BUSY, 'pilots-open.json'),
    JSON.stringify(
      {
        at: data.at,
        open: data.pilots.filter((p) =>
          p.sample !== true && STATUSES.has(p.status) && !TERMINAL_STATUSES.has(p.status)),
      },
      null,
      2,
    ) + '\n',
    { mode: 0o600 },
  );
}

function update(mutator) {
  return withFileLock(STORE_LOCK, () => {
    const data = load();
    const result = mutator(data);
    save(data);
    return result;
  }, { timeoutMs: 20000, staleMs: 120000 });
}

function id() {
  return `pilot_${Date.now().toString(36)}_${crypto.randomBytes(2).toString('hex')}`;
}

function calendarDate(value) {
  const parsed = new Date(`${value || ''}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(+parsed) && parsed.toISOString().slice(0, 10) === value;
}

function checkpoint(p) {
  if (p.sample === true || !STATUSES.has(p.status) || TERMINAL_STATUSES.has(p.status) || !calendarDate(p.nextUpdateAt)) return null;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  return { nextUpdateAt: p.nextUpdateAt, state: p.nextUpdateAt < today ? 'overdue' : p.nextUpdateAt === today ? 'due_today' : 'scheduled' };
}

function boardHonestyOk() {
  try {
    const board = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-BOARD.json'), 'utf8'));
    const realRoles = (board.roles || []).filter((r) => r && r.sample === false);
    // isRealReceipt (status==='delivered'), NOT sample===false: mintReceipt sets no sample field,
    // so a real delivered receipt (sample:undefined) would slip a ===false check and this honesty
    // assertion would undercount to 0 (false-green no_board_lie). Same canonical predicate as the
    // write-guard + computeSignal (#33/#439). Roles keep ===false — no role path leaves sample unset (#32/c444).
    const realReceipts = (board.receipts || []).filter(isRealReceipt);
    return { ok: realRoles.length === 0 && realReceipts.length === 0, realRoles: realRoles.length, realReceipts: realReceipts.length };
  } catch {
    return { ok: false, realRoles: null, realReceipts: null };
  }
}

function validateIntroReceipt(source, rawPath) {
  const leadId = String(source || '').startsWith('funnel:') ? String(source).slice(7) : '';
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(leadId)) {
    return { ok: false, detail: 'intro receipt requires source funnel:LEAD' };
  }
  const receiptPath = path.resolve(String(rawPath || ''));
  const expected = path.join(ROOT, 'demigod-outreach', 'funnel-receipts', `${leadId}-intro_made.txt`);
  if (receiptPath !== expected) return { ok: false, detail: 'intro receipt path is not bound to source lead' };
  let text = '';
  try { text = fs.readFileSync(receiptPath, 'utf8'); } catch { return { ok: false, detail: 'intro receipt missing' }; }
  const field = (name) => (text.match(new RegExp(`^${name}:\\s*(.+)$`, 'mi'))?.[1] || '').trim();
  const at = field('at');
  const pairId = field('pairId');
  const roleId = field('roleId');
  const candId = field('candId');
  const nextUpdateAt = field('nextUpdateAt');
  if (!receiptLooksValid(text) || field('kind') !== 'intro_made' || !pairId || !roleId || !candId || roleId === candId ||
      !Number.isFinite(Date.parse(at)) || new Date(at).toISOString() !== at || !calendarDate(nextUpdateAt) || nextUpdateAt < at.slice(0, 10)) {
    return { ok: false, detail: 'intro receipt content is incomplete or invalid' };
  }
  return { ok: true, path: receiptPath, at, pairId, nextUpdateAt };
}

function checklist(p) {
  const bh = boardHonestyOk();
  // no_board_lie: pilot must not claim boardMinted, AND global board has no unallowed real mints
  const noBoardLie = p.boardMinted !== true && bh.ok !== false;
  return {
    pilotId: p.id,
    items: [
      { id: 'ack', done: Boolean(p.ackedAt), text: 'Personal ack sent (no SLA)' },
      { id: '90d', done: Boolean(p.outcome90d), text: 'Concrete first result captured' },
      { id: 'musts', done: Boolean(p.mustHaves?.length), text: 'Must-haves vs preferences split' },
      { id: 'authority', done: Boolean(p.hiringAuthority), text: 'Hiring authority confirmed' },
      { id: 'scorecard', done: Boolean(p.scorecard), text: 'Written scorecard / search thesis' },
      { id: 'shortlist', done: (p.shortlist || []).length >= 1, text: '2–3 defensible matches max' },
      { id: 'consent', done: Boolean(p.candidateConsent), text: 'Candidate consent before share' },
      { id: 'intro', done: Boolean(p.introAt) || p.status === 'intro' || p.status === 'hired', text: 'Mutual yes + intro logged' },
      { id: 'fee', done: Boolean(p.feeTermsSent) || p.status === 'hired', text: '10% on-hire terms clear' },
      {
        id: 'no_board_lie',
        done: noBoardLie,
        text: 'No fake board mint (pilot flag + board realRoles=0)',
        detail: bh,
      },
    ],
  };
}

if (cmd === 'list' || cmd === 'open') {
  const data = load();
  const selected =
    cmd === 'open'
      ? data.pilots.filter((p) =>
        p.sample !== true && STATUSES.has(p.status) && !TERMINAL_STATUSES.has(p.status))
      : data.pilots;
  const pilots = selected.map((p) => ({ ...p, checkpoint: checkpoint(p) }));
  console.log(JSON.stringify({
    at: data.at,
    count: pilots.length,
    checkpoints: {
      overdue: pilots.filter((p) => p.checkpoint?.state === 'overdue').length,
      dueToday: pilots.filter((p) => p.checkpoint?.state === 'due_today').length,
    },
    pilots,
  }, null, 2));
  process.exit(0);
}

if (cmd === 'add') {
  const company = opt(args, '--company', '');
  const role = opt(args, '--role', '');
  const source = opt(args, '--source', 'manual');
  const contact = opt(args, '--contact', '');
  const outcome90d = opt(args, '--outcome', '') || opt(args, '--90d', '');
  const introReceiptPath = opt(args, '--intro-receipt', '');
  const force = args.includes('--force-test');
  // honesty gate — refuse audit/test/sim pollution
  const badSource = /^(audit|test|sim|smoke|selftest)$/i.test(source);
  if (badSource && !force) {
    console.error(
      JSON.stringify({
        ok: false,
        error: 'pilot_honesty',
        detail: 'source audit/test/sim blocked; use --force-test only in selftest',
      }),
    );
    process.exit(1);
  }
  if (!force && (!company.trim() || !role.trim())) {
    console.error(JSON.stringify({ ok: false, error: 'pilot_honesty', detail: 'company and role required' }));
    process.exit(1);
  }
  const intro = introReceiptPath || source.startsWith('funnel:')
    ? validateIntroReceipt(source, introReceiptPath)
    : null;
  if (intro && !intro.ok) {
    console.error(JSON.stringify({ ok: false, error: 'intro_receipt_invalid', detail: intro.detail }));
    process.exit(1);
  }
  if (intro && (!outcome90d.trim() || !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) || /^@[A-Za-z0-9_]{1,32}$/.test(contact)))) {
    console.error(JSON.stringify({ ok: false, error: 'intro_identity_incomplete', detail: 'receipt-backed intro requires replyable contact and first result' }));
    process.exit(1);
  }
  const status = intro ? 'intro' : 'new';
  const pilot = {
    id: id(),
    at: new Date().toISOString(),
    status,
    company,
    role,
    source,
    contact,
    ...(intro ? { pairId: intro.pairId, introAt: intro.at, introReceipt: intro.path, nextUpdateAt: intro.nextUpdateAt } : {}),
    outcome90d,
    mustHaves: multi(args, '--must'),
    hiringAuthority: opt(args, '--authority', ''),
    scorecard: opt(args, '--scorecard', ''),
    shortlist: [],
    notes: opt(args, '--note', ''),
    sample: force || badSource,
    history: [{ at: intro?.at || new Date().toISOString(), status, by: process.env.USER || 'agent', ...(intro ? { evidence: intro.path, pairId: intro.pairId, nextUpdateAt: intro.nextUpdateAt } : {}) }],
  };
  update((data) => data.pilots.unshift(pilot));
  console.log(JSON.stringify({ ok: true, pilot, checklist: checklist(pilot) }, null, 2));
  process.exit(0);
}

if (cmd === 'set') {
  const pid = args[1];
  const status = opt(args, '--status');
  const nextUpdateAt = opt(args, '--next-update', '');
  const note = opt(args, '--note', '');
  if (!pid || !status) {
    console.error('usage: set <id> --status briefed|sourcing|shortlist|intro|hired|closed|churned [--next-update YYYY-MM-DD]');
    process.exit(2);
  }
  if (!STATUSES.has(status)) {
    console.error(JSON.stringify({ ok: false, error: 'invalid_status', allowed: [...STATUSES] }));
    process.exit(2);
  }
  if (['closed', 'churned'].includes(status) && !/^(?:candidate|company|mutual|role):\s+\S/i.test(note.trim())) {
    console.error(JSON.stringify({ ok: false, error: 'disposition_reason_required', hint: '--note="candidate|company|mutual|role: reason"' }));
    process.exit(1);
  }
  let pilot;
  try {
    pilot = update((data) => {
      const found = data.pilots.find((p) => p.id === pid || p.id.startsWith(pid));
      if (!found) throw Object.assign(new Error('not_found'), { code: 'not_found' });
      if (EVIDENCE_COMMANDS[status] && !(found.status === status && nextUpdateAt)) {
        throw Object.assign(new Error('evidence_required'), { code: 'evidence_required' });
      }
      if (nextUpdateAt && !calendarDate(nextUpdateAt)) {
        throw Object.assign(new Error('invalid_next_update'), { code: 'invalid_next_update' });
      }
      found.status = status;
      found.updatedAt = new Date().toISOString();
      if (status === 'briefed') found.ackedAt = found.ackedAt || new Date().toISOString();
      if (status === 'intro') found.introAt = found.introAt || new Date().toISOString();
      if (note) found.notes = note;
      if (nextUpdateAt) found.nextUpdateAt = nextUpdateAt;
      const o90 = opt(args, '--outcome', '') || opt(args, '--90d', '');
      if (o90) found.outcome90d = o90;
      found.history = found.history || [];
      found.history.push({
        at: new Date().toISOString(),
        status,
        by: process.env.USER || 'agent',
        note,
        ...(nextUpdateAt ? { nextUpdateAt } : {}),
      });
      return found;
    });
  } catch (error) {
    if (!['not_found', 'evidence_required', 'invalid_next_update'].includes(error.code)) throw error;
    console.error(JSON.stringify({ ok: false, error: error.code, use: EVIDENCE_COMMANDS[status] }));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, pilot, checklist: checklist(pilot) }, null, 2));
  process.exit(0);
}

if (cmd === 'show' || cmd === 'checklist') {
  const pid = args[1];
  const data = load();
  const pilot = data.pilots.find((p) => p.id === pid || (pid && p.id.startsWith(pid)));
  if (!pilot) {
    console.error(JSON.stringify({ ok: false, error: 'not_found' }));
    process.exit(1);
  }
  if (cmd === 'checklist') {
    console.log(JSON.stringify(checklist(pilot), null, 2));
  } else {
    console.log(JSON.stringify({ pilot: { ...pilot, checkpoint: checkpoint(pilot) }, checklist: checklist(pilot) }, null, 2));
  }
  process.exit(0);
}

console.error('usage: list | open | add | set | show | checklist');
process.exit(2);
