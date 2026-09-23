import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const HANDLER = path.join(OPS, 'demigod-sms-handler.mjs');
const CHECKOUT_BOARD = path.join(OPS, 'DEMIGOD-BOARD.json');
const MINA = '+14155550111';
const SAM = '+14155550122';

function run(dir, preload, args) {
  const env = { ...process.env, DEMIGOD_ROOT: dir };
  delete env.DEMIGOD_ALLOW_REAL_ROLES;
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, HANDLER, ...args], {
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

function writeBoard(dir, company) {
  fs.writeFileSync(path.join(dir, 'DEMIGOD-BOARD.json'), JSON.stringify({
    roles: [{
      id: `role-${company.toLowerCase().replace(/\s+/g, '-')}`,
      title: 'Founding Engineer',
      company,
      skills: 'react',
      status: 'Active',
      stageType: 'seed',
      sample: true,
    }],
    candidates: [],
    pilots: [],
  }, null, 2));
}

function board(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-BOARD.json'), 'utf8'));
}

function snapshot(file) {
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

describe('SMS opt-in', { concurrency: 1 }, () => {
  test('a named yes stays on that board', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-sms-optin-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-sms-optin-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const flag = path.join(east, 'fetch-calls.log');
    const preload = path.join(east, 'no-live-pay.mjs');
    fs.writeFileSync(preload, `import fs from 'node:fs';
globalThis.fetch = async () => {
  fs.appendFileSync(${JSON.stringify(flag)}, 'fetch\\n');
  throw new Error('live_payment');
};
`);
    const checkoutBefore = snapshot(CHECKOUT_BOARD);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    writeBoard(east, 'Harbor East');
    writeBoard(west, 'Harbor West');
    const eastBefore = fs.readFileSync(path.join(east, 'DEMIGOD-BOARD.json'));
    const westBefore = fs.readFileSync(path.join(west, 'DEMIGOD-BOARD.json'));

    const missing = readJson(run(east, preload, ['--body=yes Founding Engineer']), 'missing sender');
    assert.equal(missing.ok, false);
    assert.equal(missing.error, 'sender_required');
    assert.equal(missing.sent, false);
    assert.equal(missing.liveSms, false);
    assert.equal(missing.liveMail, false);
    assert.deepEqual(fs.readFileSync(path.join(east, 'DEMIGOD-BOARD.json')), eastBefore);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-SUBMISSIONS-INBOX.json')), false);

    const eastRun = run(east, preload, [`--from=${MINA}`, '--body=yes Founding Engineer']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.phone, MINA);
    assert.equal(eastOut.pilotBrief, 'Founding Engineer');
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveSms, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(fs.existsSync(flag), false);

    const eastBoard = board(east);
    assert.equal(eastBoard.roles.length, 1);
    assert.equal(eastBoard.roles[0].company, 'Harbor East');
    assert.equal(eastBoard.roles[0].pilot, undefined);
    const eastPilots = eastBoard.pilots.filter((row) => row.phone === MINA);
    assert.equal(eastPilots.length, 1);
    assert.equal(eastPilots[0].brief, 'Founding Engineer');
    assert.equal(eastPilots[0].status, 'opted-in');
    assert.equal(eastPilots[0].introsSent, 0);
    assert.equal(eastPilots[0].sent, false);
    assert.equal(eastPilots[0].liveSms, false);
    assert.equal(JSON.stringify(eastBoard).includes(SAM), false);
    assert.deepEqual(fs.readFileSync(path.join(west, 'DEMIGOD-BOARD.json')), westBefore);

    const again = readJson(run(east, preload, [`--from=${MINA}`, '--body=yes Founding Engineer']), 'again');
    assert.equal(again.ok, true);
    assert.equal(again.pilotBrief, 'Founding Engineer');
    assert.equal(board(east).pilots.filter((row) => row.phone === MINA && row.brief === 'Founding Engineer').length, 1);

    const westRun = run(west, preload, [`--from=${SAM}`, '--body=yes Founding Engineer']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westRun.status, 0);
    assert.equal(westOut.phone, SAM);
    assert.equal(westOut.pilotBrief, 'Founding Engineer');
    const westBoard = board(west);
    assert.equal(westBoard.roles[0].company, 'Harbor West');
    assert.equal(westBoard.pilots.length, 1);
    assert.equal(westBoard.pilots[0].phone, SAM);
    assert.equal(westBoard.pilots[0].brief, 'Founding Engineer');
    assert.equal(JSON.stringify(westBoard).includes(MINA), false);
    const eastAfter = board(east);
    assert.equal(eastAfter.pilots.filter((row) => row.phone === MINA).length, 1);
    assert.equal(JSON.stringify(eastAfter).includes(SAM), false);
    assert.deepEqual(snapshot(CHECKOUT_BOARD), checkoutBefore);
  });
});
