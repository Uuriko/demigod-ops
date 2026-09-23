import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const LOGGER = path.join(OPS, 'demigod-pilot-logger.mjs');
const CHECKOUT_BOARD = path.join(OPS, 'DEMIGOD-BOARD.json');

function run(dir, args, { allowReal = false } = {}) {
  const env = { ...process.env, DEMIGOD_ROOT: dir };
  if (allowReal) env.DEMIGOD_ALLOW_REAL_ROLES = '1';
  else delete env.DEMIGOD_ALLOW_REAL_ROLES;
  return spawnSync(process.execPath, [LOGGER, ...args], {
    cwd: OPS,
    env,
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

function board(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-BOARD.json'), 'utf8'));
}

function snapshot(file) {
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

describe('pilot logger', { concurrency: 1 }, () => {
  test('a fourth logged pilot remains on that board', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-pilot-logger-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-pilot-logger-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    const priorAllow = process.env.DEMIGOD_ALLOW_REAL_ROLES;
    process.env.DEMIGOD_ROOT = east;
    const checkoutBefore = snapshot(CHECKOUT_BOARD);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      if (priorAllow == null) delete process.env.DEMIGOD_ALLOW_REAL_ROLES;
      else process.env.DEMIGOD_ALLOW_REAL_ROLES = priorAllow;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const missing = run(east, []);
    const missingOut = readJson(missing, 'missing');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'brief_required');
    assert.equal(missingOut.sent, false);
    assert.equal(missingOut.liveMail, false);
    assert.equal(missingOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-BOARD.json')), false);

    const publish = run(east, ['--publish', '--brief=Harbor East One'], { allowReal: true });
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-BOARD.json')), false);

    const refused = run(east, ['--brief=Harbor East One']);
    const refusedOut = readJson(refused, 'refused');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'real_roles_refused');
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-BOARD.json')), false);

    const now = new Date().toISOString();
    fs.writeFileSync(path.join(east, 'DEMIGOD-BOARD.json'), JSON.stringify({
      roles: [1, 2, 3, 4].map((n) => ({
        id: `card-${n}`,
        title: `Featured Card ${n}`,
        featuredAt: now,
        sample: true,
      })),
      candidates: [],
      receipts: [],
    }, null, 2));

    const titles = ['Harbor East One', 'Harbor East Two', 'Harbor East Three', 'Harbor East Four'];
    for (const title of titles) {
      const res = run(east, [`--brief=${title}`, '--stage-type=seed'], { allowReal: true });
      const out = readJson(res, title);
      assert.equal(res.status, 0, out.error || res.stderr);
      assert.equal(out.ok, true);
      assert.equal(out.brief, title);
      assert.equal(out.sent, false);
      assert.equal(out.liveMail, false);
      assert.equal(out.livePublish, false);
      assert.equal(out.path, path.join(east, 'DEMIGOD-BOARD.json'));
    }

    const eastBoard = board(east);
    const pilotTitles = eastBoard.roles.filter((role) => role.pilot === true).map((role) => role.title);
    const cardTitles = eastBoard.roles.filter((role) => role.pilot !== true).map((role) => role.title);
    assert.deepEqual(pilotTitles.sort(), titles.slice().sort());
    assert.equal(pilotTitles.length, 4);
    assert.deepEqual(cardTitles, ['Featured Card 1', 'Featured Card 2', 'Featured Card 3']);
    assert.equal(cardTitles.includes('Featured Card 4'), false);
    assert.equal(JSON.stringify(eastBoard).includes('Harbor West One'), false);

    const westRun = run(west, ['--brief=Harbor West One', '--stage-type=seed'], { allowReal: true });
    const westOut = readJson(westRun, 'west');
    assert.equal(westRun.status, 0);
    assert.deepEqual(westOut.pilots, ['Harbor West One']);
    const westBoard = board(west);
    assert.equal(JSON.stringify(westBoard).includes('Harbor East'), false);
    assert.equal(JSON.stringify(westBoard).includes('Featured Card'), false);
    const eastAfter = board(east);
    assert.equal(eastAfter.roles.filter((role) => role.pilot === true).length, 4);
    assert.equal(JSON.stringify(eastAfter).includes('Harbor West One'), false);
    assert.deepEqual(snapshot(CHECKOUT_BOARD), checkoutBefore);
  });
});
