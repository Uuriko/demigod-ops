#!/usr/bin/env node
/**
 * Consensus sprint selftest — pairs + intro gate + audit file presence.
 * Usage: node demigod-sprint-selftest.mjs
 */
// Fail-closed: unknown flags must not vacuous-green the suite (POSIX usage = exit 2).
{
  const argvFlags = process.argv.slice(2).filter((a) => a.startsWith('-'));
  if (argvFlags.length) {
    console.error(
      `usage: node demigod-sprint-selftest.mjs  (no flags; got ${argvFlags.join(' ')})`,
    );
    process.exit(2);
  }
}
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { atomicWrite } from './demigod-agent-tools-lib.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const TEST_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-sprint-selftest-'));
process.env.DEMIGOD_ROOT = TEST_ROOT;
process.env.DEMIGOD_BUSY = path.join(TEST_ROOT, '.dg-busy');
process.on('exit', () => fs.rmSync(TEST_ROOT, { recursive: true, force: true }));

const { reviewPair, proposePair, pairId, getPair } = await import('./demigod-pairs-lib.mjs');
const { buildQueue } = await import('./demigod-match-review.mjs');
const fails = [];
function ok(c, m) {
  if (!c) fails.push(m);
  else console.log('ok', m);
}

ok(pairId('a', 'b') === pairId('b', 'a'), 'pairId commutative');
const nonce = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const p = proposePair({
  roleId: `role-${nonce}-a`,
  candId: `cand-${nonce}-a`,
  score: 0.5,
  reasons: ['selftest'],
  actor: 'selftest',
  sample: true,
});
ok(!!p.pairId, 'propose returns pairId');
ok(p.sample === true, 'selftest pair stays sample-only');
ok(!!getPair(p.pairId), 'getPair after propose');
ok(p.state === 'proposed', 'fresh propose is proposed');

