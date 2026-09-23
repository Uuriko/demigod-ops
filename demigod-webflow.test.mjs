import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const WF = path.join(OPS, 'demigod-webflow.mjs');
const CHECKOUT_STATUS = path.join(OPS, 'DEMIGOD-WEBFLOW-STATUS.json');
const BUSY_STATUS = '/tmp/dg-busy/webflow-status.json';
const BUSY_DOCTOR = '/tmp/dg-busy/webflow-doctor.json';
const BUSY_PLAYBOOK = '/tmp/dg-busy/webflow-playbook-latest.md';

function run(dir, args = []) {
  return spawnSync(process.execPath, [WF, ...args], {
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

function writeRoot(dir, note, version) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `/*__dgFootVer='${version}'*/\n/* ${note} */\n`);
  fs.writeFileSync(path.join(dir, 'DEMIGOD-PUBLISH-FREEZE.json'), JSON.stringify({
    on: true,
    why: note,
  }));
}

function report(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-WEBFLOW-STATUS.json'), 'utf8'));
}

describe('webflow report', { concurrency: 1 }, () => {
  test('a webflow report stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-webflow-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-webflow-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutBefore = snapshot(CHECKOUT_STATUS);
    const busyStatusBefore = snapshot(BUSY_STATUS);
    const busyDoctorBefore = snapshot(BUSY_DOCTOR);
    const busyPlaybookBefore = snapshot(BUSY_PLAYBOOK);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const publish = run(east, ['status', '--publish', '--json']);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(publishOut.sent, false);
    assert.equal(publishOut.liveMail, false);
    assert.equal(publishOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-WEBFLOW-STATUS.json')), false);

    writeRoot(east, 'HarborEastWebflow', 91);
    const eastRun = run(east, ['status', '--json']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-WEBFLOW-STATUS.json'));
    assert.equal(eastOut.disk.footVer, 'v91');
    assert.equal(eastOut.freeze.why, 'HarborEastWebflow');
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(JSON.stringify(eastOut).includes('HarborWestWebflow'), false);

    const play = run(east, ['playbook', 'status-only', '--json']);
    const playOut = readJson(play, 'playbook');
    assert.equal(play.status, 0);
    assert.equal(playOut.path, path.join(east, 'DEMIGOD-WEBFLOW-PLAYBOOK.md'));
    assert.equal(playOut.sent, false);
    assert.equal(fs.readFileSync(playOut.path, 'utf8').includes('HarborWestWebflow'), false);

    const doc = run(east, ['doctor', '--json']);
    const docOut = readJson(doc, 'doctor');
    assert.equal(docOut.path, path.join(east, 'DEMIGOD-WEBFLOW-DOCTOR.json'));
    assert.equal(docOut.freeze.why, 'HarborEastWebflow');
    assert.equal(docOut.sent, false);
    const eastStatusBytes = snapshot(path.join(east, 'DEMIGOD-WEBFLOW-STATUS.json'));
    const eastDoctorBytes = snapshot(path.join(east, 'DEMIGOD-WEBFLOW-DOCTOR.json'));
    const eastPlaybookBytes = snapshot(path.join(east, 'DEMIGOD-WEBFLOW-PLAYBOOK.md'));

    writeRoot(west, 'HarborWestWebflow', 92);
    const westRun = run(west, ['status', '--json']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westRun.status, 0);
    assert.equal(westOut.path, path.join(west, 'DEMIGOD-WEBFLOW-STATUS.json'));
    assert.equal(westOut.disk.footVer, 'v92');
    assert.equal(westOut.freeze.why, 'HarborWestWebflow');
    assert.equal(JSON.stringify(westOut).includes('HarborEastWebflow'), false);
    assert.equal(report(east).disk.footVer, 'v91');
    assert.equal(report(east).freeze.why, 'HarborEastWebflow');
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-WEBFLOW-STATUS.json')), eastStatusBytes);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-WEBFLOW-DOCTOR.json')), eastDoctorBytes);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-WEBFLOW-PLAYBOOK.md')), eastPlaybookBytes);
    assert.deepEqual(snapshot(CHECKOUT_STATUS), checkoutBefore);
    assert.deepEqual(snapshot(BUSY_STATUS), busyStatusBefore);
    assert.deepEqual(snapshot(BUSY_DOCTOR), busyDoctorBefore);
    assert.deepEqual(snapshot(BUSY_PLAYBOOK), busyPlaybookBefore);
  });
});
