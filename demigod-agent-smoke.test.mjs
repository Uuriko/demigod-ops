import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const SMOKE = path.join(OPS, 'demigod-agent-smoke.mjs');
const CHECKOUT_JSON = path.join(OPS, 'DEMIGOD-AGENT-SMOKE.json');
const CHECKOUT_MD = path.join(OPS, 'DEMIGOD-AGENT-SMOKE.md');
const BUSY_JSON = '/tmp/dg-busy/agent-smoke.json';
const BUSY_MD = '/tmp/dg-busy/agent-smoke.md';

function run(dir, args = []) {
  return spawnSync(process.execPath, [SMOKE, ...args], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      CDP_URL: 'http://127.0.0.1:9',
      DEMIGOD_LIVE: 'http://127.0.0.1:9',
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
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-AGENT-SMOKE.json'), 'utf8'));
}

describe('agent smoke report', { concurrency: 1 }, () => {
  test('an agent smoke report stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-smoke-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-smoke-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutJson = snapshot(CHECKOUT_JSON);
    const checkoutMd = snapshot(CHECKOUT_MD);
    const busyJson = snapshot(BUSY_JSON);
    const busyMd = snapshot(BUSY_MD);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const publish = run(east, ['--publish']);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(publishOut.sent, false);
    assert.equal(publishOut.liveMail, false);
    assert.equal(publishOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-AGENT-SMOKE.json')), false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-AGENT-SMOKE.md')), false);
    assert.deepEqual(snapshot(BUSY_JSON), busyJson);
    assert.deepEqual(snapshot(BUSY_MD), busyMd);

    writeRoot(east, 'Harbor East smoke', 91);
    const eastRun = run(east);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 1);
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-AGENT-SMOKE.json'));
    assert.equal(eastOut.mdPath, path.join(east, 'DEMIGOD-AGENT-SMOKE.md'));
    assert.equal(eastOut.diskFootVer, '91');
    assert.equal(eastOut.cdpUrl, 'http://127.0.0.1:9');
    assert.equal(eastOut.liveUrl, 'http://127.0.0.1:9');
    assert.equal(eastOut.corePass, false);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(JSON.stringify(eastOut).includes('www.trydemigod.com'), false);
    assert.equal(report(east).diskFootVer, '91');
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-AGENT-SMOKE.md')), true);
    assert.equal(JSON.stringify(report(east)).includes('Harbor West smoke'), false);
    const eastBytes = snapshot(path.join(east, 'DEMIGOD-AGENT-SMOKE.json'));
    const eastMd = snapshot(path.join(east, 'DEMIGOD-AGENT-SMOKE.md'));

    writeRoot(west, 'Harbor West smoke', 92);
    const westRun = run(west);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, path.join(west, 'DEMIGOD-AGENT-SMOKE.json'));
    assert.equal(westOut.diskFootVer, '92');
    assert.equal(westOut.liveUrl, 'http://127.0.0.1:9');
    assert.equal(JSON.stringify(report(west)).includes('Harbor East smoke'), false);
    assert.equal(report(east).diskFootVer, '91');
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-AGENT-SMOKE.json')), eastBytes);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-AGENT-SMOKE.md')), eastMd);
    assert.deepEqual(snapshot(CHECKOUT_JSON), checkoutJson);
    assert.deepEqual(snapshot(CHECKOUT_MD), checkoutMd);
    assert.deepEqual(snapshot(BUSY_JSON), busyJson);
    assert.deepEqual(snapshot(BUSY_MD), busyMd);
  });
});
