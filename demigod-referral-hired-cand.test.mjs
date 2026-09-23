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

function includesDecoy(rows, ids, emails) {
  return (rows || []).some((row) => (
    ids.includes(row.submissionId)
    || emails.includes(row.submitterEmail)
  ));
}

async function twoMatches(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-hired-cand-'));
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
  const otherEmail = `jules.okonkwo.${stamp}@baymail.co`;
  const otherSubmitter = `priya.nair.${stamp}@baymail.co`;
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
  const other = ingestSubmission({
    name: 'engineer-join',
    data: {
      'submitted-by': otherSubmitter,
      'submitted-by-name': 'Priya Nair',
      'full-name': 'Jules Okonkwo',
      'seeker-email': otherEmail,
      'skills-stack': 'Go, billing work',
      experience: 'Led a billing rebuild',
      'sf-bay': 'yes',
      availability: 'now',
      'salary-expectation': '$160k',
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
      role: roleTitle,
      status: 'matching',
      outcome90d: 'Ship the activation rebuild',
      shortlist: [],
    }],
  }, null, 2));
  const minaMatch = runCli(dir, preload, 'demigod-match.mjs', [
    'add', pilotId, '--name', 'Mina Alvarez', '--links', talentEmail,
    '--why', 'Activation work lines up with the role', '--consent',
  ]);
  assert.equal(minaMatch.status, 0, minaMatch.stderr || minaMatch.stdout);
  const minaOut = JSON.parse(minaMatch.stdout);
  const julesMatch = runCli(dir, preload, 'demigod-match.mjs', [
    'add', pilotId, '--name', 'Jules Okonkwo', '--links', otherEmail,
    '--why', 'Billing work is a different seat', '--consent',
  ]);
  assert.equal(julesMatch.status, 0, julesMatch.stderr || julesMatch.stdout);
  const julesOut = JSON.parse(julesMatch.stdout);
  const pilots = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), 'utf8'));
  const pilot = pilots.pilots.find((row) => row.id === pilotId);
  pilot.status = 'intro';
  fs.writeFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), JSON.stringify(pilots, null, 2));
  const decoyIds = [decoyTalent.record.id, decoyPartner.record.id];
  const decoyEmails = [decoySubmitter];
  return {
    dir, preload, calls, pilotId, talent, other, partner, otherSubmitter,
    minaCandId: minaOut.candidate.id,
    minaPairId: minaOut.pairId,
    julesCandId: julesOut.candidate.id,
    julesPairId: julesOut.pairId,
    decoyIds, decoyEmails,
  };
}

function hire(ctx, candId) {
  const args = ['hire', ctx.pilotId, '--start', START, '--comp', String(HIRE_COMP_DOLLARS)];
  if (candId) args.push('--cand', candId);
  return runCli(ctx.dir, ctx.preload, 'demigod-close.mjs', args);
}

function recordFixture(ctx, feeCents) {
  const fixture = path.join(ctx.dir, 'payment-observed.json');
  fs.writeFileSync(fixture, JSON.stringify({
    observed: true,
    amountCents: feeCents,
    currency: 'USD',
    paidAt: DAY_90,
    retained: true,
  }));
  return {
    fixture,
    recorded: runCli(ctx.dir, ctx.preload, 'demigod-close.mjs', [
      'payment', ctx.pilotId, '--observed', fixture, '--record',
    ]),
  };
}

function ledgerRows(ctx) {
  return JSON.parse(fs.readFileSync(path.join(ctx.dir, 'DEMIGOD-REFERRAL-LEDGER.json'), 'utf8')).portions;
}

