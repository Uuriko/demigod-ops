import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const source = fs.readFileSync(new URL('./demigod-agent-dashboard.mjs', import.meta.url), 'utf8');
const orcaBridge = fs.readFileSync(new URL('./demigod-orca-bridge.mjs', import.meta.url), 'utf8');
const compact = source.slice(source.indexOf('function compactWorkStatus'), source.indexOf('function slimStatus'));
const orcaRoute = source.slice(
  source.indexOf("if (url.pathname === '/api/orca')"),
  source.indexOf("if (url.pathname === '/api/priority'"),
);

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
    ['--help', '--snapshot'],
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

test('dashboard status keeps cached control NEXT aligned with canonical NEXT', () => {
  assert.match(source, /data\.control = \{ \.\.\.data\.control, nextCanon: data\.next \};/);
});

test('freeze-off copy never grants publication authority', () => {
  assert.match(source, /publication still requires exact current-request authorization \+ lock/);
  assert.doesNotMatch(source, /ship allowed if cockpit NEXT says so|mutate only with lock \+ intent|MUTATE only if freeze OFF/);
});

test('dashboard projects Orca comms from one file-only status receipt', () => {
  assert.match(compact, /safeJson\(path\.join\(BUSY, 'orca-status\.json'\)\)/);
  assert.match(compact, /channels: \{ orca: channel \}/);
  assert.match(compact, /roundTripMs:/);
  assert.match(compact, /reachable: !stale/);
  assert.doesNotMatch(compact, /coordDir|coordWorkerStatus|pidFileAlive|board\.json|claims\.json/);
  assert.doesNotMatch(compact, /orca-ide|spawnSync|\/api\/orca/);
  assert.match(orcaBridge, /visualLayouts/);
  assert.match(orcaBridge, /tabTitles\.get\(terminal\.handle\)/);
  assert.match(orcaBridge, /activeHandles\.has\(message\.from_handle\)/);
  assert.match(orcaBridge, /previous\?\.runtimeId === currentRuntimeId/);
  assert.match(orcaBridge, /terminalProbe\?\.ok === true \? terminals\.length : null/);
  assert.match(source, /function refreshOrcaReceiptIfStale/);
  assert.match(source, /execFile\([\s\S]*demigod-orca-bridge\.mjs/);
  assert.match(source, /schema: 'demigod\.coord-compat\/1'/);
  assert.doesNotMatch(orcaRoute, /spawnSync/);
});
