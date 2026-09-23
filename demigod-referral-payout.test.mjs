import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE_CENTS = 18_000_000;
const FEE_CENTS = 1_800_000;
const TALENT_PORTION_CENTS = 360_000;
const PARTNER_CREDIT_CENTS = 180_000;
const HIRE_COMP_DOLLARS = 200_000;
const HIRE_BASE_CENTS = 20_000_000;
const HIRE_FEE_CENTS = 2_000_000;
const HIRE_TALENT_PORTION_CENTS = 400_000;
const HIRE_PARTNER_CREDIT_CENTS = 200_000;

function assertPayoutHandoff(dir, pairId, talentId, partnerId, decoyIds = []) {
  const file = path.join(dir, 'DEMIGOD-PLACEMENT-PAYOUTS.json');
  assert.equal(fs.existsSync(file), true, 'match did not hand off to the placement payout entry point');
  const store = JSON.parse(fs.readFileSync(file, 'utf8'));
  const payout = (store.records || []).find((row) => row.pairId === pairId);
  assert.ok(payout, 'placement payout record missing for the match');
  assert.equal(payout.status, 'completed_local');
  assert.equal(payout.dryRun, true);
  assert.equal(payout.livePayment, false);
  assert.equal(payout.paymentProvider, null);
  assert.equal(payout.payable, false);
  assert.equal(payout.baseSalaryCents, BASE_CENTS);
  assert.equal(payout.feeCents, FEE_CENTS);
  const talentLine = (payout.lines || []).find((row) => row.submissionId === talentId);
  const partnerLine = (payout.lines || []).find((row) => row.submissionId === partnerId);
  assert.ok(talentLine, 'talent fee-share was not handed to the payout record');
  assert.ok(partnerLine, 'hiring-partner company credit was not handed to the payout record');
  assert.equal(talentLine.rewardMode, 'fee_share');
  assert.equal(talentLine.personalCash, true);
  assert.equal(talentLine.portionCents, TALENT_PORTION_CENTS);
  assert.equal(partnerLine.rewardMode, 'company_credit');
  assert.equal(partnerLine.personalCash, false);
  assert.equal(partnerLine.portionCents, PARTNER_CREDIT_CENTS);
  for (const id of decoyIds) {
    assert.equal((payout.lines || []).some((row) => row.submissionId === id), false);
  }
}

