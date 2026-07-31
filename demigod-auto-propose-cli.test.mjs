import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const run = spawnSync(process.execPath, ['./demigod-auto-propose.mjs', '--min-score', '--json'], {
  cwd: new URL('.', import.meta.url),
  encoding: 'utf8',
  env: { ...process.env, DEMIGOD_TEST_SCOPE: `auto-propose-cli-${process.pid}` },
});

assert.equal(run.status, 2);
