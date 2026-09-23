import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-perf-cleanup.mjs');
const SHARED = [
  '/home/potter/DEMIGOD-PERF-CLEANUP.json',
  path.join(OPS, 'DEMIGOD-PERF-CLEANUP.json'),
];

function run(dir, args = [], extraEnv = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: OPS,
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

function cacheFile(dir, name) {
  return path.join(dir, '.grok', 'chrome-heavy', 'GrShaderCache', name);
}

function plant(dir, phrase) {
  fs.mkdirSync(path.dirname(cacheFile(dir, 'old.bin')), { recursive: true });
  fs.writeFileSync(path.join(dir, 'demigod-perf-note.txt'), `${phrase}\n`);
  fs.writeFileSync(cacheFile(dir, 'old.bin'), `${phrase} old\n`);
  fs.writeFileSync(cacheFile(dir, 'fresh.bin'), `${phrase} fresh\n`);
  const old = Date.now() / 1000 - 10 * 86400;
  fs.utimesSync(cacheFile(dir, 'old.bin'), old, old);
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-PERF-CLEANUP.json');
}

describe('perf cleanup', { concurrency: 1 }, () => {
  test('a perf cleanup stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-perf-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-perf-west-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-perf-out-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    const homeGrok = '/home/potter/.grok';
    const homeGrokBefore = fs.existsSync(homeGrok);
    t.after(() => {
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    });

    const src = fs.readFileSync(CLI, 'utf8');
    assert.equal(src.includes("from 'puppeteer-core'"), false);
    assert.equal(src.includes('cdp-config.mjs'), false);
    assert.equal(src.includes('cdp-close-tabs.mjs'), false);
    assert.equal(src.includes("const ROOT = '/home/potter'"), false);
    assert.equal(src.includes('www.trydemigod.com'), false);

    fs.mkdirSync(path.dirname(cacheFile(outside, 'keep.bin')), { recursive: true });
    fs.writeFileSync(cacheFile(outside, 'keep.bin'), 'outside keep\n');
    const outsideOld = Date.now() / 1000 - 10 * 86400;
    fs.utimesSync(cacheFile(outside, 'keep.bin'), outsideOld, outsideOld);

    const unset = run(east, [], { DEMIGOD_ROOT: '' });
    const unsetOut = readJson(unset, 'unset root');
    assert.equal(unset.status, 1);
    assert.equal(unsetOut.error, 'cleanup_root_required');
    assert.equal(unsetOut.tabsClosed, false);
    assert.equal(fs.existsSync(reportFile(east)), false);

    const home = run('/home/potter');
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'cleanup_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-PERF-CLEANUP.json'), false);
    assert.equal(fs.existsSync(homeGrok), homeGrokBefore);

    const checkout = run(OPS);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'cleanup_root_required');
    assert.equal(fs.existsSync(reportFile(OPS)), false);

    const refused = run(east, ['--publish']);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.sent, false);
    assert.equal(refusedOut.liveMail, false);
    assert.equal(refusedOut.livePublish, false);
    assert.equal(refusedOut.liveFetch, false);
    assert.equal(refusedOut.tabsClosed, false);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.equal((refused.stdout + refused.stderr).includes('www.trydemigod.com'), false);

    const missing = run(east);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);

    plant(east, 'Harbor East keep');
    const plantedOld = snapshot(cacheFile(east, 'old.bin'));
    const refusedPlanted = run(east, ['--publish']);
    assert.equal(refusedPlanted.status, 1);
    assert.equal(fs.existsSync(reportFile(east)), false);
    assert.deepEqual(snapshot(cacheFile(east, 'old.bin')), plantedOld);

    const eastRun = run(east);
    assert.equal(eastRun.status, 0, `east cleanup failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.removed, 1);
    assert.equal(eastOut.tabsClosed, false);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.sent, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('puppeteer'), false);
    assert.equal(fs.existsSync(cacheFile(east, 'old.bin')), false);
    assert.equal(fs.readFileSync(cacheFile(east, 'fresh.bin'), 'utf8').includes('Harbor East keep'), true);
    assert.equal(fs.existsSync(cacheFile(outside, 'keep.bin')), true);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.removed, 1);
    assert.equal(stored.cacheTrim[0].names.includes('old.bin'), true);
    assert.equal(stored.cacheTrim[0].names.includes('fresh.bin'), false);
    assert.equal(stored.tabsClosed, false);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const eastBytes = snapshot(reportFile(east));

    plant(west, 'Harbor West keep');
    const westRun = run(west);
    assert.equal(westRun.status, 0, `west cleanup failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(westOut.removed, 1);
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    assert.equal(fs.existsSync(cacheFile(west, 'old.bin')), false);
    assert.equal(fs.readFileSync(cacheFile(west, 'fresh.bin'), 'utf8').includes('Harbor West keep'), true);
    assert.equal(fs.readFileSync(cacheFile(west, 'fresh.bin'), 'utf8').includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);
    assert.equal(fs.existsSync(cacheFile(outside, 'keep.bin')), true);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
    assert.equal(fs.existsSync(homeGrok), homeGrokBefore);
  });
});
