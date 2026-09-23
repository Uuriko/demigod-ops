import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-gtm-asset-gen.mjs');
const HOME_SHOTS = '/home/potter/audit-shots/gtm-asset';
const OPS_SHOTS = path.join(OPS, 'audit-shots', 'gtm-asset');
const SHARED = [
  '/home/potter/DEMIGOD-GTM-ASSET.json',
  '/home/potter/DEMIGOD-BOARD.json',
  path.join(OPS, 'DEMIGOD-GTM-ASSET.json'),
  path.join(OPS, 'DEMIGOD-BOARD.json'),
];

function run(dir, args = [], extraEnv = {}, cwd = OPS) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      DEMIGOD_LIVE: 'http://127.0.0.1:9',
      CDP_URL: 'http://127.0.0.1:9',
      DEMIGOD_DASH: 'http://127.0.0.1:9',
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
  if (!fs.existsSync(file)) return null;
  const st = fs.lstatSync(file);
  if (st.isSymbolicLink()) return `link:${fs.readlinkSync(file)}`;
  return fs.readFileSync(file);
}

function shotNames(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : null;
}

function proofNames(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.startsWith('gtm-proof')).sort();
}

function tmpReports() {
  return fs.readdirSync('/tmp').filter((name) => name.startsWith('demigod-gtm-asset-') || name.startsWith('gtm-proof')).sort();
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-GTM-ASSET.json');
}

