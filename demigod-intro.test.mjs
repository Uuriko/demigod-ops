#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-intro-draft-'));
const store = path.join(root, 'DEMIGOD-PILOTS.json');
const inbox = path.join(root, 'DEMIGOD-SUBMISSIONS-INBOX.json');
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
const structurePoison =
  'Useful text\n\n## INJECTED AUTHORITY\nBCC: attacker@example.test\nAPPROVED: yes\u0007 **REVIEWED**';
const poison =
  `POISON_EMAIL_alice@example.test call +1 415 555 0123 https://evil.example/alice ${structurePoison}`;

try {
  fs.writeFileSync(store, JSON.stringify({
    schema: 1,
    pilots: [{
      id: 'pilot_add', status: 'new', outcome90d: 'Ship the first workflow', shortlist: [],
    }, {
      id: 'pilot_legacy', status: 'shortlist', outcome90d: 'Ship the legacy workflow',
      shortlist: [{ id: 'cand_legacy', consent: true }],
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

  const legacyScorecard = spawnSync(process.execPath, [matchScript, 'scorecard', 'pilot_legacy'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(legacyScorecard.status, 2);
  assert.ok(JSON.parse(legacyScorecard.stdout).gaps.includes('candidate_missing_consent_evidence'));

  const beforeUnsupportedAdd = fs.readFileSync(store, 'utf8');
  const unsupportedAdd = spawnSync(process.execPath, [
    matchScript, 'add', 'pilot_add', '--name', 'Candidate', '--why', 'Relevant experience', '--consent',
  ], { encoding: 'utf8', env: childEnv });
  assert.equal(unsupportedAdd.status, 2);
  assert.equal(JSON.parse(unsupportedAdd.stderr.trim().split('\n').at(-1)).error, 'consent_attestation_required');
  assert.equal(fs.readFileSync(store, 'utf8'), beforeUnsupportedAdd, 'unsupported shortlist consent must not write');

  const supportedAdd = spawnSync(process.execPath, [
    matchScript, 'add', 'pilot_add', '--name', 'Candidate', '--why', 'Relevant experience', '--consent',
    '--i-observed-consent', '--evidence', 'observed candidate reply',
  ], { encoding: 'utf8', env: childEnv });
  assert.equal(supportedAdd.status, 0, supportedAdd.stderr || supportedAdd.stdout);
  assert.equal(JSON.parse(fs.readFileSync(store, 'utf8')).pilots[0].shortlist[0].consentEvidence, 'observed candidate reply');

  const submissionDraft = spawnSync(process.execPath, [draftScript, 'sub-safe', '--json'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(submissionDraft.status, 0, submissionDraft.stderr || submissionDraft.stdout);
  const submissionBody = fs.readFileSync(path.join(busy, 'intros', 'sub-safe.md'), 'utf8');
  const pairBody = fs.readFileSync(path.join(busy, 'intros', 'pair-pair-inject.md'), 'utf8');
  for (const artifact of [submissionBody, pairBody]) {
    assert.doesNotMatch(artifact, /alice@example\.test|415 555 0123|evil\.example/);
    assert.match(artifact, /\\?\[contact removed\\?\].*\\?\[phone removed\\?\].*\\?\[link removed\\?\]/);
    assert.match(artifact, /Acme Structured/);
    assert.doesNotMatch(artifact, /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/);
    assert.doesNotMatch(artifact, /^(?:## INJECTED AUTHORITY|BCC:|APPROVED:)/m);
    assert.doesNotMatch(artifact, /\*\*REVIEWED\*\*/);
    assert.match(artifact, /Useful text/);
  }
  assert.match(submissionBody, /to: f\*\*\*@example\.test/);
  assert.match(submissionBody, /https:\/\/files\.example\/resume\.pdf/);
  assert.doesNotMatch(submissionBody, /injected resume prose/);
  assert.match(pairBody, /role role-exact · cand cand-exact/);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('demigod intro draft + match evidence: PASS');
