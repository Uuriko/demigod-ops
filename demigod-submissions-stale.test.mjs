import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const STALE = path.join(OPS, 'demigod-submissions-stale.mjs');
const BUSY_REPORT = '/tmp/dg-busy/submissions-stale.json';
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-SUBMISSIONS-STALE.json');

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, STALE, ...args], {
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

function writeInbox(dir, items) {
  fs.writeFileSync(path.join(dir, 'DEMIGOD-SUBMISSIONS-INBOX.json'), JSON.stringify({
    items,
  }, null, 2));
}

describe('stale submission report', { concurrency: 1 }, () => {
  test('a stale report stays in that data root and does not hide the other inbox', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-stale-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-stale-west-'));
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

    writeInbox(east, [
      {
        id: 'sub-harbor-east',
        form: 'startup-hire',
        status: 'new',
        at: '2026-09-20T08:00:00.000Z',
        raw: { 'company-name': 'Harbor East', 'contact-email': 'ada@harbor.example' },
      },
      {
        id: 'sub-harbor-fresh',
        form: 'startup-hire',
        status: 'new',
        at: '2026-09-23T08:50:00.000Z',
        raw: { 'company-name': 'Harbor East', 'contact-email': 'ada@harbor.example' },
      },
      {
        id: 'sub-harbor-handled',
        form: 'startup-hire',
        status: 'reviewed',
        at: '2026-09-01T08:00:00.000Z',
        raw: { 'company-name': 'Harbor East', 'contact-email': 'ada@harbor.example' },
      },
    ]);
    writeInbox(west, [
      {
        id: 'sub-harbor-west',
        form: 'engineer-join',
        status: 'new',
        at: '2026-09-19T08:00:00.000Z',
        raw: { 'company-name': 'Harbor West', 'contact-email': 'sam@harbor.example' },
      },
    ]);

    const busyBefore = fs.existsSync(BUSY_REPORT) ? fs.readFileSync(BUSY_REPORT, 'utf8') : '';
    const checkoutBefore = fs.existsSync(CHECKOUT_REPORT) ? fs.readFileSync(CHECKOUT_REPORT, 'utf8') : null;

    const eastRun = run(east, preload, ['--json', '--hours', '48']);
    assert.equal(eastRun.status, 2);
    const eastReport = readJson(eastRun, 'east stale');
    assert.equal(eastReport.staleCount, 1);
    assert.equal(eastReport.totalNew, 2);
    assert.deepEqual(eastReport.stale.map((row) => row.id), ['sub-harbor-east']);
    assert.equal(eastReport.report, path.join(east, 'DEMIGOD-SUBMISSIONS-STALE.json'));
    assert.equal(eastReport.sent, false);
    assert.equal(eastReport.liveMail, false);
    const eastFile = fs.readFileSync(eastReport.report, 'utf8');
    assert.match(eastFile, /sub-harbor-east/);
    assert.doesNotMatch(eastFile, /sub-harbor-west/);
    assert.doesNotMatch(eastFile, /sub-harbor-fresh/);
    assert.doesNotMatch(eastFile, /sub-harbor-handled/);

    const westRun = run(west, preload, ['--json', '--hours', '48']);
    assert.equal(westRun.status, 2);
    const westReport = readJson(westRun, 'west stale');
    assert.equal(westReport.staleCount, 1);
    assert.deepEqual(westReport.stale.map((row) => row.id), ['sub-harbor-west']);
    assert.equal(westReport.report, path.join(west, 'DEMIGOD-SUBMISSIONS-STALE.json'));
    assert.equal(westReport.sent, false);
    assert.equal(westReport.liveMail, false);
    const westFile = fs.readFileSync(westReport.report, 'utf8');
    assert.match(westFile, /sub-harbor-west/);
    assert.doesNotMatch(westFile, /sub-harbor-east/);
    assert.equal(fs.readFileSync(eastReport.report, 'utf8'), eastFile);

    const busyAfter = fs.existsSync(BUSY_REPORT) ? fs.readFileSync(BUSY_REPORT, 'utf8') : '';
    assert.equal(busyAfter, busyBefore);
    assert.equal(busyAfter.includes('sub-harbor-east'), false);
    assert.equal(busyAfter.includes('sub-harbor-west'), false);
    const checkoutAfter = fs.existsSync(CHECKOUT_REPORT) ? fs.readFileSync(CHECKOUT_REPORT, 'utf8') : null;
    assert.equal(checkoutAfter, checkoutBefore);
    assert.equal(fs.existsSync(flag), false);
    assert.equal(String(eastRun.stdout + eastRun.stderr).includes('fetch'), false);
  });
});
