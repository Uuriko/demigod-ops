#!/usr/bin/env node
/**
 * Thin pilot OS — one place for white-glove pilot state (not a product rewrite).
 * Stores DEMIGOD-PILOTS.json; never mints board sample:false without honesty gate.
 *
 * Usage:
 *   node demigod-pilot-os.mjs list
 *   node demigod-pilot-os.mjs open
 *   node demigod-pilot-os.mjs add --company "Acme" --role "Founding eng" --source wiz [--90d "..."]
 *   node demigod-pilot-os.mjs set <id> --status briefed|sourcing|shortlist|intro|hired|closed|churned
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
        open: data.pilots.filter((p) => !['hired', 'closed', 'churned'].includes(p.status)),
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

function checklist(p) {
  const bh = boardHonestyOk();
  // no_board_lie: pilot must not claim boardMinted, AND global board has no unallowed real mints
  const noBoardLie = p.boardMinted !== true && bh.ok !== false;
  return {
    pilotId: p.id,
    items: [
      { id: 'ack', done: Boolean(p.ackedAt), text: 'Personal ack sent (no SLA)' },
      { id: '90d', done: Boolean(p.outcome90d), text: 'Measurable 90-day outcome captured' },
      { id: 'musts', done: Boolean(p.mustHaves?.length), text: 'Must-haves vs preferences split' },
      { id: 'authority', done: Boolean(p.hiringAuthority), text: 'Hiring authority confirmed' },
      { id: 'scorecard', done: Boolean(p.scorecard), text: 'Written scorecard / search thesis' },
      { id: 'shortlist', done: (p.shortlist || []).length >= 1, text: '2–3 defensible matches max' },
      { id: 'consent', done: Boolean(p.candidateConsent), text: 'Candidate consent before share' },
      { id: 'intro', done: Boolean(p.introAt) || p.status === 'intro' || p.status === 'hired', text: 'Mutual yes + intro logged' },
      { id: 'fee', done: Boolean(p.feeTermsSent) || p.status === 'hired', text: '10% base-salary/start terms clear' },
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
  const pilots =
    cmd === 'open'
      ? data.pilots.filter((p) => !['hired', 'closed', 'churned'].includes(p.status))
      : data.pilots;
  console.log(JSON.stringify({ at: data.at, count: pilots.length, pilots }, null, 2));
  process.exit(0);
}

if (cmd === 'add') {
  const company = opt(args, '--company', '');
  const role = opt(args, '--role', '');
  const source = opt(args, '--source', 'manual');
  const contact = opt(args, '--contact', '');
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
  const pilot = {
    id: id(),
    at: new Date().toISOString(),
    status: 'new',
    company,
    role,
    source,
    contact,
    outcome90d: opt(args, '--90d', '') || opt(args, '--outcome', ''),
    mustHaves: multi(args, '--must'),
    hiringAuthority: opt(args, '--authority', ''),
    scorecard: opt(args, '--scorecard', ''),
    shortlist: [],
    notes: opt(args, '--note', ''),
    sample: force || badSource,
    history: [{ at: new Date().toISOString(), status: 'new', by: process.env.USER || 'agent' }],
  };
  update((data) => data.pilots.unshift(pilot));
  console.log(JSON.stringify({ ok: true, pilot, checklist: checklist(pilot) }, null, 2));
  process.exit(0);
}

if (cmd === 'set') {
  const pid = args[1];
  const status = opt(args, '--status');
  if (!pid || !status) {
    console.error('usage: set <id> --status briefed|sourcing|shortlist|intro|hired|closed|churned');
    process.exit(2);
  }
  if (!STATUSES.has(status)) {
    console.error(JSON.stringify({ ok: false, error: 'invalid_status', allowed: [...STATUSES] }));
    process.exit(2);
  }
  let pilot;
  try {
    pilot = update((data) => {
      const found = data.pilots.find((p) => p.id === pid || p.id.startsWith(pid));
      if (!found) throw Object.assign(new Error('not_found'), { code: 'not_found' });
      if (EVIDENCE_COMMANDS[status]) {
        throw Object.assign(new Error('evidence_required'), { code: 'evidence_required' });
      }
      found.status = status;
      found.updatedAt = new Date().toISOString();
      if (status === 'briefed') found.ackedAt = found.ackedAt || new Date().toISOString();
      if (status === 'intro') found.introAt = found.introAt || new Date().toISOString();
      const note = opt(args, '--note', '');
      if (note) found.notes = note;
      const o90 = opt(args, '--90d', '');
      if (o90) found.outcome90d = o90;
      found.history = found.history || [];
      found.history.push({
        at: new Date().toISOString(),
        status,
        by: process.env.USER || 'agent',
        note,
      });
      return found;
    });
  } catch (error) {
    if (!['not_found', 'evidence_required'].includes(error.code)) throw error;
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
    console.log(JSON.stringify({ pilot, checklist: checklist(pilot) }, null, 2));
  }
  process.exit(0);
}

console.error('usage: list | open | add | set | show | checklist');
process.exit(2);
