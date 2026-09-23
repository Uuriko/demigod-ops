import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-agent-cockpit.mjs');
const CHECKOUT_JSON = path.join(OPS, 'DEMIGOD-COCKPIT.json');
const CHECKOUT_MD = path.join(OPS, 'DEMIGOD-COCKPIT.md');
const BUSY_JSON = '/tmp/dg-busy/cockpit.json';
const BUSY_MD = '/tmp/dg-busy/cockpit.md';

function run(dir, args) {
  return spawnSync(process.execPath, [CLI, ...args], {
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

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-COCKPIT.json');
}

function writeRoot(dir, note, version) {
  fs.writeFileSync(
    path.join(dir, 'demigod-foot-core.js'),
    `/*__dgFootVer='${version}'*/\n/* ${note} */\nconst harbor = 1;\n`,
  );
}

describe('agent cockpit', { concurrency: 1 }, () => {
  test('an agent cockpit report stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-cockpit-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-cockpit-west-'));
    const checkoutJson = snapshot(CHECKOUT_JSON);
    const checkoutMd = snapshot(CHECKOUT_MD);
    const busyJson = snapshot(BUSY_JSON);
    const busyMd = snapshot(BUSY_MD);
    t.after(() => {
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    writeRoot(east, 'Harbor East foot', 91);
    writeRoot(west, 'Harbor West foot', 92);

    const refused = run(east, ['--publish']);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.sent, false);
    assert.equal(refusedOut.liveMail, false);
    assert.equal(refusedOut.livePublish, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(west)), false);
    assert.equal((refused.stdout + refused.stderr).includes('www.trydemigod.com'), false);
    assert.deepEqual(snapshot(BUSY_JSON), busyJson);
    assert.deepEqual(snapshot(BUSY_MD), busyMd);

    const eastRun = run(east, ['--json', '--offline']);
    assert.equal(eastRun.status, 2, `east cockpit failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/tmp/dg-busy'), false);
    assert.equal(eastOut.foot.diskVer, '91');
    assert.equal(eastOut.live.ok, false);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(eastOut.cdp.up, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.path, reportFile(east));
    assert.equal(stored.foot.diskVer, '91');
    assert.equal(JSON.stringify(stored).includes('Harbor West foot'), false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-COCKPIT.md')), true);
    const eastBytes = snapshot(reportFile(east));

    const westRun = run(west, ['--json', '--offline']);
    assert.equal(westRun.status, 2, `west cockpit failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.foot.diskVer, '92');
    assert.equal(westOut.live.ok, false);
    assert.equal(JSON.stringify(westOut).includes(east), false);
    assert.equal(JSON.parse(fs.readFileSync(reportFile(west), 'utf8')).foot.diskVer, '92');
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);

    assert.deepEqual(snapshot(BUSY_JSON), busyJson);
    assert.deepEqual(snapshot(BUSY_MD), busyMd);
    assert.deepEqual(snapshot(CHECKOUT_JSON), checkoutJson);
    assert.deepEqual(snapshot(CHECKOUT_MD), checkoutMd);
  });
});
