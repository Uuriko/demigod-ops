import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-verify-all.mjs');
const SHARED = [
  '/home/potter/DEMIGOD-VERIFY-ALL.json',
  path.join(OPS, 'DEMIGOD-VERIFY-ALL.json'),
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

function plant(dir, phrase) {
  fs.writeFileSync(path.join(dir, 'demigod-verify-note.txt'), `${phrase}\n`);
  fs.writeFileSync(path.join(dir, 'demigod-verify-source.mjs'), [
    "import fs from 'fs';",
    "import path from 'path';",
    'const root = process.env.DEMIGOD_ROOT;',
    'fs.writeFileSync(path.join(root, \'step-ran.txt\'), `${process.env.DEMIGOD_LIVE}\\n`);',
  ].join('\n'));
}

function reportFile(dir) {
  return path.join(dir, 'DEMIGOD-VERIFY-ALL.json');
}

describe('verify all', { concurrency: 1 }, () => {
  test('a verify-all report stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-verify-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-verify-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    t.after(() => {
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const src = fs.readFileSync(CLI, 'utf8');
    assert.equal(src.includes("const ROOT = '/home/potter'"), false);
    assert.equal(src.includes('www.trydemigod.com'), false);

    const unset = run(east, [], { DEMIGOD_ROOT: '' });
    const unsetOut = readJson(unset, 'unset root');
    assert.equal(unset.status, 1);
    assert.equal(unsetOut.error, 'verify_root_required');
    assert.equal(fs.existsSync(reportFile(east)), false);

    const home = run('/home/potter');
    const homeOut = readJson(home, 'home root');
    assert.equal(home.status, 1);
    assert.equal(homeOut.error, 'verify_root_required');
    assert.equal(fs.existsSync('/home/potter/DEMIGOD-VERIFY-ALL.json'), false);

    const checkout = run(OPS);
    const checkoutOut = readJson(checkout, 'checkout root');
    assert.equal(checkout.status, 1);
    assert.equal(checkoutOut.error, 'verify_root_required');
    assert.equal(fs.existsSync(reportFile(OPS)), false);

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

    const missing = run(east);
    const missingOut = readJson(missing, 'missing source');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.error, 'source_required');
    assert.equal(fs.existsSync(reportFile(east)), false);

    fs.writeFileSync(path.join(east, 'demigod-verify-note.txt'), 'Harbor East keep\n');
    const noSteps = run(east);
    const noStepsOut = readJson(noSteps, 'missing steps');
    assert.equal(noSteps.status, 1);
    assert.equal(noStepsOut.error, 'steps_required');
    assert.equal(fs.existsSync(reportFile(east)), false);

    plant(east, 'Harbor East keep');
    const eastRun = run(east);
    assert.equal(eastRun.status, 0, `east verify failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, reportFile(east));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.footMarker, 'Harbor East keep');
    assert.equal(eastOut.spawned, 1);
    assert.equal(eastOut.failed, 0);
    assert.equal(eastOut.liveFetch, false);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    const stored = JSON.parse(fs.readFileSync(reportFile(east), 'utf8'));
    assert.equal(stored.footMarker, 'Harbor East keep');
    assert.equal(stored.spawned, 1);
    assert.equal(stored.steps.find((step) => step.script === 'demigod-verify-source.mjs').status, 0);
    assert.equal(stored.steps.filter((step) => step.present).length, 1);
    assert.equal(stored.liveFetch, false);
    assert.equal(JSON.stringify(stored).includes('Harbor West keep'), false);
    const ran = fs.readFileSync(path.join(east, 'step-ran.txt'), 'utf8');
    assert.equal(ran.includes('127.0.0.1:9'), true);
    assert.equal(ran.includes('www.trydemigod.com'), false);
    const eastBytes = snapshot(reportFile(east));

    plant(west, 'Harbor West keep');
    const westRun = run(west);
    assert.equal(westRun.status, 0, `west verify failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, reportFile(west));
    assert.equal(westOut.footMarker, 'Harbor West keep');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    const westStored = JSON.parse(fs.readFileSync(reportFile(west), 'utf8'));
    assert.equal(westStored.footMarker, 'Harbor West keep');
    assert.equal(JSON.stringify(westStored).includes('Harbor East keep'), false);
    const westRan = fs.readFileSync(path.join(west, 'step-ran.txt'), 'utf8');
    assert.equal(westRan.includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(reportFile(east)), eastBytes);
    assert.equal(fs.existsSync(path.join(west, 'step-ran.txt')), true);
    assert.equal(fs.readFileSync(path.join(east, 'demigod-verify-note.txt'), 'utf8').includes('Harbor East keep'), true);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
  });
});
