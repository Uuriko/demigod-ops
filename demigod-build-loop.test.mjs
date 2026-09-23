import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const LOOP = path.join(OPS, 'demigod-build-loop.mjs');
const CHECKOUT_QUEUE = path.join(OPS, 'DEMIGOD-BUILD-QUEUE.jsonl');
const BUSY_QUEUE = '/tmp/dg-busy/BUILD-QUEUE.jsonl';

function run(dir, args = []) {
  return spawnSync(process.execPath, [LOOP, ...args], {
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

describe('build loop queue', { concurrency: 1 }, () => {
  test('a build-loop queue stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-build-loop-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-build-loop-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutBefore = snapshot(CHECKOUT_QUEUE);
    const busyBefore = snapshot(BUSY_QUEUE);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const publish = run(east, ['seed', '--publish']);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(publishOut.sent, false);
    assert.equal(publishOut.liveMail, false);
    assert.equal(publishOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-BUILD-QUEUE.jsonl')), false);

    const eastSeed = run(east, ['seed']);
    const eastOut = readJson(eastSeed, 'east seed');
    assert.equal(eastSeed.status, 0);
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.seeded, 4);
    assert.equal(eastOut.queue, path.join(east, 'DEMIGOD-BUILD-QUEUE.jsonl'));
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    const eastQueue = fs.readFileSync(path.join(east, 'DEMIGOD-BUILD-QUEUE.jsonl'), 'utf8');
    assert.equal(eastQueue.includes(east), true);
    assert.equal(eastQueue.includes(west), false);
    assert.equal(eastQueue.includes('/tmp/dg-busy'), false);
    const eastBytes = snapshot(path.join(east, 'DEMIGOD-BUILD-QUEUE.jsonl'));

    const eastStatus = run(east, ['status']);
    const eastStatusOut = readJson(eastStatus, 'east status');
    assert.equal(eastStatus.status, 0);
    assert.equal(eastStatusOut.queue, path.join(east, 'DEMIGOD-BUILD-QUEUE.jsonl'));
    assert.equal(eastStatusOut.counts.ready, 4);
    assert.equal(JSON.stringify(eastStatusOut).includes(west), false);

    const westSeed = run(west, ['seed']);
    const westOut = readJson(westSeed, 'west seed');
    assert.equal(westSeed.status, 0);
    assert.equal(westOut.queue, path.join(west, 'DEMIGOD-BUILD-QUEUE.jsonl'));
    const westQueue = fs.readFileSync(path.join(west, 'DEMIGOD-BUILD-QUEUE.jsonl'), 'utf8');
    assert.equal(westQueue.includes(west), true);
    assert.equal(westQueue.includes(east), false);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-BUILD-QUEUE.jsonl')), eastBytes);
    assert.deepEqual(snapshot(CHECKOUT_QUEUE), checkoutBefore);
    assert.deepEqual(snapshot(BUSY_QUEUE), busyBefore);
  });
});
