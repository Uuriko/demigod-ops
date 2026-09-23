import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const CHECK = path.join(OPS, 'demigod-reply-check.mjs');
const BUSY_JSON = '/tmp/demigod-reply-check-latest.json';
const BUSY_MD = '/tmp/demigod-reply-check-latest.md';

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, CHECK, ...args], {
    cwd: OPS,
    env: { ...process.env, DEMIGOD_ROOT: dir },
    encoding: 'utf8',
  });
}

function readJson(res, label) {
  const line = String(res.stdout || '').trim().split('\n').filter((row) => row.trim().startsWith('{')).at(-1);
  let parsed = null;
  try {
    parsed = JSON.parse(line || '');
  } catch {
    parsed = null;
  }
  assert.ok(parsed, `${label} did not return JSON\nstatus=${res.status}\nstdout=${res.stdout}\nstderr=${res.stderr}`);
  return parsed;
}

describe('reply check log', { concurrency: 1 }, () => {
  test('a local reply check counts the data-root confirmation and not the checkout log', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-reply-check-'));
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
    const checkoutOutreach = path.join(OPS, 'demigod-outreach');
    const createdDir = !fs.existsSync(checkoutOutreach);
    const decoy = path.join(checkoutOutreach, 'dm-send-log.txt');
    const decoyExisted = fs.existsSync(decoy);
    if (!decoyExisted) {
      fs.mkdirSync(checkoutOutreach, { recursive: true });
      fs.writeFileSync(decoy, 'SENT-CONFIRMED | 2026-09-23 | @ada | Harbor East | x\n');
    }
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      if (!decoyExisted && fs.existsSync(decoy)) fs.unlinkSync(decoy);
      if (createdDir) fs.rmSync(checkoutOutreach, { recursive: true, force: true });
      fs.rmSync(dir, { recursive: true, force: true });
    });

    const outreach = path.join(dir, 'demigod-outreach');
    fs.mkdirSync(outreach, { recursive: true });
    fs.writeFileSync(
      path.join(outreach, 'dm-send-log.txt'),
      'SENT-CONFIRMED | 2026-09-23 | @ada | Harbor West | x\n',
    );
    const busyJsonBefore = fs.existsSync(BUSY_JSON) ? fs.readFileSync(BUSY_JSON, 'utf8') : '';
    const busyMdBefore = fs.existsSync(BUSY_MD) ? fs.readFileSync(BUSY_MD, 'utf8') : '';

    const checked = readJson(run(dir, preload, ['--scan-local']), 'reply check');
    assert.equal(checked.ok, true);
    assert.equal(checked.confirmed, 1);
    assert.deepEqual(checked.companies, ['Harbor West']);
    assert.equal(checked.sent, false);
    assert.equal(checked.liveMail, false);
    assert.equal(checked.report, path.join(dir, 'DEMIGOD-REPLY-CHECK.md'));

    const report = fs.readFileSync(checked.report, 'utf8');
    assert.match(report, /Harbor West/);
    assert.doesNotMatch(report, /Harbor East/);
    const saved = JSON.parse(fs.readFileSync(path.join(dir, 'DEMIGOD-REPLY-CHECK.json'), 'utf8'));
    assert.deepEqual(saved.companies, ['Harbor West']);
    if (!decoyExisted) {
      assert.equal(fs.readFileSync(decoy, 'utf8').includes('Harbor East'), true);
      assert.equal(fs.readFileSync(decoy, 'utf8').includes('Harbor West'), false);
    }

    const busyJsonAfter = fs.existsSync(BUSY_JSON) ? fs.readFileSync(BUSY_JSON, 'utf8') : '';
    const busyMdAfter = fs.existsSync(BUSY_MD) ? fs.readFileSync(BUSY_MD, 'utf8') : '';
    assert.equal(busyJsonAfter, busyJsonBefore);
    assert.equal(busyMdAfter, busyMdBefore);
    assert.equal(busyJsonAfter.includes('Harbor West'), false);
    assert.equal(fs.existsSync(flag), false);
  });
});
