#!/usr/bin/env node
/**
 * Fail-closed CLI for demigod-events-bot-selftest.mjs (anti vacuous-green).
 * Unknown flags must exit 2 immediately — not run the multi-minute suite.
 *
 *   node --test demigod-events-bot-selftest-cli.test.mjs
 */
import { spawnSync } from 'child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import test from 'node:test';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SELFTEST = path.join(ROOT, 'demigod-events-bot-selftest.mjs');
const LOOP = path.join(ROOT, 'demigod-funnel-loop.mjs');

test('events-bot-selftest rejects unknown flags (exit 2, no suite)', () => {
  const t0 = Date.now();
  const r = spawnSync(
    process.execPath,
    [SELFTEST, '--definitely-unknown'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 15000,
      env: { ...process.env, DEMIGOD_EVENTS_BOT_MOCK: '1' },
    },
  );
  const ms = Date.now() - t0;
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  assert.equal(r.status, 2, `expected exit 2, got ${r.status}\n${out.slice(0, 400)}`);
  assert.match(out, /no flags|unknown/i, out.slice(0, 400));
  assert.ok(ms < 8000, `unknown-flag guard must be fast (took ${ms}ms)`);
});

test('funnel-loop once fails closed under lead FOCUS pause', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'demigod-focus-pause-'));
  const focusPath = path.join(dir, 'FOCUS.md');
  fs.writeFileSync(focusPath, '# Current\nLead funnel is **paused** now\n');
  const r = spawnSync(process.execPath, [LOOP, 'once'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, DEMIGOD_FOCUS_PATH: focusPath },
  });
  fs.rmSync(dir, { recursive: true, force: true });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  assert.equal(r.status, 2, `paused once must exit 2\n${out.slice(0, 400)}`);
  assert.match(out, /"focusPaused"\s*:\s*true/);
});
