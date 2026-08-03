import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const source = fs.readFileSync(new URL('./demigod-pilot-inbound.mjs', import.meta.url), 'utf8');
assert.match(source, /writeJsonAuto\(path\.join\(BUSY, 'pilot-inbound\.json'\), out\)/);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-pilot-inbound-perms-'));
try {
  process.env.DG_BUSY = root;
  const { writeJsonAuto } = await import(`./demigod-perf-cache.mjs?permissions-test=${process.pid}`);
  const dir = path.join(root, 'nested');
  const target = path.join(dir, 'pilot-inbound.json');
  fs.mkdirSync(dir);
  fs.writeFileSync(target, '{}\n');
  fs.chmodSync(dir, 0o755);
  fs.chmodSync(target, 0o664);

  writeJsonAuto(target, { ok: true });
  assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
  assert.equal(fs.statSync(target).mode & 0o777, 0o600);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('demigod pilot inbound permissions: PASS');
