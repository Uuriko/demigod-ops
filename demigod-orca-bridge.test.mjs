import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(OPS, 'demigod-orca-bridge.mjs');
const SHARED = [
  '/tmp/orca-pair.html',
  '/tmp/orca-pair-url.txt',
  '/tmp/orca-pair-meta.json',
  '/home/potter/orca-pair-code.html',
  '/home/potter/orca-pair-code.txt',
  '/home/potter/orca-pair-meta.json',
  '/home/potter/DEMIGOD-ORCA-DOCTOR.json',
];

function run(dir, args = []) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      ORCA_CONFIG_DIR: path.join(dir, '.orca-config'),
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

function plant(dir, phrase, token) {
  const cfg = path.join(dir, '.orca-config');
  fs.mkdirSync(cfg, { recursive: true });
  fs.writeFileSync(path.join(cfg, 'orca-runtime.json'), JSON.stringify({
    runtimeId: `${token}-runtime`,
    authToken: token,
  }));
  fs.writeFileSync(path.join(cfg, 'orca-devices.json'), JSON.stringify([
    { scope: 'mobile', name: phrase, token, deviceId: `${token}-device` },
  ]));
  fs.writeFileSync(path.join(cfg, 'orca-e2ee-keypair.json'), JSON.stringify({
    publicKeyB64: `${token}-public`,
  }));
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `// ${phrase}\ndg-foot-v9-core\n`);
}

describe('orca bridge', { concurrency: 1 }, () => {
  test('a pair file stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-orca-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-orca-west-'));
    const sharedBefore = Object.fromEntries(SHARED.map((file) => [file, snapshot(file)]));
    const checkoutDoctor = snapshot(path.join(OPS, 'DEMIGOD-ORCA-DOCTOR.json'));
    t.after(() => {
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const refused = run(east, ['--publish']);
    const refusedOut = readJson(refused, 'publish');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'publish_refused');
    assert.equal(refusedOut.sent, false);
    assert.equal(refusedOut.liveMail, false);
    assert.equal(refusedOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'orca-pair-code.html')), false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-ORCA-DOCTOR.json')), false);
    assert.equal((refused.stdout + refused.stderr).includes('www.trydemigod.com'), false);

    plant(east, 'Harbor East keep', 'east-pair-token');
    const eastRun = run(east, ['pair', '--write']);
    assert.equal(eastRun.status, 0, `east pair failed\n${eastRun.stdout}\n${eastRun.stderr}`);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.path, path.join(east, 'orca-pair-code.html'));
    assert.equal(eastOut.path.includes('/home/potter'), false);
    assert.equal(eastOut.path.includes('/tmp/orca-pair'), false);
    assert.equal(eastOut.deviceName, 'Harbor East keep');
    assert.equal(eastOut.source, 'disk');
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal((eastRun.stdout + eastRun.stderr).includes('www.trydemigod.com'), false);
    const eastHtml = fs.readFileSync(path.join(east, 'orca-pair-code.html'), 'utf8');
    assert.equal(eastHtml.includes('Harbor East keep'), true);
    assert.equal(eastHtml.includes('Harbor West keep'), false);
    const eastMeta = JSON.parse(fs.readFileSync(path.join(east, 'orca-pair-meta.json'), 'utf8'));
    assert.equal(eastMeta.deviceName, 'Harbor East keep');
    assert.equal(eastMeta.path, path.join(east, 'orca-pair-meta.json'));
    const eastHtmlBytes = snapshot(path.join(east, 'orca-pair-code.html'));

    const eastDoctor = run(east, ['doctor']);
    const eastDoctorOut = readJson(eastDoctor, 'east doctor');
    assert.equal(eastDoctorOut.path, path.join(east, 'DEMIGOD-ORCA-DOCTOR.json'));
    assert.equal(eastDoctorOut.footMarker, 'Harbor East keep');
    assert.equal(eastDoctorOut.sent, false);
    assert.equal(eastDoctorOut.livePublish, false);
    assert.equal((eastDoctor.stdout + eastDoctor.stderr).includes('www.trydemigod.com'), false);
    const eastDoctorStored = JSON.parse(fs.readFileSync(path.join(east, 'DEMIGOD-ORCA-DOCTOR.json'), 'utf8'));
    assert.equal(eastDoctorStored.footMarker, 'Harbor East keep');
    assert.equal(JSON.stringify(eastDoctorStored).includes('Harbor West keep'), false);
    const eastDoctorBytes = snapshot(path.join(east, 'DEMIGOD-ORCA-DOCTOR.json'));

    plant(west, 'Harbor West keep', 'west-pair-token');
    const westRun = run(west, ['pair', '--write']);
    assert.equal(westRun.status, 0, `west pair failed\n${westRun.stdout}\n${westRun.stderr}`);
    const westOut = readJson(westRun, 'west');
    assert.equal(westOut.path, path.join(west, 'orca-pair-code.html'));
    assert.equal(westOut.deviceName, 'Harbor West keep');
    assert.equal(JSON.stringify(westOut).includes('Harbor East keep'), false);
    assert.equal(JSON.stringify(westOut).includes('east-pair-token'), false);
    assert.deepEqual(snapshot(path.join(east, 'orca-pair-code.html')), eastHtmlBytes);
    const westHtml = fs.readFileSync(path.join(west, 'orca-pair-code.html'), 'utf8');
    assert.equal(westHtml.includes('Harbor West keep'), true);
    assert.equal(westHtml.includes('Harbor East keep'), false);
    assert.equal(westHtml.includes('east-pair-token'), false);

    const westDoctor = run(west, ['doctor']);
    const westDoctorOut = readJson(westDoctor, 'west doctor');
    assert.equal(westDoctorOut.footMarker, 'Harbor West keep');
    assert.equal(JSON.stringify(westDoctorOut).includes('Harbor East keep'), false);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-ORCA-DOCTOR.json')), eastDoctorBytes);

    for (const file of SHARED) {
      assert.deepEqual(snapshot(file), sharedBefore[file], file);
    }
    assert.deepEqual(snapshot(path.join(OPS, 'DEMIGOD-ORCA-DOCTOR.json')), checkoutDoctor);
  });
});
