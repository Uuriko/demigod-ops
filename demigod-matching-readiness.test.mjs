#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { candidateProfileReadiness } from './demigod-submissions-lib.mjs';
import { redactItem } from './demigod-submissions-inbox.mjs';
import { decideMatch, isMatchingReadyCandidate, isMatchingReadyRole, isSampleCandidate, isSampleRole, matchEvidence, rolesFromPartnerInbox } from './demigod-matching-engine.mjs';

const sha256 = (file) => fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;

const raw = {
  'full-name': 'Candidate', 'seeker-email': 'candidate@example.com', 'skills-stack': 'Product design',
  experience: 'Shipped onboarding', 'sf-bay': 'yes', availability: 'now',
  'salary-expectation': '$170–190k base', 'resume-url': 'https://example.com/resume.pdf',
};
const candidateAt = new Date().toISOString();
assert.equal(isMatchingReadyCandidate({ form: 'engineer-join', status: 'new', at: candidateAt, raw }), false);
assert.equal(isMatchingReadyCandidate({ form: 'engineer-join', status: 'reviewed', at: candidateAt, raw }), true);
for (const compensation of ['market', 'flexible']) {
  assert.equal(
    isMatchingReadyCandidate({
      form: 'engineer-join',
      status: 'reviewed',
      at: candidateAt,
      raw: { ...raw, 'salary-expectation': compensation },
    }),
    true,
    `${compensation} remains a valid reviewable compensation constraint`,
  );
}
assert.equal(isMatchingReadyCandidate({ form: 'candidate', status: 'featured', at: candidateAt, raw }), true);
assert.equal(isMatchingReadyCandidate({ form: 'startup-hire', status: 'reviewed' }), false);
assert.equal(isMatchingReadyCandidate({ form: 'candidate', status: 'reviewed', at: candidateAt, raw: { ...raw, 'resume-url': '' } }), false);
assert.equal(candidateProfileReadiness({ form: 'candidate', status: 'reviewed', at: candidateAt, raw: { ...raw, 'resume-url': '' } }).missing.includes('resume'), true);
for (const invalidResume of ['victim@example.com', 'x', 'http://example.com/resume.pdf', 'https://user:secret@example.com/resume.pdf', 'https://example.com/\u0085poison.pdf', 'https://example.com/\u202epoison.pdf']) {
  const readiness = candidateProfileReadiness({
    form: 'candidate',
    status: 'reviewed',
    at: candidateAt,
    raw: { ...raw, 'resume-url': invalidResume },
  });
  assert.equal(readiness.matchReady, false, invalidResume);
  assert.equal(readiness.missing.includes('resume'), true, invalidResume);
}
const nativeResumeRaw = { ...raw, resume: 'https://uploads-ssl.webflow.com/private/resume.pdf' };
delete nativeResumeRaw['resume-url'];
assert.equal(isMatchingReadyCandidate({ form: 'candidate', status: 'reviewed', at: candidateAt, raw: nativeResumeRaw }), true);
assert.equal(isMatchingReadyCandidate({ form: 'candidate', status: 'reviewed', at: candidateAt, rejectReasons: ['missing_resume'], raw }), false);
const optedOut = { id: 'cand-not-open', form: 'candidate', status: 'reviewed', at: candidateAt, raw: { ...raw, 'sf-bay': 'no' } };
assert.equal(candidateProfileReadiness(optedOut).preferenceReady, false);
assert.equal(isMatchingReadyCandidate(optedOut), false);
assert.deepEqual(redactItem(optedOut).matchingBlockers, ['sf-bay-not-open']);
const staleCandidate = { id: 'cand-stale', form: 'candidate', status: 'reviewed', at: new Date(Date.now() - 31 * 86400000).toISOString(), raw };
const staleReadiness = candidateProfileReadiness(staleCandidate);
assert.equal(staleReadiness.availabilityCurrent, false);
assert.equal(isMatchingReadyCandidate(staleCandidate), false);
assert.deepEqual(redactItem(staleCandidate).matchingBlockers, ['availability-reconfirm']);
assert.equal(candidateProfileReadiness({ ...staleCandidate, availabilityConfirmedAt: candidateAt }).matchReady, true);
assert.equal(candidateProfileReadiness({ ...staleCandidate, availabilityConfirmedAt: new Date(Date.now() + 6 * 60000).toISOString() }).availabilityCurrent, false);
for (const key of ['availability', 'salary-expectation']) {
  const incomplete = { ...raw, [key]: '' };
  assert.equal(isMatchingReadyCandidate({ form: 'candidate', status: 'reviewed', at: candidateAt, raw: incomplete }), false, key);
  assert.ok(candidateProfileReadiness({ form: 'candidate', status: 'reviewed', at: candidateAt, raw: incomplete }).missing.includes(key), key);
}
const contactConstraints = candidateProfileReadiness({
  form: 'candidate',
  status: 'reviewed',
  at: candidateAt,
  raw: {
    ...raw,
    'sf-bay': 'victim@example.com',
    availability: 'victim@example.com',
    'salary-expectation': 'victim@example.com',
  },
});
assert.equal(contactConstraints.matchReady, false);
assert.deepEqual(
  contactConstraints.missing.filter((key) => ['sf-bay', 'availability', 'salary-expectation'].includes(key)),
  ['sf-bay', 'availability', 'salary-expectation'],
);
const contactProfile = candidateProfileReadiness({
  form: 'candidate',
  status: 'reviewed',
  at: candidateAt,
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
  at: candidateAt,
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
assert.ok(matchEvidence(role, { experience: 'Shipped onboarding', why: 'I want this outcome' }).includes('self-reported motivation supplied'));
const realRoleSubmission = {
  id: 'submission-1', featuredId: 'role-1', form: 'startup-hire', status: 'featured',
  at: new Date().toISOString(),
  data: {
    'company-name': 'Acme', 'company-stage': 'seed', 'role-title': 'Founding Engineer',
    'stack-needs': 'JavaScript', '90day-outcome': 'Ship a reliable product milestone',
    'work-location': 'sf-hybrid', 'salary-range': '$180-220k',
    'interview-process': 'Founder chat → work sample → final; target decision in ~2 weeks',
    'contact-email': 'founder@acme.test',
  },
};
assert.equal(rolesFromPartnerInbox({ items: [realRoleSubmission] })[0].id, 'role-1', 'matcher uses the accepted board role id');

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
  fs.rmSync(path.join(root, 'DEMIGOD-PAIRS.json'), { force: true });
  const unrelatedRole = { ...role, id: 'role-unrelated', title: 'Unrelated role' };
  fs.writeFileSync(path.join(testDir, 'test-board.json'), JSON.stringify({ roles: [role, unrelatedRole], candidates: [], receipts: [] }));
  fs.writeFileSync(path.join(testDir, 'test-submissions-inbox.json'), JSON.stringify({ items: [{ id: 'cand-test', form: 'engineer-join', status: 'reviewed', at: candidateAt, raw }] }));
  fs.writeFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), JSON.stringify({ pairs: {
    approved: { pairId: 'pair-approved', roleId: role.id, candId: 'cand-test', state: 'approved', sample: true, at: '2026-08-02T00:00:00.000Z' },
    proposed: { pairId: 'pair-proposed', roleId: unrelatedRole.id, candId: 'cand-test', state: 'proposed', sample: true, at: '2026-08-02T00:00:00.000Z' },
  } }));
  const roleReceipt = spawnSync(process.execPath, [new URL('./demigod-matching-engine.mjs', import.meta.url).pathname, 'present-candidate', 'candidate@example.com'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(roleReceipt.status, 0, roleReceipt.stderr || roleReceipt.stdout);
  assert.match(roleReceipt.stdout, /Role receipts[\s\S]*Pair: pair-approved[\s\S]*First result: Ship onboarding[\s\S]*Must-haves: B2B SaaS[\s\S]*Constraints: work arrangement not supplied · \$180-220k/);
  assert.match(roleReceipt.stdout, /Why this intro: self-reported first-result overlap: onboarding · compensation ranges overlap · availability: ready now · self-reported 0d ago · self-reported experience supplied/);
  assert.match(roleReceipt.stdout, /Open question: What important constraint or missing evidence could make this a poor fit\?/);
  assert.match(roleReceipt.stdout, /Evidence source: role brief \+ your private profile · fictional demonstration/);
  assert.match(roleReceipt.stdout, /Verification: Brief and profile are submitted by each side and human-reviewed for relevance; claims are not independently verified\./);
  assert.match(roleReceipt.stdout, /Correction: Something wrong or missing\? Correct it privately before deciding\./);
  assert.match(roleReceipt.stdout, /FICTIONAL SAMPLE[\s\S]*no consent action/);
  assert.doesNotMatch(roleReceipt.stdout, /Unrelated role|pair-proposed/);
  assert.doesNotMatch(roleReceipt.stdout, /(?:candidate|private\.role)@example\.com/);
  fs.rmSync(path.join(root, 'DEMIGOD-PAIRS.json'));
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

  fs.writeFileSync(path.join(testDir, 'test-submissions-inbox.json'), JSON.stringify({ items: [staleCandidate] }));
  const staleRun = spawnSync(process.execPath, [new URL('./demigod-matching-engine.mjs', import.meta.url).pathname, 'suggest', '--role=role-sample', '--propose'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(staleRun.status, 0, staleRun.stderr || staleRun.stdout);
  assert.deepEqual(JSON.parse(staleRun.stdout).matches, [], 'stale availability leaves active matching until reconfirmed');

  const priorProfile = { id: 'cand-old', form: 'engineer-join', status: 'reviewed', at: candidateAt, raw };
  const currentProfile = { id: 'cand-new', form: 'engineer-join', status: 'reviewed', at: candidateAt, supersedes: priorProfile.id, raw: { ...raw, 'skills-stack': 'Product design, B2B SaaS' } };
  fs.writeFileSync(path.join(testDir, 'test-submissions-inbox.json'), JSON.stringify({ items: [currentProfile, priorProfile] }));
  const updatedRun = spawnSync(process.execPath, [new URL('./demigod-matching-engine.mjs', import.meta.url).pathname, 'suggest', '--role=role-sample'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(updatedRun.status, 0, updatedRun.stderr || updatedRun.stdout);
  const updatedResult = JSON.parse(updatedRun.stdout);
  assert.deepEqual(updatedResult.matches.map((match) => match.id), ['cand-new']);

  fs.writeFileSync(path.join(testDir, 'test-submissions-inbox.json'), JSON.stringify({ items: [{ id: 'cand-test', form: 'engineer-join', status: 'reviewed', at: candidateAt, raw }] }));
  const run = spawnSync(process.execPath, [new URL('./demigod-matching-engine.mjs', import.meta.url).pathname, 'suggest', '--role=role-sample', '--propose'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.equal(JSON.parse(run.stdout).proposed.length, 1, 'compatible role-centric control must propose');
  let pairs = Object.values(JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8')).pairs || {});
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].sample, true, 'sample role must never mint a real-labeled pair');
  assert.ok(pairs[0].reasons.includes('compensation ranges overlap'));
  assert.ok(pairs[0].reasons.some((reason) => /^availability: ready now · self-reported \d+d ago$/.test(reason)));

  const candidateRun = spawnSync(process.execPath, [new URL('./demigod-matching-engine.mjs', import.meta.url).pathname, 'propose-for-candidate', 'cand-test', '--threshold=1', '--propose'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(candidateRun.status, 0, candidateRun.stderr || candidateRun.stdout);
  assert.equal(JSON.parse(candidateRun.stdout).proposed.length, 1, 'compatible candidate-centric control must propose');
  pairs = Object.values(JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8')).pairs || {});
  assert.ok(pairs[0].reasons.includes('compensation ranges overlap'));
  assert.ok(pairs[0].reasons.some((reason) => /^availability: ready now · self-reported \d+d ago$/.test(reason)));

  const autoRun = spawnSync(process.execPath, [new URL('./demigod-auto-propose.mjs', import.meta.url).pathname, '--allow-sample', '--min-score', '0.5', '--json'], {
    encoding: 'utf8', env: childEnv,
  });
  assert.equal(autoRun.status, 0, autoRun.stderr || autoRun.stdout);
  assert.equal(JSON.parse(autoRun.stdout).proposed.length, 1, 'compatible auto-propose control must propose');
  pairs = Object.values(JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8')).pairs || {});
  assert.ok(pairs[0].reasons.includes('compensation ranges overlap'));
  assert.ok(pairs[0].reasons.some((reason) => /^availability: ready now · self-reported \d+d ago$/.test(reason)));
  assert.doesNotMatch(JSON.stringify(pairs[0].reasons), /private\.role@example\.com/, 'raw role title must not enter proposal reasons');

  fs.writeFileSync(path.join(testDir, 'test-submissions-inbox.json'), JSON.stringify({ items: [{ id: 'cand-comp-conflict', form: 'engineer-join', status: 'reviewed', at: candidateAt, raw: conflictRaw }] }));
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
  fs.writeFileSync(path.join(testDir, 'test-submissions-inbox.json'), JSON.stringify({ items: [{ id: 'cand-marketing', form: 'engineer-join', status: 'reviewed', at: candidateAt, raw: genericCandidate }] }));
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
