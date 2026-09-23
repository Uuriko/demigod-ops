import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-designer-resize.mjs');
const HOME_SHOTS = '/home/potter/audit-shots/designer-resize';
const OPS_SHOTS = path.join(OPS, 'audit-shots', 'designer-resize');
const SHARED = [
  '/home/potter/DEMIGOD-DESIGNER-RESIZE.json',
  path.join(OPS, 'DEMIGOD-DESIGNER-RESIZE.json'),
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
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

function shotNames(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : null;
}

function tmpReports() {
  return fs.readdirSync('/tmp').filter((name) => name.startsWith('demigod-designer-resize-')).sort();
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-DESIGNER-RESIZE.json');
}

function plant(dir, phrase, width, height) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v75-core\n`);
  fs.writeFileSync(path.join(dir, 'demigod-designer-resize-source.json'), JSON.stringify({ width, height }));
}

describe('designer resize', { concurrency: 1 }, () => {
  test('a resize record stays in that data root', async (t) => {
    const cwdDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-resize-cwd-'));
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-resize-bad-'));
    const leak = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-resize-leak-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-resize-out-'));
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-resize-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-resize-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    const homeShotsBefore = shotNames(HOME_SHOTS);
    const opsShotsBefore = shotNames(OPS_SHOTS);
    const tmpBefore = tmpReports();
    const outsideFile = path.join(outside, 'view.json');
    fs.writeFileSync(outsideFile, JSON.stringify({ width: 1440, height: 900, note: 'Outside keep secret' }));
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
    assert.equal(src.includes('collab-lib'), false);
    assert.equal(src.includes('demigod-turn-lib'), false);
    assert.equal(src.includes('prepareWebflowDesigner'), false);
    assert.equal(src.includes('captureDemigodScreenshots'), false);
    assert.equal(src.includes("from 'puppeteer-core'"), false);
    assert.equal(src.includes("from 'playwright'"), false);
    assert.equal(src.includes('process.cwd()'), false);
    assert.equal(src.includes('www.trydemigod.com'), false);
    assert.equal(src.includes('https://'), false);
    assert.equal(src.includes('/home/potter/audit-shots'), false);
    assert.equal(src.includes("path.join('/tmp'"), false);

    const unset = run(east, [], { DEMIGOD_ROOT: '' }, cwdDir);
    const unsetOut = readJson(unset, 'unset root');
    assert.equal(unset.status, 1);
    assert.equal(unsetOut.error, 'resize_root_required');
    assert.equal(unsetOut.resized, false);
    assert.equal(unsetOut.designerOpen, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal(fs.existsSync(path.join(cwdDir, 'audit-shots')), false);
    assert.equal(fs.existsSync(reportFile(OPS)), false);

    const home = run('/home/potter', [], {}, cwdDir);
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'resize_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-DESIGNER-RESIZE.json'), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const checkout = run(OPS, [], {}, cwdDir);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'resize_root_required');
    assert.equal(fs.existsSync(reportFile(OPS)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const refused = run(east, ['--publish'], {}, cwdDir);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.resized, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    const designer = run(east, ['--designer'], {}, cwdDir);
    const designerOut = readJson(designer, 'designer');
    assert.equal(designer.status, 1);
    assert.equal(designerOut.error, 'publish_refused');
    assert.equal(designerOut.designerOpen, false);
    assert.equal(designerOut.resized, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal((designer.stdout + designer.stderr).includes('https://'), false);

    const missing = run(east, [], {}, cwdDir);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(path.join(east, 'audit-shots')), false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);

    fs.writeFileSync(path.join(leak, 'demigod-foot-core.js'), '// Harbor Leak keep\ndg-foot-v75-core\n');
    fs.symlinkSync(outsideFile, path.join(leak, 'demigod-designer-resize-source.json'));
    const linked = run(leak, [], {}, cwdDir);
    assert.equal(linked.status, 1, `symlink viewport should fail closed\n${linked.stdout}\n${linked.stderr}`);
    const linkedOut = readJson(linked, 'symlink source');
    assert.equal(linkedOut.ok, false);
    assert.equal(linkedOut.resized, false);
    assert.equal(linkedOut.width, 0);
    assert.equal(linkedOut.tooSmall, true);
    assert.equal((linked.stdout + linked.stderr).includes('Outside keep secret'), false);
    const linkedStored = JSON.parse(fs.readFileSync(reportFile(leak), 'utf8'));
    assert.equal(JSON.stringify(linkedStored).includes('Outside keep secret'), false);
    assert.deepEqual(snapshot(outsideFile), outsideBefore);

    plant(bad, 'Harbor Bad keep', 800, 600);
    const badRun = run(bad, [], {}, cwdDir);
    assert.equal(badRun.status, 1, `small viewport should fail\n${badRun.stdout}\n${badRun.stderr}`);
    const badOut = readJson(badRun, 'bad');
    assert.equal(badOut.ok, false);
    assert.equal(badOut.path, reportFile(bad));
    assert.equal(badOut.path.includes(cwdDir), false);
    assert.equal(badOut.path.includes('/home/potter'), false);
    assert.equal(badOut.source, 'disk');
    assert.equal(badOut.width, 800);
    assert.equal(badOut.height, 600);
    assert.equal(badOut.tooSmall, true);
    assert.equal(badOut.resized, false);
    assert.equal(badOut.designerOpen, false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    const badStored = JSON.parse(fs.readFileSync(reportFile(bad), 'utf8'));
    assert.equal(badStored.ok, false);
    assert.equal(badStored.resized, false);

    plant(east, 'Harbor East keep', 1440, 900);
    const eastRun = run(east, [], {}, cwdDir);
    assert.equal(eastRun.status, 0, `east resize failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/'), false);
    assert.equal(eastOut.path.includes(cwdDir), false);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.width, 1440);
    assert.equal(eastOut.height, 900);
    assert.equal(eastOut.tooSmall, false);
    assert.equal(eastOut.resized, false);
    assert.equal(eastOut.designerOpen, false);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(fs.existsSync(reportFile(cwdDir)), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('https://'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('Outside keep secret'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.width, 1440);
    assert.equal(stored.resized, false);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastShot = fs.readFileSync(path.join(east, 'audit-shots', 'designer-resize', 'canvas.shot'), 'utf8');
    assert.equal(eastShot.includes('Harbor East keep'), true);
    assert.equal(eastShot.includes('1440x900'), true);
    const eastBytes = snapshot(reportFile(east));

    plant(west, 'Harbor West keep', 1600, 1000);
    const westRun = run(west, [], {}, OPS);
    assert.equal(westRun.status, 0, `west resize failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(westOut.width, 1600);
    assert.equal(westOut.path.includes(OPS), false);
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    assert.equal(westOut.width === 1440, false);
    const westStored = JSON.parse(fs.readFileSync(reportFile(west), 'utf8'));
    assert.equal(westStored.footMarker, 'Harbor West keep');
    assert.equal(westStored.width, 1600);
    assert.equal(JSON.stringify(westStored).includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);
    assert.equal(fs.existsSync(reportFile(OPS)), false);
    assert.equal(fs.existsSync(path.join(OPS, 'audit-shots', 'designer-resize', 'canvas.shot')), false);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
    assert.deepEqual(shotNames(HOME_SHOTS), homeShotsBefore);
    assert.deepEqual(shotNames(OPS_SHOTS), opsShotsBefore);
    assert.deepEqual(tmpReports(), tmpBefore);
    assert.deepEqual(snapshot(outsideFile), outsideBefore);
  });
});
