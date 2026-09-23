import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const FREEZE = path.join(OPS, 'demigod-freeze.mjs');
const CHECKOUT_SNAP = path.join(OPS, 'DEMIGOD-FREEZE', 'harbor.json');
const BUSY_SNAP = '/tmp/dg-busy/freeze/harbor.json';

function run(dir, args) {
  return spawnSync(process.execPath, [FREEZE, ...args], {
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

function snapFile(dir) {
  return path.join(dir, 'DEMIGOD-FREEZE', 'harbor.json');
}

describe('file freeze snapshot', { concurrency: 1 }, () => {
  test('a file freeze snapshot stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-freeze-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-freeze-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutBefore = snapshot(CHECKOUT_SNAP);
    const busyBefore = snapshot(BUSY_SNAP);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const publish = run(east, ['snapshot', '--tag', 'harbor', '--publish']);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(publishOut.sent, false);
    assert.equal(publishOut.liveMail, false);
    assert.equal(publishOut.livePublish, false);
    assert.equal(fs.existsSync(snapFile(east)), false);
    assert.deepEqual(snapshot(BUSY_SNAP), busyBefore);

    writeRoot(east, 'Harbor East freeze', 91);
    const eastRun = run(east, ['snapshot', '--tag', 'harbor']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, snapFile(east));
    assert.equal(eastOut.path.includes('/tmp/dg-busy'), false);
    assert.equal(eastOut.diskFootVer, '91');
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    const stored = JSON.parse(fs.readFileSync(snapFile(east), 'utf8'));
    assert.equal(stored.diskFootVer, '91');
    assert.equal(stored.files['demigod-foot-core.js'].missing, false);
    assert.equal(JSON.stringify(stored).includes('Harbor West freeze'), false);
    const eastBytes = snapshot(snapFile(east));

    const clean = run(east, ['check', '--tag', 'harbor']);
    const cleanOut = readJson(clean, 'clean');
    assert.equal(clean.status, 0);
    assert.equal(cleanOut.changed, 0);
    assert.equal(cleanOut.path, snapFile(east));
    assert.equal(cleanOut.diskFootVer, '91');
    assert.deepEqual(snapshot(snapFile(east)), eastBytes);

    writeRoot(east, 'Harbor East freeze changed', 91);
    const changed = run(east, ['check', '--tag', 'harbor']);
    const changedOut = readJson(changed, 'changed');
    assert.equal(changed.status, 1);
    assert.equal(changedOut.changed >= 1, true);
    assert.equal(changedOut.changes.some((row) => row.file === 'demigod-foot-core.js'), true);
    assert.deepEqual(snapshot(snapFile(east)), eastBytes);

    writeRoot(west, 'Harbor West freeze', 92);
    const westRun = run(west, ['snapshot', '--tag', 'harbor']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, snapFile(west));
    assert.equal(westOut.diskFootVer, '92');
    assert.equal(JSON.stringify(JSON.parse(fs.readFileSync(snapFile(west), 'utf8'))).includes('Harbor East freeze'), false);
    assert.equal(JSON.parse(fs.readFileSync(snapFile(east), 'utf8')).diskFootVer, '91');
    assert.deepEqual(snapshot(snapFile(east)), eastBytes);
    assert.deepEqual(snapshot(CHECKOUT_SNAP), checkoutBefore);
    assert.deepEqual(snapshot(BUSY_SNAP), busyBefore);
  });
});
