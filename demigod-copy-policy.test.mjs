import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const POLICY = path.join(OPS, 'demigod-copy-policy.mjs');
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-COPY-POLICY.json');
const BUSY_REPORT = '/tmp/dg-busy/copy-policy-latest.json';

function run(dir, args = []) {
  return spawnSync(process.execPath, [POLICY, ...args], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      DEMIGOD_LIVE: 'http://127.0.0.1:9',
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

function writeRoot(dir, note) {
  const copy = `var COPY={\n  line: '${note} stays in this root and is long enough for the copy block check'\n};\n`;
  fs.writeFileSync(
    path.join(dir, 'demigod-foot-core.js'),
    `${copy}function scrubTimeClaims(){}\nfunction scrubStaticLabels(){}\npending\n`,
  );
  fs.writeFileSync(path.join(dir, 'demigod-copy-denylist.txt'), `${note}\n`);
}

function report(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-COPY-POLICY.json'), 'utf8'));
}

describe('copy policy report', { concurrency: 1 }, () => {
  test('a copy policy report stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-copy-policy-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-copy-policy-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutBefore = snapshot(CHECKOUT_REPORT);
    const busyBefore = snapshot(BUSY_REPORT);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const publish = run(east, ['--publish', '--json', '--disk-only']);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(publishOut.sent, false);
    assert.equal(publishOut.liveMail, false);
    assert.equal(publishOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-COPY-POLICY.json')), false);

    writeRoot(east, 'HarborEastCopy');
    const eastRun = run(east, ['--json', '--disk-only']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-COPY-POLICY.json'));
    assert.equal(eastOut.live, false);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(JSON.stringify(eastOut).includes('HarborEastCopy'), true);
    assert.equal(JSON.stringify(eastOut).includes('HarborWestCopy'), false);
    assert.equal(eastOut.checks.find((c) => c.name === 'foot-exists').detail, path.join(east, 'demigod-foot-core.js'));
    const eastBytes = snapshot(path.join(east, 'DEMIGOD-COPY-POLICY.json'));

    writeRoot(west, 'HarborWestCopy');
    const westRun = run(west, ['--json', '--disk-only']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, path.join(west, 'DEMIGOD-COPY-POLICY.json'));
    assert.equal(JSON.stringify(westOut).includes('HarborWestCopy'), true);
    assert.equal(JSON.stringify(westOut).includes('HarborEastCopy'), false);
    assert.equal(westOut.checks.find((c) => c.name === 'foot-exists').detail, path.join(west, 'demigod-foot-core.js'));
    assert.equal(JSON.stringify(report(east)).includes('HarborWestCopy'), false);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-COPY-POLICY.json')), eastBytes);
    assert.deepEqual(snapshot(CHECKOUT_REPORT), checkoutBefore);
    assert.deepEqual(snapshot(BUSY_REPORT), busyBefore);
  });
});
