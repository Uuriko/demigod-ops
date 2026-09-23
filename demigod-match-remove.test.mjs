import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const MATCH = path.join(OPS, 'demigod-match.mjs');
const INTRO = path.join(OPS, 'demigod-intro.mjs');
const CLOSE = path.join(OPS, 'demigod-close.mjs');
const PILOT = 'pilot-harbor';

function run(dir, preload, script, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, script, ...args], {
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

describe('remove rejects pair', { concurrency: 1 }, () => {
  test('removing the hired candidate blocks the later payment release', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-remove-'));
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
        status: 'shortlist',
        outcome90d: 'Ship the billing path',
        'salary-range': '$180-220k',
        shortlist: [],
        history: [],
      }],
    }, null, 2)}\n`);

    const added = readJson(run(dir, preload, MATCH, [
      'add', PILOT, '--name', 'Mina Alvarez', '--why', 'Shipped a billing service', '--links', 'mina.alvarez@baymail.co', '--consent',
    ]), 'match add');
    assert.equal(added.ok, true);
    assert.equal(added.pair.roleId, PILOT);
    const candId = added.candidate.id;

    assert.equal(readJson(run(dir, preload, INTRO, ['yes', PILOT, '--side', 'founder', '--cand', candId]), 'founder yes').ok, true);
    assert.equal(readJson(run(dir, preload, INTRO, ['yes', PILOT, '--side', 'candidate', '--cand', candId]), 'candidate yes').mutual.candId, candId);
    const sent = readJson(run(dir, preload, INTRO, ['send', PILOT]), 'intro send');
    assert.equal(sent.status, 'intro');
    assert.equal(sent.sent, false);

    const hired = readJson(run(dir, preload, CLOSE, [
      'hire', PILOT, '--start', '2026-10-01', '--comp', '200000', '--cand', candId,
    ]), 'hire');
    assert.equal(hired.ok, true);
    assert.equal(hired.close.hiredCandId, candId);
    assert.equal(hired.close.hiredPairId, added.pairId);
    assert.equal(hired.invoiceDraft.livePayment, false);

    const removed = readJson(run(dir, preload, MATCH, ['remove', PILOT, '--id', candId]), 'remove');
    assert.equal(removed.ok, true);
    assert.equal(removed.pilotId, PILOT);
    assert.equal(removed.removed, candId);
    assert.equal(removed.pairId, added.pairId);
    assert.equal(removed.pairState, 'rejected');
    assert.equal(removed.shortlist.some((row) => row.id === candId), false);

    const pair = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PAIRS.json'), 'utf8')).pairs[added.pairId];
    assert.equal(pair.state, 'rejected');
    assert.equal(pair.roleId, PILOT);
    assert.equal(pair.candId, candId);
    const pilot = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PILOTS.json'), 'utf8')).pilots[0];
    assert.equal(pilot.status, 'hired');
    assert.equal(pilot.shortlist.some((row) => row.id === candId), false);

    const fixture = path.join(dir, 'observed.json');
    fs.writeFileSync(fixture, `${JSON.stringify({
      observed: true,
      amountCents: hired.invoiceDraft.feeCents,
      currency: 'USD',
      paidAt: hired.close.retentionChecks.d90.due,
      retained: true,
    })}\n`);
    const payment = run(dir, preload, CLOSE, ['payment', PILOT, '--observed', fixture]);
    const paymentBody = readJson(payment, 'payment after remove');
    assert.equal(payment.status, 1);
    assert.equal(paymentBody.ok, false);
    assert.equal(paymentBody.error, 'rejected_pair_blocks_release');

    const payoutFile = path.join(dir, 'DEMIGOD-PLACEMENT-PAYOUTS.json');
    const released = payoutFile && fs.existsSync(payoutFile)
      ? (JSON.parse(fs.readFileSync(payoutFile, 'utf8')).records || []).filter((row) => row.status === 'released_local')
      : [];
    assert.equal(released.length, 0);
    assert.equal(fs.existsSync(flag), false);
  });
});
