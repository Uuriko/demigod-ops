import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const PREFLIGHT = path.join(OPS, 'demigod-preflight.mjs');
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-PREFLIGHT.json');
const BUSY_REPORT = '/tmp/dg-busy/preflight-latest.json';

function run(dir, args = []) {
  return spawnSync(process.execPath, [PREFLIGHT, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
}

function readJson(res, label) {
  const raw = `${res.stdout || ''}\n${res.stderr || ''}`;
  const line = raw.trim().split('\n').filter((row) => row.trim().startsWith('{')).at(-1);
  let parsed = null;
  try {
    parsed = JSON.parse(line || '');
  } catch {
    parsed = null;
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

function snapshot(file) {
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

function report(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PREFLIGHT.json'), 'utf8'));
}

describe('preflight report', { concurrency: 1 }, () => {
  test('a preflight report stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-preflight-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-preflight-west-'));
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

    const publish = run(east, ['--publish', '--quick']);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(publishOut.sent, false);
    assert.equal(publishOut.liveMail, false);
    assert.equal(publishOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-PREFLIGHT.json')), false);

    const eastRun = run(east, ['--quick']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, false);
    assert.equal(eastOut.pass, false);
    assert.equal(eastOut.quick, true);
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-PREFLIGHT.json'));
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    const eastSaved = report(east);
    assert.equal(eastSaved.pass, false);
    assert.equal(eastSaved.path, path.join(east, 'DEMIGOD-PREFLIGHT.json'));
    assert.equal(eastSaved.livePublish, false);
    assert.equal(eastSaved.steps.some((step) => step.label === 'foot-syntax'), true);
    assert.equal(eastSaved.steps.some((step) => step.label === 'claim-verify'), false);
    const eastBytes = snapshot(path.join(east, 'DEMIGOD-PREFLIGHT.json'));

    const westRun = run(west, ['--quick']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, path.join(west, 'DEMIGOD-PREFLIGHT.json'));
    assert.equal(westOut.sent, false);
    assert.equal(report(west).path, path.join(west, 'DEMIGOD-PREFLIGHT.json'));
    assert.equal(JSON.stringify(report(west)).includes(east), false);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-PREFLIGHT.json')), eastBytes);
    assert.deepEqual(snapshot(CHECKOUT_REPORT), checkoutBefore);
    assert.deepEqual(snapshot(BUSY_REPORT), busyBefore);
  });
});
