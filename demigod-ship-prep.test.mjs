import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const PREP = path.join(OPS, 'demigod-ship-prep.mjs');
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-SHIP-PREP.json');
const BUSY_REPORT = '/tmp/dg-busy/ship-prep.json';

function run(dir, args = []) {
  return spawnSync(process.execPath, [PREP, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
    timeout: 120000,
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
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `/*__dgFootVer='${version}'*/\n${note}\n`);
}

function report(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-SHIP-PREP.json'), 'utf8'));
}

describe('ship prep report', { concurrency: 1 }, () => {
  test('a ship prep report stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ship-prep-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ship-prep-west-'));
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
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-SHIP-PREP.json')), false);

    writeRoot(east, 'Harbor East prep', 91);
    const eastRun = run(east, ['--json']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-SHIP-PREP.json'));
    assert.equal(eastOut.diskFootVer, '91');
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(eastOut.pastes.footCore, path.join(east, 'demigod-foot-core.js'));
    assert.equal(report(east).diskFootVer, '91');
    assert.equal(JSON.stringify(report(east)).includes('Harbor West prep'), false);
    const eastBytes = snapshot(path.join(east, 'DEMIGOD-SHIP-PREP.json'));

    writeRoot(west, 'Harbor West prep', 92);
    const westRun = run(west, ['--json']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, path.join(west, 'DEMIGOD-SHIP-PREP.json'));
    assert.equal(westOut.diskFootVer, '92');
    assert.equal(westOut.pastes.footCore, path.join(west, 'demigod-foot-core.js'));
    assert.equal(JSON.stringify(report(west)).includes('Harbor East prep'), false);
    assert.equal(report(west).diskFootVer, '92');
    assert.equal(JSON.stringify(report(east)).includes('Harbor West prep'), false);
    assert.equal(report(east).diskFootVer, '91');
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-SHIP-PREP.json')), eastBytes);
    assert.deepEqual(snapshot(CHECKOUT_REPORT), checkoutBefore);
    assert.deepEqual(snapshot(BUSY_REPORT), busyBefore);
  });
});
