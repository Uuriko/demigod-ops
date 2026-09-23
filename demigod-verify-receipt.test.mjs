import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-verify-receipt.mjs');
const HOME_REPORT = '/home/potter/DEMIGOD-VERIFY-RECEIPT.json';
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-VERIFY-RECEIPT.json');

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

function plant(dir, phrase, hash) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), [
    `// ${phrase}`,
    'dg-foot-v9-core',
    'dg-ledger-row',
    'function statusRoute() {}',
    '#demigod-status-wrap',
    'function receiptRoute() {}',
    'dg-signal-bar',
    'function renderSignal() {}',
    '#receipt/',
    'startup-hire',
    'engineer-join',
    'mutual interest',
    'var COPY={};',
  ].join('\n'));
  fs.writeFileSync(path.join(dir, 'DEMIGOD-BOARD.json'), JSON.stringify({
    receipts: [{ hash }],
    signal: null,
  }));
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-VERIFY-RECEIPT.json');
}

describe('receipt check', { concurrency: 1 }, () => {
  test('a receipt check stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-receipt-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-receipt-west-'));
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

    plant(east, 'Harbor East keep', 'east-receipt-harbor');
    const eastRun = run(east);
    assert.equal(eastRun.status, 0, `east receipt check failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.pass, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/dg-busy'), false);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.footVersion, '9');
    assert.equal(eastOut.sampleHash, 'east-receipt-harbor');
    assert.equal(eastOut.checks.receiptRoute, true);
    assert.equal(eastOut.checks.boardReceipts, true);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.sampleHash, 'east-receipt-harbor');
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    assert.equal(JSON.stringify(stored).includes('west-receipt-harbor'), false);
    const eastBytes = snapshot(reportFile(east));

    plant(west, 'Harbor West keep', 'west-receipt-harbor');
    const westRun = run(west);
    assert.equal(westRun.status, 0, `west receipt check failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(westOut.sampleHash, 'west-receipt-harbor');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    assert.equal(JSON.stringify(westOut).includes('east-receipt-harbor'), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);
    const westStored = JSON.parse(fs.readFileSync(reportFile(west), 'utf8'));
    assert.equal(westStored.footMarker, 'Harbor West keep');
    assert.equal(westStored.sampleHash, 'west-receipt-harbor');

    assert.deepEqual(snapshot(HOME_REPORT), homeBefore);
    assert.deepEqual(snapshot(CHECKOUT_REPORT), checkoutBefore);
  });
});
