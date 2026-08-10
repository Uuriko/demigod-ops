#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const shipSource = fs.readFileSync(path.join(root, 'dasha-ship.mjs'), 'utf8');
assert.match(shipSource, /dasha-audit-live\.mjs/, 'site-wide ship must run the canonical broad live audit');
assert.match(shipSource, /verify:broad/, 'broad live-audit result must be visible in release logs');
/* This used to pin the literal `attempt < 16`, which described one implementation of the wait rather
   than the requirement, and the number it froze was too small: /dasha exceeded that twelve-second
   budget on three consecutive ships. Assert the property instead — a wall-clock deadline generous
   enough for a slow element — so the wait can be retuned without editing a test that never had an
   opinion about the right duration. */
assert.match(shipSource, /readbackDeadline\s*=\s*Date\.now\(\)\s*\+\s*(\d[\d_]*)/,
  'embed readback must tolerate Webflow propagation lag with a wall-clock deadline');
assert.ok(Number(shipSource.match(/readbackDeadline\s*=\s*Date\.now\(\)\s*\+\s*(\d[\d_]*)/)[1].replace(/_/g, '')) >= 60_000,
  'embed readback deadline must allow at least 60s — /dasha has needed more than 12s');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dasha-ship-test-'));
const env = {
  ...process.env,
  DASHA_SHIP_FAKE_MCP: '1',
  DASHA_SHIP_FAKE_LIVE: '1',
  DASHA_SHIP_SKIP_BROWSER: '1',
  DASHA_SHIP_STATE: path.join(tmp, 'state.json'),
  DASHA_SHIP_MANIFEST: path.join(tmp, 'manifest.json'),
  DASHA_NOW_DOC: path.join(tmp, 'DASHA-NOW.md'),
};

function ship() {
  const result = spawnSync(process.execPath, ['dasha-ship.mjs', '--ship'], {
    cwd: root,
    env,
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

try {
  const first = ship();
  assert.match(first, /"step":"preflight:pass"/);
  assert.match(first, /"step":"preflight:lobby-assets:pass"/);
  assert.match(first, /"step":"push:surface"/);
  assert.match(first, /"step":"metadata:done"/);
  assert.match(first, /"step":"publish:ok"/);
  assert.match(first, /"step":"verify:broad"/, 'site-wide ship must record broad verification');

  const second = ship();
  assert.match(second, /"step":"resume"/);
  assert.match(second, /"step":"push:skip"/);
  assert.doesNotMatch(second, /"step":"push:surface"/,
    'a resumed receipt must not re-push surfaces it already read back successfully');
  assert.match(second, /"step":"publish:skip"/);
  assert.doesNotMatch(second, /"step":"preflight:start"/);

  const staleReceipt = JSON.parse(fs.readFileSync(env.DASHA_SHIP_STATE, 'utf8'));
  staleReceipt.inputHash = 'stale-gate-contract';
  fs.writeFileSync(env.DASHA_SHIP_STATE, JSON.stringify(staleReceipt));
  const invalidated = ship();
  assert.doesNotMatch(invalidated, /"step":"resume"/, 'changed gate inputs must invalidate a receipt');
  assert.match(invalidated, /"step":"gate:fast:start"/, 'invalidated receipt must rerun gates');

  const splitEnv = {
    ...env,
    DASHA_SHIP_STATE: path.join(tmp, 'split-state.json'),
    DASHA_SHIP_MANIFEST: path.join(tmp, 'split-manifest.json'),
  };
  const splitBase = spawnSync(process.execPath, ['dasha-ship.mjs', '--ship'], {
    cwd: root,
    env: splitEnv,
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.equal(splitBase.status, 0, splitBase.stderr || splitBase.stdout);
  const split = spawnSync(process.execPath, ['dasha-ship.mjs', '--ship'], {
    cwd: root,
    env: { ...splitEnv, DASHA_SHIP_FAKE_LOBBY_ASSETS: 'stale-assets' },
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.notEqual(split.status, 0, 'split Worker/Webflow release must fail closed');
  assert.match(split.stdout, /"step":"resume"/, 'resumed releases must recheck live Worker parity');
  assert.match(split.stdout, /Lobby Worker assets are not release-ready/);

  const deployEnv = {
    ...env,
    DASHA_SHIP_STATE: path.join(tmp, 'deploy-state.json'),
    DASHA_SHIP_MANIFEST: path.join(tmp, 'deploy-manifest.json'),
    DASHA_SHIP_FAKE_LOBBY_ASSETS: 'stale-assets',
    DASHA_SHIP_FAKE_DEPLOY: '1',
  };
  const deployed = spawnSync(process.execPath, ['dasha-ship.mjs', '--ship'], {
    cwd: root,
    env: deployEnv,
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.equal(deployed.status, 0, deployed.stderr || deployed.stdout);
  assert.match(deployed.stdout, /"step":"deploy:lobby:start"/);
  assert.match(deployed.stdout, /"step":"deploy:lobby:done"/);

  const state = JSON.parse(fs.readFileSync(env.DASHA_SHIP_STATE, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(env.DASHA_SHIP_MANIFEST, 'utf8'));
  assert.equal(state.stages.verified, true);
  assert.equal(state.gates.productCoherence.status, 'passed');
  assert.deepEqual(
    [state.gates.landingBrowser, state.gates.studioBrowser, state.gates.deskBrowser].map((gate) => [gate.status, gate.reason]),
    Array(3).fill(['skipped', 'fixture-only browser skip']),
  );
  assert.equal(manifest.status, 'verified');
  assert.equal(manifest.schema, 'dasha.ship-manifest/2');
  assert.equal(manifest.release.lobby.assets, 'fixture-assets');
  assert.match(manifest.release.workspaceCommit, /^[0-9a-f]{40}$/);
  assert.match(manifest.release.publicRepoCommit, /^[0-9a-f]{40}$/);
  assert.equal(manifest.release.studioCanonical.file, 'dasha-meme-studio.html');
  assert.equal(manifest.release.publicStudio.file, 'dasha-desk/studio/index.html');
  assert.equal(manifest.release.deskCanonical.file, 'dasha-desk/src/app.html');
  assert.deepEqual(
    Object.keys(manifest.hashes).sort(),
    ['desk', 'deskRetiredRepair', 'deskShell', 'home', 'homeLobbyLink', 'lobby', 'studio'],
  );

  const now = spawnSync(process.execPath, ['dasha-ship.mjs', '--status', '--write-now'], {
    cwd: root, env, encoding: 'utf8', timeout: 30_000,
  });
  assert.equal(now.status, 0, now.stderr || now.stdout);
  assert.match(fs.readFileSync(env.DASHA_NOW_DOC, 'utf8'), /Local release alignment: aligned/);
  console.log('dasha-ship incremental/resume PASS');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
