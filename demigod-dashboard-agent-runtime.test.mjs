import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const source = fs.readFileSync(new URL('./demigod-agent-dashboard.mjs', import.meta.url), 'utf8');
const compact = source.slice(source.indexOf('function compactWorkStatus'), source.indexOf('function slimStatus'));

test('dashboard derives agent runtime from live worker PIDs in both status views', () => {
  const run = spawnSync(process.execPath, ['demigod-agent-dashboard.mjs', '--selftest-coord-runtime'], {
    cwd: new URL('.', import.meta.url),
    encoding: 'utf8',
    timeout: 10_000,
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(source, /coordWorkerStatus\(coordDir, id, pidUnobservable\)/);
  assert.match(source, /coordWorkerStatus\(coordDir, name, pidUnobservable\)/);
  assert.match(source, /persistedStatus: board\.tracks\?\.\[name\]\?\.status \|\| null, status }/);
  assert.match(compact, /workerStatus === 'busy'[\s\S]{0,80}\? 'running'/);
  assert.doesNotMatch(compact, /trackStatus === 'busy'/);
});

test('dashboard validates CLI flags and the full TCP port range', () => {
  assert.match(source, /unknownArgs\.length/);
  assert.match(source, /portArg == null/);
  assert(source.includes('!/^\\d+$/.test(requestedPort)'));
  assert.match(source, /Number\(requestedPort\) < 1/);
  assert.match(source, /Number\(requestedPort\) > 65535/);
  assert.match(source, /process\.exit\(2\)/);
});

test('dashboard rejects duplicate or conflicting execution modes', () => {
  for (const args of [
    ['--snapshot', '--snapshot'],
    ['--help', '--project-grok-out'],
  ]) {
    const run = spawnSync(process.execPath, ['demigod-agent-dashboard.mjs', ...args], {
      cwd: new URL('.', import.meta.url),
      encoding: 'utf8',
      timeout: 10_000,
    });
    assert.equal(run.status, 2, run.stderr || run.stdout);
    assert.match(run.stderr, /^usage:/);
  }
});

test('agent brief null-safe when unify.json is missing', () => {
  // buildAgentBrief loads unify via safeJson (null on miss); bare unify.cli throws.
  assert.match(source, /unify\?\.cli\?\.spine\?\.length/);
  assert.match(source, /unify\?\.rules\?\.length/);
  assert.doesNotMatch(source, /if \(unify\.cli\?\.spine\?\.length\)/);
});
