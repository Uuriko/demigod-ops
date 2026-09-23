import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const RECONCILE = path.join(OPS, 'demigod-ops-reconcile.mjs');
const BUSY_STALE = '/tmp/dg-busy/submissions-stale.json';
const BUSY_REPORT = '/tmp/dg-busy/ops-reconcile.json';
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-OPS-RECONCILE.json');

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, RECONCILE, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
}

function readJson(res, label) {
  const line = String(res.stdout || '').trim().split('\n').filter((row) => row.trim().startsWith('{')).at(-1);
  let parsed = null;
  try {
    parsed = JSON.parse(line || '');
  } catch {
    parsed = null;
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

function writeStale(dir, ids) {
  fs.writeFileSync(path.join(dir, 'DEMIGOD-SUBMISSIONS-STALE.json'), JSON.stringify({
    staleCount: ids.length,
    stale: ids.map((id) => ({ id, form: 'startup-hire', status: 'new' })),
    sent: false,
    liveMail: false,
  }, null, 2));
}

describe('ops reconcile', { concurrency: 1 }, () => {
  test('a reconcile reads that inbox stale report and does not hide the other inbox', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-reconcile-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-reconcile-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const flag = path.join(east, 'fetch-calls.log');
    const preload = path.join(east, 'no-live-pay.mjs');
    fs.writeFileSync(preload, `import fs from 'node:fs';
globalThis.fetch = async () => {
  fs.appendFileSync(${JSON.stringify(flag)}, 'fetch\\n');
  throw new Error('live_payment');
};
`);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    writeStale(east, ['sub-harbor-east']);
    writeStale(west, ['sub-harbor-west', 'sub-harbor-west-2']);
    const busyStaleBefore = fs.existsSync(BUSY_STALE) ? fs.readFileSync(BUSY_STALE, 'utf8') : '';
    const busyReportBefore = fs.existsSync(BUSY_REPORT) ? fs.readFileSync(BUSY_REPORT, 'utf8') : '';
    const checkoutBefore = fs.existsSync(CHECKOUT_REPORT) ? fs.readFileSync(CHECKOUT_REPORT, 'utf8') : null;

    const eastRun = run(east, preload, ['--json']);
    assert.equal(eastRun.status, 2);
    const eastReport = readJson(eastRun, 'east reconcile');
    assert.equal(eastReport.ok, false);
    assert.equal(eastReport.counts.staleNew, 1);
    assert.deepEqual(eastReport.staleIds, ['sub-harbor-east']);
    assert.equal(eastReport.staleReport, path.join(east, 'DEMIGOD-SUBMISSIONS-STALE.json'));
    assert.equal(eastReport.report, path.join(east, 'DEMIGOD-OPS-RECONCILE.json'));
    assert.equal(eastReport.sent, false);
    assert.equal(eastReport.liveMail, false);
    assert.equal(eastReport.gaps.some((gap) => gap.severity === 'P1' && gap.msg.includes('1 stale')), true);
    const eastFile = fs.readFileSync(eastReport.report, 'utf8');
    assert.match(eastFile, /sub-harbor-east/);
    assert.doesNotMatch(eastFile, /sub-harbor-west/);

    const westRun = run(west, preload, ['--json']);
    assert.equal(westRun.status, 2);
    const westReport = readJson(westRun, 'west reconcile');
    assert.equal(westReport.counts.staleNew, 2);
    assert.deepEqual(westReport.staleIds, ['sub-harbor-west', 'sub-harbor-west-2']);
    assert.equal(westReport.report, path.join(west, 'DEMIGOD-OPS-RECONCILE.json'));
    const westFile = fs.readFileSync(westReport.report, 'utf8');
    assert.match(westFile, /sub-harbor-west/);
    assert.doesNotMatch(westFile, /sub-harbor-east/);
    assert.equal(fs.readFileSync(eastReport.report, 'utf8'), eastFile);

    const busyStaleAfter = fs.existsSync(BUSY_STALE) ? fs.readFileSync(BUSY_STALE, 'utf8') : '';
    const busyReportAfter = fs.existsSync(BUSY_REPORT) ? fs.readFileSync(BUSY_REPORT, 'utf8') : '';
    assert.equal(busyStaleAfter, busyStaleBefore);
    assert.equal(busyReportAfter, busyReportBefore);
    assert.equal(busyReportAfter.includes('sub-harbor-east'), false);
    assert.equal(fs.existsSync(CHECKOUT_REPORT) ? fs.readFileSync(CHECKOUT_REPORT, 'utf8') : null, checkoutBefore);
    assert.equal(fs.existsSync(flag), false);
    assert.equal(`${eastRun.stdout}\n${westRun.stdout}`.includes('fetch'), false);
  });
});