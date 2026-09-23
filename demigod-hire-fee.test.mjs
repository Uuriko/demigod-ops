import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PUBLISHED_REFERRAL_TERMS, roundBps } from './demigod-referral-ledger.mjs';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLOSE = path.join(OPS, 'demigod-close.mjs');
const PILOT = 'pilot-harbor';
const CAND = 'cand-mina';
const COMP = 180001;

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, CLOSE, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
}

function readJson(res, label) {
  const raw = res.status === 0 ? res.stdout : res.stderr;
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

function releasedCount(dir) {
  const payoutFile = path.join(dir, 'DEMIGOD-PLACEMENT-PAYOUTS.json');
  if (!fs.existsSync(payoutFile)) return 0;
  const records = JSON.parse(fs.readFileSync(payoutFile, 'utf8')).records || [];
  return records.filter((row) => row.status === 'released_local').length;
}

describe('hire fee matches invoice', { concurrency: 1 }, () => {
  test('a rounded-dollar payment does not settle the published fee', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-hire-fee-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = dir;
    const flag = path.join(dir, 'fetch-calls.log');
    const preload = path.join(dir, 'no-live-pay.mjs');
    fs.writeFileSync(preload, `import fs from 'node:fs';
globalThis.fetch = async () => {
  fs.appendFileSync(${JSON.stringify(flag)}, 'fetch\\n');
  throw new Error('live_payment');
};
`);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(dir, { recursive: true, force: true });
    });

    fs.writeFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), `${JSON.stringify({
      at: new Date().toISOString(),
      pilots: [{
        id: PILOT,
        company: 'Harbor Lane',
        role: 'Founding Engineer',
        status: 'intro',
        shortlist: [{ id: CAND, name: 'Mina Alvarez', links: 'mina.alvarez@baymail.co' }],
        history: [],
      }],
    }, null, 2)}\n`);
    fs.writeFileSync(path.join(dir, 'DEMIGOD-PAIRS.json'), `${JSON.stringify({
      at: new Date().toISOString(),
      pairs: {
        'pair-mina': {
          pairId: 'pair-mina',
          roleId: PILOT,
          candId: CAND,
          state: 'proposed',
        },
      },
    }, null, 2)}\n`);

    const hired = readJson(run(dir, preload, [
      'hire', PILOT, '--start', '2026-10-01', '--comp', String(COMP), '--cand', CAND,
    ]), 'hire');
    const publishedFee = roundBps(COMP * 100, PUBLISHED_REFERRAL_TERMS.placementFeeBps);
    const roundedDollarCents = Math.round(COMP * 0.1) * 100;
    assert.equal(hired.ok, true);
    assert.equal(hired.close.feeEstimate, publishedFee);
    assert.equal(hired.close.feeEstimateCents, publishedFee);
    assert.equal(hired.invoiceDraft.feeCents, publishedFee);
    assert.notEqual(publishedFee, roundedDollarCents);
    assert.equal(hired.invoiceDraft.livePayment, false);
    assert.equal(hired.close.invoiceDryRun, true);

    const stored = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), 'utf8')).pilots[0];
    assert.equal(stored.close.feeEstimate, hired.invoiceDraft.feeCents);
    assert.equal(stored.close.feeEstimateCents, hired.invoiceDraft.feeCents);
    assert.equal(stored.status, 'hired');

    const paidAt = hired.close.retentionChecks.d90.due;
    const wrong = path.join(dir, 'observed-rounded.json');
    fs.writeFileSync(wrong, `${JSON.stringify({
      observed: true,
      amountCents: roundedDollarCents,
      currency: 'USD',
      paidAt,
      retained: true,
    })}\n`);
    const mismatch = run(dir, preload, ['payment', PILOT, '--observed', wrong]);
    const mismatchBody = readJson(mismatch, 'rounded payment');
    assert.equal(mismatch.status, 1);
    assert.equal(mismatchBody.ok, false);
    assert.equal(mismatchBody.error, 'settlement_amount_mismatch');
    assert.equal(releasedCount(dir), 0);

    const right = path.join(dir, 'observed-published.json');
    fs.writeFileSync(right, `${JSON.stringify({
      observed: true,
      amountCents: hired.close.feeEstimate,
      currency: 'USD',
      paidAt,
      retained: true,
    })}\n`);
    const matched = run(dir, preload, ['payment', PILOT, '--observed', right]);
    const matchedBody = readJson(matched, 'published payment');
    assert.equal(matched.status, 1);
    assert.equal(matchedBody.ok, false);
    assert.equal(matchedBody.error, 'portions_required');
    assert.equal(releasedCount(dir), 0);
    assert.equal(fs.existsSync(flag), false);
  });
});
