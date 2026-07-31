#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-pairs-cli-'));
const scope = `pairs-cli-${process.pid}-${Date.now()}`;
const testDir = path.join('/tmp/dg-busy/tests', scope);
const bin = new URL('./demigod-pairs-lib.mjs', import.meta.url).pathname;
const reviewBin = new URL('./demigod-match-review.mjs', import.meta.url).pathname;
const introBin = new URL('./demigod-intro-draft.mjs', import.meta.url).pathname;
const introGeneratorBin = new URL('./demigod-intro-generator.mjs', import.meta.url).pathname;
const busy = path.join(root, '.dg-busy');
process.env.DEMIGOD_ROOT = root;
process.env.DEMIGOD_TEST_SCOPE = scope;
process.env.DEMIGOD_BUSY = busy;
const run = (...args) => spawnSync(process.execPath, [bin, ...args], {
  encoding: 'utf8',
  env: process.env,
});
const runMatchReview = (...args) => spawnSync(process.execPath, [reviewBin, ...args], {
  encoding: 'utf8',
  env: process.env,
});
const runIntro = (...args) => spawnSync(process.execPath, [introBin, ...args], {
  encoding: 'utf8',
  env: process.env,
});
const runIntroGenerator = (...args) => spawnSync(process.execPath, [introGeneratorBin, ...args], {
  encoding: 'utf8',
  env: process.env,
});
try {
  assert.equal(
    runIntroGenerator('--role-id=missing-role', '--cand-id=missing-candidate').status,
    1,
    'missing role/candidate cannot produce a fabricated warm intro',
  );
  const pairsPath = path.join(root, 'DEMIGOD-PAIRS.json');
  fs.writeFileSync(pairsPath, '{corrupt exact bytes');
  const corruptBytes = fs.readFileSync(pairsPath, 'utf8');
  assert.equal(run('propose', '--role', 'sample-role', '--cand', 'sample-candidate').status, 1);
  assert.equal(fs.readFileSync(pairsPath, 'utf8'), corruptBytes, 'a corrupt pair store must never be replaced');
  fs.rmSync(pairsPath);
  for (const score of ['NaN', 'Infinity', '-0.1', '1.1']) {
    assert.equal(
      run('propose', '--role', 'sample-role', '--cand', 'sample-candidate', '--score', score).status,
      1,
      `invalid score ${score} must fail closed`,
    );
    assert.equal(fs.existsSync(pairsPath), false);
  }
  assert.equal(
    run('propose', '--role', 'sample-role', '--cand', 'sample-candidate', '--why', 'x'.repeat(241)).status,
    1,
    'unbounded proposal reasons must fail closed',
  );
  assert.equal(fs.existsSync(pairsPath), false);
  assert.equal(
    run('propose', '--role', 'sample-role', '--cand', 'sample-candidate', '--why', 'review\u202espoof').status,
    1,
    'bidi proposal reasons must fail closed',
  );
  assert.equal(fs.existsSync(pairsPath), false);
  assert.equal(run('propose', '--role', 'sample-role', '--cand', 'sample-candidate').status, 0);
  fs.mkdirSync(testDir, { recursive: true });
  const cases = [
    ['real-role', 'role-submission', 'real-candidate'],
    ['promotion-role', 'promotion-submission', 'promotion-candidate'],
    ['revoked-role', 'revoked-role-submission', 'revoked-role-candidate'],
    ['candidate-role', 'candidate-role-submission', 'revoked-candidate'],
    ['stale-role', 'stale-role-submission', 'stale-candidate'],
    ['terminal-sample-role', 'terminal-sample-submission', 'terminal-sample-candidate'],
  ];
  const roles = cases.map(([roleId, submissionId]) => ({
    id: roleId,
    sample: false,
    title: 'Founding Engineer',
    sourceSubmissionHash: crypto.createHash('sha256').update(submissionId).digest('hex'),
  }));
  const origins = cases.map(([roleId, submissionId]) => ({
    id: submissionId,
    featuredId: roleId,
    status: 'featured',
    form: 'startup-hire',
    data: { 'company-name': `Acme ${roleId}` },
  }));
  const candidates = cases.map(([, , candidateId]) => ({
    id: candidateId,
    sample: false,
    status: 'reviewed',
    form: 'engineer-join',
    raw: {
      'full-name': 'Candidate',
      'seeker-email': `${candidateId}@acme.test`,
      'skills-stack': 'JavaScript',
      experience: 'Shipped products',
      'sf-bay': 'yes',
      availability: 'now',
      'salary-expectation': '$180k',
      'work-auth': 'authorized',
      'resume-url': `https://acme.test/${candidateId}.pdf`,
    },
  }));
  const boardPath = path.join(testDir, 'test-board.json');
  const inboxPath = path.join(testDir, 'test-submissions-inbox.json');
  fs.writeFileSync(boardPath, JSON.stringify({ roles, candidates: [] }));
  fs.writeFileSync(inboxPath, JSON.stringify({ items: [...origins, ...candidates] }));
  const beforeRejectedReal = fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8');
  assert.equal(run('propose', '--role', 'missing-role', '--cand', 'real-candidate', '--real').status, 1);
  assert.equal(run('propose', '--role', 'real-role', '--cand', 'missing-candidate', '--real').status, 1);
  assert.equal(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'), beforeRejectedReal);
  assert.equal(run('propose', '--role', 'promotion-role', '--cand', 'promotion-candidate').status, 0);
  assert.equal(
    Object.values(JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8')).pairs)
      .find((pair) => pair.roleId === 'promotion-role').sample,
    true,
  );
  const beforeSamplePromotion = fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8');
  const samplePromotion = run(
    'propose',
    '--role',
    'promotion-role',
    '--cand',
    'promotion-candidate',
    '--real',
  );
  assert.equal(samplePromotion.status, 1);
  assert.match(samplePromotion.stderr, /pair_sample_promotion_forbidden/);
  assert.equal(
    fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'),
    beforeSamplePromotion,
    'a proposed sample pair cannot be relabeled real',
  );
  const handEdited = JSON.parse(beforeSamplePromotion);
  const handEditedPair = Object.values(handEdited.pairs)
    .find((pair) => pair.roleId === 'promotion-role');
  handEditedPair.sample = false;
  handEditedPair.state = 'approved';
  fs.writeFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), JSON.stringify(handEdited));
  const handEditedBytes = fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8');
  const handEditedConsent = run(
    'consent',
    handEditedPair.pairId,
    '--side',
    'founder',
    '--i-observed-consent',
    '--evidence',
    'forged founder reply',
  );
  assert.equal(handEditedConsent.status, 1);
  assert.match(handEditedConsent.stderr, /real_pair_origin_invalid/);
  assert.equal(
    fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'),
    handEditedBytes,
    'hand-editing sample:false cannot grant consent authority',
  );
  const handEditedDraft = runIntro(handEditedPair.pairId, '--json', '--force');
  assert.equal(handEditedDraft.status, 2);
  assert.equal(JSON.parse(handEditedDraft.stderr).reason, 'real_pair_origin_invalid');
  fs.writeFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), beforeSamplePromotion);
  const realRun = run('propose', '--role', 'real-role', '--cand', 'real-candidate', '--real');
  assert.equal(realRun.status, 0, realRun.stderr || realRun.stdout);
  const real = Object.values(JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8')).pairs).find((pair) => pair.roleId === 'real-role');
  assert.equal(real.sample, false, 'a direct validated real proposal stays explicitly real');
  assert.equal(real.createdSample, false, 'real authority records its creation classification');
  assert.equal(run('propose', '--role', 'terminal-sample-role', '--cand', 'terminal-sample-candidate').status, 0);
  const forgedTerminalStore = JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'));
  Object.values(forgedTerminalStore.pairs).find((pair) => pair.roleId === 'terminal-sample-role').state = 'approved';
  fs.writeFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), JSON.stringify(forgedTerminalStore, null, 2) + '\n');
  const beforeTerminalSamplePromotion = fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8');
  const terminalSamplePromotion = run(
    'propose',
    '--role',
    'terminal-sample-role',
    '--cand',
    'terminal-sample-candidate',
    '--real',
  );
  assert.equal(terminalSamplePromotion.status, 1);
  assert.match(terminalSamplePromotion.stderr, /pair_sample_promotion_forbidden/);
  assert.equal(
    fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'),
    beforeTerminalSamplePromotion,
    'a terminal sample cannot be relabeled real without the real review path',
  );
  const beforeConsent = fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8');
  assert.equal(run('consent', real.pairId, '--side', 'founder', '--i-observed-consent', '--evidence', 'fixture founder reply').status, 1);
  assert.equal(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'), beforeConsent, 'unreviewed consent must not mutate');
  const beforeUnattestedReview = fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8');
  assert.equal(run('review', real.pairId, '--decision', 'approve', '--note', 'automation claim').status, 1);
  assert.equal(run('review', real.pairId, '--decision', 'approve', '--i-reviewed').status, 1);
  assert.equal(
    fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'),
    beforeUnattestedReview,
    'real review without both attestation and evidence must not mutate',
  );
  assert.equal(
    runMatchReview('review', real.pairId, '--decision', 'approve', '--i-reviewed', '--note', 'Reviewed fit evidence').status,
    0,
  );
  assert.equal(run('consent', real.pairId, '--side', 'founder', '--i-observed-consent', '--evidence', 'fixture founder reply').status, 0);
  const afterFounderConsent = fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8');
  assert.equal(run('consent', real.pairId, '--side', 'founder', '--i-observed-consent', '--evidence', 'duplicate founder reply').status, 0);
  assert.equal(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'), afterFounderConsent, 'repeat consent must be idempotent');
  assert.equal(run('consent', real.pairId, '--side', 'candidate', '--i-observed-consent', '--evidence', 'fixture candidate reply').status, 0);
  assert.equal(
    runIntroGenerator('--role-id=real-role', '--cand-id=real-candidate').status,
    0,
    'current mutual pair can use the canonical gated draft',
  );
  const beforeTerminalReview = fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8');
  assert.equal(
    run('review', real.pairId, '--decision', 'defer', '--i-reviewed', '--note', 'Reviewed terminal pair').status,
    1,
  );
  assert.equal(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'), beforeTerminalReview, 'mutual consent must be terminal to generic review');
  const pairs = Object.values(JSON.parse(beforeTerminalReview).pairs);
  assert.equal(pairs.find((pair) => pair.roleId === 'sample-role').sample, true);
  assert.equal(pairs.find((pair) => pair.roleId === 'real-role').sample, false);
  assert.equal(pairs.find((pair) => pair.roleId === 'real-role').state, 'mutual_yes');
  const beforeTerminalReproposal = fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8');
  assert.equal(
    run(
      'propose',
      '--role',
      'real-role',
      '--cand',
      'real-candidate',
      '--real',
      '--score',
      '0.01',
      '--why',
      'fabricated reproposal',
    ).status,
    0,
  );
  assert.equal(
    fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'),
    beforeTerminalReproposal,
    'same-class reproposal cannot rewrite a reviewed or consented pair',
  );
  const beforeSampleReproposal = fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8');
  const sampleReproposal = run('propose', '--role', 'real-role', '--cand', 'real-candidate');
  assert.equal(sampleReproposal.status, 0, sampleReproposal.stderr || sampleReproposal.stdout);
  assert.equal(
    fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'),
    beforeSampleReproposal,
    'sample-mode reproposal cannot contaminate an existing real pair',
  );
  assert.equal(
    JSON.parse(run('list').stdout).pairs.some((pair) => pair.pairId === real.pairId && pair.sample === false),
    true,
    'sample-mode reproposal cannot hide an existing real pair from the default list',
  );

  const proposeReal = (roleId, candId) => {
    const result = run('propose', '--role', roleId, '--cand', candId, '--real');
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return JSON.parse(result.stdout);
  };
  const revokedRolePair = proposeReal('revoked-role', 'revoked-role-candidate');
  const revokedCandidatePair = proposeReal('candidate-role', 'revoked-candidate');
  const stalePair = proposeReal('stale-role', 'stale-candidate');
  assert.equal(
    run('review', stalePair.pairId, '--decision', 'approve', '--i-reviewed', '--note', 'Reviewed current evidence').status,
    0,
  );

  fs.writeFileSync(boardPath, JSON.stringify({
    roles: roles.filter((role) => !['revoked-role', 'stale-role'].includes(role.id)),
    candidates: [],
  }));
  fs.writeFileSync(inboxPath, JSON.stringify({
    items: [...origins, ...candidates.map((candidate) =>
      ['revoked-candidate', 'stale-candidate'].includes(candidate.id)
        ? { ...candidate, status: 'rejected' }
        : candidate)],
  }));

  const beforeStaleReview = fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8');
  assert.equal(
    run('review', revokedRolePair.pairId, '--decision', 'approve', '--i-reviewed', '--note', 'Reviewed stale role').status,
    1,
  );
  assert.equal(
    run('review', revokedCandidatePair.pairId, '--decision', 'approve', '--i-reviewed', '--note', 'Reviewed stale candidate').status,
    1,
  );
  assert.equal(
    fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'),
    beforeStaleReview,
    'revoked role/candidate approvals must not mutate',
  );
  assert.equal(
    run('review', revokedRolePair.pairId, '--decision', 'reject', '--i-reviewed', '--note', 'Role no longer current').status,
    0,
  );
  assert.equal(
    run('review', revokedCandidatePair.pairId, '--decision', 'defer', '--i-reviewed', '--note', 'Candidate no longer current').status,
    0,
  );

  const beforeStaleConsent = fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8');
  assert.equal(
    run('consent', stalePair.pairId, '--side', 'founder', '--i-observed-consent', '--evidence', 'stale founder reply').status,
    1,
  );
  assert.equal(
    fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'),
    beforeStaleConsent,
    'revoked pair consent must not mutate',
  );
  const staleDraft = runIntro(stalePair.pairId, '--json');
  assert.equal(staleDraft.status, 2, 'revoked pair cannot draft');
  assert.equal(JSON.parse(staleDraft.stderr).reason, 'real_pair_role_not_accepted');
  const forcedStaleDraft = runIntro(stalePair.pairId, '--json', '--force');
  assert.equal(forcedStaleDraft.status, 2, 'force cannot bypass current real-pair eligibility');
  assert.equal(JSON.parse(forcedStaleDraft.stderr).reason, 'real_pair_role_not_accepted');

  const forgedId = 'badbadbadbadbad1';
  const forgedStore = JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'));
  forgedStore.pairs[forgedId] = {
    pairId: forgedId,
    roleId: 'real-role',
    candId: 'real-candidate',
    state: 'approved',
    sample: false,
    mutual: { founder: false, candidate: false },
    history: [],
  };
  const paddedId = crypto.createHash('sha256')
    .update(['real-role', 'revoked-role-candidate'].sort().join('|'))
    .digest('hex')
    .slice(0, 16);
  forgedStore.pairs[paddedId] = {
    pairId: paddedId,
    roleId: ' real-role ',
    candId: 'revoked-role-candidate',
    state: 'approved',
    sample: false,
    mutual: { founder: false, candidate: false },
    history: [],
  };
  const samplePair = Object.values(forgedStore.pairs).find((pair) => pair.roleId === 'sample-role');
  samplePair.state = 'approved'; // persisted legacy/sample row; no real lifecycle authority
  samplePair.reasons = ['POISON_EMAIL_alice@example.test call +1 415 555 0123'];
  fs.writeFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), JSON.stringify(forgedStore));
  assert.equal(
    run('review', forgedId, '--decision', 'approve', '--i-reviewed', '--note', 'Reviewed forged binding').status,
    1,
  );
  const forgedDraft = runIntro(forgedId, '--json');
  assert.equal(forgedDraft.status, 2, 'forged canonical binding cannot draft');
  assert.equal(JSON.parse(forgedDraft.stderr).reason, 'real_pair_id_invalid');
  const paddedDraft = runIntro(paddedId, '--json');
  assert.equal(paddedDraft.status, 2, 'trimmed/coerced IDs cannot pass as persisted canonical fields');
  assert.equal(JSON.parse(paddedDraft.stderr).reason, 'real_pair_id_invalid');

  const beforeSampleConsent = fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8');
  assert.equal(
    run('consent', samplePair.pairId, '--side', 'founder', '--i-observed-consent', '--evidence', 'sample founder reply').status,
    1,
  );
  assert.equal(
    fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'),
    beforeSampleConsent,
    'sample consent must not mutate',
  );
  const sampleDraft = runIntro(samplePair.pairId, '--json');
  assert.equal(sampleDraft.status, 2, 'sample draft requires force');
  assert.equal(JSON.parse(sampleDraft.stderr).reason, 'sample_pair_not_eligible');
  const forcedSample = runIntro(samplePair.pairId, '--json', '--force');
  assert.equal(forcedSample.status, 0, forcedSample.stderr || forcedSample.stdout);
  const forcedSampleResult = JSON.parse(forcedSample.stdout);
  assert.equal(forcedSampleResult.sample, true);
  assert.equal(forcedSampleResult.sent, false, 'forced sample output remains a local draft');
  assert.match(fs.readFileSync(forcedSampleResult.path, 'utf8'), /\bSAMPLE\b/);
  for (const malformedSample of ['true', 1, undefined]) {
    const malformedStore = JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'));
    const malformedPair = malformedStore.pairs[samplePair.pairId];
    if (malformedSample === undefined) delete malformedPair.sample;
    else malformedPair.sample = malformedSample;
    fs.writeFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), JSON.stringify(malformedStore));
    const malformedDraft = runIntro(samplePair.pairId, '--json');
    assert.equal(malformedDraft.status, 2, 'only an explicit sample:false pair may draft');
    assert.equal(JSON.parse(malformedDraft.stderr).reason, 'sample_pair_not_eligible');
    const forcedMalformed = runIntro(samplePair.pairId, '--json', '--force');
    assert.equal(forcedMalformed.status, 0, forcedMalformed.stderr || forcedMalformed.stdout);
    const forcedMalformedResult = JSON.parse(forcedMalformed.stdout);
    assert.equal(forcedMalformedResult.sample, true, 'forced malformed sample markers stay visibly SAMPLE');
    assert.match(fs.readFileSync(forcedMalformedResult.path, 'utf8'), /\bSAMPLE\b/);
  }

  const [
    { planIntroLeadReady, planIntroQueue, planPairSyncMoves },
    submissions,
    { buildQueue },
    { proposeIntro },
  ] =
    await Promise.all([
      import('./demigod-funnel.mjs'),
      import('./demigod-submissions-lib.mjs'),
      import('./demigod-match-review.mjs'),
      import('./demigod-matching-engine.mjs'),
    ]);
  const beforeReviewProjection = fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8');
  const reviewQueue = buildQueue({ includeSample: true });
  assert.equal(
    fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'),
    beforeReviewProjection,
    'research/evidence projection cannot mutate pair score, state, or consent',
  );
  const malformedReviewPair = reviewQueue.pairs.find((pair) => pair.pairId === samplePair.pairId);
  assert.equal(malformedReviewPair.sample, true, 'missing sample:false remains sample in review projections');
  assert.equal(malformedReviewPair.companyEvidence, null, 'malformed sample receives no real-company evidence');
  assert.deepEqual(
    malformedReviewPair.reasons,
    ['[contact removed] call [phone removed]'],
    'free-text pair reasons are contact-redacted in private review artifacts',
  );
  assert.equal(
    reviewQueue.summary.realCount,
    Object.values(JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8')).pairs)
      .filter((pair) => pair.sample === false).length,
    'review real count includes only explicit sample:false pairs',
  );
  const reviewStorePairs = Object.values(
    JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8')).pairs,
  );
  const countStates = (rows) => rows.reduce((out, pair) => {
    out[pair.state] = (out[pair.state] || 0) + 1;
    return out;
  }, {});
  assert.deepEqual(
    reviewQueue.summary.byState,
    countStates(reviewStorePairs.filter((pair) => pair.sample === false)),
    'review lifecycle totals include only explicit real pairs',
  );
  assert.deepEqual(
    reviewQueue.summary.sampleByState,
    countStates(reviewStorePairs.filter((pair) => pair.sample !== false)),
    'sample lifecycle totals remain explicitly labeled',
  );
  const board = submissions.loadBoard();
  const inbox = submissions.loadInbox();
  const pairContext = { board, inbox };
  const staleMutual = {
    ...stalePair,
    state: 'mutual_yes',
    mutual: { founder: true, candidate: true },
  };
  const staleIntroStore = JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'));
  staleIntroStore.pairs[stalePair.pairId] = staleMutual;
  fs.writeFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), JSON.stringify(staleIntroStore));
  assert.equal(
    proposeIntro(stalePair.roleId, stalePair.candId).error,
    'no mutual match found',
    'stale canonical mutual pair cannot create a legacy intro proposal',
  );
  assert.equal(
    fs.existsSync(path.join(root, 'DEMIGOD-MATCHES.json')),
    false,
    'stale intro refusal must not write the legacy matches mirror',
  );
  const prooflessStore = JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'));
  prooflessStore.pairs[real.pairId].history = prooflessStore.pairs[real.pairId].history
    .filter((row) => row.event !== 'consent');
  fs.writeFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), JSON.stringify(prooflessStore));
  assert.equal(
    proposeIntro(real.roleId, real.candId).error,
    'no mutual match found',
    'mutual booleans without both side receipts cannot authorize an intro',
  );
  const prooflessGenerator = runIntroGenerator('--role-id=real-role', '--cand-id=real-candidate');
  assert.equal(prooflessGenerator.status, 1, 'canonical intro wrapper must recheck consent receipts');
  assert.match(prooflessGenerator.stderr, /pair_consent_receipt_missing/);
  const prooflessPair = prooflessStore.pairs[real.pairId];
  const prooflessIntroPlan = planIntroQueue(
    { [real.pairId]: prooflessPair },
    { pairContext },
  );
  assert.equal(
    prooflessIntroPlan.items.length,
    0,
    'funnel intro queue cannot trust mutual booleans without both side receipts',
  );
  assert.equal(prooflessIntroPlan.skipped[0]?.reason, 'pair_consent_receipt_missing');
  assert.equal(
    planIntroLeadReady(
      { partners: [{ id: 'proofless-lead', state: 'mutual_yes', pairIds: [real.pairId] }], talent: [] },
      { [real.pairId]: prooflessPair },
      { pairContext },
    ).ready.length,
    0,
    'lead intro readiness cannot trust mutual booleans without both side receipts',
  );
  assert.equal(
    planPairSyncMoves(
      { partners: [{ id: 'proofless-lead', state: 'proposed', pairIds: [real.pairId] }], talent: [] },
      { [real.pairId]: prooflessPair },
      { pairContext },
    ).moves.length,
    0,
    'pair sync cannot trust mutual booleans without both side receipts',
  );
  assert.equal(
    run(
      'consent',
      real.pairId,
      '--side',
      'founder',
      '--i-observed-consent',
      '--evidence',
      're-observed founder reply',
    ).status,
    0,
    'a valid consent call repairs a proofless pre-existing boolean',
  );
  let repairedPair = JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'))
    .pairs[real.pairId];
  assert.ok(
    repairedPair.history.some(
      (row) =>
        row.event === 'consent' &&
        row.side === 'founder' &&
        row.evidence === 're-observed founder reply',
    ),
    'idempotent consent stores the missing founder receipt',
  );
  assert.equal(
    proposeIntro(real.roleId, real.candId).error,
    'no mutual match found',
    'one repaired side is still insufficient',
  );
  assert.equal(
    run(
      'consent',
      real.pairId,
      '--side',
      'candidate',
      '--i-observed-consent',
      '--evidence',
      're-observed candidate reply',
    ).status,
    0,
  );
  repairedPair = JSON.parse(fs.readFileSync(path.join(root, 'DEMIGOD-PAIRS.json'), 'utf8'))
    .pairs[real.pairId];
  assert.ok(
    repairedPair.history.some(
      (row) => row.event === 'consent' && row.side === 'candidate',
    ),
    'idempotent consent stores the missing candidate receipt',
  );
  const localIntro = proposeIntro(real.roleId, real.candId);
  assert.equal(
    localIntro.ok,
    true,
    'current eligibility plus both valid side receipts authorizes the local intro proposal',
  );
  assert.equal(localIntro.boardWrite, false, 'authorized intro remains a local quarantine record');
  assert.equal(localIntro.receipt, null, 'authorized intro does not manufacture a delivery receipt');
  assert.equal(
    planIntroQueue({ [stalePair.pairId]: staleMutual }, { pairContext }).items.length,
    0,
    'raw intro queue rejects a revoked pair',
  );
  assert.equal(
    planIntroQueue({ [stalePair.pairId]: staleMutual }).items.length,
    0,
    'raw intro queue loads current eligibility when no fixture context is supplied',
  );
  assert.equal(
    planIntroQueue(
      { [stalePair.pairId]: staleMutual },
      { pairContext: () => {} },
    ).items.length,
    0,
    'raw intro queue cannot trust a caller-provided no-op validator',
  );
  const fakeRole = `fake-production-role-${Date.now()}`;
  const fakeCandidate = `fake-production-candidate-${Date.now()}`;
  const fakePairId = crypto.createHash('sha256')
    .update([fakeRole, fakeCandidate].sort().join('|'))
    .digest('hex')
    .slice(0, 16);
  const fakeOrigin = `origin-${fakeRole}`;
  const fakeContextScript = `
    import { planIntroQueue } from ${JSON.stringify(new URL('./demigod-funnel.mjs', import.meta.url).href)};
    const pair = ${JSON.stringify({
      pairId: fakePairId,
      roleId: fakeRole,
      candId: fakeCandidate,
      state: 'mutual_yes',
      sample: false,
      createdSample: false,
      mutual: { founder: true, candidate: true },
      history: [
        { event: 'consent', side: 'founder', evidence: 'forged founder receipt' },
        { event: 'consent', side: 'candidate', evidence: 'forged candidate receipt' },
      ],
    })};
    const pairContext = {
      board: { roles: [{
        id: ${JSON.stringify(fakeRole)},
        sample: false,
        title: 'Founding Engineer',
        sourceSubmissionHash: ${JSON.stringify(crypto.createHash('sha256').update(fakeOrigin).digest('hex'))},
      }] },
      inbox: { items: [
        {
          id: ${JSON.stringify(fakeOrigin)},
          featuredId: ${JSON.stringify(fakeRole)},
          status: 'featured',
          form: 'startup-hire',
          data: { 'company-name': 'Forged Context Co' },
        },
        {
          id: ${JSON.stringify(fakeCandidate)},
          sample: false,
          status: 'reviewed',
          form: 'engineer-join',
          raw: {
            'full-name': 'Forged Context Candidate',
            'seeker-email': 'forged-context@fixture.test',
            'skills-stack': 'JavaScript',
            experience: 'Shipped products',
            'sf-bay': 'yes',
            availability: 'now',
            'salary-expectation': '$180k',
            'work-auth': 'authorized',
            'resume-url': 'https://fixture.test/forged-context.pdf',
          },
        },
      ] },
    };
    const plan = planIntroQueue({ [pair.pairId]: pair }, { pairContext });
    console.log(JSON.stringify({ items: plan.items.length, reason: plan.skipped[0]?.reason }));
  `;
  const productionLikeEnv = { ...process.env, DEMIGOD_ROOT: root };
  delete productionLikeEnv.DEMIGOD_TEST_SCOPE;
  delete productionLikeEnv.NODE_TEST_CONTEXT;
  const fakeContextResult = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', fakeContextScript],
    { encoding: 'utf8', env: productionLikeEnv },
  );
  assert.equal(fakeContextResult.status, 0, fakeContextResult.stderr || fakeContextResult.stdout);
  assert.deepEqual(
    JSON.parse(fakeContextResult.stdout),
    { items: 0, reason: 'real_pair_role_not_accepted' },
    'a forged canonical mutual pair and caller context cannot substitute current board/inbox authority',
  );
  assert.equal(
    planIntroLeadReady(
      { partners: [{ id: 'lead', state: 'mutual_yes', pairIds: [stalePair.pairId] }], talent: [] },
      { [stalePair.pairId]: staleMutual },
      { pairContext },
    ).ready.length,
    0,
    'raw lead intro readiness rejects a revoked pair',
  );
  assert.equal(
    planPairSyncMoves(
      { partners: [{ id: 'lead', state: 'proposed', pairIds: [stalePair.pairId] }], talent: [] },
      { [stalePair.pairId]: staleMutual },
      { pairContext },
    ).moves.length,
    0,
    'raw pair sync rejects a revoked pair',
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(testDir, { recursive: true, force: true });
}

console.log('demigod pairs CLI sample-by-default: PASS');
