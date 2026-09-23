import { describe, test } from 'node:test';
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
const OPS = path.dirname(new URL(import.meta.url).pathname);

function runCli(dir, preload, script, args) {
  return spawnSync(process.execPath, [
    '--import', pathToFileURL(preload).href,
    script,
    ...args,
  ], {
    cwd: OPS,
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

async function hiredPilot(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-churn-'));
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
  const decoySubmitter = `sam.hollis.${stamp}@elsewhere.co`;
  const talentEmail = `mina.alvarez.${stamp}@baymail.co`;
  const partnerOrg = 'Other Co';
  const decoyOrg = 'North Pier';
  ingestSubmission({
    name: 'startup-hire',
    data: {
      'company-name': decoyOrg,
      'contact-email': `founder.${stamp}@northpier.co`,
      'role-title': 'Founding Engineer',
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
      'submitted-by': `riley.chen.${stamp}@baymail.co`,
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
      'submitted-by': `riley.chen.${stamp}@baymail.co`,
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
    pilots: [{
      id: pilotId,
      company: partnerOrg,
      role: 'Founding Engineer',
      status: 'matching',
      outcome90d: 'Ship the activation rebuild',
      shortlist: [],
    }],
  }, null, 2));
  const match = runCli(dir, preload, 'demigod-match.mjs', [
    'add', pilotId, '--name', 'Mina Alvarez', '--links', talentEmail,
    '--why', 'Activation work lines up with the role', '--consent',
  ]);
  assert.equal(match.status, 0, match.stderr || match.stdout);
  const pilots = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), 'utf8'));
  pilots.pilots.find((row) => row.id === pilotId).status = 'intro';
  fs.writeFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), JSON.stringify(pilots, null, 2));
  const hired = runCli(dir, preload, 'demigod-close.mjs', [
    'hire', pilotId, '--start', START, '--comp', String(HIRE_COMP_DOLLARS),
  ]);
  assert.equal(hired.status, 0, hired.stderr || hired.stdout);
  const hireOut = JSON.parse(hired.stdout);
  assert.equal(hireOut.close.retentionChecks.d30.due, DAY_30);
  assert.equal(hireOut.close.retentionChecks.d60.due, DAY_60);
  assert.equal(hireOut.close.retentionChecks.d90.due, DAY_90);
  assert.equal(hireOut.invoiceDraft.feeCents, HIRE_FEE_CENTS);
  assert.equal(talent.record.raw['salary-expectation'], '$180k');
  return {
    dir, preload, calls, pilotId, hireOut, talent, partner, decoyTalent, decoyPartner, decoySubmitter,
  };
}

function recordFixture(ctx) {
  const fixture = path.join(ctx.dir, 'payment-observed.json');
  fs.writeFileSync(fixture, JSON.stringify({
    observed: true,
    amountCents: ctx.hireOut.invoiceDraft.feeCents,
    currency: 'USD',
    paidAt: DAY_90,
    retained: true,
  }));
  return runCli(ctx.dir, ctx.preload, 'demigod-close.mjs', [
    'payment', ctx.pilotId, '--observed', fixture, '--record',
  ]);
}

