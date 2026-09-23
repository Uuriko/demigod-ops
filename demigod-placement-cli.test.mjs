import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const TRACKER = path.join(OPS, 'demigod-placement-tracker.mjs');
const SHARED_LOG = '/tmp/demigod-placements.log';
const START = '2026-01-15';
const SALARY = 180001;

function runTracker(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', preload, TRACKER, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
}

function sharedLogStamp() {
  if (!fs.existsSync(SHARED_LOG)) return null;
  const stat = fs.statSync(SHARED_LOG);
  return { size: stat.size, mtimeMs: stat.mtimeMs };
}

describe('placement hire log', { concurrency: 1 }, () => {
  test('a hire log uses the published fee and the UTC day-90 date', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-placement-'));
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
    const beforeShared = sharedLogStamp();
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(dir, { recursive: true, force: true });
    });

    const { retentionSchedule, PUBLISHED_REFERRAL_TERMS, roundBps } = await import('./demigod-referral-ledger.mjs');
    const expectedEnd = retentionSchedule(START).d90.due;
    const expectedFee = roundBps(SALARY * 100, PUBLISHED_REFERRAL_TERMS.placementFeeBps);
    const floatFee = Math.round(SALARY * 0.1) * 100;
    assert.notEqual(expectedFee, floatFee);
    assert.equal(expectedEnd, '2026-04-15');

    const payoutFile = path.join(dir, 'DEMIGOD-PLACEMENT-PAYOUTS.json');
    const logFile = path.join(dir, 'DEMIGOD-PLACEMENTS.jsonl');

    const bare = runTracker(dir, preload, []);
    assert.equal(bare.status, 2);
    assert.equal(JSON.parse(bare.stderr).error, 'hire_required');
    assert.equal(fs.existsSync(payoutFile), false);
    assert.equal(fs.existsSync(logFile), false);

    const badDate = runTracker(dir, preload, ['--hire', 'pilot-harbor', '2026-02-31', String(SALARY)]);
    assert.equal(badDate.status, 2);
    assert.equal(JSON.parse(badDate.stderr).error, 'start_date_invalid');
    assert.equal(fs.existsSync(payoutFile), false);

    const badSalary = runTracker(dir, preload, ['--hire', 'pilot-harbor', START, '0']);
    assert.equal(badSalary.status, 2);
    assert.equal(JSON.parse(badSalary.stderr).error, 'salary_required');
    assert.equal(fs.existsSync(payoutFile), false);

    const hired = runTracker(dir, preload, ['--hire', 'pilot-harbor', START, String(SALARY)]);
    assert.equal(hired.status, 0, hired.stderr);
    const body = JSON.parse(hired.stdout);
    assert.equal(body.ok, true);
    assert.equal(body.pilot, 'pilot-harbor');
    assert.equal(body.hireDate, START);
    assert.equal(body.salary, SALARY);
    assert.equal(body.feeCents, expectedFee);
    assert.equal(body.guaranteeEnd, expectedEnd);
    assert.equal(body.status, 'pending-invoice');
    assert.equal(body.dryRun, true);
    assert.equal(body.livePayment, false);
    assert.equal(body.paymentProvider, null);
    assert.equal(body.log, logFile);

    const store = JSON.parse(fs.readFileSync(payoutFile, 'utf8'));
    assert.equal(store.livePayment, false);
    assert.equal(store.dryRun, true);
    const payout = (store.records || []).find((row) => row.id === body.payoutId);
    assert.ok(payout);
    assert.equal(payout.pilotId, 'pilot-harbor');
    assert.equal(payout.hireDate, START);
    assert.equal(payout.baseSalaryCents, SALARY * 100);
    assert.equal(payout.feeCents, expectedFee);
    assert.equal(payout.status, 'completed_local');
    assert.equal(payout.dryRun, true);
    assert.equal(payout.livePayment, false);
    assert.equal(payout.payable, false);
    assert.equal(payout.paymentProvider, null);

    const logged = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    assert.equal(logged.feeCents, expectedFee);
    assert.equal(logged.guaranteeEnd, expectedEnd);
    assert.equal(logged.livePayment, false);
    assert.equal(fs.existsSync(flag), false);
    assert.deepEqual(sharedLogStamp(), beforeShared);
  });
});
