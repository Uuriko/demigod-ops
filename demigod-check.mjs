#!/usr/bin/env node
/**
 * demigod-check — profiles: edit | full | release
 *   bin/dg check edit|full|release
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const profile = process.argv[2] || 'full';
const rest = process.argv.slice(3);

const profiles = {
  edit: ['demigod-full-check.mjs', '--skip-smoke', ...rest],
  full: ['demigod-full-check.mjs', ...rest],
  release: ['demigod-full-check.mjs', '--release', ...rest],
};

if (!profiles[profile]) {
  console.error('usage: bin/dg check edit|full|release');
  process.exit(2);
}

// pre-run truth for evidence
spawnSync(process.execPath, [path.join(ROOT, 'demigod-truth.mjs'), '--quiet'], {
  cwd: ROOT,
  stdio: 'inherit',
});
const r = spawnSync(process.execPath, profiles[profile], { cwd: ROOT, stdio: 'inherit' });
// optional review on release
if (profile === 'release' || process.argv.includes('--with-review')) {
  spawnSync(
    process.execPath,
    [path.join(ROOT, 'demigod-review.mjs'), '--bug', '--gates', '--format', 'summary'],
    { cwd: ROOT, stdio: 'inherit' },
  );
}
process.exit(r.status ?? 1);
