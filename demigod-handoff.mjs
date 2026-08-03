#!/usr/bin/env node
/**
 * Session handoff — structured wall + full card
 *
 *   node demigod-handoff.mjs --from grok --done "…" --next "…" --blocked "…"
 *   node demigod-handoff.mjs --note "…"
 *   node demigod-handoff.mjs --json | --print
 *   node demigod-handoff.mjs --list
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const OUT_MD = path.join(BUSY, 'HANDOFF.md');
const OUT_JSON = path.join(BUSY, 'HANDOFF.json');
const WALL = path.join(BUSY, 'dashboard-handoff.json');
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const printOnly = args.includes('--print');
const listOnly = args.includes('--list');

function opt(name) {
  const i = args.indexOf(name);
  if (i < 0) return null;
  const v = args[i + 1];
  if (!v || v.startsWith('--')) return '';
  return v;
}
function optRest(name) {
  const i = args.indexOf(name);
  if (i < 0) return null;
  const parts = [];
  for (let j = i + 1; j < args.length; j++) {
    if (args[j].startsWith('--')) break;
    parts.push(args[j]);
  }
  return parts.join(' ').replace(/^["']|["']$/g, '');
}

const from = opt('--from') || process.env.DG_LOCK_OWNER || process.env.USER || 'agent';
const done = optRest('--done');
const next = optRest('--next');
const blocked = optRest('--blocked');
const note = optRest('--note') || '';

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function run(scriptArgs, timeout = 45000) {
  return spawnSync('node', scriptArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function appendWall(entry) {
  fs.mkdirSync(BUSY, { recursive: true });
  let notes = [];
  try {
    notes = (readJson(WALL) || {}).notes || [];
  } catch {
    notes = [];
  }
  notes.unshift(entry);
  notes = notes.slice(0, 50);
  const body = JSON.stringify({ at: entry.at, notes }, null, 2) + '\n';
  const tmp = WALL + `.tmp.${process.pid}`;
  fs.writeFileSync(tmp, body);
  fs.renameSync(tmp, WALL);
  return notes;
}

// Structured quick note (no truth spawn)
if (done != null || next != null || blocked != null || (note && !listOnly)) {
  const text = [
    done != null ? `done: ${done}` : null,
    next != null ? `next: ${next}` : null,
    blocked != null ? `blocked: ${blocked}` : null,
    note || null,
  ]
    .filter(Boolean)
    .join(' · ');
  const entry = {
    id: `h${Date.now().toString(36)}`,
    at: new Date().toISOString(),
    from: String(from).slice(0, 32),
    text: text.slice(0, 2000),
    meta: {
      done: done || null,
      next: next || null,
      blocked: blocked || null,
      structured: true,
    },
  };
  if (!printOnly) appendWall(entry);
  // also light HANDOFF.json update
  const light = {
    at: entry.at,
    agent: entry.from,
    structured: true,
    done: done || null,
    next: next || null,
    blocked: blocked || null,
    note: note || text,
  };
  if (!printOnly) {
    fs.writeFileSync(OUT_JSON, JSON.stringify(light, null, 2) + '\n');
    fs.writeFileSync(
      OUT_MD,
      `# Handoff ${entry.at}\nfrom: ${entry.from}\n${text}\n`,
    );
  }
  if (asJson) console.log(JSON.stringify(entry, null, 2));
  else console.log(`${entry.from}: ${text}`);
  process.exit(0);
}

if (listOnly) {
  const notes = (readJson(WALL) || {}).notes || [];
  const maxAge = 4 * 3600;
  const now = Date.now();
  const annotated = notes.map((n) => {
    const ageSec = n.at ? Math.round((now - Date.parse(n.at)) / 1000) : null;
    return {
      ...n,
      ageSec,
      current: ageSec != null && ageSec <= maxAge,
      staleCurrent: ageSec != null && ageSec > maxAge,
    };
  });
  if (asJson) console.log(JSON.stringify({ notes: annotated, maxAgeSecCurrent: maxAge }, null, 2));
  else {
    for (const n of annotated.slice(0, 15)) {
      console.log(
        `${n.current ? '●' : '○'} ${n.ageSec}s [${n.from}] ${String(n.text || '').slice(0, 100)}`,
      );
    }
  }
  process.exit(0);
}

// Full card (best-effort truth — skip if --fast)
if (!args.includes('--fast')) {
  run(['demigod-truth.mjs', '--json'], 60000);
}
const truth = readJson(path.join(BUSY, 'truth.json')) || {};
const preflight = readJson(path.join(BUSY, 'preflight-latest.json'));
const ship = readJson(path.join(BUSY, 'ship-status.json'));
const inbox = readJson(path.join(BUSY, 'plan-inbox-latest.json'));
const selftest = readJson(path.join(BUSY, 'tools-selftest.json'));
const unify = readJson(path.join(BUSY, 'unify.json'));

let multiTop = [];
try {
  multiTop = fs
    .readdirSync('/tmp/dg-multi')
    .map((name) => {
      const full = path.join('/tmp/dg-multi', name);
      const st = fs.statSync(full);
      return { name, ageSec: Math.round((Date.now() - st.mtimeMs) / 1000), bytes: st.size };
    })
    .filter((f) => f.bytes > 50)
    .sort((a, b) => a.ageSec - b.ageSec)
    .slice(0, 6);
} catch {
  /* */
}

const card = {
  at: new Date().toISOString(),
  agent: from,
  note: note || null,
  truth: {
    fullyShipped: truth.match?.fullyShipped ?? truth.fullyShipped ?? null,
    footVer: truth.foot?.ver ?? null,
    sha12: truth.foot?.sha12 ?? null,
    liveCdn: truth.live?.cdnId ?? truth.live?.footUrl ?? null,
    boardHonesty: truth.board?.honestyOk ?? null,
    lock: truth.lock ?? null,
  },
  nextCanon: unify?.next || null,
  preflightPass: preflight?.pass ?? null,
  shipStage: ship?.stage ?? null,
  selftestPass: selftest?.pass ?? null,
  inboxUnread: inbox?.unreadCount ?? null,
  openPlans: (inbox?.openPlans || []).map((p) => ({ status: p.status, title: p.title })),
  multiTop,
  doNot: [
    'Do not thrash foot-core when fullyShipped',
    'Do not claim live==disk without truth.json claims',
    'Do not release foot-lock owned by another agent',
    'No 48h/SLA/founder-name on live site',
  ],
  nextCmds: [
    'bin/dg unify',
    'bin/dg truth',
    'bin/dg next-canon',
    'bin/dg demand status',
  ],
};

const md = [
  `# Demigod HANDOFF — ${card.at}`,
  `agent: ${card.agent}`,
  card.note ? `note: ${card.note}` : null,
  '',
  '## Truth snapshot',
  `- fullyShipped: ${card.truth.fullyShipped}`,
  `- foot: v${card.truth.footVer} sha=${card.truth.sha12}… live=${card.truth.liveCdn}`,
  `- next: ${card.nextCanon?.title || '—'}`,
  '',
  '## Next cmds',
  '```bash',
  ...card.nextCmds,
  '```',
]
  .filter((l) => l !== null)
  .join('\n');

if (!printOnly) {
  fs.mkdirSync(BUSY, { recursive: true });
  fs.writeFileSync(OUT_MD, md + '\n');
  fs.writeFileSync(OUT_JSON, JSON.stringify(card, null, 2) + '\n');
}

if (asJson) console.log(JSON.stringify(card, null, 2));
else console.log(md);
if (!printOnly) console.error(`wrote ${OUT_MD}`);
