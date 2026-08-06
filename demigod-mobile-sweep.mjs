#!/usr/bin/env node
/**
 * Compat entry for retired demigod-mobile-sweep.mjs wraps.
 * Real tool: demigod-cdp-mobile-a11y-sweep.mjs (registry id mobile-a11y).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(ROOT, 'demigod-cdp-mobile-a11y-sweep.mjs');
const r = spawnSync(process.execPath, [target, ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});
process.exit(r.status ?? 1);