function assertUnreleased(ctx, checked) {
  assert.equal(checked.released, false);
  assert.equal(checked.day90Due, true);
  assert.equal(checked.releaseError, 'churn_blocks_release');
  assert.equal(checked.livePayment, false);
  const stored = storedChecks(ctx.dir, ctx.pilotId);
  assert.equal(stored.d30.status, 'complete');
  assert.equal(stored.d30.checkedOn, DAY_90);
  assert.equal(stored.d60.status, 'complete');
  assert.equal(stored.d60.checkedOn, DAY_90);
  assert.equal(stored.d90.status, 'complete');
  assert.equal(stored.d90.checkedOn, DAY_90);
  assert.equal(releasedPayout(ctx.dir, ctx.pilotId), null);
  const ledger = JSON.parse(fs.readFileSync(path.join(ctx.dir, 'DEMIGOD-REFERRAL-LEDGER.json'), 'utf8'));
  const talentPortion = ledger.portions.find((row) => row.submissionId === ctx.talent.record.id);
  const partnerPortion = ledger.portions.find((row) => row.submissionId === ctx.partner.record.id);
  assert.equal(talentPortion.settlementStatus, 'payable_on_observed_payment');
  assert.equal(partnerPortion.settlementStatus, 'payable_on_observed_payment');
  assert.equal(talentPortion.portionCents, HIRE_TALENT_PORTION_CENTS);
  assert.equal(partnerPortion.portionCents, HIRE_PARTNER_CREDIT_CENTS);
  assert.equal(partnerPortion.rewardMode, 'company_credit');
  assert.equal(partnerPortion.personalCash, false);
  assert.equal(includesDecoy(ledger.portions, ctx.decoyTalent.record.id, ctx.decoyPartner.record.id, ctx.decoySubmitter), false);
  const drafts = JSON.parse(fs.readFileSync(path.join(ctx.dir, 'DEMIGOD-INVOICE-DRAFTS.json'), 'utf8'));
  const draft = drafts.records.find((row) => row.pilotId === ctx.pilotId);
  assert.equal(includesDecoy(draft.portions, ctx.decoyTalent.record.id, ctx.decoyPartner.record.id, ctx.decoySubmitter), false);
  const fixture = path.join(ctx.dir, 'payment-direct.json');
  fs.writeFileSync(fixture, JSON.stringify({
    observed: true,
    amountCents: ctx.hireOut.invoiceDraft.feeCents,
    currency: 'USD',
    paidAt: DAY_90,
    retained: true,
  }));
  const direct = runCli(ctx.dir, ctx.preload, 'demigod-close.mjs', [
    'payment', ctx.pilotId, '--observed', fixture, '--force',
  ]);
  assert.notEqual(direct.status, 0);
  assert.equal(String(direct.stderr || '').includes('churn_blocks_release'), true);
  assert.equal(releasedPayout(ctx.dir, ctx.pilotId), null);
  assert.equal(ctx.calls.length, 0);
  return { stored, talentPortion, partnerPortion, directStatus: direct.status };
}

