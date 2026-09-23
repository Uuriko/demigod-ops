import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const MINT = path.join(OPS, 'demigod-receipt-mint.mjs');
const CHECKOUT_BOARD = path.join(OPS, 'DEMIGOD-BOARD.json');

function run(dir, args) {
  return spawnSync(process.execPath, [MINT, ...args], {
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

function boardText(dir) {
  const file = path.join(dir, 'DEMIGOD-BOARD.json');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function snapshot(file) {
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

describe('receipt mint', { concurrency: 1 }, () => {
  test('a named intro count stays on that board and an omitted count is not invented', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-receipt-mint-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-receipt-mint-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutBefore = snapshot(CHECKOUT_BOARD);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const missing = run(east, []);
    const missingOut = readJson(missing, 'missing');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.ok, false);
    assert.equal(missingOut.error, 'note_required');
    assert.equal(missingOut.sent, false);
    assert.equal(missingOut.liveMail, false);
    assert.equal(missingOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-BOARD.json')), false);

    const noCount = run(east, ['--note=Harbor East brief']);
    const noCountOut = readJson(noCount, 'no count');
    assert.equal(noCount.status, 1);
    assert.equal(noCountOut.error, 'intros_required');
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-BOARD.json')), false);

    const bogus = run(east, ['--note=Harbor East brief', '--intros=nope']);
    assert.equal(readJson(bogus, 'bogus').error, 'intros_invalid');
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-BOARD.json')), false);

    const publish = run(east, ['--publish', '--note=Harbor East brief', '--intros=1']);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(publishOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-BOARD.json')), false);

    const eastRun = run(east, ['--note=Harbor East brief', '--intros=2']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.receipt.note, 'Harbor East brief');
    assert.equal(eastOut.receipt.intros, 2);
    assert.equal(eastOut.receipt.status, 'recorded_local');
    assert.equal(eastOut.receipt.number, 1);
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-BOARD.json'));
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(eastOut.url, null);
    assert.equal(eastRun.stdout.includes('trydemigod.com'), false);
    const eastBoard = JSON.parse(boardText(east));
    assert.equal(eastBoard.receipts[0].note, 'Harbor East brief');
    assert.equal(eastBoard.receipts[0].intros, 2);

    const second = run(east, ['--note=Harbor Open brief', '--intros=1']);
    const secondOut = readJson(second, 'second');
    assert.equal(second.status, 0);
    assert.equal(secondOut.receipt.intros, 1);
    assert.equal(secondOut.receipt.number, 2);
    const eastAfter = JSON.parse(boardText(east));
    const notes = eastAfter.receipts.map((row) => row.note);
    assert.deepEqual(notes, ['Harbor Open brief', 'Harbor East brief']);
    assert.equal(notes.includes('Harbor West brief'), false);

    const westRun = run(west, ['--note=Harbor West brief', '--intros=0']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westRun.status, 0);
    assert.equal(westOut.receipt.note, 'Harbor West brief');
    assert.equal(westOut.receipt.intros, 0);
    assert.equal(westOut.receipt.number, 1);
    const westBoard = boardText(west);
    assert.equal(westBoard.includes('Harbor East brief'), false);
    assert.equal(westBoard.includes('Harbor Open brief'), false);
    assert.equal(JSON.parse(westBoard).receipts[0].intros, 0);
    const eastFinal = boardText(east);
    assert.equal(eastFinal.includes('Harbor West brief'), false);
    assert.equal(eastFinal.includes('Harbor East brief'), true);
    assert.deepEqual(snapshot(CHECKOUT_BOARD), checkoutBefore);
  });
});
