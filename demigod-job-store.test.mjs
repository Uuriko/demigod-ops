import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const STORE = path.join(OPS, 'demigod-job-store.mjs');
const BUSY_DIR = '/tmp/dg-busy/jobs';
const BUSY_LATEST = '/tmp/dg-busy/jobs-latest.json';
const CHECKOUT_DIR = path.join(OPS, 'DEMIGOD-JOBS');
const CHECKOUT_LATEST = path.join(OPS, 'DEMIGOD-JOBS-LATEST.json');

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, STORE, ...args], {
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

function dirBytes(dir) {
  if (!fs.existsSync(dir)) return '';
  return fs.readdirSync(dir).sort().map((name) => `${name}:${fs.readFileSync(path.join(dir, name), 'utf8')}`).join('\n');
}

describe('job store', { concurrency: 1 }, () => {
  test('a job stays in that data root and does not hide the other root', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-jobs-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-jobs-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    const flag = path.join(east, 'fetch-calls.log');
    const preload = path.join(east, 'no-live-pay.mjs');
    fs.writeFileSync(preload, `import fs from 'node:fs';
globalThis.fetch = async () => {
  fs.appendFileSync(${JSON.stringify(flag)}, 'fetch\\n');
  throw new Error('live_payment');
};
`);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    const busyDirBefore = dirBytes(BUSY_DIR);
    const busyLatestBefore = fs.existsSync(BUSY_LATEST) ? fs.readFileSync(BUSY_LATEST, 'utf8') : '';
    const checkoutDirBefore = dirBytes(CHECKOUT_DIR);
    const checkoutLatestBefore = fs.existsSync(CHECKOUT_LATEST) ? fs.readFileSync(CHECKOUT_LATEST, 'utf8') : null;

    const missing = run(east, preload, ['put']);
    const missingBody = readJson(missing, 'missing job');
    assert.equal(missing.status, 1);
    assert.equal(missingBody.ok, false);
    assert.equal(missingBody.error, 'job_required');
    assert.equal(missingBody.sent, false);
    assert.equal(missingBody.liveMail, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-JOBS')), false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-JOBS-LATEST.json')), false);

    const eastPut = readJson(run(east, preload, ['put', 'job-harbor-east', '--company', 'Harbor East']), 'east put');
    assert.equal(eastPut.ok, true);
    assert.equal(eastPut.jobId, 'job-harbor-east');
    assert.equal(eastPut.path, path.join(east, 'DEMIGOD-JOBS', 'job-harbor-east.json'));
    assert.equal(eastPut.sent, false);
    assert.equal(eastPut.liveMail, false);
    const eastFile = fs.readFileSync(eastPut.path, 'utf8');
    assert.match(eastFile, /Harbor East/);
    assert.doesNotMatch(eastFile, /Harbor West/);

    const westPut = readJson(run(west, preload, ['put', 'job-harbor-west', '--company', 'Harbor West']), 'west put');
    assert.equal(westPut.path, path.join(west, 'DEMIGOD-JOBS', 'job-harbor-west.json'));
    assert.equal(fs.readFileSync(eastPut.path, 'utf8'), eastFile);

    const eastList = readJson(run(east, preload, ['list']), 'east list');
    assert.equal(eastList.count, 1);
    assert.equal(eastList.jobs[0].jobId, 'job-harbor-east');
    assert.equal(eastList.jobs[0].company, 'Harbor East');
    assert.equal(eastList.jobs.some((job) => job.jobId === 'job-harbor-west'), false);

    const missingGet = readJson(run(east, preload, ['get', 'job-harbor-west']), 'east missing west');
    assert.equal(missingGet.ok, false);
    assert.equal(missingGet.error, 'job_not_found');

    const westGet = readJson(run(west, preload, ['get', 'job-harbor-west']), 'west get');
    assert.equal(westGet.ok, true);
    assert.equal(westGet.job.company, 'Harbor West');

    const swept = readJson(run(east, preload, ['gc', '0']), 'east gc');
    assert.equal(swept.ok, true);
    assert.equal(swept.removed, 1);
    assert.equal(fs.existsSync(eastPut.path), false);
    assert.equal(fs.existsSync(westPut.path), true);
    const westList = readJson(run(west, preload, ['list']), 'west list after east gc');
    assert.equal(westList.count, 1);
    assert.equal(westList.jobs[0].jobId, 'job-harbor-west');

    assert.equal(dirBytes(BUSY_DIR), busyDirBefore);
    assert.equal(fs.existsSync(BUSY_LATEST) ? fs.readFileSync(BUSY_LATEST, 'utf8') : '', busyLatestBefore);
    assert.equal(busyLatestBefore.includes('job-harbor-east'), false);
    assert.equal(dirBytes(CHECKOUT_DIR), checkoutDirBefore);
    assert.equal(fs.existsSync(CHECKOUT_LATEST) ? fs.readFileSync(CHECKOUT_LATEST, 'utf8') : null, checkoutLatestBefore);
    assert.equal(fs.existsSync(flag), false);
  });
});