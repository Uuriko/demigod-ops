import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-user-test.mjs');
const BUSY_JSON = '/tmp/dg-busy/user-test-latest.json';
const BUSY_MD = '/tmp/dg-busy/user-test-latest.md';
const CHECKOUT_JSON = path.join(OPS, 'user-test-latest.json');
const CHECKOUT_MD = path.join(OPS, 'user-test-latest.md');

function run(dir, args) {
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

function plantFoot(dir, phrase) {
  fs.writeFileSync(
    path.join(dir, 'demigod-foot-core.js'),
    `// ${phrase}\nexport const hiring = "I'm hiring";\nexport const job = "Find a job";\nexport const note = "pending review";\n`,
  );
}

function marker(report) {
  return report.results.find((row) => row.name === 'foot marker');
}

describe('user-test report', { concurrency: 1 }, () => {
  test('a user-test report stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-usertest-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-usertest-west-'));
    const busyJson = snapshot(BUSY_JSON);
    const busyMd = snapshot(BUSY_MD);
    const checkoutJson = snapshot(CHECKOUT_JSON);
    const checkoutMd = snapshot(CHECKOUT_MD);
    t.after(() => {
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const refused = run(east, ['--publish', '--suite', 'copy', '--json']);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.sent, false);
    assert.equal(refusedOut.liveMail, false);
    assert.equal(refusedOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'user-test-latest.json')), false);
    assert.equal(fs.existsSync(path.join(east, 'user-test-latest.md')), false);
    assert.equal(fs.existsSync(path.join(west, 'user-test-latest.json')), false);
    assert.equal((refused.stdout + refused.stderr).includes('www.trydemigod.com'), false);

    plantFoot(east, 'Harbor East keep');
    const eastRun = run(east, ['--suite', 'copy', '--json']);
    assert.equal(eastRun.status, 0, `east copy failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.path, path.join(east, 'user-test-latest.json'));
    assert.equal(eastOut.path.includes('/tmp/dg-busy'), false);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(eastOut.suite, 'copy');
    assert.equal(marker(eastOut)?.detail, 'Harbor East keep');
    assert.equal(JSON.stringify(eastOut).includes('Harbor West keep'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    const eastJson = snapshot(eastOut.path);
    const eastMd = snapshot(path.join(east, 'user-test-latest.md'));
    assert.equal(eastMd.includes('Harbor East keep'), true);
    assert.equal(eastMd.includes('Harbor West keep'), false);
    assert.equal(eastMd.includes('/tmp/dg-busy'), false);

    plantFoot(west, 'Harbor West keep');
    const westRun = run(west, ['--suite', 'copy', '--json']);
    assert.equal(westRun.status, 0, `west copy failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, path.join(west, 'user-test-latest.json'));
    assert.equal(marker(westOut)?.detail, 'Harbor West keep');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(eastOut.path), eastJson);
    assert.deepEqual(snapshot(path.join(east, 'user-test-latest.md')), eastMd);
    const westMd = snapshot(path.join(west, 'user-test-latest.md'));
    assert.equal(westMd.includes('Harbor West keep'), true);
    assert.equal(westMd.includes('Harbor East keep'), false);

    assert.deepEqual(snapshot(BUSY_JSON), busyJson);
    assert.deepEqual(snapshot(BUSY_MD), busyMd);
    assert.deepEqual(snapshot(CHECKOUT_JSON), checkoutJson);
    assert.deepEqual(snapshot(CHECKOUT_MD), checkoutMd);
  });
});
