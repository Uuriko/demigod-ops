import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const INTAKE = path.join(OPS, 'demigod-intake-from-wiz.mjs');
const OUTCOME = 'Ship the billing service and hit 40k MRR';

function run(dir, preload, args) {
  return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, INTAKE, ...args], {
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

function rows(file) {
  return fs.readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
}

describe('wizard intake record', { concurrency: 1 }, () => {
  test('a missing email writes nothing and a named founder is stored locally', async (t) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-wiz-intake-'));
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

    const intakeFile = path.join(dir, 'DEMIGOD-WIZ-INTAKE.jsonl');
    const boardFile = path.join(dir, 'DEMIGOD-BOARD.json');

    const missingEmail = run(dir, preload, [`--90d=${OUTCOME}`, '--brief=Founding Engineer', '--log']);
    const missing = readJson(missingEmail, 'missing email');
    assert.equal(missing.ok, false);
    assert.equal(missing.error, 'email_required');
    assert.equal(missing.loggedPilot, false);
    assert.equal(missing.sent, false);
    assert.equal(missing.liveMail, false);
    assert.equal(fs.existsSync(intakeFile), false);
    assert.equal(fs.existsSync(boardFile), false);
    assert.equal(`${missingEmail.stdout}\n${missingEmail.stderr}`.includes('puppeteer'), false);
    assert.equal(`${missingEmail.stdout}\n${missingEmail.stderr}`.includes('pilot-logger'), false);

    const missingBrief = readJson(run(dir, preload, [
      '--email=ada@harbor.example',
      `--90d=${OUTCOME}`,
    ]), 'missing brief');
    assert.equal(missingBrief.ok, false);
    assert.equal(missingBrief.error, 'brief_required');
    assert.equal(fs.existsSync(intakeFile), false);

    const eastRun = run(dir, preload, [
      '--email=ada@harbor.example',
      '--brief=Founding Engineer',
      '--company=Harbor East',
      `--90d=${OUTCOME}`,
      '--log',
    ]);
    const east = readJson(eastRun, 'harbor east');
    assert.equal(east.ok, true);
    assert.equal(east.email, 'ada@harbor.example');
    assert.equal(east.company, 'Harbor East');
    assert.equal(east.brief, 'Founding Engineer');
    assert.equal(east.path, intakeFile);
    assert.equal(east.loggedPilot, false);
    assert.equal(east.sent, false);
    assert.equal(east.liveMail, false);
    assert.equal(`${eastRun.stdout}\n${eastRun.stderr}`.includes('puppeteer'), false);
    assert.equal(`${eastRun.stdout}\n${eastRun.stderr}`.includes('pilot-logger'), false);
    assert.equal(fs.existsSync(boardFile), false);

    const west = readJson(run(dir, preload, [
      '--email=sam@harbor.example',
      '--brief=Founding Engineer',
      '--company=Harbor West',
      `--90d=${OUTCOME}`,
      '--log',
    ]), 'harbor west');
    assert.equal(west.ok, true);
    assert.equal(west.company, 'Harbor West');
    const stored = rows(intakeFile);
    assert.equal(stored.length, 2);
    assert.equal(stored[0].email, 'ada@harbor.example');
    assert.equal(stored[0].company, 'Harbor East');
    assert.equal(stored[0].loggedPilot, false);
    assert.equal(stored[1].email, 'sam@harbor.example');
    assert.equal(stored[1].company, 'Harbor West');
    assert.equal(stored.some((row) => row.email === 'unknown@co.com'), false);
    assert.equal(fs.existsSync(path.join(OPS, 'DEMIGOD-WIZ-INTAKE.jsonl')), false);
    assert.equal(fs.existsSync(flag), false);
  });
});
