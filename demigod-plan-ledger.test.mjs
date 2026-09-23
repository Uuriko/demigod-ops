import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const LEDGER = path.join(OPS, 'demigod-plan-ledger.mjs');
const CHECKOUT_LEDGER = path.join(OPS, 'DEMIGOD-PLAN-LEDGER.json');
const CHECKOUT_OPEN = path.join(OPS, 'DEMIGOD-PLAN-LEDGER-OPEN.json');
const BUSY_OPEN = '/tmp/dg-busy/plan-ledger-open.json';
const SHARED_LOCK = '/tmp/demigod-plan-ledger.lock';

function run(dir, args) {
  return spawnSync(process.execPath, [LEDGER, ...args], {
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

function ledger(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PLAN-LEDGER.json'), 'utf8'));
}

function openList(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-PLAN-LEDGER-OPEN.json'), 'utf8'));
}

describe('plan ledger open list', { concurrency: 1 }, () => {
  test('a plan ledger open list stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ledger-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-ledger-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutLedger = snapshot(CHECKOUT_LEDGER);
    const checkoutOpen = snapshot(CHECKOUT_OPEN);
    const busyBefore = snapshot(BUSY_OPEN);
    const lockBefore = snapshot(SHARED_LOCK);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const publish = run(east, ['add', '--title', 'Harbor East plan keep', '--owner', 'harbor-east', '--publish']);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(publishOut.sent, false);
    assert.equal(publishOut.liveMail, false);
    assert.equal(publishOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-PLAN-LEDGER.json')), false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-PLAN-LEDGER-OPEN.json')), false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-PLAN-LEDGER.lock')), false);
    assert.deepEqual(snapshot(BUSY_OPEN), busyBefore);
    assert.deepEqual(snapshot(SHARED_LOCK), lockBefore);

    writeRoot(east, 'Harbor East ledger', 91);
    const eastRun = run(east, ['add', '--title', 'Harbor East plan keep', '--owner', 'harbor-east']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-PLAN-LEDGER.json'));
    assert.equal(eastOut.openPath, path.join(east, 'DEMIGOD-PLAN-LEDGER-OPEN.json'));
    assert.equal(eastOut.diskFootVer, '91');
    assert.equal(eastOut.plan.title, 'Harbor East plan keep');
    assert.equal(eastOut.plan.owner, 'harbor-east');
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(ledger(east).diskFootVer, '91');
    assert.equal(openList(east).diskFootVer, '91');
    assert.equal(openList(east).open.some((p) => p.title === 'Harbor East plan keep'), true);
    assert.equal(JSON.stringify(openList(east)).includes('Harbor West plan'), false);
    const eastLedgerBytes = snapshot(path.join(east, 'DEMIGOD-PLAN-LEDGER.json'));
    const eastOpenBytes = snapshot(path.join(east, 'DEMIGOD-PLAN-LEDGER-OPEN.json'));

    writeRoot(west, 'Harbor West ledger', 92);
    const westRun = run(west, ['add', '--title', 'Harbor West plan keep', '--owner', 'harbor-west']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, path.join(west, 'DEMIGOD-PLAN-LEDGER.json'));
    assert.equal(westOut.diskFootVer, '92');
    assert.equal(westOut.plan.title, 'Harbor West plan keep');
    assert.equal(openList(west).open.some((p) => p.title === 'Harbor West plan keep'), true);
    assert.equal(JSON.stringify(openList(west)).includes('Harbor East plan'), false);
    assert.equal(ledger(east).diskFootVer, '91');
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-PLAN-LEDGER.json')), eastLedgerBytes);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-PLAN-LEDGER-OPEN.json')), eastOpenBytes);

    const ignored = run(east, ['set', eastOut.plan.id, '--status', 'ignored', '--note', 'Harbor East handled']);
    const ignoredOut = readJson(ignored, 'ignored');
    assert.equal(ignored.status, 0);
    assert.equal(ignoredOut.plan.status, 'ignored');
    assert.equal(openList(east).open.some((p) => p.title === 'Harbor East plan keep'), false);
    assert.equal(openList(west).open.some((p) => p.title === 'Harbor West plan keep'), true);
    assert.equal(ledger(east).plans.some((p) => p.id === eastOut.plan.id && p.status === 'ignored'), true);

    assert.deepEqual(snapshot(CHECKOUT_LEDGER), checkoutLedger);
    assert.deepEqual(snapshot(CHECKOUT_OPEN), checkoutOpen);
    assert.deepEqual(snapshot(BUSY_OPEN), busyBefore);
    assert.deepEqual(snapshot(SHARED_LOCK), lockBefore);
    assert.equal(String(snapshot(path.join(east, 'DEMIGOD-PLAN-LEDGER.lock')) || '').includes('/tmp/demigod-plan-ledger.lock'), false);
  });
});
