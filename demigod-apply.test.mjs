import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-apply.mjs');
const CHECKOUT_OUTBOX = path.join(OPS, 'DEMIGOD-APPLY-OUTBOX');
const BUSY_OUTBOX = '/tmp/dg-busy/outbox';
const BUSY_LATEST = '/tmp/dg-busy/apply-latest.json';
const BUSY_LOG = '/tmp/dg-busy/apply-log.jsonl';

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

function outbox(dir) {
  return path.join(dir, 'DEMIGOD-APPLY-OUTBOX');
}

describe('apply outbox', { concurrency: 1 }, () => {
  test('an apply plan stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-apply-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-apply-west-'));
    const checkoutBefore = fs.existsSync(CHECKOUT_OUTBOX) ? fs.readdirSync(CHECKOUT_OUTBOX) : null;
    const busyOutbox = fs.existsSync(BUSY_OUTBOX) ? fs.readdirSync(BUSY_OUTBOX) : null;
    const busyLatest = snapshot(BUSY_LATEST);
    const busyLog = snapshot(BUSY_LOG);
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
    assert.equal(fs.existsSync(outbox(east)), false);
    assert.equal(fs.existsSync(outbox(west)), false);
    assert.equal((refused.stdout + refused.stderr).includes('www.trydemigod.com'), false);

    const eastRun = run(east, ['scaffold', '--title', 'Harbor East keep', '--file', 'demigod-foot-core.js']);
    assert.equal(eastRun.status, 0, `east scaffold failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path.startsWith(outbox(east) + path.sep), true);
    assert.equal(eastOut.path.includes('/tmp/dg-busy'), false);
    assert.equal(eastOut.plan.title, 'Harbor East keep');
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    const stored = JSON.parse(fs.readFileSync(eastOut.path, 'utf8'));
    assert.equal(stored.title, 'Harbor East keep');
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(eastOut.path);

    const eastList = run(east, ['list']);
    const eastListOut = readJson(eastList, 'east-list');
    assert.equal(eastList.status, 0);
    assert.equal(eastListOut.path, outbox(east));
    assert.equal(eastListOut.files.some((row) => row.title === 'Harbor East keep'), true);
    assert.equal(eastListOut.files.some((row) => row.title === 'Harbor West keep'), false);

    const westRun = run(west, ['scaffold', '--title', 'Harbor West keep', '--file', 'demigod-foot-core.js']);
    assert.equal(westRun.status, 0, `west scaffold failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path.startsWith(outbox(west) + path.sep), true);
    assert.equal(westOut.plan.title, 'Harbor West keep');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(eastOut.path), eastBytes);
    const westList = run(west, ['list']);
    const westListOut = readJson(westList, 'west-list');
    assert.equal(westListOut.files.some((row) => row.title === 'Harbor West keep'), true);
    assert.equal(westListOut.files.some((row) => row.title === 'Harbor East keep'), false);

    assert.deepEqual(snapshot(BUSY_LATEST), busyLatest);
    assert.deepEqual(snapshot(BUSY_LOG), busyLog);
    assert.deepEqual(fs.existsSync(BUSY_OUTBOX) ? fs.readdirSync(BUSY_OUTBOX) : null, busyOutbox);
    assert.deepEqual(fs.existsSync(CHECKOUT_OUTBOX) ? fs.readdirSync(CHECKOUT_OUTBOX) : null, checkoutBefore);
  });
});