describe('referral payout portions', { concurrency: 1 }, () => {
test('third-party talent and hiring-partner submits owe a match portion and do not pay', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-referral-'));
  const priorRoot = process.env.DEMIGOD_ROOT;
  process.env.DEMIGOD_ROOT = dir;
  const calls = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => {
    calls.push(String(args[0]));
    throw new Error('live_payment');
  };
  const preload = path.join(dir, 'no-live-pay.mjs');
  fs.writeFileSync(preload, 'globalThis.fetch = async () => { throw new Error("live_payment"); };\n');
  t.after(() => {
    globalThis.fetch = origFetch;
    if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
    else process.env.DEMIGOD_ROOT = priorRoot;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const { ingestSubmission, loadInbox } = await import('./demigod-submissions-lib.mjs');
  const { suggestMatches } = await import('./demigod-matching-engine.mjs');
  const stamp = Date.now();
  const submitterEmail = `riley.chen.${stamp}@baymail.co`;
  const decoySubmitter = `sam.hollis.${stamp}@elsewhere.co`;
  const talentName = 'Mina Alvarez';
  const talentEmail = `mina.alvarez.${stamp}@baymail.co`;
  const partnerOrg = 'Other Co';
  const decoyOrg = 'North Pier';
  const roleTitle = 'Founding Engineer';
  const decoyRole = ingestSubmission({
    name: 'startup-hire',
    data: {
      'company-name': decoyOrg,
      'contact-email': `founder.${stamp}@northpier.co`,
      'role-title': roleTitle,
      'stack-needs': 'Rust, compilers',
      'salary-range': '$90-110k',
      'company-stage': 'Seed',
    },
  });
  const decoyPartner = ingestSubmission({
    name: 'partner-apply',
    data: {
      'submitted-by': decoySubmitter,
      'submitted-by-name': 'Sam Hollis',
      'partner-type': 'vc',
      'partner-name': decoyOrg,
      'partner-email': `north.pier.${stamp}@bayseed.co`,
      'partner-org': decoyOrg,
      'referral-plan': 'Introduces one portfolio company at a time',
    },
  });
  const decoyTalent = ingestSubmission({
    name: 'engineer-join',
    data: {
      'submitted-by': decoySubmitter,
      'submitted-by-name': 'Sam Hollis',
      'full-name': talentName,
      'seeker-email': `mina.other.${stamp}@elsewhere.co`,
      'skills-stack': 'Rust, compilers',
      experience: 'Wrote a compiler pass',
      'sf-bay': 'no',
      availability: 'later',
      'salary-expectation': '$90k',
    },
  });
  const talent = ingestSubmission({
    name: 'engineer-join',
    data: {
      'submitted-by': submitterEmail,
      'submitted-by-name': 'Riley Chen',
      'full-name': talentName,
      'seeker-email': talentEmail,
      'skills-stack': 'JavaScript, activation work',
      experience: 'Led an activation rebuild',
      'sf-bay': 'yes',
      availability: 'now',
      'salary-expectation': '$180k',
    },
  });
  const partner = ingestSubmission({
    name: 'partner-apply',
    data: {
      'submitted-by': submitterEmail,
      'submitted-by-name': 'Riley Chen',
      'partner-type': 'angel',
      'partner-name': partnerOrg,
      'partner-email': `other.co.${stamp}@otherco.co`,
      'partner-org': partnerOrg,
      'referral-plan': 'Introduces the company that owns this role',
    },
  });

  const inbox = loadInbox();
  const talentRow = (inbox.items || []).find((item) => item.id === talent.record?.id);
  const partnerRow = (inbox.items || []).find((item) => item.id === partner.record?.id);
  assert.ok(talentRow, 'third-party talent submit did not land');
  assert.ok(partnerRow, 'third-party hiring-partner submit did not land');
  assert.equal(talentRow.raw['salary-expectation'], '$180k');
  assert.equal(partnerRow.attribution?.submitterEmail, submitterEmail);
  assert.equal(talentRow.attribution?.subjectKind, 'talent');
  assert.equal(partnerRow.attribution?.subjectKind, 'hiring_partner');
  assert.equal(decoyRole.record?.status, 'new');
  assert.equal(decoyPartner.record?.attribution?.submitterEmail, decoySubmitter);
  assert.equal(decoyTalent.record?.attribution?.submitterEmail, decoySubmitter);
  assert.equal(decoyTalent.record?.raw?.['full-name'], talentName);

  const boardRoleId = `role-board-${stamp}`;
  fs.writeFileSync(path.join(dir, 'DEMIGOD-BOARD.json'), JSON.stringify({
    at: new Date().toISOString(),
    roles: [{
      id: boardRoleId,
      title: roleTitle,
      company: partnerOrg,
      stageType: 'Seed · SF startup',
      skills: 'JavaScript',
      status: 'Active',
      featuredAt: new Date().toISOString(),
    }],
    candidates: [],
  }, null, 2));

  const suggested = suggestMatches(boardRoleId, { propose: true, limit: 1 });
  const suggestedPair = suggested.proposed?.find((row) => row.candId === talent.record.id && !row.error);
  assert.ok(suggestedPair, 'suggestMatches did not propose the submitted talent');
  assert.equal(suggestedPair.pairId == null, false);
  const { getPair } = await import('./demigod-pairs-lib.mjs');
  const boardPair = getPair(suggestedPair.pairId);
  assert.equal(boardPair.roleId, boardRoleId);
  assert.notEqual(boardPair.roleId, partner.record.id);

  const pilotId = `pilot-other-${stamp}`;
  fs.writeFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), JSON.stringify({
    at: new Date().toISOString(),
    pilots: [{
      id: pilotId,
      company: partnerOrg,
      role: roleTitle,
      status: 'matching',
      outcome90d: 'Ship the activation rebuild',
      shortlist: [],
    }],
  }, null, 2));
  const child = spawnSync(process.execPath, [
    '--import', pathToFileURL(preload).href,
    'demigod-match.mjs',
    'add',
    pilotId,
    '--name', talentName,
    '--links', talentEmail,
    '--why', 'Activation work lines up with the role',
    '--consent',
  ], {
    cwd: path.dirname(new URL(import.meta.url).pathname),
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  const matched = JSON.parse(child.stdout);
  assert.equal(matched.ok, true);
  assert.equal(matched.pair.roleId, pilotId);
  assert.notEqual(matched.pair.candId, talent.record.id);
  assert.notEqual(matched.pair.roleId, partner.record.id);
  assert.notEqual(matched.pair.candId, partner.record.id);

  assert.equal(matched.pair.identity?.company, partnerOrg);
  assert.equal(boardPair.identity?.company, partnerOrg);
  const ledger = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-REFERRAL-LEDGER.json'), 'utf8'));
  const portions = ledger.portions || [];
  assert.equal(portions.length, 4);
  const talentPortion = portions.find((row) => row.submissionId === talent.record.id && row.pairId === matched.pair.pairId);
  const partnerPortion = portions.find((row) => row.submissionId === partner.record.id && row.pairId === matched.pair.pairId);
  const boardTalent = portions.find((row) => row.submissionId === talent.record.id && row.pairId === boardPair.pairId);
  const boardPartner = portions.find((row) => row.submissionId === partner.record.id && row.pairId === boardPair.pairId);
  for (const row of [talentPortion, partnerPortion, boardTalent, boardPartner]) {
    assert.ok(row, 'a submitted person in the match has no owed portion');
    assert.equal(row.submitterEmail, submitterEmail);
    assert.equal(row.owed, true);
    assert.equal(row.livePayment, false);
    assert.equal(row.paymentProvider, null);
    assert.equal(row.payable, false);
    assert.equal(row.feeCents, FEE_CENTS);
  }
  assert.equal(talentPortion.rewardMode, 'fee_share');
  assert.equal(talentPortion.personalCash, true);
  assert.equal(talentPortion.rateBps, 2000);
  assert.equal(talentPortion.portionCents, TALENT_PORTION_CENTS);
  assert.equal(boardTalent.portionCents, TALENT_PORTION_CENTS);
  assert.equal(partnerPortion.rewardMode, 'company_credit');
  assert.equal(partnerPortion.personalCash, false);
  assert.equal(partnerPortion.rateBps, 1000);
  assert.equal(partnerPortion.portionCents, PARTNER_CREDIT_CENTS);
  assert.equal(boardPartner.rewardMode, 'company_credit');
  assert.equal(boardPartner.portionCents, PARTNER_CREDIT_CENTS);
  for (const row of [talentPortion, partnerPortion, boardTalent, boardPartner]) {
    assert.equal(row.baseSalaryCents, BASE_CENTS);
  }
  assert.equal(suggested.proposed.length, 1);
  assert.notEqual(suggested.proposed[0].candId, decoyTalent.record.id);
  assertPayoutHandoff(dir, matched.pair.pairId, talent.record.id, partner.record.id, [decoyTalent.record.id, decoyPartner.record.id]);
  assertPayoutHandoff(dir, boardPair.pairId, talent.record.id, partner.record.id, [decoyTalent.record.id, decoyPartner.record.id]);
  for (const row of portions) {
    assert.equal(row.baseSalaryCents, BASE_CENTS);
    assert.notEqual(row.submissionId, decoyTalent.record.id);
    assert.notEqual(row.submissionId, decoyPartner.record.id);
    assert.notEqual(row.submitterEmail, decoySubmitter);
    assert.notEqual(row.baseSalaryCents, 9_000_000);
    if (row.rewardMode === 'company_credit') {
      assert.equal(row.submissionId, partner.record.id);
      assert.equal(row.portionCents, PARTNER_CREDIT_CENTS);
      assert.equal(row.personalCash, false);
    }
    if (row.rewardMode === 'fee_share') {
      assert.equal(row.submissionId, talent.record.id);
      assert.equal(row.portionCents, TALENT_PORTION_CENTS);
    }
  }
  const payouts = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PLACEMENT-PAYOUTS.json'), 'utf8'));
  for (const payout of payouts.records || []) {
    for (const line of payout.lines || []) {
      assert.notEqual(line.submissionId, decoyTalent.record.id);
      assert.notEqual(line.submissionId, decoyPartner.record.id);
      assert.notEqual(line.submitterEmail, decoySubmitter);
    }
  }
  assert.equal(calls.length, 0);
  assert.equal(String(child.stderr || '').includes('live_payment'), false);
  console.log(JSON.stringify({
    matchedCompany: matched.pair.identity.company,
    decoyCompany: decoyOrg,
    decoySalaryRange: decoyRole.record.raw['salary-range'],
    secondTalentName: decoyTalent.record.raw['full-name'],
    baseSalaryCents: talentPortion.baseSalaryCents,
    talentPortionCents: talentPortion.portionCents,
    talentRewardMode: talentPortion.rewardMode,
    partnerPortionCents: partnerPortion.portionCents,
    partnerRewardMode: partnerPortion.rewardMode,
    partnerPersonalCash: partnerPortion.personalCash,
    companyCreditSubmissionId: partnerPortion.submissionId,
    matchedPartnerSubmissionId: partner.record.id,
    decoyPortionCount: portions.filter((row) => row.submitterEmail === decoySubmitter || row.submissionId === decoyTalent.record.id || row.submissionId === decoyPartner.record.id).length,
    livePaymentCalls: calls.length,
    suggestMatchesCandId: suggested.proposed[0].candId,
    matchedTalentSubmissionId: talent.record.id,
  }));
});

test('a same-title role at another company does not set the owed portion', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-referral-scope-'));
  const priorRoot = process.env.DEMIGOD_ROOT;
  process.env.DEMIGOD_ROOT = dir;
  const calls = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => {
    calls.push(String(args[0]));
    throw new Error('live_payment');
  };
  const preload = path.join(dir, 'no-live-pay.mjs');
  fs.writeFileSync(preload, 'globalThis.fetch = async () => { throw new Error("live_payment"); };\n');
  t.after(() => {
    globalThis.fetch = origFetch;
    if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
    else process.env.DEMIGOD_ROOT = priorRoot;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const { ingestSubmission } = await import('./demigod-submissions-lib.mjs');
  const { suggestMatches } = await import('./demigod-matching-engine.mjs');
  const stamp = Date.now();
  const submitterEmail = `riley.chen.${stamp}@baymail.co`;
  const decoySubmitter = `sam.hollis.${stamp}@elsewhere.co`;
  const talentEmail = `mina.alvarez.${stamp}@baymail.co`;
  const matchedOrg = 'Other Co';
  const decoyOrg = 'North Pier';
  const roleTitle = 'Founding Engineer';

  const decoyPartner = ingestSubmission({
    name: 'partner-apply',
    data: {
      'submitted-by': decoySubmitter,
      'submitted-by-name': 'Sam Hollis',
      'partner-type': 'vc',
      'partner-name': decoyOrg,
      'partner-email': `north.pier.${stamp}@bayseed.co`,
      'partner-org': decoyOrg,
      'referral-plan': 'Introduces one portfolio company at a time',
    },
  });
  ingestSubmission({
    name: 'startup-hire',
    data: {
      'company-name': decoyOrg,
      'contact-email': `founder.${stamp}@northpier.co`,
      'role-title': roleTitle,
      'stack-needs': 'JavaScript, activation work',
      'salary-range': '$90-110k',
      'company-stage': 'Seed',
    },
  });
  const decoyTalent = ingestSubmission({
    name: 'engineer-join',
    data: {
      'submitted-by': decoySubmitter,
      'submitted-by-name': 'Sam Hollis',
      'full-name': 'Mina Alvarez',
      'seeker-email': `mina.other.${stamp}@elsewhere.co`,
      'skills-stack': 'Rust, compilers',
      experience: 'Wrote a compiler pass',
      'sf-bay': 'no',
      availability: 'later',
      'salary-expectation': '$90k',
    },
  });
  const talent = ingestSubmission({
    name: 'engineer-join',
    data: {
      'submitted-by': submitterEmail,
      'submitted-by-name': 'Riley Chen',
      'full-name': 'Mina Alvarez',
      'seeker-email': talentEmail,
      'skills-stack': 'JavaScript, activation work',
      experience: 'Led an activation rebuild',
      'sf-bay': 'yes',
      availability: 'now',
      'salary-expectation': '$180k',
    },
  });
  const partner = ingestSubmission({
    name: 'partner-apply',
    data: {
      'submitted-by': submitterEmail,
      'submitted-by-name': 'Riley Chen',
      'partner-type': 'angel',
      'partner-name': matchedOrg,
      'partner-email': `other.co.${stamp}@otherco.co`,
      'partner-org': matchedOrg,
      'referral-plan': 'Introduces the company that owns this role',
    },
  });

  const boardRoleId = `role-other-${stamp}`;
  fs.writeFileSync(path.join(dir, 'DEMIGOD-BOARD.json'), JSON.stringify({
    at: new Date().toISOString(),
    roles: [{
      id: boardRoleId,
      title: roleTitle,
      company: matchedOrg,
      stageType: 'Seed · SF startup',
      skills: 'JavaScript',
      status: 'Active',
      featuredAt: new Date().toISOString(),
    }],
    candidates: [],
  }, null, 2));

  const suggested = suggestMatches(boardRoleId, { propose: true, limit: 1 });
  const suggestedPair = suggested.proposed?.find((row) => row.candId === talent.record.id && !row.error);
  assert.ok(suggestedPair, 'suggestMatches did not propose the uniquely identified talent');

  const pilotId = `pilot-other-${stamp}`;
  fs.writeFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), JSON.stringify({
    at: new Date().toISOString(),
    pilots: [{
      id: pilotId,
      company: matchedOrg,
      role: roleTitle,
      status: 'matching',
      outcome90d: 'Ship the activation rebuild',
      shortlist: [],
    }],
  }, null, 2));
  const child = spawnSync(process.execPath, [
    '--import', pathToFileURL(preload).href,
    'demigod-match.mjs',
    'add',
    pilotId,
    '--name', 'Mina Alvarez',
    '--links', talentEmail,
    '--why', 'Activation work lines up with the role',
    '--consent',
  ], {
    cwd: path.dirname(new URL(import.meta.url).pathname),
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);

  const ledger = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-REFERRAL-LEDGER.json'), 'utf8'));
  const portions = ledger.portions || [];
  const matchedTalentRows = portions.filter((row) => row.submissionId === talent.record.id);
  const matchedPartnerRows = portions.filter((row) => row.submissionId === partner.record.id);
  assert.equal(matchedTalentRows.length, 2);
  assert.equal(matchedPartnerRows.length, 2);
  for (const row of matchedTalentRows) {
    assert.equal(row.submitterEmail, submitterEmail);
    assert.equal(row.baseSalaryCents, BASE_CENTS);
    assert.equal(row.portionCents, TALENT_PORTION_CENTS);
    assert.equal(row.rewardMode, 'fee_share');
    assert.equal(row.livePayment, false);
  }
  for (const row of matchedPartnerRows) {
    assert.equal(row.baseSalaryCents, BASE_CENTS);
    assert.equal(row.portionCents, PARTNER_CREDIT_CENTS);
    assert.equal(row.rewardMode, 'company_credit');
    assert.equal(row.personalCash, false);
    assert.equal(row.livePayment, false);
  }
  for (const row of portions) {
    assert.notEqual(row.submissionId, decoyTalent.record.id);
    assert.notEqual(row.submissionId, decoyPartner.record.id);
    assert.notEqual(row.submitterEmail, decoySubmitter);
    assert.notEqual(row.baseSalaryCents, 9_000_000);
  }
  assert.equal(calls.length, 0);
  assert.equal(String(child.stderr || '').includes('live_payment'), false);
  assertPayoutHandoff(dir, suggestedPair.pairId, talent.record.id, partner.record.id, [decoyTalent.record.id, decoyPartner.record.id]);
  const matched = JSON.parse(child.stdout);
  assertPayoutHandoff(dir, matched.pair.pairId, talent.record.id, partner.record.id, [decoyTalent.record.id, decoyPartner.record.id]);
});

test('hire emits an invoice draft and attaches both referrer portions', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-invoice-'));
  const priorRoot = process.env.DEMIGOD_ROOT;
  process.env.DEMIGOD_ROOT = dir;
  const calls = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => {
    calls.push(String(args[0]));
    throw new Error('live_payment');
  };
  const preload = path.join(dir, 'no-live-pay.mjs');
  fs.writeFileSync(preload, 'globalThis.fetch = async () => { throw new Error("live_payment"); };\n');
  t.after(() => {
    globalThis.fetch = origFetch;
    if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
    else process.env.DEMIGOD_ROOT = priorRoot;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const { ingestSubmission } = await import('./demigod-submissions-lib.mjs');
  const stamp = Date.now();
  const submitterEmail = `riley.chen.${stamp}@baymail.co`;
  const decoySubmitter = `sam.hollis.${stamp}@elsewhere.co`;
  const talentEmail = `mina.alvarez.${stamp}@baymail.co`;
  const partnerOrg = 'Other Co';
  const decoyOrg = 'North Pier';
  const roleTitle = 'Founding Engineer';
  ingestSubmission({
    name: 'startup-hire',
    data: {
      'company-name': decoyOrg,
      'contact-email': `founder.${stamp}@northpier.co`,
      'role-title': roleTitle,
      'stack-needs': 'Rust, compilers',
      'salary-range': '$90-110k',
      'company-stage': 'Seed',
    },
  });
  const decoyPartner = ingestSubmission({
    name: 'partner-apply',
    data: {
      'submitted-by': decoySubmitter,
      'submitted-by-name': 'Sam Hollis',
      'partner-type': 'vc',
      'partner-name': decoyOrg,
      'partner-email': `north.pier.${stamp}@bayseed.co`,
      'partner-org': decoyOrg,
      'referral-plan': 'Introduces one company outside this hire',
    },
  });
  const decoyTalent = ingestSubmission({
    name: 'engineer-join',
    data: {
      'submitted-by': decoySubmitter,
      'submitted-by-name': 'Sam Hollis',
      'full-name': 'Mina Alvarez',
      'seeker-email': `mina.other.${stamp}@elsewhere.co`,
      'skills-stack': 'Rust, compilers',
      experience: 'Wrote a compiler pass',
      'sf-bay': 'no',
      availability: 'later',
      'salary-expectation': '$90k',
    },
  });
  const talent = ingestSubmission({
    name: 'engineer-join',
    data: {
      'submitted-by': submitterEmail,
      'submitted-by-name': 'Riley Chen',
      'full-name': 'Mina Alvarez',
      'seeker-email': talentEmail,
      'skills-stack': 'JavaScript, activation work',
      experience: 'Led an activation rebuild',
      'sf-bay': 'yes',
      availability: 'now',
      'salary-expectation': '$180k',
    },
  });
  const partner = ingestSubmission({
    name: 'partner-apply',
    data: {
      'submitted-by': submitterEmail,
      'submitted-by-name': 'Riley Chen',
      'partner-type': 'angel',
      'partner-name': partnerOrg,
      'partner-email': `other.co.${stamp}@otherco.co`,
      'partner-org': partnerOrg,
      'referral-plan': 'Introduces the company that owns this role',
    },
  });
  const pilotId = `pilot-other-${stamp}`;
  fs.writeFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), JSON.stringify({
    at: new Date().toISOString(),
    pilots: [{
      id: pilotId,
      company: partnerOrg,
      role: roleTitle,
      status: 'matching',
      outcome90d: 'Ship the activation rebuild',
      shortlist: [],
    }],
  }, null, 2));
  const match = spawnSync(process.execPath, [
    '--import', pathToFileURL(preload).href,
    'demigod-match.mjs',
    'add',
    pilotId,
    '--name', 'Mina Alvarez',
    '--links', talentEmail,
    '--why', 'Activation work lines up with the role',
    '--consent',
  ], {
    cwd: path.dirname(new URL(import.meta.url).pathname),
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
  assert.equal(match.status, 0, match.stderr || match.stdout);
  const pilots = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), 'utf8'));
  const pilot = pilots.pilots.find((row) => row.id === pilotId);
  pilot.status = 'intro';
  fs.writeFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), JSON.stringify(pilots, null, 2));
  const child = spawnSync(process.execPath, [
    '--import', pathToFileURL(preload).href,
    'demigod-close.mjs',
    'hire',
    pilotId,
    '--start', '2026-10-01',
    '--comp', String(HIRE_COMP_DOLLARS),
  ], {
    cwd: path.dirname(new URL(import.meta.url).pathname),
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  const hired = JSON.parse(child.stdout);
  assert.equal(hired.ok, true);
  assert.equal(hired.invoiceDraft?.dryRun, true);
  assert.equal(hired.invoiceDraft?.livePayment, false);

  const draftFile = path.join(dir, 'DEMIGOD-INVOICE-DRAFTS.json');
  assert.equal(fs.existsSync(draftFile), true, 'hire did not emit an invoice draft');
  const drafts = JSON.parse(fs.readFileSync(draftFile, 'utf8'));
  const draft = (drafts.records || []).find((row) => row.pilotId === pilotId);
  assert.ok(draft, 'invoice draft missing for the hire');
  assert.equal(draft.status, 'draft');
  assert.equal(draft.dryRun, true);
  assert.equal(draft.sendInvoice, false);
  assert.equal(draft.talentBilled, false);
  assert.equal(draft.billTo, 'hiring_company');
  assert.equal(draft.baseSalaryCents, HIRE_BASE_CENTS);
  assert.equal(draft.feeCents, HIRE_FEE_CENTS);
  assert.equal(draft.livePayment, false);
  assert.equal(draft.paymentProvider, null);
  const talentLine = (draft.portions || []).find((row) => row.submissionId === talent.record.id);
  const partnerLine = (draft.portions || []).find((row) => row.submissionId === partner.record.id);
  assert.ok(talentLine, 'talent fee-share missing from the invoice draft');
  assert.ok(partnerLine, 'hiring-partner company credit missing from the invoice draft');
  assert.equal(talent.record.raw['salary-expectation'], '$180k');
  assert.notEqual(HIRE_COMP_DOLLARS, 180000);
  assert.equal(talentLine.settlementStatus, 'payable_on_observed_payment');
  assert.equal(talentLine.rewardMode, 'fee_share');
  assert.equal(talentLine.personalCash, true);
  assert.equal(talentLine.portionCents, HIRE_TALENT_PORTION_CENTS);
  assert.notEqual(talentLine.portionCents, TALENT_PORTION_CENTS);
  assert.equal(talentLine.payable, false);
  assert.equal(partnerLine.settlementStatus, 'payable_on_observed_payment');
  assert.equal(partnerLine.rewardMode, 'company_credit');
  assert.equal(partnerLine.personalCash, false);
  assert.equal(partnerLine.portionCents, HIRE_PARTNER_CREDIT_CENTS);
  assert.notEqual(partnerLine.portionCents, PARTNER_CREDIT_CENTS);
  assert.equal(partnerLine.payable, false);
  for (const id of [decoyTalent.record.id, decoyPartner.record.id]) {
    assert.equal((draft.portions || []).some((row) => row.submissionId === id), false);
  }

  const ledger = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-REFERRAL-LEDGER.json'), 'utf8'));
  const talentPortion = (ledger.portions || []).find((row) => row.submissionId === talent.record.id && row.invoiceDraftId === draft.id);
  const partnerPortion = (ledger.portions || []).find((row) => row.submissionId === partner.record.id && row.invoiceDraftId === draft.id);
  assert.ok(talentPortion, 'talent portion was not attached to the invoice draft');
  assert.ok(partnerPortion, 'hiring-partner portion was not attached to the invoice draft');
  assert.equal(talentPortion.baseSalaryCents, HIRE_BASE_CENTS);
  assert.equal(talentPortion.portionCents, HIRE_TALENT_PORTION_CENTS);
  assert.equal(partnerPortion.portionCents, HIRE_PARTNER_CREDIT_CENTS);
  assert.equal(partnerPortion.rewardMode, 'company_credit');
  assert.equal(partnerPortion.personalCash, false);
  for (const row of ledger.portions || []) {
    assert.equal(row.baseSalaryCents, HIRE_BASE_CENTS);
    assert.notEqual(row.baseSalaryCents, 9_000_000);
    assert.notEqual(row.submissionId, decoyTalent.record.id);
    assert.notEqual(row.submissionId, decoyPartner.record.id);
    assert.notEqual(row.submitterEmail, decoySubmitter);
    if (row.rewardMode === 'company_credit') assert.equal(row.submissionId, partner.record.id);
  }
  for (const row of [talentPortion, partnerPortion]) {
    assert.equal(row.settlementStatus, 'payable_on_observed_payment');
    assert.equal(row.payableOn, 'observed_payment');
    assert.equal(row.payable, false);
    assert.equal(row.livePayment, false);
    assert.equal(row.feePaidAndRetained, false);
  }
  assert.equal(calls.length, 0);
  assert.equal(String(child.stderr || '').includes('live_payment'), false);
  assert.equal(String(match.stderr || '').includes('live_payment'), false);
  console.log(JSON.stringify({
    formSalary: talent.record.raw['salary-expectation'],
    hireCompDollars: HIRE_COMP_DOLLARS,
    invoiceBaseSalaryCents: draft.baseSalaryCents,
    invoiceFeeCents: draft.feeCents,
    talentPortionCents: talentLine.portionCents,
    partnerPortionCents: partnerLine.portionCents,
    partnerRewardMode: partnerLine.rewardMode,
    decoyOnDraft: (draft.portions || []).some((row) => row.submissionId === decoyTalent.record.id || row.submissionId === decoyPartner.record.id),
    livePaymentCalls: calls.length,
  }));
});

test('observed client payment releases both referrer portions and does not charge', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-observed-'));
  const priorRoot = process.env.DEMIGOD_ROOT;
  process.env.DEMIGOD_ROOT = dir;
  const calls = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => {
    calls.push(String(args[0]));
    throw new Error('live_payment');
  };
  const preload = path.join(dir, 'no-live-pay.mjs');
  fs.writeFileSync(preload, 'globalThis.fetch = async () => { throw new Error("live_payment"); };\n');
  t.after(() => {
    globalThis.fetch = origFetch;
    if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
    else process.env.DEMIGOD_ROOT = priorRoot;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const { ingestSubmission } = await import('./demigod-submissions-lib.mjs');
  const stamp = Date.now();
  const submitterEmail = `riley.chen.${stamp}@baymail.co`;
  const decoySubmitter = `sam.hollis.${stamp}@elsewhere.co`;
  const talentEmail = `mina.alvarez.${stamp}@baymail.co`;
  const partnerOrg = 'Other Co';
  const decoyOrg = 'North Pier';
  const roleTitle = 'Founding Engineer';
  ingestSubmission({
    name: 'startup-hire',
    data: {
      'company-name': decoyOrg,
      'contact-email': `founder.${stamp}@northpier.co`,
      'role-title': roleTitle,
      'stack-needs': 'Rust, compilers',
      'salary-range': '$90-110k',
      'company-stage': 'Seed',
    },
  });
  const decoyPartner = ingestSubmission({
    name: 'partner-apply',
    data: {
      'submitted-by': decoySubmitter,
      'submitted-by-name': 'Sam Hollis',
      'partner-type': 'vc',
      'partner-name': decoyOrg,
      'partner-email': `north.pier.${stamp}@bayseed.co`,
      'partner-org': decoyOrg,
      'referral-plan': 'Introduces one company outside this hire',
    },
  });
  const decoyTalent = ingestSubmission({
    name: 'engineer-join',
    data: {
      'submitted-by': decoySubmitter,
      'submitted-by-name': 'Sam Hollis',
      'full-name': 'Mina Alvarez',
      'seeker-email': `mina.other.${stamp}@elsewhere.co`,
      'skills-stack': 'Rust, compilers',
      experience: 'Wrote a compiler pass',
      'sf-bay': 'no',
      availability: 'later',
      'salary-expectation': '$90k',
    },
  });
  const talent = ingestSubmission({
    name: 'engineer-join',
    data: {
      'submitted-by': submitterEmail,
      'submitted-by-name': 'Riley Chen',
      'full-name': 'Mina Alvarez',
      'seeker-email': talentEmail,
      'skills-stack': 'JavaScript, activation work',
      experience: 'Led an activation rebuild',
      'sf-bay': 'yes',
      availability: 'now',
      'salary-expectation': '$180k',
    },
  });
  const partner = ingestSubmission({
    name: 'partner-apply',
    data: {
      'submitted-by': submitterEmail,
      'submitted-by-name': 'Riley Chen',
      'partner-type': 'angel',
      'partner-name': partnerOrg,
      'partner-email': `other.co.${stamp}@otherco.co`,
      'partner-org': partnerOrg,
      'referral-plan': 'Introduces the company that owns this role',
    },
  });
  const pilotId = `pilot-other-${stamp}`;
  fs.writeFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), JSON.stringify({
    at: new Date().toISOString(),
    pilots: [{
      id: pilotId,
      company: partnerOrg,
      role: roleTitle,
      status: 'matching',
      outcome90d: 'Ship the activation rebuild',
      shortlist: [],
    }],
  }, null, 2));
  const ops = path.dirname(new URL(import.meta.url).pathname);
  const match = spawnSync(process.execPath, [
    '--import', pathToFileURL(preload).href,
    'demigod-match.mjs',
    'add',
    pilotId,
    '--name', 'Mina Alvarez',
    '--links', talentEmail,
    '--why', 'Activation work lines up with the role',
    '--consent',
  ], { cwd: ops, env: { ...process.env, DEMIGOD_ROOT: dir }, encoding: 'utf8' });
  assert.equal(match.status, 0, match.stderr || match.stdout);
  const pilots = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), 'utf8'));
  const pilot = pilots.pilots.find((row) => row.id === pilotId);
  pilot.status = 'intro';
  fs.writeFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), JSON.stringify(pilots, null, 2));
  const hired = spawnSync(process.execPath, [
    '--import', pathToFileURL(preload).href,
    'demigod-close.mjs',
    'hire',
    pilotId,
    '--start', '2026-10-01',
    '--comp', String(HIRE_COMP_DOLLARS),
  ], { cwd: ops, env: { ...process.env, DEMIGOD_ROOT: dir }, encoding: 'utf8' });
  assert.equal(hired.status, 0, hired.stderr || hired.stdout);
  const hireOut = JSON.parse(hired.stdout);
  assert.equal(hireOut.invoiceDraft.status, 'draft');
  assert.equal(hireOut.invoiceDraft.feeCents, HIRE_FEE_CENTS);
  assert.equal(hireOut.invoiceDraft.baseSalaryCents, HIRE_BASE_CENTS);
  const before = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-REFERRAL-LEDGER.json'), 'utf8'));
  const owedTalent = (before.portions || []).find((row) => row.submissionId === talent.record.id);
  const owedPartner = (before.portions || []).find((row) => row.submissionId === partner.record.id);
  assert.equal(owedTalent.settlementStatus, 'payable_on_observed_payment');
  assert.equal(owedTalent.portionCents, HIRE_TALENT_PORTION_CENTS);
  assert.equal(owedTalent.baseSalaryCents, HIRE_BASE_CENTS);
  assert.equal(owedPartner.settlementStatus, 'payable_on_observed_payment');
  assert.equal(owedPartner.portionCents, HIRE_PARTNER_CREDIT_CENTS);
  assert.equal(owedPartner.rewardMode, 'company_credit');
  assert.equal(owedPartner.personalCash, false);

  const blocked = path.join(dir, 'payment-blocked.json');
  fs.writeFileSync(blocked, JSON.stringify({ observed: false, amountCents: hireOut.invoiceDraft.feeCents, currency: 'USD', paidAt: '2027-01-15', retained: true }));
  const blockedRun = spawnSync(process.execPath, [
    '--import', pathToFileURL(preload).href,
    'demigod-close.mjs',
    'payment',
    pilotId,
    '--observed',
    blocked,
  ], { cwd: ops, env: { ...process.env, DEMIGOD_ROOT: dir }, encoding: 'utf8' });
  assert.notEqual(blockedRun.status, 0);
  const stillOwed = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-REFERRAL-LEDGER.json'), 'utf8'));
  assert.equal(stillOwed.portions.find((row) => row.submissionId === talent.record.id).settlementStatus, 'payable_on_observed_payment');

  const fixture = path.join(dir, 'payment-observed.json');
  fs.writeFileSync(fixture, JSON.stringify({
    observed: true,
    amountCents: hireOut.invoiceDraft.feeCents,
    currency: 'USD',
    paidAt: '2027-01-15',
    retained: true,
  }));
  const paid = spawnSync(process.execPath, [
    '--import', pathToFileURL(preload).href,
    'demigod-close.mjs',
    'payment',
    pilotId,
    '--observed',
    fixture,
  ], { cwd: ops, env: { ...process.env, DEMIGOD_ROOT: dir }, encoding: 'utf8' });
  assert.equal(paid.status, 0, paid.stderr || paid.stdout);
  const releasedOut = JSON.parse(paid.stdout);
  assert.equal(releasedOut.ok, true);
  assert.equal(releasedOut.payout.status, 'released_local');
  assert.equal(releasedOut.payout.livePayment, false);
  assert.equal(releasedOut.payout.paymentProvider, null);
  assert.equal(releasedOut.payout.dryRun, true);
  assert.equal(releasedOut.payout.observedAmountCents, HIRE_FEE_CENTS);

  const payouts = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PLACEMENT-PAYOUTS.json'), 'utf8'));
  const released = (payouts.records || []).find((row) => row.pilotId === pilotId && row.status === 'released_local');
  assert.ok(released, 'observed payment did not write a released payout record');
  assert.equal(released.released, true);
  assert.equal(released.source, 'observed_client_payment_fixture');
  assert.equal(released.livePayment, false);
  assert.equal(released.paymentProvider, null);
  assert.equal(released.baseSalaryCents, HIRE_BASE_CENTS);
  assert.equal(released.feeCents, HIRE_FEE_CENTS);
  const talentLine = (released.lines || []).find((row) => row.submissionId === talent.record.id);
  const partnerLine = (released.lines || []).find((row) => row.submissionId === partner.record.id);
  assert.ok(talentLine, 'talent fee-share missing from the released payout');
  assert.ok(partnerLine, 'hiring-partner company credit missing from the released payout');
  assert.equal(talentLine.rewardMode, 'fee_share');
  assert.equal(talentLine.personalCash, true);
  assert.equal(talentLine.portionCents, HIRE_TALENT_PORTION_CENTS);
  assert.notEqual(talentLine.portionCents, TALENT_PORTION_CENTS);
  assert.equal(talentLine.settlementStatus, 'released_local');
  assert.equal(partnerLine.rewardMode, 'company_credit');
  assert.equal(partnerLine.personalCash, false);
  assert.equal(partnerLine.portionCents, HIRE_PARTNER_CREDIT_CENTS);
  assert.notEqual(partnerLine.portionCents, PARTNER_CREDIT_CENTS);
  assert.equal(partnerLine.settlementStatus, 'released_local');
  for (const id of [decoyTalent.record.id, decoyPartner.record.id]) {
    assert.equal((released.lines || []).some((row) => row.submissionId === id), false);
  }
  assert.equal((released.lines || []).some((row) => row.submitterEmail === decoySubmitter), false);

  const ledger = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-REFERRAL-LEDGER.json'), 'utf8'));
  const talentPortion = (ledger.portions || []).find((row) => row.submissionId === talent.record.id);
  const partnerPortion = (ledger.portions || []).find((row) => row.submissionId === partner.record.id);
  assert.equal(talentPortion.settlementStatus, 'released_local');
  assert.equal(partnerPortion.settlementStatus, 'released_local');
  assert.equal(talentPortion.payoutId, released.id);
  assert.equal(partnerPortion.payoutId, released.id);
  assert.equal(talentPortion.feePaidAndRetained, true);
  assert.equal(partnerPortion.feePaidAndRetained, true);
  assert.equal(talentPortion.livePayment, false);
  assert.equal(partnerPortion.livePayment, false);
  assert.equal(talentPortion.paymentProvider, null);
  assert.equal(partnerPortion.payable, false);
  assert.equal(talentPortion.portionCents, HIRE_TALENT_PORTION_CENTS);
  assert.equal(partnerPortion.portionCents, HIRE_PARTNER_CREDIT_CENTS);
  for (const row of ledger.portions || []) {
    assert.notEqual(row.submissionId, decoyTalent.record.id);
    assert.notEqual(row.submissionId, decoyPartner.record.id);
    assert.notEqual(row.baseSalaryCents, 9_000_000);
    assert.equal(row.baseSalaryCents, HIRE_BASE_CENTS);
    if (row.rewardMode === 'fee_share') assert.equal(row.portionCents, HIRE_TALENT_PORTION_CENTS);
    if (row.rewardMode === 'company_credit') assert.equal(row.portionCents, HIRE_PARTNER_CREDIT_CENTS);
  }
  const drafts = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-INVOICE-DRAFTS.json'), 'utf8'));
  const draft = (drafts.records || []).find((row) => row.pilotId === pilotId);
  assert.equal(draft.status, 'payment_observed');
  assert.equal(draft.sendInvoice, false);
  assert.equal(draft.livePayment, false);
  assert.equal(draft.payoutId, released.id);
  assert.equal(calls.length, 0);
  assert.equal(String(paid.stderr || '').includes('live_payment'), false);
  assert.equal(String(hired.stderr || '').includes('live_payment'), false);
  console.log(JSON.stringify({
    payoutStatus: released.status,
    payoutId: released.id,
    talentSettlement: talentPortion.settlementStatus,
    partnerSettlement: partnerPortion.settlementStatus,
    hireCompDollars: HIRE_COMP_DOLLARS,
    formSalary: '$180k',
    invoiceFeeCents: draft.feeCents,
    payoutBaseSalaryCents: released.baseSalaryCents,
    talentPortionCents: talentLine.portionCents,
    partnerPortionCents: partnerLine.portionCents,
    partnerRewardMode: partnerLine.rewardMode,
    livePayment: released.livePayment,
    paymentProvider: released.paymentProvider,
    livePaymentCalls: calls.length,
  }));
});
});
