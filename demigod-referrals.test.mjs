import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

test('unique link → accepted claim → retained paid hire → cash or company credit', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-referrals-'));
  const storePath = path.join(dir, 'referrals.json');
  const leadsPath = path.join(dir, 'leads.json');
  const pairsPath = path.join(dir, 'pairs.json');
  const inboxPath = path.join(dir, 'inbox.json');
  const statusPath = path.join(dir, 'status.json');
  process.env.DEMIGOD_REFERRALS_PATH = storePath;
  process.env.DEMIGOD_LEADS_PATH = leadsPath;
  process.env.DEMIGOD_PAIRS_PATH = pairsPath;
  process.env.DEMIGOD_INBOX_PATH = inboxPath;
  process.env.DEMIGOD_REFERRALS_STATUS_PATH = statusPath;
  const scope = `referrals-${process.pid}`;
  const testDir = path.join('/tmp/dg-busy/tests', scope);
  const boardPath = path.join(testDir, 'test-board.json');
  t.after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(testDir, { recursive: true, force: true });
  });
  process.env.DEMIGOD_TEST_SCOPE = scope;

  const canonicalPairId = (roleId, candId) =>
    createHash('sha256')
      .update([roleId, candId].sort().join('|'))
      .digest('hex')
      .slice(0, 16);
  const pairOneId = canonicalPairId('role-1', 'candidate-1');
  const pairCompanyTwoId = canonicalPairId('role-company-2', 'candidate-company-2');
  const pairCompanyDuplicateId = canonicalPairId(
    'role-company-2-duplicate',
    'candidate-company-2-duplicate',
  );
  const pairPartnerHireId = canonicalPairId('role-partner-hire', 'candidate-partner-hire');
  const eligiblePairSides = [
    ['role-1', 'candidate-1'],
    ['role-company-2', 'candidate-company-2'],
    ['role-company-2-duplicate', 'candidate-company-2-duplicate'],
    ['role-partner-hire', 'candidate-partner-hire'],
  ];
  const eligiblePairItems = eligiblePairSides.flatMap(([roleId, candId]) => [
    {
      id: `origin-${roleId}`,
      featuredId: roleId,
      status: 'featured',
      at: new Date().toISOString(),
      form: 'startup-hire',
      data: {
        'company-name': `Company ${roleId}`,
        'company-stage': 'seed',
        'role-title': 'Founding Engineer',
        'stack-needs': 'JavaScript',
        '90day-outcome': 'Ship a reliable product milestone',
        'work-location': 'sf-hybrid',
        'salary-range': '$180-220k',
        'interview-process': 'Founder chat → work sample → final; target decision in ~2 weeks',
        'contact-email': `founder+${roleId}@fixture.test`,
      },
    },
    {
      id: candId,
      at: new Date().toISOString(),
      sample: false,
      status: 'reviewed',
      form: 'engineer-join',
      raw: {
        'full-name': `Candidate ${candId}`,
        'seeker-email': `${candId}@fixture.test`,
        'skills-stack': 'JavaScript',
        experience: 'Shipped products',
        'sf-bay': 'yes',
        availability: 'now',
        'salary-expectation': '$180k',
        'resume-url': `https://fixture.test/${candId}.pdf`,
      },
    },
  ]);
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(boardPath, JSON.stringify({
    roles: eligiblePairSides.map(([roleId]) => ({
      id: roleId,
      sample: false,
      title: 'Founding Engineer',
      sourceSubmissionHash: createHash('sha256').update(`origin-${roleId}`).digest('hex'),
    })),
    candidates: [],
  }), { mode: 0o600 });

  const { roleTruthFingerprint } = await import(`./demigod-accepted-role.mjs?test=${Date.now()}`);
  const referrals = await import(`./demigod-referrals.mjs?test=${Date.now()}`);
  const maxFee = Number.MAX_SAFE_INTEGER;
  assert.equal(
    referrals.calculateRewardCents(maxFee, 2000),
    Number((BigInt(maxFee) * 2000n + 5000n) / 10000n),
    'basis-point arithmetic stays exact beyond safe Number multiplication',
  );
  const evidence = (name, text = name) => {
    const file = path.join(dir, `${name}.txt`);
    fs.writeFileSync(file, `${text}\n`, { mode: 0o600 });
    return file;
  };
  const agreement = evidence('agreement');
  const otherAgreement = evidence('other-agreement');
  const claimProof = evidence('claim-consent');
  const otherClaimProof = evidence('other-claim-consent');
  const expiredClaimProof = evidence('expired-claim-consent');
  const hireProof = evidence('hire');
  const otherHireProof = evidence('other-hire');
  const retentionProof = evidence('retention');
  const otherRetentionProof = evidence('other-retention');
  const invoiceProof = evidence('invoice');
  const paidProof = evidence('client-paid');
  const payoutProof = evidence('payout');
  const creditProof = evidence('credit');
  const reversalProof = evidence('reversal');
  const voidProof = evidence('void');

  fs.writeFileSync(leadsPath, JSON.stringify({ partners: [], talent: [] }), { mode: 0o600 });
  const pairs = { pairs: {} };
  const writePairs = () => fs.writeFileSync(pairsPath, JSON.stringify(pairs), { mode: 0o600 });
  const mutualPair = (pairId, roleId, candId) => {
    const roleTruthHash = roleTruthFingerprint(
      eligiblePairItems.find((item) => item.featuredId === roleId),
    );
    return {
      pairId,
      roleId,
      candId,
      state: 'mutual_yes',
      mutual: { founder: true, candidate: true },
      sample: false,
      createdSample: false,
      history: [
        { event: 'consent', side: 'founder', evidence: 'fixture founder consent', roleTruthHash },
        { event: 'consent', side: 'candidate', evidence: 'fixture candidate consent', roleTruthHash },
      ],
    };
  };
  writePairs();
  fs.writeFileSync(inboxPath, JSON.stringify({ items: eligiblePairItems }), { mode: 0o600 });

  const individual = referrals.createReferral({
    name: 'Alex Rivera',
    email: 'Alex@Referrals.co',
    ownerType: 'individual',
  });
  assert.match(individual.links.universal, /referral=rf_[A-Za-z0-9_-]{24}/);
  assert.match(individual.links.talent, /wiz=engineer/);
  assert.match(individual.links.hiring, /wiz=startup/);
  assert.equal(individual.disclosure, referrals.DISCLOSURE);
  assert.equal(referrals.createReferral({ name: 'Alex Rivera', email: 'alex@referrals.co', ownerType: 'individual' }).linkId, individual.linkId);
  assert.throws(
    () => referrals.createReferral({ name: 'Acme', email: 'team@acme.co', ownerType: 'company', rewardMode: 'cash' }),
    /company_personal_cash_forbidden/,
  );
  assert.throws(
    () => referrals.createReferral({ name: 'Alex Credit', email: 'alex-credit@real.co', ownerType: 'individual', rewardMode: 'company_credit' }),
    /individual_cash_only/,
  );

  const token = new URL(individual.links.universal).searchParams.get('referral');
  const selfReferral = referrals.recordReferralSubmission({
    token,
    submissionId: 'sub-self-referral',
    form: 'engineer-join',
    eligible: true,
    subjectKey: 'talent:alex@referrals.co',
  });
  assert.equal(selfReferral.reason, 'self_referral_forbidden', 'a referrer cannot claim their own talent profile');
  const { ingestSubmission } = await import(`./demigod-submissions-lib.mjs?referral-hook=${Date.now()}`);
  const hookedBody = {
    name: 'engineer-join',
    sourceSubmissionId: 'webflow-referral-hook-1',
    data: {
      referral: token,
      'full-name': 'Hook Candidate',
      'seeker-email': 'hook@real.co',
      'skills-stack': 'Operations and finance',
      experience: 'Built the operating model',
      'sf-bay': 'yes',
      availability: 'now',
      'salary-expectation': '$170–190k base',
      resume: 'https://files.example.net/hook.pdf',
    },
  };
  const hooked = ingestSubmission(hookedBody);
  assert.equal(hooked.referral.attached, true, 'central form ingest attaches a registered link');
  assert.equal(ingestSubmission(hookedBody).reused, true, 'provider replay reuses the submission and claim');
  const directFirst = ingestSubmission({
    ...hookedBody,
    sourceSubmissionId: 'webflow-direct-first',
    data: {
      ...hookedBody.data,
      referral: undefined,
      'full-name': 'Direct First',
      'seeker-email': 'direct-first@real.co',
    },
  });
  assert.equal(directFirst.record.status, 'new');
  assert.equal(directFirst.directSource.recorded, true, 'accepted direct intake reserves direct attribution');
  assert.equal(referrals.recordReferralSubmission({
    token,
    submissionId: 'manual-referral-after-direct-window',
    form: 'engineer-join',
    eligible: true,
    subjectKey: 'talent:direct-first@real.co',
  }).reason, 'subject_already_direct', 'direct attribution survives beyond inbox dedupe behavior');
  const referredAfterDirect = ingestSubmission({
    ...hookedBody,
    sourceSubmissionId: 'webflow-referral-after-direct',
    data: {
      ...hookedBody.data,
      referral: token,
      'full-name': 'Direct First',
      'seeker-email': 'direct-first@real.co',
    },
  });
  assert.equal(referredAfterDirect.record.status, 'updated');
  assert.equal(referredAfterDirect.referral.attached, false, 'real intake dedupe keeps an earlier direct applicant direct');
  assert.deepEqual(
    referrals.recordReferralSubmission({ token: 'forged', submissionId: 'sub-forged', form: 'engineer-join', eligible: true, subjectKey: 'talent:forged@real.co' }),
    { attached: false, reason: 'referral_code_invalid' },
  );
  assert.equal(referrals.recordReferralSubmission({
    token,
    submissionId: 'sub-valid-after-forged',
    form: 'engineer-join',
    eligible: true,
    subjectKey: 'talent:forged@real.co',
  }).reason, 'subject_already_direct', 'a forged referral cannot leave an eligible direct subject claimable later');
  const revoked = referrals.createReferral({
    name: 'Revoked Referrer',
    email: 'revoked@referrals.co',
    ownerType: 'individual',
  });
  const revokedToken = new URL(revoked.links.universal).searchParams.get('referral');
  referrals.revokeReferral(revoked.linkId, { reason: 'regression test', reviewed: true });
  assert.equal(referrals.recordReferralSubmission({
    token: revokedToken,
    submissionId: 'sub-revoked-first',
    form: 'engineer-join',
    eligible: true,
    subjectKey: 'talent:revoked-first@real.co',
  }).reason, 'referral_code_unknown_or_revoked');
  assert.equal(referrals.recordReferralSubmission({
    token,
    submissionId: 'sub-valid-after-revoked',
    form: 'engineer-join',
    eligible: true,
    subjectKey: 'talent:revoked-first@real.co',
  }).reason, 'subject_already_direct', 'a revoked referral cannot leave an eligible direct subject claimable later');
  const attached = referrals.recordReferralSubmission({
    token,
    submissionId: 'sub-talent-1',
    form: 'engineer-join',
    at: '2026-01-01T12:00:00.000Z',
    eligible: true,
    subjectKey: 'talent:candidate@real.co',
  });
  assert.equal(attached.attached, true);
  assert.equal(referrals.recordReferralSubmission({
    token,
    submissionId: 'sub-talent-1',
    form: 'engineer-join',
    eligible: true,
    subjectKey: 'talent:candidate@real.co',
  }).reused, true);
  const competing = referrals.createReferral({
    name: 'Jordan Lee',
    email: 'jordan@referrals.co',
    ownerType: 'individual',
  });
  const competingToken = new URL(competing.links.universal).searchParams.get('referral');
  assert.equal(referrals.recordReferralSubmission({
    token: competingToken,
    submissionId: 'sub-self-via-competing-link',
    form: 'engineer-join',
    eligible: true,
    subjectKey: 'talent:alex@referrals.co',
  }).reason, 'subject_already_direct', 'a blocked self-referral remains unavailable to another referrer');
  assert.equal(referrals.recordReferralSubmission({
    token: competingToken,
    submissionId: 'sub-talent-duplicate',
    form: 'engineer-join',
    eligible: true,
    subjectKey: 'talent:candidate@real.co',
  }).duplicateOf, attached.claimId, 'the first completed submission wins across competing links');
  assert.equal(referrals.recordReferralSubmission({
    token,
    submissionId: 'sub-direct-prior',
    form: 'engineer-join',
    eligible: false,
    subjectKey: 'talent:direct@real.co',
  }).attached, false);
  const malformedAt = referrals.recordReferralSubmission({
    token,
    submissionId: 'sub-malformed-at',
    form: 'engineer-join',
    at: '2026-01-01-not-a-timestamp',
    eligible: true,
    subjectKey: 'talent:malformed-at@real.co',
  });
  assert.equal(malformedAt.attached, true, 'malformed provider timestamps fall back instead of losing the submission');
  assert.equal(Number.isNaN(Date.parse(referrals.loadReferrals().claims[malformedAt.claimId].submittedAt)), false);

  assert.throws(() => referrals.qualifyClaim(attached.claimId, {
    evidence: claimProof,
    confirmedSubject: true,
    confirmedReferrer: true,
    checkedConflicts: true,
  }), /referrer_not_approved/);
  assert.throws(() => referrals.approveReferral(individual.linkId, { evidence: agreement, reviewed: true }), /payout_beneficiary_required/);
  referrals.approveReferral(individual.linkId, { evidence: agreement, beneficiaryId: 'acct_alex', reviewed: true });
  assert.equal(referrals.approveReferral(individual.linkId, {
    evidence: agreement,
    beneficiaryId: 'acct_alex',
    reviewed: true,
  }).reused, true);
  assert.throws(() => referrals.approveReferral(individual.linkId, {
    evidence: otherAgreement,
    beneficiaryId: 'acct_alex',
    reviewed: true,
  }), /approval_replay_conflict/);
  referrals.qualifyClaim(attached.claimId, {
    evidence: claimProof,
    confirmedSubject: true,
    confirmedReferrer: true,
    checkedConflicts: true,
  });
  assert.equal(referrals.qualifyClaim(attached.claimId, {
    evidence: claimProof,
    confirmedSubject: true,
    confirmedReferrer: true,
    checkedConflicts: true,
  }).reused, true);
  assert.throws(() => referrals.qualifyClaim(attached.claimId, {
    evidence: otherClaimProof,
    confirmedSubject: true,
    confirmedReferrer: true,
    checkedConflicts: true,
  }), /qualification_replay_conflict/);
  const expired = referrals.recordReferralSubmission({
    token,
    submissionId: 'sub-expired-before-hire',
    form: 'engineer-join',
    eligible: true,
    subjectKey: 'talent:expired@real.co',
  });
  referrals.qualifyClaim(expired.claimId, {
    evidence: expiredClaimProof,
    confirmedSubject: true,
    confirmedReferrer: true,
    checkedConflicts: true,
  });
  const expiredStore = referrals.loadReferrals();
  expiredStore.claims[expired.claimId].expiresAt = '2000-01-01T00:00:00.000Z';
  fs.writeFileSync(storePath, JSON.stringify(expiredStore), { mode: 0o600 });
  assert.throws(() => referrals.confirmHire(expired.claimId, { startDate: '2026-01-01', evidence: hireProof }), /claim_expired/);
  assert.equal(referrals.referralStatus().claims.find((row) => row.claimId === expired.claimId).state, 'expired');
  const afterExpiry = referrals.recordReferralSubmission({
    token: competingToken,
    submissionId: 'sub-after-expired-claim',
    form: 'engineer-join',
    at: '2026-07-21T00:00:00.000Z',
    eligible: true,
    subjectKey: 'talent:expired@real.co',
  });
  assert.equal(afterExpiry.attached, true, 'an expired claim cannot reserve attribution forever');
  assert.equal(afterExpiry.linkId, competing.linkId, 'post-expiry attribution binds only to the new link');
  fs.appendFileSync(expiredClaimProof, 'tampered\n');
  assert.equal(referrals.referralStatus().claims.find((row) => row.claimId === expired.claimId).state, 'needs_evidence');
  fs.writeFileSync(expiredClaimProof, 'expired-claim-consent\n', { mode: 0o600 });

  referrals.voidClaim(malformedAt.claimId, {
    reason: 'Duplicate identity confirmed',
    evidence: voidProof,
    reviewed: true,
  });
  assert.equal(referrals.referralStatus().claims.find((row) => row.claimId === malformedAt.claimId).state, 'void');
  fs.appendFileSync(voidProof, 'tampered\n');
  assert.equal(referrals.referralStatus().claims.find((row) => row.claimId === malformedAt.claimId).state, 'needs_evidence');
  fs.writeFileSync(voidProof, 'void\n', { mode: 0o600 });

  const leads = {
    talent: [{
      id: 'talent-1',
      joinedSubmissionId: 'sub-talent-1',
      pairIds: [pairOneId],
      state: 'mutual_yes',
      stateHistory: [],
    }],
    partners: [{
      id: 'company-1',
      companyId: 'company-1',
      pairIds: [pairOneId],
      state: 'interviewing',
      stateHistory: [],
    }],
  };
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.throws(() => referrals.confirmHire(attached.claimId, { startDate: '2025-12-31', evidence: hireProof }), /referral_cannot_postdate_hire/);
  assert.throws(() => referrals.confirmHire(attached.claimId, { startDate: '2026-01-01', evidence: hireProof }), /canonical_hire_state_required/);
  leads.partners[0].state = 'hired';
  leads.partners[0].stateHistory.push({ to: 'hired', pairId: 'wrong-pair', at: '2026-01-01T11:00:00.000Z', evidence: hireProof });
  leads.talent[0].state = 'hired';
  leads.talent[0].stateHistory.push({ to: 'hired', pairId: pairOneId, at: '2026-01-01T13:00:00.000Z', evidence: hireProof });
  pairs.pairs[pairOneId] = mutualPair(pairOneId, 'role-1', 'candidate-1');
  writePairs();
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.throws(() => referrals.confirmHire(attached.claimId, {
    startDate: '2026-01-01',
    evidence: hireProof,
  }), /canonical_mutual_hire_pair_required/, 'explicit evidence cannot bypass pair-bound canonical hire evidence');
  leads.partners[0].stateHistory[0].pairId = pairOneId;
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.throws(() => referrals.confirmHire(attached.claimId, {
    startDate: '2026-01-01',
    evidence: otherHireProof,
  }), /canonical_mutual_hire_pair_required/, 'pair-bound hire history cannot predate the referral');
  leads.partners[0].stateHistory[0].at = '2026-01-01T13:00:00.000Z';
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  pairs.pairs[pairOneId].pairId = 'badbadbadbadbad1';
  writePairs();
  assert.throws(() => referrals.confirmHire(attached.claimId, {
    startDate: '2026-01-01',
    evidence: otherHireProof,
  }), /canonical_mutual_hire_pair_required/, 'a forged raw pair record cannot validate a reward');
  pairs.pairs[pairOneId].pairId = pairOneId;
  writePairs();
  const eligibleBoard = fs.readFileSync(boardPath, 'utf8');
  fs.writeFileSync(boardPath, JSON.stringify({
    roles: JSON.parse(eligibleBoard).roles.filter((role) => role.id !== 'role-1'),
    candidates: [],
  }), { mode: 0o600 });
  assert.throws(() => referrals.confirmHire(attached.claimId, {
    startDate: '2026-01-01',
    evidence: otherHireProof,
  }), /canonical_mutual_hire_pair_required/, 'a revoked role cannot validate a referral reward');
  fs.writeFileSync(boardPath, eligibleBoard, { mode: 0o600 });
  const consentReceipts = pairs.pairs[pairOneId].history;
  pairs.pairs[pairOneId].history = [];
  writePairs();
  assert.throws(() => referrals.confirmHire(attached.claimId, {
    startDate: '2026-01-01',
    evidence: otherHireProof,
  }), /canonical_mutual_hire_pair_required/, 'mutual booleans without both consent receipts cannot validate a reward');
  pairs.pairs[pairOneId].history = consentReceipts;
  writePairs();
  const hire = referrals.confirmHire(attached.claimId, { startDate: '2026-01-01', evidence: otherHireProof });
  assert.equal(hire.day90, '2026-04-01');
  const linkedStore = referrals.loadReferrals();
  linkedStore.claims[attached.claimId].expiresAt = '2000-01-01T00:00:00.000Z';
  fs.writeFileSync(storePath, JSON.stringify(linkedStore), { mode: 0o600 });
  assert.equal(referrals.recordReferralSubmission({
    token: competingToken,
    submissionId: 'sub-after-linked-claim-expiry',
    form: 'engineer-join',
    at: '2026-07-21T00:00:00.000Z',
    eligible: true,
    subjectKey: 'talent:candidate@real.co',
  }).duplicateOf, attached.claimId, 'a placement-linked claim keeps attribution after its nominal expiry');
  assert.equal(referrals.confirmHire(attached.claimId, { startDate: '2026-01-01' }).reused, true);
  assert.equal(referrals.confirmHire(attached.claimId, {
    startDate: '2026-01-01',
    evidence: otherHireProof,
  }).reused, true);
  assert.throws(() => referrals.confirmHire(attached.claimId, {
    startDate: '2026-01-01',
    evidence: hireProof,
  }), /hire_confirmation_conflict/);
  leads.partners[0].stateHistory[0].evidence = null;
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.equal(referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId).state, 'needs_evidence');
  leads.partners[0].stateHistory[0].evidence = hireProof;
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.throws(() => referrals.confirmHire(attached.claimId, { startDate: '2026-01-02' }), /hire_confirmation_conflict/);
  assert.throws(() => referrals.confirmRetention(hire.rewardId, { asOf: '2026-03-31', evidence: retentionProof }), /day_90_not_reached/);
  assert.throws(() => referrals.confirmRetention(hire.rewardId, { asOf: '2026-04-01' }), /retention_evidence_required/);
  referrals.confirmRetention(hire.rewardId, { asOf: '2026-04-01', evidence: retentionProof });
  assert.equal(referrals.confirmRetention(hire.rewardId, {
    asOf: '2026-04-01',
    evidence: retentionProof,
  }).reused, true);
  assert.throws(() => referrals.confirmRetention(hire.rewardId, {
    asOf: '2026-04-01',
    evidence: otherRetentionProof,
  }), /retention_replay_conflict/);
  assert.equal(referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId).state, 'waiting_for_fee');

  leads.partners[0].state = 'paid';
  leads.partners[0].stateHistory.push(
    { to: 'invoiced', pairId: 'wrong-pair', at: '2026-01-02T12:00:00.000Z', evidence: invoiceProof, feeCents: 9_000_000 },
    { to: 'invoiced', pairId: pairOneId, at: '2026-01-02T13:00:00.000Z', evidence: invoiceProof, feeCents: 1_500_000 },
    { to: 'paid', pairId: 'wrong-pair', at: '2026-01-03T12:00:00.000Z', evidence: paidProof },
  );
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.equal(referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId).state, 'waiting_for_fee');
  leads.partners[0].stateHistory.at(-1).pairId = pairOneId;
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.equal(referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId).state, 'waiting_for_fee');
  leads.partners[0].stateHistory.at(-1).feeCents = 1_000_000;
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.equal(referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId).state, 'waiting_for_fee');
  assert.throws(() => referrals.settleReward(hire.rewardId, {
    kind: 'cash', amountCents: 300_000, evidence: payoutProof, observed: true,
    providerId: 'tr_test_unpriced', beneficiaryId: 'acct_alex',
  }), /reward_not_eligible:waiting_for_fee/);
  leads.partners[0].stateHistory.at(-1).feeCents = 1_500_000;
  const cashInvoiceForChronology = leads.partners[0].stateHistory.find((row) => row.to === 'invoiced' && row.pairId === pairOneId);
  const cashPaymentForChronology = leads.partners[0].stateHistory.at(-1);
  cashInvoiceForChronology.at = '2026-01-01T12:30:00.000Z';
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.equal(referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId).state, 'waiting_for_fee');
  cashInvoiceForChronology.at = '2026-01-02T13:00:00.000Z';
  cashPaymentForChronology.at = '2026-01-02T12:00:00.000Z';
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.equal(referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId).state, 'waiting_for_fee');
  cashPaymentForChronology.at = '2026-01-03T12:00:00.000Z';
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  const earnedCash = referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId);
  assert.equal(earnedCash.state, 'eligible');
  assert.equal(earnedCash.amountCents, 300_000, '20% of a 1,500,000-cent retained fee');
  assert.throws(() => referrals.settleReward(hire.rewardId, { kind: 'cash', evidence: payoutProof }), /settlement_attestation_required/);
  assert.throws(() => referrals.settleReward(hire.rewardId, {
    kind: 'cash',
    amountCents: 299_999,
    evidence: payoutProof,
    observed: true,
    providerId: 'tr_test_wrong_amount',
    beneficiaryId: 'acct_alex',
  }), /settlement_amount_mismatch/);
  const paid = referrals.settleReward(hire.rewardId, {
    kind: 'cash',
    amountCents: 300_000,
    evidence: payoutProof,
    observed: true,
    providerId: 'tr_test_1',
    beneficiaryId: 'acct_alex',
  });
  assert.equal(paid.settlement.amountCents, 300_000);
  assert.equal(referrals.settleReward(hire.rewardId, {
    kind: 'cash',
    amountCents: 300_000,
    evidence: payoutProof,
    observed: true,
    providerId: 'tr_test_1',
    beneficiaryId: 'acct_alex',
  }).reused, true);
  assert.throws(() => referrals.settleReward(hire.rewardId, {
    kind: 'cash',
    amountCents: 300_000,
    evidence: payoutProof,
    observed: true,
    providerId: 'tr_test_conflict',
    beneficiaryId: 'acct_alex',
  }), /settlement_replay_conflict/);
  fs.appendFileSync(payoutProof, 'tampered\n');
  assert.equal(referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId).state, 'needs_evidence');
  fs.writeFileSync(payoutProof, 'payout\n', { mode: 0o600 });
  assert.equal(referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId).state, 'paid');
  fs.appendFileSync(invoiceProof, 'tampered\n');
  assert.equal(referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId).state, 'needs_evidence');
  fs.writeFileSync(invoiceProof, 'invoice\n', { mode: 0o600 });
  const pairInvoice = leads.partners[0].stateHistory.find((row) => row.to === 'invoiced' && row.pairId === pairOneId);
  pairInvoice.feeCents = 1_000_000;
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.equal(referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId).state, 'needs_evidence');
  pairInvoice.feeCents = 1_500_000;
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.equal(referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId).state, 'paid');
  const pairPayment = leads.partners[0].stateHistory.find((row) => row.to === 'paid' && row.pairId === pairOneId);
  pairPayment.feeCents = 1_000_000;
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.equal(referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId).state, 'needs_evidence');
  pairPayment.feeCents = 1_500_000;
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.equal(referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId).state, 'paid');
  leads.partners[0].invoiceStatus = 'refunded acct_secret_123';
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  const boundedReversal = referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId);
  assert.equal(boundedReversal.reversal, 'invoice_refund');
  assert.equal(JSON.stringify(boundedReversal).includes('acct_secret_123'), false);
  delete leads.partners[0].invoiceStatus;
  leads.partners[0].feeCents = 1_000_000;
  leads.partners[0].refundAt = '2026-04-03T12:00:00.000Z';
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  const reversalNeeded = referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId);
  assert.equal(reversalNeeded.state, 'needs_reversal');
  assert.equal(reversalNeeded.amountCents, 300_000, 'post-settlement fee edits cannot rewrite the observed amount');
  assert.throws(() => referrals.recordRewardReversal(hire.rewardId, {
    reason: 'Client invoice refunded',
    evidence: reversalProof,
  }), /reversal_attestation_required/);
  referrals.recordRewardReversal(hire.rewardId, {
    reason: 'Client invoice refunded',
    amountCents: 300_000,
    evidence: reversalProof,
    observed: true,
    providerId: 'trr_test_1',
  });
  assert.equal(referrals.referralStatus().rewards.find((row) => row.rewardId === hire.rewardId).state, 'reversed');
  assert.ok(referrals.loadReferrals().rewards[hire.rewardId].settlement, 'reversal preserves the original settlement receipt');
  assert.equal(referrals.recordRewardReversal(hire.rewardId, {
    reason: 'Client invoice refunded',
    amountCents: 300_000,
    evidence: reversalProof,
    observed: true,
    providerId: 'trr_test_1',
  }).reused, true);
  assert.throws(() => referrals.recordRewardReversal(hire.rewardId, {
    reason: 'Different reason',
    amountCents: 300_000,
    evidence: reversalProof,
    observed: true,
    providerId: 'trr_test_conflict',
  }), /reversal_replay_conflict/);

  const company = referrals.createReferral({
    name: 'Acme Hiring',
    email: 'team@acme.co',
    ownerType: 'company',
    companyId: 'company-referrer',
  });
  assert.equal(company.rewardMode, 'company_credit');
  assert.throws(() => referrals.createReferral({
    name: 'Acme Hiring',
    email: 'team@acme.co',
    ownerType: 'company',
    companyId: 'different-company',
  }), /company_id_conflict/);
  const companyToken = new URL(company.links.universal).searchParams.get('referral');
  const companyClaim = referrals.recordReferralSubmission({
    token: companyToken,
    submissionId: 'sub-company-1',
    form: 'startup-hire',
    at: '2026-01-02T12:00:00.000Z',
    eligible: true,
    subjectKey: 'company:introduced startup',
  });
  assert.throws(() => referrals.approveReferral(company.linkId, {
    evidence: agreement,
    reviewed: true,
  }), /company_verification_attestation_required/);
  assert.throws(() => referrals.approveReferral(company.linkId, {
    evidence: agreement,
    reviewed: true,
    verifiedCompany: true,
  }), /company_not_canonical/);
  leads.partners.push({ id: 'company-referrer', companyId: 'company-referrer', state: 'approved', pairIds: [] });
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  referrals.approveReferral(company.linkId, { evidence: agreement, reviewed: true, verifiedCompany: true });
  referrals.qualifyClaim(companyClaim.claimId, {
    evidence: claimProof,
    confirmedSubject: true,
    confirmedReferrer: true,
    checkedConflicts: true,
  });
  leads.partners.push({
    id: 'company-2',
    companyId: 'introduced-startup-1',
    joinedSubmissionId: 'sub-company-1',
    pairIds: [pairCompanyTwoId],
    state: 'paid',
    stateHistory: [
      { to: 'hired', pairId: pairCompanyTwoId, at: '2026-01-03T12:00:00.000Z', evidence: hireProof },
      { to: 'invoiced', pairId: pairCompanyTwoId, at: '2026-01-03T13:00:00.000Z', evidence: invoiceProof, feeCents: 1_500_000 },
      { to: 'paid', pairId: pairCompanyTwoId, at: '2026-01-04T12:00:00.000Z', evidence: paidProof, feeCents: 1_500_000 },
    ],
  });
  leads.talent.push({
    id: 'talent-company-2',
    pairIds: [pairCompanyTwoId],
    state: 'hired',
    stateHistory: [{ to: 'hired', pairId: pairCompanyTwoId, at: '2026-01-03T12:00:00.000Z', evidence: hireProof }],
  });
  pairs.pairs[pairCompanyTwoId] = mutualPair(pairCompanyTwoId, 'role-company-2', 'candidate-company-2');
  writePairs();
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.throws(() => referrals.confirmHire(companyClaim.claimId, { startDate: '2026-01-03' }), /first_placement_attestation_required/);
  const companyLead = leads.partners.find((lead) => lead.id === 'company-2');
  companyLead.priorPlacementCount = 1;
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.throws(() => referrals.confirmHire(companyClaim.claimId, {
    startDate: '2026-01-03',
    firstPlacementConfirmed: true,
  }), /company_prior_placement_exists/);
  delete companyLead.priorPlacementCount;
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  const companyHire = referrals.confirmHire(companyClaim.claimId, {
    startDate: '2026-01-03',
    firstPlacementConfirmed: true,
  });
  const secondCompanyClaim = referrals.recordReferralSubmission({
    token: companyToken,
    submissionId: 'sub-company-second-name',
    form: 'startup-hire',
    at: '2026-01-02T15:00:00.000Z',
    eligible: true,
    subjectKey: 'company:introduced startup alternate name',
  });
  referrals.qualifyClaim(secondCompanyClaim.claimId, {
    evidence: claimProof,
    confirmedSubject: true,
    confirmedReferrer: true,
    checkedConflicts: true,
  });
  leads.partners.push({
    id: 'company-2-duplicate-lead',
    companyId: 'introduced-startup-1',
    joinedSubmissionId: 'sub-company-second-name',
    pairIds: [pairCompanyDuplicateId],
    state: 'paid',
    stateHistory: [
      { to: 'hired', pairId: pairCompanyDuplicateId, at: '2026-01-03T14:00:00.000Z', evidence: hireProof },
      { to: 'invoiced', pairId: pairCompanyDuplicateId, at: '2026-01-03T15:00:00.000Z', evidence: invoiceProof, feeCents: 2_000_000 },
      { to: 'paid', pairId: pairCompanyDuplicateId, at: '2026-01-04T14:00:00.000Z', evidence: paidProof, feeCents: 2_000_000 },
    ],
  });
  leads.talent.push({
    id: 'talent-company-2-duplicate',
    pairIds: [pairCompanyDuplicateId],
    state: 'hired',
    stateHistory: [{ to: 'hired', pairId: pairCompanyDuplicateId, at: '2026-01-03T14:00:00.000Z', evidence: hireProof }],
  });
  pairs.pairs[pairCompanyDuplicateId] = mutualPair(
    pairCompanyDuplicateId,
    'role-company-2-duplicate',
    'candidate-company-2-duplicate',
  );
  writePairs();
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.throws(() => referrals.confirmHire(secondCompanyClaim.claimId, {
    startDate: '2026-01-03',
    firstPlacementConfirmed: true,
  }), /company_first_placement_already_rewarded/);
  referrals.confirmRetention(companyHire.rewardId, { asOf: '2026-04-03', evidence: retentionProof });
  const earnedCredit = referrals.referralStatus().rewards.find((row) => row.rewardId === companyHire.rewardId);
  assert.equal(earnedCredit.state, 'eligible');
  assert.equal(earnedCredit.amountCents, 150_000, 'company gets a 10% invoice credit');
  companyLead.creditNoteAt = '2026-04-04T12:00:00.000Z';
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.equal(referrals.referralStatus().rewards.find((row) => row.rewardId === companyHire.rewardId).state, 'blocked_reversal');
  delete companyLead.creditNoteAt;
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.throws(() => referrals.settleReward(companyHire.rewardId, {
    kind: 'cash',
    amountCents: 150_000,
    evidence: payoutProof,
    observed: true,
    providerId: 'cash_wrong_kind',
    beneficiaryId: 'company-referrer',
  }), /settlement_mode_mismatch/);
  assert.throws(() => referrals.settleReward(companyHire.rewardId, {
    kind: 'credit',
    amountCents: 150_000,
    evidence: creditProof,
    observed: true,
    providerId: 'cbtxn_wrong_beneficiary',
    beneficiaryId: 'wrong-company',
  }), /settlement_beneficiary_mismatch/);
  assert.throws(() => referrals.settleReward(companyHire.rewardId, {
    kind: 'credit',
    amountCents: 150_000,
    evidence: creditProof,
    observed: true,
    providerId: 'tr_test_1',
    beneficiaryId: 'company-referrer',
  }), /provider_id_already_used/);
  referrals.settleReward(companyHire.rewardId, {
    kind: 'credit',
    amountCents: 150_000,
    evidence: creditProof,
    observed: true,
    providerId: 'cbtxn_test_1',
    beneficiaryId: 'company-referrer',
  });

  const partnerTalentClaim = referrals.recordReferralSubmission({
    token: companyToken,
    submissionId: 'sub-partner-talent-1',
    form: 'engineer-join',
    at: '2026-01-01T12:00:00.000Z',
    eligible: true,
    subjectKey: 'talent:partner-candidate@real.co',
  });
  referrals.qualifyClaim(partnerTalentClaim.claimId, {
    evidence: claimProof,
    confirmedSubject: true,
    confirmedReferrer: true,
    checkedConflicts: true,
  });
  leads.talent.push({
    id: 'talent-partner-hire',
    joinedSubmissionId: 'sub-partner-talent-1',
    pairIds: [pairPartnerHireId],
    state: 'hired',
    stateHistory: [{ to: 'hired', pairId: pairPartnerHireId, at: '2026-01-01T13:00:00.000Z', evidence: hireProof }],
  });
  leads.partners.push({
    id: 'wrong-hiring-company',
    companyId: 'wrong-hiring-company',
    pairIds: [pairPartnerHireId],
    state: 'paid',
    stateHistory: [
      { to: 'hired', pairId: pairPartnerHireId, at: '2026-01-01T13:00:00.000Z', evidence: hireProof },
      { to: 'invoiced', pairId: pairPartnerHireId, at: '2026-01-02T12:00:00.000Z', evidence: invoiceProof, feeCents: 1_500_000 },
      { to: 'paid', pairId: pairPartnerHireId, at: '2026-01-03T12:00:00.000Z', evidence: paidProof, feeCents: 1_500_000 },
    ],
  });
  pairs.pairs[pairPartnerHireId] = mutualPair(pairPartnerHireId, 'role-partner-hire', 'candidate-partner-hire');
  writePairs();
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  assert.throws(() => referrals.confirmHire(partnerTalentClaim.claimId, { startDate: '2026-01-01' }), /hiring_partner_must_match_billing_company/);
  leads.partners.at(-1).pairIds = [];
  const referrerCompany = leads.partners.find((lead) => lead.id === 'company-referrer');
  Object.assign(referrerCompany, {
    pairIds: [pairPartnerHireId],
    state: 'paid',
    stateHistory: [
      { to: 'hired', pairId: pairPartnerHireId, at: '2026-01-01T13:00:00.000Z', evidence: hireProof },
      { to: 'invoiced', pairId: pairPartnerHireId, at: '2026-01-02T12:00:00.000Z', evidence: invoiceProof, feeCents: 1_500_000 },
      { to: 'paid', pairId: pairPartnerHireId, at: '2026-01-03T12:00:00.000Z', evidence: paidProof, feeCents: 1_500_000 },
    ],
  });
  fs.writeFileSync(leadsPath, JSON.stringify(leads), { mode: 0o600 });
  const partnerHire = referrals.confirmHire(partnerTalentClaim.claimId, { startDate: '2026-01-01' });
  referrals.confirmRetention(partnerHire.rewardId, { asOf: '2026-04-01', evidence: retentionProof });
  const partnerCredit = referrals.referralStatus().rewards.find((row) => row.rewardId === partnerHire.rewardId);
  assert.equal(partnerCredit.state, 'eligible');
  assert.equal(partnerCredit.mode, 'company_credit');
  assert.equal(partnerCredit.amountCents, 150_000, 'a hiring partner earns a company credit when its link-sourced candidate is retained');

  const inboxRows = [
    {
      id: 'sub-talent-1',
      at: '2026-01-01T12:00:00.000Z',
      form: 'engineer-join',
      status: 'reviewed',
      raw: {
        referral: token,
        'full-name': 'Candidate One',
        'seeker-email': 'candidate@real.co',
        'skills-stack': 'Product design',
        experience: 'Shipped a product',
        'sf-bay': 'yes',
        availability: 'now',
        'salary-expectation': '$170–190k base',
        resume: 'https://files.example.net/resume.pdf',
      },
    },
    {
      id: 'sub-late-direct',
      at: '2026-01-03T12:00:00.000Z',
      form: 'engineer-join',
      status: 'updated',
      supersedes: 'sub-direct-original',
      raw: { referral: token, 'seeker-email': 'direct@real.co' },
    },
    {
      id: 'sub-partner-form',
      at: '2026-01-04T12:00:00.000Z',
      form: 'partner-apply',
      status: 'new',
      raw: { referral: token, 'partner-email': 'partner@real.co' },
    },
    ...['rejected', 'spam'].map((status) => ({
      id: `sub-${status}`,
      at: '2026-01-05T12:00:00.000Z',
      form: 'engineer-join',
      status,
      raw: { referral: token, 'seeker-email': `${status}@real.co` },
    })),
    {
      id: 'sub-synthetic',
      at: '2026-01-06T12:00:00.000Z',
      form: 'engineer-join',
      status: 'new',
      raw: {
        referral: token,
        'full-name': 'Synthetic Person',
        'seeker-email': 'synthetic@example.com',
        'skills-stack': 'Operations',
        experience: 'Built systems',
        'sf-bay': 'yes',
        availability: 'passive',
        'salary-expectation': '$150–175k base',
        resume: 'https://files.example.net/synthetic.pdf',
      },
    },
  ];
  fs.writeFileSync(inboxPath, JSON.stringify({ items: inboxRows }), { mode: 0o600 });
  fs.writeFileSync(`${inboxPath}.archive.jsonl`, `${JSON.stringify({
    id: 'sub-archived-referral',
    at: '2026-01-07T12:00:00.000Z',
    form: 'engineer-join',
    status: 'reviewed',
    raw: {
      referral: token,
      'full-name': 'Archived Candidate',
      'seeker-email': 'archived@real.co',
      'skills-stack': 'Sales and operations',
      experience: 'Built a revenue function',
      'sf-bay': 'yes',
      availability: '2-4w',
      'salary-expectation': '$160–190k base',
      resume: 'https://files.example.net/archived.pdf',
    },
  })}\n`, { mode: 0o600 });
  const beforeSync = referrals.loadReferrals();
  const sync = await referrals.syncReferralInbox();
  assert.equal(sync.referralRows, 7);
  assert.equal(
    Object.keys(referrals.loadReferrals().claims).length,
    Object.keys(beforeSync.claims).length + 1,
    'sync repairs an archived missed referral without reviving direct-prior or rejected rows',
  );

  const report = referrals.referralStatus({ write: true });
  assert.ok(report.summary.duplicateAttempts >= 1);
  const serialized = JSON.stringify(report);
  for (const secret of ['Alex Rivera', 'alex@referrals.co', token, 'Revoked Referrer', 'revoked@referrals.co', revokedToken, 'Jordan Lee', 'jordan@referrals.co', competingToken, 'Acme Hiring', 'team@acme.co', companyToken, 'Candidate One']) {
    assert.equal(serialized.includes(secret), false, `redacted status excludes ${secret}`);
  }
  assert.equal(fs.statSync(storePath).mode & 0o777, 0o600);
  assert.equal(fs.statSync(statusPath).mode & 0o777, 0o600);
});
