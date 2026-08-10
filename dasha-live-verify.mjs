#!/usr/bin/env node
/**
 * Compat wrapper — prefer `npm run dasha:audit:live`.
 * Default: fast worker+site (no WS). DASHA_AUDIT_PROTOCOL=1 for full protocol.
 * DASHA_LIVE_STRICT=1: howto must be live.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const args = ['dasha-audit-live.mjs'];
if (process.env.DASHA_AUDIT_PROTOCOL !== '1' && process.env.LOBBY_LIVE !== '1') {
  // Historical dasha:verify:live was fetch-only; keep that default.
  args.push('--fast');
}
if (process.env.DASHA_LIVE_STRICT === '1') args.push('--strict');

const r = spawnSync(process.execPath, args, {
  cwd: root,
  encoding: 'utf8',
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