{
  const src = fs.readFileSync(path.join(ROOT, 'demigod-matching-engine.mjs'), 'utf8');
  const start = src.indexOf('function proposeIntro(');
  const end = src.indexOf('function presentMatchCard(');
  // Fail-closed: a -1 marker slices to '' and vacuous-greens the consent check below.
  const found = start >= 0 && end > start;
  ok(found, 'proposeIntro..presentMatchCard markers present in matching engine');
  ok(found && !/consentPair\s*\(/.test(src.slice(start, end)), 'intro proposal never manufactures consent');
}

let gateHit = false;
try {
  execFileSync('node', [path.join(ROOT, 'demigod-intro-draft.mjs'), p.pairId, '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (e) {
  const err = String(e.stderr || e.stdout || e.message || '');
  gateHit = err.includes('intro_gate') || e.status === 2;
}
ok(gateHit, 'intro gate blocks proposed');

let sampleApprovalRefused = false;
try {
  reviewPair(p.pairId, { decision: 'approve', actor: 'selftest' });
} catch (error) {
  sampleApprovalRefused = error.message === 'sample_pair_not_eligible';
}
ok(sampleApprovalRefused && getPair(p.pairId).state === 'proposed', 'sample approval refuses without mutation');

const forcedSampleDraft = execFileSync(
  'node',
  [path.join(ROOT, 'demigod-intro-draft.mjs'), p.pairId, '--json', '--force'],
  { encoding: 'utf8' },
);
const forcedSampleResult = JSON.parse(forcedSampleDraft);
ok(
  forcedSampleResult.ok === true &&
    forcedSampleResult.sample === true &&
    /\bSAMPLE\b/.test(fs.readFileSync(forcedSampleResult.path, 'utf8')),
  'forced sample intro is visibly SAMPLE',
);

const q = buildQueue({ includeSample: true });
ok(q.pairs.length >= 1, 'queue non-empty');
ok(fs.existsSync(path.join(ROOT, 'DEMIGOD-BOARD-AUDIT.jsonl')), 'audit jsonl exists');

// reject path — unique ids so re-runs never collide
const p2 = proposePair({
  roleId: `role-${nonce}-b`,
  candId: `cand-${nonce}-b`,
  score: 0.1,
  actor: 'selftest',
  sample: true,
});
const rej = reviewPair(p2.pairId, { decision: 'reject', actor: 'selftest' });
ok(rej.state === 'rejected', 'review reject');
let gate2 = false;
try {
  execFileSync('node', [path.join(ROOT, 'demigod-intro-draft.mjs'), p2.pairId, '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (e) {
  gate2 = e.status === 2 || String(e.stderr || '').includes('intro_gate');
}
ok(gate2, 'intro gate blocks rejected');

// consent → mutual_yes path
const p3 = proposePair({
  roleId: `role-${nonce}-c`,
  candId: `cand-${nonce}-c`,
  score: 0.9,
  actor: 'selftest',
  sample: true,
});
const { consentPair } = await import('./demigod-pairs-lib.mjs');
const beforeUnsupported = JSON.stringify(getPair(p3.pairId));
let unsupportedRefused = false;
try {
  consentPair(p3.pairId, { side: 'founder', actor: 'selftest' });
} catch (error) {
  unsupportedRefused = error.message === 'consent_attestation_required';
}
ok(unsupportedRefused && JSON.stringify(getPair(p3.pairId)) === beforeUnsupported, 'unsupported consent refuses without mutation');
for (const evidence of ['', 'ab', 'two\nlines', 'x'.repeat(501)]) {
  let invalidRefused = false;
  try {
    consentPair(p3.pairId, { side: 'founder', actor: 'selftest', attested: true, evidence });
  } catch (error) {
    invalidRefused = error.message === 'consent_evidence_invalid';
  }
  ok(invalidRefused && JSON.stringify(getPair(p3.pairId)) === beforeUnsupported, 'invalid consent evidence refuses without mutation');
}
const sampleStore = JSON.parse(fs.readFileSync(path.join(TEST_ROOT, 'DEMIGOD-PAIRS.json'), 'utf8'));
sampleStore.pairs[p3.pairId].state = 'approved';
fs.writeFileSync(path.join(TEST_ROOT, 'DEMIGOD-PAIRS.json'), JSON.stringify(sampleStore));
const beforeSampleConsent = JSON.stringify(getPair(p3.pairId));
let sampleConsentRefused = false;
try {
  consentPair(p3.pairId, {
    side: 'founder',
    actor: 'selftest',
    attested: true,
    evidence: 'fixture founder reply',
  });
} catch (error) {
  sampleConsentRefused = error.message === 'sample_pair_not_eligible';
}
ok(
  sampleConsentRefused && JSON.stringify(getPair(p3.pairId)) === beforeSampleConsent,
  'sample consent refuses without mutation',
);

const privateModeFixture = path.join('/tmp/dg-busy', `atomic-private-${process.pid}.txt`);
fs.writeFileSync(privateModeFixture, 'old', { mode: 0o664 });
fs.chmodSync(privateModeFixture, 0o664);
atomicWrite(privateModeFixture, 'new', { mode: 0o600 });
ok((fs.statSync(privateModeFixture).mode & 0o777) === 0o600, 'atomicWrite exact private mode tightens existing file');
fs.chmodSync(privateModeFixture, 0o754);
atomicWrite(privateModeFixture, 'default');
ok((fs.statSync(privateModeFixture).mode & 0o777) === 0o754, 'atomicWrite default still preserves existing mode');
fs.unlinkSync(privateModeFixture);

const cliRoot = fs.mkdtempSync('/tmp/dg-pairs-cli-');
const legacyCliPath = path.join(cliRoot, 'DEMIGOD-PAIRS.json');
fs.writeFileSync(legacyCliPath, JSON.stringify({ pairs: {
  paircli: { pairId: 'paircli', roleId: 'role', candId: 'candidate', state: 'approved', sample: false, mutual: {}, history: [] },
} }));
const legacyCliBefore = fs.readFileSync(legacyCliPath, 'utf8');
let legacyCliRefused = false;
try {
  execFileSync('node', [
  path.join(ROOT, 'demigod-pairs-lib.mjs'), 'consent', 'paircli', '--side', 'candidate',
  '--i-observed-consent', '--evidence', 'CLI fixture reply',
  ], { encoding: 'utf8', env: { ...process.env, DEMIGOD_ROOT: cliRoot } });
} catch (error) {
  legacyCliRefused = String(error.stderr || '').includes('real_pair_id_invalid');
}
ok(
  legacyCliRefused && fs.readFileSync(legacyCliPath, 'utf8') === legacyCliBefore,
  'legacy forged CLI consent refuses without mutation',
);
fs.rmSync(cliRoot, { recursive: true, force: true });

const dashboardServer = fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard.mjs'), 'utf8');
const dashboardUi = fs.readFileSync(path.join(ROOT, 'demigod-agent-dashboard-ui.html'), 'utf8');
ok(/attested:\s*body\.attested === true[\s\S]*evidence:\s*body\.evidence/.test(dashboardServer), 'dashboard API forwards explicit consent evidence');
ok(/window\.prompt\(['"]Evidence that[\s\S]*attested:true,evidence/.test(dashboardUi), 'dashboard UI collects and attests consent evidence');

// real-roles env gate: opts alone insufficient
{
  const { saveBoard, loadBoard } = await import('./demigod-submissions-lib.mjs');
  const board = loadBoard();
  const prevEnv = process.env.DEMIGOD_ALLOW_REAL_ROLES;
  delete process.env.DEMIGOD_ALLOW_REAL_ROLES;
  let refused = false;
  try {
    const poisoned = JSON.parse(JSON.stringify(board));
    poisoned.roles = [
      ...(poisoned.roles || []).slice(0, 1),
      {
        id: `role-real-${nonce}`,
        title: 'Real Role',
        sample: false,
        stageType: 'Seed',
        skills: 'x',
      },
    ].slice(0, 3);
    saveBoard(poisoned, {
      reason: 'selftest-real-refuse',
      actor: 'selftest',
      allowRealRoles: true, // opts alone must NOT bypass without env
    });
  } catch (e) {
    refused = e.code === 'REAL_ROLES_REFUSED' || /REAL_ROLES|board_write_refused/.test(String(e.message));
  }
  ok(refused, 'real roles refused without DEMIGOD_ALLOW_REAL_ROLES');
  if (prevEnv != null) process.env.DEMIGOD_ALLOW_REAL_ROLES = prevEnv;
  else delete process.env.DEMIGOD_ALLOW_REAL_ROLES;
}

// mint force needs env
{
  const { mintBoardEntry } = await import('./demigod-submissions-lib.mjs');
  delete process.env.DEMIGOD_MINT_FORCE;
  let mintRefused = false;
  try {
    mintBoardEntry({ id: 'x', status: 'new', form: 'startup', raw: {} }, { force: true, actor: 'selftest' });
  } catch (e) {
    mintRefused = e.code === 'NOT_REVIEWED' || /mint_refused|DEMIGOD_MINT_FORCE/.test(String(e.message));
  }
  ok(mintRefused, 'mint force blocked without DEMIGOD_MINT_FORCE');
}

ok(fs.existsSync(path.join(ROOT, 'bin/dg-matches')), 'bin/dg-matches exists');

if (fails.length) {
  console.error('FAIL', fails);
  process.exit(1);
}
console.log('ALL PASS', buildQueue({}).summary);
