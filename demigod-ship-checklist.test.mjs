import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CHECKLIST = path.join(OPS, 'demigod-ship-checklist.mjs');
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-SHIP-CHECKLIST.json');
const BUSY_REPORT = '/tmp/dg-busy/ship-checklist.json';

function run(dir, args = []) {
  return spawnSync(process.execPath, [CHECKLIST, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
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
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `/*__dgFootVer='91'*/\n${note}\n`);
  fs.writeFileSync(path.join(dir, 'DEMIGOD-VERIFY-SOURCE.json'), JSON.stringify({
    pass: true,
    at: note,
  }));
}

function report(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-SHIP-CHECKLIST.json'), 'utf8'));
}

describe('ship checklist', { concurrency: 1 }, () => {
  test('a ship checklist stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ship-check-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ship-check-west-'));
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
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-SHIP-CHECKLIST.json')), false);

    writeRoot(east, 'Harbor East checklist');
    const eastRun = run(east, ['--json']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-SHIP-CHECKLIST.json'));
    assert.equal(eastOut.verifyAt, 'Harbor East checklist');
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(report(east).verifyAt, 'Harbor East checklist');
    assert.equal(report(east).livePublish, false);
    assert.equal(JSON.stringify(report(east)).includes('Harbor West checklist'), false);
    const eastBytes = snapshot(path.join(east, 'DEMIGOD-SHIP-CHECKLIST.json'));

    writeRoot(west, 'Harbor West checklist');
    const westRun = run(west, ['--json']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, path.join(west, 'DEMIGOD-SHIP-CHECKLIST.json'));
    assert.equal(westOut.verifyAt, 'Harbor West checklist');
    assert.equal(JSON.stringify(report(west)).includes('Harbor East checklist'), false);
    assert.equal(JSON.stringify(report(east)).includes('Harbor West checklist'), false);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-SHIP-CHECKLIST.json')), eastBytes);
    assert.deepEqual(snapshot(CHECKOUT_REPORT), checkoutBefore);
    assert.deepEqual(snapshot(BUSY_REPORT), busyBefore);
  });
});
