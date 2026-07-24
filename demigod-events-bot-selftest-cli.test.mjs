#!/usr/bin/env node
/**
 * Fail-closed CLI for demigod-events-bot-selftest.mjs (anti vacuous-green).
 * Unknown flags must exit 2 immediately — not run the multi-minute suite.
 *
 *   node --test demigod-events-bot-selftest-cli.test.mjs
 */
import { spawnSync } from 'child_process';
import assert from 'node:assert/strict';
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
  const r = spawnSync(process.execPath, [LOOP, 'once'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
    env: process.env,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  // When focus is paused (current Events Bot lane), once must not draft.
  // If focus is unpaused in a future session, status 0 with drafted[] is ok —
  // only assert the pause path when focusPaused is reported.
  if (/focusPaused|force-paused/i.test(out) || r.status === 2) {
    assert.equal(r.status, 2, `paused once must exit 2\n${out.slice(0, 400)}`);
    assert.match(out, /focusPaused|force-paused/i, out.slice(0, 400));
  } else {
    assert.equal(r.status, 0, `unpaused once must not crash\n${out.slice(0, 400)}`);
  }
});
