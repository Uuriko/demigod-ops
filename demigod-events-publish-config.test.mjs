import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chmod, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

// Derived, never hardcoded: REPO_ROOT exists on one laptop and fails in any clean checkout.
const REPO_ROOT = path.dirname(fileURLToPath(import.meta.url));

test('compact freeze JSON blocks Events API config publish', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dg-events-publish-'));
  await writeFile(path.join(root, 'demigod-publish-freeze.mjs'), 'console.log(JSON.stringify({frozen:true}))\n');
  await chmod(path.join(root, 'demigod-publish-freeze.mjs'), 0o755);

  const result = spawnSync(path.join(REPO_ROOT, 'bin/dg-events-publish-config'), [], {
    env: { ...process.env, DEMIGOD_ROOT: root },
    encoding: 'utf8',
  });

  assert.equal(result.status, 3);
  assert.match(result.stderr, /publish freeze ON/);

  const status = spawnSync(path.join(REPO_ROOT, 'bin/dg-events-publish-config'), ['status'], {
    env: { ...process.env, DEMIGOD_ROOT: root },
    encoding: 'utf8',
  });
  assert.equal(status.status, 0);
  assert.doesNotMatch(status.stdout, /ready: publish/);
});

test('invalid freeze output fails closed', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'dg-events-publish-'));
  await writeFile(path.join(root, 'demigod-publish-freeze.mjs'), 'console.log("not json")\n');

  const result = spawnSync(path.join(REPO_ROOT, 'bin/dg-events-publish-config'), [], {
    env: { ...process.env, DEMIGOD_ROOT: root },
    encoding: 'utf8',
  });

  assert.equal(result.status, 3);
  assert.match(result.stderr, /invalid publish freeze status/);
});
