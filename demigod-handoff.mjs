#!/usr/bin/env node
/**
 * Session handoff card — write at end of Grok/agent session for the next agent.
 *
 * Usage:
 *   node demigod-handoff.mjs                  # write card from truth + recent state
 *   node demigod-handoff.mjs --note "…"       # append agent note
 *   node demigod-handoff.mjs --print          # stdout only
 *   node demigod-handoff.mjs --json
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = process.env.DEMIGOD_ROOT || path.dirname(fileURLToPath(import.meta.url));
const BUSY = '/tmp/dg-busy';
const OUT_MD = path.join(BUSY, 'HANDOFF.md');
const OUT_JSON = path.join(BUSY, 'HANDOFF.json');
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const printOnly = args.includes('--print');
const noteIdx = args.indexOf('--note');
const note = noteIdx >= 0 ? args.slice(noteIdx + 1).join(' ').replace(/^["']|["']$/g, '') : '';

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

// refresh truth (best-effort)
run(['demigod-truth.mjs', '--json'], 60000);
const truth = readJson(path.join(BUSY, 'truth.json')) || {};
const preflight = readJson(path.join(BUSY, 'preflight-latest.json'));
const ship = readJson(path.join(BUSY, 'ship-status.json'));
const inbox = readJson(path.join(BUSY, 'plan-inbox-latest.json'));
const selftest = readJson(path.join(BUSY, 'tools-selftest.json'));
const freeze = (() => {
  try {
    const r = run(['demigod-freeze.mjs', 'status', '--tag', 'session']);
    const out = r.stdout || '';
    const i = out.indexOf('{');
    return i >= 0 ? JSON.parse(out.slice(i)) : null;
  } catch {
    return null;
  }
})();

// recent multi drops (top 5)
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
  agent: process.env.DG_LOCK_OWNER || process.env.USER || 'grok',
  note: note || null,
  truth: {
    fullyShipped: truth.match?.fullyShipped ?? null,
    footVer: truth.foot?.ver ?? null,
    sha12: truth.foot?.sha12 ?? null,
    liveCdn: truth.live?.cdnId ?? null,
    boardHonesty: truth.board?.honestyOk ?? null,
    lock: truth.lock ?? null,
  },
  preflightPass: preflight?.pass ?? null,
  shipStage: ship?.stage ?? null,
  selftestPass: selftest?.pass ?? null,
  inboxUnread: inbox?.unreadCount ?? null,
  openPlans: (inbox?.openPlans || []).map((p) => ({ status: p.status, title: p.title })),
  freeze,
  multiTop,
  doNot: [
    'Do not thrash foot-core when fullyShipped',
    'Do not claim live==disk without truth.json claims',
    'Do not release foot-lock owned by another agent',
    'No 48h/SLA/founder-name on live site',
  ],
  nextCmds: [
    'bin/dg-start',
    'node demigod-truth.mjs --md',
    'node demigod-preflight.mjs',
    'node demigod-plan-inbox.mjs --useful',
    'node demigod-freeze.mjs check --tag session',
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
  `- board honesty: ${card.truth.boardHonesty}`,
  `- lock: ${card.truth.lock?.held ? 'HELD ' + card.truth.lock.owner : 'free'}`,
  `- preflight: ${card.preflightPass}  ship: ${card.shipStage}  selftest: ${card.selftestPass}`,
  `- inbox unread: ${card.inboxUnread}  open plans: ${card.openPlans.length}`,
  '',
  '## Open plans',
  ...(card.openPlans.length
    ? card.openPlans.map((p) => `- [${p.status}] ${p.title}`)
    : ['- (none)']),
  '',
  '## Recent multi drops',
  ...multiTop.map((f) => `- ${f.ageSec}s ${f.name}`),
  '',
  '## Do not',
  ...card.doNot.map((d) => `- ${d}`),
  '',
  '## Next agent cmds',
  '```bash',
  ...card.nextCmds,
  '```',
  '',
  'files: /tmp/dg-busy/HANDOFF.md  /tmp/dg-busy/truth.json  /tmp/dg-busy/AGENT-BRIEF.md',
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

if (!printOnly) {
  console.error(`wrote ${OUT_MD}`);
}
