#!/usr/bin/env node
/**
 * Fail-capability for demigod-events-app-policy-selftest.mjs (anti vacuous-green).
 * Real suite must still pass; poison env must fail loud on stripped CORS contract.
 *
 *   node --test demigod-events-app-policy-selftest.poison.test.mjs
 */
import { spawnSync } from 'child_process';
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const POLICY = path.join(ROOT, 'demigod-events-app-policy-selftest.mjs');

test('events-app policy selftest fails under poison (not vacuous-green)', () => {
  // Drop parent NODE_TEST_CONTEXT so nested `node --test` actually runs the suite
  // (otherwise node skips files with "run() is being called recursively").
  const env = { ...process.env, DEMIGOD_POLICY_SELFTEST_POISON: '1' };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, ['--test', POLICY], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120000,
    env,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  assert.notEqual(
    r.status,
    0,
    `poison policy suite must exit non-zero (got ${r.status})\n${out.slice(0, 800)}`,
  );
  assert.match(
    out,
    /fail|not match|AssertionError|cors|does not match/i,
    `poison suite must surface assert failure\n${out.slice(0, 800)}`,
  );
});
