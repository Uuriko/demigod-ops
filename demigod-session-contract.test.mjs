import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT = path.join(OPS, 'demigod-session-contract.mjs');
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-SESSION-CONTRACT.json');
const CHECKOUT_DIR = path.join(OPS, 'DEMIGOD-CONTRACTS');
const BUSY = '/tmp/dg-busy';

function run(dir, args, extraEnv = {}) {
  return spawnSync(process.execPath, [CONTRACT, ...args], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      ...extraEnv,
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

function busyContracts() {
  if (!fs.existsSync(BUSY)) return null;
  return fs.readdirSync(BUSY).filter((name) => name.startsWith('contract-')).sort();
}

function writeRoot(dir, note, version) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `/*__dgFootVer='${version}'*/\n/* ${note} */\nI'm hiring\n`);
}

function report(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-SESSION-CONTRACT.json'), 'utf8'));
}

describe('session contract report', { concurrency: 1 }, () => {
  test('a session contract stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-contract-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-contract-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutBefore = snapshot(CHECKOUT_REPORT);
    const checkoutDirBefore = fs.existsSync(CHECKOUT_DIR);
    const busyBefore = busyContracts();
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const publish = run(east, ['scaffold', '--goal', 'Harbor East contract keep', '--publish'], {
      DG_LOCK_OWNER: 'harbor-east',
    });
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(publishOut.sent, false);
    assert.equal(publishOut.liveMail, false);
    assert.equal(publishOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-SESSION-CONTRACT.json')), false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-CONTRACTS')), false);
    assert.deepEqual(busyContracts(), busyBefore);

    writeRoot(east, 'Harbor East contract', 91);
    const eastRun = run(east, ['scaffold', '--goal', 'Harbor East contract keep'], {
      DG_LOCK_OWNER: 'harbor-east',
    });
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path.startsWith(path.join(east, 'DEMIGOD-CONTRACTS') + path.sep), true);
    assert.equal(eastOut.path.includes('/tmp/dg-busy'), false);
    assert.equal(eastOut.reportPath, path.join(east, 'DEMIGOD-SESSION-CONTRACT.json'));
    assert.equal(eastOut.diskFootVer, '91');
    assert.equal(eastOut.goal, 'Harbor East contract keep');
    assert.equal(eastOut.owner, 'harbor-east');
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(fs.existsSync(eastOut.path), true);
    assert.equal(report(east).diskFootVer, '91');
    assert.equal(JSON.stringify(report(east)).includes('Harbor West contract'), false);
    const eastBytes = snapshot(eastOut.path);
    const eastReportBytes = snapshot(path.join(east, 'DEMIGOD-SESSION-CONTRACT.json'));

    const eastBase = path.basename(eastOut.path);
    const eastValidate = run(east, ['validate', eastBase]);
    const eastValid = readJson(eastValidate, 'east-validate');
    assert.equal(eastValidate.status, 0);
    assert.equal(eastValid.ok, true);
    assert.equal(eastValid.contract.goal, 'Harbor East contract keep');

    const missing = run(west, ['validate', eastBase]);
    const missingOut = readJson(missing, 'west-missing');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'not_found');

    fs.writeFileSync(path.join(east, 'DEMIGOD-PUBLISH-FREEZE.json'), JSON.stringify({ on: true, why: 'HarborEastFreeze' }));
    fs.writeFileSync(path.join(east, 'foot-touch.json'), JSON.stringify({
      goal: 'Harbor East foot touch keep',
      owner: 'harbor-east',
      touch: ['demigod-foot-core.js'],
      verify: ['node demigod-preflight.mjs --quick'],
      stop: 'preflight green',
      allowShip: false,
    }));
    const frozen = run(east, ['validate', path.join(east, 'foot-touch.json')]);
    const frozenOut = readJson(frozen, 'frozen');
    assert.equal(frozen.status, 1);
    assert.equal(frozenOut.ok, false);
    assert.equal(frozenOut.issues.includes('publish_frozen_but_contract_touches_foot'), true);

    writeRoot(west, 'Harbor West contract', 92);
    fs.writeFileSync(path.join(west, 'DEMIGOD-PUBLISH-FREEZE.json'), JSON.stringify({ on: false, why: 'HarborWestFreeze' }));
    fs.writeFileSync(path.join(west, 'foot-touch.json'), JSON.stringify({
      goal: 'Harbor West foot touch keep',
      owner: 'harbor-west',
      touch: ['demigod-foot-core.js'],
      verify: ['node demigod-preflight.mjs --quick'],
      stop: 'preflight green',
      allowShip: false,
    }));
    const open = run(west, ['validate', path.join(west, 'foot-touch.json')]);
    const openOut = readJson(open, 'open');
    assert.equal(open.status, 0);
    assert.equal(openOut.ok, true);
    assert.equal(openOut.issues.includes('publish_frozen_but_contract_touches_foot'), false);
    assert.equal(openOut.diskFootVer, '92');

    const westRun = run(west, ['scaffold', '--goal', 'Harbor West contract keep'], {
      DG_LOCK_OWNER: 'harbor-west',
    });
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path.startsWith(path.join(west, 'DEMIGOD-CONTRACTS') + path.sep), true);
    assert.equal(westOut.diskFootVer, '92');
    assert.equal(westOut.goal, 'Harbor West contract keep');
    assert.equal(JSON.stringify(report(west)).includes('Harbor East contract'), false);
    assert.equal(report(east).diskFootVer, '91');
    assert.deepEqual(snapshot(eastOut.path), eastBytes);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-SESSION-CONTRACT.json')), eastReportBytes);
    assert.deepEqual(snapshot(CHECKOUT_REPORT), checkoutBefore);
    assert.equal(fs.existsSync(CHECKOUT_DIR), checkoutDirBefore);
    assert.deepEqual(busyContracts(), busyBefore);
  });
});
