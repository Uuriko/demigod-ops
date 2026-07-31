#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { candidateProfileReadiness } from './demigod-submissions-lib.mjs';
import { redactItem } from './demigod-submissions-inbox.mjs';
import { decideMatch, isMatchingReadyCandidate, isMatchingReadyRole, isSampleCandidate, isSampleRole, logOutcome, markCandidateOptin, markStartupInterest, matchEvidence, proposeIntro } from './demigod-matching-engine.mjs';

/** Drop ANSI colour codes so assertions test what a command reported, not how it rendered. */
const plainText = (value) => String(value).replace(/\u001B\[[0-9;]*m/g, '');

const sha256 = (file) => fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;

const raw = {
  'full-name': 'Candidate', 'seeker-email': 'candidate@example.com', 'skills-stack': 'Product design',
  experience: 'Shipped onboarding', 'sf-bay': 'yes', availability: 'now',
  'salary-expectation': '$170–190k base', 'work-auth': 'authorized',
  'resume-url': 'https://example.com/resume.pdf',
};
assert.equal(isMatchingReadyCandidate({ form: 'engineer-join', status: 'new', raw }), false);
assert.equal(isMatchingReadyCandidate({ form: 'engineer-join', status: 'reviewed', raw }), true);
for (const compensation of ['market', 'flexible']) {
  assert.equal(
    isMatchingReadyCandidate({
      form: 'engineer-join',
      status: 'reviewed',
      raw: { ...raw, 'salary-expectation': compensation },
    }),
    true,
    `${compensation} remains a valid reviewable compensation constraint`,
  );
}
assert.equal(isMatchingReadyCandidate({ form: 'candidate', status: 'featured', raw }), true);
assert.equal(isMatchingReadyCandidate({ form: 'startup-hire', status: 'reviewed' }), false);
assert.equal(isMatchingReadyCandidate({ form: 'candidate', status: 'reviewed', raw: { ...raw, 'resume-url': '' } }), false);
assert.equal(candidateProfileReadiness({ form: 'candidate', status: 'reviewed', raw: { ...raw, 'resume-url': '' } }).missing.includes('resume'), true);
for (const invalidResume of ['victim@example.com', 'x', 'http://example.com/resume.pdf', 'https://user:secret@example.com/resume.pdf', 'https://example.com/\u0085poison.pdf', 'https://example.com/\u202epoison.pdf']) {
  const readiness = candidateProfileReadiness({
    form: 'candidate',
    status: 'reviewed',
    raw: { ...raw, 'resume-url': invalidResume },
  });
  assert.equal(readiness.matchReady, false, invalidResume);
  assert.equal(readiness.missing.includes('resume'), true, invalidResume);
}
const nativeResumeRaw = { ...raw, resume: 'https://uploads-ssl.webflow.com/private/resume.pdf' };
delete nativeResumeRaw['resume-url'];
assert.equal(isMatchingReadyCandidate({ form: 'candidate', status: 'reviewed', raw: nativeResumeRaw }), true);
assert.equal(isMatchingReadyCandidate({ form: 'candidate', status: 'reviewed', rejectReasons: ['missing_resume'], raw }), false);
const optedOut = { id: 'cand-not-open', form: 'candidate', status: 'reviewed', raw: { ...raw, 'sf-bay': 'no' } };
assert.equal(candidateProfileReadiness(optedOut).preferenceReady, false);
assert.equal(isMatchingReadyCandidate(optedOut), false);
assert.deepEqual(redactItem(optedOut).matchingBlockers, ['sf-bay-not-open']);
for (const key of ['availability', 'salary-expectation', 'work-auth']) {
  const incomplete = { ...raw, [key]: '' };
  assert.equal(isMatchingReadyCandidate({ form: 'candidate', status: 'reviewed', raw: incomplete }), false, key);
  assert.ok(candidateProfileReadiness({ form: 'candidate', status: 'reviewed', raw: incomplete }).missing.includes(key), key);
}
const contactConstraints = candidateProfileReadiness({
  form: 'candidate',
  status: 'reviewed',
  raw: {
    ...raw,
    'sf-bay': 'victim@example.com',
    availability: 'victim@example.com',
    'salary-expectation': 'victim@example.com',
    'work-auth': 'victim@example.com',
  },
});
assert.equal(contactConstraints.matchReady, false);
assert.deepEqual(
  contactConstraints.missing.filter((key) => ['sf-bay', 'availability', 'salary-expectation', 'work-auth'].includes(key)),
  ['sf-bay', 'availability', 'salary-expectation', 'work-auth'],
);
const contactProfile = candidateProfileReadiness({
  form: 'candidate',
  status: 'reviewed',
  raw: {
    ...raw,
    'full-name': 'victim@example.com',
    'seeker-email': 'not-an-email',
    'skills-stack': 'victim@example.com',
    experience: 'victim@example.com',
    'salary-expectation': 'market',
  },
});
assert.equal(contactProfile.matchReady, false);
assert.deepEqual(
  contactProfile.missing.filter((key) => ['full-name', 'seeker-email', 'skills-stack', 'experience'].includes(key)),
  ['full-name', 'seeker-email', 'skills-stack', 'experience'],
);
const controlEmailProfile = candidateProfileReadiness({
  form: 'candidate',
  status: 'reviewed',
  raw: { ...raw, 'seeker-email': 'a\u0000@b.com' },
});
assert.equal(controlEmailProfile.matchReady, false);
assert.equal(controlEmailProfile.missing.includes('seeker-email'), true);

const role = { id: 'role-sample', title: 'Product Manager private.role@example.com', skills: 'B2B SaaS', outcome: 'Ship onboarding', comp: '$180-220k', stageType: 'Seed', status: 'Open', sample: true };
const conflictRaw = {
  ...raw,
  'skills-stack': 'Product Manager, B2B SaaS, onboarding',
  experience: 'Shipped B2B SaaS product onboarding',
  'why-startups': 'I want to ship at a seed startup',
  'salary-expectation': '$250-300k',
};
assert.equal(decideMatch(role, conflictRaw).match, false, 'known disjoint compensation must block a match');
assert.equal(decideMatch(role, { ...conflictRaw, 'salary-expectation': 'negotiable' }).match, true, 'vague compensation stays reviewable');
assert.equal(isMatchingReadyRole(role), true);
for (const key of ['id', 'title', 'skills', 'outcome', 'comp', 'stageType']) assert.equal(isMatchingReadyRole({ ...role, [key]: '' }), false, key);
assert.equal(isMatchingReadyRole({ ...role, status: 'Closed' }), false);
assert.equal(isSampleRole(role), true);
assert.equal(isSampleRole({ ...role, sample: false }), false, 'explicit real board role must remain real without a redundant real:true field');
assert.equal(isSampleRole({ selftest: true }), true, 'selftest role must never mint a real-labeled pair');
assert.equal(isSampleRole({ raw: { sample: true } }), true, 'raw sample role must never mint a real-labeled pair');
assert.equal(isSampleRole({ raw: { selftest: true } }), true, 'raw selftest role must never mint a real-labeled pair');
assert.equal(isSampleCandidate({ selftest: true }), true);
assert.equal(isSampleCandidate({ raw: { sample: true } }), true);
assert.equal(isSampleCandidate({ sample: false, raw: {} }), false);
assert.equal(markStartupInterest('', '').ok, false);
assert.equal(markCandidateOptin('', '').ok, false);
assert.equal(proposeIntro('', '').error, 'role and candidate are required');
assert.equal(logOutcome('', '').ok, false);
assert.ok(matchEvidence(role, { experience: 'Shipped onboarding', why: 'I want this outcome' }).includes('90-day outcome motivation provided'));

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-match-sample-'));
const scope = `match-sample-${process.pid}`;
const testDir = path.join('/tmp/dg-busy/tests', scope);
const busy = path.join(root, 'busy');
const childEnv = {
  ...process.env,
  DEMIGOD_ROOT: root,
  DEMIGOD_TEST_SCOPE: scope,
  DEMIGOD_BUSY: busy,
  DG_BUSY: busy,
};
const sharedAutoReceipt = '/tmp/dg-busy/auto-propose-latest.json';
const sharedAutoReceiptHash = sha256(sharedAutoReceipt);
try {
  fs.mkdirSync(testDir, { recursive: true });
  const matchesPath = path.join(root, 'DEMIGOD-MATCHES.json');
  fs.writeFileSync(matchesPath, '{corrupt exact bytes');
  const corruptMatches = fs.readFileSync(matchesPath, 'utf8');
  const corruptInterest = spawnSync(
    process.execPath,
    [
      new URL('./demigod-matching-engine.mjs', import.meta.url).pathname,
      'startup-interest',
      '--role-id=role-sample',
      '--candidate-id=cand-test',
    ],
    { encoding: 'utf8', env: childEnv },
  );
  assert.notEqual(corruptInterest.status, 0);
  assert.equal(fs.readFileSync(matchesPath, 'utf8'), corruptMatches, 'a corrupt matches store must never be replaced');
  fs.rmSync(matchesPath);
  const analyticsStore = {
    matches: [{ id: 'existing-match' }],
    events: [{ id: 'existing-event' }],
    suggestions: [{ id: 'existing-suggestion' }],
  };
  fs.writeFileSync(matchesPath, JSON.stringify(analyticsStore));
  const compatibleInterest = spawnSync(
    process.execPath,
    [
      new URL('./demigod-matching-engine.mjs', import.meta.url).pathname,
      'startup-interest',
      '--role-id=role-safe',
      '--candidate-id=cand-safe',
    ],
    { encoding: 'utf8', env: childEnv },
  );
  assert.equal(compatibleInterest.status, 0, compatibleInterest.stderr || compatibleInterest.stdout);
  const compatibleStore = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));
  assert.deepEqual(compatibleStore.matches, analyticsStore.matches);
  assert.deepEqual(compatibleStore.events, analyticsStore.events);
  assert.deepEqual(compatibleStore.suggestions, analyticsStore.suggestions);
  assert.equal(compatibleStore.interests['role-safe:cand-safe'].startup, true);
  const compatibleBytes = fs.readFileSync(matchesPath);
  const oversizedInterest = spawnSync(
    process.execPath,
    [
      new URL('./demigod-matching-engine.mjs', import.meta.url).pathname,
      'startup-interest',
      `--role-id=${'x'.repeat(20_000)}`,
      '--candidate-id=cand-safe',
    ],
    { encoding: 'utf8', env: childEnv },
  );
  assert.equal(oversizedInterest.status, 0);
  // util.inspect colorizes when the child believes stdout is a TTY, inserting escape codes
  // between `ok:` and `false`. Matching the raw string therefore fails on correct behaviour
  // depending only on how the suite was invoked — green under `node --test`, red under
  // `node file.test.mjs`, which is exactly how demigod-verify-all.mjs runs it. Assert the
  // reported refusal, not its rendering.
  assert.match(plainText(oversizedInterest.stdout), /ok:\s*false/);
  assert.deepEqual(fs.readFileSync(matchesPath), compatibleBytes, 'oversized interest text must not write');
  const oversizedOutcome = spawnSync(
    process.execPath,
    [
      new URL('./demigod-matching-engine.mjs', import.meta.url).pathname,
      'log-outcome',
      'intro-safe',
      'x'.repeat(20_000),
    ],
    { encoding: 'utf8', env: childEnv },
  );
  assert.equal(oversizedOutcome.status, 0);
  assert.match(plainText(oversizedOutcome.stdout), /ok:\s*false/);
  assert.deepEqual(fs.readFileSync(matchesPath), compatibleBytes, 'oversized outcome text must not write');
  fs.rmSync(matchesPath);
  fs.rmSync(path.join(root, 'DEMIGOD-PAIRS.json'), { force: true });
  fs.writeFileSync(path.join(testDir, 'test-board.json'), JSON.stringify({ roles: [role], candidates: [], receipts: [] }));
  fs.writeFileSync(path.join(testDir, 'test-submissions-inbox.json'), JSON.stringify({ items: [optedOut] }));
  const optedOutRun = spawnSync(process.execPath, [new URL('./demigod-matching-engine.mjs', import.meta.url).pathname, 'suggest', '--role=role-sample', '--propose'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.ifError(optedOutRun.error);
  assert.equal(optedOutRun.status, 0, optedOutRun.stderr || optedOutRun.stdout);
  const optedOutResult = JSON.parse(optedOutRun.stdout);
  assert.deepEqual(optedOutResult.matches, []);
  assert.deepEqual(optedOutResult.proposed, []);
  assert.equal(fs.existsSync(path.join(root, 'DEMIGOD-PAIRS.json')), false);

  fs.writeFileSync(path.join(testDir, 'test-submissions-inbox.json'), JSON.stringify({ items: [{ id: 'cand-test', form: 'engineer-join', status: 'reviewed', raw }] }));
  const run = spawnSync(process.execPath, [new URL('./demigod-matching-engine.mjs', import.meta.url).pathname, 'suggest', '--role=role-sample', '--propose'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.equal(JSON.parse(run.stdout).proposed.length, 1, 'compatible role-centric control must propose');
  let pairs = Object.values(JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8')).pairs || {});
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].sample, true, 'sample role must never mint a real-labeled pair');
  assert.ok(pairs[0].reasons.includes('compensation ranges overlap'));
  assert.ok(pairs[0].reasons.includes('availability: ready now'));

  const candidateRun = spawnSync(process.execPath, [new URL('./demigod-matching-engine.mjs', import.meta.url).pathname, 'propose-for-candidate', 'cand-test', '--threshold=1', '--propose'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(candidateRun.status, 0, candidateRun.stderr || candidateRun.stdout);
  assert.equal(JSON.parse(candidateRun.stdout).proposed.length, 1, 'compatible candidate-centric control must propose');
  pairs = Object.values(JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8')).pairs || {});
  assert.ok(pairs[0].reasons.includes('compensation ranges overlap'));
  assert.ok(pairs[0].reasons.includes('availability: ready now'));

  const autoRun = spawnSync(process.execPath, [new URL('./demigod-auto-propose.mjs', import.meta.url).pathname, '--allow-sample', '--min-score', '0.5', '--json'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(autoRun.status, 0, autoRun.stderr || autoRun.stdout);
  assert.equal(JSON.parse(autoRun.stdout).proposed.length, 1, 'compatible auto-propose control must propose');
  pairs = Object.values(JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8')).pairs || {});
  assert.ok(pairs[0].reasons.includes('compensation ranges overlap'));
  assert.ok(pairs[0].reasons.includes('availability: ready now'));
  assert.doesNotMatch(JSON.stringify(pairs[0].reasons), /private\.role@example\.com/, 'raw role title must not enter proposal reasons');

  fs.writeFileSync(path.join(testDir, 'test-submissions-inbox.json'), JSON.stringify({ items: [{ id: 'cand-comp-conflict', form: 'engineer-join', status: 'reviewed', raw: conflictRaw }] }));
  const conflictSuggest = spawnSync(process.execPath, [new URL('./demigod-matching-engine.mjs', import.meta.url).pathname, 'suggest', '--role=role-sample', '--propose'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(conflictSuggest.status, 0, conflictSuggest.stderr || conflictSuggest.stdout);
  assert.deepEqual(JSON.parse(conflictSuggest.stdout).matches, []);
  assert.deepEqual(JSON.parse(conflictSuggest.stdout).proposed, []);

  const conflictCandidate = spawnSync(process.execPath, [new URL('./demigod-matching-engine.mjs', import.meta.url).pathname, 'propose-for-candidate', 'cand-comp-conflict', '--threshold=0', '--propose'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(conflictCandidate.status, 0, conflictCandidate.stderr || conflictCandidate.stdout);
  assert.deepEqual(JSON.parse(conflictCandidate.stdout).ranked, []);
  assert.deepEqual(JSON.parse(conflictCandidate.stdout).proposed, []);

  const conflictAuto = spawnSync(process.execPath, [new URL('./demigod-auto-propose.mjs', import.meta.url).pathname, '--allow-sample', '--json'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(conflictAuto.status, 0, conflictAuto.stderr || conflictAuto.stdout);
  assert.deepEqual(JSON.parse(conflictAuto.stdout).proposed, []);
  pairs = Object.values(JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8')).pairs || {});
  assert.equal(pairs.some((pair) => pair.candId === 'cand-comp-conflict'), false);

  const genericRole = { ...role, id: 'role-backend', title: 'Founding Backend Engineer', skills: 'AI platform API infrastructure', outcome: 'Ship reliable backend services' };
  const genericCandidate = { ...raw, 'skills-stack': 'AI platform brand marketing', experience: 'Led content campaigns and social media', 'why-startups': 'I want to join a seed startup' };
  fs.writeFileSync(path.join(testDir, 'test-board.json'), JSON.stringify({ roles: [genericRole], candidates: [], receipts: [] }));
  fs.writeFileSync(path.join(testDir, 'test-submissions-inbox.json'), JSON.stringify({ items: [{ id: 'cand-marketing', form: 'engineer-join', status: 'reviewed', raw: genericCandidate }] }));
  const proposalCounts = {};
  for (const [name, file, args] of [
    ['suggest', './demigod-matching-engine.mjs', ['suggest', '--role=role-backend', '--propose']],
    ['candidate', './demigod-matching-engine.mjs', ['propose-for-candidate', 'cand-marketing', '--propose']],
    ['auto', './demigod-auto-propose.mjs', ['--allow-sample', '--json']],
  ]) {
    fs.rmSync(path.join(root, 'DEMIGOD-PAIRS.json'), { force: true });
    const child = spawnSync(process.execPath, [new URL(file, import.meta.url).pathname, ...args], {
      encoding: 'utf8', env: childEnv,
    });
    assert.equal(child.status, 0, child.stderr || child.stdout);
    proposalCounts[name] = JSON.parse(child.stdout).proposed.length;
  }
  assert.deepEqual(proposalCounts, { suggest: 0, candidate: 0, auto: 0 }, 'generic words must not mint contradictory-function pairs');
  assert.equal(decideMatch(genericRole, genericCandidate).match, false);
  assert.equal(fs.statSync(path.join(busy, 'auto-propose-latest.json')).mode & 0o777, 0o600);
} finally {
  const sharedAutoReceiptHashAfter = sha256(sharedAutoReceipt);
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(testDir, { recursive: true, force: true });
  assert.equal(
    sharedAutoReceiptHashAfter,
    sharedAutoReceiptHash,
    'isolated auto-propose runs must not overwrite the shared receipt',
  );
}

const autoSource = fs.readFileSync(new URL('./demigod-auto-propose.mjs', import.meta.url), 'utf8');
assert.match(autoSource, /sample: isSampleRole\(role\)[^\n]+isSampleCandidate\(m\.candidate\)/);
const matchingSource = fs.readFileSync(new URL('./demigod-matching-engine.mjs', import.meta.url), 'utf8');
assert.match(matchingSource, /const doPropose = args\.includes\('--propose'\)/);
assert.doesNotMatch(matchingSource, /\|\| matches\[0\]/);

console.log('demigod matching readiness gate: PASS');
