#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
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
  assert.match(first, /"step":"push:surface"/);
  assert.match(first, /"step":"publish:ok"/);

  const second = ship();
  assert.match(second, /"step":"resume"/);
  assert.match(second, /"step":"push:start"/);
  assert.match(second, /"step":"publish:skip"/);
  assert.doesNotMatch(second, /"step":"preflight:start"/);

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
  assert.deepEqual(Object.keys(manifest.hashes).sort(), ['desk', 'home', 'studio']);

  const now = spawnSync(process.execPath, ['dasha-ship.mjs', '--status', '--write-now'], {
    cwd: root, env, encoding: 'utf8', timeout: 30_000,
  });
  assert.equal(now.status, 0, now.stderr || now.stdout);
  assert.match(fs.readFileSync(env.DASHA_NOW_DOC, 'utf8'), /Local release alignment: aligned/);
  console.log('dasha-ship incremental/resume PASS');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
