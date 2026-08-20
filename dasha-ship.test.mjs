#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { executionViolations } from './dasha-audit-live.mjs';

const root = path.dirname(new URL(import.meta.url).pathname);
const shipSource = fs.readFileSync(path.join(root, 'dasha-ship.mjs'), 'utf8');
const browserGateSource = fs.readFileSync(path.join(root, 'dasha-browser-gate.mjs'), 'utf8');
const deskShell = fs.readFileSync(path.join(root, 'dasha-desk-shell.html'), 'utf8');
assert.match(deskShell, /dasha-skip-1:focus(?:-visible)?\{[^}]*left:12px[^}]*outline:3px/, 'Desk skip link must become visibly positioned on focus');
assert.doesNotMatch(deskShell, /<h1\b/, 'Desk shell must not add a second document h1');
assert.match(shipSource, /dasha-audit-live\.mjs/, 'site-wide ship must run the canonical broad live audit');
assert.match(shipSource, /dasha-browser-gate\.mjs/, 'browser gates must use the CDP fallback');
assert.match(shipSource, /deskBrowser[^\n]+changed\.includes\('deskShell'\)/, 'Desk shell changes must run the Desk browser gate');
assert.match(shipSource, /scopeKeys/, 'scoped --only= ships must not restage every surface on publish');
assert.match(shipSource, /Graph → Bounties/, 'site-wide ship must repair the dead shared Graph navigation item');
assert.match(shipSource, /bulk_update_pages/, 'site-wide ship must synchronize every release-owned page metadata record');
assert.match(shipSource, /args\.has\('--no-prep'\)/, 'ship must honor --no-prep');
assert.match(browserGateSource, /chromium\.launch[\s\S]*remote-debugging-port=9223/, 'CDP fallback must launch installed headless Chromium');
assert.match(shipSource, /verify:broad/, 'broad live-audit result must be visible in release logs');
assert.match(shipSource, /args\.has\('--worker-behind'\)[^\n]+\['--worker-behind'\]/,
  'split-tree ships must carry worker-behind into broad verification');
const pinnedXConnect = '<script src="https://lobby.getdasha.com/client/x-connect.js" integrity="sha384-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" crossorigin="anonymous"></script>';
assert.deepEqual(executionViolations(pinnedXConnect), [], 'SRI-pinned X connect is an allowed first-party client');
assert.deepEqual(executionViolations(pinnedXConnect.replace(/ integrity="[^"]+"/, '')), ['https://lobby.getdasha.com/client/x-connect.js'], 'unpinned X connect stays blocked');
/* The homepage's second embed element belongs to another tree, which publishes the chess board into
   it. This tree once mapped it to a /lobby bridge; that bridge was retired and its file emptied, but
   the mapping stayed — and `detected` falls back to every surface whenever the manifest is not
   `verified` (fresh clone, or a run that failed before stamping), so a ship from here would have
   written an 820-byte comment over live chess. Owning an element you cannot source is the bug, so
   the element id must not reappear as a surface. */
assert.doesNotMatch(shipSource, /element:\s*'111587a0-9244-9044-dd65-d53ad8cd314e'/,
  'ship must not map any surface onto the homepage embed element owned by another tree');
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

/* 30s was not enough and had stopped being a test of anything: the fast gate alone measured 63s on
   2026-08-15, so every run died on the stopwatch at `gate:fast:start` and reported `null !== 0` —
   a timeout wearing the costume of a ship failure. The gate is not slow by accident; it spawns six
   node subprocesses (three build --check passes plus the coherence, growth and radar gates), and
   that is work we want it doing. Budget for the gate the pipeline actually runs, generously enough
   that a loaded machine does not turn a green suite red. */
function ship() {
  const result = spawnSync(process.execPath, ['dasha-ship.mjs', '--ship'], {
    cwd: root,
    env,
    encoding: 'utf8',
    timeout: 300_000,
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
    timeout: 300_000,
  });
  assert.equal(splitBase.status, 0, splitBase.stderr || splitBase.stdout);
  const split = spawnSync(process.execPath, ['dasha-ship.mjs', '--ship'], {
    cwd: root,
    env: { ...splitEnv, DASHA_SHIP_FAKE_LOBBY_ASSETS: 'stale-assets' },
    encoding: 'utf8',
    timeout: 300_000,
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
    timeout: 300_000,
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
  /* homeLobbyLink is deliberately absent: the retired /lobby bridge was removed as a surface on
     2026-08-15 because it aimed an intentionally-empty file at the homepage element another tree
     publishes the chess board into. See the guard above. */
  assert.deepEqual(
    Object.keys(manifest.hashes).sort(),
    ['desk', 'deskRetiredRepair', 'deskShell', 'home', 'lobby', 'studio'],
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
