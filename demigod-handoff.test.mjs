import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const HANDOFF = path.join(OPS, 'demigod-handoff.mjs');
const CHECKOUT_REPORT = path.join(OPS, 'DEMIGOD-HANDOFF.json');
const BUSY_JSON = '/tmp/dg-busy/HANDOFF.json';
const BUSY_MD = '/tmp/dg-busy/HANDOFF.md';

function run(dir, args = []) {
  return spawnSync(process.execPath, [HANDOFF, ...args], {
    cwd: OPS,
    env: {
      ...process.env,
      DEMIGOD_ROOT: dir,
      DEMIGOD_LIVE: 'http://127.0.0.1:9',
    },
    encoding: 'utf8',
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

function writeRoot(dir, note, version) {
  fs.writeFileSync(path.join(dir, 'demigod-foot-core.js'), `/*__dgFootVer='${version}'*/\n${note}\n`);
  fs.writeFileSync(path.join(dir, 'DEMIGOD-VERIFY-SOURCE.json'), JSON.stringify({
    pass: true,
    at: note,
  }));
}

function report(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-HANDOFF.json'), 'utf8'));
}

describe('handoff card', { concurrency: 1 }, () => {
  test('a handoff card stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-handoff-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-handoff-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutBefore = snapshot(CHECKOUT_REPORT);
    const busyJsonBefore = snapshot(BUSY_JSON);
    const busyMdBefore = snapshot(BUSY_MD);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const publish = run(east, ['--publish', '--json', '--note', 'Harbor East handoff']);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(publishOut.sent, false);
    assert.equal(publishOut.liveMail, false);
    assert.equal(publishOut.livePublish, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-HANDOFF.json')), false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-HANDOFF.md')), false);

    writeRoot(east, 'Harbor East handoff', 91);
    const eastRun = run(east, ['--json', '--note', 'Harbor East handoff']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.note, 'Harbor East handoff');
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-HANDOFF.json'));
    assert.equal(eastOut.truth.footVer, '91');
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(report(east).note, 'Harbor East handoff');
    assert.equal(report(east).truth.footVer, '91');
    assert.equal(fs.readFileSync(path.join(east, 'DEMIGOD-HANDOFF.md'), 'utf8').includes('Harbor East handoff'), true);
    assert.equal(JSON.stringify(report(east)).includes('Harbor West handoff'), false);
    const eastBytes = snapshot(path.join(east, 'DEMIGOD-HANDOFF.json'));

    writeRoot(west, 'Harbor West handoff', 92);
    const westRun = run(west, ['--json', '--note', 'Harbor West handoff']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westRun.status, 0);
    assert.equal(westOut.note, 'Harbor West handoff');
    assert.equal(westOut.path, path.join(west, 'DEMIGOD-HANDOFF.json'));
    assert.equal(westOut.truth.footVer, '92');
    assert.equal(JSON.stringify(report(west)).includes('Harbor East handoff'), false);
    assert.equal(JSON.stringify(report(east)).includes('Harbor West handoff'), false);
    assert.deepEqual(snapshot(path.join(east, 'DEMIGOD-HANDOFF.json')), eastBytes);
    assert.deepEqual(snapshot(CHECKOUT_REPORT), checkoutBefore);
    assert.deepEqual(snapshot(BUSY_JSON), busyJsonBefore);
    assert.deepEqual(snapshot(BUSY_MD), busyMdBefore);
  });
});
