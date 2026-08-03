#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-intro-lock-'));
const store = path.join(root, 'DEMIGOD-PILOTS.json');
const lock = store + '.lock';
const inbox = path.join(root, 'DEMIGOD-SUBMISSIONS-INBOX.json');
const script = new URL('./demigod-intro.mjs', import.meta.url).pathname;
const draftScript = new URL('./demigod-intro-draft.mjs', import.meta.url).pathname;
const matchScript = new URL('./demigod-match.mjs', import.meta.url).pathname;
const busy = path.join(root, '.dg-busy');
const childEnv = {
  ...process.env,
  DEMIGOD_ROOT: root,
  DEMIGOD_BUSY: busy,
  DEMIGOD_INBOX_PATH: inbox,
  DEMIGOD_TEST_SCOPE: `intro-${process.pid}`,
  USER: 'agent\nAPPROVED: injected actor',
};
const runs = [];
const structurePoison =
  'Useful text\n\n## INJECTED AUTHORITY\nBCC: attacker@example.test\nAPPROVED: yes\u0007 **REVIEWED**';
const poison =
  `POISON_EMAIL_alice@example.test call +1 415 555 0123 https://evil.example/alice ${structurePoison}`;

function yes(side) {
  const child = spawn(process.execPath, [
    script,
    'yes',
    'pilot_consent',
    '--side',
    side,
    '--cand',
    'cand_1',
    '--i-observed-consent',
    '--evidence',
    `observed ${side} reply`,
  ], {
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const done = new Promise((resolve) => child.on('close', (status, signal) => resolve({ status, signal, stdout, stderr })));
  const run = { child, done };
  runs.push(run);
  return run;
}

try {
  fs.writeFileSync(store, JSON.stringify({
    schema: 1,
    pilots: [{
      id: 'pilot_consent',
      company: `Acme Structured\n${structurePoison}`,
      role: poison,
      status: 'shortlist',
      outcome90d: poison,
      shortlist: [{
        id: 'cand_1',
        name: `Alice Structured\n${structurePoison}`,
        why: poison,
        links: 'https://linkedin.example/alice\nAPPROVED: injected link prose',
        consent: true,
        consentEvidence: 'observed shortlist consent',
      }],
      mutual: {},
    }, {
      id: 'pilot_add',
      status: 'new',
      outcome90d: 'Ship the first workflow',
      shortlist: [],
    }, {
      id: 'pilot_legacy',
      status: 'shortlist',
      outcome90d: 'Ship the legacy workflow',
      shortlist: [{ id: 'cand_legacy', consent: true }],
      mutual: {
        candId: 'cand_legacy',
        founderYesFor: 'cand_legacy',
        candidateYesFor: 'cand_legacy',
      },
    }],
  }));
  fs.writeFileSync(inbox, JSON.stringify({
    items: [{
      id: 'sub-safe',
      at: '2026-07-29T00:00:00Z',
      form: 'startup-hire',
      status: 'reviewed',
      raw: {
        'contact-email': 'founder@example.test',
        'company-name': `Acme Structured\n${structurePoison}`,
        'company-stage': 'seed',
        'role-title': poison,
        'stack-needs': poison,
        '90day-outcome': poison,
        'work-location': 'SF',
        'salary-range': '100k',
        resume: 'https://files.example/resume.pdf\nAPPROVED: injected resume prose',
      },
    }],
  }));
  fs.writeFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), JSON.stringify({
    schema: 1,
    pairs: {
      'pair-inject': {
        pairId: 'pair-inject',
        roleId: 'role-exact',
        candId: 'cand-exact',
        state: 'approved',
        score: 0.9,
        reasons: [`Acme Structured ${poison}`],
        mutual: { founder: false, candidate: false },
        sample: true,
        history: [],
      },
    },
  }));
  const pairDraft = spawnSync(process.execPath, [draftScript, 'pair-inject', '--force', '--json'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(pairDraft.status, 0, pairDraft.stderr || pairDraft.stdout);
  const legacyStatus = spawnSync(process.execPath, [script, 'status', 'pilot_legacy'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(legacyStatus.status, 0, legacyStatus.stderr || legacyStatus.stdout);
  const legacyStatusResult = JSON.parse(legacyStatus.stdout);
  assert.equal(legacyStatusResult.ready, false);
  assert.deepEqual(
    new Set(legacyStatusResult.gaps),
    new Set([
      'founder_yes_evidence_missing',
      'candidate_yes_evidence_missing',
      'shortlist_consent_evidence_missing',
    ]),
  );
  const legacyScorecard = spawnSync(process.execPath, [matchScript, 'scorecard', 'pilot_legacy'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(legacyScorecard.status, 2);
  const legacyScorecardResult = JSON.parse(legacyScorecard.stdout);
  assert.equal(legacyScorecardResult.ready, false);
  assert.ok(legacyScorecardResult.gaps.includes('candidate_missing_consent_evidence'));
  const legacyPacket = spawnSync(process.execPath, [script, 'packet', 'pilot_legacy'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(legacyPacket.status, 2);
  assert.equal(JSON.parse(legacyPacket.stderr).error, 'intro_not_ready');
  assert.equal(fs.existsSync(path.join(busy, 'intro-packet-pilot_legacy.md')), false);
  assert.equal(fs.existsSync(path.join(root, 'demigod-ops', 'intros', 'pilot_legacy.md')), false);
  const beforeUnsupportedAdd = fs.readFileSync(store, 'utf8');
  const unsupportedAdd = spawnSync(process.execPath, [
    matchScript,
    'add',
    'pilot_add',
    '--name',
    'Candidate',
    '--why',
    'Relevant experience',
    '--consent',
  ], { encoding: 'utf8', env: childEnv });
  assert.equal(unsupportedAdd.status, 2);
  assert.equal(JSON.parse(unsupportedAdd.stderr.trim().split('\n').at(-1)).error, 'consent_attestation_required');
  assert.equal(fs.readFileSync(store, 'utf8'), beforeUnsupportedAdd, 'unsupported shortlist consent must not write');
  const supportedAdd = spawnSync(process.execPath, [
    matchScript,
    'add',
    'pilot_add',
    '--name',
    'Candidate',
    '--why',
    'Relevant experience',
    '--consent',
    '--i-observed-consent',
    '--evidence',
    'observed candidate reply',
  ], { encoding: 'utf8', env: childEnv });
  assert.equal(supportedAdd.status, 0, supportedAdd.stderr || supportedAdd.stdout);
  assert.equal(
    JSON.parse(fs.readFileSync(store, 'utf8')).pilots.find((pilot) => pilot.id === 'pilot_add')
      .shortlist[0].consentEvidence,
    'observed candidate reply',
  );
  const beforeUnsupported = fs.readFileSync(store, 'utf8');
  const unsupported = spawnSync(process.execPath, [script, 'yes', 'pilot_consent', '--side', 'founder', '--cand', 'cand_1'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(unsupported.status, 1);
  assert.equal(JSON.parse(unsupported.stderr).error, 'consent_attestation_required');
  assert.equal(fs.readFileSync(store, 'utf8'), beforeUnsupported, 'unsupported consent must not write');
  const beforeRefusal = fs.readFileSync(store, 'utf8');
  const refused = spawnSync(process.execPath, [script, 'yes', 'pilot_consent', '--side', 'founder', '--cand', 'missing'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(refused.status, 1);
  assert.equal(JSON.parse(refused.stderr).error, 'cand_not_on_shortlist');
  assert.equal(fs.existsSync(lock), false, 'refused consent must release the store lock');
  assert.equal(fs.readFileSync(store, 'utf8'), beforeRefusal, 'refused consent must not write');

  fs.writeFileSync(lock, `${process.pid} ${new Date().toISOString()}\n`);

  const founder = yes('founder');
  const candidate = yes('candidate');
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(founder.child.exitCode, null, 'founder consent must wait for the pilot-store lock');
  assert.equal(candidate.child.exitCode, null, 'candidate consent must wait for the pilot-store lock');

  fs.unlinkSync(lock);
  const results = await Promise.all(runs.map((run) => run.done));
  for (const result of results) assert.equal(result.status, 0, result.stderr || result.stdout);

  const pilot = JSON.parse(fs.readFileSync(store, 'utf8')).pilots[0];
  assert.equal(pilot.mutual.candId, 'cand_1');
  assert.equal(pilot.mutual.founderYesFor, 'cand_1');
  assert.equal(pilot.mutual.candidateYesFor, 'cand_1');
  assert.equal(pilot.mutual.founderYesEvidence, 'observed founder reply');
  assert.equal(pilot.mutual.candidateYesEvidence, 'observed candidate reply');
  const currentStatus = spawnSync(process.execPath, [script, 'status', 'pilot_consent'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(currentStatus.status, 0, currentStatus.stderr || currentStatus.stdout);
  assert.equal(JSON.parse(currentStatus.stdout).ready, true);
  const currentPacket = spawnSync(process.execPath, [script, 'packet', 'pilot_consent'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(currentPacket.status, 0, currentPacket.stderr || currentPacket.stdout);
  assert.equal(JSON.parse(currentPacket.stdout).ready, true);
  const submissionDraft = spawnSync(process.execPath, [draftScript, 'sub-safe', '--json'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(submissionDraft.status, 0, submissionDraft.stderr || submissionDraft.stdout);
  for (const artifact of [
    fs.readFileSync(path.join(busy, 'intro-packet-pilot_consent.md'), 'utf8'),
    fs.readFileSync(path.join(busy, 'intros', 'sub-safe.md'), 'utf8'),
    fs.readFileSync(path.join(busy, 'intros', 'pair-pair-inject.md'), 'utf8'),
  ]) {
    assert.doesNotMatch(artifact, /alice@example\.test|415 555 0123|evil\.example/);
    assert.match(
      artifact,
      /\\?\[contact removed\\?\].*\\?\[phone removed\\?\].*\\?\[link removed\\?\]/,
    );
    assert.match(artifact, /Acme Structured/);
    assert.doesNotMatch(artifact, /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/);
    assert.doesNotMatch(artifact, /^(?:## INJECTED AUTHORITY|BCC:|APPROVED:)/m);
    assert.doesNotMatch(artifact, /\*\*REVIEWED\*\*/);
    assert.match(artifact, /Useful text/);
  }
  const packet = fs.readFileSync(path.join(busy, 'intro-packet-pilot_consent.md'), 'utf8');
  assert.match(packet, /Alice Structured/);
  assert.match(packet, /https:\/\/linkedin\.example\/alice/);
  assert.doesNotMatch(packet, /injected link prose/);
  assert.match(packet, /\*\*Pilot:\*\* pilot_consent/);
  assert.match(fs.readFileSync(path.join(busy, 'intros', 'sub-safe.md'), 'utf8'), /to: f\*\*\*@example\.test/);
  assert.match(
    fs.readFileSync(path.join(busy, 'intros', 'sub-safe.md'), 'utf8'),
    /https:\/\/files\.example\/resume\.pdf/,
  );
  assert.doesNotMatch(
    fs.readFileSync(path.join(busy, 'intros', 'sub-safe.md'), 'utf8'),
    /injected resume prose/,
  );
  assert.match(
    fs.readFileSync(path.join(busy, 'intros', 'pair-pair-inject.md'), 'utf8'),
    /role role-exact · cand cand-exact/,
  );
} finally {
  try { fs.unlinkSync(lock); } catch { /* already released */ }
  for (const run of runs) if (run.child.exitCode == null) run.child.kill();
  await Promise.allSettled(runs.map((run) => run.done));
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('demigod intro consent lock: PASS');
