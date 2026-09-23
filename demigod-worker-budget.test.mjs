import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const BUDGET = path.join(OPS, 'demigod-worker-budget.mjs');
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-WORKER-BUDGET.json');
const BUSY_REPORT = '/tmp/dg-busy/worker-budget.json';

function run(dir, args = ['status']) {
  return spawnSync(process.execPath, [BUDGET, ...args], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
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

function writeRoot(dir, note, version) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `/*__dgFootVer='${version}'*/\n/* ${note} */\nI'm hiring\n`);
}

function report(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-WORKER-BUDGET.json'), 'utf8'));
}

describe('worker budget report', { concurrency: 1 }, () => {
  test('a worker budget report stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-budget-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-budget-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutBefore = snapshot(CHECKOUT_REPORT);
    const busyBefore = snapshot(BUSY_REPORT);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const publish = run(east, ['status', '--publish']);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(publishOut.sent, false);
    assert.equal(publishOut.liveMail, false);
    assert.equal(publishOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-WORKER-BUDGET.json')), false);
    assert.deepEqual(snapshot(BUSY_REPORT), busyBefore);

    writeRoot(east, 'Harbor East budget', 91);
    const eastRun = run(east, ['status']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-WORKER-BUDGET.json'));
    assert.equal(eastOut.diskFootVer, '91');
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(report(east).diskFootVer, '91');
    assert.equal(report(east).path, path.join(east, 'DEMIGOD-WORKER-BUDGET.json'));
    assert.equal(JSON.stringify(report(east)).includes('Harbor West budget'), false);
    const eastBytes = snapshot(path.join(east, 'DEMIGOD-WORKER-BUDGET.json'));

    writeRoot(west, 'Harbor West budget', 92);
    const westRun = run(west, ['status']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, path.join(west, 'DEMIGOD-WORKER-BUDGET.json'));
    assert.equal(westOut.diskFootVer, '92');
    assert.equal(JSON.stringify(report(west)).includes('Harbor East budget'), false);
    assert.equal(report(east).diskFootVer, '91');
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-WORKER-BUDGET.json')), eastBytes);
    assert.deepEqual(snapshot(CHECKOUT_REPORT), checkoutBefore);
    assert.deepEqual(snapshot(BUSY_REPORT), busyBefore);
  });
});
