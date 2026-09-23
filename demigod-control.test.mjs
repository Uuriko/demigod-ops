import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-control.mjs');
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-CONTROL-PLANE.json');
const BUSY_REPORT = '/tmp/dg-busy/control-plane.json';
const BUSY_WF = '/tmp/dg-busy/webflow-status.json';

function run(dir, args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      DEMIGOD_LIVE: 'http://127.0.0.1:9',
      DEMIGOD_DASH: 'http://127.0.0.1:9',
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
  return path.join(dir, 'DEMIGOD-CONTROL-PLANE.json');
}

function writeRoot(dir, note) {
  fs.writeFileSync(
    path.join(dir, 'DEMIGOD-WEBFLOW-STATUS.json'),
    JSON.stringify({
      at: '2026-09-23T00:00:00.000Z',
      cdp: { ok: true },
      ready: { paste: note },
      tabs: { pages: 1 },
    }) + '\n',
  );
}

describe('control plane', { concurrency: 1 }, () => {
  test('a control plane report stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-control-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-control-west-'));
    const checkoutReport = snapshot(CHECKOUT_REPORT);
    const busyReport = snapshot(BUSY_REPORT);
    const busyWf = snapshot(BUSY_WF);
    t.after(() => {
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    writeRoot(east, 'Harbor East keep');
    writeRoot(west, 'Harbor West keep');

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
    assert.deepEqual(snapshot(BUSY_REPORT), busyReport);
    assert.deepEqual(snapshot(BUSY_WF), busyWf);

    const eastRun = run(east, ['status', '--json', '--offline']);
    assert.equal(eastRun.status, 0, `east control failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/tmp/dg-busy'), false);
    assert.equal(eastOut.modules.webflow.ready.paste, 'Harbor East keep');
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.path, reportFile(east));
    assert.equal(stored.modules.webflow.ready.paste, 'Harbor East keep');
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(reportFile(east));

    const westRun = run(west, ['status', '--json', '--offline']);
    assert.equal(westRun.status, 0, `west control failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.modules.webflow.ready.paste, 'Harbor West keep');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    assert.equal(JSON.stringify(westOut).includes(east), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);

    assert.deepEqual(snapshot(BUSY_REPORT), busyReport);
    assert.deepEqual(snapshot(BUSY_WF), busyWf);
    assert.deepEqual(snapshot(CHECKOUT_REPORT), checkoutReport);
  });
});
