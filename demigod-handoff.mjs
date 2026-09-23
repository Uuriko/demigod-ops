#!/usr/bin/env node
/**
 * Session handoff card for one data root.
 * A named note stays in that root. This command does not publish or send mail.
 *
 * Usage:
 *   node demigod-handoff.mjs --note "Harbor East handoff"
 *   node demigod-handoff.mjs --json --note "…"
 *   node demigod-handoff.mjs --print
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

function scriptDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function dataRoot() {
  return process.env.DEMIGOD_ROOT || scriptDir();
}

function handoffJsonPath() {
  return path.join(dataRoot(), 'DEMIGOD-HANDOFF.json');
}

function handoffMdPath() {
  return path.join(dataRoot(), 'DEMIGOD-HANDOFF.md');
}

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const printOnly = args.includes('--print');
const noteIdx = args.indexOf('--note');
const note = noteIdx >= 0 ? args.slice(noteIdx + 1).join(' ').replace(/^["']|["']$/g, '') : '';

function fail(error) {
  console.error(JSON.stringify({
    ok: false,
    error,
    sent: false,
    liveMail: false,
    livePublish: false,
  }));
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function run(scriptArgs, timeout = 45000) {
  return spawnSync('node', scriptArgs, {
    cwd: scriptDir(),
    encoding: 'utf8',
    timeout,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
}

if (args.includes('--publish')) fail('publish_refused');

run(['demigod-truth.mjs', '--json'], 60000);
const truth = readJson(path.join(dataRoot(), 'DEMIGOD-TRUTH.json')) || {};
const preflight = readJson(path.join(dataRoot(), 'DEMIGOD-PREFLIGHT.json'));
const ship = readJson(path.join(dataRoot(), 'DEMIGOD-SHIP-STATUS.json'));
const inbox = readJson(path.join(dataRoot(), 'DEMIGOD-PLAN-INBOX.json'));
const selftest = readJson(path.join(dataRoot(), 'DEMIGOD-TOOLS-SELFTEST.json'));
const freeze = readJson(path.join(dataRoot(), 'DEMIGOD-FREEZE.json'));

const card = {
  at: new Date().toISOString(),
  agent: process.env.DG_LOCK_OWNER || process.env.USER || 'grok',
  note: note || null,
  path: handoffJsonPath(),
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
  sent: false,
  liveMail: false,
  livePublish: false,
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
  '## Do not',
  ...card.doNot.map((d) => `- ${d}`),
  '',
  '## Next agent cmds',
  '```bash',
  ...card.nextCmds,
  '```',
  '',
  `files: ${handoffMdPath()}  ${handoffJsonPath()}`,
]
  .filter((line) => line !== null)
  .join('\n');

if (!printOnly) {
  fs.mkdirSync(dataRoot(), { recursive: true });
  fs.writeFileSync(handoffMdPath(), md + '\n');
  fs.writeFileSync(handoffJsonPath(), JSON.stringify(card, null, 2) + '\n');
}

if (asJson) console.log(JSON.stringify(card, null, 2));
else console.log(md);

if (!printOnly) {
  console.error(`wrote ${handoffMdPath()}`);
}
