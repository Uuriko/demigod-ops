import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-archive-scripts.mjs');
const HOME_MANIFEST = '/home/potter/DEMIGOD-ARCHIVE-MANIFEST.json';
const CHECKOUT_MANIFEST = path.join(OPS, 'DEMIGOD-ARCHIVE-MANIFEST.json');

function run(dir, args = [], { root = true } = {}) {
  const env = {
    ...process.env,
    DEMIGOD_LIVE: 'http://127.0.0.1:9',
    CDP_URL: 'http://127.0.0.1:9',
    DEMIGOD_DASH: 'http://127.0.0.1:9',
  };
  if (root) env.DEMIGOD_ROOT = dir;
  else delete env.DEMIGOD_ROOT;
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: OPS,
    env,
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

function plant(dir, phrase) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v9-core\n`);
  fs.writeFileSync(path.join(dir, 'demigod-old-bundle.mjs'), `// ${phrase} bundle\n`);
  fs.writeFileSync(path.join(dir, 'demigod-foot-v19.js'), `// ${phrase} legacy\n`);
}

function archived(dir, name) {
  return path.join(dir, 'archive', 'demigod-automation', name);
}

describe('archive manifest', { concurrency: 1 }, () => {
  test('an archive manifest stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-archive-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-archive-west-'));
    const homeBefore = snapshot(HOME_MANIFEST);
    const checkoutBefore = snapshot(CHECKOUT_MANIFEST);
    const cliBefore = snapshot(CLI);
    t.after(() => {
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const missing = run(east, [], { root: false });
    const missingOut = readJson(missing, 'missing root');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'archive_root_required');
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-ARCHIVE-MANIFEST.json')), false);
    assert.deepEqual(snapshot(CLI), cliBefore);

    const refused = run(east, ['--publish']);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.sent, false);
    assert.equal(refusedOut.liveMail, false);
    assert.equal(refusedOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-ARCHIVE-MANIFEST.json')), false);
    assert.equal((refused.stdout + refused.stderr).includes('www.trydemigod.com'), false);

    plant(east, 'Harbor East keep');
    const eastRun = run(east);
    assert.equal(eastRun.status, 0, `east archive failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-ARCHIVE-MANIFEST.json'));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.archiveDir, path.join(east, 'archive', 'demigod-automation'));
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.moved.includes('demigod-old-bundle.mjs'), true);
    assert.equal(eastOut.moved.includes('demigod-foot-v19.js'), true);
    assert.equal(eastOut.moved.includes('demigod-foot-core.js'), false);
    assert.equal(eastOut.kept.includes('demigod-foot-core.js'), true);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    assert.equal(fs.existsSync(path.join(east, 'demigod-foot-core.js')), true);
    assert.equal(fs.existsSync(path.join(east, 'demigod-old-bundle.mjs')), false);
    assert.equal(fs.readFileSync(archived(east, 'demigod-old-bundle.mjs'), 'utf8').includes('Harbor East keep'), true);
    assert.equal(fs.readFileSync(archived(east, 'demigod-foot-v19.js'), 'utf8').includes('Harbor East keep'), true);
    const eastBytes = snapshot(eastOut.path);
    const eastBundle = snapshot(archived(east, 'demigod-old-bundle.mjs'));

    plant(west, 'Harbor West keep');
    const westRun = run(west);
    assert.equal(westRun.status, 0, `west archive failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, path.join(west, 'DEMIGOD-ARCHIVE-MANIFEST.json'));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    assert.equal(fs.readFileSync(archived(west, 'demigod-old-bundle.mjs'), 'utf8').includes('Harbor West keep'), true);
    assert.equal(fs.readFileSync(archived(west, 'demigod-old-bundle.mjs'), 'utf8').includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(eastOut.path), eastBytes);
    assert.deepEqual(snapshot(archived(east, 'demigod-old-bundle.mjs')), eastBundle);
    assert.equal(fs.readFileSync(path.join(east, 'demigod-foot-core.js'), 'utf8').includes('Harbor East keep'), true);

    assert.deepEqual(snapshot(HOME_MANIFEST), homeBefore);
    assert.deepEqual(snapshot(CHECKOUT_MANIFEST), checkoutBefore);
    assert.deepEqual(snapshot(CLI), cliBefore);
    assert.equal(fs.existsSync('/home/potter/archive/demigod-automation/demigod-old-bundle.mjs'), false);
  });
});
