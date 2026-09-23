import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const LOG = path.join(OPS, 'demigod-gtm-log-send.mjs');
const ADA = 'ada@harbor.example';
const SAM = 'sam@harbor.example';

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, LOG, ...args], {
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

describe('GTM send log', { concurrency: 1 }, () => {
  test('a missing recipient writes nothing and a named recipient stays in the data root', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-gtm-log-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = dir;
    const flag = path.join(dir, 'fetch-calls.log');
    const preload = path.join(dir, 'no-live-pay.mjs');
    fs.writeFileSync(preload, `import fs from 'node:fs';
globalThis.fetch = async () => {
  fs.appendFileSync(${JSON.stringify(flag)}, 'fetch\\n');
  throw new Error('live_payment');
};
`);
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(dir, { recursive: true, force: true });
    });

    const logPath = path.join(dir, 'demigod-outreach', 'dm-send-log.txt');
    const checkoutLog = path.join(OPS, 'demigod-outreach', 'dm-send-log.txt');

    const missingTo = readJson(run(dir, preload, ['--role=Founding Engineer']), 'missing recipient');
    assert.equal(missingTo.ok, false);
    assert.equal(missingTo.error, 'recipient_required');
    assert.equal(missingTo.sent, false);
    assert.equal(missingTo.liveMail, false);
    assert.equal(fs.existsSync(logPath), false);
    assert.equal(fs.existsSync(checkoutLog), false);

    const missingRole = readJson(run(dir, preload, [`--to=${ADA}`]), 'missing role');
    assert.equal(missingRole.ok, false);
    assert.equal(missingRole.error, 'role_required');
    assert.equal(fs.existsSync(logPath), false);

    const ada = readJson(run(dir, preload, [
      '--role=Founding Engineer',
      `--to=${ADA}`,
      '--90d=Ship the billing service',
    ]), 'named recipient');
    assert.equal(ada.ok, true);
    assert.equal(ada.to, ADA);
    assert.equal(ada.role, 'Founding Engineer');
    assert.equal(ada.log, logPath);
    assert.equal(ada.sent, false);
    assert.equal(ada.liveMail, false);
    const first = fs.readFileSync(logPath, 'utf8');
    assert.match(first, new RegExp(`Founding Engineer -> ${ADA.replace('.', '\\.')}`));
    assert.match(first, /Ship the billing service/);
    assert.doesNotMatch(first, /founder@co\.com/);
    assert.equal(fs.existsSync(checkoutLog), false);

    const sam = readJson(run(dir, preload, [
      '--role=Product Manager',
      `--to=${SAM}`,
    ]), 'second recipient');
    assert.equal(sam.ok, true);
    assert.equal(sam.to, SAM);
    assert.equal(sam.sent, false);
    const both = fs.readFileSync(logPath, 'utf8');
    assert.match(both, new RegExp(`Founding Engineer -> ${ADA.replace('.', '\\.')}`));
    assert.match(both, new RegExp(`Product Manager -> ${SAM.replace('.', '\\.')}`));
    assert.doesNotMatch(both, /founder@co\.com/);
    assert.equal(both.split('\n').filter((row) => row.includes(ADA)).length, 1);
    assert.equal(fs.existsSync(flag), false);
  });
});
