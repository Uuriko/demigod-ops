import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-heavy-cleanup-pass.mjs');
const HOME_SHOTS = '/home/potter/audit-shots/cleanup';
const OPS_SHOTS = path.join(OPS, 'audit-shots', 'cleanup');
const HOME_NEW = '/home/potter/audit-shots/heavy-cleanup';
const OPS_NEW = path.join(OPS, 'audit-shots', 'heavy-cleanup');
const SHARED = [
  '/home/potter/DEMIGOD-HEAVY-CLEANUP.json',
  path.join(OPS, 'DEMIGOD-HEAVY-CLEANUP.json'),
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

function tmpReports() {
  return fs.readdirSync('/tmp').filter((name) => name.startsWith('demigod-heavy-cleanup-') || name.startsWith('DEMIGOD-HEAVY-CLEANUP')).sort();
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-HEAVY-CLEANUP.json');
}

function plant(dir, phrase, html) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v75-core\n`);
  fs.writeFileSync(path.join(dir, 'demigod-heavy-cleanup-source.html'), `${phrase}\n${html}\n`);
}

function goodHtml() {
  return [
    '<h1>Hire talent</h1>',
    '<p>Join the network</p>',
    '<p>hello@</p>',
  ].join('\n');
}

function badHtml() {
  return [
    '<p>Welcome to the pantheon</p>',
    '<p>METHODOLOGY</p>',
    '<div id="tally-startup-embed"></div>',
  ].join('\n');
}

describe('heavy cleanup', { concurrency: 1 }, () => {
  test('a cleanup stays in that data root', async (t) => {
    const cwdDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-clean-cwd-'));
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-clean-bad-'));
    const leak = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-clean-leak-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-clean-out-'));
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-clean-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-clean-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    const homeOldBefore = shotNames(HOME_SHOTS);
    const opsOldBefore = shotNames(OPS_SHOTS);
    const homeNewBefore = shotNames(HOME_NEW);
    const opsNewBefore = shotNames(OPS_NEW);
    const tmpBefore = tmpReports();
    const outsideFile = path.join(outside, 'source.html');
    fs.writeFileSync(outsideFile, 'Outside keep secret\nSYNDICATE SUBSCRIPTION\n');
    const outsideBefore = snapshot(outsideFile);
    t.after(() => {
      fs.rmSync(cwdDir, { recursive: true, force: true });
      fs.rmSync(bad, { recursive: true, force: true });
      fs.rmSync(leak, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const src = fs.readFileSync(CLI, 'utf8');
    assert.equal(src.includes("from 'puppeteer-core'"), false);
    assert.equal(src.includes('cdp-config.mjs'), false);
    assert.equal(src.includes('demigod-turn-lib'), false);
    assert.equal(src.includes('demigod-live-lib'), false);
    assert.equal(src.includes('fetchLiveHtml'), false);
    assert.equal(src.includes('submitWebflowAiPrompt'), false);
    assert.equal(src.includes('spawnSync'), false);
    assert.equal(src.includes('process.cwd()'), false);
    assert.equal(src.includes('www.trydemigod.com'), false);
    assert.equal(src.includes('trydemigod.com'), false);
    assert.equal(src.includes('https://'), false);
    assert.equal(src.includes('/home/potter/audit-shots'), false);
    assert.equal(src.includes("path.join('/tmp'"), false);

    const unset = run(east, [], { DEMIGOD_ROOT: '' }, cwdDir);
    const unsetOut = readJson(unset, 'unset root');
    assert.equal(unset.status, 1);
    assert.equal(unsetOut.error, 'cleanup_root_required');
    assert.equal(unsetOut.liveFetch, false);
    assert.equal(unsetOut.aiSubmit, false);
    assert.equal(unsetOut.deleted, false);
    assert.equal(unsetOut.published, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(fs.existsSync(path.join(cwdDir, 'audit-shots')), false);
    assert.equal(fs.existsSync(reportFile(OPS)), false);

    const home = run('/home/potter', [], {}, cwdDir);
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'cleanup_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-HEAVY-CLEANUP.json'), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const checkout = run(OPS, [], {}, cwdDir);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'cleanup_root_required');
    assert.equal(fs.existsSync(reportFile(OPS)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const refused = run(east, ['--publish'], {}, cwdDir);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.published, false);
    assert.equal(refusedOut.deleted, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const live = run(east, ['--live'], {}, cwdDir);
    const liveOut = readJson(live, 'live');
    assert.equal(live.status, 1);
    assert.equal(liveOut.error, 'publish_refused');
    assert.equal(liveOut.liveFetch, false);
    assert.equal(liveOut.aiSubmit, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal((live.stdout + live.stderr).includes('https://'), false);
    assert.equal((live.stdout + live.stderr).includes('trydemigod.com'), false);

    const ai = run(east, ['--ai'], {}, cwdDir);
    const aiOut = readJson(ai, 'ai');
    assert.equal(ai.status, 1);
    assert.equal(aiOut.error, 'publish_refused');
    assert.equal(aiOut.aiSubmit, false);
    assert.equal(aiOut.deleted, false);
    assert.equal(fs.existsSync(reportFile(east)), false);

    const missing = run(east, [], {}, cwdDir);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(path.join(east, 'audit-shots')), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    fs.symlinkSync(outsideFile, path.join(leak, 'demigod-heavy-cleanup-source.html'));
    const linked = run(leak, [], {}, cwdDir);
    const linkedOut = readJson(linked, 'symlink source');
    assert.equal(linked.status, 1);
    assert.equal(linkedOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(leak)), false);
    assert.equal((linked.stdout + linked.stderr).includes('Outside keep secret'), false);
    assert.deepEqual(snapshot(outsideFile), outsideBefore);

    plant(bad, 'Harbor Bad keep', badHtml());
    const badRun = run(bad, [], {}, cwdDir);
    assert.equal(badRun.status, 1, `leaky source should fail\n${badRun.stdout}\n${badRun.stderr}`);
    const badOut = readJson(badRun, 'bad');
    assert.equal(badOut.ok, false);
    assert.equal(badOut.path, reportFile(bad));
    assert.equal(badOut.path.includes(cwdDir), false);
    assert.equal(badOut.path.includes('/home/potter'), false);
    assert.equal(badOut.source, 'disk');
    assert.equal(badOut.clean, false);
    assert.equal(badOut.found, 3);
    assert.equal(badOut.leaks.includes('pantheon'), true);
    assert.equal(badOut.leaks.includes('METHODOLOGY'), true);
    assert.equal(badOut.leaks.includes('tally-startup-embed'), true);
    assert.equal(badOut.deleted, false);
    assert.equal(badOut.published, false);
    assert.equal(badOut.aiSubmit, false);
    assert.equal(badOut.liveFetch, false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(fs.existsSync(path.join(bad, 'audit-shots', 'cleanup')), false);
    const badStored = JSON.parse(fs.readFileSync(reportFile(bad), 'utf8'));
    assert.equal(badStored.ok, false);
    assert.equal(badStored.deleted, false);
    assert.equal(badStored.published, false);

    plant(east, 'Harbor East keep', goodHtml());
    const eastRun = run(east, [], {}, cwdDir);
    assert.equal(eastRun.status, 0, `east cleanup failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/'), false);
    assert.equal(eastOut.path.includes(cwdDir), false);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.found, 0);
    assert.equal(eastOut.clean, true);
    assert.equal(eastOut.htmlLen > 0, true);
    assert.equal(eastOut.deleted, false);
    assert.equal(eastOut.published, false);
    assert.equal(eastOut.aiSubmit, false);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(fs.existsSync(path.join(east, 'audit-shots', 'cleanup')), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('https://'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('Outside keep secret'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.clean, true);
    assert.equal(stored.deleted, false);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastShot = fs.readFileSync(path.join(east, 'audit-shots', 'heavy-cleanup', 'source.shot'), 'utf8');
    assert.equal(eastShot.includes('Harbor East keep'), true);
    assert.equal(eastShot.includes('clean'), true);
    const eastBytes = snapshot(reportFile(east));

    plant(west, 'Harbor West keep', goodHtml());
    const westRun = run(west, [], {}, OPS);
    assert.equal(westRun.status, 0, `west cleanup failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(westOut.path.includes(OPS), false);
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    const westStored = JSON.parse(fs.readFileSync(reportFile(west), 'utf8'));
    assert.equal(westStored.footMarker, 'Harbor West keep');
    assert.equal(JSON.stringify(westStored).includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);
    assert.equal(fs.existsSync(reportFile(OPS)), false);
    assert.equal(fs.existsSync(path.join(OPS, 'audit-shots', 'heavy-cleanup', 'source.shot')), false);
    assert.equal(fs.existsSync(path.join(OPS, 'audit-shots', 'cleanup')), false);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
    assert.deepEqual(shotNames(HOME_SHOTS), homeOldBefore);
    assert.deepEqual(shotNames(OPS_SHOTS), opsOldBefore);
    assert.deepEqual(shotNames(HOME_NEW), homeNewBefore);
    assert.deepEqual(shotNames(OPS_NEW), opsNewBefore);
    assert.deepEqual(tmpReports(), tmpBefore);
    assert.deepEqual(snapshot(outsideFile), outsideBefore);
  });
});
