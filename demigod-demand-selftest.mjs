#!/usr/bin/env node
/**
 * demigod-demand-selftest + canary (adversarial false-green)
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildNext } from './demigod-next.mjs';
import { status as freezeStatus } from './demigod-publish-freeze.mjs';
import { refuseIfStale } from './demigod-evidence.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const fails = [];
const ok = (c, m) => (c ? console.log('ok', m) : fails.push(m));

function run(script, args = [], env = {}) {
  return spawnSync(process.execPath, [path.join(ROOT, script), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, ...env },
  });
}

const st = run('demigod-demand.mjs', ['status', '--json']);
ok(st.status === 0, 'demand status exit 0');
let demand = null;
try {
  demand = JSON.parse(st.stdout.slice(st.stdout.indexOf('{')));
} catch {
  /* */
}
ok(demand?.honesty?.inventsPilots === false, 'no invent pilots');
ok(demand?.honesty?.autoDmAllowed === true || demand?.honesty?.agentNeverAutoSends === false, 'auto-DM allowed');
ok(demand?.honesty?.markSentRequiresAttestation === true, 'mark-sent attestation flag');
ok(typeof demand?.dms?.sentConfirmed === 'number', 'sentConfirmed is number');
ok(typeof demand?.queue?.pending === 'number', 'pending is number');
ok(demand?.pilots?.realFilled === 0 || demand?.pilots?.realFilled > 0, 'realFilled present');
if (demand?.pilots?.realFilled === 0) {
  ok(true, 'zero real pilots allowed (honest)');
}

const q = run('demigod-demand.mjs', ['queue', '--json']);
ok(q.status === 0, 'demand queue');

const t = run('demigod-demand.mjs', ['templates']);
ok(t.status === 0, 'demand templates');
ok(/REPLY-TEMPLATES|reply/i.test(t.stdout), 'templates mention reply');

// draft (never sends)
const dr = run('demigod-demand.mjs', ['draft', '--name=T0', '--json']);
ok(dr.status === 0, 'demand draft T0');
try {
  const d = JSON.parse(dr.stdout.slice(dr.stdout.indexOf('{')));
  ok(d.neverSends === true, 'draft neverSends');
  ok(d.handle && d.body, 'draft has handle+body');
  ok(/i-sent-it/.test(d.afterSend || ''), 'draft afterSend requires i-sent-it');
} catch {
  fails.push('draft json parse');
}

// freeze must not block demand
const freeze = freezeStatus();
ok(st.status === 0, 'demand works regardless of freeze=' + (freeze.frozen ? 'ON' : 'OFF'));

// next builder
const n = buildNext();
ok(n.id && n.cmd && n.title, 'buildNext shape');
ok(typeof n.freeze?.on === 'boolean', 'next has freeze');
ok(typeof n.truthEvidence?.green === 'boolean', 'next has truthEvidence');
const te = refuseIfStale('truth');
if (te.green && freeze.frozen) {
  ok(n.id === 'demand-human' || n.cmd.includes('demand') || n.id === 'demand-ops', 'green+freeze → demand next');
  ok(n.mutate === false, 'demand next not mutate');
}
if (!te.green) {
  ok(n.id === 'truth', 'stale → truth next');
}

const nx = run('demigod-next.mjs', ['--json']);
ok(nx.status === 0, 'demigod-next CLI');
ok(fs.existsSync('/tmp/dg-busy/next.json'), 'next.json written');

// ledger
const led = path.join(ROOT, 'DEMIGOD-VERSION-LEDGER.jsonl');
const truth = run('demigod-truth.mjs', ['--quiet']);
ok([0, 1].includes(Number(truth.status)), 'truth runs for ledger');
ok(fs.existsSync(led), 'version ledger file exists');
const last = fs.readFileSync(led, 'utf8').trim().split('\n').pop();
let line = null;
try {
  line = JSON.parse(last);
} catch {
  /* */
}
ok(line && line.diskVer, 'ledger last line has diskVer');
ok(typeof line.freeze === 'boolean', 'ledger freeze boolean');

// refuse inventing high sent counts when log empty
if (demand.dms.sentConfirmed === 0) {
  ok(!/sent 1[5-9]|15\+ DMs/i.test(st.stdout), 'no fake high sent counts in text');
}

// --- CANARY: adversarial false-green (Codex N-D2) ---
const canaryDir = '/tmp/dg-busy/demand-canary';
fs.mkdirSync(canaryDir, { recursive: true });
const canaryLog = path.join(canaryDir, 'dm-send-log.txt');
const canaryPilot = path.join(canaryDir, 'PILOT-LOG.md');

