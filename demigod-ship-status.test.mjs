import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const STATUS = path.join(OPS, 'demigod-ship-status.mjs');
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-SHIP-STATUS.json');
const BUSY_REPORT = '/tmp/dg-busy/ship-status.json';

function run(dir, args = []) {
  return spawnSync(process.execPath, [STATUS, ...args], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      DEMIGOD_LIVE: 'http://127.0.0.1:9',
    },
    encoding: 'utf8',
    timeout: 30000,
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

function writeRoot(dir, note, version, owner) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `/*__dgFootVer='${version}'*/\n/* ${note} */\n`);
  if (owner) {
    fs.writeFileSync(path.join(dir, 'DEMIGOD-FOOT-LOCK.json'), JSON.stringify({
      owner,
      expiresAt: '2099-01-01T00:00:00.000Z',
    }));
  }
}

function report(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-SHIP-STATUS.json'), 'utf8'));
}

describe('ship status report', { concurrency: 1 }, () => {
  test('a ship status report stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ship-status-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ship-status-west-'));
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

    const publish = run(east, ['--publish', '--json']);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(publishOut.sent, false);
    assert.equal(publishOut.liveMail, false);
    assert.equal(publishOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-SHIP-STATUS.json')), false);

    writeRoot(east, 'Harbor East status', 91, 'east-owner');
    const eastRun = run(east, ['--json']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-SHIP-STATUS.json'));
    assert.equal(eastOut.disk.ver, '91');
    assert.equal(eastOut.lock.owner, 'east-owner');
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(report(east).disk.ver, '91');
    assert.equal(JSON.stringify(report(east)).includes('Harbor West status'), false);
    const eastBytes = snapshot(path.join(east, 'DEMIGOD-SHIP-STATUS.json'));

    writeRoot(west, 'Harbor West status', 92, null);
    const westRun = run(west, ['--json']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westRun.status, 0);
    assert.equal(westOut.path, path.join(west, 'DEMIGOD-SHIP-STATUS.json'));
    assert.equal(westOut.disk.ver, '92');
    assert.equal(westOut.lock, null);
    assert.equal(JSON.stringify(report(west)).includes('Harbor East status'), false);
    assert.equal(JSON.stringify(report(west)).includes('east-owner'), false);
    assert.equal(report(east).disk.ver, '91');
    assert.equal(report(east).lock.owner, 'east-owner');
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-SHIP-STATUS.json')), eastBytes);
    assert.deepEqual(snapshot(CHECKOUT_REPORT), checkoutBefore);
    assert.deepEqual(snapshot(BUSY_REPORT), busyBefore);
  });
});
