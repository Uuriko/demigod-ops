import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-write-desk.mjs');
const HOME_DESK = '/home/potter/DESK.json';
const HOME_BRIEF = '/home/potter/DEMIGOD-MOBILE-BRIEF.txt';
const CHECKOUT_DESK = path.join(OPS, 'DEMIGOD-DESK.json');
const CHECKOUT_BRIEF = path.join(OPS, 'DEMIGOD-MOBILE-BRIEF.txt');

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

function plant(dir, phrase) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v9-core\n`);
}

describe('desk snapshot', { concurrency: 1 }, () => {
  test('a desk snapshot stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-desk-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-desk-west-'));
    const homeDesk = snapshot(HOME_DESK);
    const homeBrief = snapshot(HOME_BRIEF);
    const checkoutDesk = snapshot(CHECKOUT_DESK);
    const checkoutBrief = snapshot(CHECKOUT_BRIEF);
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
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-DESK.json')), false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-MOBILE-BRIEF.txt')), false);
    assert.equal((refused.stdout + refused.stderr).includes('www.trydemigod.com'), false);

    plant(east, 'Harbor East keep');
    const eastRun = run(east);
    assert.equal(eastRun.status, 0, `east desk failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-DESK.json'));
    assert.equal(eastOut.brief, path.join(east, 'DEMIGOD-MOBILE-BRIEF.txt'));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.footCore, 'v9');
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    const stored = JSON.parse(fs.readFileSync(eastOut.path, 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.path, eastOut.path);
    assert.equal(stored.urls.live, 'http://127.0.0.1:9');
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(eastOut.path);
    const eastBrief = snapshot(eastOut.brief);
    assert.equal(String(eastBrief).includes('Harbor East keep'), true);
    assert.equal(String(eastBrief).includes('Harbor West keep'), false);

    plant(west, 'Harbor West keep');
    const westRun = run(west);
    assert.equal(westRun.status, 0, `west desk failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, path.join(west, 'DEMIGOD-DESK.json'));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(eastOut.path), eastBytes);
    assert.deepEqual(snapshot(eastOut.brief), eastBrief);
    const westStored = JSON.parse(fs.readFileSync(westOut.path, 'utf8'));
    assert.equal(westStored.footMarker, 'Harbor West keep');
    assert.equal(String(snapshot(westOut.brief)).includes('Harbor West keep'), true);
    assert.equal(String(snapshot(westOut.brief)).includes('Harbor East keep'), false);

    assert.deepEqual(snapshot(HOME_DESK), homeDesk);
    assert.deepEqual(snapshot(HOME_BRIEF), homeBrief);
    assert.deepEqual(snapshot(CHECKOUT_DESK), checkoutDesk);
    assert.deepEqual(snapshot(CHECKOUT_BRIEF), checkoutBrief);
  });
});
