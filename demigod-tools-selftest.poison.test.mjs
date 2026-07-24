#!/usr/bin/env node
/**
 * Fail-capability for demigod-tools-selftest.mjs (anti vacuous-green).
 * Real suite must still pass; poison env must fail loud.
 *
 *   node --test demigod-tools-selftest.poison.test.mjs
 */
import { spawnSync } from 'child_process';
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SELFTEST = path.join(ROOT, 'demigod-tools-selftest.mjs');

test('tools-selftest fails under poison (not vacuous-green)', () => {
  const r = spawnSync(process.execPath, [SELFTEST], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
    env: {
      ...process.env,
      DEMIGOD_TOOLS_SELFTEST_POISON: '1',
    },
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  assert.notEqual(r.status, 0, `poison suite must exit non-zero (got ${r.status})\n${out.slice(0, 400)}`);
  assert.match(out, /poison|FAIL/i, `poison suite must print FAIL/poison\n${out.slice(0, 400)}`);
});
