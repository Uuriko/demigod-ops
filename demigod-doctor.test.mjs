import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const DOCTOR = path.join(OPS, 'demigod-doctor.mjs');
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-DOCTOR.json');
const BUSY_REPORT = '/tmp/dg-busy/doctor.json';

function run(dir, args = []) {
  return spawnSync(process.execPath, [DOCTOR, ...args], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      CDP_URL: 'http://127.0.0.1:9',
      DEMIGOD_DASH: 'http://127.0.0.1:9',
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

function writeRoot(dir, note) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `/* ${note} */\n`);
  fs.writeFileSync(path.join(dir, 'DEMIGOD-PUBLISH-FREEZE.json'), JSON.stringify({
    on: true,
    why: note,
  }));
}

function report(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-DOCTOR.json'), 'utf8'));
}

describe('doctor report', { concurrency: 1 }, () => {
  test('a doctor report stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-doctor-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-doctor-west-'));
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
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-DOCTOR.json')), false);

    writeRoot(east, 'HarborEastFreeze');
    const eastRun = run(east, ['--json']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-DOCTOR.json'));
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(eastOut.checks.find((c) => c.name === 'cwd').detail, east);
    assert.equal(eastOut.checks.find((c) => c.name === 'data root').detail, east);
    assert.equal(eastOut.checks.find((c) => c.name === 'freeze readable').detail, 'ON HarborEastFreeze');
    assert.equal(JSON.stringify(eastOut).includes('HarborWestFreeze'), false);
    const eastBytes = snapshot(path.join(east, 'DEMIGOD-DOCTOR.json'));

    writeRoot(west, 'HarborWestFreeze');
    const westRun = run(west, ['--json']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, path.join(west, 'DEMIGOD-DOCTOR.json'));
    assert.equal(westOut.checks.find((c) => c.name === 'cwd').detail, west);
    assert.equal(westOut.checks.find((c) => c.name === 'freeze readable').detail, 'ON HarborWestFreeze');
    assert.equal(JSON.stringify(westOut).includes('HarborEastFreeze'), false);
    assert.equal(JSON.stringify(report(east)).includes('HarborWestFreeze'), false);
    assert.equal(report(east).checks.find((c) => c.name === 'freeze readable').detail, 'ON HarborEastFreeze');
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-DOCTOR.json')), eastBytes);
    assert.deepEqual(snapshot(CHECKOUT_REPORT), checkoutBefore);
    assert.deepEqual(snapshot(BUSY_REPORT), busyBefore);
  });
});
