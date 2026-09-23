import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-gtm-blast.mjs');
const SHARED = [
  '/tmp/demigod-x-variants.txt',
  '/home/potter/demigod-outreach/dm-send-log.txt',
  '/home/potter/demigod-x-variants.txt',
  path.join(OPS, 'demigod-outreach', 'dm-send-log.txt'),
  path.join(OPS, 'demigod-x-variants.txt'),
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

function plant(dir, phrase) {
  const sends = path.join(dir, 'demigod-outreach', 'sends-2026-07-07');
  fs.mkdirSync(sends, { recursive: true });
  fs.writeFileSync(path.join(sends, `${phrase.replace(/ /g, '-')}.txt`), `${phrase} note\n`);
  fs.writeFileSync(path.join(dir, 'demigod-x-variants.txt'), `${phrase} variant\n`);
}

function logFile(dir) {
  return path.join(dir, 'demigod-outreach', 'dm-send-log.txt');
}

describe('blast log', { concurrency: 1 }, () => {
  test('a blast log stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-blast-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-blast-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    t.after(() => {
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const missing = run(east);
    const missingOut = readJson(missing, 'missing sends');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'sends_required');
    assert.equal(fs.existsSync(logFile(east)), false);

    const refused = run(east, ['--publish']);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.sent, false);
    assert.equal(refusedOut.liveMail, false);
    assert.equal(refusedOut.livePublish, false);
    assert.equal(fs.existsSync(logFile(east)), false);
    assert.equal((refused.stdout + refused.stderr).includes('www.trydemigod.com'), false);

    plant(east, 'Harbor East keep');
    const dry = run(east, ['--dry']);
    assert.equal(dry.status, 0, `dry blast failed\n${dry.stdout}\n${dry.stderr}`);
    const dryOut = readJson(dry, 'dry');
    assert.equal(dryOut.dry, true);
    assert.equal(dryOut.added, 1);
    assert.equal(fs.existsSync(logFile(east)), false);

    const eastRun = run(east);
    assert.equal(eastRun.status, 0, `east blast failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, logFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/'), false);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.added, 1);
    assert.deepEqual(eastOut.roles, ['Harbor East keep']);
    assert.equal(eastOut.variantsPath, path.join(east, 'demigod-x-variants.txt'));
    assert.equal(eastOut.variantsUsed, true);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    const eastLog = fs.readFileSync(logFile(east), 'utf8');
    assert.equal(eastLog.includes('Harbor East keep'), true);
    assert.equal(eastLog.includes('Harbor West keep'), false);
    assert.equal(eastLog.includes('@example.co'), true);
    const eastBytes = snapshot(logFile(east));

    plant(west, 'Harbor West keep');
    const westRun = run(west);
    assert.equal(westRun.status, 0, `west blast failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, logFile(west));
    assert.equal(westOut.roles[0], 'Harbor West keep');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    const westLog = fs.readFileSync(logFile(west), 'utf8');
    assert.equal(westLog.includes('Harbor West keep'), true);
    assert.equal(westLog.includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(logFile(east)), eastBytes);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
  });
});
