import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const TRACKER = path.join(OPS, 'demigod-pilot-tracker.mjs');
const EMAIL = 'ada@harbor.example';

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, TRACKER, ...args], {
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
    parsed = JSON.parse(line || raw);
  } catch {
    parsed = null;
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

describe('pilot log no publish', { concurrency: 1 }, () => {
  test('a missing email writes no pilot and a logged pilot is not published', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-pilot-log-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = dir;
    const flag = path.join(dir, 'fetch-calls.log');
    const preload = path.join(dir, 'no-live-pay.mjs');
    fs.writeFileSync(preload, `import fs from 'node:fs';
globalThis.fetch = async () => {
  fs.appendFileSync(${JSON.stringify(flag)}, 'fetch\\n');
  throw new Error('live_payment');
};
`);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(dir, { recursive: true, force: true });
    });

    const boardFile = path.join(dir, 'DEMIGOD-BOARD.json');
    fs.writeFileSync(boardFile, `${JSON.stringify({
      at: '2026-09-23T08:00:00.000Z',
      roles: [],
      candidates: [],
      receipts: [],
      pilots: [],
    }, null, 2)}\n`);
    const before = fs.readFileSync(boardFile, 'utf8');

    const missing = run(dir, preload, ['--status=briefed']);
    assert.equal(missing.status, 1);
    assert.equal(fs.readFileSync(boardFile, 'utf8'), before);
    assert.equal(String(missing.stdout || '').includes('demigod-board-publish'), false);

    const logged = readJson(run(dir, preload, [`--founderEmail=${EMAIL}`, '--status=briefed']), 'pilot log');
    assert.equal(logged.ok, true);
    assert.equal(logged.email, EMAIL);
    assert.equal(logged.status, 'briefed');
    assert.equal(logged.saved, true);
    assert.equal(logged.publish, false);
    assert.equal(logged.livePublish, false);
    const stored = JSON.parse(fs.readFileSync(boardFile, 'utf8'));
    const pilot = (stored.pilots || []).find((row) => row.email === EMAIL);
    assert.equal(pilot.status, 'briefed');
    assert.equal((stored.roles || []).some((row) => row.id === 'role-seed1'), false);
    assert.equal(fs.existsSync(flag), false);
  });
});
