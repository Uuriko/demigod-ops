#!/usr/bin/env node
/**
 * demigod-demand — GTM / demand ops surface (read-first, never auto-sends)
 *
 *   bin/dg demand status|queue|log|templates|help
 *   bin/dg demand log --note "…"     # append human note only (not a pilot claim)
 *
 * Honesty: never invents pilots, never claims DMs sent without SENT-CONFIRMED.
 * Human owns real DMs. Agents orient + prepare only.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';
import { beginRun, sealRun } from './demigod-evidence.mjs';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const OPS = path.join(ROOT, 'demigod-ops');
const OUTREACH = path.join(ROOT, 'demigod-outreach');
const args = process.argv.slice(2);
const cmd = args.find((a) => !a.startsWith('-')) || 'status';
const asJson = args.includes('--json');

function read(p, max = 200_000) {
  try {
    return fs.readFileSync(p, 'utf8').slice(0, max);
  } catch {
    return '';
  }
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function parseQueue(md) {
  const rows = [];
  for (const line of md.split('\n')) {
    if (!line.startsWith('|')) continue;
    if (/^\|\s*-+/.test(line) || /Prio|Name|Handle/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
    if (cells.length < 4) continue;
    const [prio, name, handle, company, why, open, after] = cells;
    if (!name || name === 'Name') continue;
    rows.push({
      prio: prio || 'med',
      name,
      handle: handle || '',
      company: company || '',
      why: why || '',
      open: open || '',
      after: after || '',
    });
  }
  return rows;
}

function parseSendLog(text) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'));
  const confirmed = lines.filter((l) => /SENT-CONFIRMED/i.test(l));
  const handles = new Set();
  for (const l of confirmed) {
    const m = l.match(/@[\w_]+/);
    if (m) handles.add(m[0].toLowerCase());
  }
  return { lines: confirmed, count: confirmed.length, handles, path: path.join(OUTREACH, 'dm-send-log.txt') };
}

/** Parse only the Active pipeline table (not Warm inbound — those are not pilots). */
function parsePilotTable(md) {
  const rows = [];
  const start = md.search(/##\s*Active pipeline/i);
  if (start < 0) return rows;
  const rest = md.slice(start);
  const end = rest.search(/\n##\s+/);
  const section = end > 0 ? rest.slice(0, end) : rest;
  for (const line of section.split('\n')) {
    if (!line.startsWith('|')) continue;
    if (/^\|\s*-+/.test(line) || /Founder|^\|\s*ID\s*\|/i.test(line)) continue;
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((_, i, a) => i > 0 && i < a.length - 1);
    if (cells.length < 4) continue;
    const [id, founder, role, outcome90, status, next, date] = cells;
    if (!id || id === 'ID') continue;
    const empty =
      !founder ||
      founder === '—' ||
      founder === '-' ||
      founder.toLowerCase() === 'n/a' ||
      role === '—';
    rows.push({
      id,
      founder: empty ? null : founder,
      role: role || '',
      outcome90: outcome90 || '',
      status: status || '',
      next: next || '',
      date: date || '',
      empty: Boolean(empty),
    });
  }
  return rows;
}

function parseWarmInbound(md) {
  const rows = [];
  const start = md.search(/##\s*Warm inbound/i);
  if (start < 0) return rows;
  const rest = md.slice(start);
  const end = rest.search(/\n##\s+/);
  const section = end > 0 ? rest.slice(0, end) : rest;
  for (const line of section.split('\n')) {
    if (!line.startsWith('|')) continue;
    if (/^\|\s*-+/.test(line) || /Who|Channel/.test(line)) continue;
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((_, i, a) => i > 0 && i < a.length - 1);
    if (cells.length < 3) continue;
    const [who, channel, status, next, date] = cells;
    if (!who || who === 'Who') continue;
    rows.push({ who, channel: channel || '', status: status || '', next: next || '', date: date || '' });
  }
  return rows;
}

function listTemplates() {
  const files = [
    { id: 'reply', path: path.join(OPS, 'REPLY-TEMPLATES.md'), title: 'Reply templates' },
    { id: 'white-glove', path: path.join(OPS, 'WHITE-GLOVE-ON-REPLY.md'), title: 'White-glove on reply' },
    { id: 'human-24h', path: path.join(OPS, 'HUMAN-NEXT-24H.md'), title: 'Human next 24h' },
  ];
  return files.map((f) => ({
    ...f,
    exists: fs.existsSync(f.path),
    bytes: fs.existsSync(f.path) ? fs.statSync(f.path).size : 0,
  }));
}

function buildStatus() {
  const freeze = freezeStatus();
  const truth = readJson(path.join(BUSY, 'truth.json'));
  const queueMd = read(path.join(OPS, 'SEND-QUEUE-PRIORITIZED.md'));
  const pilotMd = read(path.join(OPS, 'PILOT-LOG.md'));
  const sendLog = parseSendLog(read(path.join(OUTREACH, 'dm-send-log.txt')));
  const queue = parseQueue(queueMd);
  const pilots = parsePilotTable(pilotMd);
  const warmInbound = parseWarmInbound(pilotMd);
  const realPilots = pilots.filter((p) => !p.empty);
  const pending = queue.filter((q) => {
    const h = (q.handle || '').toLowerCase();
    return h && !sendLog.handles.has(h);
  });
  const sentFromQueue = queue.filter((q) => sendLog.handles.has((q.handle || '').toLowerCase()));
  const top3 = pending.slice(0, 3);

  // Board signal if present — do not invent
  let boardPilots = null;
  try {
    const board = readJson(path.join(ROOT, 'demigod-board.json'));
    boardPilots = Array.isArray(board?.pilots) ? board.pilots.length : null;
  } catch {
    boardPilots = null;
  }

  const nextHuman = top3.length
    ? `Human DM next: ${top3.map((t) => `${t.name} ${t.handle}`).join(' → ')} then mark-sent`
    : sendLog.count
      ? 'Queue handles all marked SENT-CONFIRMED — refresh queue or await replies'
      : 'No queue rows parsed — check demigod-ops/SEND-QUEUE-PRIORITIZED.md';

  return {
    schema: 'demigod.demand/1',
    at: new Date().toISOString(),
    honesty: {
      agentNeverAutoSends: true,
      inventsPilots: false,
      claims: 'Only SENT-CONFIRMED counts as sent; empty pilot table rows are not pilots',
    },
    freeze: { on: freeze.frozen, why: freeze.why },
    truth: truth
      ? {
          pass: truth.pass,
          diskVer: truth.foot?.ver,
          liveVer: truth.live?.footVer,
          summary: truth.summaryLine,
        }
      : { pass: null, note: 'run bin/dg truth first' },
    queue: {
      total: queue.length,
      pending: pending.length,
      sentConfirmedInQueue: sentFromQueue.length,
      top3,
      pendingNames: pending.map((p) => p.name),
    },
    dms: {
      sentConfirmed: sendLog.count,
      logPath: sendLog.path,
      recent: sendLog.lines.slice(-5),
    },
    pilots: {
      tableRows: pilots.length,
      realFilled: realPilots.length,
      boardPilots,
      note: realPilots.length === 0 ? 'No real pilots logged yet (honest)' : null,
      recent: realPilots.slice(-3),
    },
    warmInbound: {
      count: warmInbound.length,
      rows: warmInbound,
      note: 'Warm inbound ≠ pilot (not counted as realFilled)',
    },
    templates: listTemplates(),
    next: nextHuman,
    cmds: {
      markSent: 'node demigod-dm-mark-sent.mjs --name=NAME',
      pilotReport: 'node demigod-pilot-logger.mjs --report',
      pack: 'demigod-outreach/SEND-PACK-2026-07-09.md',
      queueFile: 'demigod-ops/SEND-QUEUE-PRIORITIZED.md',
    },
  };
}

function printStatus(s) {
  console.log(`# demand status · freeze=${s.freeze.on ? 'ON' : 'OFF'}`);
  console.log(`  DMs SENT-CONFIRMED: ${s.dms.sentConfirmed}`);
  console.log(`  Queue: ${s.queue.pending} pending / ${s.queue.total} total (${s.queue.sentConfirmedInQueue} confirmed)`);
  console.log(`  Pilots filled: ${s.pilots.realFilled} (board pilots: ${s.pilots.boardPilots ?? '?'})`);
  if (s.pilots.note) console.log(`  ${s.pilots.note}`);
  console.log(`  NEXT: ${s.next}`);
  if (s.queue.top3.length) {
    console.log('  Top pending:');
    for (const t of s.queue.top3) {
      console.log(`    - ${t.prio} ${t.name} ${t.handle} · ${t.company}`);
    }
  }
  console.log(`  report: ${path.join(BUSY, 'demand-status.json')}`);
}

function cmdQueue() {
  const s = buildStatus();
  const freeze = s.freeze;
  const queueMd = read(path.join(OPS, 'SEND-QUEUE-PRIORITIZED.md'));
  const queue = parseQueue(queueMd);
  const sendLog = parseSendLog(read(path.join(OUTREACH, 'dm-send-log.txt')));
  const rows = queue.map((q) => ({
    ...q,
    sentConfirmed: sendLog.handles.has((q.handle || '').toLowerCase()),
  }));
  const out = { at: new Date().toISOString(), freeze, rows, sentConfirmed: sendLog.count };
  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(path.join(BUSY, 'demand-queue.json'), JSON.stringify(out, null, 2) + '\n');
  if (asJson) console.log(JSON.stringify(out, null, 2));
  else {
    console.log(`# demand queue (${rows.length}) · SENT-CONFIRMED total=${sendLog.count}`);
    for (const r of rows) {
      console.log(`  ${r.sentConfirmed ? '✓' : '○'} [${r.prio}] ${r.name} ${r.handle} — ${r.company}`);
    }
  }
  return 0;
}

function cmdTemplates() {
  const t = listTemplates();
  if (asJson) {
    console.log(JSON.stringify({ at: new Date().toISOString(), templates: t }, null, 2));
    return 0;
  }
  console.log('# demand templates (paths only — open to use)');
  for (const f of t) {
    console.log(`  ${f.exists ? '✓' : '✗'} ${f.id}: ${f.path}`);
  }
  console.log('\n--- REPLY-TEMPLATES (head) ---');
  console.log(read(path.join(OPS, 'REPLY-TEMPLATES.md'), 1200));
  return 0;
}

function cmdLog() {
  const noteIdx = args.findIndex((a) => a === '--note' || a.startsWith('--note='));
  let note = '';
  if (noteIdx >= 0) {
    const a = args[noteIdx];
    note = a.startsWith('--note=') ? a.slice(7) : args[noteIdx + 1] || '';
  }
  if (!note) {
    // show pilot log + send log tails
    const s = buildStatus();
    if (asJson) {
      console.log(JSON.stringify({ dms: s.dms, pilots: s.pilots }, null, 2));
    } else {
      console.log('# demand log (read-only tails)');
      console.log(`SENT-CONFIRMED: ${s.dms.sentConfirmed}`);
      for (const l of s.dms.recent) console.log('  ' + l);
      console.log(`Pilots filled: ${s.pilots.realFilled}`);
      console.log('Append note: bin/dg demand log --note "…"');
      console.log('Mark sent:   node demigod-dm-mark-sent.mjs --name=NAME');
      console.log('Pilot:       node demigod-pilot-logger.mjs --founder=… --no-publish');
    }
    return 0;
  }
  // Human note only — not a pilot or DM claim
  const line = {
    at: new Date().toISOString(),
    kind: 'note',
    note: String(note).slice(0, 500),
    by: process.env.USER || 'agent',
  };
  fs.mkdirSync(BUSY, { recursive: true });
  fs.appendFileSync(path.join(BUSY, 'demand-log.jsonl'), JSON.stringify(line) + '\n');
  const pilotPath = path.join(OPS, 'PILOT-LOG.md');
  const stamp = `\n<!-- note ${line.at} ${line.by}: ${line.note.replace(/-->/g, '')} -->\n`;
  fs.appendFileSync(pilotPath, stamp);
  if (asJson) console.log(JSON.stringify(line, null, 2));
  else console.log(`✓ noted (not a pilot/DM claim): ${line.note}`);
  return 0;
}

function cmdStatus() {
  const run = beginRun('demand', { scope: [] });
  const s = buildStatus();
  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(path.join(BUSY, 'demand-status.json'), JSON.stringify(s, null, 2) + '\n');
  sealRun(run, {
    pass: true,
    summary: `demand pending=${s.queue.pending} sent=${s.dms.sentConfirmed} pilots=${s.pilots.realFilled}`,
    ttlSec: 1800,
  });
  if (asJson) console.log(JSON.stringify(s, null, 2));
  else printStatus(s);
  return 0;
}

function help() {
  console.log(`# demigod-demand — GTM ops (never auto-sends)

  bin/dg demand status      # queue + SENT-CONFIRMED + pilots (honest)
  bin/dg demand queue       # full queue with sent flags
  bin/dg demand log         # tails; --note "…" appends human note only
  bin/dg demand templates   # reply/white-glove paths + reply head

Human only: real DMs, mark-sent, pilot logger with real founders.
`);
}

const map = {
  help,
  status: cmdStatus,
  queue: cmdQueue,
  log: cmdLog,
  templates: cmdTemplates,
};

if (!map[cmd]) {
  console.error('usage: bin/dg demand status|queue|log|templates|help');
  process.exit(2);
}
process.exit(map[cmd]() ?? 0);