function plantBoard(dir, phrase, title, sample, realRoles) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v75-core\n`);
  fs.writeFileSync(path.join(dir, 'DEMIGOD-BOARD.json'), JSON.stringify({
    roles: [{ id: 'role-local', title, sample }],
    receipts: [],
    signal: { realRoles, realReceipts: 0 },
  }));
}

describe('gtm asset', { concurrency: 1 }, () => {
  test('an asset stays in that data root', async (t) => {
    const cwdDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-gtm-cwd-'));
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-gtm-bad-'));
    const proved = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-gtm-proved-'));
    const leak = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-gtm-leak-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-gtm-out-'));
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-gtm-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-gtm-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    const homeShotsBefore = shotNames(HOME_SHOTS);
    const opsShotsBefore = shotNames(OPS_SHOTS);
    const tmpBefore = tmpReports();
    const outsideFile = path.join(outside, 'board.json');
    fs.writeFileSync(outsideFile, JSON.stringify({
      roles: [{ title: 'Outside keep secret', sample: false }],
      signal: { realRoles: 1, realReceipts: 0 },
    }));
    const outsideBefore = snapshot(outsideFile);
    t.after(() => {
      fs.rmSync(cwdDir, { recursive: true, force: true });
      fs.rmSync(bad, { recursive: true, force: true });
      fs.rmSync(proved, { recursive: true, force: true });
      fs.rmSync(leak, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const src = fs.readFileSync(CLI, 'utf8');
    assert.equal(src.includes('puppeteer'), false);
    assert.equal(src.includes('execSync'), false);
    assert.equal(src.includes('demigod-verify-board-honesty'), false);
    assert.equal(src.includes('demigod-turn-lib'), false);
    assert.equal(src.includes('demigod-live-lib'), false);
    assert.equal(src.includes('process.cwd()'), false);
    assert.equal(src.includes('www.trydemigod.com'), false);
    assert.equal(src.includes('https://'), false);
    assert.equal(src.includes('/home/potter/audit-shots'), false);
    assert.equal(src.includes("path.join('/tmp'"), false);
    assert.equal(src.includes('gtm-proof-'), false);

    const unset = run(east, [], { DEMIGOD_ROOT: '' }, cwdDir);
    const unsetOut = readJson(unset, 'unset root');
    assert.equal(unset.status, 1);
    assert.equal(unsetOut.error, 'gtm_root_required');
    assert.equal(unsetOut.liveFetch, false);
    assert.equal(unsetOut.sent, false);
    assert.equal(unsetOut.attached, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(proofNames(cwdDir).length, 0);
    assert.equal(fs.existsSync(reportFile(OPS)), false);

    const home = run('/home/potter', [], {}, cwdDir);
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'gtm_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-GTM-ASSET.json'), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(proofNames(cwdDir).length, 0);

    const checkout = run(OPS, [], {}, cwdDir);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'gtm_root_required');
    assert.equal(fs.existsSync(reportFile(OPS)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const refused = run(east, ['--publish'], {}, cwdDir);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.sent, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(proofNames(cwdDir).length, 0);

    const live = run(east, ['--live'], {}, cwdDir);
    const liveOut = readJson(live, 'live');
    assert.equal(live.status, 1);
    assert.equal(liveOut.error, 'publish_refused');
    assert.equal(liveOut.liveFetch, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal((live.stdout + live.stderr).includes('www.trydemigod.com'), false);
    assert.equal((live.stdout + live.stderr).includes('https://'), false);

    const mailed = run(east, ['--mail'], {}, cwdDir);
    const mailedOut = readJson(mailed, 'mail');
    assert.equal(mailed.status, 1);
    assert.equal(mailedOut.error, 'publish_refused');
    assert.equal(mailedOut.sent, false);
    assert.equal(mailedOut.liveMail, false);
    assert.equal(fs.existsSync(reportFile(east)), false);

    const missing = run(east, [], {}, cwdDir);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(path.join(east, 'audit-shots')), false);
    assert.equal(proofNames(cwdDir).length, 0);

    fs.symlinkSync(outsideFile, path.join(leak, 'DEMIGOD-BOARD.json'));
    const linked = run(leak, [], {}, cwdDir);
    const linkedOut = readJson(linked, 'symlink board');
    assert.equal(linked.status, 1);
    assert.equal(linkedOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(leak)), false);
    assert.equal((linked.stdout + linked.stderr).includes('Outside keep secret'), false);
    assert.deepEqual(snapshot(outsideFile), outsideBefore);

    plantBoard(bad, 'Harbor Bad keep', 'Unproved role', false, 1);
    const badRun = run(bad, [], {}, cwdDir);
    assert.equal(badRun.status, 1, `unproved asset should fail\n${badRun.stdout}\n${badRun.stderr}`);
    const badOut = readJson(badRun, 'bad');
    assert.equal(badOut.ok, false);
    assert.equal(badOut.path, reportFile(bad));
    assert.equal(badOut.path.includes(cwdDir), false);
    assert.equal(badOut.path.includes('/home/potter'), false);
    assert.equal(badOut.source, 'disk');
    assert.equal(badOut.realRoles, 1);
    assert.equal(badOut.honest, true);
    assert.equal(badOut.proof, false);
    assert.equal(badOut.sent, false);
    assert.equal(badOut.liveFetch, false);
    assert.equal(badOut.attached, false);
    assert.equal(proofNames(bad).length, 0);
    assert.equal(proofNames(cwdDir).length, 0);
    const badStored = JSON.parse(fs.readFileSync(reportFile(bad), 'utf8'));
    assert.equal(badStored.ok, false);
    assert.equal(badStored.sent, false);
    assert.equal(badStored.note.includes('hello@'), true);

    plantBoard(proved, 'Harbor Proved keep', 'Proved role', false, 1);
    fs.writeFileSync(path.join(proved, 'demigod-gtm-proof.txt'), 'Harbor Proved keep\nlocal proof\n');
    const provedRun = run(proved, [], {}, cwdDir);
    assert.equal(provedRun.status, 0, `proved asset failed\n${provedRun.stdout}\n${provedRun.stderr}`);
    const provedOut = readJson(provedRun, 'proved');
    assert.equal(provedOut.ok, true);
    assert.equal(provedOut.realRoles, 1);
    assert.equal(provedOut.proof, true);
    assert.equal(provedOut.sent, false);
    assert.equal(provedOut.liveMail, false);
    assert.equal(provedOut.attached, false);
    assert.equal(proofNames(proved).length, 0);

    plantBoard(east, 'Harbor East keep', 'East desk role', true, 0);
    const eastRun = run(east, [], {}, cwdDir);
    assert.equal(eastRun.status, 0, `east asset failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/'), false);
    assert.equal(eastOut.path.includes(cwdDir), false);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.roles, 1);
    assert.equal(eastOut.realRoles, 0);
    assert.equal(eastOut.realReceipts, 0);
    assert.equal(eastOut.title, 'East desk role');
    assert.equal(eastOut.honest, true);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(eastOut.attached, false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(proofNames(east).length, 0);
    assert.equal(proofNames(cwdDir).length, 0);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('https://'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('Outside keep secret'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.board.title, 'East desk role');
    assert.equal(stored.sent, false);
    assert.equal(stored.liveFetch, false);
    assert.equal(stored.files.length, 1);
    assert.equal(stored.files[0].includes(east), true);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    assert.equal(JSON.stringify(stored).includes('West desk role'), false);
    const eastShot = fs.readFileSync(path.join(east, 'audit-shots', 'gtm-asset', 'proof.shot'), 'utf8');
    assert.equal(eastShot.includes('Harbor East keep'), true);
    const eastBytes = snapshot(reportFile(east));
    const eastBoard = snapshot(path.join(east, 'DEMIGOD-BOARD.json'));

    plantBoard(west, 'Harbor West keep', 'West desk role', true, 0);
    const westRun = run(west, [], {}, OPS);
    assert.equal(westRun.status, 0, `west asset failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(westOut.title, 'West desk role');
    assert.equal(westOut.path.includes(OPS), false);
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    assert.equal(JSON.stringify(westOut).includes('East desk role'), false);
    const westStored = JSON.parse(fs.readFileSync(reportFile(west), 'utf8'));
    assert.equal(westStored.board.title, 'West desk role');
    assert.equal(JSON.stringify(westStored).includes('Harbor East keep'), false);
    assert.equal(JSON.stringify(westStored).includes('East desk role'), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-BOARD.json')), eastBoard);
    assert.equal(fs.existsSync(reportFile(OPS)), false);
    assert.equal(proofNames(OPS).length, 0);
    assert.equal(fs.existsSync(path.join(OPS, 'audit-shots', 'gtm-asset', 'proof.shot')), false);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
    assert.deepEqual(shotNames(HOME_SHOTS), homeShotsBefore);
    assert.deepEqual(shotNames(OPS_SHOTS), opsShotsBefore);
    assert.deepEqual(tmpReports(), tmpBefore);
    assert.deepEqual(proofNames(cwdDir), []);
    assert.deepEqual(snapshot(outsideFile), outsideBefore);
  });
});
