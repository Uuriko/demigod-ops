#!/usr/bin/env node
/**
 * Fail-capable gate for bin/grok-ask transport selftests
 * (context + Broken-pipe retry + 402 circuit breaker).
 * Orphan poison tests lock nothing — wire this into verify:all + ship-gate.
 *
 *   node demigod-grok-ask-selftest.mjs
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(ROOT, 'bin', 'grok-ask');

const r = spawnSync(BIN, ['--selftest'], {
  cwd: ROOT,
  encoding: 'utf8',
  timeout: 90_000,
  env: { ...process.env, PATH: `${path.join(ROOT, 'bin')}:${process.env.PATH || ''}` },
});

const out = `${r.stdout || ''}${r.stderr || ''}`;
if (r.error) {
  console.error('grok-ask-selftest spawn error:', r.error.message);
  process.exit(1);
}
if (r.status !== 0) {
  console.error(out || `grok-ask --selftest exit ${r.status}`);
  process.exit(r.status || 1);
}
const need = [/context selftest PASS/, /retry selftest PASS/, /breaker selftest PASS/];
const missing = need.filter((re) => !re.test(out));
if (missing.length) {
  console.error('grok-ask-selftest FAIL: missing PASS markers\n', out);
  process.exit(1);
}
console.log(out.trim());
console.log('demigod-grok-ask-selftest PASS');
