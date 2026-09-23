import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-system-audit.mjs');
const HOME_REPORT = '/home/potter/DEMIGOD-SYSTEM-AUDIT.json';
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-SYSTEM-AUDIT.json');

function run(dir, args = []) {
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

function plant(dir, phrase) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v9-core\n`);
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-SYSTEM-AUDIT.json');
}

describe('system audit', { concurrency: 1 }, () => {
  test('a system audit stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-audit-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-audit-west-'));
    const homeBefore = snapshot(HOME_REPORT);
    const checkoutBefore = snapshot(CHECKOUT_REPORT);
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
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(west)), false);
    assert.equal((refused.stdout + refused.stderr).includes('www.trydemigod.com'), false);

    plant(east, 'Harbor East keep');
    const eastRun = run(east);
    assert.equal(eastRun.status, 0, `east audit failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/dg-busy'), false);
    assert.equal(eastOut.workspace, east);
    assert.equal(eastOut.demigod.footMarker, 'Harbor East keep');
    assert.equal(eastOut.demigod.footVersion, 9);
    assert.equal(eastOut.cdp.url, 'http://127.0.0.1:9');
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.demigod.footMarker, 'Harbor East keep');
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(reportFile(east));

    plant(west, 'Harbor West keep');
    const westRun = run(west);
    assert.equal(westRun.status, 0, `west audit failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.workspace, west);
    assert.equal(westOut.demigod.footMarker, 'Harbor West keep');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);
    const westStored = JSON.parse(fs.readFileSync(reportFile(west), 'utf8'));
    assert.equal(westStored.demigod.footMarker, 'Harbor West keep');

    assert.deepEqual(snapshot(HOME_REPORT), homeBefore);
    assert.deepEqual(snapshot(CHECKOUT_REPORT), checkoutBefore);
  });
});
