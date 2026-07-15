#!/usr/bin/env node
/**
 * demigod-demand — GTM / demand ops surface (read-first, never auto-sends)
 *
 *   bin/dg demand status|queue|log|templates|draft|help
 *   bin/dg demand draft --name=T0 [--json]
 *   bin/dg demand log --note "…"     # append human note only (not a pilot claim)
 *
 * Honesty: never invents pilots, never claims DMs sent without SENT-CONFIRMED.
 * Only SENT-CONFIRMED (attested) counts; SENT-UNATTESTED does not.
 * Human owns real DMs. Agents orient + prepare only. Auto-DM banned.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';
import { beginRun, sealRun } from './demigod-evidence.mjs';
import { writeJsonAuto } from './demigod-perf-cache.mjs';

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
  // Only SENT-CONFIRMED counts as sent (not SENT-UNATTESTED)
  const confirmed = lines.filter((l) => /\bSENT-CONFIRMED\b/i.test(l) && !/SENT-UNATTESTED/i.test(l));
  const unattested = lines.filter((l) => /SENT-UNATTESTED/i.test(l));
  const handles = new Set();
  for (const l of confirmed) {
    const m = l.match(/@[\w_]+/);
    if (m) handles.add(m[0].toLowerCase());
  }
  const logPath = process.env.DEMIGOD_DM_LOG || path.join(OUTREACH, 'dm-send-log.txt');
  return {
    lines: confirmed,
    count: confirmed.length,
    unattestedCount: unattested.length,
    unattestedLines: unattested.slice(-5),
    handles,
    path: logPath,
  };
}

function sendLogPath() {
  return process.env.DEMIGOD_DM_LOG || path.join(OUTREACH, 'dm-send-log.txt');
}

function pilotLogPath() {
  return process.env.DEMIGOD_PILOT_LOG || path.join(OPS, 'PILOT-LOG.md');
}

function queuePath() {
  return process.env.DEMIGOD_QUEUE_MD || path.join(OPS, 'SEND-QUEUE-PRIORITIZED.md');
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
  const queueMd = read(queuePath());
  const pilotMd = read(pilotLogPath());
  const sendLog = parseSendLog(read(sendLogPath()));
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
    ? `Human DM next: ${top3.map((t) => `${t.name} ${t.handle}`).join(' → ')} then mark-sent --i-sent-it`
    : sendLog.count
      ? 'Queue handles all marked SENT-CONFIRMED — refresh queue or await replies'
      : 'No queue rows parsed — check demigod-ops/SEND-QUEUE-PRIORITIZED.md';

  // Progress: only attested SENT; queue names never invented from ghost log handles
  const ghostHandles = [...sendLog.handles].filter(
    (h) => !queue.some((q) => (q.handle || '').toLowerCase() === h),
  );

  return {
    schema: 'demigod.demand/1',
    at: new Date().toISOString(),
    honesty: {
      agentNeverAutoSends: true,
      inventsPilots: false,
      claims: 'Only SENT-CONFIRMED (attested) counts as sent; empty pilot table rows are not pilots; warm inbound ≠ pilot',
      markSentRequiresAttestation: true,
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
      ghostHandlesOutsideQueue: ghostHandles,
    },
    dms: {
      sentConfirmed: sendLog.count,
      sentUnattested: sendLog.unattestedCount || 0,
      logPath: sendLog.path,
      recent: sendLog.lines.slice(-5),
      recentUnattested: sendLog.unattestedLines || [],
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
      draft: 'bin/dg demand draft --name=NAME',
      markSent: 'node demigod-dm-mark-sent.mjs --name=NAME --i-sent-it',
      pilotReport: 'node demigod-pilot-logger.mjs --report',
      pack: 'demigod-outreach/SEND-PACK-TOP3.md',
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
  const queueMd = read(queuePath());
  const queue = parseQueue(queueMd);
  const sendLog = parseSendLog(read(sendLogPath()));
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

/** Human copy-paste pack — never sends. */
function cmdDraft() {
  const nameIdx = args.findIndex((a) => a === '--name' || a.startsWith('--name='));
  let name = '';
  if (nameIdx >= 0) {
    const a = args[nameIdx];
    name = a.startsWith('--name=') ? a.slice(7) : args[nameIdx + 1] || '';
  }
  // also allow: demand draft T0
  if (!name) {
    const pos = args.filter((a) => !a.startsWith('-') && a !== 'draft');
    name = pos[0] || '';
  }
  if (!name) {
    console.error('usage: bin/dg demand draft --name=T0  (never sends)');
    return 2;
  }
  const s = buildStatus();
  const queueMd = read(queuePath());
  const queue = parseQueue(queueMd);
  const row =
    queue.find((q) => q.name.toLowerCase() === name.toLowerCase()) ||
    queue.find((q) => (q.handle || '').toLowerCase().includes(name.toLowerCase().replace(/^@/, '')));
  if (!row) {
    console.error(JSON.stringify({ error: 'name_not_in_queue', name, pending: s.queue.pendingNames }));
    return 1;
  }
  const slug = row.name.toLowerCase().replace(/\W+/g, '');
  const readyDir = path.join(OUTREACH, 'ready-emails');
  let readyFile = '';
  let body = '';
  try {
    const candidates = fs.readdirSync(readyDir).filter((f) => f.endsWith('.txt') && f.includes(slug));
    if (candidates[0]) {
      readyFile = path.join(readyDir, candidates[0]);
      body = read(readyFile, 8000);
    }
  } catch {
    /* */
  }
  // fallback: extract from SEND-PACK-TOP3
  if (!body) {
    const pack = read(path.join(OUTREACH, 'SEND-PACK-TOP3.md'), 50000);
    const re = new RegExp(`##\\s*${row.name}[\\s\\S]*?\`\`\`([\\s\\S]*?)\`\`\``, 'i');
    const m = pack.match(re);
    if (m) body = m[1].trim();
  }
  const openUrl = (row.open.match(/https?:\/\/[^\s\])]+/) || [])[0] || '';
  const out = {
    schema: 'demigod.demand.draft/1',
    at: new Date().toISOString(),
    neverSends: true,
    name: row.name,
    handle: row.handle,
    company: row.company,
    open: openUrl || row.open,
    afterSend: `node demigod-dm-mark-sent.mjs --name=${row.name} --i-sent-it`,
    readyFile: readyFile || null,
    body: body || null,
    note: body
      ? 'Copy body → send yourself → mark-sent --i-sent-it. Agents never auto-DM.'
      : 'No ready body found — open SEND-PACK-TOP3.md',
  };
  fs.mkdirSync(BUSY, { recursive: true });
  writeJsonAuto(path.join(BUSY, 'demand-draft.json'), out);
  if (asJson) {
    console.log(JSON.stringify(out, null, process.env.DEMIGOD_JSON_PRETTY === '1' ? 2 : 0));
  } else {
    console.log(`# demand draft · ${out.name} ${out.handle} · NEVER SENDS`);
    console.log(`open:  ${out.open}`);
    console.log(`after: ${out.afterSend}`);
    if (out.readyFile) console.log(`file:  ${out.readyFile}`);
    console.log('--- body ---');
    console.log(out.body || '(empty)');
    console.log('--- end ---');
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
  writeJsonAuto(path.join(BUSY, 'demand-status.json'), s);
  sealRun(run, {
    pass: true,
    summary: `demand pending=${s.queue.pending} sent=${s.dms.sentConfirmed} pilots=${s.pilots.realFilled}`,
    ttlSec: 1800,
  });
  if (asJson) console.log(process.env.DEMIGOD_JSON_PRETTY === '1' ? JSON.stringify(s, null, 2) : JSON.stringify(s));
  else printStatus(s);
  return 0;
}

function help() {
  console.log(`# demigod-demand — GTM ops (never auto-sends)

  bin/dg demand status      # queue + SENT-CONFIRMED + pilots (honest)
  bin/dg demand queue       # full queue with sent flags
  bin/dg demand draft --name=T0   # copy-paste pack (never sends)
  bin/dg demand log         # tails; --note "…" appends human note only
  bin/dg demand templates   # reply/white-glove paths + reply head

Human only: real DMs, mark-sent --i-sent-it, pilot logger with real founders.
`);
}

const map = {
  help,
  status: cmdStatus,
  queue: cmdQueue,
  draft: cmdDraft,
  log: cmdLog,
  templates: cmdTemplates,
};

if (!map[cmd]) {
  console.error('usage: bin/dg demand status|queue|draft|log|templates|help');
  process.exit(2);
}
process.exit(map[cmd]() ?? 0);
