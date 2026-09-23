import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const RECEIPT = path.join(OPS, 'demigod-publish-receipt.mjs');
const CHECKOUT_LATEST = path.join(OPS, 'docs', 'receipts', 'PUBLISH-LATEST.json');
const BUSY_LATEST = '/tmp/dg-busy/publish-receipt-latest.json';

function run(dir, args) {
  return spawnSync(process.execPath, [RECEIPT, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
}

function readJson(res, label) {
  const raw = res.status === 0 ? res.stdout : res.stderr;
  const line = String(raw || '').trim().split('\n').filter((row) => row.trim().startsWith('{')).at(-1);
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

function latest(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'docs', 'receipts', 'PUBLISH-LATEST.json'), 'utf8'));
}

function logText(dir) {
  return fs.readFileSync(path.join(dir, 'docs', 'receipts', 'PUBLISH-LOG.jsonl'), 'utf8');
}

describe('publish receipt', { concurrency: 1 }, () => {
  test('a named receipt stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-pub-receipt-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-pub-receipt-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutBefore = snapshot(CHECKOUT_LATEST);
    const busyBefore = snapshot(BUSY_LATEST);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const missing = run(east, ['record']);
    const missingOut = readJson(missing, 'missing');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'note_required');
    assert.equal(missingOut.sent, false);
    assert.equal(missingOut.liveMail, false);
    assert.equal(missingOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'docs', 'receipts', 'PUBLISH-LATEST.json')), false);

    const publish = run(east, ['record', '--publish', '--note=Harbor East foot']);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(fs.existsSync(path.join(east, 'docs', 'receipts', 'PUBLISH-LOG.jsonl')), false);

    const eastRun = run(east, ['record', '--note=Harbor East foot', '--sha=abc123']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.note, 'Harbor East foot');
    assert.equal(eastOut.sha, 'abc123');
    assert.equal(eastOut.count, 1);
    assert.equal(eastOut.path, path.join(east, 'docs', 'receipts', 'PUBLISH-LATEST.json'));
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(latest(east).note, 'Harbor East foot');
    assert.equal(latest(east).livePublish, false);
    assert.equal(logText(east).includes('Harbor West foot'), false);

    const second = run(east, ['record', '--note=Harbor Open foot', '--sha=def456']);
    const secondOut = readJson(second, 'second');
    assert.equal(second.status, 0);
    assert.equal(secondOut.count, 2);
    assert.equal(latest(east).note, 'Harbor Open foot');
    const notes = logText(east).trim().split('\n').map((line) => JSON.parse(line).note);
    assert.deepEqual(notes, ['Harbor East foot', 'Harbor Open foot']);

    const latestRun = run(east, ['latest']);
    const latestOut = readJson(latestRun, 'latest');
    assert.equal(latestRun.status, 0);
    assert.equal(latestOut.latest.note, 'Harbor Open foot');
    assert.equal(latestOut.livePublish, false);

    const westRun = run(west, ['record', '--note=Harbor West foot', '--sha=fff789']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westRun.status, 0);
    assert.equal(westOut.note, 'Harbor West foot');
    assert.equal(westOut.count, 1);
    assert.equal(logText(west).includes('Harbor East foot'), false);
    assert.equal(logText(west).includes('Harbor Open foot'), false);
    assert.equal(logText(east).includes('Harbor West foot'), false);
    assert.equal(latest(east).note, 'Harbor Open foot');
    assert.deepEqual(snapshot(CHECKOUT_LATEST), checkoutBefore);
    assert.deepEqual(snapshot(BUSY_LATEST), busyBefore);
  });
});