describe('hire pays only the named candidate', { concurrency: 1 }, () => {
  test('a second shortlisted person stays off the invoice and the day-90 release', async (t) => {
    const ctx = await twoMatches(t);
    const unnamed = hire(ctx);
    assert.notEqual(unnamed.status, 0);
    assert.equal(String(unnamed.stderr || '').includes('hired_candidate_required'), true);
    const still = JSON.parse(fs.readFileSync(path.join(ctx.dir, 'DEMIGOD-PILOTS.json'), 'utf8'))
      .pilots.find((row) => row.id === ctx.pilotId);
    assert.equal(still.status, 'intro');
    assert.equal(fs.existsSync(path.join(ctx.dir, 'DEMIGOD-INVOICE-DRAFTS.json')), false);

    const hired = hire(ctx, ctx.minaCandId);
    assert.equal(hired.status, 0, hired.stderr || hired.stdout);
    const hireOut = JSON.parse(hired.stdout);
    assert.equal(hireOut.close.hiredCandId, ctx.minaCandId);
    assert.equal(hireOut.close.hiredPairId, ctx.minaPairId);
    assert.equal(hireOut.invoiceDraft.hiredCandId, ctx.minaCandId);
    assert.equal(hireOut.invoiceDraft.feeCents, HIRE_FEE_CENTS);
    assert.equal(hireOut.invoiceDraft.baseSalaryCents, HIRE_BASE_CENTS);
    const draftLines = hireOut.invoiceDraft.portions;
    const minaLine = draftLines.find((row) => row.submissionId === ctx.talent.record.id);
    const partnerLine = draftLines.find((row) => row.submissionId === ctx.partner.record.id);
    assert.equal(minaLine.portionCents, HIRE_TALENT_PORTION_CENTS);
    assert.equal(minaLine.rewardMode, 'fee_share');
    assert.equal(minaLine.personalCash, true);
    assert.equal(partnerLine.portionCents, HIRE_PARTNER_CREDIT_CENTS);
    assert.equal(partnerLine.rewardMode, 'company_credit');
    assert.equal(partnerLine.personalCash, false);
    assert.equal(draftLines.some((row) => row.submissionId === ctx.other.record.id), false);
    assert.equal(draftLines.some((row) => row.submitterEmail === ctx.otherSubmitter), false);
    assert.equal(draftLines.filter((row) => row.submissionId === ctx.partner.record.id).length, 1);
    assert.equal(includesDecoy(draftLines, ctx.decoyIds, ctx.decoyEmails), false);

    const { recorded } = recordFixture(ctx, hireOut.invoiceDraft.feeCents);
    assert.equal(recorded.status, 0, recorded.stderr || recorded.stdout);
    assert.equal(JSON.parse(recorded.stdout).released, false);
    const checked = runCli(ctx.dir, ctx.preload, 'demigod-close.mjs', [
      'check', ctx.pilotId, '--date', DAY_90,
    ]);
    assert.equal(checked.status, 0, checked.stderr || checked.stdout);
    const paid = JSON.parse(checked.stdout);
    assert.equal(paid.released, true);
    assert.equal(paid.livePayment, false);
    assert.equal(paid.payout.status, 'released_local');
    assert.equal(paid.payout.baseSalaryCents, HIRE_BASE_CENTS);
    const released = releasedPayout(ctx.dir, ctx.pilotId);
    assert.equal(released.lines.some((row) => row.submissionId === ctx.other.record.id), false);
    assert.equal(released.lines.some((row) => row.submitterEmail === ctx.otherSubmitter), false);
    assert.equal(includesDecoy(released.lines, ctx.decoyIds, ctx.decoyEmails), false);
    const rows = ledgerRows(ctx);
    assert.equal(rows.find((row) => row.submissionId === ctx.talent.record.id && row.pairId === ctx.minaPairId).settlementStatus, 'released_local');
    assert.equal(rows.find((row) => row.submissionId === ctx.other.record.id).settlementStatus, undefined);
    assert.equal(rows.find((row) => row.submissionId === ctx.other.record.id).invoiceDraftId, undefined);
    assert.equal(ctx.calls.length, 0);
    console.log(JSON.stringify({
      order: 'named-candidate',
      unnamedBlocked: true,
      hiredCandId: hireOut.close.hiredCandId,
      otherOnDraft: false,
      otherOnPayout: false,
      decoyOnPayout: false,
      talentPortionCents: minaLine.portionCents,
      partnerPortionCents: partnerLine.portionCents,
      partnerRewardMode: partnerLine.rewardMode,
      released: true,
      livePaymentCalls: ctx.calls.length,
    }));
  });

  test('a rejected shortlisted pair cannot be hired and stays off the other hire release', async (t) => {
    const ctx = await twoMatches(t);
    const rejected = runCli(ctx.dir, ctx.preload, 'demigod-match-review.mjs', [
      'review', ctx.julesPairId, '--decision', 'reject', '--note', 'Different seat',
    ]);
    assert.equal(rejected.status, 0, rejected.stderr || rejected.stdout);
    assert.equal(JSON.parse(rejected.stdout).pair.state, 'rejected');
    const blocked = hire(ctx, ctx.julesCandId);
    assert.notEqual(blocked.status, 0);
    assert.equal(String(blocked.stderr || '').includes('rejected_pair_blocks_hire'), true);
    const still = JSON.parse(fs.readFileSync(path.join(ctx.dir, 'DEMIGOD-PILOTS.json'), 'utf8'))
      .pilots.find((row) => row.id === ctx.pilotId);
    assert.equal(still.status, 'intro');
    assert.equal(fs.existsSync(path.join(ctx.dir, 'DEMIGOD-INVOICE-DRAFTS.json')), false);

    const hired = hire(ctx, ctx.minaCandId);
    assert.equal(hired.status, 0, hired.stderr || hired.stdout);
    const hireOut = JSON.parse(hired.stdout);
    assert.equal(hireOut.invoiceDraft.portions.some((row) => row.submissionId === ctx.other.record.id), false);
    const { fixture, recorded } = recordFixture(ctx, hireOut.invoiceDraft.feeCents);
    assert.equal(recorded.status, 0, recorded.stderr || recorded.stdout);
    const direct = runCli(ctx.dir, ctx.preload, 'demigod-close.mjs', [
      'payment', ctx.pilotId, '--observed', fixture,
    ]);
    assert.equal(direct.status, 0, direct.stderr || direct.stdout);
    const paid = JSON.parse(direct.stdout);
    assert.equal(paid.payout.status, 'released_local');
    assert.equal(paid.payout.livePayment, false);
    assert.equal(paid.payout.lines.some((row) => row.submissionId === ctx.other.record.id), false);
    assert.equal(paid.payout.lines.find((row) => row.submissionId === ctx.talent.record.id).portionCents, HIRE_TALENT_PORTION_CENTS);
    assert.equal(paid.payout.lines.find((row) => row.submissionId === ctx.partner.record.id).portionCents, HIRE_PARTNER_CREDIT_CENTS);
    assert.equal(paid.payout.lines.find((row) => row.submissionId === ctx.partner.record.id).personalCash, false);
    assert.equal(includesDecoy(paid.payout.lines, ctx.decoyIds, ctx.decoyEmails), false);
    assert.equal(ctx.calls.length, 0);
    console.log(JSON.stringify({
      order: 'rejected-other-pair',
      rejectedHireBlocked: true,
      otherOnPayout: false,
      talentPortionCents: HIRE_TALENT_PORTION_CENTS,
      partnerPortionCents: HIRE_PARTNER_CREDIT_CENTS,
      released: true,
      livePaymentCalls: ctx.calls.length,
    }));
  });

  test('rejecting the hired pair before day 90 blocks release and does not pay the other person', async (t) => {
    const ctx = await twoMatches(t);
    const hired = hire(ctx, ctx.minaCandId);
    assert.equal(hired.status, 0, hired.stderr || hired.stdout);
    const hireOut = JSON.parse(hired.stdout);
    const rejected = runCli(ctx.dir, ctx.preload, 'demigod-match-review.mjs', [
      'review', ctx.minaPairId, '--decision', 'reject', '--note', 'Declined after the hire record',
    ]);
    assert.equal(rejected.status, 0, rejected.stderr || rejected.stdout);
    const { fixture, recorded } = recordFixture(ctx, hireOut.invoiceDraft.feeCents);
    assert.equal(recorded.status, 0, recorded.stderr || recorded.stdout);
    assert.equal(JSON.parse(recorded.stdout).released, false);
    const checked = runCli(ctx.dir, ctx.preload, 'demigod-close.mjs', [
      'check', ctx.pilotId, '--date', DAY_90,
    ]);
    assert.equal(checked.status, 0, checked.stderr || checked.stdout);
    const out = JSON.parse(checked.stdout);
    assert.equal(out.released, false);
    assert.equal(out.releaseError, 'rejected_pair_blocks_release');
    assert.equal(out.livePayment, false);
    assert.equal(out.retentionChecks.d90.status, 'complete');
    assert.equal(releasedPayout(ctx.dir, ctx.pilotId), null);
    const direct = runCli(ctx.dir, ctx.preload, 'demigod-close.mjs', [
      'payment', ctx.pilotId, '--observed', fixture, '--force',
    ]);
    assert.notEqual(direct.status, 0);
    assert.equal(String(direct.stderr || '').includes('rejected_pair_blocks_release'), true);
    const rows = ledgerRows(ctx);
    assert.notEqual(rows.find((row) => row.submissionId === ctx.talent.record.id).settlementStatus, 'released_local');
    assert.notEqual(rows.find((row) => row.submissionId === ctx.other.record.id).settlementStatus, 'released_local');
    assert.equal(ctx.calls.length, 0);
    console.log(JSON.stringify({
      order: 'reject-hired-pair',
      released: false,
      releaseError: out.releaseError,
      d90: out.retentionChecks.d90.status,
      otherReleased: false,
      directBlocked: true,
      livePaymentCalls: ctx.calls.length,
    }));
  });
});