describe('churn blocks referrer release', { concurrency: 1 }, () => {
  test('a fixture stored before churn does not release on day 90', async (t) => {
    const ctx = await hiredPilot(t);
    const recorded = recordFixture(ctx);
    assert.equal(recorded.status, 0, recorded.stderr || recorded.stdout);
    assert.equal(JSON.parse(recorded.stdout).released, false);
    const churned = runCli(ctx.dir, ctx.preload, 'demigod-close.mjs', [
      'churn', ctx.pilotId, '--note', 'Left before day 90',
    ]);
    assert.equal(churned.status, 0, churned.stderr || churned.stdout);
    assert.equal(JSON.parse(churned.stdout).status, 'churned');
    const checked = runCli(ctx.dir, ctx.preload, 'demigod-close.mjs', [
      'check', ctx.pilotId, '--date', DAY_90,
    ]);
    assert.equal(checked.status, 0, checked.stderr || checked.stdout);
    const out = assertUnreleased(ctx, JSON.parse(checked.stdout));
    console.log(JSON.stringify({
      order: 'fixture-then-churn',
      released: false,
      d90: out.stored.d90.status,
      d90CheckedOn: out.stored.d90.checkedOn,
      talentSettlement: out.talentPortion.settlementStatus,
      partnerSettlement: out.partnerPortion.settlementStatus,
      talentPortionCents: out.talentPortion.portionCents,
      partnerPortionCents: out.partnerPortion.portionCents,
      directBlocked: out.directStatus !== 0,
      livePaymentCalls: ctx.calls.length,
    }));
  });

  test('a fixture stored after churn does not release on day 90', async (t) => {
    const ctx = await hiredPilot(t);
    const churned = runCli(ctx.dir, ctx.preload, 'demigod-close.mjs', [
      'churn', ctx.pilotId, '--note', 'Left before the fixture',
    ]);
    assert.equal(churned.status, 0, churned.stderr || churned.stdout);
    const recorded = recordFixture(ctx);
    assert.equal(recorded.status, 0, recorded.stderr || recorded.stdout);
    assert.equal(JSON.parse(recorded.stdout).released, false);
    assert.equal(releasedPayout(ctx.dir, ctx.pilotId), null);
    const checked = runCli(ctx.dir, ctx.preload, 'demigod-close.mjs', [
      'check', ctx.pilotId, '--date', DAY_90,
    ]);
    assert.equal(checked.status, 0, checked.stderr || checked.stdout);
    const out = assertUnreleased(ctx, JSON.parse(checked.stdout));
    console.log(JSON.stringify({
      order: 'churn-then-fixture',
      released: false,
      d90: out.stored.d90.status,
      talentSettlement: out.talentPortion.settlementStatus,
      directBlocked: out.directStatus !== 0,
      livePaymentCalls: ctx.calls.length,
    }));
  });

  test('an unchurned day-90 check still releases and a later churn does not reverse it', async (t) => {
    const ctx = await hiredPilot(t);
    const recorded = recordFixture(ctx);
    assert.equal(recorded.status, 0, recorded.stderr || recorded.stdout);
    const checked = runCli(ctx.dir, ctx.preload, 'demigod-close.mjs', [
      'check', ctx.pilotId, '--date', DAY_90,
    ]);
    assert.equal(checked.status, 0, checked.stderr || checked.stdout);
    const paidOut = JSON.parse(checked.stdout);
    assert.equal(paidOut.released, true);
    assert.equal(paidOut.livePayment, false);
    assert.equal(paidOut.payout.status, 'released_local');
    assert.equal(paidOut.payout.baseSalaryCents, HIRE_BASE_CENTS);
    assert.equal(paidOut.payout.feeCents, HIRE_FEE_CENTS);
    const released = releasedPayout(ctx.dir, ctx.pilotId);
    const talentLine = released.lines.find((row) => row.submissionId === ctx.talent.record.id);
    const partnerLine = released.lines.find((row) => row.submissionId === ctx.partner.record.id);
    assert.equal(talentLine.portionCents, HIRE_TALENT_PORTION_CENTS);
    assert.equal(talentLine.rewardMode, 'fee_share');
    assert.equal(talentLine.personalCash, true);
    assert.equal(partnerLine.portionCents, HIRE_PARTNER_CREDIT_CENTS);
    assert.equal(partnerLine.rewardMode, 'company_credit');
    assert.equal(partnerLine.personalCash, false);
    assert.equal(includesDecoy(released.lines, ctx.decoyTalent.record.id, ctx.decoyPartner.record.id, ctx.decoySubmitter), false);
    const stored = storedChecks(ctx.dir, ctx.pilotId);
    assert.equal(stored.d90.status, 'complete');
    assert.equal(stored.d90.checkedOn, DAY_90);
    const churned = runCli(ctx.dir, ctx.preload, 'demigod-close.mjs', [
      'churn', ctx.pilotId, '--note', 'Left after the local release',
    ]);
    assert.equal(churned.status, 0, churned.stderr || churned.stdout);
    const still = releasedPayout(ctx.dir, ctx.pilotId);
    assert.equal(still.status, 'released_local');
    assert.equal(still.lines.find((row) => row.submissionId === ctx.talent.record.id).portionCents, HIRE_TALENT_PORTION_CENTS);
    const ledger = JSON.parse(fs.readFileSync(path.join(ctx.dir, 'DEMIGOD-REFERRAL-LEDGER.json'), 'utf8'));
    assert.equal(ledger.portions.find((row) => row.submissionId === ctx.talent.record.id).settlementStatus, 'released_local');
    assert.equal(ledger.portions.find((row) => row.submissionId === ctx.partner.record.id).settlementStatus, 'released_local');
    assert.equal(ctx.calls.length, 0);
    console.log(JSON.stringify({
      order: 'unchurned-release',
      released: true,
      payoutStatus: still.status,
      talentPortionCents: talentLine.portionCents,
      partnerPortionCents: partnerLine.portionCents,
      partnerRewardMode: partnerLine.rewardMode,
      reversedAfterChurn: false,
      livePaymentCalls: ctx.calls.length,
    }));
  });
});
