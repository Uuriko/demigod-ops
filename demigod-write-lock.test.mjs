import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-write-lock.mjs');
const HOME_LOCK = '/home/potter/.demigod-write.lock';
const CHECKOUT_LOCK = path.join(OPS, 'DEMIGOD-WRITE-LOCK.json');
const CHECKOUT_DOT = path.join(OPS, '.demigod-write.lock');

function run(dir, args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      DEMIGOD_LIVE: 'http://127.0.0.1:9',
      CDP_URL: 'http://127.0.0.1:9',
      DEMIGOD_DASH: 'http://127.0.0.1:9',
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

function lockFile(dir) {
  return path.join(dir, 'DEMIGOD-WRITE-LOCK.json');
}

describe('write lock', { concurrency: 1 }, () => {
  test('a write lock stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lock-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lock-west-'));
    const homeBefore = snapshot(HOME_LOCK);
    const checkoutBefore = snapshot(CHECKOUT_LOCK);
    const dotBefore = snapshot(CHECKOUT_DOT);
    t.after(() => {
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const refused = run(east, ['--publish', 'acquire', '--note', 'Harbor East keep']);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.sent, false);
    assert.equal(refusedOut.liveMail, false);
    assert.equal(refusedOut.livePublish, false);
    assert.equal(fs.existsSync(lockFile(east)), false);
    assert.equal(fs.existsSync(lockFile(west)), false);
    assert.equal((refused.stdout + refused.stderr).includes('www.trydemigod.com'), false);

    const eastRun = run(east, ['acquire', '--note', 'Harbor East keep']);
    assert.equal(eastRun.status, 0, `east acquire failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.held, true);
    assert.equal(eastOut.path, lockFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.note, 'Harbor East keep');
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    const stored = JSON.parse(fs.readFileSync(lockFile(east), 'utf8'));
    assert.equal(stored.note, 'Harbor East keep');
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(lockFile(east));

    const again = run(east, ['acquire', '--note', 'Harbor East keep']);
    const againOut = readJson(again, 'east-again');
    assert.equal(again.status, 1);
    assert.equal(againOut.error, 'write_lock_held');
    assert.deepEqual(snapshot(lockFile(east)), eastBytes);

    const westStatus = run(west, ['status']);
    const westStatusOut = readJson(westStatus, 'west-status');
    assert.equal(westStatus.status, 0);
    assert.equal(westStatusOut.held, false);
    assert.equal(westStatusOut.path, lockFile(west));
    assert.equal(JSON.stringify(westStatusOut).includes('Harbor East keep'), false);

    const westRun = run(west, ['acquire', '--note', 'Harbor West keep']);
    assert.equal(westRun.status, 0, `west acquire failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, lockFile(west));
    assert.equal(westOut.note, 'Harbor West keep');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(lockFile(east)), eastBytes);
    const westStored = JSON.parse(fs.readFileSync(lockFile(west), 'utf8'));
    assert.equal(westStored.note, 'Harbor West keep');

    const released = run(east, ['release']);
    const releasedOut = readJson(released, 'release');
    assert.equal(released.status, 0);
    assert.equal(releasedOut.released, true);
    assert.equal(releasedOut.path, lockFile(east));
    assert.equal(fs.existsSync(lockFile(east)), false);
    assert.equal(fs.existsSync(lockFile(west)), true);

    assert.deepEqual(snapshot(HOME_LOCK), homeBefore);
    assert.deepEqual(snapshot(CHECKOUT_LOCK), checkoutBefore);
    assert.deepEqual(snapshot(CHECKOUT_DOT), dotBefore);
  });
});
