#!/usr/bin/env node
/**
 * demigod-live-doctor — alias of demigod-truth (single oracle).
 * Prefer: bin/dg truth
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
// map --require-match through; default human format
const r = spawnSync(process.execPath, [path.join(ROOT, 'demigod-truth.mjs'), ...args], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});
process.exit(r.status ?? 1);
