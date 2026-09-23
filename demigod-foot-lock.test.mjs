import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const LOCK = path.join(OPS, 'demigod-foot-lock.mjs');
const PUBLISH = path.join(OPS, 'demigod-publish-foot.mjs');
const CHECKOUT_JSON = path.join(OPS, 'DEMIGOD-FOOT-LOCK.json');
const CHECKOUT_TXT = path.join(OPS, 'DEMIGOD-FOOT-LOCK.txt');
const BUSY_JSON = '/tmp/dg-busy/foot-lock.json';
const BUSY_TXT = '/tmp/dg-busy/foot-lock.txt';
const BUSY_ENV = '/tmp/dg-busy/foot-lock-token.env';
const SHARED_CORE = '/tmp/demigod-foot-core.lock';
const SHARED_META = '/tmp/demigod-foot-lock-meta.lock';

function run(dir, args) {
  return spawnSync(process.execPath, [LOCK, ...args], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      DG_LOCK_NO_FLOCK: '1',
    },
    encoding: 'utf8',
    timeout: 20000,
  });
}

function runPublish(dir, args, owner) {
  const env = {
    ...process.env,
    DEMIGOD_ROOT: dir,
    DG_LOCK_OWNER: owner,
    DG_LOCK_NO_FLOCK: '1',
    DEMIGOD_LIVE: 'http://127.0.0.1:9',
    CDP_URL: 'http://127.0.0.1:9',
    DEMIGOD_PUBLISH_FREEZE: '0',
  };
  delete env.DG_LOCK_TOKEN;
  return spawnSync(process.execPath, [PUBLISH, ...args], {
    cwd: OPS,
    env,
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

function lockFile(dir) {
  return path.join(dir, 'DEMIGOD-FOOT-LOCK.json');
}

describe('foot lock', { concurrency: 1 }, () => {
  test('a foot lock stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lock-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lock-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutJson = snapshot(CHECKOUT_JSON);
    const checkoutTxt = snapshot(CHECKOUT_TXT);
    const busyJson = snapshot(BUSY_JSON);
    const busyTxt = snapshot(BUSY_TXT);
    const busyEnv = snapshot(BUSY_ENV);
    const coreBefore = snapshot(SHARED_CORE);
    const metaBefore = snapshot(SHARED_META);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const publish = run(east, ['claim', '--owner', 'harbor-east', '--ttl', '120', '--publish']);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(publishOut.sent, false);
    assert.equal(publishOut.liveMail, false);
    assert.equal(publishOut.livePublish, false);
    assert.equal(fs.existsSync(lockFile(east)), false);
    assert.deepEqual(snapshot(BUSY_JSON), busyJson);
    assert.deepEqual(snapshot(SHARED_CORE), coreBefore);
    assert.deepEqual(snapshot(SHARED_META), metaBefore);

    writeRoot(east, 'Harbor East foot', 91);
    const eastRun = run(east, ['claim', '--owner', 'harbor-east', '--ttl', '120', '--why', 'Harbor East foot keep']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, lockFile(east));
    assert.equal(eastOut.path.includes('/tmp/dg-busy'), false);
    assert.equal(eastOut.diskFootVer, '91');
    assert.equal(eastOut.claimed.owner, 'harbor-east');
    assert.equal(eastOut.claimed.footVer, '91');
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    const stored = JSON.parse(fs.readFileSync(lockFile(east), 'utf8'));
    assert.equal(stored.owner, 'harbor-east');
    assert.equal(stored.footVer, '91');
    assert.equal(JSON.stringify(stored).includes('Harbor West foot'), false);
    const eastBytes = snapshot(lockFile(east));

    const blocked = run(east, ['claim', '--owner', 'harbor-west', '--ttl', '120']);
    const blockedOut = readJson(blocked, 'blocked');
    assert.equal(blocked.status, 1);
    assert.equal(blockedOut.error, 'locked');
    assert.deepEqual(snapshot(lockFile(east)), eastBytes);

    writeRoot(west, 'Harbor West foot', 92);
    const westRun = run(west, ['claim', '--owner', 'harbor-west', '--ttl', '120', '--why', 'Harbor West foot keep']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westRun.status, 0);
    assert.equal(westOut.path, lockFile(west));
    assert.equal(westOut.diskFootVer, '92');
    assert.equal(westOut.claimed.owner, 'harbor-west');
    assert.equal(JSON.parse(fs.readFileSync(lockFile(west), 'utf8')).footVer, '92');
    assert.equal(JSON.stringify(JSON.parse(fs.readFileSync(lockFile(west), 'utf8'))).includes('Harbor East foot'), false);
    assert.deepEqual(snapshot(lockFile(east)), eastBytes);

    const eastStatus = run(east, ['status']);
    const eastStatusOut = readJson(eastStatus, 'east-status');
    assert.equal(eastStatusOut.locked, true);
    assert.equal(eastStatusOut.lock.owner, 'harbor-east');
    assert.equal(eastStatusOut.lockJson, lockFile(east));
    assert.equal(eastStatusOut.flockPath.includes('/tmp/'), false);
    assert.equal(eastStatusOut.metaFlockPath.includes('/tmp/'), false);

    const released = run(east, ['release', '--owner', 'harbor-east', '--token', eastOut.claimed.token]);
    const releasedOut = readJson(released, 'release');
    assert.equal(released.status, 0);
    assert.equal(releasedOut.released, true);
    assert.equal(fs.existsSync(lockFile(east)), false);
    assert.equal(JSON.parse(fs.readFileSync(lockFile(west), 'utf8')).owner, 'harbor-west');

    const westFree = run(west, ['release', '--owner', 'harbor-west', '--token', westOut.claimed.token]);
    assert.equal(westFree.status, 0);
    assert.equal(fs.existsSync(lockFile(west)), false);

    assert.deepEqual(snapshot(CHECKOUT_JSON), checkoutJson);
    assert.deepEqual(snapshot(CHECKOUT_TXT), checkoutTxt);
    assert.deepEqual(snapshot(BUSY_JSON), busyJson);
    assert.deepEqual(snapshot(BUSY_TXT), busyTxt);
    assert.deepEqual(snapshot(BUSY_ENV), busyEnv);
    assert.deepEqual(snapshot(SHARED_CORE), coreBefore);
    assert.deepEqual(snapshot(SHARED_META), metaBefore);
  });

  test('a foot lock refresh stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lock-refresh-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-lock-refresh-west-'));
    const checkoutJson = snapshot(CHECKOUT_JSON);
    const checkoutTxt = snapshot(CHECKOUT_TXT);
    const busyJson = snapshot(BUSY_JSON);
    const busyTxt = snapshot(BUSY_TXT);
    const busyEnv = snapshot(BUSY_ENV);
    const coreBefore = snapshot(SHARED_CORE);
    const metaBefore = snapshot(SHARED_META);
    t.after(() => {
      run(east, ['release', '--force']);
      run(west, ['release', '--force']);
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    writeRoot(east, 'Harbor East foot', 91);
    writeRoot(west, 'Harbor West foot', 92);

    const refused = runPublish(east, ['--publish'], 'harbor-east');
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.sent, false);
    assert.equal(refusedOut.liveMail, false);
    assert.equal(refusedOut.livePublish, false);
    assert.equal(fs.existsSync(lockFile(east)), false);
    assert.equal(fs.existsSync(lockFile(west)), false);
    assert.equal((refused.stdout + refused.stderr).includes('www.trydemigod.com'), false);
    assert.deepEqual(snapshot(BUSY_JSON), busyJson);
    assert.deepEqual(snapshot(BUSY_TXT), busyTxt);

    const eastRun = runPublish(east, ['--lock-refresh'], 'harbor-east');
    assert.equal(eastRun.status, 0, `east refresh failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east-refresh');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.lockRefresh, true);
    assert.equal(eastOut.path, lockFile(east));
    assert.equal(eastOut.txt, path.join(east, 'DEMIGOD-FOOT-LOCK.txt'));
    assert.equal(eastOut.path.includes('/tmp/dg-busy'), false);
    assert.equal(eastOut.owner, 'harbor-east');
    assert.equal(eastOut.why, 'dg-publish-foot');
    assert.equal(eastOut.footVer, '91');
    assert.equal(eastOut.pid, eastRun.pid);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('catbox.moe'), false);
    const stored = JSON.parse(fs.readFileSync(lockFile(east), 'utf8'));
    assert.equal(stored.owner, 'harbor-east');
    assert.equal(stored.why, 'dg-publish-foot');
    assert.equal(stored.footVer, '91');
    assert.equal(stored.pid, eastRun.pid);
    const eastTxt = fs.readFileSync(path.join(east, 'DEMIGOD-FOOT-LOCK.txt'), 'utf8');
    assert.equal(eastTxt.includes('owner=harbor-east'), true);
    assert.equal(eastTxt.includes('why=dg-publish-foot'), true);
    assert.equal(eastTxt.includes('footVer=91'), true);
    assert.equal(eastTxt.includes('footVer=92'), false);
    assert.equal(fs.existsSync(lockFile(west)), false);
    const eastBytes = snapshot(lockFile(east));
    const eastTxtBytes = snapshot(path.join(east, 'DEMIGOD-FOOT-LOCK.txt'));

    const blocked = runPublish(east, ['--lock-refresh'], 'harbor-west');
    assert.equal(blocked.status, 1, `foreign refresh should refuse\n${blocked.stdout}\n${blocked.stderr}`);
    assert.equal((blocked.stdout + blocked.stderr).includes('www.trydemigod.com'), false);
    assert.deepEqual(snapshot(lockFile(east)), eastBytes);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-FOOT-LOCK.txt')), eastTxtBytes);
    assert.equal(fs.existsSync(lockFile(west)), false);

    fs.writeFileSync(lockFile(east), '{not-json');
    const legacy = run(east, ['status']);
    const legacyOut = readJson(legacy, 'legacy-status');
    assert.equal(legacy.status, 0);
    assert.equal(legacyOut.locked, true);
    assert.equal(legacyOut.lock.owner, 'harbor-east');
    assert.equal(legacyOut.lockJson, lockFile(east));
    assert.equal(fs.readFileSync(lockFile(east), 'utf8'), '{not-json');
    assert.deepEqual(snapshot(BUSY_JSON), busyJson);
    assert.deepEqual(snapshot(BUSY_TXT), busyTxt);

    const westRun = runPublish(west, ['--lock-refresh'], 'harbor-west');
    assert.equal(westRun.status, 0, `west refresh failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west-refresh');
    assert.equal(westOut.path, lockFile(west));
    assert.equal(westOut.owner, 'harbor-west');
    assert.equal(westOut.why, 'dg-publish-foot');
    assert.equal(westOut.footVer, '92');
    assert.equal(westOut.pid, westRun.pid);
    assert.equal(JSON.parse(fs.readFileSync(lockFile(west), 'utf8')).footVer, '92');
    assert.equal(fs.readFileSync(lockFile(east), 'utf8'), '{not-json');
    assert.equal(fs.readFileSync(path.join(east, 'DEMIGOD-FOOT-LOCK.txt'), 'utf8').includes('owner=harbor-east'), true);
    const westTxt = fs.readFileSync(path.join(west, 'DEMIGOD-FOOT-LOCK.txt'), 'utf8');
    assert.equal(westTxt.includes('owner=harbor-west'), true);
    assert.equal(westTxt.includes('harbor-east'), false);
    assert.equal(westTxt.includes('footVer=92'), true);

    assert.deepEqual(snapshot(BUSY_JSON), busyJson);
    assert.deepEqual(snapshot(BUSY_TXT), busyTxt);
    assert.deepEqual(snapshot(BUSY_ENV), busyEnv);
    assert.deepEqual(snapshot(SHARED_CORE), coreBefore);
    assert.deepEqual(snapshot(SHARED_META), metaBefore);
    assert.deepEqual(snapshot(CHECKOUT_JSON), checkoutJson);
    assert.deepEqual(snapshot(CHECKOUT_TXT), checkoutTxt);
  });
});