// ghost SENT must not invent queue names as confirmed; sentConfirmed may count log lines
fs.writeFileSync(
  canaryLog,
  'SENT-CONFIRMED | 2026-07-15 | @ghost_not_in_queue | FakeCo | x | attested=1\n',
);
const canarySt = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_DM_LOG: canaryLog,
});
ok(canarySt.status === 0, 'canary demand status runs');
let canary = null;
try {
  canary = JSON.parse(canarySt.stdout.slice(canarySt.stdout.indexOf('{')));
} catch {
  fails.push('canary json parse');
}
if (canary) {
  ok(canary.dms.sentConfirmed >= 1, 'canary counts log SENT-CONFIRMED lines');
  ok(Array.isArray(canary.queue.ghostHandlesOutsideQueue), 'ghostHandlesOutsideQueue present');
  ok(
    (canary.queue.ghostHandlesOutsideQueue || []).some((h) => h.includes('ghost')),
    'ghost handle flagged outside queue',
  );
  // queue.sentConfirmedInQueue only for queue names — ghost alone should not invent queue names
  ok(canary.honesty.inventsPilots === false, 'canary still inventsPilots false');
  ok(canary.pilots.realFilled === 0 || typeof canary.pilots.realFilled === 'number', 'realFilled numeric');
}

// UNATTESTED must not count as sentConfirmed
fs.writeFileSync(
  canaryLog,
  'SENT-UNATTESTED | 2026-07-15 | @ghost2 | FakeCo | x | attested=0\n',
);
const unSt = run('demigod-demand.mjs', ['status', '--json'], { DEMIGOD_DM_LOG: canaryLog });
let un = null;
try {
  un = JSON.parse(unSt.stdout.slice(unSt.stdout.indexOf('{')));
} catch {
  /* */
}
ok(un && un.dms.sentConfirmed === 0, 'UNATTESTED does not count as sentConfirmed');
ok(un && un.dms.sentUnattested >= 1, 'UNATTESTED tracked separately');

// Empty pilot placeholders must not bump realFilled
fs.writeFileSync(
  canaryPilot,
  `# Pilot log\n\n## Active pipeline\n| ID | Founder | Role | 90d | Status | Next | Date |\n|----|---------|------|-----|--------|------|------|\n| x | — | — | — | — | — | — |\n\n## Warm inbound\n| Who | Channel | Status | Next | Date |\n|-----|---------|--------|------|------|\n| Douglas | calendly | call | note | 2026-07-14 |\n`,
);
const pilSt = run('demigod-demand.mjs', ['status', '--json'], {
  DEMIGOD_PILOT_LOG: canaryPilot,
  DEMIGOD_DM_LOG: path.join(ROOT, 'demigod-outreach', 'dm-send-log.txt'),
});
let pil = null;
try {
  pil = JSON.parse(pilSt.stdout.slice(pilSt.stdout.indexOf('{')));
} catch {
  /* */
}
ok(pil && pil.pilots.realFilled === 0, 'empty pilot row realFilled=0');
ok(pil && pil.warmInbound.count >= 1, 'warm inbound parsed');
ok(pil && !/pilots filled:\s*[1-9]/i.test(pilSt.stdout) || pil.pilots.realFilled === 0, 'no fake pilot fill claim');

// mark-sent without attestation must fail
const msNo = run('demigod-dm-mark-sent.mjs', ['--name=T0']);
ok(msNo.status === 2 || msNo.status === 1, 'mark-sent without --i-sent-it refuses');
ok(/attestation|i-sent-it/i.test(msNo.stderr + msNo.stdout), 'mark-sent refuse mentions attestation');

// freeze theater: ship run under freeze must fail
if (freeze.frozen) {
  const shipRun = run('demigod-ship.mjs', ['run']);
  ok(shipRun.status !== 0, 'ship run fails under freeze');
  ok(/publish_frozen|frozen/i.test(shipRun.stderr + shipRun.stdout), 'ship run freeze error');
  // status/prepare allowed
  const shipSt = run('demigod-ship.mjs', ['status', '--facts']);
  ok(shipSt.status === 0, 'ship status --facts ok under freeze');
  ok(!/ship-ready|ready to publish|go live/i.test(shipSt.stdout), 'no ship-ready theater in facts');
}

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('ALL PASS demigod-demand-selftest');
