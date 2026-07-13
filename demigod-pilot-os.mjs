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
  ensureBusy,
  atomicWrite,
  opt,
} from './demigod-agent-tools-lib.mjs';

function multi(args, name) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name && args[i + 1]) out.push(args[++i]);
  }
  return out;
}

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const STORE = path.join(ROOT, 'DEMIGOD-PILOTS.json');
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
    } catch {
      /* */
    }
    console.error(JSON.stringify({ ok: false, error: 'pilots_corrupt', backup: bak, detail: String(e.message || e) }));
    process.exit(1);
  }
}

function save(data) {
  data.at = new Date().toISOString();
  atomicWrite(STORE, JSON.stringify(data, null, 2) + '\n');
  ensureBusy();
  atomicWrite(
    path.join(BUSY, 'pilots-open.json'),
    JSON.stringify(
      {
        at: data.at,
        open: data.pilots.filter((p) => !['hired', 'closed', 'churned'].includes(p.status)),
      },
      null,
      2,
    ) + '\n',
  );
}

function id() {
  return `pilot_${Date.now().toString(36)}_${crypto.randomBytes(2).toString('hex')}`;
}

function boardHonestyOk() {
  try {
    const board = JSON.parse(fs.readFileSync(path.join(ROOT, 'DEMIGOD-BOARD.json'), 'utf8'));
    const realRoles = (board.roles || []).filter((r) => r && r.sample === false);
    const realReceipts = (board.receipts || []).filter((r) => r && r.sample === false);
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
  const pilots =
    cmd === 'open'
      ? data.pilots.filter((p) => !['hired', 'closed', 'churned'].includes(p.status))
      : data.pilots;
  console.log(JSON.stringify({ at: data.at, count: pilots.length, pilots }, null, 2));
  process.exit(0);
}

if (cmd === 'add') {
  const data = load();
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
  data.pilots.unshift(pilot);
  save(data);
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
  const data = load();
  const pilot = data.pilots.find((p) => p.id === pid || p.id.startsWith(pid));
  if (!pilot) {
    console.error(JSON.stringify({ ok: false, error: 'not_found' }));
    process.exit(1);
  }
  pilot.status = status;
  pilot.updatedAt = new Date().toISOString();
  if (status === 'briefed') pilot.ackedAt = pilot.ackedAt || new Date().toISOString();
  if (status === 'intro') pilot.introAt = pilot.introAt || new Date().toISOString();
  const note = opt(args, '--note', '');
  if (note) pilot.notes = note;
  const o90 = opt(args, '--90d', '');
  if (o90) pilot.outcome90d = o90;
  pilot.history = pilot.history || [];
  pilot.history.push({
    at: new Date().toISOString(),
    status,
    by: process.env.USER || 'agent',
    note,
  });
  save(data);
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
