import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const REVIEW = path.join(OPS, 'demigod-review.mjs');
const CHECKOUT_JSON = path.join(OPS, 'DEMIGOD-REVIEW.json');
const CHECKOUT_SARIF = path.join(OPS, 'DEMIGOD-REVIEW.sarif.json');
const BUSY_JSON = '/tmp/dg-busy/review-latest.json';
const BUSY_SARIF = '/tmp/dg-busy/review-latest.sarif.json';

function run(dir, args = []) {
  return spawnSync(process.execPath, [REVIEW, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
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
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-REVIEW.json'), 'utf8'));
}

function sarif(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-REVIEW.sarif.json'), 'utf8'));
}

describe('review report', { concurrency: 1 }, () => {
  test('a review report stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-review-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-review-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutJsonBefore = snapshot(CHECKOUT_JSON);
    const checkoutSarifBefore = snapshot(CHECKOUT_SARIF);
    const busyJsonBefore = snapshot(BUSY_JSON);
    const busySarifBefore = snapshot(BUSY_SARIF);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const publish = run(east, ['--publish', '--json', '--files', 'harbor-east-review.mjs']);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(publishOut.sent, false);
    assert.equal(publishOut.liveMail, false);
    assert.equal(publishOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-REVIEW.json')), false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-REVIEW.sarif.json')), false);

    const eastBody = 'export const note = "Harbor East review";\n';
    fs.writeFileSync(path.join(east, 'harbor-east-review.mjs'), eastBody);
    const eastRun = run(east, ['--json', '--files', 'harbor-east-review.mjs']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-REVIEW.json'));
    assert.equal(eastOut.outs.json, path.join(east, 'DEMIGOD-REVIEW.json'));
    assert.equal(eastOut.outs.sarif, path.join(east, 'DEMIGOD-REVIEW.sarif.json'));
    assert.equal(eastOut.files.includes('harbor-east-review.mjs'), true);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(report(east).files.includes('harbor-east-review.mjs'), true);
    assert.equal(report(east).livePublish, false);
    assert.equal(sarif(east).version, '2.1.0');
    assert.equal(fs.readFileSync(path.join(east, 'harbor-east-review.mjs'), 'utf8'), eastBody);
    const eastBytes = snapshot(path.join(east, 'DEMIGOD-REVIEW.json'));
    const eastSarifBytes = snapshot(path.join(east, 'DEMIGOD-REVIEW.sarif.json'));

    const westBody = 'export const note = "Harbor West review";\n';
    fs.writeFileSync(path.join(west, 'harbor-west-review.mjs'), westBody);
    const westRun = run(west, ['--json', '--files', 'harbor-west-review.mjs']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, path.join(west, 'DEMIGOD-REVIEW.json'));
    assert.equal(westOut.files.includes('harbor-west-review.mjs'), true);
    assert.equal(westOut.files.includes('harbor-east-review.mjs'), false);
    assert.equal(report(west).files.includes('harbor-east-review.mjs'), false);
    assert.equal(JSON.stringify(report(east)).includes('harbor-west-review.mjs'), false);
    assert.equal(fs.existsSync(path.join(west, 'DEMIGOD-REVIEW.sarif.json')), true);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-REVIEW.json')), eastBytes);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-REVIEW.sarif.json')), eastSarifBytes);
    assert.deepEqual(snapshot(CHECKOUT_JSON), checkoutJsonBefore);
    assert.deepEqual(snapshot(CHECKOUT_SARIF), checkoutSarifBefore);
    assert.deepEqual(snapshot(BUSY_JSON), busyJsonBefore);
    assert.deepEqual(snapshot(BUSY_SARIF), busySarifBefore);
  });
});
