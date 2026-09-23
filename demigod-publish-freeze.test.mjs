import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-publish-freeze.mjs');
const LIB = pathToFileURL(path.join(OPS, 'demigod-agent-tools-lib.mjs')).href;
const BUSY_FILE = '/tmp/dg-busy/publish-freeze.json';
const CHECKOUT_FILE = path.join(OPS, 'DEMIGOD-PUBLISH-FREEZE.json');

function envFor(dir) {
  const env = {
    ...process.env,
    DEMIGOD_ROOT: dir,
    DEMIGOD_LIVE: 'http://127.0.0.1:9',
    CDP_URL: 'http://127.0.0.1:9',
    DEMIGOD_DASH: 'http://127.0.0.1:9',
  };
  delete env.DEMIGOD_PUBLISH_FREEZE;
  delete env.DEMIGOD_FORCE_PUBLISH;
  return env;
}

function run(dir, args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: OPS,
    env: envFor(dir),
    encoding: 'utf8',
    timeout: 20000,
  });
}

function frozen(dir) {
  return spawnSync(
    process.execPath,
    ['--input-type=module', '-e', `import { isFrozen } from ${JSON.stringify(LIB)}; console.log(JSON.stringify(isFrozen()));`],
    { cwd: OPS, env: envFor(dir), encoding: 'utf8', timeout: 20000 },
  );
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

function freezePath(dir) {
  return path.join(dir, 'DEMIGOD-PUBLISH-FREEZE.json');
}

describe('publish freeze', { concurrency: 1 }, () => {
  test('a publish freeze stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-freeze-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-freeze-west-'));
    const busyBefore = snapshot(BUSY_FILE);
    const checkoutBefore = snapshot(CHECKOUT_FILE);
    t.after(() => {
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const refused = run(east, ['--publish']);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.sent, false);
    assert.equal(refusedOut.liveMail, false);
    assert.equal(refusedOut.livePublish, false);
    assert.equal(fs.existsSync(freezePath(east)), false);
    assert.equal(fs.existsSync(freezePath(west)), false);
    assert.equal((refused.stdout + refused.stderr).includes('www.trydemigod.com'), false);

    const eastOn = run(east, ['on', '--why', 'Harbor East keep']);
    assert.equal(eastOn.status, 0, `east on failed\n${eastOn.stdout}\n${eastOn.stderr}`);
    const eastOut = readJson(eastOn, 'east-on');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.on, true);
    assert.equal(eastOut.why, 'Harbor East keep');
    assert.equal(eastOut.path, freezePath(east));
    assert.equal(eastOut.path.includes('/tmp/dg-busy'), false);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal((eastOn.stdout + eastOn.stderr).includes('www.trydemigod.com'), false);
    const stored = JSON.parse(fs.readFileSync(freezePath(east), 'utf8'));
    assert.equal(stored.on, true);
    assert.equal(stored.why, 'Harbor East keep');
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(freezePath(east));

    const eastStatus = run(east, ['status']);
    const eastStatusOut = readJson(eastStatus, 'east-status');
    assert.equal(eastStatus.status, 2);
    assert.equal(eastStatusOut.frozen, true);
    assert.equal(eastStatusOut.why, 'Harbor East keep');
    assert.equal(eastStatusOut.path, freezePath(east));

    const eastFrozen = frozen(east);
    const eastFrozenOut = readJson(eastFrozen, 'east-isfrozen');
    assert.equal(eastFrozen.status, 0, eastFrozen.stderr);
    assert.equal(eastFrozenOut.on, true);
    assert.equal(eastFrozenOut.why, 'Harbor East keep');
    assert.equal(eastFrozenOut.path, freezePath(east));

    const westStatus = run(west, ['status']);
    const westStatusOut = readJson(westStatus, 'west-status');
    assert.equal(westStatus.status, 0);
    assert.equal(westStatusOut.frozen, false);
    assert.equal(westStatusOut.path, freezePath(west));
    assert.equal(JSON.stringify(westStatusOut).includes('Harbor East keep'), false);

    const westOn = run(west, ['on', '--why', 'Harbor West keep']);
    assert.equal(westOn.status, 0, `west on failed\n${westOn.stdout}\n${westOn.stderr}`);
    const westOut = readJson(westOn, 'west-on');
    assert.equal(westOut.path, freezePath(west));
    assert.equal(westOut.why, 'Harbor West keep');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(freezePath(east)), eastBytes);
    const westStored = JSON.parse(fs.readFileSync(freezePath(west), 'utf8'));
    assert.equal(westStored.why, 'Harbor West keep');
    assert.equal(JSON.stringify(westStored).includes('Harbor East keep'), false);

    assert.deepEqual(snapshot(BUSY_FILE), busyBefore);
    assert.deepEqual(snapshot(CHECKOUT_FILE), checkoutBefore);
  });
});
