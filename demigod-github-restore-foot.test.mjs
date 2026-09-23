import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-github-restore-foot.mjs');
const SHARED = [
  '/home/potter/DEMIGOD-GITHUB-PUSH-PAYLOAD.json',
  '/home/potter/demigod-foot-core.js',
  '/home/potter/eat-the-sounds/demigod-foot-core.js',
  path.join(OPS, 'DEMIGOD-GITHUB-PUSH-PAYLOAD.json'),
];

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

function plant(dir, phrase, version) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v${version}-core\n`);
}

function payloadFile(dir) {
  return path.join(dir, 'DEMIGOD-GITHUB-PUSH-PAYLOAD.json');
}

describe('restore payload', { concurrency: 1 }, () => {
  test('a restore payload stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-restore-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-restore-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    t.after(() => {
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const missing = run(east);
    const missingOut = readJson(missing, 'missing foot');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'foot_required');
    assert.equal(missingOut.livePush, false);
    assert.equal(fs.existsSync(payloadFile(east)), false);

    const refused = run(east, ['--publish']);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.sent, false);
    assert.equal(refusedOut.liveMail, false);
    assert.equal(refusedOut.livePublish, false);
    assert.equal(refusedOut.livePush, false);
    assert.equal(fs.existsSync(payloadFile(east)), false);
    assert.equal((refused.stdout + refused.stderr).includes('www.trydemigod.com'), false);

    plant(east, 'Harbor East keep', '9');
    const eastRun = run(east);
    assert.equal(eastRun.status, 0, `east restore failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, payloadFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.footVersion, '9');
    assert.equal(eastOut.livePush, false);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('gh-api'), false);
    const stored = JSON.parse(fs.readFileSync(payloadFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.files[0].content.includes('Harbor East keep'), true);
    assert.equal(stored.livePush, false);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(payloadFile(east));

    plant(west, 'Harbor West keep', '8');
    const westRun = run(west);
    assert.equal(westRun.status, 0, `west restore failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, payloadFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(westOut.footVersion, '8');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    const westStored = JSON.parse(fs.readFileSync(payloadFile(west), 'utf8'));
    assert.equal(westStored.files[0].content.includes('Harbor West keep'), true);
    assert.equal(westStored.files[0].content.includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(payloadFile(east)), eastBytes);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
  });
});
