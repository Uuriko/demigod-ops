import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-loop-audit.mjs');
const SHARED = [
  '/home/potter/demigod-keep-going.md',
  '/home/potter/DEMIGOD-LOOP-AUDIT.json',
  path.join(OPS, 'demigod-keep-going.md'),
  path.join(OPS, 'DEMIGOD-LOOP-AUDIT.json'),
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

function plant(dir, phrase, version) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\n__dgFootVer='${version}'\ndg-foot-v${version}-core\n`);
  fs.writeFileSync(path.join(dir, 'demigod-loop-source.html'), [
    `<div id="startup-modal">`,
    `<div class="dg-wiz-review">first 90 days #C9A84C ${phrase}</div>`,
    `<form style="display:block"></form>`,
    `</div>`,
    `<div id="jobseeker-modal">`,
    `<div class="dg-wiz-review">${phrase} engineer review</div>`,
    `<form style="display:block"></form>`,
    `</div>`,
  ].join('\n'));
  fs.writeFileSync(path.join(dir, 'demigod-keep-going.md'), `prior ${phrase} note\n`);
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-LOOP-AUDIT.json');
}

describe('loop audit', { concurrency: 1 }, () => {
  test('a loop audit stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-loop-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-loop-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    const homeShots = '/home/potter/audit-shots';
    const homeShotsBefore = fs.existsSync(homeShots);
    t.after(() => {
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const src = fs.readFileSync(CLI, 'utf8');
    assert.equal(src.includes("from 'puppeteer-core'"), false);
    assert.equal(src.includes('cdp-config.mjs'), false);
    assert.equal(src.includes('/home/potter/audit-shots'), false);
    assert.equal(src.includes("'/home/potter/demigod-keep-going.md'"), false);

    const missing = run(east);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(missingOut.liveFetch, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal(fs.existsSync(path.join(east, 'demigod-keep-going.md')), false);

    const refused = run(east, ['--publish']);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.sent, false);
    assert.equal(refusedOut.liveMail, false);
    assert.equal(refusedOut.livePublish, false);
    assert.equal(refusedOut.liveFetch, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal((refused.stdout + refused.stderr).includes('www.trydemigod.com'), false);

    plant(east, 'Harbor East keep', '9');
    const plantedKeep = snapshot(path.join(east, 'demigod-keep-going.md'));
    const refusedPlanted = run(east, ['--publish']);
    assert.equal(refusedPlanted.status, 1);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.deepEqual(snapshot(path.join(east, 'demigod-keep-going.md')), plantedKeep);

    const eastRun = run(east);
    assert.equal(eastRun.status, 0, `east audit failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.issues, 0);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('puppeteer'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.startup.has90First, true);
    assert.equal(stored.startup.gold, true);
    assert.equal(stored.startup.formD, 'block');
    assert.equal(stored.startup.badTitle, false);
    assert.equal(stored.engineer.hasRev, true);
    assert.equal(stored.engineer.formD, 'block');
    assert.equal(stored.liveFetch, false);
    assert.equal(stored.shots.length, 0);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastKeep = fs.readFileSync(path.join(east, 'demigod-keep-going.md'), 'utf8');
    assert.equal(eastKeep.includes('prior Harbor East keep note'), true);
    assert.equal(eastKeep.includes('### Loop-audit'), true);
    assert.equal(eastKeep.includes('Harbor East keep'), true);
    assert.equal(eastKeep.includes('Harbor West keep'), false);
    const eastBytes = snapshot(reportFile(east));

    plant(west, 'Harbor West keep', '8');
    const westRun = run(west);
    assert.equal(westRun.status, 0, `west audit failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    const westStored = JSON.parse(fs.readFileSync(reportFile(west), 'utf8'));
    assert.equal(westStored.footMarker, 'Harbor West keep');
    assert.equal(westStored.footVersion, '8');
    assert.equal(JSON.stringify(westStored).includes('Harbor East keep'), false);
    const westKeep = fs.readFileSync(path.join(west, 'demigod-keep-going.md'), 'utf8');
    assert.equal(westKeep.includes('Harbor West keep'), true);
    assert.equal(westKeep.includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
    assert.equal(fs.existsSync(homeShots), homeShotsBefore);
    assert.equal(fs.existsSync(path.join(east, 'audit-shots')), false);
    assert.equal(fs.existsSync(path.join(west, 'audit-shots')), false);
  });
});
