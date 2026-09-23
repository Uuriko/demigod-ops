import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const TRUTH = path.join(OPS, 'demigod-truth.mjs');
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-TRUTH.json');
const BUSY_JSON = '/tmp/dg-busy/truth.json';
const BUSY_MD = '/tmp/dg-busy/truth.md';

function run(dir, args = []) {
  return spawnSync(process.execPath, [TRUTH, ...args], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      DEMIGOD_LIVE: 'http://127.0.0.1:9',
    },
    encoding: 'utf8',
  });
}

function readJson(res, label) {
  const raw = res.status === 0 ? res.stdout : res.stderr;
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
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `/*__dgFootVer='${version}'*/\n${note}\n`);
  fs.writeFileSync(path.join(dir, 'DEMIGOD-VERIFY-SOURCE.json'), JSON.stringify({
    pass: true,
    at: note,
  }));
}

function report(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-TRUTH.json'), 'utf8'));
}

describe('truth report', { concurrency: 1 }, () => {
  test('a truth report stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-truth-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-truth-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutBefore = snapshot(CHECKOUT_REPORT);
    const busyJsonBefore = snapshot(BUSY_JSON);
    const busyMdBefore = snapshot(BUSY_MD);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const publish = run(east, ['--publish', '--json']);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(publishOut.sent, false);
    assert.equal(publishOut.liveMail, false);
    assert.equal(publishOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-TRUTH.json')), false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-TRUTH.md')), false);

    writeRoot(east, 'Harbor East truth', 91);
    fs.writeFileSync(path.join(east, 'DEMIGOD-PREFLIGHT.json'), JSON.stringify({ pass: true }));
    const eastRun = run(east, ['--json']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastRun.stdout.includes('fullyShipped'), true);
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-TRUTH.json'));
    assert.equal(eastOut.foot.ver, '91');
    assert.equal(eastOut.gates.verifySourceAt, 'Harbor East truth');
    assert.equal(eastOut.tools.preflight, true);
    assert.equal(eastOut.match.fullyShipped, false);
    assert.equal(eastOut.live.ok, false);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(report(east).foot.ver, '91');
    assert.equal(report(east).gates.verifySourceAt, 'Harbor East truth');
    assert.equal(fs.readFileSync(path.join(east, 'DEMIGOD-TRUTH.md'), 'utf8').includes('v91'), true);
    const eastBytes = snapshot(path.join(east, 'DEMIGOD-TRUTH.json'));

    writeRoot(west, 'Harbor West truth', 92);
    const westRun = run(west, ['--json']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westRun.status, 0);
    assert.equal(westOut.path, path.join(west, 'DEMIGOD-TRUTH.json'));
    assert.equal(westOut.foot.ver, '92');
    assert.equal(westOut.gates.verifySourceAt, 'Harbor West truth');
    assert.equal(westOut.tools.preflight, null);
    assert.equal(JSON.stringify(report(west)).includes('Harbor East truth'), false);
    assert.equal(JSON.stringify(report(east)).includes('Harbor West truth'), false);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-TRUTH.json')), eastBytes);
    assert.deepEqual(snapshot(CHECKOUT_REPORT), checkoutBefore);
    assert.deepEqual(snapshot(BUSY_JSON), busyJsonBefore);
    assert.deepEqual(snapshot(BUSY_MD), busyMdBefore);
  });
});
