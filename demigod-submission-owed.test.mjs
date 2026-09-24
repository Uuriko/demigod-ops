import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('an ingested referral writes an owed record and does not pay', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-owed-'));
  const priorRoot = process.env.DEMIGOD_ROOT;
  process.env.DEMIGOD_ROOT = dir;
  const calls = [];
  const priorFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    calls.push('fetch');
    throw new Error('live_call');
  };
  try {
    const { ingestSubmission } = await import('./demigod-submissions-lib.mjs');
    const { roundBps, PUBLISHED_REFERRAL_TERMS } = await import('./demigod-referral-ledger.mjs');
    const stamp = Date.now();
    const planted = ingestSubmission({
      name: 'engineer-join',
      data: {
        'submitted-by': `riley.chen.${stamp}@baymail.co`,
        'submitted-by-name': 'Riley Chen',
        'full-name': 'Mina Alvarez',
        'seeker-email': `mina.alvarez.${stamp}@baymail.co`,
        'skills-stack': 'JavaScript, activation work',
        experience: 'Led an activation rebuild',
        'sf-bay': 'yes',
        availability: 'now',
        'salary-expectation': '$123,456',
      },
    });
    const self = ingestSubmission({
      name: 'engineer-join',
      data: {
        'submitted-by': `casey.nguyen.${stamp}@baymail.co`,
        'submitted-by-name': 'Casey Nguyen',
        'full-name': 'Casey Nguyen',
        'seeker-email': `casey.nguyen.${stamp}@baymail.co`,
        'salary-expectation': '$160k',
      },
    });
    const ledgerPath = path.join(dir, 'DEMIGOD-REFERRAL-LEDGER.json');
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    const row = ledger.estimates.find((item) => item.submissionId === planted.record.id);
    const baseSalaryCents = 12_345_600;
    const feeCents = roundBps(baseSalaryCents, PUBLISHED_REFERRAL_TERMS.placementFeeBps);
    const portionCents = roundBps(feeCents, PUBLISHED_REFERRAL_TERMS.individualTalentBps);
    assert.equal(row.baseSalaryCents, baseSalaryCents);
    assert.equal(row.feeCents, feeCents);
    assert.equal(row.portionCents, portionCents);
    assert.equal(row.rateBps, PUBLISHED_REFERRAL_TERMS.individualTalentBps);
    assert.equal(row.payable, false);
    assert.equal(row.livePayment, false);
    assert.equal(row.paymentProvider, null);
    assert.equal(row.owed, true);
    assert.equal(ledger.paymentCalls, 0);
    assert.equal(ledger.livePayout, false);
    assert.equal(ledger.portions.length, 0);
    assert.equal(ledger.estimates.some((item) => item.submissionId === self.record.id), false);
    assert.equal(calls.length, 0);
    assert.equal(fs.existsSync(path.join(dir, 'DEMIGOD-INVOICE-DRAFTS.json')), false);
  } finally {
    globalThis.fetch = priorFetch;
    if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
    else process.env.DEMIGOD_ROOT = priorRoot;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
