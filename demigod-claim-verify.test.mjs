import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-claim-verify.mjs');
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-CLAIM-VERIFY.json');
const CHECKOUT_LOG = path.join(OPS, 'docs', 'receipts', 'CLAIM-VERIFY-LOG.jsonl');
const BUSY_REPORT = '/tmp/dg-busy/claim-verify-latest.json';

function run(dir, args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      DEMIGOD_LIVE: 'http://127.0.0.1:9',
      CDP_URL: 'http://127.0.0.1:9',
    },
    encoding: 'utf8',
    timeout: 20000,
  });
}

function readJson(res, label) {
  const raw = String(res.stdout || '').trim().startsWith('{') ? res.stdout : res.stderr;
  let parsed = null;
  try {
    parsed = JSON.parse(String(raw || '').trim());
  } catch {
    parsed = null;
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

function snapshot(file) {
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-CLAIM-VERIFY.json');
}

function logFile(dir) {
  return path.join(dir, 'docs', 'receipts', 'CLAIM-VERIFY-LOG.jsonl');
}

function writeRoot(dir, note) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), 'const harbor = 1;\n');
  fs.writeFileSync(path.join(dir, 'harbor-note.txt'), `${note}\n`);
}

describe('claim verify', { concurrency: 1 }, () => {
  test('a claim check stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-claim-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-claim-west-'));
    const checkoutReport = snapshot(CHECKOUT_REPORT);
    const checkoutLog = snapshot(CHECKOUT_LOG);
    const busyReport = snapshot(BUSY_REPORT);
    t.after(() => {
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    writeRoot(east, 'Harbor East keep');
    writeRoot(west, 'Harbor West keep');

    const refused = run(east, ['--publish']);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.sent, false);
    assert.equal(refusedOut.liveMail, false);
    assert.equal(refusedOut.livePublish, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(logFile(east)), false);
    assert.equal((refused.stdout + refused.stderr).includes('www.trydemigod.com'), false);
    assert.deepEqual(snapshot(BUSY_REPORT), busyReport);

    const eastRun = run(east, ['--file', 'harbor-note.txt', '--grep', 'Harbor East keep']);
    assert.equal(eastRun.status, 0, `east claim failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.pass, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/tmp/dg-busy'), false);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.path, reportFile(east));
    assert.equal(stored.pass, true);
    assert.equal(JSON.stringify(stored).includes('Harbor East keep'), true);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastLog = fs.readFileSync(logFile(east), 'utf8');
    assert.equal(eastLog.includes('Harbor East keep'), true);
    assert.equal(eastLog.includes('Harbor West keep'), false);
    const eastBytes = snapshot(reportFile(east));
    const eastLogBytes = snapshot(logFile(east));

    const westRun = run(west, ['--file', 'harbor-note.txt', '--grep', 'Harbor West keep']);
    assert.equal(westRun.status, 0, `west claim failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.pass, true);
    const westStored = JSON.parse(fs.readFileSync(reportFile(west), 'utf8'));
    assert.equal(JSON.stringify(westStored).includes('Harbor West keep'), true);
    assert.equal(JSON.stringify(westStored).includes('Harbor East keep'), false);
    assert.equal(fs.readFileSync(logFile(west), 'utf8').includes('Harbor West keep'), true);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);
    assert.deepEqual(snapshot(logFile(east)), eastLogBytes);

    assert.deepEqual(snapshot(BUSY_REPORT), busyReport);
    assert.deepEqual(snapshot(CHECKOUT_REPORT), checkoutReport);
    assert.deepEqual(snapshot(CHECKOUT_LOG), checkoutLog);
  });
});
