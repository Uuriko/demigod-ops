import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(OPS, 'demigod-submit-fixture.mjs');
const CHECKOUT_JSON = path.join(OPS, 'DEMIGOD-SUBMIT-FIXTURE.json');
const CHECKOUT_MD = path.join(OPS, 'DEMIGOD-SUBMIT-FIXTURE.md');
const BUSY_JSON = '/tmp/dg-busy/submit-fixture.json';
const BUSY_MD = '/tmp/dg-busy/submit-fixture.md';

function run(dir, args = []) {
  return spawnSync(process.execPath, [FIXTURE, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
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

function report(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-SUBMIT-FIXTURE.json'), 'utf8'));
}

describe('submit fixture report', { concurrency: 1 }, () => {
  test('a submit fixture report stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-submit-fixture-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-submit-fixture-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutJsonBefore = snapshot(CHECKOUT_JSON);
    const checkoutMdBefore = snapshot(CHECKOUT_MD);
    const busyJsonBefore = snapshot(BUSY_JSON);
    const busyMdBefore = snapshot(BUSY_MD);
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
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-SUBMIT-FIXTURE.json')), false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-SUBMIT-FIXTURE.md')), false);

    const eastRun = run(east);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.pass, true);
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-SUBMIT-FIXTURE.json'));
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(report(east).path, path.join(east, 'DEMIGOD-SUBMIT-FIXTURE.json'));
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-SUBMIT-FIXTURE.md')), true);
    const eastBytes = snapshot(path.join(east, 'DEMIGOD-SUBMIT-FIXTURE.json'));
    const eastMd = snapshot(path.join(east, 'DEMIGOD-SUBMIT-FIXTURE.md'));

    const westRun = run(west);
    const westOut = readJson(westRun, 'west');
    assert.equal(westRun.status, 0);
    assert.equal(westOut.pass, true);
    assert.equal(westOut.path, path.join(west, 'DEMIGOD-SUBMIT-FIXTURE.json'));
    assert.equal(report(west).path, path.join(west, 'DEMIGOD-SUBMIT-FIXTURE.json'));
    assert.equal(JSON.stringify(report(west)).includes(east), false);
    assert.equal(JSON.stringify(report(east)).includes(west), false);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-SUBMIT-FIXTURE.json')), eastBytes);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-SUBMIT-FIXTURE.md')), eastMd);
    assert.deepEqual(snapshot(CHECKOUT_JSON), checkoutJsonBefore);
    assert.deepEqual(snapshot(CHECKOUT_MD), checkoutMdBefore);
    assert.deepEqual(snapshot(BUSY_JSON), busyJsonBefore);
    assert.deepEqual(snapshot(BUSY_MD), busyMdBefore);
  });
});
