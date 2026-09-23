import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HIRE_COMP_DOLLARS = 200_000;
const HIRE_BASE_CENTS = 20_000_000;
const HIRE_FEE_CENTS = 2_000_000;
const HIRE_TALENT_PORTION_CENTS = 400_000;
const HIRE_PARTNER_CREDIT_CENTS = 200_000;
const START = '2026-10-01';
const DAY_30 = '2026-10-31';
const DAY_60 = '2026-11-30';
const DAY_90 = '2026-12-30';
const BEFORE_90 = '2026-11-15';

function runClose(dir, preload, args) {
  return spawnSync(process.execPath, [
    '--import', pathToFileURL(preload).href,
    'demigod-close.mjs',
    ...args,
  ], {
    cwd: path.dirname(new URL(import.meta.url).pathname),
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
}

function releasedPayout(dir, pilotId) {
  const file = path.join(dir, 'DEMIGOD-PLACEMENT-PAYOUTS.json');
  if (!fs.existsSync(file)) return null;
  const store = JSON.parse(fs.readFileSync(file, 'utf8'));
  return (store.records || []).find((row) => row.pilotId === pilotId && row.status === 'released_local') || null;
}

function storedChecks(dir, pilotId) {
  const pilots = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), 'utf8'));
  return pilots.pilots.find((row) => row.id === pilotId).close.retentionChecks;
}

function includesDecoy(rows, decoyTalentId, decoyPartnerId, decoySubmitter) {
  return (rows || []).some((row) => (
    row.submissionId === decoyTalentId
    || row.submissionId === decoyPartnerId
    || row.submitterEmail === decoySubmitter
  ));
}

