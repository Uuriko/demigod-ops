import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-cdp-wiz-audit.mjs');
const HOME_SHOTS = '/home/potter/audit-shots/cdp-wiz-audit';
const OPS_SHOTS = path.join(OPS, 'audit-shots', 'cdp-wiz-audit');
const SHARED = [
  '/home/potter/DEMIGOD-CDP-WIZ-AUDIT.json',
  path.join(OPS, 'DEMIGOD-CDP-WIZ-AUDIT.json'),
  path.join(OPS, 'demigod-wiz-cdp-playtest.mjs'),
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
  try {
    const st = fs.lstatSync(file);
    if (st.isSymbolicLink()) return `link:${fs.readlinkSync(file)}`;
    return fs.readFileSync(file);
  } catch {
    return null;
  }
}

function shotNames(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : null;
}

function tmpReports() {
  return fs.readdirSync('/tmp').filter((name) => name.startsWith('demigod-cdp-wiz') || name.startsWith('DEMIGOD-CDP-WIZ')).sort();
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-CDP-WIZ-AUDIT.json');
}

function plant(dir, phrase, body) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v75-core\n`);
  fs.writeFileSync(path.join(dir, 'HEAVY-CDP-WIZ-AUDIT-SOURCE.md'), `${phrase}\n${body}\n`);
}

function goodBody() {
  return [
    'WIZ notes stay local.',
    'VIS stays on disk.',
    'REVIEW stays planted.',
    'SCROLL stays local.',
    'LOCAL check stays local.',
  ].join('\n');
}

describe('cdp wiz audit', { concurrency: 1 }, () => {
  test('a wizard audit record stays in that data root', async (t) => {
    const cwdDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-cwa-cwd-'));
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-cwa-bad-'));
    const leak = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-cwa-leak-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-cwa-out-'));
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-cwa-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-cwa-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    const homeShotsBefore = shotNames(HOME_SHOTS);
    const opsShotsBefore = shotNames(OPS_SHOTS);
    const tmpBefore = tmpReports();
    const outsideFile = path.join(outside, 'notes.md');
    fs.writeFileSync(outsideFile, 'Outside keep secret\nWIZ VIS REVIEW SCROLL LOCAL\n');
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
    assert.equal(src.includes('puppeteer'), false);
    assert.equal(src.includes('playwright'), false);
    assert.equal(src.includes('cdp-config.mjs'), false);
    assert.equal(src.includes('connectBrowser'), false);
    assert.equal(src.includes('collab-lib'), false);
    assert.equal(src.includes('demigod-turn-lib'), false);
    assert.equal(src.includes('demigod-wiz-cdp-playtest'), false);
    assert.equal(src.includes('fetchLiveHtml'), false);
    assert.equal(src.includes('sendToGrok'), false);
    assert.equal(src.includes('spawnSync'), false);
    assert.equal(src.includes('execSync'), false);
    assert.equal(src.includes('child_process'), false);
    assert.equal(src.includes('pgrep'), false);
    assert.equal(src.includes('process.cwd()'), false);
    assert.equal(src.includes('www.trydemigod.com'), false);
    assert.equal(src.includes('trydemigod.com'), false);
    assert.equal(src.includes('grok.com'), false);
    assert.equal(src.includes('https://'), false);
    assert.equal(src.includes('/home/potter/audit-shots'), false);
    assert.equal(src.includes("path.join('/tmp'"), false);
    assert.equal(src.split('function scriptDir')[0].includes('readFileSync'), false);

    const unset = run(east, [], { DEMIGOD_ROOT: '' }, cwdDir);
    const unsetOut = readJson(unset, 'unset root');
    assert.equal(unset.status, 1);
    assert.equal(unsetOut.error, 'wiz_root_required');
    assert.equal(unsetOut.sent, false);
    assert.equal(unsetOut.livePublish, false);
    assert.equal(unsetOut.liveFetch, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(fs.existsSync(path.join(cwdDir, 'audit-shots')), false);
    assert.equal(fs.existsSync(reportFile(OPS)), false);

    const home = run('/home/potter', [], {}, cwdDir);
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'wiz_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-CDP-WIZ-AUDIT.json'), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const checkout = run(OPS, [], {}, cwdDir);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'wiz_root_required');
    assert.equal(fs.existsSync(reportFile(OPS)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const refused = run(east, ['--publish'], {}, cwdDir);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.livePublish, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const local = run(east, ['--local'], {}, cwdDir);
    const localOut = readJson(local, 'local');
    assert.equal(local.status, 1);
    assert.equal(localOut.error, 'publish_refused');
    assert.equal(localOut.liveFetch, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal((local.stdout + local.stderr).includes('playtest'), false);
    assert.equal((local.stdout + local.stderr).includes('https://'), false);

    const cdp = run(east, ['--cdp'], {}, cwdDir);
    const cdpOut = readJson(cdp, 'cdp');
    assert.equal(cdp.status, 1);
    assert.equal(cdpOut.error, 'publish_refused');
    assert.equal(cdpOut.liveFetch, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal((cdp.stdout + cdp.stderr).includes('trydemigod.com'), false);

    const missing = run(east, [], {}, cwdDir);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(path.join(east, 'audit-shots')), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    fs.symlinkSync(outsideFile, path.join(leak, 'HEAVY-CDP-WIZ-AUDIT-SOURCE.md'));
    const linked = run(leak, [], {}, cwdDir);
    const linkedOut = readJson(linked, 'symlink notes');
    assert.equal(linked.status, 1);
    assert.equal(linkedOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(leak)), false);
    assert.equal((linked.stdout + linked.stderr).includes('Outside keep secret'), false);
    assert.deepEqual(snapshot(outsideFile), outsideBefore);

    plant(bad, 'Harbor Bad keep', 'WIZ notes only.');
    const badRun = run(bad, [], {}, cwdDir);
    assert.equal(badRun.status, 1, `thin notes should fail\n${badRun.stdout}\n${badRun.stderr}`);
    const badOut = readJson(badRun, 'bad');
    assert.equal(badOut.ok, false);
    assert.equal(badOut.path, reportFile(bad));
    assert.equal(badOut.path.includes(cwdDir), false);
    assert.equal(badOut.path.includes('/home/potter'), false);
    assert.equal(badOut.source, 'disk');
    assert.equal(badOut.missing > 0, true);
    assert.equal(badOut.sent, false);
    assert.equal(badOut.liveFetch, false);
    assert.equal(badOut.livePublish, false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    const badStored = JSON.parse(fs.readFileSync(reportFile(bad), 'utf8'));
    assert.equal(badStored.ok, false);
    assert.equal(badStored.liveFetch, false);
    assert.equal(badStored.livePublish, false);
    assert.equal(badStored.missing.includes('VIS'), true);
    assert.equal(badStored.missing.includes('REVIEW'), true);
    assert.equal(badStored.missing.includes('SCROLL'), true);
    assert.equal(badStored.missing.includes('LOCAL'), true);

    plant(east, 'Harbor East keep', goodBody());
    const eastRun = run(east, [], {}, cwdDir);
    assert.equal(eastRun.status, 0, `east wiz failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/'), false);
    assert.equal(eastOut.path.includes(cwdDir), false);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.missing, 0);
    assert.equal(eastOut.chars > 0, true);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('https://'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('trydemigod.com'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('Outside keep secret'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.liveFetch, false);
    assert.equal(stored.livePublish, false);
    assert.equal(stored.markers.WIZ, true);
    assert.equal(stored.markers.VIS, true);
    assert.equal(stored.markers.REVIEW, true);
    assert.equal(stored.markers.SCROLL, true);
    assert.equal(stored.markers.LOCAL, true);
    assert.equal(stored.excerpt.includes('Harbor East keep'), true);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastShot = fs.readFileSync(path.join(east, 'audit-shots', 'cdp-wiz-audit', 'audit.shot'), 'utf8');
    assert.equal(eastShot.includes('Harbor East keep'), true);
    assert.equal(eastShot.includes('complete'), true);
    const eastBytes = snapshot(reportFile(east));

    plant(west, 'Harbor West keep', goodBody());
    const westRun = run(west, [], {}, OPS);
    assert.equal(westRun.status, 0, `west wiz failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(westOut.path.includes(OPS), false);
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    const westStored = JSON.parse(fs.readFileSync(reportFile(west), 'utf8'));
    assert.equal(westStored.footMarker, 'Harbor West keep');
    assert.equal(westStored.excerpt.includes('Harbor West keep'), true);
    assert.equal(JSON.stringify(westStored).includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);
    assert.equal(fs.existsSync(reportFile(OPS)), false);
    assert.equal(fs.existsSync(path.join(OPS, 'audit-shots', 'cdp-wiz-audit', 'audit.shot')), false);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
    assert.deepEqual(shotNames(HOME_SHOTS), homeShotsBefore);
    assert.deepEqual(shotNames(OPS_SHOTS), opsShotsBefore);
    assert.deepEqual(tmpReports(), tmpBefore);
    assert.deepEqual(snapshot(outsideFile), outsideBefore);
  });
});
