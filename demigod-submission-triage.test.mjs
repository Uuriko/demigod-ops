import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPS = path.dirname(fileURLToPath(import.meta.url));
const TRIAGE = path.join(OPS, 'demigod-submission-triage.mjs');

function run(dir, args) {
  return spawnSync(process.execPath, [TRIAGE, ...args], {
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

function writeBoard(dir, roles) {
  fs.writeFileSync(path.join(dir, 'DEMIGOD-BOARD.json'), JSON.stringify({ roles }, null, 2));
}

function logText(dir) {
  const file = path.join(dir, 'DEMIGOD-SUBMISSION-TRIAGE.jsonl');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

describe('submission triage', { concurrency: 1 }, () => {
  test('a named person is scored on that board and a missing email writes nothing', async (t) => {
    const east = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-sub-triage-east-'));
    const west = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-sub-triage-west-'));
    const priorRoot = process.env.DEMIGOD_ROOT;
    process.env.DEMIGOD_ROOT = east;
    t.after(() => {
      if (priorRoot == null) delete process.env.DEMIGOD_ROOT;
      else process.env.DEMIGOD_ROOT = priorRoot;
      fs.rmSync(east, { recursive: true, force: true });
      fs.rmSync(west, { recursive: true, force: true });
    });

    writeBoard(east, [
      {
        id: 'role-harbor-east',
        title: 'Founding Engineer East',
        company: 'Harbor East',
        stageType: 'seed',
        skills: 'React, Node',
      },
      {
        id: 'role-harbor-other',
        title: 'Founding Designer East',
        company: 'Other Co',
        stageType: 'seed',
        skills: 'React, Figma',
      },
    ]);
    writeBoard(west, [
      {
        id: 'role-harbor-west',
        title: 'Founding Engineer West',
        company: 'Harbor West',
        stageType: 'seed',
        skills: 'React, Go',
      },
    ]);
    const westBoardBefore = fs.readFileSync(path.join(west, 'DEMIGOD-BOARD.json'));

    const missing = run(east, []);
    const missingOut = readJson(missing, 'missing');
    assert.equal(missing.status, 1);
    assert.equal(missingOut.ok, false);
    assert.equal(missingOut.error, 'submission_required');
    assert.equal(missingOut.sent, false);
    assert.equal(missingOut.liveMail, false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-SUBMISSION-TRIAGE.json')), false);
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-SUBMISSION-TRIAGE.jsonl')), false);

    const noEmail = run(east, ['--data', JSON.stringify({ skills: 'React', company: 'Harbor East', details: 'shipped v1' })]);
    const noEmailOut = readJson(noEmail, 'no email');
    assert.equal(noEmail.status, 1);
    assert.equal(noEmailOut.error, 'email_required');
    assert.equal(fs.existsSync(path.join(east, 'DEMIGOD-SUBMISSION-TRIAGE.jsonl')), false);

    const ada = {
      email: 'ada@harbor.example',
      company: 'Harbor East',
      skills: 'React',
      stage: 'seed',
      details: 'shipped v1',
    };
    const eastRun = run(east, ['--data', JSON.stringify(ada)]);
    const eastOut = readJson(eastRun, 'east');
    assert.equal(eastRun.status, 0);
    assert.equal(eastOut.ok, true);
    assert.equal(eastOut.email, 'ada@harbor.example');
    assert.equal(eastOut.company, 'Harbor East');
    assert.equal(eastOut.score, 45);
    assert.deepEqual(eastOut.suggestions, ['Intro to Founding Engineer East at Harbor East']);
    assert.equal(eastOut.sent, false);
    assert.equal(eastOut.liveMail, false);
    assert.equal(eastOut.autoMatch, false);
    assert.equal(eastOut.path, path.join(east, 'DEMIGOD-SUBMISSION-TRIAGE.jsonl'));
    assert.equal(logText(east).includes('Founding Engineer West'), false);
    assert.equal(logText(east).includes('Founding Designer East'), false);
    assert.equal(logText(east).includes('ada@harbor.example'), true);

    const mina = {
      email: 'mina@harbor.example',
      company: 'Harbor East',
      skills: 'Node',
      stage: 'seed',
      details: 'led the api',
    };
    const minaRun = run(east, ['--data', JSON.stringify(mina)]);
    const minaOut = readJson(minaRun, 'mina');
    assert.equal(minaRun.status, 0);
    assert.equal(minaOut.email, 'mina@harbor.example');
    assert.deepEqual(minaOut.suggestions, ['Intro to Founding Engineer East at Harbor East']);
    const eastLog = logText(east);
    assert.equal(eastLog.includes('ada@harbor.example'), true);
    assert.equal(eastLog.includes('mina@harbor.example'), true);
    assert.equal(eastLog.split('\n').filter(Boolean).length, 2);

    const sam = {
      email: 'sam@harbor.example',
      company: 'Harbor West',
      skills: 'React',
      stage: 'seed',
      details: 'shipped the west api',
    };
    const westRun = run(west, ['--data', JSON.stringify(sam)]);
    const westOut = readJson(westRun, 'west');
    assert.equal(westRun.status, 0);
    assert.equal(westOut.email, 'sam@harbor.example');
    assert.deepEqual(westOut.suggestions, ['Intro to Founding Engineer West at Harbor West']);
    const westLog = logText(west);
    assert.equal(westLog.includes('Founding Engineer East'), false);
    assert.equal(westLog.includes('ada@harbor.example'), false);
    assert.equal(westLog.includes('sam@harbor.example'), true);
    assert.deepEqual(fs.readFileSync(path.join(west, 'DEMIGOD-BOARD.json')), westBoardBefore);
    const eastAfterWest = logText(east);
    assert.equal(eastAfterWest.includes('sam@harbor.example'), false);
    assert.equal(eastAfterWest.includes('ada@harbor.example'), true);
    assert.equal(fs.existsSync(path.join(OPS, 'DEMIGOD-SUBMISSION-TRIAGE.json')), false);
    assert.equal(fs.existsSync(path.join(OPS, 'DEMIGOD-SUBMISSION-TRIAGE.jsonl')), false);
  });
});
