import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const LOGGER = path.join(OPS, 'demigod-proof-logger.mjs');
const CHECKOUT_LOG = path.join(OPS, 'DEMIGOD-PROOF-LOG.json');

function run(dir, args) {
  return spawnSync(process.execPath, [LOGGER, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
}

function readJson(res, label) {
  const raw = res.status === 0 ? res.stdout : res.stderr;
  const line = String(raw || '').trim().split('\n').filter((row) => row.trim().startsWith('{')).at(-1);
  let parsed = null;
  try {
    parsed = JSON.parse(line || '');
  } catch {
    parsed = null;
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

function logText(dir) {
  const file = path.join(dir, 'DEMIGOD-PROOF-LOG.json');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function snapshot(file) {
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

describe('proof log', { concurrency: 1 }, () => {
  test('a named intro stays in that data root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-proof-log-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-proof-log-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const checkoutBefore = snapshot(CHECKOUT_LOG);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const missing = run(east, []);
    const missingOut = readJson(missing, 'missing');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.ok, false);
    assert.equal(missingOut.error, 'intro_required');
    assert.equal(missingOut.sent, false);
    assert.equal(missingOut.liveMail, false);
    assert.equal(missingOut.livePublish, false);
    assert.equal(missingOut.posted, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-PROOF-LOG.json')), false);

    const refused = run(east, ['--intro=placeholder brief', '--detail=Harbor East']);
    const refusedOut = readJson(refused, 'refused');
    assert.equal(refused.status, 1);
    assert.equal(refusedOut.error, 'intro_refused');
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-PROOF-LOG.json')), false);

    const publish = run(east, ['--publish', '--intro=Harbor East intro']);
    const publishOut = readJson(publish, 'publish');
    assert.equal(publish.status, 1);
    assert.equal(publishOut.error, 'publish_refused');
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-PROOF-LOG.json')), false);

    const eastRun = run(east, ['--intro=Harbor East intro', '--detail=2 interviews booked']);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.intro, 'Harbor East intro');
    assert.equal(eastOut.detail, '2 interviews booked');
    assert.equal(eastOut.count, 1);
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-PROOF-LOG.json'));
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.livePublish, false);
    assert.equal(eastOut.posted, false);
    assert.equal(fs.existsSync(eastOut.tweetFile), true);
    assert.equal(eastOut.tweetFile.startsWith(east), true);
    const eastLog = JSON.parse(logText(east));
    assert.equal(eastLog.entries.length, 1);
    assert.equal(eastLog.entries[0].intro, 'Harbor East intro');
    assert.equal(logText(east).includes('Harbor West intro'), false);

    const second = run(east, ['--intro=Harbor Open intro', '--detail=brief received']);
    const secondOut = readJson(second, 'second');
    assert.equal(second.status, 0);
    assert.equal(secondOut.count, 2);
    const eastAfter = JSON.parse(logText(east));
    assert.deepEqual(eastAfter.entries.map((row) => row.intro), ['Harbor East intro', 'Harbor Open intro']);

    const westRun = run(west, ['--intro=Harbor West intro', '--detail=1 interview booked']);
    const westOut = readJson(westRun, 'west');
    assert.equal(westRun.status, 0);
    assert.equal(westOut.intro, 'Harbor West intro');
    assert.equal(westOut.count, 1);
    const westLog = logText(west);
    assert.equal(westLog.includes('Harbor East intro'), false);
    assert.equal(westLog.includes('Harbor Open intro'), false);
    assert.equal(logText(east).includes('Harbor West intro'), false);
    assert.equal(fs.existsSync(path.join(west, 'demigod-outreach', 'proof-assets', `${westOut.id}-tweet.txt`)), true);
    assert.equal(fs.existsSync(path.join(OPS, 'DEMIGOD-PROOF-LOG.json')), checkoutBefore != null);
    assert.deepEqual(snapshot(CHECKOUT_LOG), checkoutBefore);
  });
});
