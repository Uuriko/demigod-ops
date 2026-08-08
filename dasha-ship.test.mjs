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
  DASHA_SHIP_STATE: path.join(tmp, 'state.json'),
  DASHA_SHIP_MANIFEST: path.join(tmp, 'manifest.json'),
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
  assert.match(second, /"step":"push:skip"/);
  assert.match(second, /"step":"publish:skip"/);
  assert.doesNotMatch(second, /"step":"preflight:start"/);

  const state = JSON.parse(fs.readFileSync(env.DASHA_SHIP_STATE, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(env.DASHA_SHIP_MANIFEST, 'utf8'));
  assert.equal(state.stages.verified, true);
  assert.deepEqual(Object.keys(manifest.hashes).sort(), ['desk', 'home', 'studio']);
  console.log('dasha-ship incremental/resume PASS');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
