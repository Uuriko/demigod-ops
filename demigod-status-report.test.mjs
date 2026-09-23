import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const STATUS = path.join(OPS, 'demigod-status-report.mjs');
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-STATUS-REPORT.json');

function run(dir, args = []) {
  return spawnSync(process.execPath, [STATUS, ...args], {
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

function writeAudit(dir, note, version) {
  fs.writeFileSync(path.join(dir, 'DEMIGOD-VERIFY-SOURCE.json'), JSON.stringify({
    pass: true,
    failed: [note],
  }));
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `/*dg-foot-v${version}-core*/\n`);
}

function report(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-STATUS-REPORT.json'), 'utf8'));
}

describe('status report', { concurrency: 1 }, () => {
  test('a named status stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-status-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-status-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutBefore = snapshot(CHECKOUT_REPORT);
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
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-STATUS-REPORT.json')), false);

    writeAudit(east, 'Harbor East status', 91);
    writeAudit(west, 'Harbor West status', 92);
    const eastRun = run(east);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-STATUS-REPORT.json'));
    assert.equal(eastOut.verifySource, true);
    assert.equal(eastOut.footCore, 'v91');
    assert.deepEqual(eastOut.failed, ['Harbor East status']);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(report(east).source.footCore, 'v91');
    assert.deepEqual(report(east).source.failed, ['Harbor East status']);
    assert.equal(report(east).livePublish, false);
    assert.equal(JSON.stringify(report(east)).includes('Harbor West status'), false);
    assert.equal(JSON.stringify(report(east)).includes('v199'), false);

    const westRun = run(west);
    const westOut = readJson(westRun, 'west');
    assert.equal(westRun.status, 0);
    assert.equal(westOut.footCore, 'v92');
    assert.deepEqual(westOut.failed, ['Harbor West status']);
    assert.equal(JSON.stringify(report(west)).includes('Harbor East status'), false);
    assert.equal(JSON.stringify(report(east)).includes('Harbor West status'), false);
    assert.equal(report(east).source.footCore, 'v91');
    assert.deepEqual(snapshot(CHECKOUT_REPORT), checkoutBefore);
  });
});
