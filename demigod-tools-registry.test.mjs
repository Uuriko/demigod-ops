import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-tools-registry.mjs');
const CHECKOUT_JSON = path.join(OPS, 'DEMIGOD-TOOLS-REGISTRY.json');
const CHECKOUT_MD = path.join(OPS, 'DEMIGOD-TOOLS-REGISTRY.md');
const BUSY_JSON = '/tmp/dg-busy/tools-registry.json';
const BUSY_MD = '/tmp/dg-busy/tools-registry.md';

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

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-TOOLS-REGISTRY.json');
}

function pairsOf(reg) {
  return reg.tools.find((row) => row.id === 'pairs');
}

describe('tools registry', { concurrency: 1 }, () => {
  test('a tools registry stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-registry-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-registry-west-'));
    const checkoutJson = snapshot(CHECKOUT_JSON);
    const checkoutMd = snapshot(CHECKOUT_MD);
    const busyJson = snapshot(BUSY_JSON);
    const busyMd = snapshot(BUSY_MD);
    t.after(() => {
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    fs.writeFileSync(path.join(east, 'DEMIGOD-PAIRS.json'), '{"note":"Harbor East keep"}\n');
    fs.writeFileSync(path.join(west, 'DEMIGOD-PAIRS.json'), '{"note":"Harbor West keep"}\n');

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
    assert.deepEqual(snapshot(BUSY_JSON), busyJson);
    assert.deepEqual(snapshot(BUSY_MD), busyMd);

    const eastRun = run(east, ['--json']);
    assert.equal(eastRun.status, 0, `east registry failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/tmp/dg-busy'), false);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(pairsOf(eastOut).evidence.path, path.join(east, 'DEMIGOD-PAIRS.json'));
    assert.equal(pairsOf(eastOut).evidence.missing, undefined);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.path, reportFile(east));
    assert.equal(pairsOf(stored).evidence.path, path.join(east, 'DEMIGOD-PAIRS.json'));
    assert.equal(JSON.stringify(stored).includes(west), false);
    const eastBytes = snapshot(reportFile(east));

    const westRun = run(west, ['--json']);
    assert.equal(westRun.status, 0, `west registry failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(pairsOf(westOut).evidence.path, path.join(west, 'DEMIGOD-PAIRS.json'));
    assert.equal(JSON.stringify(westOut).includes(east), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);
    assert.equal(JSON.parse(fs.readFileSync(reportFile(west), 'utf8')).path, reportFile(west));

    assert.deepEqual(snapshot(BUSY_JSON), busyJson);
    assert.deepEqual(snapshot(BUSY_MD), busyMd);
    assert.deepEqual(snapshot(CHECKOUT_JSON), checkoutJson);
    assert.deepEqual(snapshot(CHECKOUT_MD), checkoutMd);
  });
});