test('hire writes retention dates and a day-90 check releases only with a fixture', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-retention-'));
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
  pilots.pilots.find((row) => row.id === pilotId).status = 'intro';
  fs.writeFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), JSON.stringify(pilots, null, 2));

  const hired = runClose(dir, preload, ['hire', pilotId, '--start', START, '--comp', String(HIRE_COMP_DOLLARS)]);
  assert.equal(hired.status, 0, hired.stderr || hired.stdout);
  const hireOut = JSON.parse(hired.stdout);
  const schedule = hireOut.close.retentionChecks;
  assert.equal(schedule.d30.due, DAY_30);
  assert.equal(schedule.d60.due, DAY_60);
  assert.equal(schedule.d90.due, DAY_90);
  assert.equal(schedule.d30.status, 'scheduled');
  assert.equal(schedule.d60.status, 'scheduled');
  assert.equal(schedule.d90.status, 'scheduled');
  assert.equal(hireOut.invoiceDraft.feeCents, HIRE_FEE_CENTS);
  assert.equal(hireOut.invoiceDraft.baseSalaryCents, HIRE_BASE_CENTS);
  assert.equal(talent.record.raw['salary-expectation'], '$180k');
  assert.equal(includesDecoy(hireOut.invoiceDraft.portions, decoyTalent.record.id, decoyPartner.record.id, decoySubmitter), false);
  const hiredStored = storedChecks(dir, pilotId);
  assert.equal(hiredStored.d30.due, DAY_30);
  assert.equal(hiredStored.d60.due, DAY_60);
  assert.equal(hiredStored.d90.due, DAY_90);
  assert.equal(hiredStored.d30.status, 'scheduled');
  assert.equal(hiredStored.d90.status, 'scheduled');

  const early = runClose(dir, preload, ['check', pilotId, '--date', BEFORE_90]);
  assert.equal(early.status, 0, early.stderr || early.stdout);
  const earlyOut = JSON.parse(early.stdout);
  assert.equal(earlyOut.released, false);
  assert.equal(earlyOut.day90Due, false);
  assert.equal(earlyOut.retentionChecks.d30.status, 'complete');
  assert.equal(earlyOut.retentionChecks.d30.checkedOn, BEFORE_90);
  assert.equal(earlyOut.retentionChecks.d60.status, 'scheduled');
  assert.equal(earlyOut.retentionChecks.d90.status, 'scheduled');
  const earlyStored = storedChecks(dir, pilotId);
  assert.equal(earlyStored.d30.status, 'complete');
  assert.equal(earlyStored.d30.checkedOn, BEFORE_90);
  assert.equal(earlyStored.d60.status, 'scheduled');
  assert.equal(earlyStored.d90.status, 'scheduled');
  assert.equal(releasedPayout(dir, pilotId), null);

  const unpaid = runClose(dir, preload, ['check', pilotId, '--date', DAY_90]);
  assert.equal(unpaid.status, 0, unpaid.stderr || unpaid.stdout);
  const unpaidOut = JSON.parse(unpaid.stdout);
  assert.equal(unpaidOut.released, false);
  assert.equal(unpaidOut.day90Due, true);
  assert.equal(unpaidOut.retentionChecks.d30.status, 'complete');
  assert.equal(unpaidOut.retentionChecks.d30.checkedOn, BEFORE_90);
  assert.equal(unpaidOut.retentionChecks.d60.status, 'complete');
  assert.equal(unpaidOut.retentionChecks.d60.checkedOn, DAY_90);
  assert.equal(unpaidOut.retentionChecks.d90.status, 'complete');
  assert.equal(unpaidOut.retentionChecks.d90.checkedOn, DAY_90);
  const unpaidStored = storedChecks(dir, pilotId);
  assert.equal(unpaidStored.d30.status, 'complete');
  assert.equal(unpaidStored.d30.checkedOn, BEFORE_90);
  assert.equal(unpaidStored.d60.status, 'complete');
  assert.equal(unpaidStored.d60.checkedOn, DAY_90);
  assert.equal(unpaidStored.d90.status, 'complete');
  assert.equal(unpaidStored.d90.checkedOn, DAY_90);
  assert.equal(releasedPayout(dir, pilotId), null);
  const stillOwed = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-REFERRAL-LEDGER.json'), 'utf8'));
  const owedTalent = stillOwed.portions.find((row) => row.submissionId === talent.record.id);
  const owedPartner = stillOwed.portions.find((row) => row.submissionId === partner.record.id);
  assert.equal(owedTalent.settlementStatus, 'payable_on_observed_payment');
  assert.equal(owedPartner.settlementStatus, 'payable_on_observed_payment');
  assert.equal(owedTalent.portionCents, HIRE_TALENT_PORTION_CENTS);
  assert.equal(owedPartner.portionCents, HIRE_PARTNER_CREDIT_CENTS);
  assert.equal(includesDecoy(stillOwed.portions, decoyTalent.record.id, decoyPartner.record.id, decoySubmitter), false);

  const fixture = path.join(dir, 'payment-observed.json');
  fs.writeFileSync(fixture, JSON.stringify({
    observed: true,
    amountCents: hireOut.invoiceDraft.feeCents,
    currency: 'USD',
    paidAt: DAY_90,
    retained: true,
  }));
  const recorded = runClose(dir, preload, ['payment', pilotId, '--observed', fixture, '--record']);
  assert.equal(recorded.status, 0, recorded.stderr || recorded.stdout);
  const recordedOut = JSON.parse(recorded.stdout);
  assert.equal(recordedOut.recorded, true);
  assert.equal(recordedOut.released, false);
  assert.equal(releasedPayout(dir, pilotId), null);

  const paid = runClose(dir, preload, ['check', pilotId, '--date', DAY_90]);
  assert.equal(paid.status, 0, paid.stderr || paid.stdout);
  const paidOut = JSON.parse(paid.stdout);
  assert.equal(paidOut.released, true);
  assert.equal(paidOut.livePayment, false);
  assert.equal(paidOut.payout.status, 'released_local');
  assert.equal(paidOut.payout.livePayment, false);
  assert.equal(paidOut.payout.paymentProvider, null);
  assert.equal(paidOut.payout.baseSalaryCents, HIRE_BASE_CENTS);
  assert.equal(paidOut.payout.feeCents, HIRE_FEE_CENTS);

  const released = releasedPayout(dir, pilotId);
  assert.ok(released, 'day-90 check with a fixture did not write a released payout');
  const talentLine = released.lines.find((row) => row.submissionId === talent.record.id);
  const partnerLine = released.lines.find((row) => row.submissionId === partner.record.id);
  assert.equal(talentLine.rewardMode, 'fee_share');
  assert.equal(talentLine.personalCash, true);
  assert.equal(talentLine.portionCents, HIRE_TALENT_PORTION_CENTS);
  assert.equal(partnerLine.rewardMode, 'company_credit');
  assert.equal(partnerLine.personalCash, false);
  assert.equal(partnerLine.portionCents, HIRE_PARTNER_CREDIT_CENTS);
  assert.equal(released.lines.some((row) => row.submissionId === decoyTalent.record.id), false);
  assert.equal(released.lines.some((row) => row.submissionId === decoyPartner.record.id), false);
  assert.equal(released.lines.some((row) => row.submitterEmail === decoySubmitter), false);

  const ledger = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-REFERRAL-LEDGER.json'), 'utf8'));
  const talentPortion = ledger.portions.find((row) => row.submissionId === talent.record.id);
  const partnerPortion = ledger.portions.find((row) => row.submissionId === partner.record.id);
  assert.equal(talentPortion.settlementStatus, 'released_local');
  assert.equal(partnerPortion.settlementStatus, 'released_local');
  assert.equal(talentPortion.portionCents, HIRE_TALENT_PORTION_CENTS);
  assert.equal(partnerPortion.portionCents, HIRE_PARTNER_CREDIT_CENTS);
  assert.equal(talentPortion.livePayment, false);
  assert.equal(partnerPortion.paymentProvider, null);
  assert.equal(includesDecoy(ledger.portions, decoyTalent.record.id, decoyPartner.record.id, decoySubmitter), false);
  const drafts = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-INVOICE-DRAFTS.json'), 'utf8'));
  const draft = drafts.records.find((row) => row.pilotId === pilotId);
  assert.equal(includesDecoy(draft.portions, decoyTalent.record.id, decoyPartner.record.id, decoySubmitter), false);
  const paidStored = storedChecks(dir, pilotId);
  assert.equal(paidStored.d30.status, 'complete');
  assert.equal(paidStored.d60.status, 'complete');
  assert.equal(paidStored.d90.status, 'complete');
  assert.equal(paidStored.d90.checkedOn, DAY_90);
  assert.equal(calls.length, 0);
  assert.equal(String(paid.stderr || '').includes('live_payment'), false);
  console.log(JSON.stringify({
    start: START,
    d30: schedule.d30.due,
    d60: schedule.d60.due,
    d90: schedule.d90.due,
    earlyReleased: earlyOut.released,
    earlyD30: earlyStored.d30.status,
    earlyD60: earlyStored.d60.status,
    day90WithoutFixtureReleased: unpaidOut.released,
    day90D30CheckedOn: unpaidStored.d30.checkedOn,
    day90D60CheckedOn: unpaidStored.d60.checkedOn,
    day90D90CheckedOn: unpaidStored.d90.checkedOn,
    day90WithFixtureReleased: paidOut.released,
    decoyOnDraft: includesDecoy(draft.portions, decoyTalent.record.id, decoyPartner.record.id, decoySubmitter),
    decoyOnPayout: includesDecoy(released.lines, decoyTalent.record.id, decoyPartner.record.id, decoySubmitter),
    hireCompDollars: HIRE_COMP_DOLLARS,
    formSalary: talent.record.raw['salary-expectation'],
    talentPortionCents: talentLine.portionCents,
    partnerPortionCents: partnerLine.portionCents,
    partnerRewardMode: partnerLine.rewardMode,
    livePaymentCalls: calls.length,
  }));
});
